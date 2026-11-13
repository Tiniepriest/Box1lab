import type { Parameters } from "./parameters/schema.ts";
import {
  belastingBox1,
  belastingdeelKortingen,
  box1Uitkomst,
  schijfTarief,
  tariefsaanpassing,
  type BeperkteAftrek,
} from "./regels/box1.ts";
import { eigenWoningSaldo } from "./regels/eigenwoning.ts";
import type { PersoonKenmerken } from "./regels/heffingskortingen.ts";
import { kinderbijslag as berekenKinderbijslag } from "./regels/kinderbijslag.ts";
import { huurtoeslag } from "./regels/toeslagen/huurtoeslag.ts";
import { kindgebondenBudget } from "./regels/toeslagen/kgb.ts";
import { kinderopvangtoeslag, type Kinderopvang } from "./regels/toeslagen/kot.ts";
import { belastbareWinst, type Ondernemer } from "./regels/ondernemer.ts";
import { standaardPensioenpremie } from "./regels/pensioen.ts";
import { zorgtoeslag } from "./regels/toeslagen/zorgtoeslag.ts";
import { aowPerJaar, gekoppeldBruto } from "./regels/uitkeringen.ts";
import { bijstandBruto } from "./regels/bijstand.ts";
import { zvwBijdrage } from "./regels/zorg.ts";
import { box3, type Box3Vermogen } from "./regels/box3.ts";

export type InkomensSoort = "werk" | "uitkering" | "aow" | "geen";
export type UitkeringSoort = "bijstand" | "werknemersverzekering";

export interface Lid {
  /** Bruto jaarinkomen (inclusief een eventuele uitkering of AOW). */
  inkomen: number;
  soort: InkomensSoort;
  /** Deel van het inkomen dat een uitkering of AOW is (voor de netto-koppeling). */
  uitkering: number;
  /** Soort uitkering bij soort "uitkering"; bepaalt of de netto-koppeling geldt. Standaard bijstand. */
  uitkeringSoort?: UitkeringSoort;
  /** Bij soort "werk": zelfstandig ondernemer. `inkomen` is dan de winst. */
  ondernemer?: Ondernemer;
  /**
   * Werknemersdeel van de pensioenpremie per jaar, ingehouden op het loon en aftrekbaar. "standaard" = de
   * standaardregeling uit de parameters, over het actuele loon.
   */
  pensioenpremie?: number | "standaard";
  /**
   * Heeft de AOW-leeftijd, naast werk (soort "werk"): `uitkering` is dan de AOW, die in `inkomen` zit. Geldt voor de
   * tarieven en kortingen voor AOW'ers. Bij soort "aow" vanzelf.
   */
  aowLeeftijd?: boolean;
  /** Leeftijd, als die bekend is; voor de huurgrens van jongeren in de huurtoeslag. */
  leeftijd?: number;
}

export interface Huishouden {
  leden: Lid[];
  partners: boolean;
  /** Leeftijden van de kinderen in het huishouden (thuiswonend, elke leeftijd). */
  kinderen: number[];
  /**
   * Bruto jaarinkomen per kind, in dezelfde volgorde als `kinderen` (ontbreekt = 0). Meerderjarige kinderen
   * betalen hun eigen belasting, krijgen hun eigen zorgtoeslag en betalen hun eigen nominale premie.
   */
  kindInkomens?: number[];
  /** Kale huur per maand; 0 bij een koopwoning. */
  huurPerMaand: number;
  /** Huurt een zelfstandige woning (eigen voordeur, keuken en toilet). Ontbreekt het, dan wel. */
  zelfstandigeWoning?: boolean;
  hypotheekrente: number;
  woz: number;
  /** Kinderopvang per kind. */
  kinderopvang: Kinderopvang[];
  /** Vermogen (spaargeld en beleggingen min schulden) op 1 januari, voor de vermogenstoets van toeslagen. */
  vermogen: number;
  /** Vermogen in box 3 per soort. Ontbreekt het, dan telt `vermogen` als spaargeld. */
  box3?: Box3Vermogen;
}

