import { berekenHuishouden, type Huishouden } from "../huishouden.ts";
import type { Parameters } from "../parameters/schema.ts";

export interface Curve {
  bruto: number[];
  besteedbaar: number[];
  /**
   * Marginale druk in procent: welk deel van een extra euro verdwijnt aan belasting en minder toeslag. De
   * pensioenpremie telt niet mee: dat is opbouw voor later, geen verlies.
   */
  marginaleDruk: number[];
}

/** Besteedbaar inkomen plus de eigen pensioenpremie: de grondslag voor de marginale druk. */
function voorDruk(r: { besteedbaar: number; pensioenpremie: number }): number {
  return r.besteedbaar + r.pensioenpremie;
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
  const r = (x: number) => berekenHuishouden(maak(x), params, basis);
  const nu = bruto.map(r);
  const marginaleDruk = bruto.map((x, i) => (1 - (voorDruk(r(x + stap)) - voorDruk(nu[i]!)) / stap) * 100);
  return { bruto: [...bruto], besteedbaar: nu.map((x) => x.besteedbaar), marginaleDruk };
}

/** Het huishouden met een ander bruto inkomen voor één persoon (bij een uitkering verandert de uitkering mee). */
export function metInkomen(h: Huishouden, lid: number, bruto: number): Huishouden {
  return {
    ...h,
    leden: h.leden.map((l, i) => {
      if (i !== lid) return l;
      if (l.soort === "uitkering") return { ...l, inkomen: bruto, uitkering: bruto };
      if (l.soort === "aow") return { ...l, inkomen: Math.max(bruto, l.uitkering) };
      return { ...l, inkomen: bruto, soort: l.soort === "geen" && bruto > 0 ? "werk" : l.soort };
    }),
  };
}

/** Marginale druk (procent) van één persoon in een huishouden: wat gaat er af van `stap` euro extra bruto? */
export function marginaleDrukVan(
  h: Huishouden,
  p: Parameters,
  lid = 0,
  stap = 100,
  basis?: Parameters,
): number {
  const nu = voorDruk(berekenHuishouden(h, p, basis));
  const meer = voorDruk(berekenHuishouden(metInkomen(h, lid, h.leden[lid]!.inkomen + stap), p, basis));
  return (1 - (meer - nu) / stap) * 100;
}
