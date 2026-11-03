import { box3, type Kalibratie, type Parameters, type PopulatieHuishouden } from "@box1lab/engine";
import { tienGroepen } from "./pensioen.ts";
import { maakToeval } from "./toeval.ts";

/*
 * Vermogen in box 3 in de nagebootste bevolking, volgens CBS (data/kalibratie, sectie vermogen; D-073).
 * Per bestanddeel (spaargeld, effecten, onroerend goed behalve de eigen woning, overige bezittingen, studieschuld en
 * andere schulden):
 * - Wie het heeft: een kans uit de 10%-groep gestandaardiseerd inkomen en de leeftijdsgroep van de hoofdkostwinner
 *   (kans groep × kans leeftijd ÷ kans iedereen).
 * - Hoeveel: lognormaal, met de mediaan van groep × leeftijd ÷ iedereen en de spreiding die past bij gemiddelde en
 *   mediaan van de 10%-groep (gemiddelde ÷ mediaan = e^(σ²/2)).
 * - Daarna per 10%-groep geschaald, zodat het totaal klopt met CBS.
 * Het vermogen voor de vermogensgrens van de toeslagen is de rendementsgrondslag van box 3.
 */

const DELEN = ["bank", "effecten", "onroerendGoed", "overig", "studieschuld", "schulden"] as const;
type Deel = (typeof DELEN)[number];

/** Leeftijdsgroep van de hoofdkostwinner volgens de grenzen in de sectie vermogen. */
function leeftijdsgroep(leeftijd: number, kal: Kalibratie): number {
  const g = kal.vermogen.perLeeftijd;
  const i = g.findIndex((x) => x.totLeeftijd === null || leeftijd < x.totLeeftijd);
  return i < 0 ? g.length - 1 : i;
}

/** Zet `box3` en `vermogen` bij elk huishouden. */
export function kenVermogenToe(
  pop: PopulatieHuishouden[],
  gestandaardiseerd: number[],
  gewichten: number[],
  kal: Kalibratie,
  params: Parameters,
  zaad: number,
): void {
  const v = kal.vermogen;
  const groep = tienGroepen(gestandaardiseerd, gewichten);
  const leeftijd = pop.map((x) => leeftijdsgroep(x.leeftijd, kal));
  const toeval = maakToeval(zaad);
  const bedragen = {} as Record<Deel, number[]>;

  for (const deel of DELEN) {
    const [hebbenAlle, , , mediaanAlle] = v.totaal[deel];
    const kansAlle = hebbenAlle / v.totaal.huishoudens;
    const waarden = pop.map((_, i) => {
      const g = v.perDeciel[groep[i]!]!;
      const a = v.perLeeftijd[leeftijd[i]!]!;
      // Altijd twee trekkingen, zodat de reeks niet afhangt van eerdere uitkomsten.
      const u = toeval.uniform();
      const z = toeval.normaal();
      const kans = Math.min(0.995, ((g[deel][0] / g.huishoudens) * (a[deel][0] / a.huishoudens)) / kansAlle);
      if (u >= kans) return 0;
      const mediaan = mediaanAlle > 0 ? (g[deel][3] * a[deel][3]) / mediaanAlle : g[deel][3];
      const verhouding = g[deel][3] > 0 ? g[deel][2] / g[deel][3] : 1;
      const sigma = Math.min(3, Math.sqrt(2 * Math.log(Math.max(1, verhouding))));
      return 1000 * mediaan * Math.exp(sigma * z);
    });
    // Per 10%-groep schalen op het CBS-totaal.
    for (let d = 0; d < 10; d++) {
      const doel = v.perDeciel[d]![deel][1] * 1e9;
      const som = waarden.reduce((s, x, i) => s + (groep[i] === d ? gewichten[i]! * x : 0), 0);
      if (som <= 0) continue;
      waarden.forEach((x, i) => {
        if (groep[i] === d) waarden[i] = (x * doel) / som;
      });
    }
    bedragen[deel] = waarden;
  }

  pop.forEach((x, i) => {
    const b = {
      bank: bedragen.bank[i]!,
      overig: bedragen.effecten[i]! + bedragen.onroerendGoed[i]! + bedragen.overig[i]!,
      schulden: bedragen.studieschuld[i]! + bedragen.schulden[i]!,
    };
    x.box3 = b;
    x.vermogen = Math.max(0, box3(b, x.partners, params).rendementsgrondslag);
  });
}
