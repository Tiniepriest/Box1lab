import type { Parameters } from "../../parameters/schema.ts";

export type OpvangSoort = "dagopvang" | "buitenschoolse" | "gastouder";

export interface Kinderopvang {
  soort: OpvangSoort;
  urenPerMaand: number;
  uurprijs: number;
}

/** Vergoedingspercentages bij een (gezamenlijk) toetsingsinkomen. */
export function kotPercentages(
  toetsingsinkomen: number,
  p: Parameters,
): { eersteKind: number; volgendKind: number } {
  const tabel = p.toeslagen.kinderopvangtoeslag.tabel;
  let rij = tabel[0]!;
  for (const r of tabel) {
    if (toetsingsinkomen >= r.vanaf) rij = r;
    else break;
  }
  return { eersteKind: rij.eersteKind, volgendKind: rij.volgendKind };
}

/**
 * Kinderopvangtoeslag per jaar. Per kind: uren (hoogstens het maximum) × uurprijs (hoogstens de maximale
 * uurprijs voor die opvangsoort) × vergoedingspercentage. Het "eerste kind" is het kind met de meeste uren
 * (bij gelijke uren: de hoogste kosten) en krijgt het lagere percentage.
 * Bron en rekenvoorbeelden: Dienst Toeslagen, Berekening kinderopvangtoeslag 2026.
 */
export function kinderopvangtoeslag(
  toetsingsinkomen: number,
  opvang: readonly Kinderopvang[],
  p: Parameters,
): number {
  if (!opvang.length) return 0;
  const k = p.toeslagen.kinderopvangtoeslag;
  const kinderen = opvang
    .map((o) => {
      const uren = Math.min(o.urenPerMaand, k.maxUrenPerMaand);
      return { uren, kosten: uren * Math.min(o.uurprijs, k.maxUurprijs[o.soort]) };
    })
    .sort((a, b) => b.uren - a.uren || b.kosten - a.kosten);
  const pct = kotPercentages(toetsingsinkomen, p);
  const perMaand = kinderen.reduce(
    (s, c, i) => s + (c.kosten * (i === 0 ? pct.eersteKind : pct.volgendKind)) / 100,
    0,
  );
  return perMaand * 12 * (k.niveau / 100);
}
