/*
 * Leesbare namen van de secties in het parameterbestand, en hun bronnen. Gebruikt op de pagina Methodiek en
 * bij een voorlopig parameterjaar (welke secties hebben nog geen bron?).
 */
import type { Parameters } from "@box1lab/engine";

export const NAMEN: Record<string, string> = {
  box1: "Tarieven box 1",
  "heffingskortingen.algemeen": "Algemene heffingskorting",
  "heffingskortingen.arbeid": "Arbeidskorting",
  "heffingskortingen.ouderen": "Ouderenkorting",
  "heffingskortingen.alleenstaandeOuderen": "Alleenstaande-ouderenkorting",
  "heffingskortingen.combinatie": "Combinatiekorting",
  eigenWoning: "Eigen woning",
  overigeAftrekposten: "Overige aftrekposten",
  "toeslagen.zorgtoeslag": "Zorgtoeslag",
  "toeslagen.huurtoeslag": "Huurtoeslag",
  "toeslagen.kindgebondenBudget": "Kindgebonden budget",
  "toeslagen.kinderopvangtoeslag": "Kinderopvangtoeslag",
  uitkeringen: "AOW en uitkeringen",
  bijstand: "Bijstandsnormen",
  ondernemers: "Zelfstandigen",
  pensioenpremie: "Pensioenpremie werknemers",
  zorg: "Zorgpremie en Zvw-bijdrage",
  kinderbijslag: "Kinderbijslag",
  loon: "Vakantiegeld",
  gedrag: "Gedragseffect",
  methodiek: "Uitkomstmaten",
};

/** Alle "bron"-velden van een parameterset, met de naam van de sectie. */
export function bronnen(params: Parameters): { naam: string; bron: string }[] {
  const lijst: { naam: string; bron: string }[] = [];
  const loop = (o: unknown, pad: string) => {
    if (typeof o !== "object" || o === null || Array.isArray(o)) return;
    const r = o as Record<string, unknown>;
    if (typeof r.bron === "string") lijst.push({ naam: NAMEN[pad] ?? pad, bron: r.bron });
    for (const [k, v] of Object.entries(r)) if (k !== "bron") loop(v, pad ? `${pad}.${k}` : k);
  };
  loop(params, "");
  return lijst;
}

/** Secties waarvan (een deel van) de bedragen nog geen bron heeft. */
export function zonderBron(params: Parameters): string[] {
  return bronnen(params)
    .filter((b) => b.bron.includes("TODO"))
    .map((b) => b.naam);
}
