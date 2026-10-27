import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  leesYaml,
  valideerKalibratie,
  valideerParameters,
  valideerPopulatie,
  valideerPreset,
  valideerVoorbeelden,
  valideerLabKnoppen,
  type Kalibratie,
  type Parameters,
  type Populatie,
  type Preset,
  type Voorbeelden,
  type LabKnoppen,
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

/** De herwogen populatie, gemaakt door `npm run kalibreer`. */
export function laadPopulatie(jaar: number): Populatie {
  const pad = join(DATA_MAP, `populatie/${jaar}.json`);
  return valideerPopulatie(JSON.parse(readFileSync(pad, "utf8")), `data/populatie/${jaar}.json`);
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

export function laadVoorbeelden(): Voorbeelden {
  return valideerVoorbeelden(lees("voorbeelden/huishoudens.yaml"), "data/voorbeelden/huishoudens.yaml");
}

export function laadLabKnoppen(params: Parameters): LabKnoppen {
  return valideerLabKnoppen(lees("lab/knoppen.yaml"), params, "data/lab/knoppen.yaml");
}
