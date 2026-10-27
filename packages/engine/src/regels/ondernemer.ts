import type { Parameters } from "../parameters/schema.ts";

export interface Ondernemer {
  /** Werkt minstens het urencriterium (parameters: `ondernemers.urencriterium`) in de onderneming. */
  urencriterium: boolean;
  /** Mag de startersaftrek gebruiken. */
  starter: boolean;
}

/**
 * Van winst naar belastbare winst (Wet IB 2001, art. 3.2): eerst de ondernemersaftrek (zelfstandigenaftrek en
 * startersaftrek, alleen met urencriterium), dan de mkb-winstvrijstelling over wat overblijft. De aftrek gaat
 * in het model niet onder nul; een verlies verrekenen met andere jaren zit er niet in.
 */
export function belastbareWinst(
  winst: number,
  o: Ondernemer,
  p: Parameters,
): { belastbaar: number; ondernemersaftrek: number; mkbVrijstelling: number } {
  const r = p.ondernemers;
  const aftrek = o.urencriterium ? r.zelfstandigenaftrek + (o.starter ? r.startersaftrek : 0) : 0;
  const ondernemersaftrek = Math.min(Math.max(0, winst), aftrek);
  const mkbVrijstelling = (Math.max(0, winst - ondernemersaftrek) * r.mkbWinstvrijstelling) / 100;
  return { belastbaar: winst - ondernemersaftrek - mkbVrijstelling, ondernemersaftrek, mkbVrijstelling };
}
