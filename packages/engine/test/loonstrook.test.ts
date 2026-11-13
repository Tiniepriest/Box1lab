import { describe, expect, it } from "vitest";
import { berekenHuishouden, huishoudenUitInvoer, loonstrook, type Invoer } from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

const p = laadParameters(2026);

const persoon = {
  leeftijd: 35,
  soort: "loondienst" as const,
  bedrag: 3000,
  periode: "maand" as const,
  inclusiefVakantiegeld: false,
  dertiendeMaand: true,
  extraPerJaar: 1000,
  pensioenpremiePerMaand: 150,
  urencriterium: true,
  starter: false,
};

const alleen: Invoer = {
  personen: [persoon],
  kinderen: [],
  wonen: "huur",
  huurPerMaand: 0,
  zelfstandigeWoning: true,
  woz: 0,
  hypotheekrente: 0,
  vermogen: 0,
  beleggingen: 0,
  schulden: 0,
};

describe("loonstrook", () => {
  it("maandloon en extra's tellen op tot het netto jaarinkomen van het model", () => {
    const [s] = loonstrook(alleen, p);
    expect(s!.brutoPerMaand).toBe(3000);
    expect(s!.pensioenpremiePerMaand).toBe(150);
    expect(s!.nettoPerMaand).toBeCloseTo(3000 - 150 - s!.loonheffingPerMaand, 6);
    expect(s!.vakantiegeld!.bruto).toBeCloseTo(3000 * 12 * (p.loon.vakantiegeld / 100), 6);
    expect(s!.dertiendeMaand!.bruto).toBe(3000);
    expect(s!.bonus!.bruto).toBe(1000);

    const r = berekenHuishouden(huishoudenUitInvoer(alleen, p), p);
    const jaar = s!.nettoPerMaand * 12 + s!.vakantiegeld!.netto + s!.dertiendeMaand!.netto + s!.bonus!.netto;
    expect(jaar).toBeCloseTo(r.bruto - r.pensioenpremie - r.belasting, 6);
  });

  it("van een extra houd je netto minder over dan van een gewone maand, door het hogere tarief", () => {
    const [s] = loonstrook(alleen, p);
    const nettoAandeelMaand = s!.nettoPerMaand / (s!.brutoPerMaand - s!.pensioenpremiePerMaand);
    expect(s!.dertiendeMaand!.netto / s!.dertiendeMaand!.bruto).toBeLessThan(nettoAandeelMaand);
    expect(s!.vakantiegeld!.netto).toBeGreaterThan(0);
  });

  it("vakantiegeld in het maandbedrag, een uitkering, of een bedrag per jaar", () => {
    const inMaand = loonstrook({ ...alleen, personen: [{ ...persoon, inclusiefVakantiegeld: true }] }, p)[0]!;
    expect(inMaand.vakantiegeld).toBeNull();
    expect(inMaand.vakantiegeldInMaand).toBe(true);

    const ww = loonstrook({ ...alleen, personen: [{ ...persoon, soort: "werknemersverzekering" }] }, p)[0]!;
    expect(ww.uitkering).toBe(true);
    expect(ww.pensioenpremiePerMaand).toBe(0);
    expect(ww.dertiendeMaand).toBeNull();
    expect(ww.bonus).toBeNull();
    expect(ww.vakantiegeld).not.toBeNull();

    expect(loonstrook({ ...alleen, personen: [{ ...persoon, periode: "jaar" }] }, p)).toEqual([]);
    expect(loonstrook({ ...alleen, personen: [{ ...persoon, soort: "zzp" }] }, p)).toEqual([]);
  });

  it("geeft per partner een eigen loonstrook, ook als alleen de partner werkt", () => {
    const s = loonstrook({ ...alleen, personen: [{ ...persoon, soort: "geen", bedrag: 0 }, persoon] }, p);
    expect(s.map((x) => x.persoon)).toEqual([1]);
  });
});
