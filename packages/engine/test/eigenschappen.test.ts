import { describe, expect, it } from "vitest";
import {
  berekenHuishouden,
  inkomenscurve,
  maakBasis,
  pasToe,
  simuleer,
  type Huishouden,
} from "../src/index.ts";
import { laadKalibratie, laadParameters, laadPopulatie } from "../src/node/index.ts";

/* Eigenschapstests (HANDOFF §5.3). */

const params = laadParameters(2026);
const pop = laadPopulatie(2026).huishoudens;
const basis = maakBasis(params, pop, laadKalibratie(2026));

describe("huidig beleid als scenario", () => {
  it("geeft nul verschil, ook als kopie van de parameters", () => {
    const kopie = structuredClone(params);
    const u = simuleer(basis, kopie);
    expect(Math.abs(u.saldoMld)).toBeLessThan(1e-9);
    u.decielen.forEach((d) => expect(Math.abs(d.gemiddeld)).toBeLessThan(1e-6));
    expect(u.winnaars[2]).toBeCloseTo(100, 9);
  });
});

describe("netto inkomen stijgt met bruto inkomen", () => {
  const alleenstaand = (x: number): Huishouden => ({
    leden: [{ inkomen: x, soort: "werk", uitkering: 0 }],
    partners: false,
    kinderen: [],
    huurPerMaand: 0,
    hypotheekrente: 0,
    woz: 0,
    kinderopvang: [],
    vermogen: 0,
  });
  const zonderToeslagen = pasToe(params, [{ parameter: "toeslagen.zorgtoeslag.niveau", zet: 0 }]);
  const bruto = Array.from({ length: 300 }, (_, i) => 1000 + i * 1000);

  it("zonder toeslagen is het besteedbaar inkomen niet-dalend", () => {
    const c = inkomenscurve(alleenstaand, zonderToeslagen, zonderToeslagen, bruto);
    c.besteedbaar.slice(1).forEach((b, i) => expect(b).toBeGreaterThanOrEqual(c.besteedbaar[i]! - 1e-9));
  });

  it("de marginale druk zonder toeslagen ligt tussen 0% en 100%", () => {
    const c = inkomenscurve(alleenstaand, zonderToeslagen, zonderToeslagen, bruto);
    c.marginaleDruk.forEach((m) => {
      expect(m).toBeGreaterThanOrEqual(-1e-9);
      expect(m).toBeLessThan(100);
    });
  });
});

describe("bekende armoedeval-punten", () => {
  // De zorgtoeslag heeft een harde inkomensgrens (€ 40.857 alleenstaand). Net daaronder is de toeslag nog
  // ongeveer € 23; daarboven nul. Het besteedbaar inkomen daalt daar dus met hoogstens dat bedrag.
  it("zorgtoeslaggrens: een kleine sprong omlaag bij € 40.857", () => {
    const h = (x: number): Huishouden => ({
      leden: [{ inkomen: x, soort: "werk", uitkering: 0 }],
      partners: false,
      kinderen: [],
      huurPerMaand: 0,
      hypotheekrente: 0,
      woz: 0,
      kinderopvang: [],
      vermogen: 0,
    });
    const onder = berekenHuishouden(h(40857), params);
    const boven = berekenHuishouden(h(40858), params);
    expect(onder.zorgtoeslag).toBeGreaterThan(0);
    expect(onder.zorgtoeslag).toBeLessThan(24);
    expect(boven.zorgtoeslag).toBe(0);
    expect(onder.besteedbaar - boven.besteedbaar).toBeLessThan(24);
  });
});

describe("niveau-knoppen", () => {
  const huurder: Huishouden = {
    leden: [{ inkomen: 22000, soort: "werk", uitkering: 0 }],
    partners: false,
    kinderen: [4],
    huurPerMaand: 800,
    hypotheekrente: 0,
    woz: 0,
    kinderopvang: [{ soort: "dagopvang", urenPerMaand: 40, uurprijs: 10 }],
    vermogen: 0,
  };
  it.each([
    ["toeslagen.zorgtoeslag.niveau", "zorgtoeslag"],
    ["toeslagen.huurtoeslag.niveau", "huurtoeslag"],
    ["toeslagen.kindgebondenBudget.niveau", "kgb"],
    ["toeslagen.kinderopvangtoeslag.niveau", "kot"],
  ] as const)("%s op 0 schaft de toeslag af, op 50 halveert hem", (pad, veld) => {
    const nu = berekenHuishouden(huurder, params)[veld];
    expect(nu).toBeGreaterThan(0);
    expect(berekenHuishouden(huurder, pasToe(params, [{ parameter: pad, zet: 0 }]))[veld]).toBe(0);
    expect(berekenHuishouden(huurder, pasToe(params, [{ parameter: pad, zet: 50 }]))[veld]).toBeCloseTo(
      nu / 2,
      9,
    );
  });
});

describe("prestatie (HANDOFF §5.1: ruim onder 50 ms)", () => {
  it("rekent de hele populatie snel door", () => {
    const flat = pasToe(params, [
      { parameter: "box1.vrijstelling", zet: 18000 },
      { parameter: "box1.schijven", zet: [{ tot: null, tarief: 40 }] },
    ]);
    simuleer(basis, flat); // opwarmen
    const n = 10;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) simuleer(basis, flat);
    const ms = (performance.now() - t0) / n;
    console.log(`simuleer: ${ms.toFixed(1)} ms per scenario (${pop.length} huishoudens)`);
    expect(ms).toBeLessThan(50);
  });
});

describe("eigen woning in het toetsingsinkomen", () => {
  it("hypotheekrente verlaagt het toetsingsinkomen en verhoogt zo de zorgtoeslag", () => {
    const koper = (rente: number): Huishouden => ({
      leden: [{ inkomen: 38000, soort: "werk", uitkering: 0 }],
      partners: false,
      kinderen: [],
      huurPerMaand: 0,
      hypotheekrente: rente,
      woz: 300000,
      kinderopvang: [],
      vermogen: 0,
    });
    const zonder = berekenHuishouden(koper(0), params);
    const met = berekenHuishouden(koper(8000), params);
    expect(met.toetsingsinkomen).toBeLessThan(zonder.toetsingsinkomen);
    expect(met.zorgtoeslag).toBeGreaterThan(zonder.zorgtoeslag);
    expect(met.eigenWoning).toBeGreaterThan(0);
  });
});

describe("netto-koppeling per uitkeringssoort", () => {
  const hoger = pasToe(params, [{ parameter: "box1.schijven.0.tarief", plus: 5 }]);
  const uitkering = (soort: "bijstand" | "werknemersverzekering"): Huishouden => ({
    leden: [{ inkomen: 22000, soort: "uitkering", uitkering: 22000, uitkeringSoort: soort }],
    partners: false,
    kinderen: [],
    huurPerMaand: 0,
    hypotheekrente: 0,
    woz: 0,
    kinderopvang: [],
    vermogen: 0,
  });
  it("bijstand houdt zijn netto bedrag: de overheid betaalt bruto bij", () => {
    const r = berekenHuishouden(uitkering("bijstand"), hoger, params);
    expect(r.uitkeringKosten).toBeGreaterThan(0);
    const voor = berekenHuishouden(uitkering("bijstand"), params);
    expect(r.bruto - r.belasting).toBeCloseTo(voor.bruto - voor.belasting, 1);
  });
  it("WW en WIA zijn niet netto gekoppeld", () => {
    expect(berekenHuishouden(uitkering("werknemersverzekering"), hoger, params).uitkeringKosten).toBe(0);
  });
});
