import { describe, expect, it } from "vitest";
import {
  heffingVoorKortingen,
  heffingskortingen,
  leesParameter,
  pasToe,
  staffelWaarde,
  valideerParameters,
  valideerPreset,
  verschil,
  zorgtoeslag,
} from "../src/index.ts";
import { laadParameters, laadPresets } from "../src/node/index.ts";

const params = laadParameters(2026);

describe("parameterbestand", () => {
  it("2026 is geldig", () => {
    expect(params.jaar).toBe(2026);
  });

  it("elke sectie heeft een bron", () => {
    const zonderBron: string[] = [];
    const loop = (o: unknown, pad: string) => {
      if (typeof o !== "object" || o === null || Array.isArray(o)) return;
      const r = o as Record<string, unknown>;
      const heeftWaarden = Object.values(r).some((v) => typeof v === "number" || Array.isArray(v));
      if (heeftWaarden && pad && !("bron" in r) && !pad.includes(".")) zonderBron.push(pad);
      for (const [k, v] of Object.entries(r)) loop(v, pad ? `${pad}.${k}` : k);
    };
    loop(params, "");
    expect(zonderBron).toEqual([]);
  });

  it("geeft een leesbare fout bij een tikfout in een sleutel", () => {
    const fout = structuredClone(params) as unknown as Record<string, Record<string, unknown>>;
    fout.box1!.vrijstellig = 0;
    expect(() => valideerParameters(fout, "test.yaml")).toThrow(/test\.yaml: box1.*vrijstellig/);
  });

  it("weigert schijven die niet oplopen", () => {
    const fout = structuredClone(params);
    fout.box1.schijven = [
      { tot: 50000, tarief: 30 },
      { tot: 40000, tarief: 40 },
      { tot: null, tarief: 50 },
    ];
    expect(() => valideerParameters(fout)).toThrow(/lopen op/);
  });

  it("weigert een staffel die niet bij 0 begint", () => {
    const fout = structuredClone(params);
    fout.heffingskortingen.arbeid.staffel = [{ vanaf: 100, bedrag: 0, tarief: 1 }];
    expect(() => valideerParameters(fout)).toThrow(/vanaf: 0/);
  });
});

describe("staffel", () => {
  const ahk = params.heffingskortingen.algemeen.staffel;
  it("is vlak tot de afbouwgrens", () => {
    expect(staffelWaarde(ahk, 0)).toBe(3115);
    expect(staffelWaarde(ahk, 29735)).toBe(3115);
  });
  it("bouwt af en wordt nooit negatief", () => {
    expect(staffelWaarde(ahk, 29736 + 1000)).toBeCloseTo(3115 - 63.98, 6);
    expect(staffelWaarde(ahk, 1e6)).toBe(0);
  });
  it("respecteert het maximum", () => {
    const c = params.heffingskortingen.combinatie;
    expect(staffelWaarde(c.staffel, 1e6, c.maximum)).toBe(3032);
    expect(staffelWaarde(c.staffel, 5000, c.maximum)).toBe(0);
  });
});

describe("wijzigingen", () => {
  it("zet, plus en maal", () => {
    const p = pasToe(params, [
      { parameter: "box1.vrijstelling", zet: 10000 },
      { parameter: "toeslagen.zorgtoeslag.drempelinkomen", plus: 1000 },
      { parameter: "box1.schijven.2.tarief", maal: 2 },
    ]);
    expect(p.box1.vrijstelling).toBe(10000);
    expect(p.toeslagen.zorgtoeslag.drempelinkomen).toBe(30736);
    expect(p.box1.schijven[2]!.tarief).toBe(99);
  });

  it("verandert het origineel niet", () => {
    pasToe(params, [{ parameter: "box1.vrijstelling", zet: 10000 }]);
    expect(params.box1.vrijstelling).toBe(0);
  });

  it("geen wijzigingen geeft hetzelfde object terug", () => {
    expect(pasToe(params, [])).toBe(params);
  });

  it("onbekende parameter geeft een leesbare fout", () => {
    expect(() => pasToe(params, [{ parameter: "box1.vrijstellig", zet: 1 }])).toThrow(
      /Onbekende parameter 'box1.vrijstellig'/,
    );
  });

  it("plus op iets wat geen getal is geeft een fout", () => {
    expect(() => pasToe(params, [{ parameter: "box1.schijven", plus: 1 }])).toThrow(/geen getal/);
  });

  it("een ongeldige uitkomst wordt geweigerd", () => {
    expect(() => pasToe(params, [{ parameter: "box1.vrijstelling", zet: -5 }])).toThrow(/vrijstelling/);
  });

  it("verschil is het omgekeerde van pasToe", () => {
    const w = [
      { parameter: "box1.vrijstelling", zet: 18000 },
      { parameter: "box1.schijven", zet: [{ tot: null, tarief: 40 }] },
      { parameter: "toeslagen.huurtoeslag.niveau", zet: 0 },
    ];
    const p = pasToe(params, w);
    const d = verschil(params, p);
    expect(d).toEqual(w);
    expect(pasToe(params, d)).toEqual(p);
  });

  it("leesParameter", () => {
    expect(leesParameter(params, "box1.schijven.0.tot")).toBe(38883);
  });
});

