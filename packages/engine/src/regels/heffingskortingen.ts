import type { Parameters, Staffel } from "../parameters/schema.ts";

/**
 * Waarde van een staffel bij een inkomen: het laatste stuk met `vanaf <= inkomen` bepaalt
 * bedrag + tarief% × (inkomen − vanaf). Nooit onder 0, en nooit boven `maximum` als dat is opgegeven.
 */
export function staffelWaarde(staffel: Staffel, inkomen: number, maximum = Infinity): number {
  let stuk = staffel[0]!;
  for (const s of staffel) {
    if (inkomen >= s.vanaf) stuk = s;
    else break;
  }
  const w = stuk.bedrag + (stuk.tarief / 100) * (inkomen - stuk.vanaf);
  return Math.min(maximum, Math.max(0, w));
}

/**
 * Sprongen in een staffel: waar het vorige stuk bij het begin van het volgende niet op hetzelfde bedrag uitkomt. Een
 * staffel is één doorlopende lijn; een sprong groter dan `marge` euro wijst op een tikfout in de parameters.
 */
export function staffelSprongen(
  staffel: Staffel,
  marge = 1.5,
): { vanaf: number; verwacht: number; bedrag: number }[] {
  const sprongen: { vanaf: number; verwacht: number; bedrag: number }[] = [];
  for (let i = 1; i < staffel.length; i++) {
    const vorig = staffel[i - 1]!;
    const s = staffel[i]!;
    const verwacht = vorig.bedrag + (vorig.tarief / 100) * (s.vanaf - vorig.vanaf);
    if (Math.abs(verwacht - s.bedrag) > marge) sprongen.push({ vanaf: s.vanaf, verwacht, bedrag: s.bedrag });
  }
  return sprongen;
}

export interface PersoonKenmerken {
  /** Heeft inkomen uit werk (recht op arbeidskorting). */
  werkt: boolean;
  /** Heeft de AOW-leeftijd. */
  aow: boolean;
  /** Heeft geen (fiscale) partner; voor de alleenstaande-ouderenkorting. */
  alleenstaand: boolean;
  /** Krijgt de inkomensafhankelijke combinatiekorting (werkende ouder met jong kind). */
  combinatiekorting: boolean;
}

export interface Kortingen {
  algemeen: number;
  arbeid: number;
  ouderen: number;
  alleenstaandeOuderen: number;
  combinatie: number;
  totaal: number;
}

/**
 * Alle heffingskortingen van één persoon, inclusief de niveau-knop per korting.
 *
 * @param inkomen verzamelinkomen (bepaalt algemene heffingskorting en ouderenkorting)
 * @param arbeidsinkomen inkomen uit werk (bepaalt arbeidskorting en combinatiekorting)
 */
export function heffingskortingen(
  inkomen: number,
  arbeidsinkomen: number,
  p: Parameters,
  k: PersoonKenmerken,
): Kortingen {
  const h = p.heffingskortingen;
  const n = (niveau: number) => niveau / 100;
  const algemeen =
    staffelWaarde(k.aow ? h.algemeen.staffelAow : h.algemeen.staffel, inkomen) * n(h.algemeen.niveau);
  const arbeid =
    k.werkt && arbeidsinkomen > 0
      ? staffelWaarde(k.aow ? h.arbeid.staffelAow : h.arbeid.staffel, arbeidsinkomen) * n(h.arbeid.niveau)
      : 0;
  const ouderen = k.aow ? staffelWaarde(h.ouderen.staffel, inkomen) * n(h.ouderen.niveau) : 0;
  const alleenstaandeOuderen =
    k.aow && k.alleenstaand ? h.alleenstaandeOuderen.bedrag * n(h.alleenstaandeOuderen.niveau) : 0;
  const c = h.combinatie;
  const combinatie = k.combinatiekorting
    ? staffelWaarde(k.aow ? c.staffelAow : c.staffel, arbeidsinkomen, k.aow ? c.maximumAow : c.maximum) *
      n(c.niveau)
    : 0;
  return {
    algemeen,
    arbeid,
    ouderen,
    alleenstaandeOuderen,
    combinatie,
    totaal: algemeen + arbeid + ouderen + alleenstaandeOuderen + combinatie,
  };
}
