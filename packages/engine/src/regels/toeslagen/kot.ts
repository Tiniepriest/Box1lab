import type { Parameters } from "../../parameters/schema.ts";

/** Kinderopvangtoeslag per jaar. Fase 1: vereenvoudigde formule uit het prototype. */
export function kinderopvangtoeslag(toetsingsinkomen: number, kosten: number, p: Parameters): number {
  if (!kosten) return 0;
  const k = p.toeslagen.kinderopvangtoeslag;
  const daling =
    ((toetsingsinkomen - k.inkomensgrens) * (k.maxVergoeding - k.minVergoeding)) / k.afbouwTraject;
  const pct =
    toetsingsinkomen <= k.inkomensgrens
      ? k.maxVergoeding
      : Math.max(k.minVergoeding, k.maxVergoeding - daling);
  return ((kosten * pct) / 100) * (k.niveau / 100);
}
