/*
 * De pagina-kant van de rekenwerker: start de worker één keer en geeft beloftes terug voor elke vraag.
 * Bij snel schuiven telt alleen de laatste vraag; oudere antwoorden worden genegeerd.
 */
import {
  kopie,
  type Armoede,
  type DecielEffect,
  type Kalibratie,
  type Oplossing,
  type Parameters,
  type PostId,
} from "@box1lab/engine";

export interface UitkomstSamenvatting {
  posten: Record<PostId, number>;
  saldoMld: number;
  armoede: Armoede;
  gini: number;
  decielen: DecielEffect[];
  winnaars: number[];
}

export interface BasisSamenvatting {
  aantal: number;
  armoede: Armoede;
  gini: number;
  /** Gestandaardiseerd besteedbaar inkomen per huishouden, voor "je plek in Nederland". */
  gestandaardiseerd: number[];
  persoonsgewichten: number[];
  /** Medianen voor "weet ik niet" in het invoerformulier. */
  standaarden: { huur: number; woz: number; rente: number };
}

export type Bericht =
  | { soort: "klaar"; basis: BasisSamenvatting }
  | { soort: "uitkomst"; id: number; uitkomst: UitkomstSamenvatting }
  | { soort: "neutraal"; id: number; oplossing: Oplossing }
  | { soort: "fout"; id?: number; melding: string };

let werker: Worker | null = null;
let klaar: Promise<BasisSamenvatting> | null = null;
let volgnummer = 0;
const wachtend = new Map<number, { goed: (v: never) => void; fout: (e: Error) => void }>();

/** Start de rekenwerker (één keer per pagina) en wacht tot de basis klaar is. */
export function startRekenen(
  params: Parameters,
  kalibratie: Kalibratie,
  url: string,
): Promise<BasisSamenvatting> {
  if (klaar) return klaar;
  werker = new Worker(new URL("./rekenwerker.ts", import.meta.url), { type: "module" });
  klaar = new Promise((goed, fout) => {
    werker!.onmessage = (e: MessageEvent<Bericht>) => {
      const b = e.data;
      if (b.soort === "klaar") return goed(b.basis);
      if (b.soort === "fout" && b.id === undefined) return fout(new Error(b.melding));
      const w = b.id !== undefined ? wachtend.get(b.id) : undefined;
      if (!w) return;
      wachtend.delete(b.id!);
      if (b.soort === "fout") w.fout(new Error(b.melding));
      else w.goed((b.soort === "uitkomst" ? b.uitkomst : b.oplossing) as never);
    };
  });
  werker.postMessage({ soort: "start", url, params: kopie(params), kalibratie: kopie(kalibratie) });
  return klaar;
}

function vraag<T>(bericht: Record<string, unknown>): Promise<T> {
  const id = ++volgnummer;
  return new Promise<T>((goed, fout) => {
    wachtend.set(id, { goed: goed as (v: never) => void, fout });
    werker!.postMessage({ ...bericht, id });
  });
}

let laatsteSimulatie = 0;

/** Rekent een scenario door. Geeft null als er inmiddels een nieuwere vraag is gesteld. */
export async function simuleerScenario(params: Parameters): Promise<UitkomstSamenvatting | null> {
  await klaar;
  const mijn = ++laatsteSimulatie;
  const u = await vraag<UitkomstSamenvatting>({ soort: "simuleer", params: kopie(params) });
  return mijn === laatsteSimulatie ? u : null;
}

export async function maakBudgetneutraal(
  params: Parameters,
  via: "vrijstelling" | "tarieven",
): Promise<Oplossing> {
  await klaar;
  return vraag<Oplossing>({ soort: "neutraal", params: kopie(params), via });
}
