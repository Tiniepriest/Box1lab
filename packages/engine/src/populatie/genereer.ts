import { z } from "zod";
import type { Huishouden, Lid } from "../huishouden.ts";
import { aowPerJaar } from "../regels/uitkeringen.ts";
import type { Parameters } from "../parameters/schema.ts";
import { formatteerFouten } from "../parameters/schema.ts";
import { inverseNormaal } from "./normaal.ts";

/*
 * Synthetische populatie, fase 1: een letterlijke port van buildPop() uit het prototype. Alle getallen komen uit
 * data/populatie/spec-<jaar>.yaml. Fase 3 vervangt dit door een offline herwogen populatie.
 */

const type = z.strictObject({
  id: z.string(),
  naam: z.string(),
  N: z.number().positive(),
  partners: z.boolean(),
  aow: z.boolean(),
  koop: z.number().min(0).max(1),
  mediaan: z.number().positive().optional(),
  spreiding: z.number().positive().optional(),
  uitkering: z.number().min(0).max(1).optional(),
  tweeverdieners: z.number().min(0).max(1).optional(),
  partnerAandeel: z.number().positive().optional(),
  kinderen: z.boolean().optional(),
  pensioenMediaan: z.number().positive().optional(),
  pensioenSpreiding: z.number().positive().optional(),
});

export const populatieSpecSchema = z.strictObject({
  bron: z.string().min(1),
  huishoudensPerType: z.number().int().positive(),
  types: z.array(type).min(1),
  correctie: z.strictObject({ inkomen: z.number(), hypotheekrente: z.number(), kinderopvang: z.number() }),
  uitkering: z.strictObject({
    minimum: z.number(),
    bereik: z.number(),
    aandeelBijstand: z.number().min(0).max(1),
  }),
  pensioenVerdelingPartners: z.number().min(0).max(1),
  woning: z.strictObject({
    wozPerBrutoInkomen: z.strictObject({ werkend: z.number(), aow: z.number() }),
    wozMinimum: z.number(),
    wozMaximum: z.number(),
    hypotheekPerBrutoInkomen: z.number(),
    hypotheekMaximum: z.number(),
    hypotheekrentePct: z.number(),
    aowHypotheekrente: z.number(),
  }),
  huur: z.strictObject({
    basisPerMaand: z.number(),
    aandeelBrutoInkomen: z.number(),
    maximumPerMaand: z.number(),
  }),
  kinderopvang: z.strictObject({
    soort: z.enum(["dagopvang", "buitenschoolse", "gastouder"]),
    urenPerMaand: z.number(),
    uurprijs: z.number(),
    maxKinderen: z.number().int(),
  }),
  kinderLeeftijden: z.strictObject({
    onder12: z.array(z.number()).min(3),
    vanaf12: z.array(z.number()).min(3),
  }),
});

export type PopulatieSpec = z.infer<typeof populatieSpecSchema>;

export function valideerPopulatieSpec(data: unknown, bestand = "populatie-spec"): PopulatieSpec {
  const r = populatieSpecSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}

export interface PopulatieHuishouden extends Huishouden {
  type: string;
  /** Aantal echte huishoudens dat dit synthetische huishouden vertegenwoordigt. */
  gewicht: number;
}

function vereist(v: number | undefined, veld: string, typeId: string): number {
  if (v === undefined) throw new Error(`populatie-spec: type '${typeId}' mist '${veld}'.`);
  return v;
}

