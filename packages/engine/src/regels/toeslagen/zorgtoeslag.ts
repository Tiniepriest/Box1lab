import type { Parameters } from "../../parameters/schema.ts";

/**
 * Zorgtoeslag per jaar: standaardpremie (twee keer bij partners) min normpremie.
 * Normpremie = drempelpercentage × drempelinkomen + afbouwpercentage × (toetsingsinkomen − drempelinkomen).
 * Bron en rekenvoorbeelden: Dienst Toeslagen, Berekening zorgtoeslag 2026.
 */
export function zorgtoeslag(
  toetsingsinkomen: number,
  partners: boolean,
  vermogen: number,
  p: Parameters,
): number {
  const z = p.toeslagen.zorgtoeslag;
  const soort = partners ? "partners" : "alleenstaand";
  if (toetsingsinkomen > z.maxToetsingsinkomen[soort] || vermogen > z.maxVermogen[soort]) return 0;
  const normpremie =
    (z.normpremieDrempel[soort] / 100) * z.drempelinkomen +
    (z.normpremieAfbouw / 100) * Math.max(0, toetsingsinkomen - z.drempelinkomen);
  const standaard = z.standaardpremie * (partners ? 2 : 1);
  return Math.max(0, standaard - normpremie) * (z.niveau / 100);
}
