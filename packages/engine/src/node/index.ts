import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  leesYaml,
  valideerKalibratie,
  valideerParameters,
  valideerPopulatieSpec,
  valideerPreset,
  type Kalibratie,
  type Parameters,
  type PopulatieSpec,
  type Preset,
} from "../index.ts";

/*
 * Bestanden uit data/ inlezen en valideren. Alleen voor Node (tests, scripts, de sitebuild);
 * de rekenkern zelf doet geen bestandstoegang.
 */

export const DATA_MAP = fileURLToPath(new URL("../../../../data/", import.meta.url));

function lees(relatief: string): unknown {
  return leesYaml(readFileSync(join(DATA_MAP, relatief), "utf8"), `data/${relatief}`);
}

export function laadParameters(jaar: number): Parameters {
  return valideerParameters(lees(`parameters/${jaar}.yaml`), `data/parameters/${jaar}.yaml`);
}

export function laadKalibratie(jaar: number): Kalibratie {
  return valideerKalibratie(lees(`kalibratie/${jaar}.yaml`), `data/kalibratie/${jaar}.yaml`);
}

export function laadPopulatieSpec(jaar: number): PopulatieSpec {
  return valideerPopulatieSpec(lees(`populatie/spec-${jaar}.yaml`), `data/populatie/spec-${jaar}.yaml`);
}

/** Alle presets, gevalideerd tegen de parameters en gesorteerd op `volgorde`. */
export function laadPresets(params: Parameters): Preset[] {
  return readdirSync(join(DATA_MAP, "presets"))
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => {
      const preset = valideerPreset(lees(`presets/${f}`), params, `data/presets/${f}`);
      if (`${preset.id}.yaml` !== f)
        throw new Error(`data/presets/${f}: id '${preset.id}' moet gelijk zijn aan de bestandsnaam.`);
      return preset;
    })
    .sort((a, b) => a.volgorde - b.volgorde);
}
