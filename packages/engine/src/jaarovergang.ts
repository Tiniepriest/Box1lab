import { berekenHuishouden } from "./huishouden.ts";
import { huishoudenUitInvoer, type Invoer } from "./invoer.ts";
import type { Parameters } from "./parameters/schema.ts";

/*
 * Wat verandert er van het ene jaar op het andere, per onderdeel van de regels? De onderdelen van het nieuwe jaar
 * worden in vaste volgorde één voor één overgenomen; de verschillen tellen zo precies op tot het totaal. Wat niet
 * in de lijst staat (zoals het minimumloon), komt als laatste onder "Overig".
 */

export const ONDERDELEN: readonly { label: string; paden: readonly string[] }[] = [
  { label: "Tarieven en schijven", paden: ["box1"] },
  { label: "Algemene heffingskorting", paden: ["heffingskortingen.algemeen"] },
  { label: "Arbeidskorting", paden: ["heffingskortingen.arbeid"] },
  { label: "Ouderenkorting", paden: ["heffingskortingen.ouderen", "heffingskortingen.alleenstaandeOuderen"] },
  { label: "Combinatiekorting", paden: ["heffingskortingen.combinatie"] },
  { label: "Eigen woning", paden: ["eigenWoning"] },
  { label: "Zelfstandigenaftrek en startersaftrek", paden: ["ondernemers"] },
  { label: "Pensioenpremie", paden: ["pensioenpremie"] },
  { label: "Zorgpremie", paden: ["zorg"] },
  { label: "Toeslagen", paden: ["toeslagen"] },
  { label: "Kinderbijslag", paden: ["kinderbijslag"] },
  { label: "AOW, bijstand en uitkeringen", paden: ["uitkeringen", "bijstand"] },
];

export interface OnderdeelEffect {
  label: string;
  /** Verandering van het besteedbaar inkomen door dit onderdeel, euro per jaar. */
  effect: number;
}

function neemOver(doel: Record<string, unknown>, bron: Record<string, unknown>, pad: string): void {
  const delen = pad.split(".");
  const laatste = delen.pop()!;
  let d = doel;
  let b = bron;
  for (const deel of delen) {
    d = d[deel] as Record<string, unknown>;
    b = b[deel] as Record<string, unknown>;
  }
  d[laatste] = JSON.parse(JSON.stringify(b[laatste]));
}

/**
 * Het verschil in besteedbaar inkomen tussen `nu` en `volgend` voor dit huishouden, uitgesplitst per onderdeel.
 * Onderdelen zonder effect (minder dan 50 cent per jaar) vallen weg. De parameters worden via JSON gekopieerd, omdat
 * structuredClone niet werkt op de reactieve objecten van de site.
 */
export function jaarovergangPerOnderdeel(
  invoer: Invoer,
  nu: Parameters,
  volgend: Parameters,
): { totaal: number; perOnderdeel: OnderdeelEffect[] } {
  const besteedbaar = (p: Parameters) => berekenHuishouden(huishoudenUitInvoer(invoer, p), p).besteedbaar;
  const start = besteedbaar(nu);
  const p = JSON.parse(JSON.stringify(nu)) as Record<string, unknown>;
  const bron = volgend as unknown as Record<string, unknown>;
  let vorige = start;
  const stappen: OnderdeelEffect[] = [];
  for (const o of ONDERDELEN) {
    for (const pad of o.paden) neemOver(p, bron, pad);
    const x = besteedbaar(p as unknown as Parameters);
    stappen.push({ label: o.label, effect: x - vorige });
    vorige = x;
  }
  const eind = besteedbaar(volgend);
  stappen.push({ label: "Overig", effect: eind - vorige });
  return { totaal: eind - start, perOnderdeel: stappen.filter((s) => Math.abs(s.effect) >= 0.5) };
}
