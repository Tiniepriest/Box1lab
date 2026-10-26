/*
 * Controleert alle databestanden: parameters, kalibratie, populatie-spec en presets.
 * Faalt (exit 1) bij een fout; meldt waarden zonder bron als waarschuwing.
 *
 * Gebruik: npm run valideer
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_MAP,
  laadKalibratie,
  laadParameters,
  laadPopulatieSpec,
  laadPresets,
  laadVoorbeelden,
} from "@box1lab/engine/node";

let fouten = 0;
const todo: string[] = [];

function zoekTodo(o: unknown, pad: string, bestand: string): void {
  if (typeof o === "string" && o.includes("TODO")) todo.push(`${bestand}: ${pad}`);
  else if (typeof o === "object" && o !== null) {
    for (const [k, v] of Object.entries(o)) zoekTodo(v, pad ? `${pad}.${k}` : k, bestand);
  }
}

function controleer(naam: string, f: () => unknown): void {
  try {
    zoekTodo(f(), "", naam);
    console.log(`  ok    ${naam}`);
  } catch (e) {
    fouten++;
    console.error(`  FOUT  ${(e as Error).message}`);
  }
}

const jaren = readdirSync(join(DATA_MAP, "parameters"))
  .map((f) => /^(\d{4})\.yaml$/.exec(f)?.[1])
  .filter((j): j is string => !!j)
  .map(Number);

console.log("Databestanden controleren:");
for (const jaar of jaren) {
  controleer(`data/parameters/${jaar}.yaml`, () => laadParameters(jaar));
  controleer(`data/kalibratie/${jaar}.yaml`, () => laadKalibratie(jaar));
  controleer(`data/populatie/spec-${jaar}.yaml`, () => laadPopulatieSpec(jaar));
}
const laatste = Math.max(...jaren);
controleer(`data/presets/ (tegen parameters ${laatste})`, () => laadPresets(laadParameters(laatste)));
controleer("data/voorbeelden/huishoudens.yaml", () => laadVoorbeelden());

if (todo.length) {
  console.log(`\nWaarschuwing: ${todo.length} waarde(n) met 'TODO: bron nodig':`);
  for (const t of todo) console.log(`  - ${t}`);
}
if (fouten) {
  console.error(`\n${fouten} fout(en) gevonden.`);
  process.exit(1);
}
console.log("\nAlle databestanden zijn geldig.");
