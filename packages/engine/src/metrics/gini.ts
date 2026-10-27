/** Gewogen Gini-coëfficiënt (0 = iedereen evenveel, 1 = één persoon heeft alles). */
export function gini(waarden: readonly number[], gewichten: readonly number[]): number {
  const idx = waarden.map((_, i) => i).sort((a, b) => waarden[a]! - waarden[b]!);
  let totaalGewicht = 0;
  let totaal = 0;
  for (const i of idx) {
    totaalGewicht += gewichten[i]!;
    totaal += gewichten[i]! * waarden[i]!;
  }
  let cumulatief = 0;
  let oppervlak = 0;
  for (const i of idx) {
    const w = gewichten[i]!;
    cumulatief += w * waarden[i]!;
    oppervlak += w * (cumulatief - (w * waarden[i]!) / 2);
  }
  return 1 - (2 * oppervlak) / (totaalGewicht * totaal);
}
