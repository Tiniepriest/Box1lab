/*
 * Kerncijfers per voorstel, berekend tijdens de build (alleen server-side). Gebruikt door de voorstellenpagina
 * en de deelafbeeldingen.
 */
import { codeerScenario, pasToe, simuleer, type Preset } from "@box1lab/engine";
import { basis } from "./basis.ts";
import { params, presets } from "./data.ts";

export interface Kerncijfers {
  preset: Preset;
  code: string;
  saldoMld: number;
  achteruit: number;
  vooruit: number;
  armoedeNu: number;
  armoede: number;
  gini: number;
  giniNu: number;
  decielen: number[];
}

export const kerncijfers: Kerncijfers[] = presets
  .filter((p) => p.wijzigingen.length > 0)
  .map((preset) => {
    const u = simuleer(basis, pasToe(params, preset.wijzigingen));
    return {
      preset,
      code: codeerScenario(preset.wijzigingen),
      saldoMld: u.saldoMld,
      achteruit: u.winnaars[0]! + u.winnaars[1]!,
      vooruit: u.winnaars[3]! + u.winnaars[4]!,
      armoedeNu: basis.armoede.personen,
      armoede: u.armoede.personen,
      gini: u.gini,
      giniNu: basis.gini,
      decielen: u.decielen.map((d) => d.relatief),
    };
  });

/** Eén zin die de kern samenvat, ook gebruikt op de deelafbeelding. */
export function kernzin(k: Kerncijfers): string {
  const nl = (v: number) => Math.round(v).toLocaleString("nl-NL");
  const laagste = k.decielen[0]!;
  const groep =
    Math.abs(laagste) < 0.5
      ? "De laagste inkomens merken er weinig van"
      : `De laagste inkomens gaan er gemiddeld ${nl(Math.abs(laagste))}% op ${laagste < 0 ? "achteruit" : "vooruit"}`;
  return `${nl(k.achteruit)}% van de mensen gaat erop achteruit, ${nl(k.vooruit)}% erop vooruit. ${groep}.`;
}
