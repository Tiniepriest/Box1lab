import { describe, expect, it } from "vitest";
import {
  aowPerJaar,
  belastingBox1,
  belastingdeelKortingen,
  berekenHuishouden,
  bijstandVermogenTeHoog,
  huishoudenUitInvoer,
  staffelSprongen,
  valideerInvoer,
  type Huishouden,
  type Invoer,
  type PersoonInvoer,
} from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

/*
 * Fase 37 (D-088): de fouten uit de review van model 0.5.0, met de testhuishoudens uit die review.
 */

const p = laadParameters(2026);

function persoon(x: Partial<PersoonInvoer>): PersoonInvoer {
  return {
    leeftijd: 40,
    soort: "loondienst",
    bedrag: 0,
    periode: "jaar",
    inclusiefVakantiegeld: true,
    dertiendeMaand: false,
    extraPerJaar: 0,
    pensioenpremiePerMaand: 0,
    urencriterium: true,
    starter: false,
    ...x,
  };
}

function invoer(x: Partial<Invoer>): Invoer {
  return valideerInvoer({
    personen: [persoon({})],
    kinderen: [],
    wonen: "huur",
    huurPerMaand: 0,
    woz: 0,
    hypotheekrente: 0,
    vermogen: 0,
    beleggingen: 0,
    schulden: 0,
    ...x,
  });
}

const reken = (i: Invoer) => berekenHuishouden(huishoudenUitInvoer(i, p), p);

describe("E1: geen 8% vakantiegeld bovenop een pensioen", () => {
  it("€ 1.000 pensioen per maand is € 12.000 per jaar", () => {
    const h = huishoudenUitInvoer(
      invoer({ personen: [persoon({ leeftijd: 70, soort: "aow", bedrag: 1000, periode: "maand" })] }),
      p,
    );
    expect(h.leden[0]!.inkomen).toBeCloseTo(aowPerJaar(p, false) + 12000, 6);
  });
  it("loon en WW per maand krijgen het vakantiegeld er nog wel bij", () => {
    for (const soort of ["loondienst", "werknemersverzekering"] as const) {
      const h = huishoudenUitInvoer(
        invoer({
          personen: [persoon({ soort, bedrag: 1000, periode: "maand", inclusiefVakantiegeld: false })],
        }),
        p,
      );
      expect(h.leden[0]!.inkomen).toBeCloseTo(12960, 6);
    }
  });
});

describe("E2 en E3: box 3 telt mee in de heffingskortingen", () => {
  it("het belastingdeel is 8,10 / 35,75, voor AOW'ers 8,10 / 17,85", () => {
    expect(belastingdeelKortingen(p, false)).toBeCloseTo(8.1 / 35.75, 9);
    expect(belastingdeelKortingen(p, true)).toBeCloseTo(8.1 / 17.85, 9);
  });

  it("€ 50.000 loon, € 100.000 spaargeld, € 150.000 beleggingen: lagere algemene heffingskorting", () => {
    const zonder = reken(invoer({ personen: [persoon({ bedrag: 50000 })] }));
    const met = reken(
      invoer({ personen: [persoon({ bedrag: 50000 })], vermogen: 100000, beleggingen: 150000 }),
    );
    // Voordeel: (1,28% × 100.000 + 6% × 150.000) × (250.000 − 59.357) / 250.000.
    const v = ((1280 + 9000) * (250000 - 59357)) / 250000;
    // Box 3 36%, plus 6,398% minder algemene heffingskorting: de review kwam op € 502 te weinig belasting.
    expect(met.box3).toBeCloseTo(v * 0.36 + v * 0.06398, 6);
    expect(v * 0.06398).toBeCloseTo(501.55, 1);
    // De box 1-belasting zelf, en dus het bedrag bovenaan, blijven los van het vermogen (D-076).
    expect(met.belasting).toBeCloseTo(zonder.belasting, 6);
  });

  it("geen inkomen, € 200.000 spaargeld: de algemene heffingskorting dekt de box 3-belasting", () => {
    const r = reken(invoer({ personen: [persoon({ soort: "geen" })], vermogen: 200000 }));
    // (200.000 − 59.357) × 1,28% × 36% = € 648, minder dan het belastingdeel van de korting (€ 706).
    expect(r.box3).toBe(0);
  });

  it("geen inkomen, € 600.000 spaargeld: alleen het belastingdeel gaat eraf", () => {
    const r = reken(invoer({ personen: [persoon({ soort: "geen" })], vermogen: 600000 }));
    const v = (600000 - 59357) * 0.0128;
    expect(r.box3).toBeCloseTo(v * 0.36 - (3115 * 8.1) / 35.75, 6);
  });

  it("partners: het box 3-inkomen gaat naar wie de korting nog niet gebruikt", () => {
    const r = reken(
      invoer({
        personen: [persoon({ bedrag: 60000 }), persoon({ soort: "geen" })],
        vermogen: 300000,
      }),
    );
    const v = (300000 - 2 * 59357) * 0.0128;
    // Alles bij de partner zonder inkomen: 36% min het belastingdeel van diens algemene heffingskorting.
    expect(r.box3).toBeCloseTo(v * 0.36 - (3115 * 8.1) / 35.75, 6);
  });
});