export interface Resultaat {
  bruto: number;
  /** Box 1-belasting inclusief het effect van de eigen woning, zonder het effect van vermogen (dat staat in `box3`). */
  belasting: number;
  /** Fiscaal voordeel van de eigen woning (positief = minder belasting); zit al in `belasting`. */
  eigenWoning: number;
  /**
   * Wat het vermogen aan belasting kost, apart van `belasting`: de belasting in box 3 na aftrek van onbenutte
   * heffingskortingen, plus de lagere algemene heffingskorting en ouderenkorting door het box 3-inkomen (D-088).
   */
  box3: number;
  zvw: number;
  /** Werknemersdeel van de pensioenpremie (gaat af van het bruto inkomen, vóór belasting). */
  pensioenpremie: number;
  /** Zorgtoeslag van het huishouden, inclusief die van meerderjarige kinderen. */
  zorgtoeslag: number;
  /** Aantal personen of partnerparen in het huishouden dat zorgtoeslag krijgt (zoals Dienst Toeslagen telt). */
  zorgtoeslagOntvangers: number;
  huurtoeslag: number;
  kgb: number;
  kot: number;
  kinderbijslag: number;
  zorgpremie: number;
  /**
   * Extra bruto uitkering die de overheid betaalt door de netto-koppeling; negatief als het basisinkomen een deel
   * van de uitkering vervangt.
   */
  uitkeringKosten: number;
  /** Basisinkomen van het huishouden per jaar (onbelast). */
  basisinkomen: number;
  /**
   * Bruto uitkeringen van het huishouden per jaar: AOW (zonder aanvullend pensioen), bijstand en
   * werknemersverzekeringen, na netto-koppeling en na wat het basisinkomen vervangt. Zit al in `bruto`.
   */
  uitkering: number;
  /** Gezamenlijk toetsingsinkomen voor de toeslagen. */
  toetsingsinkomen: number;
  toeslagen: number;
  besteedbaar: number;
  volwassenen: number;
  kinderen: number;
  /** Equivalentiefactor om inkomens van verschillende huishoudens te vergelijken. */
  equivalentie: number;
  /**
   * Waarom een toeslag 0 of lager is dan je zou verwachten, voor uitleg op de site: kinderopvangtoeslag alleen als
   * alle ouders werken; huurtoeslag niet voor een kamer, en voor jongeren onder 21 over een lagere huur.
   */
  beperkingen: { kinderopvangtoeslag?: "werk"; huurtoeslag?: "kamer" | "jongeren" };
}

/**
 * Hoeveel bruto uitkering het basisinkomen vervangt: zoveel dat het netto inkomen van deze persoon (na belasting
 * en Zvw-bijdrage) `basisinkomen` lager wordt, maar nooit meer dan de hele uitkering.
 */
