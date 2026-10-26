import { describe, expect, it } from "vitest";
import {
  aftrekbeperking,
  aowPerJaar,
  belastingBox1,
  eigenWoningSaldo,
  eigenwoningforfait,
  heffingskortingen,
  huurtoeslag,
  huurtoeslagDelen,
  kinderbijslag,
  kindgebondenBudget,
  kinderopvangtoeslag,
  kotPercentages,
  pasToe,
  staffelWaarde,
  zorgtoeslag,
  zvwBijdrage,
  type PersoonKenmerken,
} from "../src/index.ts";
import { laadParameters } from "../src/node/index.ts";

/*
 * Unit tests per regeling (HANDOFF §5.3). Waar mogelijk de rekenvoorbeelden uit de officiële publicaties van
 * Dienst Toeslagen (Berekening <toeslag> 2026), anders waarden die direct uit de officiële tabellen volgen.
 * Bedragen in de voorbeelden zijn per maand en vóór afronding op hele euro's.
 */

const p = laadParameters(2026);
const werknemer: PersoonKenmerken = { werkt: true, aow: false, alleenstaand: true, combinatiekorting: false };
const aowAlleen: PersoonKenmerken = { werkt: false, aow: true, alleenstaand: true, combinatiekorting: false };

describe("heffingskortingen 2026: knikpunten volgen de gepubliceerde bedragen", () => {
  const h = p.heffingskortingen;
  it.each([
    ["algemeen", h.algemeen.staffel, 29736, 3115],
    ["algemeen", h.algemeen.staffel, 78426, 0],
    ["algemeen AOW", h.algemeen.staffelAow, 29736, 1556],
    ["arbeid", h.arbeid.staffel, 11965, 996],
    ["arbeid", h.arbeid.staffel, 25845, 5300],
    ["arbeid", h.arbeid.staffel, 45592, 5685],
    ["arbeid", h.arbeid.staffel, 132920, 0],
    ["arbeid AOW", h.arbeid.staffelAow, 11965, 498],
    ["arbeid AOW", h.arbeid.staffelAow, 25845, 2647],
    ["arbeid AOW", h.arbeid.staffelAow, 45592, 2840],
    ["ouderen", h.ouderen.staffel, 46002, 2067],
    ["ouderen", h.ouderen.staffel, 59782, 0],
  ] as const)("%s, knikpunt %#", (_n, staffel, inkomen, verwacht) => {
    // De Belastingdienst rondt af; de tabel zelf geeft bedragen tot op ± € 1.
    expect(Math.abs(staffelWaarde(staffel, inkomen) - verwacht)).toBeLessThan(1);
  });

  it("arbeidskorting AOW: de formule komt rond € 132.920 op nul uit", () => {
    // De tabel noemt € 0 vanaf € 132.921; de formule geeft daar nog € 1,84 (afronding in de tabel).
    expect(staffelWaarde(h.arbeid.staffelAow, 132920)).toBeLessThan(2);
    expect(staffelWaarde(h.arbeid.staffelAow, 133000)).toBe(0);
  });

  it("combinatiekorting bereikt het maximum rond € 32.719", () => {
    const c = h.combinatie;
    expect(staffelWaarde(c.staffel, 32720, c.maximum)).toBe(3032);
    expect(staffelWaarde(c.staffel, 20000, c.maximum)).toBeCloseTo(0.1145 * (20000 - 6239), 6);
    expect(staffelWaarde(c.staffelAow, 40000, c.maximumAow)).toBe(1514);
  });

  it("alleenstaande-ouderenkorting alleen voor AOW'ers zonder partner", () => {
    expect(heffingskortingen(25000, 0, p, aowAlleen).alleenstaandeOuderen).toBe(540);
    expect(heffingskortingen(25000, 0, p, { ...aowAlleen, alleenstaand: false }).alleenstaandeOuderen).toBe(
      0,
    );
    expect(heffingskortingen(25000, 25000, p, werknemer).alleenstaandeOuderen).toBe(0);
  });
});

