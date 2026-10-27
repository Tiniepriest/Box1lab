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
  "voorstellen/vlaktaks-40",
  "uitleg",
  "uitleg/armoedeval",
  "uitleg/toeslagen",
  "uitleg/hypotheekrenteaftrek",
  "uitleg/inkomensgroepen",
  "uitleg/marginale-druk",
  "verkiezingen/voorbeeld",
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
  await pg.goto(`${BASIS}/lab`, { waitUntil: "networkidle" });
  await pg.getByRole("button", { name: /Vlaktaks/ }).click();
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
  await pg.goto(`${BASIS}/jouw-situatie`, { waitUntil: "networkidle" });
  await pg.waitForFunction(() => /van de mensen heeft minder/.test(document.body.textContent ?? ""), null, {
    timeout: 30000,
  });
  const zin = (await pg.locator(".kernzin").textContent()) ?? "";
  controleer(/per maand/.test(zin), `calculator: "${zin.trim().slice(0, 60)}…"`);
  controleer(true, "calculator: plek in de inkomensverdeling geladen");
  await ctx.close();
} finally {
  await browser.close();
  server.kill();
}
console.log(fouten ? `${fouten} fout(en) in de console.` : "Geen fouten in de console.");
process.exit(fouten ? 1 : 0);
