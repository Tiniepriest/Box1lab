/*
 * Maakt schermafdrukken van alle pagina's (375 px en 1280 px breed, licht en donker), meldt fouten in de console
 * en doet een paar controles in de browser (preset kiezen, budgetneutraal maken, calculator).
 * Gebruikt de lokaal geïnstalleerde Chrome via playwright-core; er wordt geen browser gedownload.
 *
 * Gebruik: npm run build && npm run schermafdrukken [-- uitvoermap]
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const uit = process.argv[2] ?? "schermafdrukken";
mkdirSync(uit, { recursive: true });
const BASIS = "http://localhost:4321/Box1lab";
const PAGINAS = [
  "",
  "jouw-situatie",
  "lab",
  "voorstellen",
  "voorstellen/vlaktaks-35",
  "uitleg",
  "uitleg/armoedeval",
  "uitleg/toeslagen",
  "uitleg/hypotheekrenteaftrek",
  "uitleg/inkomensgroepen",
  "uitleg/marginale-druk",
  "verkiezingen/voorbeeld",
  "verkiezingen/belastingplan-2027",
  "methodiek",
  "over",
  "wijzigingen",
];

const server = spawn("npm", ["run", "preview", "-w", "site", "--", "--port", "4321"], { shell: true });
// Wacht tot de server antwoordt.
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${BASIS}/`)).ok) break;
  } catch {
    /* nog niet klaar */
  }
  if (i > 60) throw new Error("preview-server start niet");
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ channel: "chrome" });
let fouten = 0;
try {
  for (const schema of ["light", "dark"] as const) {
    for (const breedte of [375, 1280]) {
      const context = await browser.newContext({
        viewport: { width: breedte, height: 900 },
        colorScheme: schema,
      });
      const pagina = await context.newPage();
      pagina.on("console", (m) => {
        if (m.type() === "error") {
          fouten++;
          console.error(`  console-fout (${breedte}px ${schema}): ${m.text()}`);
        }
      });
      pagina.on("pageerror", (e) => {
        fouten++;
        console.error(`  paginafout (${breedte}px ${schema}): ${e.message}`);
      });
      for (const p of PAGINAS) {
        await pagina.goto(`${BASIS}/${p}`, { waitUntil: "networkidle" });
        await pagina.waitForTimeout(800);
        const scroll = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (scroll > 0) console.warn(`  horizontaal scrollen op /${p} (${breedte}px): ${scroll}px te breed`);
        const naam = `${(p || "home").replaceAll("/", "_")}-${breedte}-${schema}.png`;
        await pagina.screenshot({ path: join(uit, naam), fullPage: true });
        // Losse grafieken op ware grootte, om tekst en labels te kunnen beoordelen.
        if (breedte === 375 && schema === "light") {
          const figuren = await pagina.locator("figure").all();
          for (const [i, f] of figuren.entries()) {
            await f.screenshot({
              path: join(uit, `${(p || "home").replaceAll("/", "_")}-figuur${i + 1}.png`),
            });
          }
        }
      }
      await context.close();
    }
  }
  // Controles in de browser: werkt het rekenen echt?
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  const controleer = (ok: boolean, wat: string) => {
    if (!ok) fouten++;
    console.log(`  ${ok ? "ok  " : "FOUT"} ${wat}`);
  };
  const tabblad = pg.getByRole("navigation", { name: "Hoofdmenu" }).getByRole("link");
  await pg.goto(`${BASIS}/voorstellen/vlaktaks-35`, { waitUntil: "networkidle" });
  const tabs = await tabblad.allTextContents();
  controleer(
    tabs.length === 3 && /Belastingplan 2027/.test(tabs[1] ?? ""),
    `menu: drie tabbladen (${tabs.map((t) => t.replace(/\s+/g, " ").trim()).join(" | ")})`,
  );
  controleer(
    (await tabblad.filter({ hasText: "Scenariolab" }).getAttribute("aria-current")) === "true" &&
      (await pg
        .getByRole("navigation", { name: "Scenariolab" })
        .getByRole("link", { name: /Kant-en-klare/ })
        .getAttribute("aria-current")) === "true",
    "menu: een voorstel hoort bij het Scenariolab",
  );
  const mobiel = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await mobiel.goto(`${BASIS}/`, { waitUntil: "networkidle" });
  controleer(
    await mobiel.getByRole("link", { name: "Begin met je situatie" }).isVisible(),
    "home: hoofdknop 'Begin met je situatie'",
  );
  await mobiel.locator(".bij-uitklap summary").click();
  controleer(
    await mobiel.locator(".bij-uitklap").getByRole("link", { name: "Methodiek" }).isVisible(),
    "menu: op een telefoon staan Uitleg, Methodiek en Over onder 'Meer'",
  );
  await mobiel.goto(`${BASIS}/jouw-situatie`, { waitUntil: "networkidle" });
  const snelbalk = mobiel.locator(".snelbalk");
  controleer(
    (await snelbalk.isVisible()) &&
      /Voorbeeld: € [\d.]+ per maand over/.test((await snelbalk.textContent()) ?? ""),
    "jouw situatie: op een telefoon staat de uitkomst in een balk onderaan",
  );
  await snelbalk.getByRole("button", { name: /Bekijk/ }).click();
  await mobiel.waitForTimeout(1200);
  controleer((await snelbalk.count()) === 0, "jouw situatie: de balk verdwijnt bij de uitkomst");
  await mobiel.close();
  await pg.goto(`${BASIS}/lab`, { waitUntil: "networkidle" });
  await pg
    .getByRole("button", { name: /Vlaktaks/ })
    .first()
    .click();
  await pg.waitForFunction(() => document.querySelector(".kernzin")?.textContent?.includes("achteruit"));
  const kern = (await pg.locator(".kernzin").textContent()) ?? "";
  controleer(
    /achteruit/.test(kern) && /mld/.test(kern),
    `lab: preset geeft een uitkomst ("${kern.slice(0, 70)}…")`,
  );
  controleer(pg.url().includes("#"), "lab: scenario staat in de link");
  const meld = pg.locator("main a[data-meldfout]");
  await meld.dispatchEvent("pointerdown");
  const meldPagina = new URL((await meld.getAttribute("href")) ?? "").searchParams.get("pagina") ?? "";
  controleer(meldPagina === pg.url(), "lab: 'Meld een fout' neemt de pagina met scenario mee");
  await pg.getByRole("button", { name: "Via de vrijstelling" }).click();
  await pg.waitForFunction(
    () => /Vrijstelling op|Niet mogelijk|Zelfs zonder/.test(document.body.textContent ?? ""),
    null,
    { timeout: 30000 },
  );
  controleer(
    /Vrijstelling op/.test((await pg.textContent("body")) ?? ""),
    "lab: budgetneutraal via vrijstelling",
  );
  await pg.locator("select").filter({ hasText: "Kies een voorstel" }).selectOption("toeslagen-afschaffen");
  await pg.waitForFunction(
    () =>
      /Toeslagen afschaffen/.test(document.querySelector("thead")?.textContent ?? "") ||
      [...document.querySelectorAll("thead")].some((t) => /Toeslagen afschaffen/.test(t.textContent ?? "")),
    null,
    { timeout: 30000 },
  );
  controleer(true, "lab: vergelijken met een voorstel");
  await pg.goto(`${BASIS}/uitleg/armoedeval`, { waitUntil: "networkidle" });
  const mini = pg.locator(".mini input[type=range]").first();
  await mini.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(500);
  const voor = (await pg.locator(".mini p").first().textContent()) ?? "";
  await mini.fill("20000");
  const na = (await pg.locator(".mini p").first().textContent()) ?? "";
  controleer(voor !== na && /houd/.test(na), "uitleg: interactief voorbeeld reageert");
  await pg.goto(`${BASIS}/verkiezingen/voorbeeld`, { waitUntil: "networkidle" });
  const partijen = await pg.locator("details.partij").count();
  const tekst = (await pg.textContent("body")) ?? "";
  controleer(
    partijen === 2 && !tekst.includes("Partij C"),
    `verkiezingen: ${partijen} gepubliceerde partijen, geen concept zichtbaar`,
  );
  await pg.goto(`${BASIS}/verkiezingen/belastingplan-2027`, { waitUntil: "networkidle" });
  controleer(
    (await pg.locator("h1").textContent()) === "Belastingplan 2027: wat betekent het voor jou?" &&
      (await pg.getByRole("button", { name: "Deel deze pagina" }).isVisible()),
    "belastingplan 2027: titel zoals mensen zoeken, met deelknop",
  );
  const deelplaatje = (await pg.locator('meta[property="og:image"]').getAttribute("content")) ?? "";
  const plaatje = await fetch(deelplaatje.replace(/^https:\/\/[^/]+\/Box1lab/, BASIS));
  controleer(
    /og\/verkiezing-belastingplan-2027\.png$/.test(deelplaatje) &&
      plaatje.ok &&
      plaatje.headers.get("content-type") === "image/png",
    "belastingplan 2027: eigen deelplaatje",
  );
  const routes = await pg.locator("details.partij").count();
  const routeTekst = (await pg.textContent("body")) ?? "";
  controleer(
    routes === 3 &&
      /Niet onafhankelijk gecontroleerd/.test(routeTekst) &&
      /Twee routes naast elkaar/.test(routeTekst),
    `belastingplan 2027: ${routes} routes, met waarschuwing en vergelijking`,
  );
  const stap1 = (await pg.locator(".jaar").textContent()) ?? "";
  controleer(
    /Stap 1: wat doet het plan van het kabinet/.test(stap1) &&
      /Voorlopig/.test(stap1) &&
      /Stap 2/.test(routeTekst),
    "belastingplan 2027: stap 1 (kabinetsplan, voorlopig) en stap 2 (routes)",
  );
  const kolom = pg.locator("section.situatie");
  const routeBedragen = () => pg.locator("details.partij summary .num").allTextContents();
  controleer(
    /Gerekend met een voorbeeld/.test((await kolom.textContent()) ?? ""),
    "situatiekolom: zonder eigen situatie staat er dat we met een voorbeeld rekenen",
  );
  const voorKolom = (await routeBedragen()).join();
  await kolom.getByRole("button", { name: "Vul je situatie in" }).click();
  await kolom.locator("#bedrag-0").fill("6000");
  await pg.waitForTimeout(300);
  controleer(
    /Gerekend met jouw situatie/.test((await kolom.textContent()) ?? "") &&
      (await routeBedragen()).join() !== voorKolom,
    "situatiekolom: aanpassen rekent meteen mee met de routes",
  );
  await kolom.getByRole("button", { name: "Wis mijn gegevens" }).click();
  await pg.waitForTimeout(300);
  controleer(
    /Gerekend met een voorbeeld/.test((await kolom.textContent()) ?? "") &&
      (await routeBedragen()).join() === voorKolom,
    "situatiekolom: wissen zet het voorbeeld terug",
  );
  const bevolking: string[] = [];
  pg.on("request", (v) => {
    if (v.url().includes("populatie")) bevolking.push(v.url());
  });
  await pg.goto(`${BASIS}/jouw-situatie`, { waitUntil: "networkidle" });
  await pg.waitForFunction(() => /van de mensen heeft minder/.test(document.body.textContent ?? ""), null, {
    timeout: 30000,
  });
  const zin = (await pg.locator(".kernzin").textContent()) ?? "";
  controleer(/^\s*In dit voorbeeld houd je/.test(zin), `calculator: "${zin.trim().slice(0, 60)}…"`);
  controleer(
    /modaal inkomen/.test((await pg.locator(".voorbeeld").textContent()) ?? "") &&
      (await pg.locator("#bedrag-0").inputValue()) === "3704",
    "calculator: het voorbeeld is een modaal inkomen, en dat staat erbij",
  );
  const strook = ((await pg.locator(".loonstrook").textContent()) ?? "").replace(/\s+/g, " ");
  controleer(
    /Per maand ?€ 3\.704 ?€ [\d.]+/.test(strook) && /Vakantiegeld ?meestal in mei/.test(strook),
    "calculator: loonstrook met netto maandloon en vakantiegeld apart",
  );
  controleer(bevolking.length === 0, "calculator: plek in de inkomensverdeling zonder de bevolking te laden");
  const volgende = ((await pg.locator(".volgende").textContent()) ?? "").replace(/\s+/g, " ");
  controleer(
    /In 2027 houd je volgens het plan van het kabinet/.test(volgende) &&
      /voorlopig/.test(volgende) &&
      /Scenariolab/.test(volgende),
    "calculator: volgende stap naar Belastingplan 2027 (met de kern) en het Scenariolab",
  );
  controleer(
    (await pg.locator(".jaar").count()) === 0,
    "calculator: het overzicht van 2027 staat op de 2027-pagina",
  );
  const leesSessie = () => pg.evaluate(() => sessionStorage.getItem("box1lab.invoer.v1"));
  const vink = pg.getByRole("navigation", { name: "Hoofdmenu" }).locator(".vink");
  controleer((await leesSessie()) === null, "formulier: het voorbeeld wordt niet bewaard");
  controleer(!(await vink.isVisible()), "menu: geen vinkje zonder eigen situatie");
  await pg.locator("#soort-0").selectOption("zzp");
  controleer(!(await pg.getByLabel("Vakantiegeld").isVisible()), "formulier: geen vakantiegeld bij zzp");
  controleer(await pg.getByText("Ik werk minstens").isVisible(), "formulier: urencriterium bij zzp");
  await pg.locator("#soort-0").selectOption("bijstand");
  await pg.waitForTimeout(300);
  controleer(
    !(await pg.locator("#bedrag-0").isVisible()) &&
      /netto per maand/.test((await pg.locator("form.invoer").textContent()) ?? ""),
    "formulier: bijstand volgt uit de norm, geen bedrag invullen",
  );
  controleer(
    /per maand over/.test((await pg.locator(".kernzin").textContent()) ?? ""),
    "calculator: rekent met de bijstandsnorm",
  );
  await pg.locator("#soort-0").selectOption("loondienst");
  controleer(
    await pg.locator("#premie-0").isVisible(),
    "formulier: eigen pensioenpremie invullen bij loondienst",
  );
  await pg.getByLabel("Per maand of per jaar").first().selectOption("maand");
  await pg.locator("#bedrag-0").fill("2700");
  await pg.waitForTimeout(300);
  const metDertiende = async (aan: boolean) => {
    await pg.getByLabel("13e maand").setChecked(aan);
    await pg.waitForTimeout(300);
    return (await pg.locator(".kernzin").textContent()) ?? "";
  };
  controleer(
    (await metDertiende(true)) !== (await metDertiende(false)),
    "formulier: vinkjes vakantiegeld en 13e maand, 13e maand rekent mee",
  );
  controleer(
    (await pg.locator(".voorbeeld").count()) === 0 &&
      /^\s*Je houdt/.test((await pg.locator(".kernzin").textContent()) ?? ""),
    "calculator: na aanpassen geen voorbeeld meer",
  );
  controleer(/2700/.test((await leesSessie()) ?? ""), "formulier: situatie bewaard voor dit tabblad");
  controleer(await vink.isVisible(), "menu: vinkje bij Jouw situatie");
  controleer(
    (await pg.evaluate(() => localStorage.getItem("box1lab.invoer.v1"))) === null,
    "formulier: niet op het apparaat zonder toestemming",
  );
  await pg.goto(`${BASIS}/lab`, { waitUntil: "networkidle" });
  // Zolang er niets veranderd is, toont het lab geen effecten (D-071); de situatiekolom staat er wel.
  await pg.waitForFunction(
    () => /2\.700/.test(document.querySelector("section.situatie")?.textContent ?? ""),
    null,
    {
      timeout: 30000,
    },
  );
  controleer(
    /Gerekend met jouw situatie[\s\S]*2\.700 per maand/.test(
      (await pg.locator("section.situatie").textContent()) ?? "",
    ),
    "lab: situatiekolom toont wat je hebt ingevuld",
  );
  await pg.getByRole("button", { name: "Algemene heffingskorting + € 500" }).first().click();
  await pg.waitForFunction(() => /Jij · €/.test(document.body.textContent ?? ""), null, { timeout: 30000 });
  controleer(true, "lab: jouw situatie gaat mee naar het lab");
  await pg.waitForFunction(
    () => /per maand\s+meer over/.test(document.querySelector(".jouw")?.textContent ?? ""),
    null,
    { timeout: 30000 },
  );
  controleer(true, "lab: 'Wat betekent dit voor jou?' rekent mee met het scenario");
  await pg.goto(`${BASIS}/voorstellen/hogere-algemene-heffingskorting`, { waitUntil: "networkidle" });
  await pg.waitForFunction(
    () => /per maand\s+meer over/.test(document.querySelector(".jouw")?.textContent ?? ""),
    null,
    { timeout: 30000 },
  );
  controleer(true, "voorstel: laat zien wat het voor jou betekent");
  controleer(
    /Gerekend met jouw situatie/.test((await pg.locator("section.situatie").textContent()) ?? ""),
    "voorstel: situatiekolom staat erbij",
  );
  await pg.goto(`${BASIS}/jouw-situatie`, { waitUntil: "networkidle" });
  controleer(
    (await pg.locator("#bedrag-0").inputValue()) === "2700",
    "formulier: situatie terug na navigeren",
  );
  controleer(
    /Wat doen de voorstellen met jou/.test((await pg.textContent("body")) ?? ""),
    "calculator: wat doen de voorstellen met jou",
  );
  await pg.getByRole("button", { name: "Wis mijn gegevens" }).click();
  await pg.waitForTimeout(300);
  controleer((await leesSessie()) === null, "formulier: wissen haalt de situatie weg");
  controleer(
    (await pg.locator("#bedrag-0").inputValue()) === "3704" && (await pg.locator(".voorbeeld").isVisible()),
    "formulier: na wissen staat het voorbeeld er weer",
  );
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(fouten ? `${fouten} fout(en) in de console.` : "Geen fouten in de console.");
process.exit(fouten ? 1 : 0);
