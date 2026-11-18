/*
 * Verkiezingen tijdens de build: partijen inlezen (alleen gepubliceerd, tenzij in een previewbuild) en het
 * macrobeeld per partij uitrekenen op de volledige populatie.
 */
import {
  giniWereldPlek,
  maakBasis,
  pasToe,
  partijWijzigingen,
  simuleer,
  type Basis,
  type Parameters,
  type Partij,
  type Verkiezing,
} from "@box1lab/engine";
import { laadParameters, laadPopulatie, laadVerkiezing, laadVerkiezingen } from "@box1lab/engine/node";
import { basis } from "./basis.ts";
import { JAAR, giniLanden, kalibratie, params } from "./data.ts";

export const PREVIEW = import.meta.env.PUBLIC_VERKIEZINGEN_PREVIEW === "1";

export interface Macro {
  saldoMld: number;
  armoede: number;
  armoedeNu: number;
  gini: number;
  giniNu: number;
  /** Plek van Nederland in de wereld op de Gini (1 = gelijkst), nu en met het plan, van `landen` landen. */
  giniPlek: number;
  giniPlekNu: number;
  landen: number;
  decielen: number[];
}

export interface VerkiezingData {
  verkiezing: Verkiezing;
  /** Parameters van het basispad. */
  params: Parameters;
  partijen: Partij[];
  macro: Record<string, Macro>;
}

/**
 * Basispad in een ander jaar dan de site (bijvoorbeeld het Belastingplan van volgend jaar): de regels van dat jaar
 * op de huidige nagebootste bevolking, zolang er voor dat jaar geen eigen kalibratie is (D-063).
 */
function basisVoor(jaar: number): { p: Parameters; b: Basis } {
  if (jaar === JAAR) return { p: params, b: basis };
  const p = laadParameters(jaar);
  return { p, b: maakBasis(p, laadPopulatie(JAAR).huishoudens, kalibratie) };
}

export function verkiezingData(id: string): VerkiezingData {
  const { verkiezing, partijen } = laadVerkiezing(id, PREVIEW);
  const { p: basisParams, b } = basisVoor(verkiezing.basispad.jaar);
  const macro = Object.fromEntries(
    partijen.map((p) => {
      const u = simuleer(b, pasToe(basisParams, partijWijzigingen(p)));
      const plek = giniWereldPlek(giniLanden, u.gini, b.gini);
      return [
        p.id,
        {
          saldoMld: u.saldoMld,
          armoede: u.armoede.personen,
          armoedeNu: b.armoede.personen,
          gini: u.gini,
          giniNu: b.gini,
          giniPlek: plek.plek,
          giniPlekNu: giniWereldPlek(giniLanden, b.gini, b.gini).plek,
          landen: plek.van,
          decielen: u.decielen.map((d) => d.relatief),
        },
      ];
    }),
  );
  return { verkiezing, params: basisParams, partijen, macro };
}

export const verkiezingIds = laadVerkiezingen();
