import { z } from "zod";
import type { EenvoudigeInvoer } from "./huishouden.ts";
import { formatteerFouten } from "./parameters/schema.ts";

/* Voorbeeldhuishoudens (data/voorbeelden/huishoudens.yaml). */

const soort = z.enum(["werk", "uitkering", "aow", "geen"]);
const bedrag = z.number().finite().nonnegative();

export const eenvoudigeInvoerSchema = z.strictObject({
  inkomen1: bedrag,
  soort1: soort,
  soort2: soort.nullable(),
  inkomen2: bedrag,
  kinderLeeftijden: z.array(z.number().int().min(0).max(30)),
  huurPerMaand: bedrag,
  hypotheekrente: bedrag,
  woz: bedrag,
  kinderopvangKosten: bedrag,
  vermogen: bedrag.optional(),
  uitkeringSoort: z.enum(["bijstand", "werknemersverzekering"]).optional(),
}) satisfies z.ZodType<EenvoudigeInvoer>;

export const voorbeeldenSchema = z.strictObject({
  huishoudens: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string().min(1),
        omschrijving: z.string().min(1),
        invoer: eenvoudigeInvoerSchema,
      }),
    )
    .min(1),
  /** Huishoudtypes voor de grafieken van netto inkomen en marginale druk in het lab. */
  curves: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9-]+$/),
        label: z.string().min(1),
        invoer: eenvoudigeInvoerSchema,
        /** Inkomen van de partner als deel van dat van de eerste persoon (tweeverdieners). */
        partnerAandeel: z.number().min(0).max(1).optional(),
      }),
    )
    .min(1),
});

export type Voorbeelden = z.infer<typeof voorbeeldenSchema>;
export type Voorbeeld = Voorbeelden["huishoudens"][number];

export function valideerVoorbeelden(data: unknown, bestand = "voorbeelden"): Voorbeelden {
  const r = voorbeeldenSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}
