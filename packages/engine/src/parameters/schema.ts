import { z } from "zod";

/*
 * Schema van een parameterbestand (data/parameters/<jaar>.yaml).
 *
 * Alle objecten zijn "strict": een onbekende sleutel (bijvoorbeeld een tikfout als "drempelinkomn") is een fout,
 * in plaats van dat de waarde stilletjes wordt genegeerd.
 *
 * Een nieuwe regeling toevoegen: zie docs/NIEUWE-REGELING.md.
 */

const bron = z.string().min(1, "Elke sectie heeft een bron nodig (of 'TODO: bron nodig').");
const bedrag = z.number().finite();
const nietNegatief = z.number().finite().nonnegative();
/** Percentage, als getal: 35,75% is 35.75. */
const pct = z.number().finite();
/** Scenarioknop: 100 = huidige wet, 0 = afgeschaft. */
const niveau = z.number().finite().nonnegative();
const perHuishouden = <T extends z.ZodType>(t: T) => z.strictObject({ alleenstaand: t, partners: t });

const schijf = z.strictObject({ tot: nietNegatief.nullable(), tarief: pct });

const staffelStuk = z.strictObject({ vanaf: nietNegatief, bedrag: bedrag, tarief: pct });
const staffel = z
  .array(staffelStuk)
  .min(1)
  .refine((s) => s[0]?.vanaf === 0, "Het eerste stuk van een staffel begint bij vanaf: 0.")
  .refine(
    (s) => s.every((st, i) => i === 0 || st.vanaf > s[i - 1]!.vanaf),
    "De stukken van een staffel staan op volgorde van 'vanaf', van laag naar hoog.",
  );

export const parametersSchema = z.strictObject({
  jaar: z.number().int().min(2000).max(2100),

  box1: z.strictObject({
    bron,
    vrijstelling: nietNegatief,
    schijven: z
      .array(schijf)
      .min(1)
      .refine((s) => s[s.length - 1]?.tot === null, "De laatste schijf heeft 'tot: null' (geen bovengrens).")
      .refine(
        (s) => s.slice(0, -1).every((b) => b.tot !== null),
        "Alleen de laatste schijf mag 'tot: null' hebben.",
      )
      .refine(
        (s) => s.slice(0, -1).every((b, i) => i === 0 || b.tot! > s[i - 1]!.tot!),
        "De schijfgrenzen lopen op van laag naar hoog.",
      ),
    aowVerlagingEersteSchijf: pct,
  }),

  heffingskortingen: z.strictObject({
    algemeen: z.strictObject({ bron, niveau, staffel, staffelAow: staffel }),
    arbeid: z.strictObject({ bron, niveau, staffel }),
    ouderen: z.strictObject({ bron, niveau, staffel }),
    combinatie: z.strictObject({ bron, niveau, staffel, maximum: nietNegatief }),
  }),

  eigenWoning: z.strictObject({
    bron,
    forfait: pct,
    aftrekMaxTarief: pct,
  }),

  overigeAftrekposten: z.strictObject({ bron, budgetMld: nietNegatief, niveau }),

  toeslagen: z.strictObject({
    zorgtoeslag: z.strictObject({
      bron,
      niveau,
      maximum: perHuishouden(nietNegatief),
      drempelinkomen: nietNegatief,
      afbouw: pct,
    }),
    huurtoeslag: z.strictObject({
      bron,
      niveau,
      maximaleHuurPerMaand: nietNegatief,
      vergoeding: pct,
      basisbijdragePerMaand: perHuishouden(nietNegatief),
      drempelinkomen: perHuishouden(nietNegatief),
      afbouw: pct,
    }),
    kindgebondenBudget: z.strictObject({
      bron,
      niveau,
      perKind: nietNegatief,
      alleenstaandeOuderkop: nietNegatief,
      drempelinkomen: perHuishouden(nietNegatief),
      afbouw: pct,
    }),
    kinderopvangtoeslag: z.strictObject({
      bron,
      niveau,
      maxVergoeding: pct,
      minVergoeding: pct,
      inkomensgrens: nietNegatief,
      afbouwTraject: z.number().positive(),
    }),
  }),

  uitkeringen: z.strictObject({
    bron,
    aow: perHuishouden(nietNegatief),
    nettoKoppeling: z.boolean(),
  }),

  zorg: z.strictObject({ bron, nominalePremiePerVolwassene: nietNegatief }),

  kinderbijslag: z.strictObject({ bron, perKind: nietNegatief }),

  gedrag: z.strictObject({ bron, eti: z.number().min(0).max(2) }),

  methodiek: z.strictObject({
    bron,
    equivalentie: z.strictObject({ extraVolwassene: nietNegatief, kind: nietNegatief }),
    armoedegrens: pct,
    winnaarsGrenzen: z.tuple([pct, pct, pct, pct]),
  }),
});

export type Parameters = z.infer<typeof parametersSchema>;
export type Staffel = z.infer<typeof staffel>;
export type Schijf = z.infer<typeof schijf>;

const doel = z.strictObject({ omschrijving: z.string(), waardeMld: z.number().positive(), bron });

export const kalibratieSchema = z.strictObject({
  jaar: z.number().int(),
  doelen: z.strictObject({
    ibNaHra: doel,
    hypotheekrente: doel,
    zorgtoeslag: doel,
    huurtoeslag: doel,
    kindgebondenBudget: doel,
    kinderopvangtoeslag: doel,
  }),
});

export type Kalibratie = z.infer<typeof kalibratieSchema>;

/** Zet zod-fouten om in een leesbare Nederlandse melding met het pad naar de waarde. */
export function formatteerFouten(error: z.ZodError, bestand = "parameters"): string {
  return error.issues
    .map((i) => `${bestand}: ${i.path.length ? i.path.join(".") : "(bestand)"} — ${i.message}`)
    .join("\n");
}

export function valideerParameters(data: unknown, bestand?: string): Parameters {
  const r = parametersSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}

export function valideerKalibratie(data: unknown, bestand?: string): Kalibratie {
  const r = kalibratieSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand ?? "kalibratie"));
  return r.data;
}
