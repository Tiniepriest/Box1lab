/*
 * Lokaal onthouden van het invoerformulier (HANDOFF §3.3): alleen als de bezoeker dat aanzet, alleen in deze
 * browser, en altijd te wissen. localStorage kan ontbreken of geblokkeerd zijn; dan werkt alles gewoon zonder.
 */
import { invoerSchema, type Invoer } from "@box1lab/engine";

const SLEUTEL = "box1lab.invoer.v1";

export function leesInvoer(): Invoer | null {
  try {
    const tekst = localStorage.getItem(SLEUTEL);
    if (!tekst) return null;
    const r = invoerSchema.safeParse(JSON.parse(tekst));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function bewaarInvoer(invoer: Invoer): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(invoer));
  } catch {
    /* opslag niet beschikbaar: niets aan te doen */
  }
}

export function wisInvoer(): void {
  try {
    localStorage.removeItem(SLEUTEL);
  } catch {
    /* idem */
  }
}

/** Startwaarden van het formulier: een voorbeeld, duidelijk te herkennen als voorbeeld. */
export function voorbeeldInvoer(): Invoer {
  return {
    personen: [
      { leeftijd: 35, soort: "loondienst", bedrag: 3200, periode: "maand", inclusiefVakantiegeld: false },
    ],
    kinderen: [],
    wonen: "huur",
    huurPerMaand: 850,
    woz: 0,
    hypotheekrente: 0,
    vermogen: 0,
  };
}
