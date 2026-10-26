import type { Parameters } from "../parameters/schema.ts";

/**
 * Inkomensafhankelijke bijdrage Zvw die iemand zelf betaalt. In het model alleen voor wie de AOW-leeftijd heeft
 * (over AOW en pensioen); voor werknemers en uitkeringsgerechtigden betaalt de werkgever of uitkeringsinstantie.
 */
export function zvwBijdrage(inkomen: number, aow: boolean, p: Parameters): number {
  if (!aow || inkomen <= 0) return 0;
  return (Math.min(inkomen, p.zorg.zvwMaximumInkomen) * p.zorg.zvwBijdrage) / 100;
}
