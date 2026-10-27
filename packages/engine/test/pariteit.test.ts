import { beforeAll, describe, expect, it } from "vitest";
import {
  berekenHuishouden,
  budgetneutraalViaTarieven,
  budgetneutraalViaVrijstelling,
  genereerPopulatie,
  maakBasis,
  maakHuishouden,
  pasToe,
  simuleer,
  type Basis,
  type EenvoudigeInvoer,
  type Huishouden,
  type InkomensSoort,
  type Parameters,
  type Preset,
  type Uitkomst,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatieSpec, laadPresets } from "../src/node/index.ts";
import golden from "./golden/prototype-2026.json";

/*
 * Fase 1: de TypeScript-engine moet het prototype reproduceren (HANDOFF §9).
 * golden/prototype-2026.json is gemaakt door scripts/prototype-golden.cjs uit de ongewijzigde prototype-engine.
 *
 * Deze test hoort bij fase 1. Zodra de engine in fase 2 bewust verandert, wordt hij vervangen door golden
 * tests op de nieuwe engine; de verschillen staan dan verklaard in docs/DECISIONS.md.
 */

/** Volgorde van de scenario's in het prototype (PRESETS in engine.js). */
const PROTOTYPE_VOLGORDE = [
  "huidig",
  "vlaktaks-40",
  "drie-schijven-35-40-45",
  "zonder-huurtoeslag",
  "zonder-hra",
  "zonder-hra-en-forfait",
];

let params: Parameters;
let basis: Basis;
let presets: Preset[];
const uitkomsten: Record<string, Uitkomst> = {};
const scenario = (id: string) => pasToe(params, presets.find((p) => p.id === id)!.wijzigingen);

beforeAll(() => {
  params = laadParameters(2026);
  presets = laadPresets(params);
  const pop = genereerPopulatie(laadPopulatieSpec(2026), params);
  basis = maakBasis(params, pop, laadKalibratie(2026));
  for (const id of PROTOTYPE_VOLGORDE) uitkomsten[id] = simuleer(basis, scenario(id));
});

describe("kalibratie (HANDOFF §2)", () => {
  it("populatie heeft 8,25 mln huishoudens en 16,9 mln personen", () => {
    expect(basis.populatie).toHaveLength(1200);
    expect(basis.totalen.huishoudens).toBeCloseTo(golden.kalibratie.huishoudens, 0);
    expect(basis.totalen.personen).toBeCloseTo(golden.kalibratie.personen, 0);
  });

  it("modeltotalen gelijk aan het prototype", () => {
    const t = basis.totalen;
    const g = golden.kalibratie.modelMld;
    expect(t.belasting - t.eigenWoning).toBeCloseTo(g.ib, 3);
    expect(t.hypotheekrente).toBeCloseTo(g.hypotheekrente, 3);
    expect(t.zorgtoeslag).toBeCloseTo(g.zorgtoeslag, 3);
    expect(t.huurtoeslag).toBeCloseTo(g.huurtoeslag, 3);
    expect(t.kgb).toBeCloseTo(g.kgb, 3);
    expect(t.kot).toBeCloseTo(g.kot, 3);
  });

  it("schaalfactoren zoals in de handoff-tabel", () => {
    expect(basis.schaal.ib).toBeCloseTo(0.99, 2);
    expect(basis.schaal.zorgtoeslag).toBeCloseTo(1.19, 2);
    expect(basis.schaal.huurtoeslag).toBeCloseTo(0.9, 2);
    expect(basis.schaal.kgb).toBeCloseTo(0.87, 2);
    expect(basis.schaal.kot).toBeCloseTo(1.06, 2);
  });

  it("armoedegrens gelijk aan het prototype", () => {
    expect(basis.armoedegrens).toBeCloseTo(golden.armoedegrens, 2);
  });
});

describe("scenario's (HANDOFF §2, ±0,1 mld en ±0,1 procentpunt)", () => {
  const tabel: [string, number, number, number | null][] = [
    ["huidig", 0, 11.3, 0.271],
    ["vlaktaks-40", 30.7, 23.4, 0.331],
    ["drie-schijven-35-40-45", 20.8, 22.7, null],
    ["zonder-huurtoeslag", 5.6, 14.9, null],
    ["zonder-hra", 9.4, 11.5, null],
    ["zonder-hra-en-forfait", 5.5, 11.5, null],
  ];
  it.each(tabel)("%s: saldo %f mld, armoede %f%%", (id, saldo, armoede, g) => {
    const u = uitkomsten[id]!;
    // De handoff-tabel is afgerond op één decimaal; de echte waarden staan in het golden-bestand.
    expect(Math.abs(u.saldoMld - saldo)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(u.armoede.personen - armoede)).toBeLessThanOrEqual(0.1);
    if (g !== null) expect(Math.abs(u.gini - g)).toBeLessThanOrEqual(0.001);
  });
});

