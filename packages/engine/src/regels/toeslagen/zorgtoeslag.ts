import type { Parameters } from "../../parameters/schema.ts";

/** Zorgtoeslag per jaar. Fase 1: vereenvoudigde formule uit het prototype. */
export function zorgtoeslag(toetsingsinkomen: number, partners: boolean, p: Parameters): number {
  const z = p.toeslagen.zorgtoeslag;
  const max = partners ? z.maximum.partners : z.maximum.alleenstaand;
  const afbouw = (z.afbouw / 100) * Math.max(0, toetsingsinkomen - z.drempelinkomen);
  return Math.max(0, max - afbouw) * (z.niveau / 100);
}
