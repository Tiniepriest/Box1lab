import type { Parameters } from "../parameters/schema.ts";

/**
 * Inkomensafhankelijke bijdrage Zvw die iemand zelf betaalt: AOW'ers over AOW en pensioen, zelfstandigen over hun
 * belastbare winst. Voor werknemers en uitkeringsgerechtigden betaalt de werkgever of uitkeringsinstantie.
 */
export function zvwBijdrage(inkomen: number, betaaltZelf: boolean, p: Parameters): number {
  if (!betaaltZelf || inkomen <= 0) return 0;
  return (Math.min(inkomen, p.zorg.zvwMaximumInkomen) * p.zorg.zvwBijdrage) / 100;
}
