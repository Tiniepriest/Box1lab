import type { Kalibratie, PopulatieHuishouden, Resultaat } from "@box1lab/engine";
import { maakToeval } from "./toeval.ts";

/*
 * Pensioenpremie van werknemers in de nagebootste bevolking, volgens CBS (data/kalibratie, sectie pensioenpremie):
 * - Wie betaalt: per werknemershuishouden een kans, zo gekozen dat het aandeel met premie klopt met CBS per
 *   10%-groep gestandaardiseerd inkomen én per leeftijdsgroep van de hoofdkostwinner (iteratief passend gemaakt,
 *   zoals bij herwegen). Daarna wordt getrokken met een vast zaad, dus de uitkomst is altijd dezelfde.
 * - Hoeveel: een vast deel van het loon, per 10%-groep zo gekozen dat premie ÷ al het loon klopt met CBS.
 * De groep hangt af van het besteedbaar inkomen, dus van de premie zelf; scripts/kalibreer.ts wisselt daarom
 * toekennen en herwegen een paar keer af.
 */

const isWerknemer = (l: PopulatieHuishouden["leden"][number]) =>
  l.soort === "werk" && !l.ondernemer && l.inkomen > 0;
const loon = (x: PopulatieHuishouden) => x.leden.reduce((s, l) => s + (isWerknemer(l) ? l.inkomen : 0), 0);

/** 10%-groep (0–9) per huishouden: evenveel (gewogen) huishoudens per groep, naar gestandaardiseerd inkomen. */
export function tienGroepen(gestandaardiseerd: number[], gewichten: number[]): number[] {
  const volgorde = gestandaardiseerd
    .map((_, i) => i)
    .sort((a, b) => gestandaardiseerd[a]! - gestandaardiseerd[b]!);
  const totaal = gewichten.reduce((a, b) => a + b, 0);
  const uit = new Array<number>(gestandaardiseerd.length);
  let cum = 0;
  for (const i of volgorde) {
    uit[i] = Math.min(9, Math.floor(((cum + gewichten[i]! / 2) / totaal) * 10));
    cum += gewichten[i]!;
  }
  return uit;
}

/** Leeftijdsgroep van een huishouden volgens de grenzen in de kalibratie. */
export function leeftijdsgroep(leeftijd: number, kal: Kalibratie): number {
  const i = kal.pensioenpremie.perLeeftijd.findIndex(
    (g) => g.totLeeftijd === null || leeftijd < g.totLeeftijd,
  );
  return i < 0 ? kal.pensioenpremie.perLeeftijd.length - 1 : i;
}

/** Zet `pensioenpremie` (euro per jaar) bij de werknemers. */
export function kenPensioenpremieToe(
  pop: PopulatieHuishouden[],
  gestandaardiseerd: number[],
  gewichten: number[],
  kal: Kalibratie,
  zaad: number,
): void {
  const pp = kal.pensioenpremie;
  const groep = tienGroepen(gestandaardiseerd, gewichten);
  const leeftijd = pop.map((x) => leeftijdsgroep(x.leeftijd, kal));
  const metLoon = pop.map((x) => loon(x) > 0);

  // 1. Kans op deelname: a[groep] × b[leeftijd], passend gemaakt op beide CBS-verdelingen.
  const doelA = pp.perDeciel.map((r) => r.huishoudensMetPremie / r.huishoudensMetLoon);
  const doelB = pp.perLeeftijd.map((r) => r.huishoudensMetPremie / r.huishoudensMetLoon);
  const a = [...doelA];
  const b = doelB.map(() => 1);
  const kans = (i: number) => Math.min(1, a[groep[i]!]! * b[leeftijd[i]!]!);
  for (let ronde = 0; ronde < 50; ronde++) {
    for (const [lijst, sleutel, doel] of [
      [a, groep, doelA],
      [b, leeftijd, doelB],
    ] as const) {
      const som = lijst.map(() => 0);
      const totaal = lijst.map(() => 0);
      pop.forEach((_, i) => {
        if (!metLoon[i]) return;
        const k = sleutel[i]!;
        som[k] = som[k]! + gewichten[i]! * kans(i);
        totaal[k] = totaal[k]! + gewichten[i]!;
      });
      lijst.forEach((v, k) => {
        if (som[k]! > 0) lijst[k] = (v * doel[k]! * totaal[k]!) / som[k]!;
      });
    }
  }
  const toeval = maakToeval(zaad);
  const doetMee = pop.map((_, i) => metLoon[i]! && toeval.uniform() < kans(i));

  // 2. Hoogte: per groep premie = factor × loon van de deelnemers, zodat premie ÷ al het loon klopt met CBS.
  const loonAlle = new Array<number>(10).fill(0);
  const loonDeelnemers = new Array<number>(10).fill(0);
  pop.forEach((x, i) => {
    const d = groep[i]!;
    loonAlle[d] = loonAlle[d]! + gewichten[i]! * loon(x);
    if (doetMee[i]) loonDeelnemers[d] = loonDeelnemers[d]! + gewichten[i]! * loon(x);
  });
  const factor = pp.perDeciel.map((r, d) =>
    loonDeelnemers[d]! > 0 ? ((r.premieMln / r.loonMln) * loonAlle[d]!) / loonDeelnemers[d]! : 0,
  );
  pop.forEach((x, i) => {
    for (const l of x.leden) {
      if (!isWerknemer(l)) continue;
      if (doetMee[i]) l.pensioenpremie = l.inkomen * factor[groep[i]!]!;
      else delete l.pensioenpremie;
    }
  });
}

/** Aandeel werknemershuishoudens met premie (%), en premie als % van het loon, voor een selectie huishoudens. */
export function pensioenCijfers(pop: PopulatieHuishouden[], res: Resultaat[], kies: (i: number) => boolean) {
  let metLoon = 0;
  let metPremie = 0;
  let totaalLoon = 0;
  let premie = 0;
  pop.forEach((x, i) => {
    if (!kies(i)) return;
    const l = loon(x);
    if (l <= 0) return;
    metLoon += x.gewicht;
    totaalLoon += x.gewicht * l;
    premie += x.gewicht * res[i]!.pensioenpremie;
    if (res[i]!.pensioenpremie > 0) metPremie += x.gewicht;
  });
  return { aandeel: (metPremie / metLoon) * 100, vanLoon: (premie / totaalLoon) * 100 };
}
