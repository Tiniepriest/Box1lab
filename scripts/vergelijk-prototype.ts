/*
 * Vergelijkt de huidige engine met de baseline van het prototype (HANDOFF §2) en print een Markdown-tabel.
 * Gebruikt om verschillen te verklaren in docs/DECISIONS.md.
 *
 * Gebruik: npm run vergelijk
 */
import prototype from "../packages/engine/test/golden/prototype-2026.json" with { type: "json" };
import { berekenGolden } from "../packages/engine/test/golden/bereken.ts";

const nu = berekenGolden(2026);
// Op dezelfde plek als de scenario's van het prototype. De vlaktaks is sinds D-067 anders (35% boven € 24.000) en
// dus niet meer te vergelijken.
const PROTOTYPE_IDS = [
  "huidig",
  null,
  "drie-schijven-35-40-45",
  "zonder-huurtoeslag",
  "zonder-hra",
  "zonder-hra-en-forfait",
];
const f = (x: number, d = 1) =>
  x.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });

console.log("| Post | Prototype | Nu |\n|---|---|---|");
const k = nu.kalibratie.modelMld;
const pk = prototype.kalibratie.modelMld;
for (const [naam, a, b] of [
  ["IB + premies na HRA (mld)", pk.ib, k.ibNaHra],
  ["Hypotheekrente (mld)", pk.hypotheekrente, k.hypotheekrente],
  ["Zorgtoeslag (mld)", pk.zorgtoeslag, k.zorgtoeslag],
  ["Huurtoeslag (mld)", pk.huurtoeslag, k.huurtoeslag],
  ["Kindgebonden budget (mld)", pk.kgb, k.kindgebondenBudget],
  ["Kinderopvangtoeslag (mld)", pk.kot, k.kinderopvangtoeslag],
] as const)
  console.log(`| ${naam} | ${f(a)} | ${f(b)} |`);

console.log(
  "\n| Scenario | Saldo prototype | Saldo nu | Armoede prototype | Armoede nu | Gini prototype | Gini nu |\n|---|---|---|---|---|---|---|",
);
PROTOTYPE_IDS.forEach((id, i) => {
  if (!id) return;
  const p = prototype.scenarios[i]!;
  const n = nu.scenarios.find((s) => s.id === id)!;
  console.log(
    `| ${id} | ${f(p.saldoMld)} | ${f(n.saldoMld)} | ${f(p.armoede)}% | ${f(n.armoede)}% | ${f(p.gini, 3)} | ${f(n.gini, 3)} |`,
  );
});
// De oplosser (budgetneutrale vlaktaks) is om dezelfde reden niet meer te vergelijken met die van het prototype.
