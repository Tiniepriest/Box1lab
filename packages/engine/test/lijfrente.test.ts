import { describe, expect, it } from "vitest";
import {
  berekenHuishouden,
  huishoudenUitInvoer,
  jaarruimte,
  pensioenrekening,
  type Invoer,
  type PersoonInvoer,
} from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

/* Inleggen op een pensioenrekening: lijfrentepremieaftrek binnen de jaarruimte (Wet IB 2001, art. 3.127). */
const p = laadParameters(2026);
const { percentage, aftoppingsgrens, franchise } = p.lijfrente;
const toptarief = p.box1.schijven.at(-1)!.tarief;

const persoon = (o: Partial<PersoonInvoer> = {}): PersoonInvoer => ({
  leeftijd: 40,
  soort: "loondienst",
  bedrag: 48000,
  periode: "jaar",
  inclusiefVakantiegeld: true,
  dertiendeMaand: false,
  extraPerJaar: 0,
  pensioenpremiePerMaand: 0,
  urencriterium: true,
  starter: false,
  ...o,
});
const invoer = (personen: PersoonInvoer[], o: Partial<Invoer> = {}): Invoer => ({
  personen,
  kinderen: [],
  wonen: "huur",
  huurPerMaand: 0,
  zelfstandigeWoning: true,
  woz: 0,
  hypotheekrente: 0,
  vermogen: 0,
  beleggingen: 0,
  schulden: 0,
  ...o,
});
const reken = (i: Invoer, inleg: number, pensioenViaWerk = false, nr = 0) =>
  pensioenrekening(i, p, { persoon: nr, inleg, pensioenViaWerk })!;

describe("jaarruimte", () => {
  it("is het percentage van het inkomen boven de franchise", () => {
    expect(jaarruimte(50000, p)).toBeCloseTo(((50000 - franchise) * percentage) / 100, 6);
  });
  it("is 0 onder de franchise en houdt op bij de aftoppingsgrens", () => {
    expect(jaarruimte(franchise - 1, p)).toBe(0);
    expect(jaarruimte(aftoppingsgrens * 2, p)).toBeCloseTo(
      ((aftoppingsgrens - franchise) * percentage) / 100,
      6,
    );
  });
});

describe("pensioenrekening", () => {
  it("boven de laatste schijfgrens krijg je het toptarief terug", () => {
    const r = reken(invoer([persoon({ bedrag: 150000 })]), 5000);
    expect(r.teruggave).toBeCloseTo((5000 * toptarief) / 100, 6);
    expect(r.toeslagen).toBe(0);
    expect(r.nettoKosten).toBeCloseTo(5000 - r.teruggave, 6);
  });

  it("je mag niet meer aftrekken dan de jaarruimte; met pensioen via je werk rekenen we met de hele inleg", () => {
    const i = invoer([persoon({ bedrag: 30000 })]);
    const zonder = reken(i, 5000);
    expect(zonder.jaarruimte).toBeCloseTo(jaarruimte(30000, p), 6);
    expect(zonder.aftrek).toBeCloseTo(zonder.jaarruimte!, 6);
    expect(zonder.nettoKosten).toBeCloseTo(5000 - zonder.teruggave - zonder.toeslagen, 6);
    const via = reken(i, 5000, true);
    expect(via.jaarruimte).toBeNull();
    expect(via.aftrek).toBe(5000);
    expect(via.teruggave).toBeGreaterThan(zonder.teruggave);
  });

  it("de jaarruimte gaat over het loon na de eigen pensioenpremie", () => {
    const r = reken(invoer([persoon({ bedrag: 48000, pensioenpremiePerMaand: 200 })]), 0);
    expect(r.jaarruimte).toBeCloseTo(jaarruimte(48000 - 2400, p), 6);
  });

  it("verandert de arbeidskorting niet: minder loon scheelt meer belasting dan dezelfde aftrek", () => {
    // Bij € 60.000 zit je in de afbouw van de arbeidskorting: minder loon geeft meer arbeidskorting.
    const i = invoer([persoon({ bedrag: 60000 })]);
    const lager = invoer([persoon({ bedrag: 55000 })]);
    const r = (x: Invoer) => berekenHuishouden(huishoudenUitInvoer(x, p), p).belasting;
    expect(reken(i, 5000).teruggave).toBeLessThan(r(i) - r(lager));
  });

  it("een zzp'er betaalt dezelfde bijdrage Zvw", () => {
    const i = invoer([persoon({ soort: "zzp", bedrag: 50000 })]);
    const h = huishoudenUitInvoer(i, p);
    const met = { ...h, leden: [{ ...h.leden[0]!, lijfrentepremie: 5000 }] };
    expect(berekenHuishouden(met, p).zvw).toBeCloseTo(berekenHuishouden(h, p).zvw, 6);
    expect(berekenHuishouden(met, p).belasting).toBeLessThan(berekenHuishouden(h, p).belasting);
  });

  it("een lager toetsingsinkomen geeft meer toeslag", () => {
    const r = reken(invoer([persoon({ bedrag: 30000 })], { huurPerMaand: 900 }), 2000);
    expect(r.toeslagen).toBeGreaterThan(0);
  });

  it("de partner kan inleggen; de aftrek gaat niet onder nul inkomen", () => {
    const i = invoer([persoon({ bedrag: 60000 }), persoon({ bedrag: 1000 })]);
    const partner = reken(i, 5000, true, 1);
    expect(partner.teruggave).toBeGreaterThanOrEqual(0);
    expect(partner.teruggave).toBeLessThan(reken(i, 5000, true, 0).teruggave);
  });

  it("niet bij bijstand of vanaf de AOW-leeftijd", () => {
    const bijstand = invoer([persoon({ soort: "bijstand", bedrag: 0 })]);
    expect(pensioenrekening(bijstand, p, { persoon: 0, inleg: 5000, pensioenViaWerk: false })).toBeNull();
    const aow = invoer([persoon({ leeftijd: p.uitkeringen.aowLeeftijd + 1 })]);
    expect(pensioenrekening(aow, p, { persoon: 0, inleg: 5000, pensioenViaWerk: false })).toBeNull();
  });
});
