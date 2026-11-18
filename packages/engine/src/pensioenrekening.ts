import { berekenHuishouden, type Resultaat } from "./huishouden.ts";
import { heeftAowLeeftijd, huishoudenUitInvoer, jaarbedrag, type Invoer } from "./invoer.ts";
import type { Parameters } from "./parameters/schema.ts";
import { jaarruimte } from "./regels/lijfrente.ts";

/*
 * "Inleggen voor je pensioen" op Jouw situatie: wat je terugkrijgt als je geld inlegt op een pensioenrekening
 * (lijfrente). Hetzelfde huishouden, met en zonder de aftrek; de rekenregels zijn die van de engine.
 */

export interface Pensioenrekening {
  /** Wat je inlegt, euro per jaar. */
  inleg: number;
  /** Wat je mag aftrekken: de inleg, of de jaarruimte als die kleiner is. */
  aftrek: number;
  /** Geschatte jaarruimte, als je geen pensioen opbouwt via je werk; anders null (dan kennen we hem niet). */
  jaarruimte: number | null;
  /** Minder belasting (box 1 en box 3), euro per jaar: wat je terugkrijgt van de Belastingdienst. */
  teruggave: number;
  /** Meer (+) of minder (−) toeslagen door het lagere inkomen, euro per jaar. */
  toeslagen: number;
  /** Wat de inleg je netto kost: de inleg min de teruggave en de extra toeslagen. */
  nettoKosten: number;
}

/** Wie kan inleggen: werkt in loondienst of als zzp'er, en heeft de AOW-leeftijd nog niet. */
export function kanInleggen(invoer: Invoer, persoon: number, p: Parameters): boolean {
  const x = invoer.personen[persoon];
  return !!x && (x.soort === "loondienst" || x.soort === "zzp") && !heeftAowLeeftijd(x.leeftijd, p);
}

/**
 * Het effect van `inleg` euro op een pensioenrekening van persoon `persoon` (0 = jij, 1 = partner). Met
 * `pensioenViaWerk` is de jaarruimte onbekend en rekenen we met de hele inleg. Geeft null als die persoon niet kan
 * inleggen.
 */
export function pensioenrekening(
  invoer: Invoer,
  p: Parameters,
  opties: { persoon: number; inleg: number; pensioenViaWerk: boolean },
): Pensioenrekening | null {
  const { persoon, pensioenViaWerk } = opties;
  if (!kanInleggen(invoer, persoon, p)) return null;
  const x = invoer.personen[persoon]!;
  const inleg = Math.max(0, opties.inleg);
  // Arbeidsinkomen: het loon na de eigen pensioenpremie, of de winst vóór de ondernemersaftrek.
  const arbeid = jaarbedrag(x, p) - (x.soort === "loondienst" ? x.pensioenpremiePerMaand * 12 : 0);
  const ruimte = pensioenViaWerk ? null : jaarruimte(arbeid, p);
  const aftrek = ruimte === null ? inleg : Math.min(inleg, ruimte);

  const h = huishoudenUitInvoer(invoer, p);
  const met = {
    ...h,
    leden: h.leden.map((l, i) => (i === persoon ? { ...l, lijfrentepremie: aftrek } : l)),
  };
  const a: Resultaat = berekenHuishouden(h, p);
  const b: Resultaat = berekenHuishouden(met, p);
  const teruggave = a.belasting + a.box3 - (b.belasting + b.box3);
  const toeslagen = b.toeslagen - a.toeslagen;
  return {
    inleg,
    aftrek,
    jaarruimte: ruimte,
    teruggave,
    toeslagen,
    nettoKosten: inleg - teruggave - toeslagen,
  };
}
