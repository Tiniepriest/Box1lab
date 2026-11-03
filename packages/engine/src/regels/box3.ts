import type { Parameters } from "../parameters/schema.ts";

/** Vermogen in box 3 op 1 januari, voor het hele huishouden (fiscale partners samen). */
export interface Box3Vermogen {
  /** Banktegoeden: spaargeld en betaalrekeningen. */
  bank: number;
  /** Overige bezittingen: beleggingen, een tweede woning, uitgeleend geld. */
  overig: number;
  /** Schulden (niet de hypotheek van de eigen woning). */
  schulden: number;
}

export interface Box3Uitkomst {
  /** Bezittingen min de schulden boven de drempel. */
  rendementsgrondslag: number;
  /** Rendementsgrondslag min het heffingsvrij vermogen, nooit negatief. */
  grondslag: number;
  /** Voordeel uit sparen en beleggen: het belastbaar inkomen in box 3. Telt mee in het toetsingsinkomen. */
  voordeel: number;
  belasting: number;
}

/**
 * Box 3 volgens het forfaitaire stelsel (Wet IB 2001, hoofdstuk 5, met de overbruggingsregeling): een vast
 * rendement per soort vermogen, over het deel boven het heffingsvrij vermogen. Het heffingsvrij vermogen en de
 * schuldendrempel gelden per persoon, dus dubbel voor partners. De tegenbewijsregeling (een lager werkelijk
 * rendement) zit er niet in.
 */
export function box3(v: Box3Vermogen, partners: boolean, p: Parameters): Box3Uitkomst {
  const b = p.box3;
  const personen = partners ? 2 : 1;
  const schulden = Math.max(0, v.schulden - personen * b.schuldendrempel);
  const bezittingen = v.bank + v.overig;
  const rendementsgrondslag = bezittingen - schulden;
  const grondslag = Math.max(0, rendementsgrondslag - personen * b.heffingsvrijVermogen);
  if (grondslag <= 0) return { rendementsgrondslag, grondslag: 0, voordeel: 0, belasting: 0 };
  const rendement =
    (v.bank * b.rendement.banktegoeden + v.overig * b.rendement.overig - schulden * b.rendement.schulden) /
    100;
  const voordeel = Math.max(0, (rendement * grondslag) / rendementsgrondslag);
  return { rendementsgrondslag, grondslag, voordeel, belasting: (voordeel * b.tarief) / 100 };
}