describe("presets", () => {
  it("alle presets zijn geldig en beginnen met het huidige stelsel", () => {
    const presets = laadPresets(params);
    expect(presets.length).toBeGreaterThanOrEqual(6);
    expect(presets[0]!.id).toBe("huidig");
  });

  it("een preset met een onbekende parameter wordt geweigerd", () => {
    expect(() =>
      valideerPreset(
        {
          id: "x",
          naam: "X",
          omschrijving: "x",
          wijzigingen: [{ parameter: "toeslagen.huursubsidie.niveau", zet: 0 }],
        },
        params,
      ),
    ).toThrow(/onbekende parameter 'toeslagen.huursubsidie.niveau'/);
  });
});

describe("parameters 2027 (voorlopig)", () => {
  const p27 = laadParameters(2027);
  it("is voorlopig, met toelichting", () => {
    expect(p27.status).toBe("voorlopig");
    expect(p27.toelichting).toMatch(/Belastingplan 2027/);
    expect(laadParameters(2026).status).toBe("definitief");
  });
  it("tarieven volgens het Belastingplan 2027 zoals aangenomen door de Tweede Kamer (D-083)", () => {
    // Vierde nota van wijziging met de amendementen 42 en 80: eerste schijf 35,84% tot € 39.337; tweede 38,02% tot
    // € 80.819.
    expect(heffingVoorKortingen(39337, p27, false)).toBeCloseTo(39337 * 0.3584, 2);
    expect(heffingVoorKortingen(80819, p27, false)).toBeCloseTo(39337 * 0.3584 + (80819 - 39337) * 0.3802, 2);
    // AOW'ers: zonder AOW-premie van 17,90%.
    expect(heffingVoorKortingen(39337, p27, true)).toBeCloseTo(39337 * 0.1794, 2);
    // Het maximale aftrektarief beweegt mee met de tweede schijf.
    expect(p27.eigenWoning.aftrekMaxTarief).toBe(p27.box1.schijven[1]!.tarief);
  });
  it("de algemene heffingskorting is nul bij het aanvangspunt van het toptarief", () => {
    const k = { werkt: false, aow: false, alleenstaand: true, combinatiekorting: false };
    expect(heffingskortingen(80819, 0, p27, k).algemeen).toBeLessThan(5);
    expect(heffingskortingen(80819, 0, p27, { ...k, aow: true }).algemeen).toBeLessThan(5);
  });
  it("arbeidskorting: de knikken sluiten op elkaar aan (amendement 42: € 17 extra)", () => {
    const s = p27.heffingskortingen.arbeid.staffel;
    for (let i = 1; i < s.length; i++) {
      const vorig = s[i - 1]!;
      const eind = vorig.bedrag + (vorig.tarief / 100) * (s[i]!.vanaf - vorig.vanaf);
      expect(Math.abs(eind - s[i]!.bedrag)).toBeLessThan(1);
    }
    expect(s[3]!.bedrag).toBe(5791);
  });
  it("maximale zorgtoeslag zoals geraamd in de VWS-begroting 2027 (tabel 77)", () => {
    expect(Math.round(zorgtoeslag(0, false, 0, p27))).toBe(1680);
    expect(Math.round(zorgtoeslag(0, true, 0, p27))).toBe(3223);
    // Boven het maximale toetsingsinkomen zou de zorgtoeslag onder € 24 per jaar komen.
    const z = p27.toeslagen.zorgtoeslag;
    expect(zorgtoeslag(z.maxToetsingsinkomen.alleenstaand, false, 0, p27)).toBeCloseTo(24, 0);
    expect(zorgtoeslag(z.maxToetsingsinkomen.partners, true, 0, p27)).toBeCloseTo(24, 0);
  });
  it("ramingen staan als raming in de bron", () => {
    for (const bron of [
      p27.toeslagen.zorgtoeslag.bron,
      p27.toeslagen.huurtoeslag.bron,
      p27.toeslagen.kindgebondenBudget.bron,
      p27.uitkeringen.bron,
      p27.bijstand.bron,
      p27.zorg.bron,
      p27.kinderbijslag.bron,
    ]) {
      expect(bron).toMatch(/Raming:/);
    }
  });
});
