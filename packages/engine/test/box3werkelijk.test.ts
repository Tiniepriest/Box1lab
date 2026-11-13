import { describe, expect, it } from "vitest";
import { vergelijkBox3 } from "../src/index.ts";
import { laadBox3Werkelijk, laadParameters } from "../src/node/index.ts";

const p27 = laadParameters(2027);
const w = laadBox3Werkelijk(2029);
const r = (o: Partial<Parameters<typeof vergelijkBox3>[2]> = {}) => ({
  spaarrente: 0,
  dividend: 0,
  koersstijging: 0,
  verkocht: 0,
  ...o,
});

describe("box 3 in 2029 naast 2027 (D-085)", () => {
  it("regels uit de wet: € 1.800 vrij per persoon, verliesdrempel € 500, 35,5% en 38,5% boven € 60.000", () => {
    expect(w.regels.heffingsvrijResultaat).toBe(1800);
    expect(w.regels.verliesdrempel).toBe(500);
    expect(w.tarief.schijven).toEqual([
      { tot: 60000, tarief: 35.5 },
      { tot: null, tarief: 38.5 },
    ]);
  });

  it("spaargeld met weinig rente: in 2029 binnen het vrijgestelde resultaat", () => {
    const u = vergelijkBox3({ bank: 100000, overig: 0 }, false, r({ spaarrente: 1.5 }), p27, w);
    // 2027: (100.000 − 60.280) × 1,28% × 36% = € 183,03; het echte rendement (€ 1.500 × 36%) is hoger.
    expect(u.nu.belasting).toBeCloseTo(183.03, 1);
    expect(u.nu.tegenbewijs).toBe(false);
    // 2029: € 1.500 rente, minder dan € 1.800 vrij.
    expect(u.later.belasting).toBe(0);
    expect(u.verschil).toBeCloseTo(-183.03, 1);
  });

  it("beleggingen: koerswinst telt in 2029 pas bij verkoop", () => {
    const zonder = vergelijkBox3(
      { bank: 0, overig: 200000 },
      false,
      r({ dividend: 2, koersstijging: 5 }),
      p27,
      w,
    );
    // 2027: (200.000 − 60.280) × 6,37% × 36% = € 3.204,06.
    expect(zonder.nu.belasting).toBeCloseTo(3204.06, 1);
    // 2029: € 4.000 dividend − € 1.800 = € 2.200 × 35,5% = € 781.
    expect(zonder.later.belasting).toBeCloseTo(781, 6);
    const met = vergelijkBox3(
      { bank: 0, overig: 200000 },
      false,
      r({ dividend: 2, koersstijging: 5, verkocht: 210000 }),
      p27,
      w,
    );
    // Alles verkocht (€ 210.000): € 10.000 winst. € 14.000 − € 1.800 = € 12.200 × 35,5% = € 4.331.
    expect(met.later.koerswinst).toBeCloseTo(10000, 6);
    expect(met.later.belasting).toBeCloseTo(4331, 6);
  });

  it("verkoop van een deel: alleen de winst op dat deel telt (D-086)", () => {
    const u = vergelijkBox3(
      { bank: 0, overig: 200000 },
      false,
      r({ dividend: 2, koersstijging: 5, verkocht: 10000 }),
      p27,
      w,
    );
    // Van € 10.000 is € 10.000 / 1,05 = € 9.523,81 de waarde op 1 januari: € 476,19 winst.
    expect(u.later.koerswinst).toBeCloseTo(476.19, 2);
    // € 4.000 dividend + € 476,19 − € 1.800 = € 2.676,19 × 35,5% = € 950,05.
    expect(u.later.belasting).toBeCloseTo(950.05, 2);
    // Meer verkopen dan er is: hoogstens de waarde aan het eind van het jaar.
    const teVeel = vergelijkBox3(
      { bank: 0, overig: 200000 },
      false,
      r({ koersstijging: 5, verkocht: 1e6 }),
      p27,
      w,
    );
    expect(teVeel.later.verkocht).toBe(210000);
    expect(teVeel.later.koerswinst).toBeCloseTo(10000, 6);
  });

  it("toptarief per persoon; partners verdelen gelijk en hebben samen € 3.600 vrij", () => {
    const alleen = vergelijkBox3({ bank: 0, overig: 5_000_000 }, false, r({ dividend: 2 }), p27, w);
    // € 100.000 − € 1.800 = € 98.200: 60.000 × 35,5% + 38.200 × 38,5%.
    expect(alleen.later.belasting).toBeCloseTo(21300 + 14707, 6);
    const samen = vergelijkBox3({ bank: 0, overig: 5_000_000 }, true, r({ dividend: 2 }), p27, w);
    // € 96.400, € 48.200 per persoon: alles tegen 35,5%.
    expect(samen.later.belasting).toBeCloseTo(96400 * 0.355, 6);
  });

  it("verlies: geen belasting, en in 2029 het deel boven € 500 naar volgende jaren", () => {
    const u = vergelijkBox3(
      { bank: 0, overig: 100000 },
      false,
      r({ koersstijging: -10, verkocht: 90000 }),
      p27,
      w,
    );
    expect(u.nu.belasting).toBe(0);
    expect(u.nu.tegenbewijs).toBe(true);
    expect(u.later.belasting).toBe(0);
    expect(u.later.verlies).toBe(9500);
  });

  it("tegenbewijsregeling: in 2027 nooit meer dan over het echte rendement", () => {
    const u = vergelijkBox3({ bank: 0, overig: 200000 }, false, r({ dividend: 1, koersstijging: 1 }), p27, w);
    // Echt rendement € 4.000 × 36% = € 1.440, lager dan € 3.204 met het vaste rendement.
    expect(u.nu.belasting).toBeCloseTo(1440, 6);
    expect(u.nu.tegenbewijs).toBe(true);
  });
});
