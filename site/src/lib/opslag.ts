/*
 * Onthouden van het invoerformulier, alleen in deze browser (D-052):
 * - zolang het tabblad openstaat (sessionStorage), zodat je situatie meegaat naar het lab, de voorstellen en de
 *   verkiezingen. Sluit je het tabblad, dan is het weg.
 * - langer op dit apparaat (localStorage), alleen als de bezoeker "Onthoud op dit apparaat" aanzet.
 * "Wis mijn gegevens" haalt beide weg. Opslag kan ontbreken of geblokkeerd zijn; dan werkt alles gewoon zonder.
 */
import { invoerSchema, persoonInvoerSchema, type Invoer } from "@box1lab/engine";

const SLEUTEL = "box1lab.invoer.v1";

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
}

export function wisInvoer(): void {
  zet(sessie, null);
  zet(apparaat, null);
}

/** Startwaarden van het formulier: een voorbeeld, duidelijk te herkennen als voorbeeld. */
export function voorbeeldInvoer(): Invoer {
  return {
    personen: [
      persoonInvoerSchema.parse({
        leeftijd: 35,
        soort: "loondienst",
        bedrag: 3200,
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
  };
}
