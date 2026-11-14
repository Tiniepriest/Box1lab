import type { Parameters } from "../parameters/schema.ts";
import { belastingBox1 } from "./box1.ts";
import type { PersoonKenmerken } from "./heffingskortingen.ts";

/** Bruto AOW per jaar per persoon: 6 maanden eerste halfjaar, 6 maanden tweede halfjaar, plus het vakantiegeld. */
export function aowPerJaar(p: Parameters, partners: boolean): number {
  const a = p.uitkeringen.aow[partners ? "partners" : "alleenstaand"];
  return (
    6 * (a.perMaandEersteHalfjaar + a.vakantiegeldEersteHalfjaar) +
    6 * (a.perMaandTweedeHalfjaar + a.vakantiegeldTweedeHalfjaar)
  );
}

/**
 * Het bruto bedrag van een uitkering dat na box 1-belasting `netto` oplevert. Gezocht met bisectie; netto stijgt
 * altijd met bruto, want het hoogste tarief is lager dan 100%. Met negatieve belasting kan netto hoger zijn dan
 * bruto; levert bruto 0 al genoeg op, dan is het antwoord 0.
 */
export function brutoVoorNetto(netto: number, k: PersoonKenmerken, p: Parameters): number {
  if (netto <= 0 || -belastingBox1(0, 0, p, k) >= netto) return 0;
  let lo = 0;
  let hi = netto * 3;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (m - belastingBox1(m, 0, p, k) < netto) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Netto-koppeling: het bruto bedrag dat onder het scenario hetzelfde netto oplevert als `bruto` onder de basis.
 * Als de belasting op dit bedrag niet verandert, is het antwoord exact `bruto`.
 * Of een uitkering gekoppeld is, staat per soort in `uitkeringen.nettoKoppeling`.
 */
export function gekoppeldBruto(
  bruto: number,
  k: PersoonKenmerken,
  basis: Parameters,
  scenario: Parameters,
): number {
  const belastingBasis = belastingBox1(bruto, 0, basis, k);
  if (belastingBox1(bruto, 0, scenario, k) === belastingBasis) return bruto;
  return brutoVoorNetto(bruto - belastingBasis, k, scenario);
}
