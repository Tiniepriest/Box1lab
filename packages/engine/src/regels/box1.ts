import type { Parameters } from "../parameters/schema.ts";
import { heffingskortingen, type PersoonKenmerken } from "./heffingskortingen.ts";

/** Inkomstenbelasting + premies volksverzekeringen over het inkomen, vóór heffingskortingen. */
export function heffingVoorKortingen(inkomen: number, p: Parameters, aow: boolean): number {
  if (inkomen <= 0) return 0;
  const { vrijstelling, schijven, aowVerlagingEersteSchijf } = p.box1;
  let heffing = 0;
  let vorige = 0;
  schijven.forEach((s, i) => {
    const top = s.tot ?? Infinity;
    const onder = Math.max(vorige, vrijstelling);
    const boven = Math.min(inkomen, top);
    if (boven > onder) {
      heffing += ((boven - onder) * s.tarief) / 100;
      if (i === 0 && aow) heffing -= ((boven - onder) * aowVerlagingEersteSchijf) / 100;
    }
    vorige = top;
  });
  return heffing;
}

/** Te betalen box 1-belasting van één persoon: heffing min kortingen, nooit negatief. */
export function belastingBox1(inkomen: number, p: Parameters, k: PersoonKenmerken): number {
  if (inkomen <= 0) return 0;
  return Math.max(0, heffingVoorKortingen(inkomen, p, k.aow) - heffingskortingen(inkomen, p, k).totaal);
}

/**
 * Tarief van de schijf waarin dit inkomen valt (in procent), 0 onder de vrijstelling. Zonder kortingen en
 * zonder AOW-verlaging; zo gebruikt voor de aftrek eigen woning en het gedragseffect, zoals in het prototype.
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