describe("box 1", () => {
  it("werknemer met € 40.000: schijven min algemene en arbeidskorting", () => {
    const heffing = 38883 * 0.3575 + (40000 - 38883) * 0.3756;
    const ahk = 3115 - 0.06398 * (40000 - 29736);
    const ak = 5300 + 0.0195 * (40000 - 25845);
    expect(belastingBox1(40000, 40000, p, werknemer)).toBeCloseTo(heffing - ahk - ak, 6);
  });

  it("AOW'er alleenstaand met € 25.000: 17,85% in de eerste schijf en drie kortingen", () => {
    const heffing = 25000 * 0.1785;
    expect(belastingBox1(25000, 0, p, aowAlleen)).toBeCloseTo(heffing - 1556 - 2067 - 540, 6);
  });

  it("kortingen maken de belasting nooit negatief", () => {
    expect(belastingBox1(8000, 8000, p, werknemer)).toBe(0);
  });

  it("toptarief 49,5% boven € 78.426", () => {
    const verschil =
      belastingBox1(200001, 200001, p, werknemer) - belastingBox1(200000, 200000, p, werknemer);
    expect(verschil).toBeCloseTo(0.495, 6);
  });
});

describe("eigen woning 2026", () => {
  it.each([
    [10000, 0],
    [60000, 150],
    [400000, 1400],
    [1350000, 4725],
    [1500000, 4725 + 0.0235 * 150000],
  ])("forfait bij WOZ € %i is € %f", (woz, verwacht) => {
    expect(eigenwoningforfait(woz, p)).toBeCloseTo(verwacht, 6);
  });

  it("Wet Hillen: € 300 verschil geeft ongeveer € 216 aftrek (voorbeeld Belastingdienst)", () => {
    // WOZ € 400.000 → forfait € 1.400; rente € 1.100 → verschil € 300.
    const s = eigenWoningSaldo(1100, 400000, p);
    expect(s.hillenAftrek).toBeCloseTo(0.71867 * 300, 6);
    expect(Math.round(s.hillenAftrek)).toBe(216);
    expect(s.saldo).toBeCloseTo(300 - 0.71867 * 300, 6);
  });

  it("met een hoge hypotheekrente is het saldo negatief en geldt geen Hillen-aftrek", () => {
    const s = eigenWoningSaldo(12000, 400000, p);
    expect(s.hillenAftrek).toBe(0);
    expect(s.saldo).toBeCloseTo(1400 - 12000, 6);
  });

  it("aftrekbeperking: aftrek in de toptariefschijf levert maar 37,56% op", () => {
    expect(aftrekbeperking(100000, -10000, p, false)).toBeCloseTo(10000 * (0.495 - 0.3756), 6);
    expect(aftrekbeperking(80000, -10000, p, false)).toBeCloseTo((80000 - 78426) * (0.495 - 0.3756), 6);
    expect(aftrekbeperking(60000, -10000, p, false)).toBe(0);
  });
});

describe("zorgtoeslag 2026 (Dienst Toeslagen, Berekening zorgtoeslag 2026)", () => {
  it("rekenvoorbeeld 1: Wouter, alleenstaand, € 19.000 → € 1.550,45 per jaar", () => {
    expect(zorgtoeslag(19000, false, 0, p)).toBeCloseTo(1550.45, 2);
  });

  it("rekenvoorbeeld 2: Marit en Rik, € 33.200 samen → € 2.487,02 vóór de 50%-regel voor niet-verzekerden", () => {
    expect(zorgtoeslag(33200, true, 0, p)).toBeCloseTo(2487.02, 2);
  });

  it("maximale zorgtoeslag: € 1.550 alleen, € 2.963 met partner", () => {
    expect(Math.round(zorgtoeslag(29736, false, 0, p))).toBe(1550);
    expect(Math.round(zorgtoeslag(29736, true, 0, p))).toBe(2963);
  });

  it("geen recht boven de inkomensgrens van € 40.857 (alleen) en € 51.142 (partners)", () => {
    expect(zorgtoeslag(40857, false, 0, p)).toBeGreaterThan(0);
    expect(zorgtoeslag(40858, false, 0, p)).toBe(0);
    expect(zorgtoeslag(51142, true, 0, p)).toBeGreaterThan(0);
    expect(zorgtoeslag(51143, true, 0, p)).toBe(0);
  });

  it("geen recht boven de vermogensgrens van € 146.011", () => {
    expect(zorgtoeslag(19000, false, 146011, p)).toBeGreaterThan(0);
    expect(zorgtoeslag(19000, false, 146012, p)).toBe(0);
  });
});

