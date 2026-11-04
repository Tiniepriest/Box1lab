import { describe, expect, it } from "vitest";
import { belastingPerDeciel, maakBasis, pasToe, simuleer } from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie } from "../src/node/index.ts";

const p = laadParameters(2026);
const basis = maakBasis(p, laadPopulatie(2026).huishoudens, laadKalibratie(2026));
const som = (x: number[]) => x.reduce((a, b) => a + b, 0);

describe("wie betaalt de belasting", () => {
  const v = belastingPerDeciel(basis);

  it("telt op tot de totalen van box 1 en box 3", () => {
    expect(v.box1).toHaveLength(10);
    expect(som(v.box1)).toBeCloseTo(basis.totalen.belasting, 6);
    expect(som(v.box3)).toBeCloseTo(basis.totalen.box3, 6);
    expect(som(v.huishoudens)).toBeCloseTo(basis.totalen.huishoudens, 0);
  });

  it("de hoogste inkomensgroep betaalt het meest, in box 1 en in box 3", () => {
    expect(Math.max(...v.box1)).toBe(v.box1[9]);
    expect(Math.max(...v.box3)).toBe(v.box3[9]);
    expect(v.box1[9]!).toBeGreaterThan(v.box1[0]! * 5);
  });

  it("in een scenario dezelfde groepen, met de belasting van het scenario", () => {
    const u = simuleer(basis, pasToe(p, [{ parameter: "box1.schijven.0.tarief", zet: 40 }]));
    const s = belastingPerDeciel(basis, u.resultaten);
    expect(som(s.box1)).toBeCloseTo(u.totalen.belasting, 6);
    expect(s.huishoudens).toEqual(v.huishoudens);
    expect(s.box1[0]!).toBeGreaterThan(v.box1[0]!);
  });
});
