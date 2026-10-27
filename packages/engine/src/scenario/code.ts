import { z } from "zod";
import type { Parameters } from "../parameters/schema.ts";
import { pasToe, wijzigingSchema, type Wijziging } from "../parameters/wijzig.ts";

/*
 * Deelbare scenariocode: de lijst wijzigingen als base64url-JSON, voor achter een # in de link.
 * Omdat een scenario alleen verschillen bevat, blijft een gedeelde link werken na een nieuw parameterjaar,
 * zolang de parameters met dezelfde naam blijven bestaan.
 */

const codeSchema = z.strictObject({ v: z.literal(1), w: z.array(wijzigingSchema) });

function naarBase64Url(tekst: string): string {
  const bytes = new TextEncoder().encode(tekst);
  let binair = "";
  for (const b of bytes) binair += String.fromCharCode(b);
  return btoa(binair).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function vanBase64Url(code: string): string {
  let b64 = code.trim().replace(/^#/, "").replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const binair = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(binair, (c) => c.charCodeAt(0)));
}

export function codeerScenario(wijzigingen: readonly Wijziging[]): string {
  return naarBase64Url(JSON.stringify({ v: 1, w: wijzigingen }));
}

/**
 * Leest een scenariocode en controleert hem tegen de parameters.
 * Gooit een fout met een leesbare melding als de code kapot is of een onbekende parameter bevat.
 */
export function decodeerScenario(code: string, params: Parameters): Wijziging[] {
  let data: unknown;
  try {
    data = JSON.parse(vanBase64Url(code));
  } catch (e) {
    throw new Error("Deze scenariocode is niet leesbaar.", { cause: e });
  }
  const r = codeSchema.safeParse(data);
  if (!r.success) throw new Error("Deze scenariocode heeft een onbekend formaat.");
  pasToe(params, r.data.w, "scenariocode");
  return r.data.w;
}
