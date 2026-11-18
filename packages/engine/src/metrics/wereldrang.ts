import { z } from "zod";
import { formatteerFouten } from "../parameters/schema.ts";

/*
 * De Gini van Nederland op een wereldranglijst (D-097). De landencijfers komen van de Wereldbank
 * (data/vergelijking/gini-landen.yaml, schaal 0-100).
 *
 * De Gini van het model ligt lager dan die van de Wereldbank (andere bron en inkomensbegrip; inkomen uit vermogen
 * zit maar deels in het model). Daarom zetten we niet de Gini van het model zelf op de lijst, maar het cijfer van de
 * Wereldbank voor Nederland plus de verandering die het model berekent. Onder het huidige beleid staat Nederland
 * dus op de plek die de Wereldbank geeft.
 */

const waarde = z.number().min(0).max(100);
const jaar = z.number().int();

export const giniLandenSchema = z
  .strictObject({
    bron: z.string().min(1),
    opgehaald: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Per land het nieuwste cijfer vanaf dit jaar. */
    vanafJaar: jaar,
    nederland: z.strictObject({ waarde, jaar }),
    /** Alle andere landen, zonder Nederland. */
    landen: z
      .array(z.strictObject({ code: z.string().regex(/^[A-Z]{3}$/), land: z.string().min(1), waarde, jaar }))
      .min(1),
  })
  .superRefine((g, ctx) => {
    const codes = new Set<string>();
    for (const [i, l] of g.landen.entries()) {
      if (l.code === "NLD")
        ctx.addIssue({ code: "custom", path: ["landen", i], message: "Nederland staat apart." });
      if (codes.has(l.code))
        ctx.addIssue({ code: "custom", path: ["landen", i], message: `${l.code} staat dubbel.` });
      if (l.jaar < g.vanafJaar)
        ctx.addIssue({ code: "custom", path: ["landen", i], message: `Jaar ${l.jaar} ligt voor vanafJaar.` });
      codes.add(l.code);
    }
  });

export type GiniLanden = z.infer<typeof giniLandenSchema>;

export function valideerGiniLanden(data: unknown, bestand = "gini-landen"): GiniLanden {
  const r = giniLandenSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, bestand));
  return r.data;
}

export interface WereldPlek {
  /** 1 is het gelijkste land. Landen met dezelfde index delen een plek. */
  plek: number;
  /** Aantal landen op de lijst, Nederland meegeteld. */
  van: number;
  /** De Gini-index van Nederland die we op de lijst zetten (0-100, op één decimaal zoals de Wereldbank). */
  index: number;
}

/**
 * Plek van Nederland als de Gini (0-1) van `basis` naar `gini` gaat. Bij `gini === basis` is dat de plek volgens
 * de Wereldbank.
 */
export function giniWereldPlek(landen: GiniLanden, gini: number, basis: number): WereldPlek {
  const index = Math.round((landen.nederland.waarde + (gini - basis) * 100) * 10) / 10;
  const lager = landen.landen.filter((l) => l.waarde < index).length;
  return { plek: lager + 1, van: landen.landen.length + 1, index };
}
