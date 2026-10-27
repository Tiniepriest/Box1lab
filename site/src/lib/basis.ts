/*
 * De basis (huidig beleid) op de server, één keer per build. Voor wat de site tijdens de build uitrekent:
 * kerncijfers van voorstellen, decielgrenzen voor de uitleg, deelafbeeldingen.
 */
import { maakBasis } from "@box1lab/engine";
import { laadPopulatie } from "@box1lab/engine/node";
import { JAAR, kalibratie, params } from "./data.ts";

export const basis = maakBasis(params, laadPopulatie(JAAR).huishoudens, kalibratie);

/** Bovengrenzen van de tien inkomensgroepen (gestandaardiseerd besteedbaar inkomen per jaar), naar personen. */
export const decielGrenzen: number[] = (() => {
  const v = basis.resultaten.map((r) => r.besteedbaar / r.equivalentie);
  const w = basis.persoonsgewichten;
  const idx = v.map((_, i) => i).sort((a, b) => v[a]! - v[b]!);
  const totaal = w.reduce((a, b) => a + b, 0);
  const grenzen: number[] = [];
  let c = 0;
  for (const i of idx) {
    c += w[i]!;
    while (grenzen.length < 9 && c >= ((grenzen.length + 1) / 10) * totaal) grenzen.push(v[i]!);
  }
  return grenzen;
})();