describe("E4: tariefsaanpassing", () => {
  it("zzp, € 150.000 winst: ondernemersaftrek en mkb-winstvrijstelling hoogstens tegen 37,56%", () => {
    const r = reken(invoer({ personen: [persoon({ soort: "zzp", bedrag: 150000 })] }));
    const mkb = (150000 - 1200) * 0.127;
    const belastbaar = 150000 - 1200 - mkb;
    const k = { werkt: true, aow: false, alleenstaand: true, combinatiekorting: false };
    const extra = (1200 + mkb) * (0.495 - 0.3756);
    expect(extra).toBeCloseTo(2399.65, 1);
    expect(r.belasting).toBeCloseTo(belastingBox1(belastbaar, 150000, p, k) + extra, 6);
  });

  it("zzp onder de toptariefschijf: geen tariefsaanpassing", () => {
    const r = reken(invoer({ personen: [persoon({ soort: "zzp", bedrag: 45000 })] }));
    const mkb = (45000 - 1200) * 0.127;
    const k = { werkt: true, aow: false, alleenstaand: true, combinatiekorting: false };
    expect(r.belasting).toBeCloseTo(belastingBox1(45000 - 1200 - mkb, 45000, p, k), 6);
  });

  it("eigen woning in de hoogste schijf: de tariefsaanpassing gaat over de hele rente", () => {
    const i = invoer({
      personen: [persoon({ bedrag: 250000 })],
      wonen: "koop",
      woz: 1500000,
      hypotheekrente: 30000,
    });
    const r = reken(i);
    const zonderWoning = reken({ ...i, wonen: "huur" });
    const forfait = 0.0035 * 1350000 + 0.0235 * 150000;
    // Voordeel: (rente − forfait) × 49,5%, min 11,94% over de hele rente.
    expect(r.eigenWoning).toBeCloseTo((30000 - forfait) * 0.495 - 30000 * (0.495 - 0.3756), 6);
    expect(zonderWoning.belasting - r.belasting).toBeCloseTo(r.eigenWoning, 6);
  });
});

describe("E5: kinderopvangtoeslag alleen als alle ouders werken", () => {
  const opvang = {
    leeftijd: 2,
    inkomen: 0,
    opvang: "dagopvang" as const,
    urenPerMaand: 100,
    uurprijs: 11.23,
  };
  it("alleenstaande in de bijstand: geen kinderopvangtoeslag", () => {
    const r = reken(invoer({ personen: [persoon({ soort: "bijstand" })], kinderen: [opvang] }));
    expect(r.kot).toBe(0);
    expect(r.beperkingen.kinderopvangtoeslag).toBe("werk");
  });
  it("paar met één verdiener: geen kinderopvangtoeslag", () => {
    const r = reken(
      invoer({ personen: [persoon({ bedrag: 40000 }), persoon({ soort: "geen" })], kinderen: [opvang] }),
    );
    expect(r.kot).toBe(0);
  });
  it("twee werkende ouders: wel", () => {
    const r = reken(
      invoer({ personen: [persoon({ bedrag: 40000 }), persoon({ bedrag: 20000 })], kinderen: [opvang] }),
    );
    expect(r.kot).toBeGreaterThan(0);
    expect(r.beperkingen.kinderopvangtoeslag).toBeUndefined();
  });
});

