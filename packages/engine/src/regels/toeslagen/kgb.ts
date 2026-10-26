import type { Parameters } from "../../parameters/schema.ts";

/** Kindgebonden budget per jaar. Fase 1: vereenvoudigde formule uit het prototype. */
export function kindgebondenBudget(
  toetsingsinkomen: number,
  kinderen: number,
  partners: boolean,
  p: Parameters,
): number {
  if (!kinderen) return 0;
  const k = p.toeslagen.kindgebondenBudget;
  const max = kinderen * k.perKind + (partners ? 0 : k.alleenstaandeOuderkop);
  const drempel = partners ? k.drempelinkomen.partners : k.drempelinkomen.alleenstaand;
  return Math.max(0, max - (k.afbouw / 100) * Math.max(0, toetsingsinkomen - drempel)) * (k.niveau / 100);
}
