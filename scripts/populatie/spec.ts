import { z } from "zod";
import { formatteerFouten } from "@box1lab/engine";

/* Schema van data/populatie/spec-<jaar>.yaml: de aannames voor het genereren van de populatie. */

const getal = z.number().finite();
const kans = z.number().min(0).max(1);

export const specSchema = z.strictObject({
  bron: z.string().min(1),
  aantal: z.number().int().positive(),
  minimumPerCel: z.number().int().positive(),
  minimaleCel: z.number().nonnegative(),
  zaad: z.number().int(),
  inkomen: z.strictObject({
    mediaanHoofdverdiener: getal,
    leeftijdsprofiel: z.array(z.strictObject({ vanaf: getal, factor: getal })).min(1),
    spreiding: getal,
    factorAlleenstaand: getal,
    factorEenouder: getal,
    partnerWerkt: kans,
    partnerAandeel: getal,
    partnerCorrelatie: z.number().min(-1).max(1),
    uitkeringKans: z.strictObject({ alleenstaand: kans, paar: kans, eenouder: kans }),
    aandeelBijstand: kans,
    uitkering: z.strictObject({ minimum: getal, maximum: getal }),
  }),
  pensioen: z.strictObject({
    mediaanAlleenstaand: getal,
    mediaanPaar: getal,
    spreiding: getal,
    aandeelHoofd: kans,
  }),
  woning: z.strictObject({
    koop: z.strictObject({
      basis: getal,
      perJaarLeeftijd: getal,
      inkomen: getal,
      alleenstaand: getal,
      maxLeeftijdEffect: getal,
    }),
    corporatie: z.strictObject({ basis: getal, inkomen: getal }),
    huurCorporatie: z.strictObject({ minimum: getal, maximum: getal }),
    huurParticulier: z.strictObject({ minimum: getal, maximum: getal }),
    wozPerBrutoInkomen: getal,
    wozSpreiding: z.number().min(0).max(1),
    wozMinimum: getal,
    wozMaximum: getal,
    hypotheekPerBrutoInkomen: getal,
    hypotheekMaximum: getal,
    hypotheekSpreiding: z.number().min(0).max(1),
    hypotheekAfgelostOpLeeftijd: getal,
    hypotheekrentePct: getal,
  }),
  kinderen: z.strictObject({
    leeftijdsverschil: getal,
    spreiding: getal,
    tussenruimte: getal,
    inkomen: z.strictObject({
      studieTotLeeftijd: getal,
      bijbaan: z.strictObject({ minimum: getal, maximum: getal }),
      werkKans: kans,
      mediaanWerk: getal,
      spreiding: getal,
    }),
  }),
  kinderopvang: z.strictObject({
    kans,
    dagopvang: z.strictObject({ totLeeftijd: getal, urenPerMaand: getal }),
    buitenschoolse: z.strictObject({ totLeeftijd: getal, urenPerMaand: getal }),
    uurprijsFactor: z.strictObject({ minimum: getal, maximum: getal }),
  }),
  herweging: z.strictObject({
    minimaleFactor: z.number().positive(),
    maximaleFactor: z.number().positive(),
    iteraties: z.number().int().positive(),
  }),
});

export type Spec = z.infer<typeof specSchema>;

export function valideerSpec(data: unknown, bestand = "populatie-spec"): Spec {
  const r = specSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}
