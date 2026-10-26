/** Gewogen mediaan: de eerste waarde (oplopend gesorteerd) waarbij het cumulatieve gewicht de helft bereikt. */
export function gewogenMediaan(waarden: readonly number[], gewichten: readonly number[]): number {
  const idx = waarden.map((_, i) => i).sort((a, b) => waarden[a]! - waarden[b]!);
  const totaal = gewichten.reduce((a, b) => a + b, 0);
  let c = 0;
  for (const i of idx) {
    c += gewichten[i]!;
    if (c >= totaal / 2) return waarden[i]!;
  }
  return NaN;
}
