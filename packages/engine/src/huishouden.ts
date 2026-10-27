import type { Parameters } from "./parameters/schema.ts";
import { belastingBox1, schijfTarief } from "./regels/box1.ts";
import { eigenWoningVoordeel } from "./regels/eigenwoning.ts";
import type { PersoonKenmerken } from "./regels/heffingskortingen.ts";
import { huurtoeslag } from "./regels/toeslagen/huurtoeslag.ts";
import { kindgebondenBudget } from "./regels/toeslagen/kgb.ts";
import { kinderopvangtoeslag } from "./regels/toeslagen/kot.ts";
import { zorgtoeslag } from "./regels/toeslagen/zorgtoeslag.ts";
import { gekoppeldBruto } from "./regels/uitkeringen.ts";

export type InkomensSoort = "werk" | "uitkering" | "aow" | "geen";

export interface Lid {
  /** Bruto jaarinkomen (inclusief een eventuele uitkering of AOW). */
  inkomen: number;
  soort: InkomensSoort;
  /** Deel van het inkomen dat een uitkering of AOW is (voor de netto-koppeling). */
  uitkering: number;
}

export interface Huishouden {
  leden: Lid[];
  partners: boolean;
  kinderen: number;
  /** Er is minstens één kind jonger dan 12 (voor de combinatiekorting). */
  kindOnder12: boolean;
  /** Kale huur per maand; 0 bij een koopwoning. */
  huurPerMaand: number;
  hypotheekrente: number;
  woz: number;
  /** Kosten kinderopvang per jaar. */
  kinderopvangKosten: number;
}

export interface Resultaat {
  bruto: number;
  belasting: number;
  eigenWoning: number;
  zorgtoeslag: number;
  huurtoeslag: number;
  kgb: number;
  kot: number;
  kinderbijslag: number;
  zorgpremie: number;
  /** Extra bruto uitkering die de overheid betaalt door de netto-koppeling. */
  uitkeringKosten: number;
  toeslagen: number;
  besteedbaar: number;
  volwassenen: number;
  kinderen: number;
  /** Equivalentiefactor om inkomens van verschillende huishoudens te vergelijken. */
  equivalentie: number;
}

/** Wie krijgt de combinatiekorting? De minstverdienende werkende ouder, en alleen als alle ouders werken. */
function combinatiekortingVoor(h: Huishouden): number {
  if (!h.kindOnder12) return -1;
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

/**
 * Rekent één huishouden door onder parameters `p`.
 *
 * Geef `basis` mee om een scenario door te rekenen ten opzichte van het huidige beleid: dan gelden de
 * netto-koppeling van uitkeringen en het gedragseffect. Zonder `basis` (of als basis === p) is het de
 * berekening van het huidige beleid zelf.
 */
export function berekenHuishouden(h: Huishouden, p: Parameters, basis?: Parameters): Resultaat {
  const scenario = basis !== undefined && basis !== p;
  const combiIdx = combinatiekortingVoor(h);
  let bruto = 0;
  let belasting = 0;
  let uitkeringKosten = 0;
  let hoofdInkomen = -Infinity;

  h.leden.forEach((l, i) => {
    const k: PersoonKenmerken = {
      werkt: l.soort === "werk",
      aow: l.soort === "aow",
      combinatiekorting: i === combiIdx,
    };
    let x = l.inkomen;
    if (scenario && p.uitkeringen.nettoKoppeling && l.uitkering > 0) {
      const extra = gekoppeldBruto(l.uitkering, k, basis, p) - l.uitkering;
      uitkeringKosten += extra;
      x += extra;
    }
    if (scenario && p.gedrag.eti && k.werkt && x > 0) {
      const mBasis = schijfTarief(x, basis) / 100;
      const mScenario = schijfTarief(x, p) / 100;
      x *= Math.pow((1 - mScenario) / (1 - mBasis), p.gedrag.eti);
    }
    bruto += x;
    belasting += belastingBox1(x, p, k);
    if (x > hoofdInkomen) hoofdInkomen = x;
  });

  const eigenWoning = h.woz ? eigenWoningVoordeel(h.hypotheekrente, h.woz, hoofdInkomen, p) : 0;
  const zt = zorgtoeslag(bruto, h.partners, p);
  const ht = huurtoeslag(bruto, h.huurPerMaand, h.partners, p);
  const kg = kindgebondenBudget(bruto, h.kinderen, h.partners, p);
  const ko = kinderopvangtoeslag(bruto, h.kinderopvangKosten, p);
  const volwassenen = h.partners ? 2 : 1;
  const kinderbijslag = h.kinderen * p.kinderbijslag.perKind;
  const zorgpremie = volwassenen * p.zorg.nominalePremiePerVolwassene;
  const toeslagen = zt + ht + kg + ko;
  const eq = p.methodiek.equivalentie;

  return {
    bruto,
    belasting,
    eigenWoning,
    zorgtoeslag: zt,
    huurtoeslag: ht,
    kgb: kg,
    kot: ko,
    kinderbijslag,
    zorgpremie,
    uitkeringKosten,
    toeslagen,
    besteedbaar: bruto - belasting + eigenWoning + toeslagen + kinderbijslag - zorgpremie,
    volwassenen,
    kinderen: h.kinderen,
    equivalentie: 1 + eq.extraVolwassene * (volwassenen - 1) + eq.kind * h.kinderen,
  };
}

/** Eenvoudige invoer zoals in de voorbeeldhuishoudens van het prototype. */
export interface EenvoudigeInvoer {
  inkomen1: number;
  soort1: InkomensSoort;
  /** Soort inkomen van de partner; null = geen partner. */
  soort2: InkomensSoort | null;
  inkomen2: number;
  kinderen: number;
  kindOnder12: boolean;
  huurPerMaand: number;
  hypotheekrente: number;
  woz: number;
  kinderopvangKosten: number;
}

/** Zet eenvoudige invoer om in een huishouden. Het AOW-deel van een inkomen volgt uit de parameters. */
export function maakHuishouden(e: EenvoudigeInvoer, p: Parameters): Huishouden {
  const partners = e.soort2 !== null;
  const lid = (inkomen: number, soort: InkomensSoort, partnerHeeftAow: boolean): Lid => ({
    inkomen: soort === "geen" ? 0 : inkomen,
    soort,
    uitkering:
      soort === "uitkering"
        ? inkomen
        : soort === "aow"
          ? Math.min(inkomen, partnerHeeftAow ? p.uitkeringen.aow.partners : p.uitkeringen.aow.alleenstaand)
          : 0,
  });
  const leden = [lid(e.inkomen1, e.soort1, partners && e.soort2 === "aow")];
  if (e.soort2 !== null) leden.push(lid(e.inkomen2, e.soort2, e.soort1 === "aow"));
  const huur = e.huurPerMaand > 0;
  return {
    leden,
    partners,
    kinderen: e.kinderen,
    kindOnder12: e.kinderen > 0 && e.kindOnder12,
    huurPerMaand: e.huurPerMaand,
    hypotheekrente: huur ? 0 : e.hypotheekrente,
    woz: huur ? 0 : e.woz,
    kinderopvangKosten: e.kinderen > 0 ? e.kinderopvangKosten : 0,
  };
}
