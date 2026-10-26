/**
 * Klasse van een relatieve verandering (in procent) volgens grenzen [a, b, c, d]:
 * 0 = verlies groter dan |a|, 1 = verlies tussen |b| en |a|, 2 = kleiner dan c, 3 = winst tot d, 4 = winst boven d.
 */
export function winnaarsKlasse(relatief: number, grenzen: readonly [number, number, number, number]): number {
  const [a, b, c, d] = grenzen;
  if (relatief < a) return 0;
  if (relatief < b) return 1;
  if (relatief <= c) return 2;
  if (relatief <= d) return 3;
  return 4;
}
