import type { Lid, Resultaat } from "../huishouden.ts";
import type { Parameters } from "../parameters/schema.ts";
import type { PopulatieHuishouden } from "../populatie.ts";

/*
 * Brede groepen voor het scenariolab (D-094): naast de tien inkomensgroepen ook werkenden, AOW'ers, mensen in de
 * bijstand, gezinnen, huurders enzovoort. Elke indeling deelt alle huishoudens in precies één groep in, zodat de
 * aandelen samen 100% zijn. De indeling volgt het huidige beleid, net als de inkomensgroepen.
 */

export interface Groep {
  label: string;
  /** Korte naam voor smalle grafieken. */
  kort: string;
}

export interface Indeling {
  id: string;
  /** Naam van het tabje. */
  label: string;
  /** Hoe de groepen zijn ingedeeld, in één zin. */
  uitleg: string;
  groepen: Groep[];
  /** Groep (index in `groepen`) van een huishouden. `r` is de uitkomst onder het huidige beleid. */
  deel: (h: PopulatieHuishouden, r: Resultaat) => number;
}

/** Inkomensbron van één persoon (index in de groepen van de indeling "bron"). */
function bronVan(l: Lid): number {
  if (l.soort === "aow") return 2;
  if (l.soort === "uitkering") return (l.uitkeringSoort ?? "bijstand") === "bijstand" ? 3 : 4;
  if (l.soort === "werk") return l.ondernemer ? 1 : 0;
  return 5;
}

const werkt = (l: Lid) => l.soort === "werk" && l.inkomen > 0;

export function indelingen(p: Parameters): Indeling[] {
  const [jong, midden] = p.methodiek.leeftijdsgroepen;
  const aowLeeftijd = p.uitkeringen.aowLeeftijd;
  return [
    {
      id: "bron",
      label: "Inkomensbron",
      uitleg:
        "Ingedeeld naar de grootste bron van inkomen in het huishouden. AOW'ers zijn huishoudens waar AOW (met pensioen) het grootste inkomen is.",
      groepen: [
        { label: "Werknemers", kort: "Werknemers" },
        { label: "Zelfstandigen", kort: "Zelfstandigen" },
        { label: "AOW'ers", kort: "AOW'ers" },
        { label: "Bijstand", kort: "Bijstand" },
        { label: "WW en arbeidsongeschiktheid", kort: "WW en WIA" },
        { label: "Zonder eigen inkomen", kort: "Geen inkomen" },
      ],
      deel: (h) => {
        const per = [0, 0, 0, 0, 0, 0];
        for (const l of h.leden) per[bronVan(l)]! += l.inkomen;
        const max = Math.max(...per);
        return max > 0 ? per.indexOf(max) : 5;
      },
    },
    {
      id: "huishouden",
      label: "Huishouden",
      uitleg: "Ingedeeld naar de samenstelling van het huishouden. Werkend: met inkomen uit werk.",
      groepen: [
        { label: "Alleenstaanden", kort: "Alleenstaand" },
        { label: "Paren zonder kinderen", kort: "Paar" },
        { label: "Paren met kinderen, allebei werkend", kort: "Gezin, 2 werkend" },
        { label: "Paren met kinderen, niet allebei werkend", kort: "Gezin, 0–1 werkend" },
        { label: "Eenoudergezinnen", kort: "Eenouder" },
      ],
      deel: (h) => {
        if (h.type.startsWith("eenouder")) return 4;
        if (!h.type.startsWith("paar")) return 0;
        if (h.type === "paar0") return 1;
        return h.leden.filter(werkt).length >= 2 ? 2 : 3;
      },
    },
    {
      id: "leeftijd",
      label: "Leeftijd",
      uitleg: "Ingedeeld naar de leeftijd van de hoofdbewoner.",
      groepen: [
        { label: `Jonger dan ${jong}`, kort: `Onder ${jong}` },
        { label: `${jong} tot ${midden} jaar`, kort: `${jong}–${midden - 1}` },
        { label: `${midden} jaar tot de AOW-leeftijd`, kort: `${midden}–${aowLeeftijd - 1}` },
        { label: `AOW-leeftijd (${aowLeeftijd}) en ouder`, kort: `${aowLeeftijd} en ouder` },
      ],
      deel: (h) => (h.leeftijd < jong ? 0 : h.leeftijd < midden ? 1 : h.leeftijd < aowLeeftijd ? 2 : 3),
    },
    {
      id: "wonen",
      label: "Wonen",
      uitleg: "Ingedeeld naar de woning: huur bij een woningcorporatie, andere huur of een koopwoning.",
      groepen: [
        { label: "Huur bij een woningcorporatie", kort: "Corporatie" },
        { label: "Andere huur", kort: "Particulier" },
        { label: "Koopwoning", kort: "Koop" },
      ],
      deel: (h) => (h.woonvorm === "corporatie" ? 0 : h.woonvorm === "particulier" ? 1 : 2),
    },
    {
      id: "toeslagen",
      label: "Toeslagen",
      uitleg:
        "Ingedeeld naar of het huishouden nu zorgtoeslag, huurtoeslag, kindgebonden budget of kinderopvangtoeslag krijgt.",
      groepen: [
        { label: "Met toeslagen", kort: "Met toeslagen" },
        { label: "Zonder toeslagen", kort: "Zonder" },
      ],
      deel: (_h, r) => (r.toeslagen > 0 ? 0 : 1),
    },
    {
      id: "vermogen",
      label: "Vermogen",
      uitleg: "Ingedeeld naar of het huishouden nu belasting betaalt over sparen en beleggen (box 3).",
      groepen: [
        { label: "Geen box 3-belasting", kort: "Geen box 3" },
        { label: "Betaalt box 3-belasting", kort: "Box 3" },
      ],
      deel: (_h, r) => (r.box3 > 0 ? 1 : 0),
    },
  ];
}

/** Per indeling de groep van elk huishouden. */
export function deelInGroepen(
  p: Parameters,
  populatie: readonly PopulatieHuishouden[],
  resultaten: readonly Resultaat[],
): number[][] {
  return indelingen(p).map((ind) => populatie.map((h, i) => ind.deel(h, resultaten[i]!)));
}
