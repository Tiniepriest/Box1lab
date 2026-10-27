import { z } from "zod";
import { datumSchema } from "./datum.ts";
import { formatteerFouten } from "./parameters/schema.ts";
import { MODEL_VERSIE } from "./versie.ts";

/*
 * Publieke lijst van wijzigingen (HANDOFF §5, §8): data/changelog.yaml, nieuwste bovenaan. De site toont hem op
 * /wijzigingen en gebruikt de nieuwste datum als "bijgewerkt" onderaan elke pagina.
 */

const versie = z.string().regex(/^\d+\.\d+\.\d+$/, "Een modelversie schrijf je als 1.2.3.");

export const changelogSchema = z
  .array(
    z.strictObject({
      datum: datumSchema,
      /** nieuw: nieuwe functie of pagina; cijfers: parameters of kalibratie; model: rekenregels; correctie: fout hersteld. */
      soort: z.enum(["nieuw", "cijfers", "model", "correctie"]),
      titel: z.string().min(1),
      tekst: z.string().min(1),
      /** Alleen als de rekenregels veranderen: de nieuwe MODEL_VERSIE. */
      modelversie: versie.optional(),
      links: z.array(z.strictObject({ tekst: z.string().min(1), url: z.url() })).default([]),
    }),
  )
  .min(1, "De changelog heeft minstens één regel.");

export type Changelog = z.infer<typeof changelogSchema>;
export type ChangelogRegel = Changelog[number];

function vergelijkVersie(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! - y[i]!;
  return 0;
}

/** Valideert de changelog: schema, nieuwste bovenaan, en de hoogste modelversie is de huidige MODEL_VERSIE. */
export function valideerChangelog(
  data: unknown,
  bestand = "changelog",
  modelVersie = MODEL_VERSIE,
): Changelog {
  const r = changelogSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  const regels = r.data;
  const fouten: string[] = [];
  for (let i = 1; i < regels.length; i++) {
    if (regels[i]!.datum > regels[i - 1]!.datum) {
      fouten.push(`${bestand}: '${regels[i]!.titel}' staat boven een oudere regel; zet de nieuwste bovenaan`);
    }
  }
  const versies = regels.flatMap((x) => (x.modelversie ? [x.modelversie] : [])).sort(vergelijkVersie);
  const hoogste = versies.at(-1);
  if (hoogste !== modelVersie) {
    fouten.push(
      `${bestand}: de hoogste modelversie is ${hoogste ?? "(geen)"}, maar MODEL_VERSIE is ${modelVersie}. ` +
        `Voeg een regel toe met 'modelversie: ${modelVersie}'.`,
    );
  }
  if (fouten.length) throw new Error(fouten.join("\n"));
  return regels;
}
