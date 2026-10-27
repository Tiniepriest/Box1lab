import { z } from "zod";
import { berekenHuishouden, type Huishouden } from "./huishouden.ts";
import { formatteerFouten, type Parameters } from "./parameters/schema.ts";
import { bestaatParameter, pasToe, type Wijziging } from "./parameters/wijzig.ts";

/*
 * Verkiezingsmodule (HANDOFF §4). Elke partij is een scenario als lijst maatregelen op het basispad, in een eigen
 * bestand: data/verkiezingen/<verkiezing>/<partij>.yaml. De werkwijze staat in docs/METHODIEK-VERKIEZINGEN.md.
 */

const datum = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Een datum schrijf je als JJJJ-MM-DD.")
  .or(z.date().transform((d) => d.toISOString().slice(0, 10)));

export const verkiezingSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  naam: z.string().min(1),
  /** Datum van de verkiezing. */
  datum,
  /** Parameterjaar van het basispad (HANDOFF §4.3). */
  basispad: z.strictObject({ jaar: z.number().int(), toelichting: z.string().min(1) }),
  /** Fictieve testpartijen: de site toont dan een duidelijke waarschuwing. */
  fictief: z.boolean(),
});

const wijzigingSoort = z.union([
  z.strictObject({ type: z.literal("plus"), waarde: z.number().finite() }),
  z.strictObject({ type: z.literal("factor"), waarde: z.number().finite() }),
  z.strictObject({ type: z.literal("zet"), waarde: z.unknown() }),
]);

const maatregelSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/, "Een id bestaat uit kleine letters, cijfers en streepjes."),
    omschrijving: z.string().min(1),
    categorie: z.enum(["belasting", "toeslagen", "zorg", "wonen", "uitkeringen"]),
    /** Eén parameter veranderen ... */
    parameter: z.string().min(1).optional(),
    wijziging: wijzigingSoort.optional(),
    /** ... of meerdere tegelijk, als één belofte meerdere parameters raakt (bijvoorbeeld alle knikken van een korting). */
    wijzigingen: z
      .array(z.strictObject({ parameter: z.string().min(1), wijziging: wijzigingSoort }))
      .min(1)
      .optional(),
    bron: z.strictObject({
      /** "programma" of een sleutel uit `bronnen`. */
      document: z.string().min(1),
      pagina: z.number().int().positive({ message: "Elke maatregel heeft een paginanummer." }),
      citaat: z.string().optional(),
    }),
    /** Hoe zeker is de vertaling van het programma naar deze parameter? */
    zekerheid: z.enum(["hoog", "middel", "laag"]),
    toelichting: z.string().optional(),
  })
  .refine(
    (m) => (m.wijzigingen ? !m.parameter && !m.wijziging : !!m.parameter && !!m.wijziging),
    "Een maatregel heeft óf 'parameter' en 'wijziging', óf een lijst 'wijzigingen'.",
  );

export const partijSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  naam: z.string().min(1),
  programma: z.strictObject({ titel: z.string().min(1), url: z.url(), geraadpleegd: datum }),
  bronnen: z.record(z.string(), z.url()).default({}),
  status: z.enum(["concept", "gecontroleerd", "gepubliceerd"]),
  /** Naam of initialen van de tweede controleur (vier-ogen-principe). */
  gecontroleerd_door: z.string().default(""),
  maatregelen: z.array(maatregelSchema),
  niet_gemodelleerd: z.array(z.string().min(1)).default([]),
});

export type Verkiezing = z.infer<typeof verkiezingSchema>;
export type Partij = z.infer<typeof partijSchema>;
export type Maatregel = Partij["maatregelen"][number];

export function valideerVerkiezing(data: unknown, bestand = "verkiezing"): Verkiezing {
  const r = verkiezingSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}

type WijzigingSoort = z.infer<typeof wijzigingSoort>;

function enkele(parameter: string, w: WijzigingSoort): Wijziging {
  if (w.type === "plus") return { parameter, plus: w.waarde };
  if (w.type === "factor") return { parameter, maal: w.waarde };
  return { parameter, zet: w.waarde };
}

/** Zet een maatregel om in wijzigingen voor de rekenkern. */
export function alsWijzigingen(m: Maatregel): Wijziging[] {
  if (m.wijzigingen) return m.wijzigingen.map((x) => enkele(x.parameter, x.wijziging));
  return [enkele(m.parameter!, m.wijziging!)];
}

export function partijWijzigingen(p: Partij): Wijziging[] {
  return p.maatregelen.flatMap(alsWijzigingen);
}

/**
 * Valideert een partijbestand: schema, bestaande parameters, bronnen, vier-ogen-principe en een geldige uitkomst.
 * Alle fouten tegelijk, met bestandsnaam, zodat CI meteen laat zien wat er mis is.
 */
export function valideerPartij(data: unknown, params: Parameters, bestand = "partij"): Partij {
  const r = partijSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  const p = r.data;
  const fouten: string[] = [];
  const ids = new Set<string>();
  for (const m of p.maatregelen) {
    if (ids.has(m.id)) fouten.push(`${bestand}: maatregel '${m.id}' komt twee keer voor`);
    ids.add(m.id);
    for (const w of alsWijzigingen(m)) {
      if (!bestaatParameter(params, w.parameter)) {
        fouten.push(`${bestand}: maatregel '${m.id}' gebruikt onbekende parameter '${w.parameter}'`);
      }
    }
    if (m.bron.document !== "programma" && !(m.bron.document in p.bronnen)) {
      fouten.push(`${bestand}: maatregel '${m.id}' verwijst naar onbekend document '${m.bron.document}'`);
    }
    if (m.zekerheid !== "hoog" && !m.toelichting) {
      fouten.push(`${bestand}: maatregel '${m.id}' heeft zekerheid '${m.zekerheid}' maar geen toelichting`);
    }
  }
  if (p.status === "gepubliceerd" && !p.gecontroleerd_door.trim()) {
    fouten.push(
      `${bestand}: status 'gepubliceerd' mag alleen na controle door een tweede persoon (gecontroleerd_door)`,
    );
  }
  if (!fouten.length) {
    try {
      pasToe(params, partijWijzigingen(p), bestand);
    } catch (e) {
      fouten.push((e as Error).message);
    }
  }
  if (fouten.length) throw new Error(fouten.join("\n"));
  return p;
}

export interface MaatregelEffect {
  maatregel: Maatregel;
  /** Verandering van het besteedbaar inkomen door deze maatregel, euro per jaar. */
  effect: number;
}

/**
 * Effect van een partijprogramma op één huishouden, uitgesplitst per maatregel. De maatregelen worden in volgorde
 * stapelend toegepast; de effecten tellen zo precies op tot het totaal.
 */
export function effectVoorHuishouden(
  h: Huishouden,
  basis: Parameters,
  partij: Partij,
): { totaal: number; perMaatregel: MaatregelEffect[] } {
  const start = berekenHuishouden(h, basis).besteedbaar;
  let vorige = start;
  const toegepast: Wijziging[] = [];
  const perMaatregel = partij.maatregelen.map((m) => {
    toegepast.push(...alsWijzigingen(m));
    const p = pasToe(basis, toegepast);
    const nu = berekenHuishouden(h, p, basis).besteedbaar;
    const effect = nu - vorige;
    vorige = nu;
    return { maatregel: m, effect };
  });
  return { totaal: vorige - start, perMaatregel };
}
