import { z } from "zod";
import { valideerParameters, type Parameters } from "./schema.ts";

/*
 * Een scenario (preset, partijprogramma, of een instelling in het lab) is een lijst wijzigingen op een
 * parameterset. Een wijziging wijst met een pad naar één waarde in het parameterbestand, bijvoorbeeld
 * "heffingskortingen.algemeen.niveau" of "box1.schijven.0.tarief", en zegt wat ermee gebeurt:
 *
 *   zet:  vervang door deze waarde (ook voor lijsten, zoals alle schijven tegelijk)
 *   plus: tel dit getal erbij op
 *   maal: vermenigvuldig met dit getal
 *
 * Omdat een scenario alleen verschillen beschrijft, gaat het vanzelf mee met een nieuw parameterjaar.
 */

const pad = z.string().regex(/^[A-Za-z]\w*(\.\w+)*$/, "Een parameterpad ziet eruit als 'box1.vrijstelling'.");

export const wijzigingSchema = z.union([
  z.strictObject({ parameter: pad, zet: z.unknown() }),
  z.strictObject({ parameter: pad, plus: z.number().finite() }),
  z.strictObject({ parameter: pad, maal: z.number().finite() }),
]);

export type Wijziging = z.infer<typeof wijzigingSchema>;

type Container = Record<string, unknown> | unknown[];

/**
 * Diepe kopie van gewone data (getallen, tekst, ja/nee, null, lijsten en objecten). Anders dan structuredClone
 * werkt dit ook op proxies, zoals de reactieve objecten van Svelte.
 */
export function kopie<T>(x: T): T {
  if (Array.isArray(x)) return x.map(kopie) as T;
  if (typeof x === "object" && x !== null) {
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, kopie(v)])) as T;
  }
  return x;
}

function isContainer(v: unknown): v is Container {
  return typeof v === "object" && v !== null;
}

function segmenten(parameter: string): string[] {
  return parameter.split(".");
}

/** Geeft de waarde op een pad, of gooit een leesbare fout als het pad niet bestaat. */
export function leesParameter(params: unknown, parameter: string): unknown {
  let node: unknown = params;
  for (const s of segmenten(parameter)) {
    if (!isContainer(node) || !(s in node)) {
      throw new Error(`Onbekende parameter '${parameter}': '${s}' bestaat niet.`);
    }
    node = (node as Record<string, unknown>)[s];
  }
  return node;
}

/** Bestaat dit pad in de parameterset? Gebruikt door de validatie van presets en partijen. */
export function bestaatParameter(params: unknown, parameter: string): boolean {
  try {
    leesParameter(params, parameter);
    return true;
  } catch {
    return false;
  }
}

function pasEenToe(params: Parameters, w: Wijziging): void {
  const s = segmenten(w.parameter);
  const laatste = s.pop()!;
  const ouder = s.length ? leesParameter(params, s.join(".")) : params;
  if (!isContainer(ouder) || !(laatste in ouder)) {
    throw new Error(`Onbekende parameter '${w.parameter}': '${laatste}' bestaat niet.`);
  }
  const o = ouder as Record<string, unknown>;
  if ("zet" in w) {
    o[laatste] = kopie(w.zet);
    return;
  }
  const huidig = o[laatste];
  if (typeof huidig !== "number") {
    throw new Error(
      `Parameter '${w.parameter}' is geen getal; gebruik 'zet' in plaats van 'plus' of 'maal'.`,
    );
  }
  o[laatste] = "plus" in w ? huidig + w.plus : huidig * w.maal;
}

/**
 * Past wijzigingen toe op een kopie van de parameters en controleert het resultaat opnieuw tegen het schema.
 * Zonder wijzigingen komt hetzelfde object terug, zodat "huidig beleid" herkenbaar blijft als basis.
 */
export function pasToe(params: Parameters, wijzigingen: readonly Wijziging[], bron = "scenario"): Parameters {
  if (wijzigingen.length === 0) return params;
  const nieuw = kopie(params);
  for (const w of wijzigingen) pasEenToe(nieuw, w);
  return valideerParameters(nieuw, bron);
}

/**
 * Het omgekeerde van pasToe: welke wijzigingen maken van `basis` het `scenario`? Lijsten (zoals de schijven)
 * worden in hun geheel vergeleken. Bronvermeldingen tellen niet mee. Gebruikt voor de deelbare scenariocode.
 */
export function verschil(basis: unknown, scenario: unknown, prefix = ""): Wijziging[] {
  if (Array.isArray(basis) || Array.isArray(scenario) || !isContainer(basis) || !isContainer(scenario)) {
    return JSON.stringify(basis) === JSON.stringify(scenario) ? [] : [{ parameter: prefix, zet: scenario }];
  }
  const uit: Wijziging[] = [];
  for (const k of Object.keys(scenario)) {
    if (k === "bron") continue;
    const p = prefix ? `${prefix}.${k}` : k;
    uit.push(...verschil((basis as Record<string, unknown>)[k], (scenario as Record<string, unknown>)[k], p));
  }
  return uit;
}
