import type { Parameters } from "../parameters/schema.ts";
import { schijfTarief } from "./box1.ts";

/**
 * Fiscaal effect van de eigen woning voor het huishouden (positief = voordeel).
 * Saldo = forfait − aftrekbare rente. Een negatief saldo levert belastingvoordeel op tegen hoogstens het
 * maximale aftrektarief; een positief saldo wordt belast tegen het schijftarief.
 *
 * Fase 1: zoals het prototype. Wet Hillen ontbreekt nog (HANDOFF §2, zwakke plek 5).
 */
export function eigenWoningVoordeel(
  hypotheekrente: number,
  woz: number,
  inkomen: number,
  p: Parameters,
): number {
  const { forfait, aftrekMaxTarief } = p.eigenWoning;
  const forfaitBedrag = (woz * forfait) / 100;
  const aftrek = aftrekMaxTarief > 0 ? hypotheekrente : 0;
  const saldo = forfaitBedrag - aftrek;
  const tarief = schijfTarief(inkomen, p);
  const aftrekTarief = Math.min(aftrekMaxTarief, tarief || aftrekMaxTarief);
  return saldo < 0 ? (-saldo * aftrekTarief) / 100 : (-saldo * tarief) / 100;
}