describe("scenario's: exacte pariteit met het golden-bestand", () => {
  golden.scenarios.forEach((g, i) => {
    const id = PROTOTYPE_VOLGORDE[i]!;
    it(`${id}`, () => {
      const u = uitkomsten[id]!;
      expect(u.saldoMld).toBeCloseTo(g.saldoMld, 3);
      for (const [post, waarde] of Object.entries(g.posten)) {
        expect(u.posten[post as keyof typeof u.posten], post).toBeCloseTo(waarde, 3);
      }
      expect(u.armoede.personen).toBeCloseTo(g.armoede, 3);
      expect(u.armoede.kinderen).toBeCloseTo(g.armoedeKinderen, 3);
      expect(u.gini).toBeCloseTo(g.gini, 5);
      u.decielen.forEach((d, k) => {
        const gd = g.decielen[k]!;
        expect(d.gemiddeld, `deciel ${k + 1}`).toBeCloseTo(gd.gemiddeld, 0);
        expect(d.relatief, `deciel ${k + 1}`).toBeCloseTo(gd.relatief, 3);
        d.aandelen.forEach((a, c) =>
          expect(a, `deciel ${k + 1} klasse ${c}`).toBeCloseTo(gd.aandelen[c]!, 3),
        );
      });
      u.winnaars.forEach((a, c) => expect(a).toBeCloseTo(g.alle[c]!, 3));
    });
  });
});

describe("voorbeeldhuishoudens", () => {
  const soort = (s: string): InkomensSoort => (s === "uitk" ? "uitkering" : (s as InkomensSoort));
  golden.voorbeeldhuishoudens.forEach((v) => {
    it(`${v.pc}`, () => {
      const e = v.invoer;
      const invoer: EenvoudigeInvoer = {
        inkomen1: e.x1,
        soort1: soort(e.s1),
        soort2: e.s2 ? soort(e.s2) : null,
        inkomen2: e.x2,
        kinderen: e.kids,
        kindOnder12: e.kids12,
        huurPerMaand: e.huur,
        hypotheekrente: e.rente,
        woz: e.woz,
        kinderopvangKosten: e.kotKosten,
      };
      const h = maakHuishouden(invoer, params);
      PROTOTYPE_VOLGORDE.forEach((id, i) => {
        const p = scenario(id);
        const r = berekenHuishouden(h, p, p === params ? undefined : params);
        const g = v.scenarios[i]!;
        expect(r.besteedbaar, `${id} besteedbaar`).toBeCloseTo(g.besteedbaar, 2);
        expect(r.belasting, `${id} belasting`).toBeCloseTo(g.belasting, 2);
        expect(r.toeslagen, `${id} toeslagen`).toBeCloseTo(g.zorgtoeslag + g.huurtoeslag + g.kgb + g.kot, 2);
        expect(r.uitkeringKosten, `${id} uitkeringKosten`).toBeCloseTo(g.uitkeringKosten, 2);
      });
    });
  });
});

describe("inkomenscurves", () => {
  const curves: ((x: number) => Huishouden)[] = [
    (x) => ({
      leden: [{ inkomen: x, soort: "werk", uitkering: 0 }],
      partners: false,
      kinderen: 0,
      kindOnder12: false,
      huurPerMaand: 850,
      hypotheekrente: 0,
      woz: 0,
      kinderopvangKosten: 0,
    }),
    (x) => ({
      leden: [{ inkomen: x, soort: "werk", uitkering: 0 }],
      partners: false,
      kinderen: 1,
      kindOnder12: true,
      huurPerMaand: 850,
      hypotheekrente: 0,
      woz: 0,
      kinderopvangKosten: 0,
    }),
    (x) => ({
      leden: [
        { inkomen: x, soort: "werk", uitkering: 0 },
        { inkomen: 0, soort: "geen", uitkering: 0 },
      ],
      partners: true,
      kinderen: 2,
      kindOnder12: true,
      huurPerMaand: 950,
      hypotheekrente: 0,
      woz: 0,
      kinderopvangKosten: 0,
    }),
    (x) => ({
      leden: [
        { inkomen: 0.6 * x, soort: "werk", uitkering: 0 },
        { inkomen: 0.4 * x, soort: "werk", uitkering: 0 },
      ],
      partners: true,
      kinderen: 2,
      kindOnder12: true,
      huurPerMaand: 0,
      hypotheekrente: 0.034 * 3.6 * x * 0.8,
      woz: Math.max(260000, 4.6 * x),
      kinderopvangKosten: 0,
    }),
  ];
  golden.curves.forEach((punten, c) => {
    it(`curve ${c + 1}`, () => {
      const flat = scenario("vlaktaks-40");
      for (const pt of punten) {
        expect(berekenHuishouden(curves[c]!(pt.x), params).besteedbaar).toBeCloseTo(pt.huidig, 2);
        expect(berekenHuishouden(curves[c]!(pt.x), flat, params).besteedbaar).toBeCloseTo(pt.flat, 2);
      }
    });
  });
});

describe("budgetneutraal maken (HANDOFF §2: vrijstelling ±€26.700 of tarieven × 0,815)", () => {
  it("via vrijstelling", () => {
    const o = budgetneutraalViaVrijstelling(basis, scenario("vlaktaks-40"));
    expect(o.gelukt).toBe(true);
    if (o.gelukt) {
      expect(o.waarde).toBeCloseTo(golden.oplosser.flatVrijstelling, 0);
      expect(Math.abs(simuleer(basis, o.params).saldoMld)).toBeLessThan(0.01);
    }
  });
  it("via tarieven", () => {
    const o = budgetneutraalViaTarieven(basis, scenario("vlaktaks-40"));
    expect(o.gelukt).toBe(true);
    if (o.gelukt) {
      expect(o.waarde).toBeCloseTo(golden.oplosser.flatTariefFactor, 4);
      expect(Math.abs(simuleer(basis, o.params).saldoMld)).toBeLessThan(0.01);
    }
  });
});
