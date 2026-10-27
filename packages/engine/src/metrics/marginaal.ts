import { berekenHuishouden, type Huishouden } from "../huishouden.ts";
import type { Parameters } from "../parameters/schema.ts";

export interface Curve {
  bruto: number[];
  besteedbaar: number[];
  /** Marginale druk in procent: welk deel van een extra euro verdwijnt aan belasting en minder toeslag. */
  marginaleDruk: number[];
}

/**
 * Besteedbaar inkomen en marginale druk van één type huishouden over een reeks bruto inkomens.
 * Statisch: het gedragseffect staat uit, zodat de curve alleen de regels laat zien.
 */
export function inkomenscurve(
  maak: (bruto: number) => Huishouden,
  p: Parameters,
  basis: Parameters,
  bruto: readonly number[],
  stap = 1000,
): Curve {
  const params = p.gedrag.eti ? { ...p, gedrag: { ...p.gedrag, eti: 0 } } : p;
  const b = (x: number) => berekenHuishouden(maak(x), params, basis).besteedbaar;
  const besteedbaar = bruto.map(b);
  const marginaleDruk = bruto.map((x, i) => (1 - (b(x + stap) - besteedbaar[i]!) / stap) * 100);
  return { bruto: [...bruto], besteedbaar, marginaleDruk };
}
