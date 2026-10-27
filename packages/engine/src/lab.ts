import { z } from "zod";
import { formatteerFouten, type Parameters } from "./parameters/schema.ts";
import { leesParameter } from "./parameters/wijzig.ts";

/*
 * De knoppen in het scenariolab (data/lab/knoppen.yaml). Elke knop wijst naar één parameter. Een nieuwe regeling
 * in het lab zetten is dus een regel in dat bestand; de build controleert dat de parameter bestaat.
 */

export const knopSchema = z.strictObject({
  parameter: z.string(),
  label: z.string().min(1),
  /** Korte uitleg onder de knop. */
  uitleg: z.string().optional(),
  /** "aanUit" is een schakelaar (ja/nee); de andere eenheden zijn schuifjes. */
  eenheid: z.enum(["procent", "euro", "euroPerMaand", "getal", "niveau", "aanUit"]),
  min: z.number().default(0),
  max: z.number().default(1),
  stap: z.number().positive().default(1),
  /** Alleen tonen onder "Meer instellingen". */
  gevorderd: z.boolean().default(false),
});

export const labSchema = z.strictObject({
  groepen: z
    .array(
      z.strictObject({
        id: z.string(),
        titel: z.string(),
        uitleg: z.string().optional(),
        knoppen: z.array(knopSchema),
      }),
    )
    .min(1),
});

export type Knop = z.infer<typeof knopSchema>;
export type LabKnoppen = z.infer<typeof labSchema>;

export function valideerLabKnoppen(data: unknown, params: Parameters, bestand = "lab-knoppen"): LabKnoppen {
  const r = labSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  const fouten: string[] = [];
  for (const g of r.data.groepen) {
    for (const k of g.knoppen) {
      try {
        const v = leesParameter(params, k.parameter);
        const verwacht = k.eenheid === "aanUit" ? "boolean" : "number";
        if (typeof v !== verwacht)
          fouten.push(`${bestand}: '${k.parameter}' heeft niet het verwachte type (${verwacht})`);
      } catch {
        fouten.push(`${bestand}: onbekende parameter '${k.parameter}'`);
      }
    }
  }
  if (fouten.length) throw new Error(fouten.join("\n"));
  return r.data;
}
