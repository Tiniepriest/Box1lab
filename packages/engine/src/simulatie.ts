import { berekenHuishouden, type Resultaat } from "./huishouden.ts";
import { armoederisico, type Armoede } from "./metrics/armoede.ts";
import { deelInDecielen } from "./metrics/decielen.ts";
import { gewogenMediaan } from "./metrics/gewogen.ts";
import { gini } from "./metrics/gini.ts";
import { winnaarsKlasse } from "./metrics/winnaars.ts";
import type { Kalibratie, Parameters } from "./parameters/schema.ts";
import type { PopulatieHuishouden } from "./populatie/genereer.ts";

/** Posten in het overheidssaldo, in de volgorde waarin ze getoond worden. */
export const POSTEN = [
  { id: "box1", label: "Belasting box 1: tarieven, vrijstelling en kortingen" },
  { id: "eigenWoning", label: "Eigen woning: hypotheekrenteaftrek en forfait" },
  { id: "overigeAftrek", label: "Overige aftrekposten" },
  { id: "zorgtoeslag", label: "Zorgtoeslag" },
  { id: "huurtoeslag", label: "Huurtoeslag" },
  { id: "kgb", label: "Kindgebonden budget" },
  { id: "kot", label: "Kinderopvangtoeslag" },
  { id: "uitkeringen", label: "Uitkeringen en AOW (netto-koppeling)" },
] as const;

export type PostId = (typeof POSTEN)[number]["id"];

/** Totalen over de populatie. Geldbedragen in miljard euro per jaar. */
export interface Totalen {
  belasting: number;
  eigenWoning: number;
  zorgtoeslag: number;
  huurtoeslag: number;
  kgb: number;
  kot: number;
  uitkeringKosten: number;
  hypotheekrente: number;
  huishoudens: number;
  personen: number;
}

export interface Schaalfactoren {
  ib: number;
  zorgtoeslag: number;
  huurtoeslag: number;
  kgb: number;
  kot: number;
}

export function totalen(
  resultaten: readonly Resultaat[],
  populatie: readonly PopulatieHuishouden[],
): Totalen {
  const t: Totalen = {
    belasting: 0,
    eigenWoning: 0,
    zorgtoeslag: 0,
    huurtoeslag: 0,
    kgb: 0,
    kot: 0,
    uitkeringKosten: 0,
    hypotheekrente: 0,
    huishoudens: 0,
    personen: 0,
  };
  resultaten.forEach((r, i) => {
    const h = populatie[i]!;
    const w = h.gewicht;
    t.belasting += r.belasting * w;
    t.eigenWoning += r.eigenWoning * w;
    t.zorgtoeslag += r.zorgtoeslag * w;
    t.huurtoeslag += r.huurtoeslag * w;
    t.kgb += r.kgb * w;
    t.kot += r.kot * w;
    t.uitkeringKosten += r.uitkeringKosten * w;
    t.hypotheekrente += h.hypotheekrente * w;
    t.huishoudens += w;
    t.personen += (r.volwassenen + r.kinderen) * w;
  });
  for (const k of [
    "belasting",
    "eigenWoning",
    "zorgtoeslag",
    "huurtoeslag",
    "kgb",
    "kot",
    "uitkeringKosten",
    "hypotheekrente",
  ] as const) {
    t[k] /= 1e9;
  }
  return t;
}

/** Alles wat over het huidige beleid vastligt en bij elk scenario wordt hergebruikt. */
export interface Basis {
  params: Parameters;
  populatie: readonly PopulatieHuishouden[];
  resultaten: Resultaat[];
  totalen: Totalen;
  kalibratie: Kalibratie;
  schaal: Schaalfactoren;
  /** Huishoudgewicht × aantal personen. */
  persoonsgewichten: number[];
  /** Deciel (0–9) per huishouden, naar gestandaardiseerd besteedbaar inkomen onder het huidige beleid. */
  decielen: number[];
  armoedegrens: number;
  armoede: Armoede;
  gini: number;
}

