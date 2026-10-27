import type { Parameters } from "../parameters/schema.ts";
import type { PersoonKenmerken } from "./heffingskortingen.ts";
import { brutoVoorNetto } from "./uitkeringen.ts";

/** Netto bijstandsnorm per jaar inclusief vakantiegeld: voor een alleenstaande, of voor een paar samen. */
export function bijstandsnormPerJaar(p: Parameters, partners: boolean): number {
  const n = p.bijstand[partners ? "gehuwden" : "alleenstaand"];
  return 6 * n.eersteHalfjaar + 6 * n.tweedeHalfjaar;
}

/**
 * Bruto bijstand per jaar voor één persoon. De gemeente vult het netto inkomen aan tot de norm:
 * - alleenstaand: de hele norm;
 * - een paar dat allebei bijstand heeft: ieder de helft van de gezinsnorm;
 * - een paar waarvan de partner ander inkomen heeft: de gezinsnorm min het netto inkomen van de partner.
 * Vrijlatingen, de kostendelersnorm en jongerennormen zitten niet in het model.
 */
export function bijstandBruto(
  p: Parameters,
  k: PersoonKenmerken,
  partnerHeeftOokBijstand: boolean,
  nettoPartner = 0,
): number {
  const norm = bijstandsnormPerJaar(p, !k.alleenstaand);
  const netto = k.alleenstaand ? norm : partnerHeeftOokBijstand ? norm / 2 : Math.max(0, norm - nettoPartner);
  return netto > 0 ? brutoVoorNetto(netto, k, p) : 0;
}
