import type { Invoer } from "./invoer.ts";
import type { Parameters } from "./parameters/schema.ts";
import { belastingBox1 } from "./regels/box1.ts";
import type { PersoonKenmerken } from "./regels/heffingskortingen.ts";

/*
 * Wat er ongeveer op de loonstrook staat (D-074): het netto maandloon, en apart wat vakantiegeld, 13e maand en
 * bonus netto opleveren. Zo kan iemand de berekening naast de eigen loonstrook leggen.
 *
 * De loonheffing rekenen we over het hele jaar, zoals de aangifte: het netto maandloon is een twaalfde van het
 * netto jaarloon zonder extra's, en elke extra levert op wat het netto jaarinkomen erdoor stijgt. Een werkgever
 * houdt over extra's het tarief voor bijzondere beloningen in; dat komt daar ongeveer op uit. Niet op de
 * loonstrook en dus ook hier niet: de combinatiekorting en de hypotheekrenteaftrek (die komen via de aangifte),
 * toeslagen en de premie van de zorgverzekering.
 */

export interface Extra {
  bruto: number;
  netto: number;
}

export interface Loonstrook {
  /** Index in `invoer.personen`. */
  persoon: number;
  uitkering: boolean;
  brutoPerMaand: number;
  pensioenpremiePerMaand: number;
  loonheffingPerMaand: number;
  nettoPerMaand: number;
  /** Zit het vakantiegeld al in het maandbedrag? Dan is `vakantiegeld` null. */
  vakantiegeldInMaand: boolean;
  vakantiegeld: Extra | null;
  dertiendeMaand: Extra | null;
  bonus: Extra | null;
}

/** Een loonstrook per werknemer of uitkeringsgerechtigde die een bedrag per maand invulde. */
export function loonstrook(invoer: Invoer, p: Parameters): Loonstrook[] {
  const uit: Loonstrook[] = [];
  invoer.personen.forEach((persoon, i) => {
    const werk = persoon.soort === "loondienst";
    if (!werk && persoon.soort !== "werknemersverzekering") return;
    if (persoon.periode !== "maand" || persoon.bedrag <= 0) return;
    const k: PersoonKenmerken = {
      werkt: werk,
      aow: false,
      alleenstaand: invoer.personen.length === 1,
      combinatiekorting: false,
    };
    const premie = werk ? persoon.pensioenpremiePerMaand * 12 : 0;
    const heffing = (bruto: number) => {
      const loon = Math.max(0, bruto - premie);
      return belastingBox1(loon, werk ? loon : 0, p, k);
    };
    const netto = (bruto: number) => bruto - premie - heffing(bruto);

    const gewoon = persoon.bedrag * 12;
    const vg = persoon.inclusiefVakantiegeld ? 0 : (gewoon * p.loon.vakantiegeld) / 100;
    const dertiende = werk && persoon.dertiendeMaand ? persoon.bedrag : 0;
    const bonus = werk ? persoon.extraPerJaar : 0;
    // Elke extra bovenop de vorige, in de volgorde van het jaar: vakantiegeld in mei, 13e maand en bonus later.
    const extra = (vanaf: number, bedrag: number): Extra | null =>
      bedrag > 0 ? { bruto: bedrag, netto: netto(vanaf + bedrag) - netto(vanaf) } : null;

    uit.push({
      persoon: i,
      uitkering: !werk,
      brutoPerMaand: persoon.bedrag,
      pensioenpremiePerMaand: premie / 12,
      loonheffingPerMaand: heffing(gewoon) / 12,
      nettoPerMaand: netto(gewoon) / 12,
      vakantiegeldInMaand: persoon.inclusiefVakantiegeld,
      vakantiegeld: extra(gewoon, vg),
      dertiendeMaand: extra(gewoon + vg, dertiende),
      bonus: extra(gewoon + vg + dertiende, bonus),
    });
  });
  return uit;
}
