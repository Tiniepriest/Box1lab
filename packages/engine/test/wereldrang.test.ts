import { describe, expect, it } from "vitest";
import { giniWereldPlek, valideerGiniLanden, type GiniLanden } from "../src/index.ts";
import { laadGiniLanden } from "../src/node/index.ts";

/* De Gini van Nederland op de wereldranglijst (D-097). */
describe("giniWereldPlek", () => {
  const lijst: GiniLanden = {
    bron: "test",
    opgehaald: "2026-01-01",
    vanafJaar: 2020,
    nederland: { waarde: 26, jaar: 2021 },
    landen: [
      { code: "AAA", land: "A", waarde: 24, jaar: 2022 },
      { code: "BBB", land: "B", waarde: 26, jaar: 2022 },
      { code: "CCC", land: "C", waarde: 30, jaar: 2022 },
      { code: "DDD", land: "D", waarde: 40, jaar: 2022 },
    ],
  };

  it("geeft zonder verandering de plek van de Wereldbank; een gelijke index deelt de plek", () => {
    expect(giniWereldPlek(lijst, 0.22, 0.22)).toEqual({ plek: 2, van: 5, index: 26 });
  });

  it("telt de verandering van het model op bij het cijfer van de Wereldbank", () => {
    // 0,22 → 0,26: vier punten erbij, index 30, gelijk met C.
    expect(giniWereldPlek(lijst, 0.26, 0.22)).toEqual({ plek: 3, van: 5, index: 30 });
    expect(giniWereldPlek(lijst, 0.3, 0.22).plek).toBe(4);
    expect(giniWereldPlek(lijst, 0.1, 0.22).plek).toBe(1);
  });

  it("rondt af op één decimaal, zoals de Wereldbank", () => {
    // Een heel klein verschil verandert de plek niet.
    expect(giniWereldPlek(lijst, 0.22001, 0.22).plek).toBe(2);
  });

  it("weigert Nederland in de lijst, dubbele landen en te oude cijfers", () => {
    const fout = (landen: GiniLanden["landen"]) => () => valideerGiniLanden({ ...lijst, landen });
    expect(fout([{ code: "NLD", land: "Netherlands", waarde: 26, jaar: 2022 }])).toThrow(/apart/);
    expect(fout([lijst.landen[0]!, lijst.landen[0]!])).toThrow(/dubbel/);
    expect(fout([{ ...lijst.landen[0]!, jaar: 2019 }])).toThrow(/vanafJaar/);
  });

  it("het databestand is geldig en Nederland staat erin", () => {
    const g = laadGiniLanden();
    expect(g.landen.length).toBeGreaterThan(100);
    const p = giniWereldPlek(g, 0.25, 0.25);
    expect(p.index).toBe(g.nederland.waarde);
    expect(p.plek).toBe(g.landen.filter((l) => l.waarde < g.nederland.waarde).length + 1);
  });
});
