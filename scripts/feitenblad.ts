/*
 * Schrijft promo/feitenblad.md: de cijfers die een AI mag gebruiken als hij reacties of berichten over Box1lab
 * voorstelt (zie promo/README.md). Alles komt uit de parameters en de engine, niets is met de hand ingetypt.
 * Draai dit opnieuw als de parameters veranderen.
 *
 * Gebruik: npm run feitenblad
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  MODEL_VERSIE,
  berekenHuishouden,
  maakHuishouden,
  overVanInkomen,
  type EenvoudigeInvoer,
  type Parameters,
  type Staffel,
} from "../packages/engine/src/index.ts";
import { laadParameters, laadVoorbeelden } from "../packages/engine/src/node/index.ts";

const NU = 2026;
const VOLGEND = 2027;
const SITE = "https://tiniepriest.github.io/Box1lab";
const INKOMENS = [20000, 30000, 40000, 50000, 60000, 80000, 100000];

const nu = laadParameters(NU);
const volgend = laadParameters(VOLGEND);
const voorbeelden = laadVoorbeelden();

const euro = (n: number) => `€ ${Math.round(n).toLocaleString("nl-NL")}`;
const verschil = (n: number) => {
  const r = Math.round(n);
  return r === 0 ? "€ 0" : `${r > 0 ? "+" : "−"} € ${Math.abs(r).toLocaleString("nl-NL")}`;
};
const pct = (n: number) => `${n.toLocaleString("nl-NL", { maximumFractionDigits: 3 })}%`;
const raming = (bron: string) => (bron.startsWith("Raming:") ? " (raming)" : "");
/** Het maximum van een heffingskorting: een staffel is stuksgewijs lineair, dus het hoogste punt ligt op een knik. */
const maxKorting = (s: Staffel) => Math.max(...s.map((stuk) => stuk.bedrag));

function perMaand(invoer: EenvoudigeInvoer, p: Parameters): number {
  return overVanInkomen(berekenHuishouden(maakHuishouden(invoer, p), p)) / 12;
}

function rij(label: string, invoer: EenvoudigeInvoer): string {
  const a = perMaand(invoer, nu);
  const b = perMaand(invoer, volgend);
  return `| ${label} | ${euro(a)} | ${euro(b)} | ${verschil(b - a)} |`;
}

function schijven(p: Parameters): string {
  let vorige = 0;
  return p.box1.schijven
    .map((s) => {
      const deel =
        s.tot === null
          ? `boven ${euro(vorige)}: ${pct(s.tarief)}`
          : `${euro(vorige)} – ${euro(s.tot)}: ${pct(s.tarief)}`;
      vorige = s.tot ?? vorige;
      return deel;
    })
    .join("; ");
}

const kop =
  "| Huishouden | 2026 per maand | 2027 per maand | Verschil per maand |\n| --- | ---: | ---: | ---: |";

const regels: string[] = [];
regels.push(
  "# Feitenblad Box1lab",
  "",
  `Gemaakt met \`npm run feitenblad\` uit rekenmodel ${MODEL_VERSIE}. Niet met de hand aanpassen.`,
  "",
  "## Status",
  "",
  `- ${NU}: de regels van dit jaar.`,
  `- ${VOLGEND}: **${volgend.status ?? "onbekend"}**. ${volgend.toelichting ?? ""}`,
  `- Bedragen met "(raming)" zijn nog niet officieel. Zeg bij ${VOLGEND} altijd "naar verwachting" of "volgens het voorstel", tot de status "definitief" is.`,
  "",
  "## Tarieven box 1 (inkomstenbelasting plus premies volksverzekeringen, onder de AOW-leeftijd)",
  "",
  `- ${NU}: ${schijven(nu)}${raming(nu.box1.bron)}`,
  `- ${VOLGEND}: ${schijven(volgend)}${raming(volgend.box1.bron)}`,
  "",
  "## Heffingskortingen (maximum per jaar, onder de AOW-leeftijd)",
  "",
  `- Algemene heffingskorting: ${NU} ${euro(maxKorting(nu.heffingskortingen.algemeen.staffel))}, ${VOLGEND} ${euro(maxKorting(volgend.heffingskortingen.algemeen.staffel))}${raming(volgend.heffingskortingen.algemeen.bron)}`,
  `- Arbeidskorting: ${NU} ${euro(maxKorting(nu.heffingskortingen.arbeid.staffel))}, ${VOLGEND} ${euro(maxKorting(volgend.heffingskortingen.arbeid.staffel))}${raming(volgend.heffingskortingen.arbeid.bron)}`,
  "",
  "## Wat houd je over? Voorbeelden",
  "",
  'Per maand op de rekening: netto inkomen plus toeslagen en kinderbijslag, zoals de calculator het bovenaan toont. De zorgpremie en box 3 gaan er niet af. Werkenden zijn werknemers met de standaard pensioenpremie. Bedragen zijn afgerond. "Bruto" is het bruto jaarinkomen.',
  "",
);

for (const curve of voorbeelden.curves) {
  regels.push(`### ${curve.label}`, "", kop);
  for (const bruto of INKOMENS) {
    const invoer = {
      ...curve.invoer,
      inkomen1: bruto,
      inkomen2: curve.partnerAandeel ? bruto * curve.partnerAandeel : curve.invoer.inkomen2,
    };
    const label = curve.partnerAandeel
      ? `Bruto ${euro(bruto)} en partner ${euro(bruto * curve.partnerAandeel)}`
      : `Bruto ${euro(bruto)}`;
    regels.push(rij(label, invoer));
  }
  regels.push("");
}

regels.push("### Andere voorbeeldhuishoudens uit het scenariolab", "", kop);
for (const h of voorbeelden.huishoudens.filter((h) => h.id !== "jij")) {
  const i = h.invoer;
  const inkomen =
    i.uitkeringSoort === "bijstand" || (i.soort1 === "uitkering" && i.inkomen1 === 0)
      ? "bijstand"
      : [i.inkomen1, i.inkomen2]
          .filter((x) => x > 0)
          .map(euro)
          .join(" + ");
  regels.push(rij(`${h.omschrijving} (${inkomen})`, i));
}

regels.push(
  "",
  "## Pagina's",
  "",
  `- ${SITE}/jouw-situatie/ — de calculator: wat houd jij over, in ${NU} en ${VOLGEND}, en wat verandert er.`,
  `- ${SITE}/verkiezingen/belastingplan-${VOLGEND}/ — wat het Belastingplan ${VOLGEND} betekent, voor jou en voor Nederland.`,
  `- ${SITE}/voorstellen/ — bekende voorstellen (zoals een vlaktaks of zonder hypotheekrenteaftrek) doorgerekend.`,
  `- ${SITE}/lab/ — het scenariolab: zelf het stelsel aanpassen.`,
  `- ${SITE}/uitleg/armoedeval/ — waarom meer verdienen soms bijna niets oplevert.`,
  `- ${SITE}/uitleg/marginale-druk/ — wat er overblijft van een extra euro.`,
  `- ${SITE}/uitleg/toeslagen/ — zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag in het kort.`,
  `- ${SITE}/uitleg/hypotheekrenteaftrek/ — hypotheekrenteaftrek en eigenwoningforfait.`,
  `- ${SITE}/methodiek/ — hoe we rekenen en wat we niet meenemen.`,
  "",
);

const pad = fileURLToPath(new URL("../promo/feitenblad.md", import.meta.url));
writeFileSync(pad, regels.join("\n"));
console.log("geschreven: promo/feitenblad.md");
