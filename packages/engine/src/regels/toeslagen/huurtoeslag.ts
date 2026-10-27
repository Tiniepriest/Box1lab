import type { Parameters } from "../../parameters/schema.ts";

export interface HuurtoeslagDelen {
  /** Deel tot de kwaliteitskortingsgrens (per maand). */
  a: number;
  /** Deel tot de aftoppingsgrens (per maand). */
  b: number;
  /** Deel tot de huurgrens (per maand). */
  c: number;
  /** Inkomensafhankelijke correctie (per maand). */
  d: number;
  /** Huurtoeslag per maand, vóór de niveau-knop. */
  perMaand: number;
}

/**
 * Huurtoeslag per maand volgens de lineaire berekening vanaf 2026 (stappen A t/m D).
 * Bron en rekenvoorbeelden: Dienst Toeslagen, Berekening huurtoeslag 2026.
 * Niet gemodelleerd: de lagere huurgrens voor jongeren onder 21 en medebewoners.
 *
 * @param personen aantal personen in het huishouden (volwassenen en kinderen)
 */
export function huurtoeslagDelen(
  rekeninkomen: number,
  huurPerMaand: number,
  personen: number,
  p: Parameters,
): HuurtoeslagDelen {
  const h = p.toeslagen.huurtoeslag;
  const omvang = personen <= 1 ? "eenpersoons" : "meerpersoons";
  const rekenhuur = Math.min(huurPerMaand, h.huurgrens);
  const basishuur = h.basishuur[omvang];
  if (rekenhuur <= basishuur) return { a: 0, b: 0, c: 0, d: 0, perMaand: 0 };
  const aftop = personen <= 2 ? h.aftoppingsgrens.eenOfTweePersonen : h.aftoppingsgrens.drieOfMeerPersonen;
  const v = h.vergoeding;
  const a =
    (Math.min(rekenhuur, h.kwaliteitskortingsgrens) - basishuur) * (v.totKwaliteitskortingsgrens / 100);
  const b =
    Math.max(0, Math.min(rekenhuur, aftop) - h.kwaliteitskortingsgrens) * (v.totAftoppingsgrens / 100);
  const c = Math.max(0, rekenhuur - aftop) * (v.totHuurgrens / 100);
  const d = Math.max(0, rekeninkomen - h.inkomensijkpunt[omvang]) * (h.afbouw[omvang] / 100 / 12);
  return { a, b, c, d, perMaand: Math.max(0, a + b + c - d) };
}

/** Huurtoeslag per jaar, inclusief vermogenstoets en niveau-knop. */
export function huurtoeslag(
  rekeninkomen: number,
  huurPerMaand: number,
  personen: number,
  partners: boolean,
  vermogen: number,
  p: Parameters,
): number {
  if (!huurPerMaand) return 0;
  const h = p.toeslagen.huurtoeslag;
  if (vermogen > h.maxVermogen[partners ? "partners" : "alleenstaand"]) return 0;
  return huurtoeslagDelen(rekeninkomen, huurPerMaand, personen, p).perMaand * 12 * (h.niveau / 100);
}
