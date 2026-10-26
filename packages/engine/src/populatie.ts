import { z } from "zod";
import type { Huishouden } from "./huishouden.ts";
import { formatteerFouten } from "./parameters/schema.ts";

/*
 * De synthetische populatie (data/populatie/<jaar>.json). Gemaakt en herwogen door `npm run kalibreer`;
 * de engine en de site lezen alleen dit bestand.
 */

const bedrag = z.number().finite().nonnegative();

const lid = z.strictObject({
  inkomen: bedrag,
  soort: z.enum(["werk", "uitkering", "aow", "geen"]),
  uitkering: bedrag,
  uitkeringSoort: z.enum(["bijstand", "werknemersverzekering"]).optional(),
});

const kinderopvang = z.strictObject({
  soort: z.enum(["dagopvang", "buitenschoolse", "gastouder"]),
  urenPerMaand: bedrag,
  uurprijs: bedrag,
});

const populatieHuishouden = z.strictObject({
  /** Samenstelling volgens CBS: alleenstaand, paar0, paar1, paar2, paar3, eenouder1, eenouder2, eenouder3. */
  type: z.string(),
  /** Leeftijd van de referentiepersoon. */
  leeftijd: z.number().int().min(15).max(110),
  woonvorm: z.enum(["koop", "corporatie", "particulier"]),
  /** Aantal echte huishoudens dat dit synthetische huishouden vertegenwoordigt. */
  gewicht: z.number().positive(),
  leden: z.array(lid).min(1).max(2),
  partners: z.boolean(),
  kinderen: z.array(z.number().int().min(0).max(40)),
  kindInkomens: z.array(bedrag).optional(),
  huurPerMaand: bedrag,
  hypotheekrente: bedrag,
  woz: bedrag,
  kinderopvang: z.array(kinderopvang),
  vermogen: bedrag,
});

export const populatieSchema = z.strictObject({
  jaar: z.number().int(),
  toelichting: z.string(),
  huishoudens: z.array(populatieHuishouden).min(1),
});

export type PopulatieHuishouden = z.infer<typeof populatieHuishouden> & Huishouden;
export type Populatie = z.infer<typeof populatieSchema>;

export function valideerPopulatie(data: unknown, bestand = "populatie"): Populatie {
  const r = populatieSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}
