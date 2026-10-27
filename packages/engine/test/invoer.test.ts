import { describe, expect, it } from "vitest";
import {
  aandeelOnder,
  aowPerJaar,
  berekenHuishouden,
  codeerScenario,
  decodeerScenario,
  huishoudenUitInvoer,
  jaarbedrag,
  marginaleDrukVan,
  pasToe,
  valideerInvoer,
  type Invoer,
} from "../src/index.ts";
import { laadLabKnoppen, laadParameters } from "../src/node/index.ts";

const p = laadParameters(2026);

const basisInvoer: Invoer = {
  personen: [
    { leeftijd: 40, soort: "loondienst", bedrag: 3000, periode: "maand", inclusiefVakantiegeld: false },
  ],
  kinderen: [],
  wonen: "huur",
  huurPerMaand: 800,
  woz: 0,
  hypotheekrente: 0,
  vermogen: 0,
};

describe("invoerformulier", () => {
  it("maandloon zonder vakantiegeld wordt jaarloon met 8% vakantiegeld", () => {
    expect(jaarbedrag(basisInvoer.personen[0]!, p)).toBeCloseTo(3000 * 12 * 1.08, 6);
    expect(jaarbedrag({ ...basisInvoer.personen[0]!, inclusiefVakantiegeld: true }, p)).toBe(36000);
    expect(jaarbedrag({ ...basisInvoer.personen[0]!, periode: "jaar", bedrag: 40000 }, p)).toBe(40000);
  });

  it("AOW plus pensioen: de AOW volgt uit de parameters", () => {
    const h = huishoudenUitInvoer(
      {
        ...basisInvoer,
        personen: [
          { leeftijd: 70, soort: "aow", bedrag: 9000, periode: "jaar", inclusiefVakantiegeld: true },
        ],
      },
      p,
    );
    expect(h.leden[0]!.uitkering).toBeCloseTo(aowPerJaar(p, false), 6);
    expect(h.leden[0]!.inkomen).toBeCloseTo(aowPerJaar(p, false) + 9000, 6);
  });

  it("koop: huur telt niet; huur: WOZ en rente tellen niet", () => {
    const koop = huishoudenUitInvoer({ ...basisInvoer, wonen: "koop", woz: 400000, hypotheekrente: 8000 }, p);
    expect(koop.huurPerMaand).toBe(0);
    expect(koop.woz).toBe(400000);
    const huur = huishoudenUitInvoer({ ...basisInvoer, woz: 400000, hypotheekrente: 8000 }, p);
    expect(huur.woz).toBe(0);
    expect(huur.hypotheekrente).toBe(0);
  });

  it("kinderopvang en inkomen van meerderjarige kinderen", () => {
    const h = huishoudenUitInvoer(
      {
        ...basisInvoer,
        kinderen: [
          { leeftijd: 3, inkomen: 0, opvang: "dagopvang", urenPerMaand: 80, uurprijs: 11 },
          { leeftijd: 19, inkomen: 8000, opvang: "geen", urenPerMaand: 0, uurprijs: 0 },
        ],
      },
      p,
    );
    expect(h.kinderopvang).toEqual([{ soort: "dagopvang", urenPerMaand: 80, uurprijs: 11 }]);
    expect(h.kindInkomens).toEqual([0, 8000]);
  });

  it("valideert en weigert onzin", () => {
    expect(valideerInvoer(basisInvoer)).toEqual(basisInvoer);
    expect(() => valideerInvoer({ ...basisInvoer, wonen: "kasteel" })).toThrow(/wonen/);
  });
});

describe("scenariocode", () => {
  const w = [
    { parameter: "box1.vrijstelling", zet: 18000 },
    { parameter: "toeslagen.huurtoeslag.niveau", zet: 0 },
  ];
  it("heen en terug geeft dezelfde wijzigingen", () => {
    expect(decodeerScenario(codeerScenario(w), p)).toEqual(w);
    expect(decodeerScenario("#" + codeerScenario(w), p)).toEqual(w);
  });
  it("de code bevat alleen tekens die veilig zijn in een link", () => {
    expect(codeerScenario(w)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("weigert een kapotte code en een onbekende parameter", () => {
    expect(() => decodeerScenario("!!!", p)).toThrow(/niet leesbaar/);
    expect(() => decodeerScenario(codeerScenario([{ parameter: "box1.bestaatNiet", zet: 1 }]), p)).toThrow(
      /bestaatNiet/,
    );
  });
});

describe("lab-knoppen", () => {
  it("alle knoppen wijzen naar een bestaande parameter van het juiste type", () => {
    const knoppen = laadLabKnoppen(p);
    expect(knoppen.groepen.length).toBeGreaterThan(3);
  });
});

describe("marginale druk en positie", () => {
  const h = huishoudenUitInvoer(basisInvoer, p);
  it("marginale druk van een werknemer zonder toeslagenafbouw ligt rond het schijftarief plus afbouw", () => {
    const m = marginaleDrukVan(h, p);
    expect(m).toBeGreaterThan(30);
    expect(m).toBeLessThan(100);
  });
  it("zonder belasting en toeslagen is de marginale druk nul", () => {
    const niets = pasToe(p, [
      { parameter: "box1.schijven", zet: [{ tot: null, tarief: 0 }] },
      { parameter: "toeslagen.huurtoeslag.niveau", zet: 0 },
      { parameter: "toeslagen.zorgtoeslag.niveau", zet: 0 },
    ]);
    expect(marginaleDrukVan(h, niets)).toBeCloseTo(0, 6);
    expect(berekenHuishouden(h, niets).belasting).toBe(0);
  });
  it("aandeelOnder telt gewichten", () => {
    expect(aandeelOnder(5, [1, 4, 6, 10], [1, 1, 1, 1])).toBe(0.5);
    expect(aandeelOnder(5, [1, 4, 6, 10], [3, 1, 0, 0])).toBe(1);
  });
});
