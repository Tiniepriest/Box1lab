import type { Parameters } from "../parameters/schema.ts";
import { belastingBox1 } from "./box1.ts";
import type { PersoonKenmerken } from "./heffingskortingen.ts";

/**
 * Netto-koppeling: het bruto bedrag dat onder het scenario hetzelfde netto oplevert als `bruto` onder de basis.
 * Gezocht met bisectie. Als de belasting op dit bedrag niet verandert, is het antwoord exact `bruto`.
 *
 * Fase 1: geldt voor alle uitkeringen, zoals in het prototype (HANDOFF §2, zwakke plek 2).
 */
export function gekoppeldBruto(
  bruto: number,
  k: PersoonKenmerken,
  basis: Parameters,
  scenario: Parameters,
): number {
  const belastingBasis = belastingBox1(bruto, basis, k);
  if (belastingBox1(bruto, scenario, k) === belastingBasis) return bruto;
  const doel = bruto - belastingBasis;
  let lo = bruto * 0.5;
  let hi = bruto * 2.5;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (m - belastingBox1(m, scenario, k) < doel) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}
