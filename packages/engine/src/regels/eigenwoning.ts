import type { Parameters } from "../parameters/schema.ts";
import { tariefsaanpassing } from "./box1.ts";

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
 * Aftrekbeperking eigen woning (tariefsaanpassing, Wet IB 2001, artikel 2.10 lid 2 en 3): de aftrekbare kosten,
 * dus de hypotheekrente, leveren hoogstens voordeel op tegen het maximale aftrektarief. Het gaat om de rente, niet
 * om het saldo met het forfait: het forfait wordt gewoon in de hoogste schijf belast (D-088).
 *
 * @param belastbaar belastbaar inkomen uit werk en woning, met het saldo eigen woning erin
 */
export function aftrekbeperking(
  belastbaar: number,
  aftrekbareRente: number,
  p: Parameters,
  aow: boolean,
): number {
  return tariefsaanpassing(
    belastbaar,
    [{ bedrag: aftrekbareRente, maxTarief: p.eigenWoning.aftrekMaxTarief }],
    p,
    aow,
  );
}
