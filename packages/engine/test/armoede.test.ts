import { describe, expect, it } from "vitest";
import {
  armoedeToets,
  berekenHuishouden,
  maakBasis,
  maakHuishouden,
  valideerParameters,
  type EenvoudigeInvoer,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie } from "../src/node/index.ts";

/* Armoede volgens CBS, Nibud en SCP (D-098). */
describe("armoedetoets", () => {
  const p = laadParameters(2026);
  const factor = p.armoede.indexatie.reduce((f, i) => f * (1 + i / 100), 1);
  const type = (v: number, t: number, k: number) =>
    p.armoede.typen.find((x) => x.volwassenen === v && x.tieners === t && x.kinderen === k)!;
  const ER = 200;

  const invoer = (o: Partial<EenvoudigeInvoer>): EenvoudigeInvoer => ({
    inkomen1: 0,
    soort1: "uitkering",
    soort2: null,
    inkomen2: 0,
    kinderLeeftijden: [],
    huurPerMaand: 700,
    hypotheekrente: 0,
    woz: 0,
    kinderopvangKosten: 0,
    ...o,
  });
  const toets = (o: Partial<EenvoudigeInvoer>) => {
    const h = maakHuishouden(invoer(o), p);
    return { h, r: berekenHuishouden(h, p), t: armoedeToets(h, berekenHuishouden(h, p), p, ER) };
  };

  it("de grens is het geïndexeerde normbedrag zonder huur, plus de eigen huur", () => {
    const { t } = toets({ huurPerMaand: 700 });
    const a = type(1, 0, 0);
    expect(t.grens).toBeCloseTo(12 * ((a.grens - a.huur) * factor + 700), 6);
  });

  it("een eigenaar krijgt het normbedrag voor de huur", () => {
    const { t } = toets({ huurPerMaand: 0, woz: 300000 });
    const a = type(1, 0, 0);
    expect(t.grens).toBeCloseTo(12 * a.grens * factor, 6);
  });

  it("het inkomen is besteedbaar min nominale premie en eigen risico, zonder kinderopvangtoeslag", () => {
    const { r, t } = toets({
      soort1: "werk",
      inkomen1: 30000,
      kinderLeeftijden: [2],
      kinderopvangKosten: 12000,
    });
    expect(r.kot).toBeGreaterThan(0);
    expect(t.inkomen).toBeCloseTo(r.besteedbaar - r.kot - r.zorgpremie - ER, 6);
  });

  it("telt tieners, jongere kinderen en meerderjarige kinderen zoals het CBS", () => {
    const { t } = toets({ kinderLeeftijden: [5, 15, 19] });
    expect(t.volwassenen).toBe(2);
    expect(t.minderjarigen).toBe(2);
    const a = type(2, 1, 1);
    expect(t.grens).toBeCloseTo(12 * ((a.grens - a.huur) * factor + 700), 6);
  });

  it("bijstand met hoge huur is arm; met spaargeld boven de jaargrens niet", () => {
    const arm = toets({ huurPerMaand: 900 });
    expect(arm.t.arm).toBe(true);
    const metBuffer = toets({ huurPerMaand: 900, vermogen: arm.t.grens + 1 });
    expect(metBuffer.t.inkomen).toBeLessThan(metBuffer.t.grens);
    expect(metBuffer.t.arm).toBe(false);
  });

  it("geeft een duidelijke fout bij een huishoudtype dat niet in de tabel staat", () => {
    const h = maakHuishouden(invoer({ kinderLeeftijden: [1, 2, 3, 4, 5] }), p);
    expect(() => armoedeToets(h, berekenHuishouden(h, p), p, ER)).toThrow(/Geen armoedegrens/);
  });

  it("de nagebootste bevolking: elk huishouden heeft een grens, en het cijfer ligt in de buurt van het CPB", () => {
    const k = laadKalibratie(2026);
    const b = maakBasis(p, laadPopulatie(2026).huishoudens, k);
    expect(b.eigenRisico).toBeGreaterThan(0);
    expect(b.eigenRisico).toBeLessThan(p.armoede.eigenRisicoMld * 1e9);
    // Ruime band: het model kent de woonlasten van eigenaren niet (D-098).
    expect(b.armoede.personen).toBeGreaterThan(k.armoede.personen / 2);
    expect(b.armoede.personen).toBeLessThan(k.armoede.personen * 2);
  });

  it("weigert een indexatie die niet past bij het jaar", () => {
    const data = structuredClone(p) as unknown as { armoede: { indexatie: number[] } };
    data.armoede.indexatie = [3];
    expect(() => valideerParameters(data)).toThrow(/indexatie/);
  });
});
