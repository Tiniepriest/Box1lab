import { describe, expect, it } from "vitest";
import {
  belastingBox1,
  berekenHuishouden,
  codeerScenario,
  decodeerScenario,
  huishoudenUitInvoer,
  maakBasis,
  maakHuishouden,
  overVanInkomen,
  pasToe,
  simuleer,
  statisch,
  type PersoonKenmerken,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie } from "../src/node/index.ts";

const p = laadParameters(2026);
const k: PersoonKenmerken = { werkt: false, aow: false, alleenstaand: true, combinatiekorting: false };
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

describe("negatieve belasting is uit het lab (D-100)", () => {
  it("belasting is nooit negatief", () => {
    expect(belastingBox1(0, 0, p, k)).toBe(0);
    expect(belastingBox1(5000, 0, p, k)).toBe(0);
  });

  it("een oude link met negatieve belasting opent zonder die instelling", () => {
    const code = codeerScenario([
      { parameter: "box1.negatieveBelasting", zet: true },
      { parameter: "basisinkomen.perVolwassenePerMaand", zet: 500 },
    ]);
    expect(decodeerScenario(code, p)).toEqual([
      { parameter: "basisinkomen.perVolwassenePerMaand", zet: 500 },
    ]);
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

  it("bij de bijstand telt ook het basisinkomen van een partner zonder bijstand", () => {
    const paar = (soort2: "uitkering" | "werk", inkomen2: number) =>
      maakHuishouden(
        {
          inkomen1: 0,
          soort1: "uitkering",
          soort2,
          inkomen2,
          kinderLeeftijden: [],
          huurPerMaand: 0,
          hypotheekrente: 0,
          woz: 0,
          kinderopvangKosten: 0,
        },
        p,
      );
    // Partner werkt een beetje: de bijstand vult aan tot de gezinsnorm. Met € 300 basisinkomen ieder blijft het
    // gezin netto gelijk; de bijstand gaat het dubbele omlaag.
    const h = paar("werk", 6000);
    const voor = berekenHuishouden(h, p);
    expect(voor.uitkering).toBeGreaterThan(7200);
    const na = berekenHuishouden(h, basisinkomen(300), p);
    expect(na.basisinkomen).toBe(7200);
    expect(na.besteedbaar).toBeCloseTo(voor.besteedbaar, 0);
    expect(na.uitkeringKosten).toBeLessThan(0);
  });

  it("kost de overheid het bedrag maal het aantal volwassenen, min wat de uitkeringen minder kosten", () => {
    const basis = maakBasis(p, laadPopulatie(2026).huishoudens, laadKalibratie(2026));
    const u = simuleer(basis, basisinkomen(100));
    expect(u.posten.basisinkomen).toBeCloseTo((-basis.volwassenen * 1200) / 1e9, 6);
    expect(u.posten.uitkeringen).toBeGreaterThan(0);
  });
});

describe("melding 17 november: vlaktaks 40% met basisinkomen, en geen gedragseffect voor één huishouden", () => {
  // Niet `maakHuishouden`: die kent een standaard pensioenpremie toe.
  const h = huishoudenUitInvoer(
    {
      personen: [
        {
          leeftijd: 35,
          soort: "loondienst",
          bedrag: 36000,
          periode: "jaar",
          inclusiefVakantiegeld: false,
          dertiendeMaand: false,
          extraPerJaar: 0,
          pensioenpremiePerMaand: 0,
          urencriterium: true,
          starter: false,
        },
      ],
      kinderen: [],
      wonen: "huur",
      huurPerMaand: 0,
      zelfstandigeWoning: true,
      woz: 0,
      hypotheekrente: 0,
      vermogen: 0,
      beleggingen: 0,
      schulden: 0,
    },
    p,
  );
  const scenario = pasToe(p, [
    { parameter: "box1.vrijstelling", zet: 0 },
    { parameter: "box1.schijven", zet: [{ tot: null, tarief: 40 }] },
    { parameter: "box1.aowVerlagingEersteSchijf", zet: 0 },
    { parameter: "heffingskortingen.algemeen.niveau", zet: 0 },
    { parameter: "heffingskortingen.arbeid.niveau", zet: 0 },
    { parameter: "heffingskortingen.ouderen.niveau", zet: 0 },
    { parameter: "heffingskortingen.alleenstaandeOuderen.niveau", zet: 0 },
    { parameter: "heffingskortingen.combinatie.niveau", zet: 0 },
    { parameter: "toeslagen.zorgtoeslag.niveau", zet: 0 },
    { parameter: "toeslagen.huurtoeslag.niveau", zet: 0 },
    { parameter: "toeslagen.kindgebondenBudget.niveau", zet: 0 },
    { parameter: "toeslagen.kinderopvangtoeslag.niveau", zet: 0 },
    { parameter: "basisinkomen.perVolwassenePerMaand", zet: 1000 },
  ]);

  it("36.000 − 40% belasting + 12.000 basisinkomen = 33.600, zonder zorgpremie eraf (D-093)", () => {
    const r = berekenHuishouden(h, scenario, p);
    expect(r.bruto).toBeCloseTo(36000, 6);
    expect(r.pensioenpremie).toBe(0);
    expect(r.belasting + r.zvw).toBeCloseTo(14400, 0);
    expect(r.basisinkomen).toBeCloseTo(12000, 6);
    expect(r.zorgpremie).toBeGreaterThan(0);
    expect(r.besteedbaar).toBeCloseTo(33600, 0);
    expect(overVanInkomen(r)).toBeCloseTo(33600, 0);
  });

  it("met gedragseffect: `statisch` houdt het bruto inkomen gelijk aan wat je invult", () => {
    const zonder = berekenHuishouden(h, scenario, p);
    const metGedrag = pasToe(scenario, [{ parameter: "gedrag.eti", zet: 0.25 }]);
    expect(berekenHuishouden(h, metGedrag, p).bruto).toBeLessThan(36000);
    const r = berekenHuishouden(h, statisch(metGedrag), p);
    expect(r.bruto).toBe(36000);
    expect(r.besteedbaar).toBe(zonder.besteedbaar);
  });
});
