import type { Parameters } from "../../parameters/schema.ts";

/**
 * Kindgebonden budget per jaar: bedrag per kind, verhogingen voor kinderen van 12–15 en 16–17 jaar en
 * voor alleenstaande ouders, verminderd met het afbouwpercentage boven het drempelinkomen.
 * Bron en rekenvoorbeelden: Dienst Toeslagen, Berekening kindgebonden budget 2026.
 *
 * @param kinderLeeftijden leeftijden van de kinderen; alleen kinderen onder 18 tellen mee
 */
export function kindgebondenBudget(
  toetsingsinkomen: number,
  kinderLeeftijden: readonly number[],
  partners: boolean,
  vermogen: number,
  p: Parameters,
): number {
  const k = p.toeslagen.kindgebondenBudget;
  const kinderen = kinderLeeftijden.filter((l) => l < 18);
  if (!kinderen.length) return 0;
  const soort = partners ? "partners" : "alleenstaand";
  if (vermogen > k.maxVermogen[soort]) return 0;
  const verhoging = kinderen.reduce(
    (s, l) => s + (l >= 16 ? k.verhogingKind16en17 : l >= 12 ? k.verhogingKind12tot16 : 0),
    0,
  );
  const max = kinderen.length * k.perKind + verhoging + (partners ? 0 : k.alleenstaandeOuderkop);
  const vermindering = (k.afbouw / 100) * Math.max(0, toetsingsinkomen - k.drempelinkomen[soort]);
  return Math.max(0, max - vermindering) * (k.niveau / 100);
}
