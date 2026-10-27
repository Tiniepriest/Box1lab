/**
 * Deelt huishoudens in tien even grote groepen (naar personen) op volgorde van `waarden`
 * (het gestandaardiseerd besteedbaar inkomen). Geeft per huishouden het deciel 0–9.
 */
export function deelInDecielen(waarden: readonly number[], persoonsgewichten: readonly number[]): number[] {
  const volgorde = waarden.map((_, i) => i).sort((a, b) => waarden[a]! - waarden[b]!);
  const totaal = persoonsgewichten.reduce((a, b) => a + b, 0);
  const deciel = new Array<number>(waarden.length);
  let c = 0;
  for (const i of volgorde) {
    const w = persoonsgewichten[i]!;
    c += w;
    deciel[i] = Math.min(9, Math.floor(((c - w / 2) / totaal) * 10));
  }
  return deciel;
}
