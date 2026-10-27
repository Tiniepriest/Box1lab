import type { Parameters } from "../parameters/schema.ts";
import { tariefStukken } from "./box1.ts";

/** Eigenwoningforfait per jaar bij een WOZ-waarde, inclusief de niveau-knop. */
export function eigenwoningforfait(woz: number, p: Parameters): number {
  const { tabel, villataks, niveau } = p.eigenWoning.forfait;
  const pctBij = (w: number) => {
    let pct = tabel[0]!.percentage;
    for (const r of tabel) {
      if (w >= r.vanaf) pct = r.percentage;
      else break;
    }
    return pct;
  };
  const forfait =
    woz > villataks.vanaf
      ? (pctBij(villataks.vanaf) / 100) * villataks.vanaf +
        (villataks.percentage / 100) * (woz - villataks.vanaf)
      : (pctBij(woz) / 100) * woz;
  return forfait * (niveau / 100);
}

export interface EigenWoningSaldo {
  forfait: number;
  aftrekbareRente: number;
  /** Aftrek wegens geen of geringe eigenwoningschuld (Wet Hillen). */
  hillenAftrek: number;
  /** Inkomen uit eigen woning: forfait − rente − Hillen-aftrek. Negatief = aftrekpost. */
  saldo: number;
}

/** Het inkomen uit eigen woning dat bij het belastbaar inkomen van de hoofdverdiener wordt opgeteld. */
export function eigenWoningSaldo(hypotheekrente: number, woz: number, p: Parameters): EigenWoningSaldo {
  const forfait = eigenwoningforfait(woz, p);
  const aftrekbareRente = p.eigenWoning.aftrekMaxTarief > 0 ? hypotheekrente : 0;
  const hillenAftrek =
    forfait > aftrekbareRente ? (p.eigenWoning.hillenAftrek / 100) * (forfait - aftrekbareRente) : 0;
  return { forfait, aftrekbareRente, hillenAftrek, saldo: forfait - aftrekbareRente - hillenAftrek };
}

/**
 * Aftrekbeperking: een negatief saldo eigen woning levert hoogstens voordeel op tegen het maximale
 * aftrektarief. Voor het deel van de aftrek dat in een schijf met een hoger tarief valt, wordt het verschil
 * als extra heffing teruggenomen.
 *
 * @param inkomenZonderWoning belastbaar inkomen vóór het saldo eigen woning
 */
export function aftrekbeperking(
  inkomenZonderWoning: number,
  saldo: number,
  p: Parameters,
  aow: boolean,
): number {
  if (saldo >= 0) return 0;
  const max = p.eigenWoning.aftrekMaxTarief;
  const onder = inkomenZonderWoning + saldo;
  let extra = 0;
  for (const s of tariefStukken(p, aow)) {
    if (s.tarief <= max) continue;
    const deel = Math.min(inkomenZonderWoning, s.boven) - Math.max(onder, s.onder);
    if (deel > 0) extra += (deel * (s.tarief - max)) / 100;
  }
  return extra;
}
