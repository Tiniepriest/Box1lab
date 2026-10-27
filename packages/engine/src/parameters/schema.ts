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
const perOmvang = <T extends z.ZodType>(t: T) => z.strictObject({ eenpersoons: t, meerpersoons: t });

/** Een lijst rijen met oplopende "vanaf", waarvan de eerste bij 0 begint. */
const oplopendVanafNul = <T extends z.ZodObject<{ vanaf: z.ZodNumber }>>(rij: T, naam: string) =>
  z
    .array(rij)
    .min(1)
    .refine((s) => s[0]?.vanaf === 0, `De eerste rij van ${naam} begint bij vanaf: 0.`)
    .refine(
      (s) => s.every((r, i) => i === 0 || r.vanaf > s[i - 1]!.vanaf),
      `De rijen van ${naam} staan op volgorde van 'vanaf', van laag naar hoog.`,
    );

const schijf = z.strictObject({ tot: nietNegatief.nullable(), tarief: pct });

const staffel = oplopendVanafNul(
  z.strictObject({ vanaf: nietNegatief, bedrag: bedrag, tarief: pct }),
  "een staffel",
);

const aowBedragen = z.strictObject({
  perMaandEersteHalfjaar: nietNegatief,
  perMaandTweedeHalfjaar: nietNegatief,
  vakantiegeldPerMaand: nietNegatief,
});

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
    arbeid: z.strictObject({ bron, niveau, staffel, staffelAow: staffel }),
    ouderen: z.strictObject({ bron, niveau, staffel }),
    alleenstaandeOuderen: z.strictObject({ bron, niveau, bedrag: nietNegatief }),
    combinatie: z.strictObject({
      bron,
      niveau,
      staffel,
      maximum: nietNegatief,
      staffelAow: staffel,
      maximumAow: nietNegatief,
    }),
  }),

  eigenWoning: z.strictObject({
    bron,
    forfait: z.strictObject({
      niveau,
      tabel: oplopendVanafNul(z.strictObject({ vanaf: nietNegatief, percentage: pct }), "de forfaittabel"),
      villataks: z.strictObject({ vanaf: nietNegatief, percentage: pct }),
    }),
    aftrekMaxTarief: pct,
    hillenAftrek: pct,
  }),

  overigeAftrekposten: z.strictObject({ bron, budgetMld: nietNegatief, niveau }),

  toeslagen: z.strictObject({
    zorgtoeslag: z.strictObject({
      bron,
      niveau,
      standaardpremie: nietNegatief,
      drempelinkomen: nietNegatief,
      normpremieDrempel: perHuishouden(pct),
      normpremieAfbouw: pct,
      maxToetsingsinkomen: perHuishouden(nietNegatief),
      maxVermogen: perHuishouden(nietNegatief),
    }),
    huurtoeslag: z.strictObject({
      bron,
      niveau,
      huurgrens: nietNegatief,
      basishuur: perOmvang(nietNegatief),
      kwaliteitskortingsgrens: nietNegatief,
      aftoppingsgrens: z.strictObject({ eenOfTweePersonen: nietNegatief, drieOfMeerPersonen: nietNegatief }),
      vergoeding: z.strictObject({
        totKwaliteitskortingsgrens: pct,
        totAftoppingsgrens: pct,
        totHuurgrens: pct,
      }),
      inkomensijkpunt: perOmvang(nietNegatief),
      afbouw: perOmvang(pct),
      inkomensvrijstellingKind: nietNegatief,
      maxVermogen: perHuishouden(nietNegatief),
    }),
    kindgebondenBudget: z.strictObject({
      bron,
      niveau,
      perKind: nietNegatief,
      verhogingKind12tot16: nietNegatief,
      verhogingKind16en17: nietNegatief,
      alleenstaandeOuderkop: nietNegatief,
      drempelinkomen: perHuishouden(nietNegatief),
      afbouw: pct,
      maxVermogen: perHuishouden(nietNegatief),
    }),
    kinderopvangtoeslag: z.strictObject({
      bron,
      niveau,
      maxUurprijs: z.strictObject({
        dagopvang: nietNegatief,
        buitenschoolse: nietNegatief,
        gastouder: nietNegatief,
      }),
      maxUrenPerMaand: nietNegatief,
      tabel: oplopendVanafNul(
        z.strictObject({ vanaf: nietNegatief, eersteKind: pct, volgendKind: pct }),
        "de kinderopvangtoeslagtabel",
      ),
    }),
  }),

  uitkeringen: z.strictObject({
    bron,
    aow: perHuishouden(aowBedragen),
    nettoKoppeling: z.strictObject({
      aow: z.boolean(),
      bijstand: z.boolean(),
      werknemersverzekering: z.boolean(),
    }),
  }),

  zorg: z.strictObject({
    bron,
    nominalePremiePerVolwassene: nietNegatief,
    zvwBijdrage: pct,
    zvwMaximumInkomen: nietNegatief,
    volwassenVanaf: z.number().int().positive(),
  }),

  kinderbijslag: z.strictObject({
    bron,
    niveau,
    perKwartaal: z
      .array(
        z.strictObject({
          totLeeftijd: z.number().int().positive(),
          eersteHalfjaar: nietNegatief,
          tweedeHalfjaar: nietNegatief,
        }),
      )
      .min(1)
      .refine(
        (s) => s.every((r, i) => i === 0 || r.totLeeftijd > s[i - 1]!.totLeeftijd),
        "De leeftijdsgroepen van de kinderbijslag lopen op.",
      ),
  }),

  gedrag: z.strictObject({ bron, eti: z.number().min(0).max(2) }),

  methodiek: z.strictObject({
    bron,
    equivalentie: z.strictObject({
      extraVolwassene: nietNegatief,
      kind: nietNegatief,
      kindVanafLeeftijd: z.number().int().nonnegative(),
    }),
    armoedegrens: pct,
    winnaarsGrenzen: z.tuple([pct, pct, pct, pct]),
  }),
});

