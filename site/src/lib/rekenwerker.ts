/*
 * Rekenwerk op de achtergrond (Web Worker, HANDOFF §5.1): de populatie laden, de basis bouwen, scenario's
 * doorrekenen en budgetneutraal maken. Zo blijft de pagina vloeiend, ook bij de oplosser.
 * Alleen de samenvattingen gaan terug naar de pagina, niet de resultaten per huishouden.
 */
import {
  budgetneutraalViaTarieven,
  budgetneutraalViaVrijstelling,
  maakBasis,
  simuleer,
  type Basis,
  type Kalibratie,
  type Parameters,
  type Populatie,
} from "@box1lab/engine";
import type { BasisSamenvatting, Bericht, UitkomstSamenvatting } from "./rekenen.ts";

let basis: Basis | null = null;

function samenvatUitkomst(u: ReturnType<typeof simuleer>): UitkomstSamenvatting {
  return {
    posten: u.posten,
    saldoMld: u.saldoMld,
    armoede: u.armoede,
    gini: u.gini,
    decielen: u.decielen,
    winnaars: u.winnaars,
  };
}

function samenvatBasis(b: Basis): BasisSamenvatting {
  return {
    aantal: b.populatie.length,
    armoede: b.armoede,
    gini: b.gini,
    gestandaardiseerd: b.resultaten.map((r) => r.besteedbaar / r.equivalentie),
    persoonsgewichten: b.persoonsgewichten,
  };
}

function stuur(b: Bericht) {
  (self as unknown as Worker).postMessage(b);
}

self.onmessage = async (e: MessageEvent) => {
  const m = e.data as
    | { soort: "start"; url: string; params: Parameters; kalibratie: Kalibratie }
    | { soort: "simuleer"; id: number; params: Parameters }
    | { soort: "neutraal"; id: number; params: Parameters; via: "vrijstelling" | "tarieven" };
  try {
    if (m.soort === "start") {
      const r = await fetch(m.url);
      if (!r.ok) throw new Error(`Populatie laden mislukt (${r.status})`);
      // Het bestand is tijdens de build en in CI al tegen het schema gecontroleerd.
      const json = (await r.json()) as Populatie;
      if (!Array.isArray(json?.huishoudens)) throw new Error("Populatiebestand heeft een onverwacht formaat");
      basis = maakBasis(m.params, json.huishoudens, m.kalibratie);
      stuur({ soort: "klaar", basis: samenvatBasis(basis) });
      return;
    }
    if (!basis) throw new Error("Het model is nog niet geladen");
    if (m.soort === "simuleer") {
      stuur({ soort: "uitkomst", id: m.id, uitkomst: samenvatUitkomst(simuleer(basis, m.params)) });
    } else {
      const o =
        m.via === "vrijstelling"
          ? budgetneutraalViaVrijstelling(basis, m.params)
          : budgetneutraalViaTarieven(basis, m.params);
      stuur({ soort: "neutraal", id: m.id, oplossing: o });
    }
  } catch (fout) {
    stuur({ soort: "fout", id: "id" in m ? m.id : undefined, melding: (fout as Error).message });
  }
};
