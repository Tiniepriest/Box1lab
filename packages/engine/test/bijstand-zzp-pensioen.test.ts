import { describe, expect, it } from "vitest";
import {
  belastbareWinst,
  belastingBox1,
  berekenHuishouden,
  bijstandsnormPerJaar,
  huishoudenUitInvoer,
  standaardPensioenpremie,
  valideerInvoer,
  type Huishouden,
  type Lid,
} from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

const p = laadParameters(2026);

const huishouden = (leden: Lid[], partners = leden.length === 2): Huishouden => ({
  leden,
  partners,
  kinderen: [],
  huurPerMaand: 0,
  hypotheekrente: 0,
  woz: 0,
  kinderopvang: [],
  vermogen: 0,
});

const netto = (h: Huishouden) => {
  const r = berekenHuishouden(h, p);
  return r.bruto - r.pensioenpremie - r.belasting - r.zvw;
};

const invoer = (personen: object[]) =>
  valideerInvoer({
    personen,
    kinderen: [],
    wonen: "huur",
    huurPerMaand: 0,
    woz: 0,
    hypotheekrente: 0,
    vermogen: 0,
  });
const persoon = (soort: string, bedrag = 0, extra: object = {}) => ({
  leeftijd: 40,
  soort,
  bedrag,
  periode: "jaar",
  inclusiefVakantiegeld: true,
  ...extra,
});

describe("pensioenpremie (ABP 2026: 8,13% boven € 19.200, tot € 137.800)", () => {
  it("rekent de standaardpremie zoals de premietabel", () => {
    expect(standaardPensioenpremie(50000, p)).toBeCloseTo(2504.04, 2);
    expect(standaardPensioenpremie(19200, p)).toBe(0);
    expect(standaardPensioenpremie(15000, p)).toBe(0);
    expect(standaardPensioenpremie(137800, p)).toBeCloseTo(9642.18, 2);
    expect(standaardPensioenpremie(200000, p)).toBeCloseTo(9642.18, 2);
  });

  it("verlaagt het belastbaar loon: minder belasting, minder netto", () => {
    const zonder = huishouden([{ inkomen: 50000, soort: "werk", uitkering: 0 }]);
    const met = huishouden([{ inkomen: 50000, soort: "werk", uitkering: 0, pensioenpremie: "standaard" }]);
    const rz = berekenHuishouden(zonder, p);
    const rm = berekenHuishouden(met, p);
    expect(rm.pensioenpremie).toBeCloseTo(2504.04, 2);
    expect(rm.belasting).toBeLessThan(rz.belasting);
    expect(rm.toetsingsinkomen).toBeCloseTo(50000 - 2504.04, 2);
    expect(rm.besteedbaar).toBeLessThan(rz.besteedbaar);
    expect(rz.besteedbaar - rm.besteedbaar).toBeLessThan(2504.04);
  });

  it("een eigen bedrag van de loonstrook gaat voor de schatting", () => {
    const h = huishoudenUitInvoer(
      invoer([persoon("loondienst", 50000, { pensioen: "bedrag", pensioenpremiePerMaand: 150 })]),
      p,
    );
    expect(berekenHuishouden(h, p).pensioenpremie).toBe(1800);
    const geen = huishoudenUitInvoer(invoer([persoon("loondienst", 50000, { pensioen: "geen" })]), p);
    expect(berekenHuishouden(geen, p).pensioenpremie).toBe(0);
  });
});

describe("zelfstandig ondernemer (2026)", () => {
  const uren = { urencriterium: true, starter: false };

  it("van winst naar belastbare winst", () => {
    // 50.000 − 1.200 = 48.800; mkb-winstvrijstelling 12,7% = 6.197,60
    expect(belastbareWinst(50000, uren, p).belastbaar).toBeCloseTo(42602.4, 2);
    // Zonder urencriterium alleen de mkb-winstvrijstelling: 50.000 × 87,3%
    expect(belastbareWinst(50000, { urencriterium: false, starter: false }, p).belastbaar).toBeCloseTo(
      43650,
      2,
    );
    // Starter: 50.000 − 1.200 − 2.123 = 46.677; × 87,3%
    expect(belastbareWinst(50000, { urencriterium: true, starter: true }, p).belastbaar).toBeCloseTo(
      40749.02,
      2,
    );
    // De aftrek gaat niet onder nul
    expect(belastbareWinst(800, uren, p)).toEqual({
      belastbaar: 0,
      ondernemersaftrek: 800,
      mkbVrijstelling: 0,
    });
  });

  it("betaalt minder belasting dan een werknemer zonder pensioen, plus zelf de Zvw-bijdrage", () => {
    const zzp = berekenHuishouden(
      huishouden([{ inkomen: 50000, soort: "werk", uitkering: 0, ondernemer: uren }]),
      p,
    );
    const loon = berekenHuishouden(huishouden([{ inkomen: 50000, soort: "werk", uitkering: 0 }]), p);
    expect(zzp.belasting).toBeLessThan(loon.belasting);
    expect(zzp.zvw).toBeCloseTo((42602.4 * p.zorg.zvwBijdrage) / 100, 2);
    expect(loon.zvw).toBe(0);
    expect(zzp.toetsingsinkomen).toBeCloseTo(42602.4, 2);
  });

  it("krijgt de arbeidskorting over de winst vóór aftrek", () => {
    const k = { werkt: true, aow: false, alleenstaand: true, combinatiekorting: false };
    const zzp = berekenHuishouden(
      huishouden([{ inkomen: 50000, soort: "werk", uitkering: 0, ondernemer: uren }]),
      p,
    );
    expect(zzp.belasting).toBeCloseTo(belastingBox1(42602.4, 50000, p, k), 6);
  });
});

describe("bijstand volgens de norm (Rijksoverheid, 2026)", () => {
  const normAlleen = 6 * 1401.5 + 6 * 1419.46;
  const normPaar = 6 * 2002.13 + 6 * 2027.79;

  it("de norm per jaar volgt uit de bedragen per halfjaar", () => {
    expect(bijstandsnormPerJaar(p, false)).toBeCloseTo(normAlleen, 2);
    expect(bijstandsnormPerJaar(p, true)).toBeCloseTo(normPaar, 2);
  });

  it("een alleenstaande houdt netto precies de norm over", () => {
    const h = huishoudenUitInvoer(invoer([persoon("bijstand")]), p);
    expect(h.leden[0]!.uitkeringSoort).toBe("bijstand");
    expect(netto(h)).toBeCloseTo(normAlleen, 1);
  });

  it("een paar in de bijstand houdt samen de gezinsnorm over, ieder de helft", () => {
    const h = huishoudenUitInvoer(invoer([persoon("bijstand"), persoon("bijstand")]), p);
    expect(h.leden[0]!.inkomen).toBeCloseTo(h.leden[1]!.inkomen, 6);
    expect(netto(h)).toBeCloseTo(normPaar, 1);
  });

  it("werkt de partner, dan vult de bijstand aan tot de gezinsnorm", () => {
    const h = huishoudenUitInvoer(invoer([persoon("bijstand"), persoon("loondienst", 12000)]), p);
    expect(h.leden[0]!.inkomen).toBeGreaterThan(0);
    expect(netto(h)).toBeCloseTo(normPaar, 0);
  });

  it("verdient de partner genoeg, dan is er geen bijstand", () => {
    const h = huishoudenUitInvoer(invoer([persoon("bijstand"), persoon("loondienst", 40000)]), p);
    expect(h.leden[0]!.inkomen).toBe(0);
  });
});
