import type { Parameters } from "../../parameters/schema.ts";

/** Huurtoeslag per jaar. Fase 1: vereenvoudigde formule uit het prototype. */
export function huurtoeslag(
  toetsingsinkomen: number,
  huurPerMaand: number,
  partners: boolean,
  p: Parameters,
): number {
  if (!huurPerMaand) return 0;
  const h = p.toeslagen.huurtoeslag;
  const drempel = partners ? h.drempelinkomen.partners : h.drempelinkomen.alleenstaand;
  const basis = partners ? h.basisbijdragePerMaand.partners : h.basisbijdragePerMaand.alleenstaand;
  const eigenBijdrage = basis + ((h.afbouw / 100) * Math.max(0, toetsingsinkomen - drempel)) / 12;
  const huur = Math.min(huurPerMaand, h.maximaleHuurPerMaand);
  return Math.max(0, (h.vergoeding / 100) * (huur - eigenBijdrage)) * 12 * (h.niveau / 100);
}
