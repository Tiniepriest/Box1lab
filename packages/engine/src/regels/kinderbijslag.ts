import type { Parameters } from "../parameters/schema.ts";

/** Kinderbijslag per jaar voor alle kinderen: per kind 2 kwartalen tegen het eerste en 2 tegen het tweede halfjaar. */
export function kinderbijslag(kinderLeeftijden: readonly number[], p: Parameters): number {
  const { perKwartaal, niveau } = p.kinderbijslag;
  let totaal = 0;
  for (const leeftijd of kinderLeeftijden) {
    const groep = perKwartaal.find((g) => leeftijd < g.totLeeftijd);
    if (groep) totaal += 2 * groep.eersteHalfjaar + 2 * groep.tweedeHalfjaar;
  }
  return totaal * (niveau / 100);
}