export type Parameters = z.infer<typeof parametersSchema>;
export type Staffel = z.infer<typeof staffel>;
export type Schijf = z.infer<typeof schijf>;

const aantal = z.number().int().nonnegative();
const toeslagDoel = z.strictObject({ ontvangers: aantal, bedragMld: z.number().positive() });

/** Kalibratiedoelen (data/kalibratie/<jaar>.yaml). */
export const kalibratieSchema = z.strictObject({
  jaar: z.number().int(),
  huishoudens: z.strictObject({
    bron,
    leeftijdsgroepen: z
      .array(
        z.strictObject({
          van: z.number().int(),
          tot: z.number().int(),
          alleenstaand: aantal,
          paar0: aantal,
          paar1: aantal,
          paar2: aantal,
          paar3: aantal,
          eenouder1: aantal,
          eenouder2: aantal,
          eenouder3: aantal,
        }),
      )
      .min(1),
  }),
  woningen: z.strictObject({ bron, koop: aantal, corporatie: aantal, particulier: aantal }),
  inkomen: z.strictObject({
    bron,
    jaar: z.number().int(),
    besteedbaarPercentielen: z.array(z.number().positive()).length(9),
  }),
  inkomensbestanddelen: z.strictObject({
    bron,
    jaar: z.number().int(),
    inkomenEigenWoningMln: z.number().nonnegative(),
    betaaldeHypotheekrenteMln: z.number().nonnegative(),
    belastingOpInkomenMln: z.number().nonnegative(),
    premiesVolksverzekeringenMln: z.number().nonnegative(),
  }),
  indexatie: z.strictObject({ bron, factor: z.number().positive() }),
  toeslagen: z.strictObject({
    bron,
    zorgtoeslag: toeslagDoel,
    huurtoeslag: toeslagDoel,
    kindgebondenBudget: toeslagDoel,
    kinderopvangtoeslag: toeslagDoel,
  }),
  controle: z.strictObject({ bron, loonEnInkomensheffingMld: z.number().positive(), box3Mld: z.number() }),
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
