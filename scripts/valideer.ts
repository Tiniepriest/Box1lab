/*
 * Controleert alle databestanden: parameters, kalibratie, populatie, presets, voorbeelden, lab, verkiezingen en de changelog.
 * Faalt (exit 1) bij een fout; meldt waarden zonder bron en ramingen als waarschuwing.
 *
 * Gebruik: npm run valideer
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DATA_MAP,
  parameterJaren,
  laadKalibratie,
  laadParameters,
  laadPopulatie,
  laadPresets,
  laadVoorbeelden,
  laadLabKnoppen,
  laadVerkiezing,
  laadVerkiezingen,
  laadChangelog,
  laadBox3Werkelijk,
} from "@box1lab/engine/node";
import { staffelSprongen, type Parameters } from "@box1lab/engine";

let fouten = 0;
const todo: string[] = [];
const ramingen: string[] = [];

function zoekTodo(o: unknown, pad: string, bestand: string): void {
  if (typeof o === "string") {
    if (o.includes("TODO")) todo.push(`${bestand}: ${pad}`);
    if (o.includes("Raming:")) ramingen.push(`${bestand}: ${pad}`);
  } else if (typeof o === "object" && o !== null) {
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

const jaren = parameterJaren();

console.log("Databestanden controleren:");
/** Elke staffel van de heffingskortingen loopt door: geen sprong waar een stuk begint (een tikfout). */
function staffelsDoorlopend(p: Parameters): Parameters {
  const h = p.heffingskortingen;
  const staffels = {
    "algemeen.staffel": h.algemeen.staffel,
    "algemeen.staffelAow": h.algemeen.staffelAow,
    "arbeid.staffel": h.arbeid.staffel,
    "arbeid.staffelAow": h.arbeid.staffelAow,
    "ouderen.staffel": h.ouderen.staffel,
    "combinatie.staffel": h.combinatie.staffel,
    "combinatie.staffelAow": h.combinatie.staffelAow,
  };
  const fout = Object.entries(staffels).flatMap(([naam, s]) =>
    staffelSprongen(s).map(
      (x) =>
        `heffingskortingen.${naam}: bij € ${x.vanaf} komt het vorige stuk uit op € ${x.verwacht.toFixed(2)}, maar het nieuwe begint bij € ${x.bedrag}`,
    ),
  );
  if (fout.length) throw new Error(`data/parameters/${p.jaar}.yaml: ${fout.join("; ")}`);
  return p;
}

for (const jaar of jaren) {
  controleer(`data/parameters/${jaar}.yaml`, () => staffelsDoorlopend(laadParameters(jaar)));
  // Een nieuw (voorlopig) jaar heeft nog geen kalibratie en bevolking; dan rekent alleen de calculator ermee.
  if (existsSync(join(DATA_MAP, `kalibratie/${jaar}.yaml`))) {
    controleer(`data/kalibratie/${jaar}.yaml`, () => laadKalibratie(jaar));
    controleer(`data/populatie/${jaar}.json`, () => laadPopulatie(jaar).huishoudens.length);
  } else {
    console.log(
      `  —     data/kalibratie/${jaar}.yaml bestaat nog niet: geen landelijke doorrekening voor ${jaar}`,
    );
  }
}
const laatste = Math.max(...jaren);
controleer(`data/presets/ (tegen parameters ${laatste})`, () => laadPresets(laadParameters(laatste)));
controleer("data/voorbeelden/huishoudens.yaml", () => laadVoorbeelden());
controleer(`data/lab/knoppen.yaml (tegen parameters ${laatste})`, () =>
  laadLabKnoppen(laadParameters(laatste)),
);
for (const v of laadVerkiezingen()) {
  controleer(`data/verkiezingen/${v}/ (alle partijen, ook concepten)`, () => laadVerkiezing(v, true));
}
controleer("data/vooruitblik/box3-2029.yaml", () => laadBox3Werkelijk(2029));
controleer("data/changelog.yaml", () => laadChangelog());

if (todo.length) {
  console.log(`\nWaarschuwing: ${todo.length} waarde(n) met 'TODO: bron nodig':`);
  for (const t of todo) console.log(`  - ${t}`);
}
if (ramingen.length) {
  console.log(`
Waarschuwing: ${ramingen.length} raming(en); vervang ze door de officiële bedragen zodra die er zijn:`);
  for (const r of ramingen) console.log(`  - ${r}`);
}
if (fouten) {
  console.error(`\n${fouten} fout(en) gevonden.`);
  process.exit(1);
}
console.log("\nAlle databestanden zijn geldig.");
