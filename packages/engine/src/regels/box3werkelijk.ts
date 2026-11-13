import { z } from "zod";
import { formatteerFouten, type Parameters } from "../parameters/schema.ts";
import { box3 } from "./box3.ts";

/*
 * Box 3 op basis van werkelijk rendement (vanaf 2029), alleen voor het rekenvoorbeeld op de pagina van het
 * Belastingplan (fase 33, D-085). Vergelijkt met het forfaitaire stelsel met tegenbewijsregeling van nu. De regels
 * staan in data/vooruitblik/box3-<jaar>.yaml.
 */

const bron = z.string().min(1, "Elke sectie heeft een bron (of 'TODO: bron nodig').");
const percentage = z.number().finite();

export const box3WerkelijkSchema = z.strictObject({
  jaar: z.number().int(),
  toelichting: z.string().min(1),
  regels: z.strictObject({
    bron,
    /** Per persoon; partners samen het dubbele (Wet werkelijk rendement box 3, artikel 5.40). */
    heffingsvrijResultaat: z.number().nonnegative(),
    /** Een negatief resultaat telt als verlies voor zover het hoger is dan dit bedrag (artikel 5.65). */
    verliesdrempel: z.number().nonnegative(),
  }),
  tarief: z.strictObject({
    bron,
    schijven: z
      .array(z.strictObject({ tot: z.number().positive().nullable(), tarief: percentage }))
      .min(1)
      .refine((s) => s.at(-1)!.tot === null, "De laatste schijf heeft 'tot: null'."),
  }),
  /** Startwaarden voor de invulvelden, in procent per jaar. Geen voorspelling. */
  voorbeeld: z.strictObject({
    bron,
    spaarrente: percentage,
    dividend: percentage,
    koersstijging: percentage,
  }),
});

export type Box3Werkelijk = z.infer<typeof box3WerkelijkSchema>;

export function valideerBox3Werkelijk(data: unknown, bestand = "box3-werkelijk"): Box3Werkelijk {
  const r = box3WerkelijkSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}

/** Wat de bezoeker verwacht, in procent per jaar. */
export interface Box3Rendementen {
  /** Rente op spaargeld. */
  spaarrente: number;
  /** Dividend en rente op beleggingen: wordt elk jaar belast. */
  dividend: number;
  /** Koersstijging (of -daling) van de beleggingen: vanaf 2029 alleen belast bij verkoop. */
  koersstijging: number;
  /** Verkoopt de bezoeker de beleggingen in het jaar zelf? Dan telt de koerswinst van dat jaar mee. */
  verkopen: boolean;
}

export interface Box3Vergelijking {
  /** Het forfaitaire stelsel (het jaar van `p`). */
  nu: {
    jaar: number;
    /** Belasting met het vaste rendement. */
    forfaitair: number;
    /** Echt rendement in euro: rente, dividend en koersstijging, ook als je niet verkoopt. */
    werkelijkRendement: number;
    /** Rendement waarover je belasting betaalt: het vaste voordeel, of je echte rendement bij tegenbewijs. */
    belast: number;
    /** Wat je betaalt: het laagste van het vaste rendement en je echte rendement (tegenbewijsregeling). */
    belasting: number;
    tegenbewijs: boolean;
  };
  /** Het stelsel op basis van werkelijk rendement. */
  later: {
    jaar: number;
    /** Resultaat: rente, dividend en, bij verkoop, de koerswinst van dat jaar. */
    resultaat: number;
    vrijgesteld: number;
    /** Belastbaar inkomen uit sparen en beleggen. */
    belastbaar: number;
    belasting: number;
    /** Verlies dat je naar volgende jaren meeneemt. */
    verlies: number;
  };
  /** Belasting later min nu. */
  verschil: number;
}

function schijfBelasting(inkomen: number, schijven: Box3Werkelijk["tarief"]["schijven"]): number {
  let belasting = 0;
  let vanaf = 0;
  for (const s of schijven) {
    const tot = s.tot ?? Infinity;
    if (inkomen > vanaf) belasting += ((Math.min(inkomen, tot) - vanaf) * s.tarief) / 100;
    vanaf = tot;
  }
  return belasting;
}

/**
 * Box 3 nu (forfaitair, met tegenbewijsregeling) naast box 3 met werkelijk rendement, voor spaargeld en beleggingen.
 * Schulden en een tweede woning blijven buiten beschouwing; de bezoeker kiest de rendementen.
 */
export function vergelijkBox3(
  v: { bank: number; overig: number },
  partners: boolean,
  r: Box3Rendementen,
  p: Parameters,
  w: Box3Werkelijk,
): Box3Vergelijking {
  const personen = partners ? 2 : 1;
  const bank = Math.max(0, v.bank);
  const overig = Math.max(0, v.overig);

  // Nu: het vaste rendement, of het echte rendement als dat tot minder belasting leidt (tegenbewijsregeling).
  // Bij het echte rendement telt ook de koersstijging als je niet verkoopt, en is er geen heffingsvrij vermogen.
  const forfaitair = box3({ bank, overig, schulden: 0 }, partners, p).belasting;
  const werkelijkRendement = (bank * r.spaarrente + overig * (r.dividend + r.koersstijging)) / 100;
  const opWerkelijk = (Math.max(0, werkelijkRendement) * p.box3.tarief) / 100;
  const tegenbewijs = opWerkelijk < forfaitair;
  const nuBelasting = tegenbewijs ? opWerkelijk : forfaitair;
  const belast = tegenbewijs ? Math.max(0, werkelijkRendement) : (forfaitair * 100) / p.box3.tarief;

  // Later: rente en dividend elk jaar, koerswinst alleen bij verkoop (alleen de winst sinds de invoering).
  const resultaat =
    (bank * r.spaarrente + overig * r.dividend + (r.verkopen ? overig * r.koersstijging : 0)) / 100;
  const vrij = personen * w.regels.heffingsvrijResultaat;
  const vrijgesteld = resultaat > 0 ? Math.min(resultaat, vrij) : 0;
  const belastbaar = Math.max(0, resultaat - vrij);
  // Partners verdelen het inkomen gelijk; dat geeft de laagste belasting bij oplopende tarieven.
  const belasting = personen * schijfBelasting(belastbaar / personen, w.tarief.schijven);
  const verlies = resultaat < 0 ? Math.max(0, -resultaat - personen * w.regels.verliesdrempel) : 0;

  return {
    nu: {
      jaar: p.jaar,
      forfaitair,
      werkelijkRendement,
      belast,
      belasting: nuBelasting,
      tegenbewijs,
    },
    later: { jaar: w.jaar, resultaat, vrijgesteld, belastbaar, belasting, verlies },
    verschil: belasting - nuBelasting,
  };
}
