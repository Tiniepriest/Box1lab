import { describe, expect, it } from "vitest";
import { indelingen, maakBasis, pasToe, simuleer } from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie, laadPresets } from "../src/node/index.ts";

/* Brede groepen in het scenariolab (D-094). */
describe("groepen", () => {
  const p = laadParameters(2026);
  const basis = maakBasis(p, laadPopulatie(2026).huishoudens, laadKalibratie(2026));
  const preset = laadPresets(p).find((x) => x.wijzigingen.length)!;
  const u = simuleer(basis, pasToe(p, preset.wijzigingen));
  const ind = indelingen(p);

  it("deelt elk huishouden in precies één bestaande groep in", () => {
    expect(basis.groepen).toHaveLength(ind.length);
    basis.groepen.forEach((g, j) => {
      expect(g).toHaveLength(basis.populatie.length);
      expect(g.every((k) => k >= 0 && k < ind[j]!.groepen.length)).toBe(true);
    });
  });

  it("groepen van een indeling zijn samen de hele bevolking", () => {
    for (const effecten of u.groepen) {
      expect(effecten.reduce((s, e) => s + e.omvang, 0)).toBeCloseTo(100, 6);
    }
  });

  it("het gewogen gemiddelde van de groepen is het landelijke effect", () => {
    const landelijk = u.resultaten.reduce(
      (s, r, i) => s + (r.besteedbaar - basis.resultaten[i]!.besteedbaar) * basis.populatie[i]!.gewicht,
      0,
    );
    // Per groep: gemiddeld × aantal huishoudens = som van de verandering.
    const som = (effecten: typeof u.decielen, groep: readonly number[]) =>
      effecten.reduce(
        (s, e, k) =>
          s + e.gemiddeld * basis.populatie.reduce((t, h, i) => t + (groep[i] === k ? h.gewicht : 0), 0),
        0,
      );
    expect(som(u.decielen, basis.decielen) / landelijk).toBeCloseTo(1, 6);
    u.groepen.forEach((effecten, j) =>
      expect(som(effecten, basis.groepen[j]!) / landelijk).toBeCloseTo(1, 6),
    );
  });

  it("AOW'ers en bijstand zitten in de goede groep", () => {
    const bron = ind.findIndex((x) => x.id === "bron");
    const groep = (label: string) => ind[bron]!.groepen.findIndex((g) => g.label === label);
    basis.populatie.forEach((h, i) => {
      const k = basis.groepen[bron]![i]!;
      if (h.leden.every((l) => l.soort === "aow")) expect(k).toBe(groep("AOW'ers"));
      if (
        h.leden.length === 1 &&
        h.leden[0]!.soort === "uitkering" &&
        h.leden[0]!.uitkeringSoort === "bijstand"
      )
        expect(k).toBe(groep("Bijstand"));
    });
  });

  it("de leeftijdsgrenzen komen uit de parameters", () => {
    const leeftijd = ind.find((x) => x.id === "leeftijd")!;
    expect(leeftijd.groepen[0]!.label).toBe(`Jonger dan ${p.methodiek.leeftijdsgroepen[0]}`);
    expect(leeftijd.groepen[3]!.label).toContain(String(p.uitkeringen.aowLeeftijd));
  });
});
