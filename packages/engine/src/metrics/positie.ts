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

/**
 * Een compacte verdeling: de grenswaarden waaronder 1/n, 2/n, …, (n−1)/n van het totale gewicht valt. Daarmee
 * bepaalt de browser "je plek in Nederland" zonder de hele bevolking te laden (D-066).
 */
export function verdeling(waarden: readonly number[], gewichten: readonly number[], n: number): number[] {
  const paren = waarden.map((v, i) => [v, gewichten[i]!] as const).sort((a, b) => a[0] - b[0]);
  const totaal = paren.reduce((s, [, w]) => s + w, 0);
  const grenzen: number[] = [];
  let som = 0;
  for (const [v, w] of paren) {
    som += w;
    while (grenzen.length < n - 1 && som >= ((grenzen.length + 1) / n) * totaal) grenzen.push(v);
  }
  return grenzen;
}

/** Zoals `aandeelOnder`, maar uit een verdeling van `verdeling`: tot op 1/n nauwkeurig. */
export function aandeelUitVerdeling(waarde: number, grenzen: readonly number[]): number {
  let laag = 0;
  let hoog = grenzen.length;
  // Aantal grenzen lager dan de waarde (binair zoeken; de grenzen zijn oplopend).
  while (laag < hoog) {
    const midden = (laag + hoog) >> 1;
    if (grenzen[midden]! < waarde) laag = midden + 1;
    else hoog = midden;
  }
  return laag / (grenzen.length + 1);
}
