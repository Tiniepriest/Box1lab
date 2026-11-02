/*
 * De basis (huidig beleid) op de server, één keer per build. Voor wat de site tijdens de build uitrekent:
 * kerncijfers van voorstellen, decielgrenzen voor de uitleg, deelafbeeldingen, "je plek in Nederland".
 */
import { maakBasis, verdeling } from "@box1lab/engine";
import { laadPopulatie } from "@box1lab/engine/node";
import { JAAR, kalibratie, params } from "./data.ts";

export const basis = maakBasis(params, laadPopulatie(JAAR).huishoudens, kalibratie);

const gestandaardiseerd = basis.resultaten.map((r) => r.besteedbaar / r.equivalentie);

/** Bovengrenzen van de tien inkomensgroepen (gestandaardiseerd besteedbaar inkomen per jaar), naar personen. */
export const decielGrenzen: number[] = verdeling(gestandaardiseerd, basis.persoonsgewichten, 10);

/**
 * Dezelfde verdeling in duizend stukken, voor "je plek in Nederland" op Jouw situatie. Zo hoeft die pagina de
 * bevolking (ruim 1 MB) niet te laden; het lab doet dat wel, want dat rekent scenario's door (D-066).
 */
export const plekGrenzen: number[] = verdeling(gestandaardiseerd, basis.persoonsgewichten, 1000).map(
  Math.round,
);
