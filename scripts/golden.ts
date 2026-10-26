/*
 * Schrijft de kerncijfers van de engine naar packages/engine/test/golden/engine-<jaar>.json.
 * Draai dit na een bewuste wijziging van de rekenregels of de parameters, en verklaar de verschillen.
 *
 * Gebruik: npm run golden [-- jaar]
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { berekenGolden } from "../packages/engine/test/golden/bereken.ts";

const jaar = Number(process.argv[2] ?? 2026);
const golden = berekenGolden(jaar);
const pad = fileURLToPath(new URL(`../packages/engine/test/golden/engine-${jaar}.json`, import.meta.url));
writeFileSync(pad, JSON.stringify(golden, null, 1) + "\n");
console.log(`geschreven: packages/engine/test/golden/engine-${jaar}.json`);
for (const s of golden.scenarios) {
  console.log(
    `  ${s.id.padEnd(26)} saldo ${s.saldoMld.toFixed(2).padStart(7)} mld  armoede ${s.armoede.toFixed(2)}%  gini ${s.gini}`,
  );
}
