import { describe, expect, it } from "vitest";
import {
  belastingBox1,
  berekenHuishouden,
  heffingskortingen,
  maakBasis,
  maakHuishouden,
  pasToe,
  simuleer,
  type PersoonKenmerken,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie, laadPresets } from "../src/node/index.ts";

const p = laadParameters(2026);
const k: PersoonKenmerken = { werkt: false, aow: false, alleenstaand: true, combinatiekorting: false };
const negatief = pasToe(p, [{ parameter: "box1.negatieveBelasting", zet: true }]);
const basisinkomen = (bedrag: number) =>
  pasToe(p, [{ parameter: "basisinkomen.perVolwassenePerMaand", zet: bedrag }]);

const alleen = (inkomen: number, soort: "werk" | "uitkering" | "aow") =>
  maakHuishouden(
    {
      inkomen1: inkomen,
      soort1: soort,
      soort2: null,
      inkomen2: 0,
      kinderLeeftijden: [],
      huurPerMaand: 0,
      hypotheekrente: 0,
      woz: 0,
      kinderopvangKosten: 0,
    },
    p,
  );

describe("negatieve belasting", () => {
  it("staat uit in de huidige wet: belasting is nooit negatief", () => {
    expect(belastingBox1(0, 0, p, k)).toBe(0);
    expect(belastingBox1(5000, 0, p, k)).toBe(0);
  });

  it("aan: wie te weinig belasting betaalt, krijgt de korting uitbetaald", () => {
    const korting = heffingskortingen(0, 0, negatief, k).totaal;
    expect(korting).toBeGreaterThan(0);
    expect(belastingBox1(0, 0, negatief, k)).toBeCloseTo(-korting, 6);
  });

  it("vlaktaks 35% boven € 24.000 wordt een negatieve inkomstenbelasting van Friedman", () => {
    const vlak = laadPresets(p).find((x) => x.id === "vlaktaks-35")!;
    const nit = pasToe(pasToe(p, vlak.wijzigingen), [{ parameter: "box1.negatieveBelasting", zet: true }]);
    expect(belastingBox1(0, 0, nit, k)).toBeCloseTo(-0.35 * 24000, 6);
    expect(belastingBox1(14000, 14000, nit, k)).toBeCloseTo(-0.35 * 10000, 6);
    expect(belastingBox1(24000, 24000, nit, k)).toBeCloseTo(0, 6);
    expect(belastingBox1(34000, 34000, nit, k)).toBeCloseTo(0.35 * 10000, 6);
  });

  it("de bijstand blijft netto gelijk: een uitbetaling gaat van de bijstand af", () => {
    const vlak = laadPresets(p).find((x) => x.id === "vlaktaks-35")!;
    const nit = pasToe(pasToe(p, vlak.wijzigingen), [{ parameter: "box1.negatieveBelasting", zet: true }]);
    const h = alleen(0, "uitkering");
    const voor = berekenHuishouden(h, p);
    const na = berekenHuishouden(h, nit, p);
    expect(na.bruto - na.belasting).toBeCloseTo(voor.bruto - voor.belasting, 0);
    expect(na.uitkeringKosten).toBeLessThan(0);
  });
});

describe("basisinkomen", () => {
  it("een werkende houdt het hele basisinkomen over", () => {
    const h = alleen(40000, "werk");
    const verschil =
      berekenHuishouden(h, basisinkomen(500), p).besteedbaar - berekenHuishouden(h, p).besteedbaar;
    expect(verschil).toBeCloseTo(6000, 6);
  });

  it("komt in plaats van een deel van de bijstand en de AOW", () => {
    for (const h of [alleen(0, "uitkering"), alleen(25000, "aow")]) {
      const voor = berekenHuishouden(h, p).besteedbaar;
      const na = berekenHuishouden(h, basisinkomen(500), p);
      expect(na.besteedbaar).toBeCloseTo(voor, 0);
      expect(na.basisinkomen).toBe(6000);
    }
  });

  it("met een vlaktaks houdt de bijstand met toeslagen hetzelfde netto bedrag", () => {
    const scenario = pasToe(p, [
      { parameter: "basisinkomen.perVolwassenePerMaand", zet: 1000 },
      { parameter: "box1.schijven", zet: [{ tot: null, tarief: 50 }] },
      { parameter: "heffingskortingen.algemeen.niveau", zet: 0 },
    ]);
    const h = { ...alleen(0, "uitkering"), huurPerMaand: 700 };
    const voor = berekenHuishouden(h, p);
    const na = berekenHuishouden(h, scenario, p);
    expect(voor.toeslagen).toBeGreaterThan(0);
    expect(na.besteedbaar).toBeCloseTo(voor.besteedbaar, 0);
  });

  it("kost de overheid het bedrag maal het aantal volwassenen, min wat de uitkeringen minder kosten", () => {
    const basis = maakBasis(p, laadPopulatie(2026).huishoudens, laadKalibratie(2026));
    const u = simuleer(basis, basisinkomen(100));
    expect(u.posten.basisinkomen).toBeLessThan(-1);
    expect(u.posten.uitkeringen).toBeGreaterThan(0);
  });
});
