/*
 * "Gerekend met jouw situatie": de korte samenvatting van het formulier in de situatiekolom (D-064).
 */
import type { Invoer, PersoonInvoer } from "@box1lab/engine";
import { euro } from "./format.ts";

/** Gebeurtenis op `window`: open de situatiekolom (bijvoorbeeld vanuit "Wat betekent dit voor jou?"). */
export const OPEN_SITUATIE = "box1lab:open-situatie";

export function openSituatie(): void {
  window.dispatchEvent(new Event(OPEN_SITUATIE));
}

/** Begint met een kleine letter, behalve afkortingen (AOW, WW). */
function inkomen(p: PersoonInvoer): string {
  const bedrag = `${euro(p.bedrag)} per ${p.periode}`;
  switch (p.soort) {
    case "loondienst":
      return `loondienst, ${bedrag} bruto${p.periode === "maand" && p.dertiendeMaand ? " + 13e maand" : ""}`;
    case "zzp":
      return `zzp, winst ${bedrag}`;
    case "bijstand":
      return "bijstand";
    case "werknemersverzekering":
      return `WW of WIA, ${bedrag} bruto`;
    case "aow":
      return p.bedrag > 0 ? `AOW en pensioen ${bedrag}` : "AOW";
    case "geen":
      return "geen inkomen";
  }
}

/** Regels als "Met partner, 2 kinderen", "Jij: loondienst, € 3.200 per maand bruto", "Huur € 850 per maand". */
export function samenvatting(invoer: Invoer): string[] {
  const partner = invoer.personen.length === 2;
  const k = invoer.kinderen.length;
  const regels = [
    `${partner ? "Met partner" : "Alleenstaand"}${k ? `, ${k} ${k === 1 ? "kind" : "kinderen"}` : ""}`,
  ];
  invoer.personen.forEach((p, i) =>
    regels.push(
      partner
        ? `${i === 0 ? "Jij" : "Partner"}: ${inkomen(p)}`
        : inkomen(p).replace(/^./, (c) => c.toUpperCase()),
    ),
  );
  if (invoer.wonen === "koop") regels.push(`Koopwoning, WOZ ${euro(invoer.woz)}`);
  else regels.push(invoer.huurPerMaand > 0 ? `Huur ${euro(invoer.huurPerMaand)} per maand` : "Geen huur");
  return regels;
}