export function genereerPopulatie(spec: PopulatieSpec, p: Parameters): PopulatieHuishouden[] {
  const n = spec.huishoudensPerType;
  const { correctie: c, woning: w } = spec;
  const pop: PopulatieHuishouden[] = [];

  for (const T of spec.types) {
    for (let i = 0; i < n; i++) {
      const q = (i + 0.5) / n;
      const f1 = ((i * 7) % 10) / 10;
      const f2 = ((i * 3) % 7) / 6;
      const h: PopulatieHuishouden = {
        type: T.id,
        gewicht: T.N / n,
        partners: T.partners,
        kinderen: [],
        huurPerMaand: 0,
        hypotheekrente: 0,
        woz: 0,
        kinderopvang: [],
        vermogen: 0,
        leden: [],
      };

      if (T.aow) {
        const med = vereist(T.pensioenMediaan, "pensioenMediaan", T.id);
        const sig = vereist(T.pensioenSpreiding, "pensioenSpreiding", T.id);
        const pensioen = Math.exp(Math.log(med) + sig * inverseNormaal(q));
        if (T.partners) {
          const aow = aowPerJaar(p, true);
          const a = spec.pensioenVerdelingPartners;
          h.leden = [
            { inkomen: aow + pensioen * a, soort: "aow", uitkering: aow },
            { inkomen: aow + pensioen * (1 - a), soort: "aow", uitkering: aow },
          ];
        } else {
          const aow = aowPerJaar(p, false);
          h.leden = [{ inkomen: aow + pensioen, soort: "aow", uitkering: aow }];
        }
      } else {
        const uitk = vereist(T.uitkering, "uitkering", T.id);
        let hoofd: Lid;
        if (q < uitk) {
          const x = spec.uitkering.minimum + (q / uitk) * spec.uitkering.bereik;
          const uitkeringSoort =
            q / uitk < spec.uitkering.aandeelBijstand ? "bijstand" : "werknemersverzekering";
          hoofd = { inkomen: x, soort: "uitkering", uitkering: x, uitkeringSoort };
        } else {
          const qq = (q - uitk) / (1 - uitk);
          const med = vereist(T.mediaan, "mediaan", T.id) * c.inkomen;
          const x = Math.exp(Math.log(med) + vereist(T.spreiding, "spreiding", T.id) * inverseNormaal(qq));
          hoofd = { inkomen: x, soort: "werk", uitkering: 0 };
        }
        h.leden = [hoofd];
        if (T.partners) {
          if (f1 < vereist(T.tweeverdieners, "tweeverdieners", T.id) && hoofd.soort === "werk") {
            const aandeel = vereist(T.partnerAandeel, "partnerAandeel", T.id);
            h.leden.push({
              inkomen: hoofd.inkomen * aandeel * (0.55 + 0.9 * f2),
              soort: "werk",
              uitkering: 0,
            });
          } else {
            h.leden.push({ inkomen: 0, soort: "geen", uitkering: 0 });
          }
        }
        if (T.kinderen) {
          const aantal = T.partners ? (i % 7 === 0 ? 3 : i % 3 === 0 ? 1 : 2) : i % 2 ? 1 : 2;
          const leeftijden = i % 5 < 3 ? spec.kinderLeeftijden.onder12 : spec.kinderLeeftijden.vanaf12;
          h.kinderen = leeftijden.slice(0, aantal);
        }
      }

      const bruto = h.leden.reduce((s, l) => s + l.inkomen, 0);
      if (q > 1 - T.koop) {
        const factor = T.aow ? w.wozPerBrutoInkomen.aow : w.wozPerBrutoInkomen.werkend;
        h.woz = Math.min(w.wozMaximum, Math.max(w.wozMinimum, factor * bruto));
        if (T.aow) {
          h.hypotheekrente = i % 2 === 0 ? w.aowHypotheekrente * c.hypotheekrente : 0;
        } else {
          const hypotheek =
            Math.min(w.hypotheekPerBrutoInkomen * bruto, w.hypotheekMaximum) * (0.55 + 0.45 * f2);
          h.hypotheekrente = (w.hypotheekrentePct / 100) * hypotheek * c.hypotheekrente;
        }
      } else {
        h.huurPerMaand = Math.min(
          spec.huur.maximumPerMaand,
          spec.huur.basisPerMaand + spec.huur.aandeelBrutoInkomen * bruto,
        );
      }

      if (h.kinderen.some((l) => l < 12)) {
        const werkend = h.leden.filter((l) => l.soort === "werk" && l.inkomen > 0).length;
        const allenWerken = T.partners ? werkend === 2 : werkend === 1;
        if (allenWerken && i % 2 === 0) {
          const o = spec.kinderopvang;
          const aantal = Math.min(h.kinderen.length, o.maxKinderen);
          h.kinderopvang = Array.from({ length: aantal }, () => ({
            soort: o.soort,
            urenPerMaand: o.urenPerMaand * c.kinderopvang,
            uurprijs: o.uurprijs,
          }));
        }
      }
      pop.push(h);
    }
  }
  return pop;
}
