import { z } from "zod";
import type { Huishouden, Lid } from "./huishouden.ts";
import { formatteerFouten, type Parameters } from "./parameters/schema.ts";
import type { Kinderopvang } from "./regels/toeslagen/kot.ts";
import { aowPerJaar } from "./regels/uitkeringen.ts";

/*
 * Het gedeelde invoerformulier (HANDOFF §3.3): wat een bezoeker invult over het eigen huishouden. Gebruikt door de
 * calculator, het scenariolab en de verkiezingsmodule. De omzetting naar een Huishouden staat hier, zodat de site
 * geen eigen rekenregels heeft.
 */

const bedrag = z.number().finite().nonnegative();

export const persoonInvoerSchema = z.strictObject({
  leeftijd: z.number().int().min(15).max(110),
  soort: z.enum(["loondienst", "zzp", "bijstand", "werknemersverzekering", "aow", "geen"]),
  /** Bruto inkomen uit werk of uitkering; bij "aow" het aanvullend pensioen. */
  bedrag,
  periode: z.enum(["jaar", "maand"]),
  /** Alleen bij periode "maand": zit het vakantiegeld al in het maandbedrag? */
  inclusiefVakantiegeld: z.boolean(),
});

export const invoerSchema = z.strictObject({
  personen: z.array(persoonInvoerSchema).min(1).max(2),
  kinderen: z.array(
    z.strictObject({
      leeftijd: z.number().int().min(0).max(30),
      /** Bruto jaarinkomen van een meerderjarig kind. */
      inkomen: bedrag,
      opvang: z.enum(["geen", "dagopvang", "buitenschoolse", "gastouder"]),
      urenPerMaand: bedrag,
      uurprijs: bedrag,
    }),
  ),
  wonen: z.enum(["huur", "koop", "anders"]),
  huurPerMaand: bedrag,
  woz: bedrag,
  hypotheekrente: bedrag,
  vermogen: bedrag,
});

export type PersoonInvoer = z.infer<typeof persoonInvoerSchema>;
export type Invoer = z.infer<typeof invoerSchema>;

export function valideerInvoer(data: unknown): Invoer {
  const r = invoerSchema.safeParse(data);
  if (!r.success) throw new Error(formatteerFouten(r.error, "invoer"));
  return r.data;
}

/** Bruto jaarinkomen uit wat iemand invult (per maand of per jaar, met of zonder vakantiegeld). */
export function jaarbedrag(persoon: PersoonInvoer, p: Parameters): number {
  if (persoon.periode === "jaar") return persoon.bedrag;
  const vakantiegeld = persoon.inclusiefVakantiegeld ? 1 : 1 + p.loon.vakantiegeld / 100;
  return persoon.bedrag * 12 * vakantiegeld;
}

function lid(persoon: PersoonInvoer, partners: boolean, p: Parameters): Lid {
  const bedrag = jaarbedrag(persoon, p);
  switch (persoon.soort) {
    case "loondienst":
    case "zzp":
      return { inkomen: bedrag, soort: "werk", uitkering: 0 };
    case "bijstand":
    case "werknemersverzekering":
      return { inkomen: bedrag, soort: "uitkering", uitkering: bedrag, uitkeringSoort: persoon.soort };
    case "aow": {
      const aow = aowPerJaar(p, partners);
      return { inkomen: aow + bedrag, soort: "aow", uitkering: aow };
    }
    case "geen":
      return { inkomen: 0, soort: "geen", uitkering: 0 };
  }
}

/** Zet het ingevulde formulier om in een huishouden voor de rekenkern. */
export function huishoudenUitInvoer(invoer: Invoer, p: Parameters): Huishouden {
  const partners = invoer.personen.length === 2;
  const kinderopvang: Kinderopvang[] = invoer.kinderen
    .filter((k) => k.opvang !== "geen" && k.urenPerMaand > 0)
    .map((k) => ({
      soort: k.opvang as Kinderopvang["soort"],
      urenPerMaand: k.urenPerMaand,
      uurprijs: k.uurprijs,
    }));
  return {
    leden: invoer.personen.map((persoon) => lid(persoon, partners, p)),
    partners,
    kinderen: invoer.kinderen.map((k) => k.leeftijd),
    kindInkomens: invoer.kinderen.map((k) => (k.leeftijd >= p.zorg.volwassenVanaf ? k.inkomen : 0)),
    huurPerMaand: invoer.wonen === "huur" ? invoer.huurPerMaand : 0,
    hypotheekrente: invoer.wonen === "koop" ? invoer.hypotheekrente : 0,
    woz: invoer.wonen === "koop" ? invoer.woz : 0,
    kinderopvang,
    vermogen: invoer.vermogen,
  };
}

/** Een persoon heeft de AOW-leeftijd volgens de parameters. */
export function heeftAowLeeftijd(leeftijd: number, p: Parameters): boolean {
  return leeftijd >= p.uitkeringen.aowLeeftijd;
}
