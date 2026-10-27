import { describe, expect, it } from "vitest";
import {
  berekenHuishouden,
  genereerPopulatie,
  inkomenscurve,
  maakBasis,
  pasToe,
  simuleer,
  type Huishouden,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatieSpec } from "../src/node/index.ts";

/* Eigenschapstests (HANDOFF §5.3). */

const params = laadParameters(2026);
const pop = genereerPopulatie(laadPopulatieSpec(2026), params);
const basis = maakBasis(params, pop, laadKalibratie(2026));

describe("huidig beleid als scenario", () => {
  it("geeft nul verschil, ook als kopie van de parameters", () => {
    const kopie = structuredClone(params);
    const u = simuleer(basis, kopie);
    expect(Math.abs(u.saldoMld)).toBeLessThan(1e-9);
    u.decielen.forEach((d) => expect(Math.abs(d.gemiddeld)).toBeLessThan(1e-6));
    expect(u.winnaars[2]).toBeCloseTo(100, 9);
  });
});

describe("netto inkomen stijgt met bruto inkomen", () => {
  const alleenstaand = (x: number): Huishouden => ({
    leden: [{ inkomen: x, soort: "werk", uitkering: 0 }],
    partners: false,
    kinderen: 0,
    kindOnder12: false,
    huurPerMaand: 0,
    hypotheekrente: 0,
    woz: 0,
    kinderopvangKosten: 0,
  });
  const bruto = Array.from({ length: 300 }, (_, i) => 1000 + i * 1000);

  it("zonder toeslagen is het besteedbaar inkomen niet-dalend", () => {
    const c = inkomenscurve(alleenstaand, params, params, bruto);
    c.besteedbaar.slice(1).forEach((b, i) => expect(b).toBeGreaterThanOrEqual(c.besteedbaar[i]! - 1e-9));
  });

  it("de marginale druk zonder toeslagen ligt tussen 0% en 100%", () => {
    const c = inkomenscurve(alleenstaand, params, params, bruto);
    c.marginaleDruk.forEach((m) => {
      expect(m).toBeGreaterThanOrEqual(-1e-9);
      expect(m).toBeLessThan(100);
    });
  });
});

describe("niveau-knoppen", () => {
  const huurder: Huishouden = {
    leden: [{ inkomen: 22000, soort: "werk", uitkering: 0 }],
    partners: false,
    kinderen: 1,
    kindOnder12: true,
    huurPerMaand: 800,
    hypotheekrente: 0,
    woz: 0,
    kinderopvangKosten: 5000,
  };
  it.each([
    ["toeslagen.zorgtoeslag.niveau", "zorgtoeslag"],
    ["toeslagen.huurtoeslag.niveau", "huurtoeslag"],
    ["toeslagen.kindgebondenBudget.niveau", "kgb"],
    ["toeslagen.kinderopvangtoeslag.niveau", "kot"],
  ] as const)("%s op 0 schaft de toeslag af, op 50 halveert hem", (pad, veld) => {
    const nu = berekenHuishouden(huurder, params)[veld];
    expect(nu).toBeGreaterThan(0);
    expect(berekenHuishouden(huurder, pasToe(params, [{ parameter: pad, zet: 0 }]))[veld]).toBe(0);
    expect(berekenHuishouden(huurder, pasToe(params, [{ parameter: pad, zet: 50 }]))[veld]).toBeCloseTo(
      nu / 2,
      9,
    );
  });
});

describe("prestatie (HANDOFF §5.1: ruim onder 50 ms)", () => {
  it("rekent de hele populatie snel door", () => {
    const flat = pasToe(params, [
      { parameter: "box1.vrijstelling", zet: 18000 },
      { parameter: "box1.schijven", zet: [{ tot: null, tarief: 40 }] },
    ]);
    simuleer(basis, flat); // opwarmen
    const n = 10;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) simuleer(basis, flat);
    const ms = (performance.now() - t0) / n;
    console.log(`simuleer: ${ms.toFixed(1)} ms per scenario (${pop.length} huishoudens)`);
    expect(ms).toBeLessThan(50);
  });
});
