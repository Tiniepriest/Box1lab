/*
 * Haalt de Gini-index per land op bij de Wereldbank en schrijft data/vergelijking/gini-landen.yaml (D-097).
 * Per land het nieuwste cijfer vanaf `vanafJaar`; alleen landen, geen regio's of inkomensgroepen.
 *
 * Gebruik: npm run gini:landen -- [vanafJaar]   (standaard het jaar dat nu in het bestand staat)
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_MAP, laadGiniLanden } from "@box1lab/engine/node";

const BESTAND = join(DATA_MAP, "vergelijking/gini-landen.yaml");
const API = "https://api.worldbank.org/v2";
const INDICATOR = "SI.POV.GINI";

const vanafJaar = Number(process.argv[2] ?? (existsSync(BESTAND) ? laadGiniLanden().vanafJaar : NaN));
if (!Number.isInteger(vanafJaar)) {
  console.error("Geef het eerste jaar mee, bijvoorbeeld: npm run gini:landen -- 2014");
  process.exit(1);
}

async function json(url: string): Promise<unknown[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return (await r.json()) as unknown[];
}

type Land = { id: string; name: string; region: { id: string } };
type Waarneming = { countryiso3code: string; date: string; value: number | null };

const [kopLanden, landen] = (await json(`${API}/country?format=json&per_page=1000`)) as [unknown, Land[]];
void kopLanden;
const [kop, waarnemingen] = (await json(
  `${API}/country/all/indicator/${INDICATOR}?format=json&per_page=20000&date=${vanafJaar}:${new Date().getFullYear()}`,
)) as [{ lastupdated: string }, Waarneming[]];

// Regio's en inkomensgroepen hebben in de landenlijst regio "NA" (aggregaat).
const naam = new Map(landen.filter((l) => l.region.id !== "NA").map((l) => [l.id, l.name.trim()]));
const nieuwste = new Map<string, { jaar: number; waarde: number }>();
for (const w of waarnemingen) {
  if (w.value === null || !naam.has(w.countryiso3code)) continue;
  const jaar = Number(w.date);
  const oud = nieuwste.get(w.countryiso3code);
  if (!oud || jaar > oud.jaar) nieuwste.set(w.countryiso3code, { jaar, waarde: w.value });
}
const nl = nieuwste.get("NLD");
if (!nl) throw new Error(`Geen Gini-index voor Nederland vanaf ${vanafJaar}.`);
nieuwste.delete("NLD");

const rijen = [...nieuwste.entries()]
  .map(([code, w]) => ({ code, land: naam.get(code)!, ...w }))
  .sort((a, b) => a.waarde - b.waarde || a.land.localeCompare(b.land));
const vandaag = new Date().toISOString().slice(0, 10);

const yaml = `# Gini-index per land van de Wereldbank, om de Gini van het model op een wereldranglijst te zetten (D-097).
# Gegenereerd door: npm run gini:landen -- ${vanafJaar}   (niet met de hand bewerken)
#
# Schaal 0-100, zoals de Wereldbank publiceert (de Gini van het model is 0-1). Laag is gelijk.
# Per land het nieuwste cijfer vanaf vanafJaar. Nederland staat apart; de lijst bevat alleen de andere landen.
bron: "Wereldbank, World Development Indicators, indicator ${INDICATOR} (Gini index), https://data.worldbank.org/indicator/${INDICATOR}, opgehaald op ${vandaag} (database bijgewerkt op ${kop.lastupdated}). Alleen landen, geen regio's. De Wereldbank gebruikt per land inkomen of consumptie, uit enquêtes."
opgehaald: "${vandaag}"
vanafJaar: ${vanafJaar}
nederland: { waarde: ${nl.waarde}, jaar: ${nl.jaar} }
landen:
${rijen.map((r) => `  - { code: ${r.code}, land: ${JSON.stringify(r.land)}, waarde: ${r.waarde}, jaar: ${r.jaar} }`).join("\n")}
`;

mkdirSync(join(DATA_MAP, "vergelijking"), { recursive: true });
writeFileSync(BESTAND, yaml);
const g = laadGiniLanden();
console.log(
  `${g.landen.length + 1} landen; Nederland ${g.nederland.waarde} (${g.nederland.jaar}). Geschreven naar data/vergelijking/gini-landen.yaml`,
);
