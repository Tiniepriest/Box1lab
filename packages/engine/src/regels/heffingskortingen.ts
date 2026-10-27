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

export interface PersoonKenmerken {
  /** Heeft inkomen uit werk (recht op arbeidskorting). */
  werkt: boolean;
  /** Heeft de AOW-leeftijd. */
  aow: boolean;
  /** Krijgt de inkomensafhankelijke combinatiekorting (werkende ouder met jong kind). */
  combinatiekorting: boolean;
}

export interface Kortingen {
  algemeen: number;
  arbeid: number;
  ouderen: number;
  combinatie: number;
  totaal: number;
}

/** Alle heffingskortingen van één persoon, inclusief de niveau-knop per korting. */
export function heffingskortingen(inkomen: number, p: Parameters, k: PersoonKenmerken): Kortingen {
  const h = p.heffingskortingen;
  const algemeen =
    staffelWaarde(k.aow ? h.algemeen.staffelAow : h.algemeen.staffel, inkomen) * (h.algemeen.niveau / 100);
  const arbeid = k.werkt && !k.aow ? staffelWaarde(h.arbeid.staffel, inkomen) * (h.arbeid.niveau / 100) : 0;
  const ouderen = k.aow ? staffelWaarde(h.ouderen.staffel, inkomen) * (h.ouderen.niveau / 100) : 0;
  const combinatie = k.combinatiekorting
    ? staffelWaarde(h.combinatie.staffel, inkomen, h.combinatie.maximum) * (h.combinatie.niveau / 100)
    : 0;
  return { algemeen, arbeid, ouderen, combinatie, totaal: algemeen + arbeid + ouderen + combinatie };
}
