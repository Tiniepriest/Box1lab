import { describe, expect, it } from "vitest";
import { herweeg } from "./herweeg.ts";

describe("herweging", () => {
  // Vier huishoudens: twee huurders, twee kopers; twee met kinderen.
  const start = [1, 1, 1, 1];
  const huur = [1, 1, 0, 0];
  const kinderen = [1, 0, 1, 0];
  const opties = { minimaleFactor: 0.01, maximaleFactor: 100, iteraties: 100 };

  it("haalt twee marges tegelijk", () => {
    const r = herweeg(
      start,
      [
        { naam: "totaal", waarden: [1, 1, 1, 1], doel: 10 },
        { naam: "huur", waarden: huur, doel: 3 },
        { naam: "kinderen", waarden: kinderen, doel: 6 },
      ],
      opties,
    );
    expect(r.geconvergeerd).toBe(true);
    for (const a of r.afwijkingen) expect(Math.abs(a.relatief)).toBeLessThan(1e-6);
  });

  it("haalt een totaal (bedrag) naast een aantal", () => {
    const inkomen = [10, 20, 30, 40];
    const r = herweeg(
      start,
      [
        { naam: "totaal", waarden: [1, 1, 1, 1], doel: 4 },
        { naam: "inkomen", waarden: inkomen, doel: 120 },
      ],
      opties,
    );
    expect(r.geconvergeerd).toBe(true);
    expect(r.gewichten.reduce((s, w, i) => s + w * inkomen[i]!, 0)).toBeCloseTo(120, 6);
  });

  it("blijft binnen de grenzen en meldt als een doel niet haalbaar is", () => {
    const r = herweeg(start, [{ naam: "huur", waarden: huur, doel: 100 }], {
      minimaleFactor: 0.5,
      maximaleFactor: 2,
      iteraties: 50,
    });
    expect(r.geconvergeerd).toBe(false);
    for (const w of r.gewichten) {
      expect(w).toBeGreaterThanOrEqual(0.5 - 1e-12);
      expect(w).toBeLessThanOrEqual(2 + 1e-12);
    }
  });

  it("verandert niets als de doelen al gehaald worden", () => {
    const r = herweeg(start, [{ naam: "totaal", waarden: [1, 1, 1, 1], doel: 4 }], opties);
    expect(r.gewichten).toEqual([1, 1, 1, 1]);
    expect(r.iteraties).toBe(0);
  });
});
