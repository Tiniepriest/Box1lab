import type { Parameters } from "./parameters/schema.ts";
import { belastingBox1, schijfTarief } from "./regels/box1.ts";
import { aftrekbeperking, eigenWoningSaldo } from "./regels/eigenwoning.ts";
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
  hypotheekrente: number;
  woz: number;
  /** Kinderopvang per kind. */
  kinderopvang: Kinderopvang[];
  /** Vermogen (spaargeld en beleggingen) op 1 januari, voor de vermogenstoets van toeslagen. */
  vermogen: number;
}

export interface Resultaat {
  bruto: number;
  /** Box 1-belasting inclusief het effect van de eigen woning. */
  belasting: number;
  /** Fiscaal voordeel van de eigen woning (positief = minder belasting); zit al in `belasting`. */
  eigenWoning: number;
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
  /** Extra bruto uitkering die de overheid betaalt door de netto-koppeling. */
  uitkeringKosten: number;
  /** Gezamenlijk toetsingsinkomen voor de toeslagen. */
  toetsingsinkomen: number;
  toeslagen: number;
  besteedbaar: number;
  volwassenen: number;
  kinderen: number;
  /** Equivalentiefactor om inkomens van verschillende huishoudens te vergelijken. */
  equivalentie: number;
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
  if (l.soort === "aow") return k.aow;
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
 */
export function berekenHuishouden(h: Huishouden, p: Parameters, basis?: Parameters): Resultaat {
  const scenario = basis !== undefined && basis !== p;
  const combiIdx = combinatiekortingVoor(h);
  let uitkeringKosten = 0;

  // 1. Bruto inkomen per persoon, na netto-koppeling en gedragseffect.
  const personen = h.leden.map((l, i) => {
    const k: PersoonKenmerken = {
      werkt: l.soort === "werk",
      aow: l.soort === "aow",
      alleenstaand: !h.partners,
      combinatiekorting: i === combiIdx,
    };
    let x = l.inkomen;
    if (scenario && l.uitkering > 0 && isGekoppeld(l, p)) {
      const extra = gekoppeldBruto(l.uitkering, k, basis, p) - l.uitkering;
      uitkeringKosten += extra;
      x += extra;
    }
    if (scenario && p.gedrag.eti && k.werkt && x > 0) {
      const mBasis = schijfTarief(x, basis) / 100;
      const mScenario = schijfTarief(x, p) / 100;
      x *= Math.pow((1 - mScenario) / (1 - mBasis), p.gedrag.eti);
    }
    return { k, x };
  });

  // 2. Eigen woning bij de hoogste verdiener.
  let hoofd = 0;
  personen.forEach((ps, i) => {
    if (ps.x > personen[hoofd]!.x) hoofd = i;
  });
  const ew = h.woz ? eigenWoningSaldo(h.hypotheekrente, h.woz, p).saldo : 0;

  // 3. Belasting per persoon, met en zonder eigen woning. Een werknemer betaalt belasting over het loon min de
  //    pensioenpremie, een ondernemer over de belastbare winst. De arbeidskorting gaat over het fiscale loon of
  //    over de winst vóór ondernemersaftrek en mkb-winstvrijstelling (Wet IB 2001, art. 8.11 lid 2).
  let bruto = 0;
  let belasting = 0;
  let belastingZonderWoning = 0;
  let toetsingsinkomen = 0;
  let zvw = 0;
  let pensioenpremie = 0;
  personen.forEach(({ k, x }, i) => {
    const l = h.leden[i]!;
    const premie = l.pensioenpremie === "standaard" ? standaardPensioenpremie(x, p) : (l.pensioenpremie ?? 0);
    const inkomen = l.ondernemer ? belastbareWinst(x, l.ondernemer, p).belastbaar : x - premie;
    const arbeid = k.werkt ? (l.ondernemer ? x : inkomen) : 0;
    const zonder = belastingBox1(inkomen, arbeid, p, k);
    let met = zonder;
    let belastbaar = inkomen;
    if (i === hoofd && ew !== 0) {
      belastbaar = inkomen + ew;
      met = belastingBox1(belastbaar, arbeid, p, k, aftrekbeperking(inkomen, ew, p, k.aow));
    }
    bruto += x;
    pensioenpremie += premie;
    belasting += met;
    belastingZonderWoning += zonder;
    toetsingsinkomen += Math.max(0, belastbaar);
    zvw += zvwBijdrage(inkomen, k.aow || !!l.ondernemer, p);
  });

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
  const ht = huurtoeslag(rekeninkomen, h.huurPerMaand, aantalPersonen, h.partners, h.vermogen, p);
  const kg = kindgebondenBudget(toetsingsinkomen, h.kinderen, h.partners, h.vermogen, p);
  const ko = kinderopvangtoeslag(toetsingsinkomen, h.kinderopvang, p);
  const kb = berekenKinderbijslag(h.kinderen, p);
  const zorgpremie = (volwassenen + meerderjarig) * p.zorg.nominalePremiePerVolwassene;
  const toeslagen = zt + ht + kg + ko;

  return {
    bruto,
    belasting,
    eigenWoning: belastingZonderWoning - belasting,
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
    toetsingsinkomen,
    toeslagen,
    besteedbaar: bruto - pensioenpremie - belasting - zvw + toeslagen + kb - zorgpremie,
    volwassenen,
    kinderen: h.kinderen.length,
    equivalentie: equivalentiefactor(volwassenen, h.kinderen, p),
  };
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
