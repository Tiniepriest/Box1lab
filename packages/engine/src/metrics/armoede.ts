import type { Resultaat } from "../huishouden.ts";

export interface Armoede {
  /** Percentage personen onder de armoedegrens. */
  personen: number;
  /** Percentage kinderen onder de armoedegrens. */
  kinderen: number;
}

/**
 * Armoederisico: aandeel personen in een huishouden met een gestandaardiseerd besteedbaar inkomen onder de grens.
 * `gewichten` zijn huishoudgewichten.
 */
export function armoederisico(
  resultaten: readonly Resultaat[],
  gewichten: readonly number[],
  grens: number,
): Armoede {
  let arm = 0;
  let armKinderen = 0;
  let personen = 0;
  let kinderen = 0;
  resultaten.forEach((r, i) => {
    const w = gewichten[i]!;
    const ps = (r.volwassenen + r.kinderen) * w;
    personen += ps;
    kinderen += r.kinderen * w;
    if (r.besteedbaar / r.equivalentie < grens) {
      arm += ps;
      armKinderen += r.kinderen * w;
    }
  });
  return { personen: (arm / personen) * 100, kinderen: kinderen ? (armKinderen / kinderen) * 100 : 0 };
}
