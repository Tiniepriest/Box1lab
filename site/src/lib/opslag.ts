/*
 * Onthouden van het invoerformulier, alleen in deze browser (D-052):
 * - zolang het tabblad openstaat (sessionStorage), zodat je situatie meegaat naar het lab, de voorstellen en de
 *   verkiezingen. Sluit je het tabblad, dan is het weg.
 * - langer op dit apparaat (localStorage), alleen als de bezoeker "Onthoud op dit apparaat" aanzet.
 * "Wis mijn gegevens" haalt beide weg. Opslag kan ontbreken of geblokkeerd zijn; dan werkt alles gewoon zonder.
 */
import { invoerSchema, persoonInvoerSchema, type Invoer, type Parameters } from "@box1lab/engine";

export const SLEUTEL = "box1lab.invoer.v1";
/** Gebeurtenis op `window` als de bewaarde situatie verandert (bewaard of gewist). */
export const SITUATIE_GEWIJZIGD = "box1lab:situatie";

export type Bewaard = { invoer: Invoer; opApparaat: boolean };

function lees(opslag: () => Storage): Invoer | null {
  try {
    const tekst = opslag().getItem(SLEUTEL);
    if (!tekst) return null;
    const data = JSON.parse(tekst);
    // Vóór D-053 kon je bij wonen "anders" kiezen; dat rekent hetzelfde als huur zonder huurbedrag.
    if (data?.wonen === "anders") Object.assign(data, { wonen: "huur", huurPerMaand: 0 });
    const r = invoerSchema.safeParse(data);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

function zet(opslag: () => Storage, invoer: Invoer | null): void {
  try {
    if (invoer) opslag().setItem(SLEUTEL, JSON.stringify(invoer));
    else opslag().removeItem(SLEUTEL);
  } catch {
    /* opslag niet beschikbaar: niets aan te doen */
  }
}

const sessie = () => sessionStorage;
const apparaat = () => localStorage;

/** De bewaarde situatie: eerst van dit apparaat, anders van dit tabblad. */
export function leesBewaard(): Bewaard | null {
  const opApparaat = lees(apparaat);
  if (opApparaat) return { invoer: opApparaat, opApparaat: true };
  const tabblad = lees(sessie);
  return tabblad ? { invoer: tabblad, opApparaat: false } : null;
}

export function leesInvoer(): Invoer | null {
  return leesBewaard()?.invoer ?? null;
}

/** Bewaart voor dit tabblad, en op dit apparaat als de bezoeker dat heeft aangezet. */
export function bewaarInvoer(invoer: Invoer, opApparaat: boolean): void {
  zet(sessie, invoer);
  zet(apparaat, opApparaat ? invoer : null);
  meld(true);
}

export function wisInvoer(): void {
  zet(sessie, null);
  zet(apparaat, null);
  meld(false);
}

/** Het vinkje bij "Jouw situatie" in het menu (zie Base.astro) en andere onderdelen op de pagina bijwerken. */
function meld(bewaard: boolean): void {
  if (bewaard) document.documentElement.dataset.situatie = "ja";
  else delete document.documentElement.dataset.situatie;
  window.dispatchEvent(new Event(SITUATIE_GEWIJZIGD));
}

/**
 * Startwaarden van het formulier: een voorbeeld, duidelijk te herkennen als voorbeeld (D-066). Een alleenstaande met
 * een modaal inkomen. Dat staat per jaar inclusief vakantiegeld in het parameterbestand; het formulier vraagt het
 * maandloon zonder vakantiegeld, zoals op de loonstrook.
 */
export function voorbeeldInvoer(params: Parameters): Invoer {
  return {
    personen: [
      persoonInvoerSchema.parse({
        leeftijd: 35,
        soort: "loondienst",
        bedrag: Math.round(params.loon.modaal / 12 / (1 + params.loon.vakantiegeld / 100)),
        periode: "maand",
        inclusiefVakantiegeld: false,
      }),
    ],
    kinderen: [],
    wonen: "huur",
    huurPerMaand: 850,
    woz: 0,
    hypotheekrente: 0,
    vermogen: 0,
    beleggingen: 0,
    schulden: 0,
  };
}
