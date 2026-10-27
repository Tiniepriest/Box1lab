import type { Parameters } from "../parameters/schema.ts";
import { heffingskortingen, type PersoonKenmerken } from "./heffingskortingen.ts";

/** Een stuk inkomen met één tarief: [onder, boven) tegen `tarief` procent. */
export interface TariefStuk {
  onder: number;
  boven: number;
  tarief: number;
}

/**
 * De schijven zoals ze voor deze persoon gelden: met de vrijstelling eruit en, voor AOW'ers, het lagere
 * tarief in de eerste schijf.
 */
export function tariefStukken(p: Parameters, aow: boolean): TariefStuk[] {
  const { vrijstelling, schijven, aowVerlagingEersteSchijf } = p.box1;
  const stukken: TariefStuk[] = [];
  let vorige = 0;
  schijven.forEach((s, i) => {
    const top = s.tot ?? Infinity;
    const onder = Math.max(vorige, vrijstelling);
    if (top > onder) {
      stukken.push({ onder, boven: top, tarief: s.tarief - (i === 0 && aow ? aowVerlagingEersteSchijf : 0) });
    }
    vorige = top;
  });
  return stukken;
}

/** Inkomstenbelasting + premies volksverzekeringen over het belastbaar inkomen, vóór heffingskortingen. */
export function heffingVoorKortingen(inkomen: number, p: Parameters, aow: boolean): number {
  if (inkomen <= 0) return 0;
  let heffing = 0;
  for (const s of tariefStukken(p, aow)) {
    const deel = Math.min(inkomen, s.boven) - s.onder;
    if (deel > 0) heffing += (deel * s.tarief) / 100;
  }
  return heffing;
}

/**
 * Te betalen box 1-belasting van één persoon: heffing (plus eventuele extra heffing, zoals de
 * aftrekbeperking eigen woning) min kortingen, nooit negatief.
 *
 * @param inkomen belastbaar inkomen uit werk en woning (ook het verzamelinkomen voor de kortingen)
 * @param arbeidsinkomen inkomen uit werk, voor de arbeidskorting en combinatiekorting
 * @param extraHeffing heffing die bovenop de schijven komt, vóór kortingen
 */
export function belastingBox1(
  inkomen: number,
  arbeidsinkomen: number,
  p: Parameters,
  k: PersoonKenmerken,
  extraHeffing = 0,
): number {
  const heffing = heffingVoorKortingen(inkomen, p, k.aow) + extraHeffing;
  if (heffing <= 0) return 0;
  return Math.max(0, heffing - heffingskortingen(Math.max(0, inkomen), arbeidsinkomen, p, k).totaal);
}

/**
 * Tarief van de schijf waarin dit inkomen valt (in procent), 0 onder de vrijstelling. Zonder kortingen en
 * zonder AOW-verlaging; gebruikt voor het gedragseffect.
 */
export function schijfTarief(inkomen: number, p: Parameters): number {
  const { vrijstelling, schijven } = p.box1;
  if (inkomen <= vrijstelling) return 0;
  let vorige = 0;
  for (const s of schijven) {
    const top = s.tot ?? Infinity;
    if (inkomen <= top && inkomen > vorige) return s.tarief;
    vorige = top;
  }
  return schijven[schijven.length - 1]!.tarief;
}