describe("huurtoeslag 2026 (Dienst Toeslagen, Berekening huurtoeslag 2026)", () => {
  it("rekenvoorbeeld 2: Demi, Sophie en kind, € 34.000, huur € 1.200 → € 492,03 per maand", () => {
    const d = huurtoeslagDelen(34000, 1200, 3, p);
    expect(d.a).toBeCloseTo(297.49, 2);
    expect(d.b).toBeCloseTo(172.86, 2);
    // Het rekenvoorbeeld rondt elke stap af op centen (168,79 × 40% = 67,516 → 67,51).
    expect(d.c).toBeCloseTo(67.51, 1);
    expect(d.d).toBeCloseTo(45.83, 2);
    expect(d.perMaand).toBeCloseTo(492.03, 1);
  });

  it("rekenvoorbeeld 3: Marina, alleenstaand, € 29.000, huur € 710 → € 307,91 per maand", () => {
    const d = huurtoeslagDelen(29000, 710, 1, p);
    expect(d.a).toBeCloseTo(295.68, 2);
    expect(d.b).toBeCloseTo(137.67, 2);
    expect(d.c).toBe(0);
    expect(d.d).toBeCloseTo(125.44, 2);
    expect(d.perMaand).toBeCloseTo(307.91, 1);
  });

  it("geen huurtoeslag als de huur niet boven de basishuur ligt", () => {
    expect(huurtoeslagDelen(0, 202.52, 1, p).perMaand).toBe(0);
    expect(huurtoeslagDelen(0, 210, 1, p).perMaand).toBeCloseTo(210 - 202.52, 6);
  });

  it("twee personen: lage aftoppingsgrens; drie personen: hoge", () => {
    const twee = huurtoeslagDelen(0, 932.93, 2, p);
    expect(twee.b).toBeCloseTo((713.02 - 498.2) * 0.65, 6);
    const drie = huurtoeslagDelen(0, 932.93, 3, p);
    expect(drie.b).toBeCloseTo((764.14 - 498.2) * 0.65, 6);
  });

  it("per jaar, met vermogensgrens € 38.479 (alleenstaand)", () => {
    expect(huurtoeslag(29000, 710, 1, false, 0, p)).toBeCloseTo(
      huurtoeslagDelen(29000, 710, 1, p).perMaand * 12,
      6,
    );
    expect(huurtoeslag(29000, 710, 1, false, 38480, p)).toBe(0);
  });
});

describe("kindgebonden budget 2026 (Dienst Toeslagen, Berekening kindgebonden budget 2026)", () => {
  it("rekenvoorbeeld 1: Richard en Kevin, € 45.000, kinderen 4 en 8 → € 4.714,72", () => {
    expect(kindgebondenBudget(45000, [4, 8], true, 0, p)).toBeCloseTo(4714.72, 2);
  });

  it("rekenvoorbeeld 2: Tim en Vera, € 45.000, kinderen 16 en 13 → € 6.402,72", () => {
    expect(kindgebondenBudget(45000, [16, 13], true, 0, p)).toBeCloseTo(6402.72, 2);
  });

  it("rekenvoorbeeld 3: Mario, alleenstaande ouder, € 30.000, kind van 8 → € 5.975,94", () => {
    expect(kindgebondenBudget(30000, [8], false, 0, p)).toBeCloseTo(5975.94, 2);
  });

  it("rekenvoorbeeld 4 (zonder woonlandfactor): € 46.000, 2 kinderen → € 4.638,72", () => {
    expect(kindgebondenBudget(46000, [5, 9], true, 0, p)).toBeCloseTo(4638.72, 2);
  });

  it("kinderen van 18 tellen niet mee; boven de vermogensgrens geen recht", () => {
    expect(kindgebondenBudget(20000, [18], true, 0, p)).toBe(0);
    expect(kindgebondenBudget(20000, [8], true, 184634, p)).toBe(0);
  });
});

