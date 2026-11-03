import { describe, expect, it } from "vitest";
import { berekenHuishouden, box3, huishoudenUitInvoer, type Invoer } from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

const p = laadParameters(2026);

describe("box 3", () => {
  it("rekenvoorbeeld Belastingdienst 2026: alleenstaand met € 150.000 spaargeld betaalt € 417", () => {
    const r = box3({ bank: 150000, overig: 0, schulden: 0 }, false, p);
    expect(r.rendementsgrondslag).toBe(150000);
    expect(r.grondslag).toBe(90643);
    // Belastbaar rendement € 1.920 × aandeel 60,43% = voordeel € 1.160; 36% daarvan.
    expect(r.voordeel).toBeCloseTo(1160.2, 0);
    expect(Math.floor(r.belasting)).toBe(417);
  });

  it("onder het heffingsvrij vermogen geen belasting; partners hebben het dubbele", () => {
    expect(box3({ bank: 59000, overig: 0, schulden: 0 }, false, p).belasting).toBe(0);
    expect(box3({ bank: 110000, overig: 0, schulden: 0 }, true, p).belasting).toBe(0);
    expect(box3({ bank: 110000, overig: 0, schulden: 0 }, false, p).belasting).toBeGreaterThan(0);
  });

  it("beleggingen tellen zwaarder dan spaargeld, schulden boven de drempel tellen negatief", () => {
    const sparen = box3({ bank: 200000, overig: 0, schulden: 0 }, false, p).belasting;
    const beleggen = box3({ bank: 0, overig: 200000, schulden: 0 }, false, p).belasting;
    expect(beleggen).toBeGreaterThan(sparen * 4);
    const metSchuld = box3({ bank: 0, overig: 200000, schulden: 23800 }, false, p);
    expect(metSchuld.rendementsgrondslag).toBe(180000);
    expect(metSchuld.belasting).toBeLessThan(beleggen);
  });

  it("gaat af van wat het huishouden overhoudt en telt mee voor de toeslagen", () => {
    const invoer: Invoer = {
      personen: [
        {
          leeftijd: 70,
          soort: "aow",
          bedrag: 6000,
          periode: "jaar",
          inclusiefVakantiegeld: true,
          dertiendeMaand: false,
          extraPerJaar: 0,
          pensioenpremiePerMaand: 0,
          urencriterium: true,
          starter: false,
        },
      ],
      kinderen: [],
      wonen: "huur",
      huurPerMaand: 700,
      woz: 0,
      hypotheekrente: 0,
      vermogen: 0,
      beleggingen: 0,
      schulden: 0,
    };
    const zonder = berekenHuishouden(huishoudenUitInvoer(invoer, p), p);
    const met = berekenHuishouden(huishoudenUitInvoer({ ...invoer, beleggingen: 100000 }, p), p);
    expect(met.box3).toBeGreaterThan(0);
    expect(met.toetsingsinkomen).toBeGreaterThan(zonder.toetsingsinkomen);
    expect(met.besteedbaar).toBeLessThan(zonder.besteedbaar - met.box3 + 1);
  });
});