describe("E6: huurtoeslag voor een kamer en onder de 21", () => {
  it("een kamer: geen huurtoeslag", () => {
    const i = invoer({ personen: [persoon({ leeftijd: 20, bedrag: 7200 })], huurPerMaand: 450 });
    expect(reken(i).huurtoeslag).toBeGreaterThan(0);
    const kamer = reken({ ...i, zelfstandigeWoning: false });
    expect(kamer.huurtoeslag).toBe(0);
    expect(kamer.beperkingen.huurtoeslag).toBe("kamer");
  });
  it("onder de 21 telt de huur tot € 498,20", () => {
    const jong = reken(invoer({ personen: [persoon({ leeftijd: 20, bedrag: 7200 })], huurPerMaand: 700 }));
    const ouder = reken(invoer({ personen: [persoon({ leeftijd: 25, bedrag: 7200 })], huurPerMaand: 498.2 }));
    expect(jong.huurtoeslag).toBeCloseTo(ouder.huurtoeslag, 6);
    expect(jong.beperkingen.huurtoeslag).toBe("jongeren");
  });
  it("met een kind geldt de gewone huurgrens", () => {
    const kind = { leeftijd: 1, inkomen: 0, opvang: "geen" as const, urenPerMaand: 0, uurprijs: 0 };
    const jong = reken(
      invoer({ personen: [persoon({ leeftijd: 20, bedrag: 7200 })], huurPerMaand: 700, kinderen: [kind] }),
    );
    const ouder = reken(
      invoer({ personen: [persoon({ leeftijd: 25, bedrag: 7200 })], huurPerMaand: 700, kinderen: [kind] }),
    );
    expect(jong.huurtoeslag).toBeCloseTo(ouder.huurtoeslag, 6);
  });
});

describe("E7: vanaf de AOW-leeftijd komt de AOW er vanzelf bij", () => {
  it("68 jaar en € 2.000 loon per maand: AOW plus loon, met de tarieven voor AOW'ers", () => {
    const h: Huishouden = huishoudenUitInvoer(
      invoer({
        personen: [persoon({ leeftijd: 68, bedrag: 2000, periode: "maand", inclusiefVakantiegeld: false })],
      }),
      p,
    );
    const aow = aowPerJaar(p, false);
    expect(h.leden[0]!.inkomen).toBeCloseTo(aow + 25920, 6);
    expect(h.leden[0]!.aowLeeftijd).toBe(true);
    const r = berekenHuishouden(h, p);
    expect(r.uitkering).toBeCloseTo(aow, 6);
    // Bijdrage Zvw alleen over de AOW; over het loon betaalt de werkgever.
    expect(r.zvw).toBeCloseTo(aow * 0.0485, 6);
    // Eerste schijf voor AOW'ers: 17,85% in plaats van 35,75%.
    const k = { werkt: true, aow: true, alleenstaand: true, combinatiekorting: false };
    expect(r.belasting).toBeCloseTo(belastingBox1(aow + 25920, 25920, p, k), 6);
  });
  it("bijstand of WW na de AOW-leeftijd: alleen de AOW", () => {
    for (const soort of ["bijstand", "werknemersverzekering", "geen"] as const) {
      const h = huishoudenUitInvoer(
        invoer({ personen: [persoon({ leeftijd: 70, soort, bedrag: 9000 })] }),
        p,
      );
      expect(h.leden[0]!.soort).toBe("aow");
      expect(h.leden[0]!.inkomen).toBeCloseTo(aowPerJaar(p, false), 6);
    }
  });
});

describe("E8: vermogensgrens in de bijstand", () => {
  it("€ 100.000 spaargeld: geen bijstand", () => {
    const i = invoer({ personen: [persoon({ soort: "bijstand" })], vermogen: 100000 });
    expect(bijstandVermogenTeHoog(i, p)).toBe(true);
    expect(reken(i).bruto).toBe(0);
  });
  it("€ 5.000 spaargeld: wel bijstand", () => {
    const i = invoer({ personen: [persoon({ soort: "bijstand" })], vermogen: 5000 });
    expect(bijstandVermogenTeHoog(i, p)).toBe(false);
    expect(reken(i).bruto).toBeGreaterThan(0);
  });
  it("een paar mag samen € 16.000 hebben", () => {
    const paar = invoer({
      personen: [persoon({ soort: "bijstand" }), persoon({ soort: "bijstand" })],
      vermogen: 12000,
    });
    expect(bijstandVermogenTeHoog(paar, p)).toBe(false);
    expect(bijstandVermogenTeHoog({ ...paar, personen: [paar.personen[0]!] }, p)).toBe(true);
  });
});

describe("staffels lopen door (valideer)", () => {
  it("de staffels van 2026 hebben geen sprong", () => {
    expect(staffelSprongen(p.heffingskortingen.arbeid.staffel)).toEqual([]);
    expect(staffelSprongen(p.heffingskortingen.algemeen.staffel)).toEqual([]);
  });
  it("een tikfout valt op", () => {
    const fout = p.heffingskortingen.arbeid.staffel.map((s, i) =>
      i === 2 ? { ...s, bedrag: s.bedrag + 100 } : s,
    );
    expect(staffelSprongen(fout)).toHaveLength(2);
  });
});
