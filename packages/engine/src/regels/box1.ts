import type { Parameters } from "../parameters/schema.ts";
import { heffingskortingen, type PersoonKenmerken } from "./heffingskortingen.ts";

/** Een stuk inkomen met één tarief: [onder, boven) tegen `tarief` procent. */
export interface TariefStuk {
  onder: number;
  boven: number;
  tarief: number;
}

/**
 * De schijven zoals ze voor deze persoon gelden: met de vrijstelling eruit en, voor AOW'ers, het lagere
 * tarief in de eerste schijf.
 */
export function tariefStukken(p: Parameters, aow: boolean): TariefStuk[] {
  const { vrijstelling, schijven, aowVerlagingEersteSchijf } = p.box1;
  const stukken: TariefStuk[] = [];
  let vorige = 0;
  schijven.forEach((s, i) => {
    const top = s.tot ?? Infinity;
    const onder = Math.max(vorige, vrijstelling);
    if (top > onder) {
      stukken.push({ onder, boven: top, tarief: s.tarief - (i === 0 && aow ? aowVerlagingEersteSchijf : 0) });
    }
    vorige = top;
  });
  return stukken;
}

/** Inkomstenbelasting + premies volksverzekeringen over het belastbaar inkomen, vóór heffingskortingen. */
export function heffingVoorKortingen(inkomen: number, p: Parameters, aow: boolean): number {
  if (p.box1.negatieveBelasting && inkomen < p.box1.vrijstelling) {
    // Onder de vrijstelling: negatief, tegen het tarief van het eerste stuk boven de vrijstelling.
    const eerste = tariefStukken(p, aow)[0];
    return eerste ? (-(p.box1.vrijstelling - Math.max(0, inkomen)) * eerste.tarief) / 100 : 0;
  }
  if (inkomen <= 0) return 0;
  let heffing = 0;
  for (const s of tariefStukken(p, aow)) {
    const deel = Math.min(inkomen, s.boven) - s.onder;
    if (deel > 0) heffing += (deel * s.tarief) / 100;
  }
  return heffing;
}

export interface Box1Uitkomst {
  /** Heffing over het belastbaar inkomen, plus de extra heffing (tariefsaanpassing), vóór kortingen. */
  heffing: number;
  /** Alle heffingskortingen samen. */
  kortingen: number;
  /** Te betalen: heffing min kortingen. */
  belasting: number;
  /**
   * Kortingen die niet van de box 1-heffing af konden. Het belastingdeel daarvan gaat nog van de belasting in box 3
   * af (zie `belastingdeelKortingen`). Met negatieve belasting 0: dan is alles al uitbetaald.
   */
  onbenut: number;
}

/**
 * Box 1 van één persoon: heffing (plus eventuele extra heffing, zoals de tariefsaanpassing) min kortingen. Nooit
 * negatief, behalve met `negatieveBelasting`: dan krijgt iemand het verschil uitbetaald.
 *
 * De algemene heffingskorting en de ouderenkorting hangen af van het verzamelinkomen: het inkomen uit box 1 plus het
 * inkomen uit box 3 (`overigInkomen`). Een negatief inkomen in box 1 telt daarin als 0.
 *
 * @param inkomen belastbaar inkomen uit werk en woning
 * @param arbeidsinkomen inkomen uit werk, voor de arbeidskorting en combinatiekorting
 * @param extraHeffing heffing die bovenop de schijven komt, vóór kortingen
 * @param overigInkomen inkomen uit andere boxen (box 3) dat meetelt in het verzamelinkomen
 */
export function box1Uitkomst(
  inkomen: number,
  arbeidsinkomen: number,
  p: Parameters,
  k: PersoonKenmerken,
  extraHeffing = 0,
  overigInkomen = 0,
): Box1Uitkomst {
  const heffing = heffingVoorKortingen(inkomen, p, k.aow) + extraHeffing;
  const kortingen = heffingskortingen(Math.max(0, inkomen) + overigInkomen, arbeidsinkomen, p, k).totaal;
  if (p.box1.negatieveBelasting) return { heffing, kortingen, belasting: heffing - kortingen, onbenut: 0 };
  const belasting = heffing <= 0 ? 0 : Math.max(0, heffing - kortingen);
  return { heffing, kortingen, belasting, onbenut: Math.max(0, kortingen - Math.max(0, heffing)) };
}

/** Te betalen box 1-belasting van één persoon; zie `box1Uitkomst`. */
export function belastingBox1(
  inkomen: number,
  arbeidsinkomen: number,
  p: Parameters,
  k: PersoonKenmerken,
  extraHeffing = 0,
  overigInkomen = 0,
): number {
  return box1Uitkomst(inkomen, arbeidsinkomen, p, k, extraHeffing, overigInkomen).belasting;
}

/**
 * Welk deel van een heffingskorting het belastingdeel is: het deel van het tarief in de eerste schijf dat geen premie
 * volksverzekeringen is (2026: 8,10 / 35,75; voor AOW'ers 8,10 / 17,85). Alleen dat deel kan ook van de belasting in
 * box 3 af; het premiedeel alleen van de premies.
 */
export function belastingdeelKortingen(p: Parameters, aow: boolean): number {
  const verlaging = aow ? p.box1.aowVerlagingEersteSchijf : 0;
  const tarief = p.box1.schijven[0]!.tarief - verlaging;
  const premie = p.box1.premieVolksverzekeringen - verlaging;
  if (tarief <= 0) return 0;
  return Math.min(1, Math.max(0, (tarief - premie) / tarief));
}

/** Een aftrekpost voor de tariefsaanpassing, met het hoogste tarief waartegen hij mag werken. */
export interface BeperkteAftrek {
  bedrag: number;
  maxTarief: number;
}

/**
 * Tariefsaanpassing (Wet IB 2001, artikel 2.10 lid 2 en 3): de ondernemersaftrek, de mkb-winstvrijstelling en de
 * aftrekbare kosten van de eigen woning leveren hoogstens voordeel op tegen het maximale aftrektarief. Voor het deel
 * van die posten dat boven het belastbaar inkomen in een schijf met een hoger tarief valt, komt het verschil er als
 * extra heffing bij. De posten liggen in de volgorde van `posten` boven op het belastbaar inkomen.
 *
 * @param belastbaar belastbaar inkomen uit werk en woning, ná de posten
 */
export function tariefsaanpassing(
  belastbaar: number,
  posten: readonly BeperkteAftrek[],
  p: Parameters,
  aow: boolean,
): number {
  let onder = belastbaar;
  let extra = 0;
  for (const post of posten) {
    if (post.bedrag <= 0) continue;
    const boven = onder + post.bedrag;
    for (const s of tariefStukken(p, aow)) {
      if (s.tarief <= post.maxTarief) continue;
      const deel = Math.min(boven, s.boven) - Math.max(onder, s.onder);
      if (deel > 0) extra += (deel * (s.tarief - post.maxTarief)) / 100;
    }
    onder = boven;
  }
  return extra;
}

/**
 * Tarief van de schijf waarin dit inkomen valt (in procent), 0 onder de vrijstelling. Zonder kortingen en
 * zonder AOW-verlaging; gebruikt voor het gedragseffect.
 */
export function schijfTarief(inkomen: number, p: Parameters): number {
  const { vrijstelling, schijven } = p.box1;
  if (inkomen <= vrijstelling) return 0;
  let vorige = 0;
  for (const s of schijven) {
    const top = s.tot ?? Infinity;
    if (inkomen <= top && inkomen > vorige) return s.tarief;
    vorige = top;
  }
  return schijven[schijven.length - 1]!.tarief;
}
