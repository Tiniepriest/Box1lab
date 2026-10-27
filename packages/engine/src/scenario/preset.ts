import { z } from "zod";
import { formatteerFouten, type Parameters } from "../parameters/schema.ts";
import { bestaatParameter, pasToe, wijzigingSchema } from "../parameters/wijzig.ts";

/*
 * Een preset is een bekend voorstel ("vlaktaks", "zonder huurtoeslag") als lijst wijzigingen op de parameters.
 * Bestanden: data/presets/<id>.yaml.
 */
export const presetSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/, "Een id bestaat uit kleine letters, cijfers en streepjes."),
  naam: z.string().min(1),
  omschrijving: z.string().min(1),
  /** Volgorde in lijsten (laag eerst). */
  volgorde: z.number().int().default(100),
  wijzigingen: z.array(wijzigingSchema),
});

export type Preset = z.infer<typeof presetSchema>;

/** Valideert een preset tegen het schema én tegen de parameters: elk pad moet bestaan en het resultaat geldig zijn. */
export function valideerPreset(data: unknown, params: Parameters, bestand = "preset"): Preset {
  const r = presetSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  const onbekend = r.data.wijzigingen.filter((w) => !bestaatParameter(params, w.parameter));
  if (onbekend.length) {
    throw new Error(onbekend.map((w) => `${bestand}: onbekende parameter '${w.parameter}'`).join("\n"));
  }
  pasToe(params, r.data.wijzigingen, bestand);
  return r.data;
}
