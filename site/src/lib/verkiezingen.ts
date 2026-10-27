/*
 * Verkiezingen tijdens de build: partijen inlezen (alleen gepubliceerd, tenzij in een previewbuild) en het
 * macrobeeld per partij uitrekenen op de volledige populatie.
 */
import { pasToe, partijWijzigingen, simuleer, type Partij, type Verkiezing } from "@box1lab/engine";
import { laadVerkiezing, laadVerkiezingen } from "@box1lab/engine/node";
import { basis } from "./basis.ts";
import { JAAR, params } from "./data.ts";

export const PREVIEW = import.meta.env.PUBLIC_VERKIEZINGEN_PREVIEW === "1";

export interface Macro {
  saldoMld: number;
  armoede: number;
  armoedeNu: number;
  gini: number;
  giniNu: number;
  decielen: number[];
}

export interface VerkiezingData {
  verkiezing: Verkiezing;
  partijen: Partij[];
  macro: Record<string, Macro>;
}

export function verkiezingData(id: string): VerkiezingData {
  const { verkiezing, partijen } = laadVerkiezing(id, PREVIEW);
  if (verkiezing.basispad.jaar !== JAAR) {
    throw new Error(
      `Verkiezing '${id}' gebruikt basispad ${verkiezing.basispad.jaar}; de site rekent met ${JAAR}.`,
    );
  }
  const macro = Object.fromEntries(
    partijen.map((p) => {
      const u = simuleer(basis, pasToe(params, partijWijzigingen(p)));
      return [
        p.id,
        {
          saldoMld: u.saldoMld,
          armoede: u.armoede.personen,
          armoedeNu: basis.armoede.personen,
          gini: u.gini,
          giniNu: basis.gini,
          decielen: u.decielen.map((d) => d.relatief),
        },
      ];
    }),
  );
  return { verkiezing, partijen, macro };
}

export const verkiezingIds = laadVerkiezingen();
