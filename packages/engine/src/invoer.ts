import { z } from "zod";
import { vulBijstandIn, type Huishouden, type Lid } from "./huishouden.ts";
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
  /** Bruto inkomen uit werk of uitkering; bij "zzp" de winst; bij "aow" het aanvullend pensioen; niet bij bijstand. */
  bedrag,
  periode: z.enum(["jaar", "maand"]),
  /** Alleen bij loondienst en uitkering per maand: zit het vakantiegeld al in het maandbedrag? */
  inclusiefVakantiegeld: z.boolean(),
  /** Alleen bij loondienst: bruto extra per jaar, zoals een 13e maand, eindejaarsuitkering of bonus. */
  extraPerJaar: bedrag.default(0),
  /** Alleen bij loondienst: het eigen deel van de pensioenpremie per maand, zoals op de loonstrook (0 = geen). */
  pensioenpremiePerMaand: bedrag.default(0),
  /** Alleen bij zzp: voldoet aan het urencriterium voor de ondernemersaftrek. */
  urencriterium: z.boolean().default(true),
  /** Alleen bij zzp: mag de startersaftrek gebruiken. */
  starter: z.boolean().default(false),
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
  /** Wie inwoont of geen woonlasten heeft, kiest "huur" met huur 0: dat rekent hetzelfde. */
  wonen: z.enum(["huur", "koop"]),
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

/**
 * Bruto jaarinkomen uit wat iemand invult: per maand of per jaar, met of zonder vakantiegeld, plus wat er bij
 * loondienst eens per jaar bij komt. Een zzp'er krijgt geen vakantiegeld.
 */
export function jaarbedrag(persoon: PersoonInvoer, p: Parameters): number {
  const extra = persoon.soort === "loondienst" ? persoon.extraPerJaar : 0;
  if (persoon.periode === "jaar") return persoon.bedrag + extra;
  const metVakantiegeld = persoon.soort !== "zzp" && !persoon.inclusiefVakantiegeld;
  const factor = metVakantiegeld ? 1 + p.loon.vakantiegeld / 100 : 1;
  return persoon.bedrag * 12 * factor + extra;
}

function lid(persoon: PersoonInvoer, partners: boolean, p: Parameters): Lid {
  const bedrag = jaarbedrag(persoon, p);
  switch (persoon.soort) {
    case "loondienst":
      return {
        inkomen: bedrag,
        soort: "werk",
        uitkering: 0,
        pensioenpremie: persoon.pensioenpremiePerMaand * 12,
      };
    case "zzp":
      return {
        inkomen: bedrag,
        soort: "werk",
        uitkering: 0,
        ondernemer: { urencriterium: persoon.urencriterium, starter: persoon.starter },
      };
    case "bijstand":
      // Het bedrag volgt uit de norm; dat vult huishoudenUitInvoer in als alle leden bekend zijn.
      return { inkomen: 0, soort: "uitkering", uitkering: 0, uitkeringSoort: "bijstand" };
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
  const leden = invoer.personen.map((persoon) => lid(persoon, partners, p));
  vulBijstandIn(
    leden,
    invoer.personen.map((x) => x.soort === "bijstand"),
    partners,
    p,
  );
  return {
    leden,
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