export function maakBasis(
  params: Parameters,
  populatie: readonly PopulatieHuishouden[],
  kalibratie: Kalibratie,
): Basis {
  const resultaten = populatie.map((h) => berekenHuishouden(h, params));
  const t = totalen(resultaten, populatie);
  const d = kalibratie.doelen;
  const schaal: Schaalfactoren = {
    ib: d.ibNaHra.waardeMld / (t.belasting - t.eigenWoning),
    zorgtoeslag: d.zorgtoeslag.waardeMld / t.zorgtoeslag,
    huurtoeslag: d.huurtoeslag.waardeMld / t.huurtoeslag,
    kgb: d.kindgebondenBudget.waardeMld / t.kgb,
    kot: d.kinderopvangtoeslag.waardeMld / t.kot,
  };
  const persoonsgewichten = populatie.map(
    (h, i) => h.gewicht * (resultaten[i]!.volwassenen + resultaten[i]!.kinderen),
  );
  const gestandaardiseerd = resultaten.map((r) => r.besteedbaar / r.equivalentie);
  const armoedegrens =
    (params.methodiek.armoedegrens / 100) * gewogenMediaan(gestandaardiseerd, persoonsgewichten);
  const huishoudgewichten = populatie.map((h) => h.gewicht);
  return {
    params,
    populatie,
    resultaten,
    totalen: t,
    kalibratie,
    schaal,
    persoonsgewichten,
    decielen: deelInDecielen(gestandaardiseerd, persoonsgewichten),
    armoedegrens,
    armoede: armoederisico(resultaten, huishoudgewichten, armoedegrens),
    gini: gini(gestandaardiseerd, persoonsgewichten),
  };
}

export interface DecielEffect {
  /** Gemiddelde verandering besteedbaar inkomen per huishouden, euro per jaar. */
  gemiddeld: number;
  /** Verandering als percentage van het besteedbaar inkomen van het deciel. */
  relatief: number;
  /** Aandeel personen (%) per winnaars-klasse: [verlies groot, verlies, ~0, winst, winst groot]. */
  aandelen: number[];
}

export interface Uitkomst {
  params: Parameters;
  resultaten: Resultaat[];
  totalen: Totalen;
  /** Effect per post op het overheidssaldo, miljard euro per jaar (positief = gunstig voor de overheid). */
  posten: Record<PostId, number>;
  saldoMld: number;
  armoede: Armoede;
  gini: number;
  decielen: DecielEffect[];
  /** Aandeel personen (%) per winnaars-klasse over de hele bevolking. */
  winnaars: number[];
}

/** Rekent een scenario door op de populatie en vergelijkt het met de basis. */
export function simuleer(basis: Basis, scenario: Parameters): Uitkomst {
  const { populatie, schaal } = basis;
  const bt = basis.totalen;
  const resultaten = populatie.map((h) => berekenHuishouden(h, scenario, basis.params));
  const t = totalen(resultaten, populatie);
  const overig = scenario.overigeAftrekposten;

  const posten: Record<PostId, number> = {
    box1: (t.belasting - bt.belasting) * schaal.ib,
    eigenWoning: (bt.eigenWoning - t.eigenWoning) * schaal.ib,
    overigeAftrek: overig.budgetMld * (1 - overig.niveau / 100),
    zorgtoeslag: (bt.zorgtoeslag - t.zorgtoeslag) * schaal.zorgtoeslag,
    huurtoeslag: (bt.huurtoeslag - t.huurtoeslag) * schaal.huurtoeslag,
    kgb: (bt.kgb - t.kgb) * schaal.kgb,
    kot: (bt.kot - t.kot) * schaal.kot,
    uitkeringen: -t.uitkeringKosten * schaal.ib,
  };

  const grenzen = basis.params.methodiek.winnaarsGrenzen;
  const dec = Array.from({ length: 10 }, () => ({ d: 0, b: 0, w: 0, pw: 0, sh: [0, 0, 0, 0, 0] }));
  const alle = [0, 0, 0, 0, 0];
  let alleW = 0;
  resultaten.forEach((r, i) => {
    const a = basis.resultaten[i]!;
    const g = dec[basis.decielen[i]!]!;
    const w = populatie[i]!.gewicht;
    const pw = basis.persoonsgewichten[i]!;
    const delta = r.besteedbaar - a.besteedbaar;
    const klasse = winnaarsKlasse((delta / Math.max(1, a.besteedbaar)) * 100, grenzen);
    g.d += delta * w;
    g.b += a.besteedbaar * w;
    g.w += w;
    g.pw += pw;
    g.sh[klasse]! += pw;
    alle[klasse]! += pw;
    alleW += pw;
  });

  return {
    params: scenario,
    resultaten,
    totalen: t,
    posten,
    saldoMld: Object.values(posten).reduce((a, b) => a + b, 0),
    armoede: armoederisico(
      resultaten,
      populatie.map((h) => h.gewicht),
      basis.armoedegrens,
    ),
    gini: gini(
      resultaten.map((r) => r.besteedbaar / r.equivalentie),
      basis.persoonsgewichten,
    ),
    decielen: dec.map((g) => ({
      gemiddeld: g.d / g.w,
      relatief: (g.d / g.b) * 100,
      aandelen: g.sh.map((v) => (v / g.pw) * 100),
    })),
    winnaars: alle.map((v) => (v / alleW) * 100),
  };
}
