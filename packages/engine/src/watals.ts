import { berekenHuishouden, type Resultaat } from "./huishouden.ts";
import { huishoudenUitInvoer, type Invoer, type PersoonInvoer } from "./invoer.ts";
import type { Parameters } from "./parameters/schema.ts";

/*
 * "Wat als?" op Jouw situatie: een paar veelgestelde veranderingen in je eigen situatie, met wat je dan netto
 * meer of minder overhoudt. Alleen andere invoer; de rekenregels zijn die van de engine.
 */

export interface WatAls {
  id: "opslag" | "minder-werken" | "partner-minder-werken" | "samenwonen" | "kind";
  label: string;
  uitleg: string;
  /** Verandering van het besteedbaar inkomen van het huishouden, euro per jaar. */
  verschil: number;
  /** Verandering van belasting en premies (plus = meer betalen), euro per jaar. */
  belasting: number;
  /** Verandering van toeslagen en kinderbijslag samen, euro per jaar. */
  toeslagen: number;
}

const WERK = new Set<PersoonInvoer["soort"]>(["loondienst", "zzp"]);

/** Hetzelfde werk, `factor` keer zoveel: inkomen, bonus en eigen pensioenpremie. */
function werkFactor(persoon: PersoonInvoer, factor: number): PersoonInvoer {
  return {
    ...persoon,
    bedrag: persoon.bedrag * factor,
    extraPerJaar: persoon.extraPerJaar * factor,
    pensioenpremiePerMaand: persoon.pensioenpremiePerMaand * factor,
  };
}

function vervang(invoer: Invoer, i: number, persoon: PersoonInvoer): Invoer {
  return { ...invoer, personen: invoer.personen.map((x, j) => (j === i ? persoon : x)) };
}

function vergelijk(a: Resultaat, b: Resultaat) {
  return {
    verschil: b.besteedbaar - a.besteedbaar,
    belasting: b.belasting + b.zvw + b.zorgpremie - (a.belasting + a.zvw + a.zorgpremie),
    toeslagen: b.toeslagen + b.kinderbijslag - (a.toeslagen + a.kinderbijslag),
  };
}

/** De veranderingen die voor dit huishouden zinnig zijn, met hun effect. */
export function watAls(invoer: Invoer, p: Parameters): WatAls[] {
  const reken = (x: Invoer) => berekenHuishouden(huishoudenUitInvoer(x, p), p);
  const nu = reken(invoer);
  const uit: WatAls[] = [];
  const [jij, partner] = invoer.personen;

  if (jij && WERK.has(jij.soort)) {
    const zzp = jij.soort === "zzp";
    const opslag = jij.periode === "maand" ? 100 : 1200;
    uit.push({
      id: "opslag",
      label: zzp ? "€ 1.200 per jaar meer winst" : "€ 100 per maand meer bruto loon",
      uitleg: "Hoeveel daarvan je echt overhoudt, hangt af van belasting en toeslagen.",
      ...vergelijk(nu, reken(vervang(invoer, 0, { ...jij, bedrag: jij.bedrag + opslag }))),
    });
    uit.push({
      id: "minder-werken",
      label: "Een dag minder werken",
      uitleg: "Bijvoorbeeld 4 in plaats van 5 dagen: 20% minder inkomen.",
      ...vergelijk(nu, reken(vervang(invoer, 0, werkFactor(jij, 0.8)))),
    });
  }
  if (partner && WERK.has(partner.soort)) {
    uit.push({
      id: "partner-minder-werken",
      label: "Je partner werkt een dag minder",
      uitleg: "Bijvoorbeeld 4 in plaats van 5 dagen: 20% minder inkomen.",
      ...vergelijk(nu, reken(vervang(invoer, 1, werkFactor(partner, 0.8)))),
    });
  }
  if (jij && !partner) {
    // Een partner met een modaal inkomen, vergeleken met ieder apart: wat verandert er door samen te wonen?
    const modaal: PersoonInvoer = {
      ...jij,
      leeftijd: Math.min(jij.leeftijd, p.uitkeringen.aowLeeftijd - 1),
      soort: "loondienst",
      bedrag: p.loon.modaal,
      periode: "jaar",
      inclusiefVakantiegeld: true,
      dertiendeMaand: false,
      extraPerJaar: 0,
      pensioenpremiePerMaand: 0,
    };
    const samen = reken({ ...invoer, personen: [jij, modaal] });
    const apart = reken({ ...invoer, personen: [modaal], kinderen: [], wonen: "huur", huurPerMaand: 0 });
    const opgeteld = {
      ...samen,
      besteedbaar: nu.besteedbaar + apart.besteedbaar,
      belasting: nu.belasting + apart.belasting,
      zvw: nu.zvw + apart.zvw,
      zorgpremie: nu.zorgpremie + apart.zorgpremie,
      toeslagen: nu.toeslagen + apart.toeslagen,
      kinderbijslag: nu.kinderbijslag + apart.kinderbijslag,
    };
    uit.push({
      id: "samenwonen",
      label: "Samenwonen met iemand met een modaal inkomen",
      uitleg:
        "Vergeleken met ieder apart (de ander zonder eigen woonlasten): wat jullie samen meer of minder overhouden.",
      ...vergelijk(opgeteld, samen),
    });
  }
  if (jij) {
    uit.push({
      id: "kind",
      label: "Een kind erbij",
      uitleg: "Een baby, zonder kinderopvang. Kosten van het kind zelf zitten er niet in.",
      ...vergelijk(
        nu,
        reken({
          ...invoer,
          kinderen: [
            ...invoer.kinderen,
            { leeftijd: 0, inkomen: 0, opvang: "geen", urenPerMaand: 0, uurprijs: 0 },
          ],
        }),
      ),
    });
  }
  return uit;
}
