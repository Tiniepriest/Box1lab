import { describe, expect, it } from "vitest";
import { watAls, type Invoer } from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

const p = laadParameters(2026);

const persoon = {
  leeftijd: 35,
  soort: "loondienst" as const,
  bedrag: 2500,
  periode: "maand" as const,
  inclusiefVakantiegeld: false,
  dertiendeMaand: false,
  extraPerJaar: 0,
  pensioenpremiePerMaand: 0,
  urencriterium: true,
  starter: false,
};

const alleen: Invoer = {
  personen: [persoon],
  kinderen: [],
  wonen: "huur",
  huurPerMaand: 750,
  woz: 0,
  hypotheekrente: 0,
  vermogen: 0,
  beleggingen: 0,
  schulden: 0,
};

describe("wat als", () => {
  it("geeft voor een alleenstaande werknemer opslag, minder werken, samenwonen en een kind", () => {
    expect(watAls(alleen, p).map((w) => w.id)).toEqual(["opslag", "minder-werken", "samenwonen", "kind"]);
  });

  it("van € 100 opslag houd je minder dan € 100 over, en minder werken kost minder dan 20% netto", () => {
    const w = Object.fromEntries(watAls(alleen, p).map((x) => [x.id, x]));
    expect(w.opslag!.verschil).toBeGreaterThan(0);
    expect(w.opslag!.verschil).toBeLessThan(100 * 12 * 1.08);
    expect(w["minder-werken"]!.verschil).toBeLessThan(0);
    expect(-w["minder-werken"]!.verschil).toBeLessThan(0.2 * 2500 * 12 * 1.08);
  });

  it("een kind levert kinderbijslag op", () => {
    const kind = watAls(alleen, p).find((x) => x.id === "kind")!;
    expect(kind.toeslagen).toBeGreaterThan(0);
    expect(kind.verschil).toBeCloseTo(kind.toeslagen - kind.belasting, 6);
  });

  it("met een werkende partner: ook de partner kan minder werken, samenwonen valt weg", () => {
    const ids = watAls({ ...alleen, personen: [persoon, persoon] }, p).map((w) => w.id);
    expect(ids).toContain("partner-minder-werken");
    expect(ids).not.toContain("samenwonen");
  });
});
