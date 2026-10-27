/*
 * Data voor de build (alleen server-side, in de frontmatter van .astro-bestanden). Leest en valideert de
 * YAML-bestanden via de engine; een fout in de data laat de build falen.
 */
import { MODEL_VERSIE } from "@box1lab/engine";
import {
  laadKalibratie,
  laadLabKnoppen,
  laadParameters,
  laadPresets,
  laadVoorbeelden,
} from "@box1lab/engine/node";

export const JAAR = 2026;
export const params = laadParameters(JAAR);
export const presets = laadPresets(params);
export const voorbeelden = laadVoorbeelden();
export const labKnoppen = laadLabKnoppen(params);
export const kalibratie = laadKalibratie(JAAR);
export { MODEL_VERSIE };

export { pad } from "./pad.ts";