describe("kinderopvangtoeslag 2026 (Dienst Toeslagen, Berekening kinderopvangtoeslag 2026)", () => {
  it("rekenvoorbeeld 1: € 60.000, 122 uur dagopvang à € 10,50 → € 1.202,86 per maand", () => {
    const opvang = [{ soort: "dagopvang", urenPerMaand: 122, uurprijs: 10.5 }] as const;
    expect(kinderopvangtoeslag(60000, opvang, p) / 12).toBeCloseTo(1202.86, 2);
  });

  it("rekenvoorbeeld 2: € 120.000, twee kinderen, maximale uurprijzen → € 1.162,28 per maand", () => {
    const opvang = [
      { soort: "buitenschoolse", urenPerMaand: 65, uurprijs: 10.1 },
      { soort: "dagopvang", urenPerMaand: 87, uurprijs: 12.45 },
    ] as const;
    expect(kinderopvangtoeslag(120000, opvang, p) / 12).toBeCloseTo(1162.28, 1);
  });

  it("rekenvoorbeeld 3: Anne, € 40.000, 240 uur gastouder → hoogstens 230 uur → € 1.821,60 per maand", () => {
    const opvang = [{ soort: "gastouder", urenPerMaand: 240, uurprijs: 8.25 }] as const;
    expect(kinderopvangtoeslag(40000, opvang, p) / 12).toBeCloseTo(1821.6, 2);
  });

  it("rekenvoorbeeld 4: € 50.000, 108 uur gastouder boven de maximale uurprijs → € 880,24 per maand", () => {
    const opvang = [{ soort: "gastouder", urenPerMaand: 108, uurprijs: 9.52 }] as const;
    expect(kinderopvangtoeslag(50000, opvang, p) / 12).toBeCloseTo(880.24, 2);
  });

  it("tabelgrenzen: 96% tot € 56.413, daarna 95,5%; minimaal 36,5% voor het eerste kind", () => {
    expect(kotPercentages(56412, p).eersteKind).toBe(96);
    expect(kotPercentages(56413, p).eersteKind).toBe(95.5);
    expect(kotPercentages(1e6, p)).toEqual({ eersteKind: 36.5, volgendKind: 68.2 });
  });
});

describe("AOW, kinderbijslag en Zvw-bijdrage 2026", () => {
  it("AOW per jaar volgens de SVB-bedragen", () => {
    expect(aowPerJaar(p, false)).toBeCloseTo(6 * 1637.57 + 6 * 1662.16 + 12 * 104.78, 6);
    expect(aowPerJaar(p, true)).toBeCloseTo(6 * 1122.12 + 6 * 1139.39 + 12 * 74.85, 6);
  });

  it("kinderbijslag per leeftijdsgroep; 18 jaar en ouder telt niet", () => {
    const jong = 2 * 295.07 + 2 * 298.4;
    const midden = 2 * 358.3 + 2 * 362.35;
    const oud = 2 * 421.53 + 2 * 426.29;
    expect(kinderbijslag([3], p)).toBeCloseTo(jong, 6);
    expect(kinderbijslag([3, 8, 14], p)).toBeCloseTo(jong + midden + oud, 6);
    expect(kinderbijslag([18], p)).toBe(0);
    expect(kinderbijslag([3], pasToe(p, [{ parameter: "kinderbijslag.niveau", zet: 0 }]))).toBe(0);
  });

  it("Zvw-bijdrage 4,85% voor AOW'ers, tot het maximum van € 79.409", () => {
    expect(zvwBijdrage(1662.16, true, p)).toBeCloseTo(80.61, 2); // SVB: inhouding op de maandelijkse AOW
    expect(zvwBijdrage(100000, true, p)).toBeCloseTo(79409 * 0.0485, 6);
    expect(zvwBijdrage(40000, false, p)).toBe(0);
  });
});
