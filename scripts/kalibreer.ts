/*
 * Maakt de synthetische populatie en herweegt die naar de kalibratiedoelen.
 *
 * Invoer:  data/parameters/<jaar>.yaml, data/kalibratie/<jaar>.yaml, data/populatie/spec-<jaar>.yaml
 * Uitvoer: data/populatie/<jaar>.json en docs/kalibratie-<jaar>.md (rapport: model tegen doel per marge)
 *
 * Gebruik: npm run kalibreer [-- jaar]
 *         npm run kalibreer -- --controle   (CI: controleert of data/populatie/<jaar>.json actueel is)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MODEL_VERSIE,
  berekenHuishouden,
  gewogenMediaan,
  leesYaml,
  maakBasis,
  type PopulatieHuishouden,
  type Resultaat,
} from "@box1lab/engine";
import { DATA_MAP, laadKalibratie, laadParameters } from "@box1lab/engine/node";
import { TYPES, genereerPopulatie } from "./populatie/genereer.ts";
import { herweeg, type Afwijking, type Restrictie } from "./populatie/herweeg.ts";
import { valideerSpec } from "./populatie/spec.ts";

const argumenten = process.argv.slice(2);
const controleModus = argumenten.includes("--controle");
const jaar = Number(argumenten.find((a) => /^\d{4}$/.test(a)) ?? 2026);
const params = laadParameters(jaar);
const kal = laadKalibratie(jaar);
const specPad = `populatie/spec-${jaar}.yaml`;
const spec = valideerSpec(
  leesYaml(readFileSync(join(DATA_MAP, specPad), "utf8"), specPad),
  `data/${specPad}`,
);

// 1. Genereren en doorrekenen onder het huidige beleid.
const pop = genereerPopulatie(spec, kal, params);
const res: Resultaat[] = pop.map((h) => berekenHuishouden(h, params));
const start = pop.map((h) => h.gewicht);
const indicator = (f: (h: PopulatieHuishouden, r: Resultaat) => boolean) =>
  pop.map((h, i) => (f(h, res[i]!) ? 1 : 0));

// 2. Restricties.
const cbsPerType = Object.fromEntries(
  TYPES.map((t) => [t, kal.huishoudens.leeftijdsgroepen.reduce((s, g) => s + g[t], 0)]),
) as Record<(typeof TYPES)[number], number>;
const totaal = Object.values(cbsPerType).reduce((a, b) => a + b, 0);
const LEEFTIJDSGROEPEN = [
  { naam: "referentiepersoon jonger dan 35", van: 0, tot: 35 },
  { naam: "referentiepersoon 35–54", van: 35, tot: 55 },
  { naam: "referentiepersoon 55–64", van: 55, tot: 65 },
];
const cbsLeeftijd = (van: number, tot: number) =>
  kal.huishoudens.leeftijdsgroepen
    .filter((g) => g.van >= van && g.tot <= tot)
    .reduce((s, g) => s + TYPES.reduce((t, ty) => t + g[ty], 0), 0);
const woningTotaal = kal.woningen.koop + kal.woningen.corporatie + kal.woningen.particulier;
const t = kal.toeslagen;
const grenzen = kal.inkomen.besteedbaarPercentielen.map((g) => g * kal.indexatie.factor);

// CBS telt in het besteedbaar inkomen ook het voordeel van wonen in een eigen woning (huurwaarde) mee, minus de
// betaalde hypotheekrente. Om de decielgrenzen te kunnen vergelijken, rekent de kalibratie met hetzelfde begrip.
// De huurwaarde is evenredig aan de WOZ-waarde; het totaal komt van CBS (geïndexeerd naar ${jaar}).
const ib = kal.inkomensbestanddelen;
const huurwaardeDoel = ib.inkomenEigenWoningMln * 1e6 * kal.indexatie.factor;
const huurwaardeFactor = huurwaardeDoel / pop.reduce((s, x, i) => s + start[i]! * x.woz, 0);
const huurwaarde = pop.map((x) => huurwaardeFactor * x.woz);
const besteedbaarCbs = (r: Resultaat, i: number) => r.besteedbaar - pop[i]!.hypotheekrente + huurwaarde[i]!;

const restricties: Restrictie[] = [
  ...TYPES.map((ty) => ({
    naam: `huishoudens: ${ty}`,
    waarden: indicator((h) => h.type === ty),
    doel: cbsPerType[ty],
  })),
  ...LEEFTIJDSGROEPEN.map((g) => ({
    naam: `huishoudens: ${g.naam}`,
    waarden: indicator((h) => h.leeftijd >= g.van && h.leeftijd < g.tot),
    doel: cbsLeeftijd(g.van, g.tot),
  })),
  {
    naam: "woning: koop",
    waarden: indicator((h) => h.woonvorm === "koop"),
    doel: (totaal * kal.woningen.koop) / woningTotaal,
  },
  {
    naam: "woning: corporatie",
    waarden: indicator((h) => h.woonvorm === "corporatie"),
    doel: (totaal * kal.woningen.corporatie) / woningTotaal,
  },
  // Dienst Toeslagen telt ontvangers van zorgtoeslag per persoon of partnerpaar, inclusief inwonende
  // meerderjarige kinderen met een eigen zorgtoeslag.
  {
    naam: "ontvangers zorgtoeslag",
    waarden: res.map((r) => r.zorgtoeslagOntvangers),
    doel: t.zorgtoeslag.ontvangers,
  },
  {
    naam: "ontvangers huurtoeslag",
    waarden: indicator((_, r) => r.huurtoeslag > 0),
    doel: t.huurtoeslag.ontvangers,
  },
  {
    naam: "ontvangers kindgebonden budget",
    waarden: indicator((_, r) => r.kgb > 0),
    doel: t.kindgebondenBudget.ontvangers,
  },
  {
    naam: "ontvangers kinderopvangtoeslag",
    waarden: indicator((_, r) => r.kot > 0),
    doel: t.kinderopvangtoeslag.ontvangers,
  },
  {
    naam: "uitgaven zorgtoeslag",
    waarden: res.map((r) => r.zorgtoeslag),
    doel: t.zorgtoeslag.bedragMld * 1e9,
  },
  {
    naam: "uitgaven huurtoeslag",
    waarden: res.map((r) => r.huurtoeslag),
    doel: t.huurtoeslag.bedragMld * 1e9,
  },
  {
    naam: "uitgaven kindgebonden budget",
    waarden: res.map((r) => r.kgb),
    doel: t.kindgebondenBudget.bedragMld * 1e9,
  },
  {
    naam: "uitgaven kinderopvangtoeslag",
    waarden: res.map((r) => r.kot),
    doel: t.kinderopvangtoeslag.bedragMld * 1e9,
  },
  {
    naam: "betaalde hypotheekrente",
    waarden: pop.map((x) => x.hypotheekrente),
    doel: ib.betaaldeHypotheekrenteMln * 1e6,
  },
  { naam: "huurwaarde eigen woning", waarden: huurwaarde, doel: huurwaardeDoel },
  // CBS telt huishoudens met inkomen uit een eigen onderneming (jaar van de inkomensbestanddelen, niet geïndexeerd).
  {
    naam: "huishoudens met zelfstandig ondernemer",
    waarden: indicator((x) => x.leden.some((l) => !!l.ondernemer)),
    doel: ib.huishoudensMetZelfstandigOndernemer,
  },
  ...grenzen.map((g, k) => ({
    naam: `besteedbaar inkomen onder P${(k + 1) * 10} (€ ${Math.round(g).toLocaleString("nl-NL")})`,
    waarden: res.map((r, i) => (besteedbaarCbs(r, i) <= g ? 1 : 0)),
    doel: ((k + 1) / 10) * totaal,
  })),
];

// 3. Herwegen.
const voor: Afwijking[] = restricties.map((r) => {
  const uitkomst = start.reduce((s, w, i) => s + w * r.waarden[i]!, 0);
  return { naam: r.naam, doel: r.doel, uitkomst, relatief: (uitkomst - r.doel) / r.doel };
});
const h = herweeg(start, restricties, { ...spec.herweging, tolerantie: 1e-4 });
const herwogen: PopulatieHuishouden[] = pop.map((x, i) => ({ ...x, gewicht: h.gewichten[i]! }));

// 4. Controles na herweging.
const basis = maakBasis(params, herwogen, kal);
const besteedbaar = basis.resultaten.map(besteedbaarCbs);
const gewichten = herwogen.map((x) => x.gewicht);
const percentiel = (p: number) => {
  const idx = besteedbaar.map((_, i) => i).sort((a, b) => besteedbaar[a]! - besteedbaar[b]!);
  const T = gewichten.reduce((a, b) => a + b, 0);
  let c = 0;
  for (const i of idx) {
    c += gewichten[i]!;
    if (c >= p * T) return besteedbaar[i]!;
  }
  return NaN;
};
const decielen = grenzen.map((doel, k) => {
  const model = percentiel((k + 1) / 10);
  return { k: (k + 1) * 10, doel, model, relatief: (model - doel) / doel };
});
const factoren = herwogen.map((x, i) => x.gewicht / start[i]!);
const sorteer = [...factoren].sort((a, b) => a - b);

// 5. Wegschrijven.
const rond = (x: number) => Math.round(x * 100) / 100;
const uitvoer = {
  jaar,
  toelichting: `Gegenereerd door \`npm run kalibreer\` (model ${MODEL_VERSIE}). Niet met de hand bewerken.`,
  huishoudens: herwogen.map((x) => ({
    ...x,
    gewicht: rond(x.gewicht),
    leden: x.leden.map((l) => ({ ...l, inkomen: rond(l.inkomen), uitkering: rond(l.uitkering) })),
    huurPerMaand: rond(x.huurPerMaand),
    hypotheekrente: rond(x.hypotheekrente),
    woz: Math.round(x.woz),
    kinderopvang: x.kinderopvang.map((o) => ({ ...o, uurprijs: rond(o.uurprijs) })),
    ...(x.kindInkomens ? { kindInkomens: x.kindInkomens.map(rond) } : {}),
  })),
};
const populatiePad = join(DATA_MAP, `populatie/${jaar}.json`);

if (controleModus) {
  // Vergelijk met het opgeslagen bestand. Kleine verschillen (afronding op centen) zijn toegestaan.
  const opgeslagen = JSON.parse(readFileSync(populatiePad, "utf8")) as typeof uitvoer;
  const gelijk = (a: unknown, b: unknown): boolean => {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 0.011 + 1e-6 * Math.abs(b);
    if (Array.isArray(a) && Array.isArray(b))
      return a.length === b.length && a.every((x, i) => gelijk(x, b[i]));
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a).sort();
      const kb = Object.keys(b).sort();
      return (
        gelijk(ka, kb) &&
        ka.every((k) => gelijk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
      );
    }
    return a === b;
  };
  if (!gelijk(uitvoer.huishoudens, opgeslagen.huishoudens)) {
    console.error(
      `data/populatie/${jaar}.json is niet actueel: parameters, kalibratiedoelen of spec zijn veranderd. ` +
        "Draai `npm run kalibreer` en commit het resultaat (en docs/kalibratie-" +
        jaar +
        ".md).",
    );
    process.exit(1);
  }
  console.log(`data/populatie/${jaar}.json is actueel.`);
  process.exit(0);
}
writeFileSync(populatiePad, JSON.stringify(uitvoer) + "\n");

const nl = (x: number, d = 0) =>
  x.toLocaleString("nl-NL", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x: number) => `${x >= 0 ? "+" : "−"}${nl(Math.abs(x * 100), 1)}%`;
const rij = (a: Afwijking, v: Afwijking) => {
  const bedrag = /uitgaven|hypotheekrente|huurwaarde/.test(a.naam);
  const f = (x: number) => (bedrag ? `€ ${nl(x / 1e9, 2)} mld` : nl(x));
  return `| ${a.naam} | ${f(a.doel)} | ${f(v.uitkomst)} (${pct(v.relatief)}) | ${f(a.uitkomst)} (${pct(a.relatief)}) |`;
};
const bt = basis.totalen;
const controle = kal.controle.loonEnInkomensheffingMld - kal.controle.box3Mld;
const cbsBelasting =
  ((ib.belastingOpInkomenMln + ib.premiesVolksverzekeringenMln) / 1e3) * kal.indexatie.factor;
const gewogenSom = (f: (x: PopulatieHuishouden, i: number) => number) =>
  herwogen.reduce((s, x, i) => s + x.gewicht * f(x, i), 0) / 1e9;
const modelPensioenpremie = gewogenSom((_, i) => basis.resultaten[i]!.pensioenpremie);
const modelWinst = gewogenSom((x) => x.leden.reduce((s, l) => s + (l.ondernemer ? l.inkomen : 0), 0));
const cbsPensioenpremie = (ib.pensioenpremieWerknemerMln / 1e3) * kal.indexatie.factor;
const cbsWinst = (ib.inkomenZelfstandigOndernemerMln / 1e3) * kal.indexatie.factor;
const rapport = `# Kalibratierapport ${jaar}

Gegenereerd door \`npm run kalibreer\` op ${new Date().toISOString().slice(0, 10)} (model ${MODEL_VERSIE}). Niet met de hand bewerken.

## Samenvatting

- ${nl(pop.length)} synthetische huishoudens, samen ${nl(totaal)} echte huishoudens (${nl(bt.personen / 1e6, 2)} mln personen).
- Herweging ${h.geconvergeerd ? "**geconvergeerd**" : "**niet volledig geconvergeerd**"} na ${h.iteraties} iteraties. Grootste afwijking na herweging: ${pct(Math.max(...h.afwijkingen.map((a) => Math.abs(a.relatief))))}.
- Gewichtsfactoren (nieuw ÷ start): mediaan ${nl(sorteer[Math.floor(sorteer.length / 2)]!, 2)}, 5% laagste onder ${nl(sorteer[Math.floor(sorteer.length * 0.05)]!, 2)}, 5% hoogste boven ${nl(sorteer[Math.floor(sorteer.length * 0.95)]!, 2)} (grenzen ${spec.herweging.minimaleFactor}–${spec.herweging.maximaleFactor}).

## Marges: doel, vóór en na herweging

| Marge | Doel | Vóór | Na |
|---|---|---|---|
${restricties.map((_, j) => rij(h.afwijkingen[j]!, voor[j]!)).join("\n")}

## Schaalfactoren per post

De effecten van scenario's worden per post omgerekend naar de begrote totalen. Na herweging horen deze factoren dicht bij 1 te liggen (eis: tussen 0,9 en 1,1).

| Post | Model | Doel | Schaalfactor |
|---|---|---|---|
| Zorgtoeslag | € ${nl(bt.zorgtoeslag, 2)} mld | € ${nl(t.zorgtoeslag.bedragMld, 2)} mld | ${nl(basis.schaal.zorgtoeslag, 3)} |
| Huurtoeslag | € ${nl(bt.huurtoeslag, 2)} mld | € ${nl(t.huurtoeslag.bedragMld, 2)} mld | ${nl(basis.schaal.huurtoeslag, 3)} |
| Kindgebonden budget | € ${nl(bt.kgb, 2)} mld | € ${nl(t.kindgebondenBudget.bedragMld, 2)} mld | ${nl(basis.schaal.kgb, 3)} |
| Kinderopvangtoeslag | € ${nl(bt.kot, 2)} mld | € ${nl(t.kinderopvangtoeslag.bedragMld, 2)} mld | ${nl(basis.schaal.kot, 3)} |
| Belasting box 1 | € ${nl(bt.belasting, 1)} mld | geen (zie controle) | 1 |

## Decielgrenzen besteedbaar huishoudinkomen

CBS ${kal.inkomen.jaar}, geïndexeerd naar ${jaar} met factor ${nl(kal.indexatie.factor, 4)} (eis: binnen 5%).

| Percentiel | CBS (geïndexeerd) | Model | Verschil |
|---|---|---|---|
${decielen.map((d) => `| P${d.k} | € ${nl(d.doel)} | € ${nl(d.model)} | ${pct(d.relatief)} |`).join("\n")}

## Controle: belastingopbrengst

Het model rekent € ${nl(bt.belasting, 1)} mld box 1-belasting (inclusief premies volksverzekeringen, na de eigen woning) en € ${nl(bt.zvw, 1)} mld Zvw-bijdrage die AOW'ers en zelfstandigen zelf betalen.

- Volgens CBS betaalden huishoudens in ${ib.jaar} € ${nl((ib.belastingOpInkomenMln + ib.premiesVolksverzekeringenMln) / 1e3, 1)} mld belasting op inkomen en premies volksverzekeringen (alle boxen, inclusief ondernemers); geïndexeerd naar ${jaar} is dat € ${nl(cbsBelasting, 1)} mld. Het model komt uit op ${nl((bt.belasting / cbsBelasting) * 100, 0)}% daarvan.
- De loon- en inkomensheffing in de Miljoenennota ${jaar} is € ${nl(kal.controle.loonEnInkomensheffingMld, 1)} mld, waarvan € ${nl(kal.controle.box3Mld, 1)} mld box 3; de rest (€ ${nl(controle, 1)} mld) is box 1 en box 2. Het model komt uit op ${nl((bt.belasting / controle) * 100, 0)}% daarvan.

Het model bevat alleen box 1. Box 2 en box 3 zitten er niet in, en ook niet de aftrekposten die het model niet per huishouden berekent (zie "overige aftrekposten" in het parameterbestand). De modelopbrengst hoort daarom iets lager uit te komen dan de CBS-opbrengst.

## Controle: pensioenpremie en winst

- Werknemersdeel pensioenpremie: model € ${nl(modelPensioenpremie, 1)} mld (standaardregeling voor elke werknemer); CBS ${ib.jaar} € ${nl(ib.pensioenpremieWerknemerMln / 1e3, 1)} mld, geïndexeerd € ${nl(cbsPensioenpremie, 1)} mld (${pct(modelPensioenpremie / cbsPensioenpremie - 1)}).
- Winst van zelfstandig ondernemers: model € ${nl(modelWinst, 1)} mld; CBS ${ib.jaar} € ${nl(ib.inkomenZelfstandigOndernemerMln / 1e3, 1)} mld, geïndexeerd € ${nl(cbsWinst, 1)} mld (${pct(modelWinst / cbsWinst - 1)}).

## Uitkomsten huidig beleid

- Armoederisico (personen, 60% van de mediaan): ${nl(basis.armoede.personen, 1)}%; kinderen ${nl(basis.armoede.kinderen, 1)}%.
- Gini (gestandaardiseerd besteedbaar inkomen): ${nl(basis.gini, 3)}.
- Mediaan gestandaardiseerd besteedbaar inkomen: € ${nl(
  gewogenMediaan(
    basis.resultaten.map((r) => r.besteedbaar / r.equivalentie),
    basis.persoonsgewichten,
  ),
)}.

## Bronnen

${[kal.huishoudens.bron, kal.woningen.bron, kal.inkomen.bron, kal.indexatie.bron, kal.toeslagen.bron, kal.controle.bron].map((b) => `- ${b}`).join("\n")}
`;
const rapportPad = fileURLToPath(new URL(`../docs/kalibratie-${jaar}.md`, import.meta.url));
writeFileSync(rapportPad, rapport);

console.log(
  `${pop.length} huishoudens; herweging ${h.geconvergeerd ? "geconvergeerd" : "NIET geconvergeerd"} (${h.iteraties} iteraties)`,
);
for (const a of h.afwijkingen)
  if (Math.abs(a.relatief) > 0.01) console.log(`  afwijking ${pct(a.relatief)}  ${a.naam}`);
console.log(
  "schaalfactoren",
  Object.fromEntries(Object.entries(basis.schaal).map(([k, v]) => [k, nl(v, 3)])),
);
console.log("decielgrenzen", decielen.map((d) => pct(d.relatief)).join(" "));
console.log(`armoede ${nl(basis.armoede.personen, 1)}%, gini ${nl(basis.gini, 3)}`);
const buiten = Object.entries(basis.schaal).filter(([, v]) => v < 0.9 || v > 1.1);
if (buiten.length)
  console.warn(`WAARSCHUWING: schaalfactor buiten 0,9–1,1: ${buiten.map(([k]) => k).join(", ")}`);
