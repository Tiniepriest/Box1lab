import type { Parameters } from "../parameters/schema.ts";

/**
 * Jaarruimte voor lijfrentepremie (een pensioenrekening) van iemand die geen pensioen opbouwt via het werk (Wet IB
 * 2001, artikel 3.127): een percentage van de premiegrondslag, het arbeidsinkomen tot de aftoppingsgrens min de
 * AOW-franchise. Wie via het werk pensioen opbouwt, heeft minder ruimte (de factor A); die kent het model niet.
 *
 * Officieel telt het arbeidsinkomen van het jaar ervoor; wie dit jaar ongeveer evenveel verdient, kan dit jaar nemen.
 */
export function jaarruimte(arbeidsinkomen: number, p: Parameters): number {
  const { percentage, aftoppingsgrens, franchise } = p.lijfrente;
  return (Math.max(0, Math.min(arbeidsinkomen, aftoppingsgrens) - franchise) * percentage) / 100;
}
