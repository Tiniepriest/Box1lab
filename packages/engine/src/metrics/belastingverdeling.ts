import type { Resultaat } from "../huishouden.ts";
import type { Basis } from "../simulatie.ts";
import { deelInDecielen } from "./decielen.ts";

export interface BelastingPerDeciel {
  /** Box 1 per inkomensgroep, € mld: inkomstenbelasting met premies volksverzekeringen, na heffingskortingen. */
  box1: number[];
  /** Box 3 per inkomensgroep, € mld. */
  box3: number[];
  /** Aantal huishoudens per inkomensgroep. */
  huishoudens: number[];
}

/**
 * Wie betaalt de belasting (D-080)? Box 1 en box 3 per inkomensgroep. De groepen zijn tien even grote delen van de
 * bevolking naar gestandaardiseerd besteedbaar inkomen zonder de box 3-belasting. Met de box 3-belasting erin zou
 * wie veel vermogen en weinig inkomen heeft juist door die belasting in de laagste groep vallen: het rendement telt
 * niet als inkomen, de belasting erover wel (D-076). Opgeteld is het gelijk aan de totalen.
 *
 * Met `resultaten` van een scenario: dezelfde groepen als nu (zoals bij de andere effecten per groep), met de
 * belasting in het scenario.
 */
export function belastingPerDeciel(
  basis: Basis,
  resultaten: readonly Resultaat[] = basis.resultaten,
): BelastingPerDeciel {
  const uit: BelastingPerDeciel = {
    box1: new Array<number>(10).fill(0),
    box3: new Array<number>(10).fill(0),
    huishoudens: new Array<number>(10).fill(0),
  };
  const decielen = deelInDecielen(
    basis.resultaten.map((r) => (r.besteedbaar + r.box3) / r.equivalentie),
    basis.persoonsgewichten,
  );
  resultaten.forEach((r, i) => {
    const d = decielen[i]!;
    const w = basis.populatie[i]!.gewicht;
    uit.box1[d]! += (r.belasting * w) / 1e9;
    uit.box3[d]! += (r.box3 * w) / 1e9;
    uit.huishoudens[d]! += w;
  });
  return uit;
}
