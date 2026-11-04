import { describe, expect, it } from "vitest";
import {
  belastingPerDeciel,
  berekenHuishouden,
  maakBasis,
  pasToe,
  simuleer,
  type Huishouden,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie, laadPresets } from "../src/node/index.ts";

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

describe("uitkeringen en toeslagen per inkomensgroep (D-082)", () => {
  const v = belastingPerDeciel(basis);
  const preset = (id: string) => pasToe(p, laadPresets(p).find((x) => x.id === id)!.wijzigingen);

  it("telt bruto uitkeringen, toeslagen, kinderbijslag en basisinkomen op", () => {
    const totaal = basis.resultaten.reduce(
      (a, r, i) =>
        a + (r.uitkering + r.toeslagen + r.kinderbijslag + r.basisinkomen) * basis.populatie[i]!.gewicht,
      0,
    );
    expect(som(v.ontvangen)).toBeCloseTo(totaal / 1e9, 6);
    expect(v.ontvangen[0]!).toBeGreaterThan(v.ontvangen[9]!);
  });

  it("toeslagen afschaffen: de belasting blijft gelijk, elke groep ontvangt minder", () => {
    const s = belastingPerDeciel(basis, simuleer(basis, preset("toeslagen-afschaffen")).resultaten);
    s.box1.forEach((b, i) => expect(b).toBeCloseTo(v.box1[i]!, 9));
    s.ontvangen.forEach((o, i) => expect(o).toBeLessThan(v.ontvangen[i]!));
  });

  const alleen = (leden: Huishouden["leden"]): Huishouden => ({
    leden,
    partners: false,
    kinderen: [],
    huurPerMaand: 0,
    hypotheekrente: 0,
    woz: 0,
    kinderopvang: [],
    vermogen: 0,
  });

  it("een uitkering telt bruto; loon en aanvullend pensioen tellen niet", () => {
    expect(berekenHuishouden(alleen([{ inkomen: 40000, soort: "werk", uitkering: 0 }]), p).uitkering).toBe(0);
    const aow = alleen([{ inkomen: 30000, soort: "aow", uitkering: 18000 }]);
    expect(berekenHuishouden(aow, p).uitkering).toBe(18000);
    const bijstand = alleen([
      { inkomen: 15000, soort: "uitkering", uitkering: 15000, uitkeringSoort: "bijstand" },
    ]);
    expect(berekenHuishouden(bijstand, p).uitkering).toBe(15000);
  });

  it("netto-koppeling: wat de bijstand bruto meer krijgt, betaalt hij aan belasting", () => {
    const h = alleen([{ inkomen: 15000, soort: "uitkering", uitkering: 15000, uitkeringSoort: "bijstand" }]);
    const hoger = pasToe(p, [{ parameter: "box1.schijven.0.tarief", plus: 5 }]);
    const voor = berekenHuishouden(h, p);
    const na = berekenHuishouden(h, hoger, p);
    expect(na.uitkering - voor.uitkering).toBeCloseTo(na.belasting - voor.belasting, 1);
    expect(na.uitkering).toBeGreaterThan(voor.uitkering);
  });
});
