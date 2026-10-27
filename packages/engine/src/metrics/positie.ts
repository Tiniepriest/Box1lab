/**
 * Welk deel (0–1) van het totale gewicht heeft een waarde lager dan `waarde`?
 * Gebruikt voor "je hoort bij de X% met het laagste inkomen".
 */
export function aandeelOnder(
  waarde: number,
  waarden: readonly number[],
  gewichten: readonly number[],
): number {
  let onder = 0;
  let totaal = 0;
  waarden.forEach((v, i) => {
    const w = gewichten[i]!;
    totaal += w;
    if (v < waarde) onder += w;
  });
  return totaal > 0 ? onder / totaal : 0;
}
