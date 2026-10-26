import type { Parameters } from "./parameters/schema.ts";
import { belastingBox1, schijfTarief } from "./regels/box1.ts";
import { aftrekbeperking, eigenWoningSaldo } from "./regels/eigenwoning.ts";
import type { PersoonKenmerken } from "./regels/heffingskortingen.ts";
import { kinderbijslag as berekenKinderbijslag } from "./regels/kinderbijslag.ts";
import { huurtoeslag } from "./regels/toeslagen/huurtoeslag.ts";
import { kindgebondenBudget } from "./regels/toeslagen/kgb.ts";
import { kinderopvangtoeslag, type Kinderopvang } from "./regels/toeslagen/kot.ts";
import { zorgtoeslag } from "./regels/toeslagen/zorgtoeslag.ts";
import { aowPerJaar, gekoppeldBruto } from "./regels/uitkeringen.ts";
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

  // 3. Belasting per persoon, met en zonder eigen woning.
  let bruto = 0;
  let belasting = 0;
  let belastingZonderWoning = 0;
  let toetsingsinkomen = 0;
  let zvw = 0;
  personen.forEach(({ k, x }, i) => {
    const arbeid = k.werkt ? x : 0;
    const zonder = belastingBox1(x, arbeid, p, k);
    let met = zonder;
    let belastbaar = x;
    if (i === hoofd && ew !== 0) {
      belastbaar = x + ew;
      met = belastingBox1(belastbaar, arbeid, p, k, aftrekbeperking(x, ew, p, k.aow));
    }
    bruto += x;
    belasting += met;
    belastingZonderWoning += zonder;
    toetsingsinkomen += Math.max(0, belastbaar);
    zvw += zvwBijdrage(x, k.aow, p);
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
  const eq = p.methodiek.equivalentie;
  const ouderKinderen = h.kinderen.filter((l) => l >= eq.kindVanafLeeftijd).length;

  return {
    bruto,
    belasting,
    eigenWoning: belastingZonderWoning - belasting,
    zvw,
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
    besteedbaar: bruto - belasting - zvw + toeslagen + kb - zorgpremie,
    volwassenen,
    kinderen: h.kinderen.length,
    equivalentie:
      1 +
      eq.extraVolwassene * (volwassenen - 1 + ouderKinderen) +
      eq.kind * (h.kinderen.length - ouderKinderen),
  };
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
  uitkeringSoort?: UitkeringSoort;
}

/** Zet eenvoudige invoer om in een huishouden. Het AOW-deel van een inkomen volgt uit de parameters. */
export function maakHuishouden(e: EenvoudigeInvoer, p: Parameters): Huishouden {
  const partners = e.soort2 !== null;
  const aow = aowPerJaar(p, partners);
  const lid = (inkomen: number, soort: InkomensSoort): Lid => ({
    inkomen: soort === "geen" ? 0 : inkomen,
    soort,
    uitkering: soort === "uitkering" ? inkomen : soort === "aow" ? Math.min(inkomen, aow) : 0,
    ...(soort === "uitkering" ? { uitkeringSoort: e.uitkeringSoort ?? "bijstand" } : {}),
  });
  const leden = [lid(e.inkomen1, e.soort1)];
  if (e.soort2 !== null) leden.push(lid(e.inkomen2, e.soort2));
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
