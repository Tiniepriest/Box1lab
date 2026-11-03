import { describe, expect, it } from "vitest";
import {
  berekenHuishouden,
  huishoudenUitInvoer,
  jaarovergangPerOnderdeel,
  type Invoer,
} from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

const nu = laadParameters(2026);
const volgend = laadParameters(2027);

const persoon = {
  leeftijd: 40,
  soort: "loondienst" as const,
  bedrag: 3000,
  periode: "maand" as const,
  inclusiefVakantiegeld: false,
  dertiendeMaand: false,
  extraPerJaar: 0,
  pensioenpremiePerMaand: 0,
  urencriterium: true,
  starter: false,
};

const invoer: Invoer = {
  personen: [persoon, { ...persoon, leeftijd: 70, soort: "aow", bedrag: 800 }],
  kinderen: [{ leeftijd: 6, inkomen: 0, opvang: "geen", urenPerMaand: 0, uurprijs: 0 }],
  wonen: "huur",
  huurPerMaand: 900,
  woz: 0,
  hypotheekrente: 0,
  vermogen: 0,
  beleggingen: 0,
  schulden: 0,
};

describe("jaarovergang per onderdeel", () => {
  it("de onderdelen tellen precies op tot het verschil tussen de jaren", () => {
    const { totaal, perOnderdeel } = jaarovergangPerOnderdeel(invoer, nu, volgend);
    const r = (p: typeof nu) => berekenHuishouden(huishoudenUitInvoer(invoer, p), p).besteedbaar;
    expect(totaal).toBeCloseTo(r(volgend) - r(nu), 6);
    const som = perOnderdeel.reduce((s, o) => s + o.effect, 0);
    expect(Math.abs(som - totaal)).toBeLessThan(0.5 * 14);
    expect(perOnderdeel.map((o) => o.label)).toContain("Tarieven en schijven");
  });

  it("zonder verschil tussen de jaren is er niets uit te splitsen", () => {
    expect(jaarovergangPerOnderdeel(invoer, nu, nu)).toEqual({ totaal: 0, perOnderdeel: [] });
  });
});
