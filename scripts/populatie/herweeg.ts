/*
 * Herweging (kalibratie van gewichten) met begrensde raking (Deville & Särndal, 1992).
 *
 * Zoek gewichten w_i = d_i · g(x_i · λ) met g(u) = exp(u), begrensd tussen `min` en `max`, zodat voor elke
 * restrictie j geldt: Σ_i w_i · x_ij = doel_j. Opgelost met Newton-stappen op λ en een eenvoudige lijnzoektocht.
 * Restricties kunnen aantallen zijn (x = 0 of 1) of totalen (x = een bedrag).
 */

export interface Restrictie {
  naam: string;
  /** Waarde per huishouden: 1/0 voor een aantal, een bedrag voor een totaal. */
  waarden: ArrayLike<number>;
  doel: number;
}

export interface Afwijking {
  naam: string;
  doel: number;
  uitkomst: number;
  /** (uitkomst − doel) / doel. */
  relatief: number;
}

export interface Herweging {
  gewichten: number[];
  iteraties: number;
  geconvergeerd: boolean;
  afwijkingen: Afwijking[];
}

export interface HerwegingOpties {
  minimaleFactor: number;
  maximaleFactor: number;
  iteraties: number;
  /** Grootste toegestane relatieve afwijking per restrictie. */
  tolerantie?: number;
}

/** Lost A·x = b op met Gauss-eliminatie en partiële pivotering (A is k×k, wordt overschreven). */
function los(A: number[][], b: number[]): number[] {
  const k = b.length;
  for (let c = 0; c < k; c++) {
    let p = c;
    for (let r = c + 1; r < k; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!];
    [b[c], b[p]] = [b[p]!, b[c]!];
    const piv = A[c]![c]!;
    if (Math.abs(piv) < 1e-300) continue;
    for (let r = c + 1; r < k; r++) {
      const f = A[r]![c]! / piv;
      if (f === 0) continue;
      for (let cc = c; cc < k; cc++) A[r]![cc]! -= f * A[c]![cc]!;
      b[r]! -= f * b[c]!;
    }
  }
  const x = new Array<number>(k).fill(0);
  for (let r = k - 1; r >= 0; r--) {
    let s = b[r]!;
    for (let c = r + 1; c < k; c++) s -= A[r]![c]! * x[c]!;
    const piv = A[r]![r]!;
    x[r] = Math.abs(piv) < 1e-300 ? 0 : s / piv;
  }
  return x;
}

export function herweeg(
  start: readonly number[],
  restricties: readonly Restrictie[],
  o: HerwegingOpties,
): Herweging {
  const n = start.length;
  const k = restricties.length;
  const tol = o.tolerantie ?? 1e-6;
  // Schaal elke restrictie naar doel 1, voor numerieke stabiliteit.
  const X = restricties.map((r) => {
    const schaal = Math.abs(r.doel) > 0 ? r.doel : 1;
    return Float64Array.from({ length: n }, (_, i) => r.waarden[i]! / schaal);
  });
  const T = restricties.map((r) => (Math.abs(r.doel) > 0 ? 1 : 0));
  const lambda = new Array<number>(k).fill(0);

  const evalueer = (lam: number[]) => {
    const w = new Array<number>(n);
    const vrij = new Array<boolean>(n);
    for (let i = 0; i < n; i++) {
      let u = 0;
      for (let j = 0; j < k; j++) u += X[j]![i]! * lam[j]!;
      const g = Math.exp(u);
      const gb = Math.min(o.maximaleFactor, Math.max(o.minimaleFactor, g));
      vrij[i] = gb === g;
      w[i] = start[i]! * gb;
    }
    const res = T.map((t, j) => {
      let s = 0;
      for (let i = 0; i < n; i++) s += w[i]! * X[j]![i]!;
      return t - s;
    });
    const norm = res.reduce((s, r) => s + r * r, 0);
    return { w, vrij, res, norm };
  };

  let huidig = evalueer(lambda);
  let it = 0;
  for (; it < o.iteraties; it++) {
    if (Math.max(...huidig.res.map(Math.abs)) < tol) break;
    const J = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (let i = 0; i < n; i++) {
      if (!huidig.vrij[i]) continue;
      const wi = huidig.w[i]!;
      for (let a = 0; a < k; a++) {
        const xa = X[a]![i]!;
        if (xa === 0) continue;
        for (let b = a; b < k; b++) J[a]![b]! += wi * xa * X[b]![i]!;
      }
    }
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < a; b++) J[a]![b] = J[b]![a]!;
      J[a]![a]! += 1e-10 + 1e-8 * J[a]![a]!;
    }
    const delta = los(J, [...huidig.res]);
    let stap = 1;
    let beter = false;
    for (let h = 0; h < 30; h++) {
      const kandidaat = evalueer(lambda.map((l, j) => l + stap * delta[j]!));
      if (kandidaat.norm < huidig.norm) {
        lambda.forEach((_, j) => (lambda[j]! += stap * delta[j]!));
        huidig = kandidaat;
        beter = true;
        break;
      }
      stap /= 2;
    }
    if (!beter) break;
  }

  const afwijkingen = restricties.map((r) => {
    let uitkomst = 0;
    for (let i = 0; i < n; i++) uitkomst += huidig.w[i]! * r.waarden[i]!;
    return { naam: r.naam, doel: r.doel, uitkomst, relatief: r.doel ? (uitkomst - r.doel) / r.doel : 0 };
  });
  return {
    gewichten: huidig.w,
    iteraties: it,
    geconvergeerd: Math.max(...huidig.res.map(Math.abs)) < tol,
    afwijkingen,
  };
}
