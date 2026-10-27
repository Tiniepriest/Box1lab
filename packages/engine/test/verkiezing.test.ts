import { describe, expect, it } from "vitest";
import {
  alsWijzigingen,
  berekenHuishouden,
  effectVoorHuishouden,
  maakHuishouden,
  pasToe,
  partijWijzigingen,
  valideerPartij,
} from "../src/index.ts";
import { laadParameters, laadVerkiezing } from "../src/node/index.ts";

const p = laadParameters(2026);

describe("verkiezingsmodule", () => {
  it("de voorbeeldverkiezing toont alleen gepubliceerde partijen, alfabetisch", () => {
    const { verkiezing, partijen } = laadVerkiezing("voorbeeld");
    expect(verkiezing.fictief).toBe(true);
    expect(partijen.map((x) => x.naam)).toEqual(["Partij A", "Partij B"]);
  });

  it("in de previewmodus komen ook concepten mee", () => {
    expect(laadVerkiezing("voorbeeld", true).partijen.map((x) => x.id)).toContain("partij-c");
  });

  it("zet maatregelen om in wijzigingen", () => {
    const basis = {
      id: "m",
      omschrijving: "x",
      categorie: "belasting" as const,
      parameter: "box1.vrijstelling",
      bron: { document: "programma", pagina: 1 },
      zekerheid: "hoog" as const,
    };
    expect(alsWijzigingen({ ...basis, wijziging: { type: "plus", waarde: 5 } })).toEqual([
      { parameter: "box1.vrijstelling", plus: 5 },
    ]);
    expect(alsWijzigingen({ ...basis, wijziging: { type: "factor", waarde: 2 } })).toEqual([
      { parameter: "box1.vrijstelling", maal: 2 },
    ]);
    expect(alsWijzigingen({ ...basis, wijziging: { type: "zet", waarde: 9 } })).toEqual([
      { parameter: "box1.vrijstelling", zet: 9 },
    ]);
    const { parameter: _p, ...zonder } = basis;
    expect(
      alsWijzigingen({
        ...zonder,
        wijzigingen: [
          { parameter: "box1.vrijstelling", wijziging: { type: "plus", waarde: 1 } },
          { parameter: "box1.aowVerlagingEersteSchijf", wijziging: { type: "zet", waarde: 0 } },
        ],
      }),
    ).toHaveLength(2);
  });

  it("de effecten per maatregel tellen op tot het totaal", () => {
    const [a] = laadVerkiezing("voorbeeld").partijen;
    const h = maakHuishouden(
      {
        inkomen1: 45000,
        soort1: "werk",
        soort2: "werk",
        inkomen2: 25000,
        kinderLeeftijden: [4],
        huurPerMaand: 900,
        hypotheekrente: 0,
        woz: 0,
        kinderopvangKosten: 0,
      },
      p,
    );
    const e = effectVoorHuishouden(h, p, a!);
    const som = e.perMaatregel.reduce((s, m) => s + m.effect, 0);
    expect(som).toBeCloseTo(e.totaal, 6);
    const direct =
      berekenHuishouden(h, pasToe(p, partijWijzigingen(a!)), p).besteedbaar -
      berekenHuishouden(h, p).besteedbaar;
    expect(e.totaal).toBeCloseTo(direct, 6);
  });

  it("weigert een partij zonder paginanummer", () => {
    expect(() =>
      valideerPartij(
        {
          id: "x",
          naam: "X",
          programma: { titel: "x", url: "https://example.org/x", geraadpleegd: "2026-01-01" },
          status: "concept",
          maatregelen: [
            {
              id: "a",
              omschrijving: "x",
              categorie: "belasting",
              parameter: "box1.vrijstelling",
              wijziging: { type: "zet", waarde: 1000 },
              bron: { document: "programma" },
              zekerheid: "hoog",
            },
          ],
        },
        p,
      ),
    ).toThrow(/pagina/);
  });
});