function brutoVervangen(
  inkomen: number,
  uitkering: number,
  basisinkomen: number,
  k: PersoonKenmerken,
  p: Parameters,
): number {
  const netto = (y: number) => y - belastingBox1(y, 0, p, k) - zvwBijdrage(y, k.aow, p);
  const doel = netto(inkomen) - basisinkomen;
  if (netto(inkomen - uitkering) >= doel) return uitkering;
  let lo = 0;
  let hi = uitkering;
  for (let i = 0; i < 50; i++) {
    const m = (lo + hi) / 2;
    if (netto(inkomen - m) > doel) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** Wie krijgt de combinatiekorting? De minstverdienende werkende ouder, en alleen als alle ouders werken. */
function combinatiekortingVoor(h: Huishouden): number {
  if (!h.kinderen.some((l) => l < 12)) return -1;
  if (!h.partners) return h.leden[0]?.soort === "werk" ? 0 : -1;
  const werkend = h.leden.filter((l) => l.soort === "werk" && l.inkomen > 0);
  if (werkend.length < 2) return -1;
  let idx = -1;
  let laagste = Infinity;
  h.leden.forEach((l, i) => {
    if (l.soort === "werk" && l.inkomen > 0 && l.inkomen < laagste) {
      laagste = l.inkomen;
      idx = i;
    }
  });
  return idx;
}

function isGekoppeld(l: Lid, p: Parameters): boolean {
  const k = p.uitkeringen.nettoKoppeling;
  if (l.soort === "aow" || l.aowLeeftijd) return k.aow;
  if (l.soort === "uitkering") return k[l.uitkeringSoort ?? "bijstand"];
  return false;
}

/**
 * Rekent één huishouden door onder parameters `p`.
 *
 * Geef `basis` mee om een scenario door te rekenen ten opzichte van het huidige beleid: dan gelden de
 * netto-koppeling van uitkeringen en het gedragseffect. Zonder `basis` (of als basis === p) is het de
 * berekening van het huidige beleid zelf.
 *
 * Het saldo eigen woning telt mee in het belastbaar inkomen van de hoogste verdiener, en daarmee ook in de
 * heffingskortingen en het toetsingsinkomen voor de toeslagen.
 *
 * Box 3 en box 1 hangen samen (D-088): het inkomen uit box 3 telt mee in het verzamelinkomen, waarop de algemene
 * heffingskorting en de ouderenkorting afbouwen, en het belastingdeel van kortingen die niet van de box 1-heffing af
 * konden, gaat van de belasting in box 3 af. Partners verdelen het box 3-inkomen zo dat ze samen het minst betalen.
 */
export function berekenHuishouden(h: Huishouden, p: Parameters, basis?: Parameters): Resultaat {
  const scenario = basis !== undefined && basis !== p;
  const combiIdx = combinatiekortingVoor(h);
  let uitkeringKosten = 0;
  const basisPerPersoon = 12 * p.basisinkomen.perVolwassenePerMaand;

  // 1. Bruto inkomen per persoon, na netto-koppeling en gedragseffect.
  const personen = h.leden.map((l, i) => {
    const k: PersoonKenmerken = {
      werkt: l.soort === "werk",
      aow: l.soort === "aow" || !!l.aowLeeftijd,
      alleenstaand: !h.partners,
      combinatiekorting: i === combiIdx,
    };
    let x = l.inkomen;
    let uitkering = l.uitkering;
    if (scenario && uitkering > 0 && isGekoppeld(l, p)) {
      const extra = gekoppeldBruto(uitkering, k, basis, p) - uitkering;
      uitkeringKosten += extra;
      x += extra;
      uitkering += extra;
    }
    // Het basisinkomen komt in plaats van (een deel van) de bijstand en de AOW: die gaan netto zoveel omlaag.
    const vervangbaar =
      l.soort === "aow" ||
      !!l.aowLeeftijd ||
      (l.soort === "uitkering" && (l.uitkeringSoort ?? "bijstand") === "bijstand");
    let vervangen = 0;
    if (basisPerPersoon > 0 && uitkering > 0 && vervangbaar) {
      vervangen = brutoVervangen(x, uitkering, basisPerPersoon, k, p);
      uitkeringKosten -= vervangen;
      x -= vervangen;
    }
    if (scenario && p.gedrag.eti && k.werkt && x > 0) {
      const mBasis = schijfTarief(x, basis) / 100;
      const mScenario = schijfTarief(x, p) / 100;
      // Alleen het inkomen uit werk reageert; de AOW van een werkende AOW'er niet.
      const vast = Math.min(Math.max(0, uitkering - vervangen), x);
      x = vast + (x - vast) * Math.pow((1 - mScenario) / (1 - mBasis), p.gedrag.eti);
    }
    // Vervangt het basisinkomen een deel van de uitkering, dan rekenen de toeslagen met het oorspronkelijke inkomen.
    const toeslagCorrectie = vervangen > 0 ? l.inkomen - x : 0;
    return { k, x, toeslagCorrectie, uitkering: Math.max(0, uitkering - vervangen) };
  });

  // 2. Eigen woning bij de hoogste verdiener.
  let hoofd = 0;
  personen.forEach((ps, i) => {
    if (ps.x > personen[hoofd]!.x) hoofd = i;
  });
  const ew = h.woz ? eigenWoningSaldo(h.hypotheekrente, h.woz, p) : null;

  // 3. Belastbaar inkomen per persoon, met en zonder eigen woning. Een werknemer betaalt belasting over het loon min
  //    de pensioenpremie, een ondernemer over de belastbare winst. De arbeidskorting gaat over het fiscale loon of
  //    over de winst vóór ondernemersaftrek en mkb-winstvrijstelling (Wet IB 2001, art. 8.11 lid 2). Een werkende
  //    AOW'er heeft de AOW er nog bij. De tariefsaanpassing (art. 2.10 lid 2 en 3) beperkt de ondernemersaftrek,
  //    de mkb-winstvrijstelling en de hypotheekrente tot het maximale aftrektarief.
  let bruto = 0;
  let toetsingsinkomen = 0;
  let zvw = 0;
  let pensioenpremie = 0;
  const box1 = personen.map(({ k, x, toeslagCorrectie, uitkering }, i) => {
    const l = h.leden[i]!;
    const aowNaastWerk = l.soort === "werk" && l.aowLeeftijd ? Math.min(uitkering, x) : 0;
    const werk = x - aowNaastWerk;
    const premie =
      l.pensioenpremie === "standaard" ? standaardPensioenpremie(werk, p) : (l.pensioenpremie ?? 0);
    const winst = l.ondernemer ? belastbareWinst(werk, l.ondernemer, p) : null;
    const inkomen = (winst ? winst.belastbaar : werk - premie) + aowNaastWerk;
    const arbeid = k.werkt ? (winst ? werk : werk - premie) : 0;
    const posten: BeperkteAftrek[] = winst
      ? [
          {
            bedrag: winst.ondernemersaftrek + winst.mkbVrijstelling,
            maxTarief: p.ondernemers.aftrekMaxTarief,
          },
        ]
      : [];
    const woning = i === hoofd && ew !== null;
    const belastbaar = woning ? inkomen + ew.saldo : inkomen;
    const postenMetWoning = woning
      ? [...posten, { bedrag: ew.aftrekbareRente, maxTarief: p.eigenWoning.aftrekMaxTarief }]
      : posten;
    bruto += x;
    pensioenpremie += premie;
    toetsingsinkomen += Math.max(0, belastbaar + toeslagCorrectie);
    // AOW'ers en ondernemers betalen de bijdrage Zvw zelf; voor loon en uitkeringen doet de werkgever of de
    // uitkeringsinstantie dat. Een werkende AOW'er in loondienst betaalt hem alleen over de AOW.
    const eigenZvw = l.ondernemer || l.soort === "aow" ? inkomen : aowNaastWerk;
    zvw += zvwBijdrage(eigenZvw, true, p);
    return {
      k,
      arbeid,
      inkomen,
      belastbaar,
      extraZonder: tariefsaanpassing(inkomen, posten, p, k.aow),
      extraMet: woning ? tariefsaanpassing(belastbaar, postenMetWoning, p, k.aow) : 0,
      woning,
    };
  });

  // Box 3: het voordeel uit sparen en beleggen telt mee in het toetsingsinkomen (het verzamelinkomen).
  const b3 = box3(h.box3 ?? { bank: h.vermogen, overig: 0, schulden: 0 }, h.partners, p);
  toetsingsinkomen += b3.voordeel;

  // Box 1 en box 3 samen, bij een verdeling van het box 3-voordeel over de personen.
  const reken = (aandelen: readonly number[]) => {
    let belasting = 0;
    let zonderWoning = 0;
    let box3Belasting = 0;
    const ruimte: number[] = [];
    box1.forEach((b, i) => {
      const v = aandelen[i] ?? 0;
      const zonder = box1Uitkomst(b.inkomen, b.arbeid, p, b.k, b.extraZonder, v);
      const met = b.woning ? box1Uitkomst(b.belastbaar, b.arbeid, p, b.k, b.extraMet, v) : zonder;
      belasting += met.belasting;
      zonderWoning += zonder.belasting;
      const korting = belastingdeelKortingen(p, b.k.aow) * met.onbenut;
      box3Belasting += Math.max(0, (v * p.box3.tarief) / 100 - korting);
      ruimte.push(p.box3.tarief > 0 ? (korting * 100) / p.box3.tarief : 0);
    });
    return { belasting, zonderWoning, box3Belasting, totaal: belasting + box3Belasting, ruimte };
  };
  const uitkomst = verdeelBox3(b3.voordeel, box1.length, reken);
  // Alles wat het vermogen aan belasting kost, staat bij box 3: de box 3-belasting na de onbenutte kortingen, plus de
  // lagere algemene heffingskorting en ouderenkorting door het box 3-inkomen. Zo blijft de box 1-belasting (en het
  // bedrag bovenaan, D-076) los van het vermogen.
  const zonderVermogen = b3.voordeel > 0 ? reken(box1.map(() => 0)) : uitkomst;
  const box3Belasting = Math.max(0, uitkomst.totaal - zonderVermogen.belasting);
  // De belasting van meerderjarige kinderen komt er hieronder nog bij.
  let belasting = zonderVermogen.belasting;

  // 4. Meerderjarige kinderen: eigen inkomen, belasting, zorgtoeslag en premie. Hun inkomen telt mee in het
  //    rekeninkomen voor de huurtoeslag (onder 23 jaar alleen boven de vrijstelling), niet in de andere toeslagen.
  const volwassenVanaf = p.zorg.volwassenVanaf;
  const kindK: PersoonKenmerken = { werkt: true, aow: false, alleenstaand: true, combinatiekorting: false };
  let ztKinderen = 0;
  let ztKinderenOntvangers = 0;
  let meerderjarig = 0;
  let rekeninkomen = toetsingsinkomen;
  h.kinderen.forEach((leeftijd, i) => {
    const y = h.kindInkomens?.[i] ?? 0;
    if (leeftijd < volwassenVanaf) return;
    meerderjarig++;
    bruto += y;
    belasting += belastingBox1(y, y, p, { ...kindK, werkt: y > 0 });
    const z = zorgtoeslag(y, false, 0, p);
    ztKinderen += z;
    if (z > 0) ztKinderenOntvangers++;
    rekeninkomen += leeftijd < 23 ? Math.max(0, y - p.toeslagen.huurtoeslag.inkomensvrijstellingKind) : y;
  });

  // 5. Toeslagen, kinderbijslag en zorgpremie.
  const volwassenen = h.partners ? 2 : 1;
  const aantalPersonen = volwassenen + h.kinderen.length;
  const ztOuders = zorgtoeslag(toetsingsinkomen, h.partners, h.vermogen, p);
  const zt = ztOuders + ztKinderen;
  // Huurtoeslag alleen voor een zelfstandige woning; is iedereen jonger dan 21 en zijn er geen kinderen, dan telt de
  // huur tot een lagere grens.
  const zelfstandig = h.zelfstandigeWoning !== false;
  const jongeren =
    h.kinderen.length === 0 &&
    h.leden.length > 0 &&
    h.leden.every(
      (l) => l.leeftijd !== undefined && l.leeftijd < p.toeslagen.huurtoeslag.jongeren.totLeeftijd,
    );
  const ht = huurtoeslag(rekeninkomen, h.huurPerMaand, aantalPersonen, h.partners, h.vermogen, p, {
    zelfstandig,
    jongeren,
  });
  const kg = kindgebondenBudget(toetsingsinkomen, h.kinderen, h.partners, h.vermogen, p);
  // Kinderopvangtoeslag alleen als alle ouders werken (Wet kinderopvang, artikel 1.6). Studie of een traject naar
  // werk telt ook, maar zit niet in het model.
  const iedereenWerkt = h.leden.length > 0 && h.leden.every((l) => l.soort === "werk");
  const ko = iedereenWerkt ? kinderopvangtoeslag(toetsingsinkomen, h.kinderopvang, p) : 0;
  const beperkingen: Resultaat["beperkingen"] = {};
  if (h.kinderopvang.length > 0 && !iedereenWerkt) beperkingen.kinderopvangtoeslag = "werk";
  if (h.huurPerMaand > 0 && !zelfstandig) beperkingen.huurtoeslag = "kamer";
  else if (h.huurPerMaand > p.toeslagen.huurtoeslag.jongeren.huurgrens && jongeren)
    beperkingen.huurtoeslag = "jongeren";
  const kb = berekenKinderbijslag(h.kinderen, p);
  const zorgpremie = (volwassenen + meerderjarig) * p.zorg.nominalePremiePerVolwassene;
  const basisinkomen = (h.leden.length + meerderjarig) * basisPerPersoon;
  const toeslagen = zt + ht + kg + ko;

  return {
    bruto,
    belasting,
    eigenWoning: zonderVermogen.zonderWoning - zonderVermogen.belasting,
    box3: box3Belasting,
    zvw,
    pensioenpremie,
    zorgtoeslag: zt,
    zorgtoeslagOntvangers: (ztOuders > 0 ? 1 : 0) + ztKinderenOntvangers,
    huurtoeslag: ht,
    kgb: kg,
    kot: ko,
    kinderbijslag: kb,
    zorgpremie,
    uitkeringKosten,
    basisinkomen,
    uitkering: personen.reduce((a, ps) => a + ps.uitkering, 0),
    toetsingsinkomen,
    toeslagen,
    besteedbaar:
      bruto - pensioenpremie - belasting - box3Belasting - zvw + toeslagen + kb - zorgpremie + basisinkomen,
    volwassenen,
    kinderen: h.kinderen.length,
    equivalentie: equivalentiefactor(volwassenen, h.kinderen, p),
    beperkingen,
  };
}

/**
 * Verdeelt het box 3-voordeel over de personen zo dat de belasting samen (box 1 en box 3) het laagst is. Fiscale
 * partners mogen het vrij verdelen (Wet IB 2001, artikel 2.17). De verdeling telt mee voor de afbouw van de kortingen
 * en voor welk deel van de onbenutte kortingen van box 3 af kan. We proberen stappen van 5% en de verdelingen waarbij
 * iemand precies zijn onbenutte korting opmaakt, en nemen de goedkoopste.
 */
function verdeelBox3<T extends { totaal: number; ruimte: number[] }>(
  voordeel: number,
  personen: number,
  reken: (aandelen: readonly number[]) => T,
): T {
  if (personen < 2 || voordeel <= 0) return reken([voordeel]);
  const kandidaten = new Set<number>();
  for (let i = 0; i <= 20; i++) kandidaten.add((voordeel * i) / 20);
  // Zonder box 3-inkomen: hoeveel box 3-inkomen kan ieder met de onbenutte korting belastingvrij maken? Daar ligt
  // vaak het voordeligste punt.
  const [r0 = 0, r1 = 0] = reken([0, 0]).ruimte;
  kandidaten.add(Math.min(voordeel, r0));
  kandidaten.add(Math.max(0, voordeel - r1));
  let beste: T | null = null;
  for (const v of kandidaten) {
    const u = reken([v, voordeel - v]);
    if (!beste || u.totaal < beste.totaal - 1e-9) beste = u;
  }
  return beste!;
}

/**
 * Wat een huishouden per jaar overhoudt van het inkomen, zoals de calculator het bovenaan toont: wat er op de
 * rekening komt (netto inkomen, toeslagen en kinderbijslag). Twee dingen gaan er niet af, anders dan bij
 * `besteedbaar`:
 * - de box 3-belasting (D-076): het rendement op sparen en beleggen telt niet als inkomen, dus de belasting
 *   daarover ook niet;
 * - de nominale premie van de zorgverzekering (D-079): geen belasting, maar een vaste uitgave zoals de huur.
 * De verschillen tussen scenario's, de bevolkingscijfers en "je plek in Nederland" rekenen met `besteedbaar`.
 */
export function overVanInkomen(r: Resultaat): number {
  return r.besteedbaar + r.box3 + r.zorgpremie;
}

/**
 * Equivalentiefactor van een huishouden: de eerste volwassene telt 1, iedere volgende persoon vanaf
 * `kindVanafLeeftijd` telt als extra volwassene, jongere kinderen als kind (parameters in methodiek.equivalentie).
 */
export function equivalentiefactor(
  volwassenen: number,
  kinderLeeftijden: readonly number[],
  p: Parameters,
): number {
  const eq = p.methodiek.equivalentie;
  const ouder = kinderLeeftijden.filter((l) => l >= eq.kindVanafLeeftijd).length;
  return 1 + eq.extraVolwassene * (volwassenen - 1 + ouder) + eq.kind * (kinderLeeftijden.length - ouder);
}

/** Eenvoudige invoer, zoals in de voorbeeldhuishoudens en (straks) het invoerformulier. */
export interface EenvoudigeInvoer {
  inkomen1: number;
  soort1: InkomensSoort;
  /** Soort inkomen van de partner; null = geen partner. */
  soort2: InkomensSoort | null;
  inkomen2: number;
  kinderLeeftijden: number[];
  huurPerMaand: number;
  hypotheekrente: number;
  woz: number;
  /** Kosten kinderopvang per jaar, totaal. Gerekend als dagopvang tegen de maximale uurprijs. */
  kinderopvangKosten: number;
  vermogen?: number;
  /** Soort uitkering; bij bijstand (standaard) volgt het bedrag uit de bijstandsnorm en telt `inkomen` niet. */
  uitkeringSoort?: UitkeringSoort;
}

/**
 * Zet eenvoudige invoer om in een huishouden. Het AOW-deel van een inkomen en de bijstand volgen uit de
 * parameters. Werkenden zijn werknemers met de standaard pensioenpremie.
 */
export function maakHuishouden(e: EenvoudigeInvoer, p: Parameters): Huishouden {
  const partners = e.soort2 !== null;
  const aow = aowPerJaar(p, partners);
  const uitkeringSoort = e.uitkeringSoort ?? "bijstand";
  const soorten = partners ? [e.soort1, e.soort2!] : [e.soort1];
  const inkomens = [e.inkomen1, e.inkomen2];
  const bijstand =
    uitkeringSoort === "bijstand" ? soorten.map((s) => s === "uitkering") : soorten.map(() => false);
  const leden = soorten.map((soort, i): Lid => {
    const inkomen = soort === "geen" ? 0 : inkomens[i]!;
    if (soort === "werk") return { inkomen, soort, uitkering: 0, pensioenpremie: "standaard" };
    if (soort === "aow") return { inkomen, soort, uitkering: Math.min(inkomen, aow) };
    if (soort !== "uitkering") return { inkomen, soort, uitkering: 0 };
    return { inkomen, soort, uitkering: inkomen, uitkeringSoort };
  });
  vulBijstandIn(leden, bijstand, partners, p);
  const huur = e.huurPerMaand > 0;
  const uurprijs = p.toeslagen.kinderopvangtoeslag.maxUurprijs.dagopvang;
  const kinderopvang: Kinderopvang[] =
    e.kinderLeeftijden.length > 0 && e.kinderopvangKosten > 0
      ? [{ soort: "dagopvang", urenPerMaand: e.kinderopvangKosten / 12 / uurprijs, uurprijs }]
      : [];
  return {
    leden,
    partners,
    kinderen: [...e.kinderLeeftijden],
    huurPerMaand: e.huurPerMaand,
    hypotheekrente: huur ? 0 : e.hypotheekrente,
    woz: huur ? 0 : e.woz,
    kinderopvang,
    vermogen: e.vermogen ?? 0,
  };
}

/**
 * Zet het bijstandsbedrag van de leden met `bijstand[i]` volgens de norm (zie `bijstandBruto`). Werkt de
 * partner, dan gaat diens netto inkomen van de gezinsnorm af.
 */
export function vulBijstandIn(leden: Lid[], bijstand: boolean[], partners: boolean, p: Parameters): void {
  const k = (l: Lid): PersoonKenmerken => ({
    werkt: l.soort === "werk",
    aow: l.soort === "aow",
    alleenstaand: !partners,
    combinatiekorting: false,
  });
  leden.forEach((l, i) => {
    if (!bijstand[i]) return;
    const j = 1 - i;
    const partner = partners ? leden[j] : undefined;
    const ookBijstand = !!partner && !!bijstand[j];
    let nettoPartner = 0;
    if (partner && !ookBijstand) {
      const r = berekenHuishouden({ ...LEEG, leden: [partner], partners: false }, p);
      nettoPartner = r.bruto - r.pensioenpremie - r.belasting - r.zvw;
    }
    const bruto = bijstandBruto(p, k(l), ookBijstand, nettoPartner);
    Object.assign(l, { inkomen: bruto, uitkering: bruto, soort: "uitkering", uitkeringSoort: "bijstand" });
  });
}

const LEEG: Huishouden = {
  leden: [],
  partners: false,
  kinderen: [],
  huurPerMaand: 0,
  hypotheekrente: 0,
  woz: 0,
  kinderopvang: [],
  vermogen: 0,
};
