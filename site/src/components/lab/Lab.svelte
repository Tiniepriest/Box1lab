<script lang="ts">
  import {
    POSTEN,
    berekenHuishouden,
    codeerScenario,
    decodeerScenario,
    huishoudenUitInvoer,
    inkomenscurve,
    invoerSchema,
    leesParameter,
    maakHuishouden,
    pasToe,
    verschil,
    type Huishouden,
    type Kalibratie,
    type Knop,
    type LabKnoppen,
    type Parameters,
    type Preset,
    type Voorbeelden,
    type Wijziging,
  } from "@box1lab/engine";
  import { euro, euroVerschil, getal, miljard, procent, procentVerschil } from "../../lib/format.ts";
  import {
    maakBudgetneutraal,
    simuleerScenario,
    simuleerVergelijking,
    startRekenen,
    type BasisSamenvatting,
    type UitkomstSamenvatting,
  } from "../../lib/rekenen.ts";
  import { voorbeeldInvoer } from "../../lib/opslag.ts";
  import JouwEffect from "../JouwEffect.svelte";
  import { pad } from "../../lib/pad.ts";
  import Figuur from "../grafieken/Figuur.svelte";
  import Gestapeld, { KLASSEN } from "../grafieken/Gestapeld.svelte";
  import Lijnen from "../grafieken/Lijnen.svelte";
  import StavenDivergent from "../grafieken/StavenDivergent.svelte";

  let {
    params,
    kalibratie,
    populatieUrl,
    presets,
    knoppen,
    voorbeelden,
  }: {
    params: Parameters;
    kalibratie: Kalibratie;
    populatieUrl: string;
    presets: Preset[];
    knoppen: LabKnoppen;
    voorbeelden: Voorbeelden;
  } = $props();

  // ---------- Scenario ----------
  /** Diepe kopie. De parameters zijn gewone JSON; structuredClone werkt niet op Svelte-proxies. */
  const kloon = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

  let scenario = $state<Parameters>(kloon(params));
  let basis = $state<BasisSamenvatting | null>(null);
  let uitkomst = $state<UitkomstSamenvatting | null>(null);
  let laadFout = $state("");
  let melding = $state("");
  let deelMelding = $state("");

  $effect(() => {
    startRekenen(params, kalibratie, populatieUrl).then(
      (b) => (basis = b),
      (e: Error) => (laadFout = e.message),
    );
  });

  // Op een telefoon is het instellingenpaneel dicht tot je het opent (met CSS, zodat de pagina niet verspringt).
  let paneelOpen = $state(false);

  // Scenario uit de link openen.
  $effect(() => {
    if (location.hash.length > 1) {
      try {
        scenario = kloon(pasToe(params, decodeerScenario(location.hash, params)));
      } catch (e) {
        melding = (e as Error).message;
      }
    }
  });

  const toestand = $derived.by(() => {
    try {
      const w = verschil(params, $state.snapshot(scenario));
      return { w, p: pasToe(params, w, "scenario"), fout: "" };
    } catch (e) {
      return { w: [] as Wijziging[], p: params, fout: (e as Error).message };
    }
  });

  const code = $derived(codeerScenario(toestand.w));

  $effect(() => {
    const nieuw = toestand.w.length ? `#${code}` : " ";
    if (nieuw.trim() !== location.hash)
      history.replaceState(null, "", nieuw === " " ? location.pathname : nieuw);
  });

  const presetCodes = $derived(
    presets.map((pr) => ({
      id: pr.id,
      code: codeerScenario(verschil(params, pasToe(params, pr.wijzigingen))),
    })),
  );
  const actievePreset = $derived(presetCodes.find((pc) => pc.code === code)?.id ?? null);

  function kiesPreset(pr: Preset) {
    scenario = kloon(pasToe(params, pr.wijzigingen));
    melding = "";
  }

  function waarde(k: Knop): number | boolean {
    return leesParameter(scenario, k.parameter) as number | boolean;
  }
  function zet(k: Knop, v: number | boolean) {
    const delen = k.parameter.split(".");
    const laatste = delen.pop()!;
    let o = scenario as unknown as Record<string, unknown>;
    for (const d of delen) o = o[d] as Record<string, unknown>;
    o[laatste] = v;
  }
  function knopTekst(k: Knop, v: number | boolean): string {
    if (typeof v === "boolean") return v ? "aan" : "uit";
    switch (k.eenheid) {
      case "niveau":
        return v === 0 ? "afgeschaft" : procent(v, 0);
      case "procent":
        return procent(v, 2);
      case "euro":
        return euro(v);
      case "euroPerMaand":
        return `${euro(v)} p/m`;
      default:
        return getal(v, 2);
    }
  }

  // Schijven
  function schijfErbij() {
    const s = scenario.box1.schijven;
    const laatste = s[s.length - 1]!;
    const vorige = s.length > 1 ? (s[s.length - 2]!.tot ?? 0) : scenario.box1.vrijstelling;
    laatste.tot = Math.max(vorige + 20000, 100000);
    s.push({ tot: null, tarief: laatste.tarief + 5 });
  }
  function schijfWeg(i: number) {
    scenario.box1.schijven.splice(i, 1);
    scenario.box1.schijven[scenario.box1.schijven.length - 1]!.tot = null;
  }

  // Budgetneutraal
  let neutraalMelding = $state("");
  let bezig = $state(false);
  async function neutraal(via: "vrijstelling" | "tarieven") {
    if (!basis) return;
    bezig = true;
    neutraalMelding = "Bezig met rekenen…";
    const o = await maakBudgetneutraal(toestand.p, via).finally(() => (bezig = false));
    if (!o.gelukt) {
      neutraalMelding = o.reden;
      return;
    }
    const nieuw = kloon(o.params);
    if (via === "vrijstelling") {
      nieuw.box1.vrijstelling = Math.round(nieuw.box1.vrijstelling / 100) * 100;
      neutraalMelding = `Vrijstelling op ${euro(nieuw.box1.vrijstelling)} gezet.`;
    } else {
      nieuw.box1.schijven = nieuw.box1.schijven.map((s) => ({
        ...s,
        tarief: Math.round(s.tarief * 100) / 100,
      }));
      neutraalMelding = `Alle tarieven vermenigvuldigd met ${getal(o.waarde, 3)}.`;
    }
    scenario = nieuw;
  }

  async function kopieerLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      deelMelding = "Link gekopieerd.";
    } catch {
      deelMelding = "Kopieer de link uit de adresbalk.";
    }
  }

  // ---------- Uitkomsten ----------
  // Rekenen gebeurt in de rekenwerker; bij snel schuiven telt alleen het laatste antwoord.
  $effect(() => {
    const p = toestand.p;
    if (!basis || toestand.fout) return;
    simuleerScenario(p).then((u) => {
      if (u) uitkomst = u;
    });
  });
  const achteruit = $derived(uitkomst ? uitkomst.winnaars[0]! + uitkomst.winnaars[1]! : 0);
  const vooruit = $derived(uitkomst ? uitkomst.winnaars[3]! + uitkomst.winnaars[4]! : 0);
  const kernzin = $derived.by(() => {
    if (!uitkomst) return "";
    if (!toestand.w.length)
      return "Dit is het huidige stelsel. Verander een instelling of kies een voorstel.";
    const saldo = uitkomst.saldoMld;
    const overheid =
      Math.abs(saldo) < 0.05
        ? "de overheid speelt quitte"
        : saldo > 0
          ? `de overheid houdt ${miljard(saldo).replace("+", "")} per jaar over`
          : `het kost de overheid ${miljard(-saldo).replace("+", "")} per jaar`;
    return `Met dit scenario gaat ${getal(achteruit)}% van de mensen erop achteruit en ${getal(vooruit)}% erop vooruit; ${overheid}.`;
  });

  // Vergelijken met een voorstel
  let vergelijkId = $state("");
  let vergelijking = $state<UitkomstSamenvatting | null>(null);
  $effect(() => {
    const pr = presets.find((x) => x.id === vergelijkId);
    if (!pr || !basis) {
      vergelijking = null;
      return;
    }
    simuleerVergelijking(pasToe(params, pr.wijzigingen)).then((u) => {
      if (u) vergelijking = u;
    });
  });
  const vergelijkNaam = $derived(presets.find((x) => x.id === vergelijkId)?.naam ?? "");
  const rijenVergelijking = $derived.by(() => {
    if (!uitkomst || !vergelijking) return [];
    const ach = (u: UitkomstSamenvatting) => u.winnaars[0]! + u.winnaars[1]!;
    const voor = (u: UitkomstSamenvatting) => u.winnaars[3]! + u.winnaars[4]!;
    return [
      { label: "Overheid per saldo", a: miljard(uitkomst.saldoMld), b: miljard(vergelijking.saldoMld) },
      {
        label: "Armoederisico",
        a: procent(uitkomst.armoede.personen),
        b: procent(vergelijking.armoede.personen),
      },
      {
        label: "Armoede onder kinderen",
        a: procent(uitkomst.armoede.kinderen),
        b: procent(vergelijking.armoede.kinderen),
      },
      { label: "Gini", a: getal(uitkomst.gini, 3), b: getal(vergelijking.gini, 3) },
      { label: "Erop achteruit", a: `${getal(ach(uitkomst))}%`, b: `${getal(ach(vergelijking))}%` },
      { label: "Erop vooruit", a: `${getal(voor(uitkomst))}%`, b: `${getal(voor(vergelijking))}%` },
      ...uitkomst.decielen.map((d, i) => ({
        label: `Groep ${i + 1}${i === 0 ? " (laagste inkomens)" : i === 9 ? " (hoogste inkomens)" : ""}`,
        a: procentVerschil(d.relatief),
        b: procentVerschil(vergelijking!.decielen[i]!.relatief),
      })),
    ];
  });

  // Curves
  let curveId = $state(voorbeelden.curves[0]!.id);
  const curve = $derived.by(() => {
    const c = voorbeelden.curves.find((x) => x.id === curveId)!;
    const maak = (b: number): Huishouden =>
      maakHuishouden(
        { ...c.invoer, inkomen1: b, inkomen2: c.partnerAandeel ? b * c.partnerAandeel : c.invoer.inkomen2 },
        params,
      );
    const x: number[] = [];
    for (let v = 5000; v <= 150000; v += 1000) x.push(v);
    const nu = inkomenscurve(maak, params, params, x, 1000);
    const sc = inkomenscurve(maak, toestand.p, params, x, 1000);
    return { x, nu, sc };
  });

  // Jouw situatie (blok "Wat betekent dit voor jou?") en de voorbeeldhuishoudens, met "jij" als je die hebt.
  let invoer = $state(voorbeeldInvoer());
  let ingevuld = $state(false);
  const jij = $derived.by(() => {
    if (!ingevuld) return null;
    const geldig = invoerSchema.safeParse($state.snapshot(invoer));
    return geldig.success ? huishoudenUitInvoer(geldig.data, params) : null;
  });
  const huishoudens = $derived.by(() => {
    // Als je je eigen situatie hebt opgeslagen, vervangt die het voorbeeld "jij".
    const lijst = voorbeelden.huishoudens
      .filter((v) => !(jij && v.id === "jij"))
      .map((v) => ({
        label: v.label,
        sub: v.omschrijving,
        h: maakHuishouden(v.invoer, params),
      }));
    if (jij) lijst.push({ label: "Jij", sub: "Jouw situatie", h: jij });
    return lijst.map((x) => {
      const a = berekenHuishouden(x.h, params);
      const b = toestand.p === params ? a : berekenHuishouden(x.h, toestand.p, params);
      return { ...x, a, b, d: b.besteedbaar - a.besteedbaar };
    });
  });

  const groepenBasis = $derived(
    knoppen.groepen
      .map((g) => ({ ...g, knoppen: g.knoppen.filter((k) => !k.gevorderd) }))
      .filter((g) => g.knoppen.length),
  );
  const groepenGevorderd = $derived(
    knoppen.groepen
      .map((g) => ({ ...g, knoppen: g.knoppen.filter((k) => k.gevorderd) }))
      .filter((g) => g.knoppen.length),
  );
</script>

{#snippet knopVeld(k: Knop)}
  {@const v = waarde(k)}
  {#if k.eenheid === "aanUit"}
    <label class="schakelaar">
      <input type="checkbox" checked={v as boolean} onchange={(e) => zet(k, e.currentTarget.checked)} />
      <span>{k.label}</span>
    </label>
  {:else}
    <div class="schuif">
      <label for="k-{k.parameter}">{k.label} <span class="huidig">{knopTekst(k, v)}</span></label>
      <input
        id="k-{k.parameter}"
        type="range"
        min={k.min}
        max={k.max}
        step={k.stap}
        value={v as number}
        oninput={(e) => zet(k, Number(e.currentTarget.value))}
      />
      <input
        type="number"
        min={k.min}
        max={k.max}
        step={k.stap}
        value={v as number}
        aria-label={k.label}
        onchange={(e) => zet(k, Number(e.currentTarget.value))}
      />
    </div>
  {/if}
  {#if k.uitleg}<p class="notitie knop-uitleg">{k.uitleg}</p>{/if}
{/snippet}

<div class="lab">
  <aside class="instellingen kaart" aria-label="Instellingen">
    <button
      type="button"
      class="paneel-knop"
      aria-expanded={paneelOpen}
      aria-controls="lab-instellingen"
      onclick={() => (paneelOpen = !paneelOpen)}
      >{paneelOpen ? "Instellingen verbergen" : "Instellingen aanpassen"}</button
    >
    <div id="lab-instellingen" class="paneel-inhoud" class:open={paneelOpen}>
      <div class="groep">
        <h2 class="groepkop">Begin bij een voorstel</h2>
        <div class="presets">
          {#each presets as pr (pr.id)}
            <button
              type="button"
              aria-pressed={actievePreset === pr.id}
              onclick={() => kiesPreset(pr)}
              title={pr.omschrijving}>{pr.naam}</button
            >
          {/each}
        </div>
      </div>

      <div class="groep">
        <h2 class="groepkop">Schijven box 1</h2>
        <table class="schijven">
          <thead
            ><tr
              ><th>Inkomen tot</th><th>Tarief</th><th><span class="visueel-verborgen">Verwijder</span></th
              ></tr
            ></thead
          >
          <tbody>
            {#each scenario.box1.schijven as s, i (i)}
              <tr>
                <td>
                  {#if s.tot === null}<span class="notitie">en hoger</span>{:else}
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      bind:value={s.tot}
                      aria-label="Schijf {i + 1} tot"
                    />
                  {/if}
                </td>
                <td
                  ><input
                    type="number"
                    step="0.05"
                    min="0"
                    max="100"
                    bind:value={s.tarief}
                    aria-label="Tarief schijf {i + 1}"
                  /></td
                >
                <td>
                  {#if scenario.box1.schijven.length > 1}
                    <button
                      type="button"
                      class="stil"
                      onclick={() => schijfWeg(i)}
                      aria-label="Verwijder schijf {i + 1}">×</button
                    >
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        <button type="button" class="stil" onclick={schijfErbij}>+ schijf</button>
      </div>

      {#each groepenBasis as g (g.id)}
        <div class="groep">
          <h2 class="groepkop">{g.titel}</h2>
          {#if g.uitleg}<p class="notitie">{g.uitleg}</p>{/if}
          {#each g.knoppen as k (k.parameter)}{@render knopVeld(k)}{/each}
        </div>
      {/each}

      <details class="gevorderd">
        <summary>Meer instellingen</summary>
        {#each groepenGevorderd as g (g.id)}
          <div class="groep">
            <h2 class="groepkop">{g.titel}</h2>
            {#each g.knoppen as k (k.parameter)}{@render knopVeld(k)}{/each}
          </div>
        {/each}
      </details>

      <div class="groep">
        <h2 class="groepkop">Budgetneutraal maken</h2>
        <div class="knoppenrij">
          <button type="button" disabled={!basis || bezig} onclick={() => neutraal("vrijstelling")}
            >Via de vrijstelling</button
          >
          <button type="button" disabled={!basis || bezig} onclick={() => neutraal("tarieven")}
            >Via alle tarieven</button
          >
        </div>
        <p class="notitie" role="status">
          {neutraalMelding ||
            "Past de vrijstelling of alle tarieven aan tot de overheid per saldo niets wint of verliest."}
        </p>
      </div>

      <div class="groep">
        <h2 class="groepkop">Delen</h2>
        <div class="knoppenrij">
          <button type="button" onclick={kopieerLink} disabled={!toestand.w.length}
            >Kopieer link naar dit scenario</button
          >
          <button
            type="button"
            class="stil"
            onclick={() => (scenario = kloon(params))}
            disabled={!toestand.w.length}>Terug naar huidig</button
          >
        </div>
        <p class="notitie" role="status">{deelMelding}</p>
      </div>
    </div>
  </aside>

  <section class="uitkomsten" aria-live="polite" aria-labelledby="titel-uitkomsten">
    <h2 id="titel-uitkomsten" class="visueel-verborgen">Uitkomsten</h2>
    {#if melding}<p class="waarschuwing">{melding}</p>{/if}
    {#if toestand.fout}
      <p class="waarschuwing">Deze instellingen kloppen niet: {toestand.fout.replace(/^scenario: /, "")}</p>
    {/if}
    {#if laadFout}
      <p class="waarschuwing">De populatie kon niet geladen worden: {laadFout}</p>
    {:else if !uitkomst}
      <p class="notitie">Bezig met laden van de modelhuishoudens…</p>
    {:else}
      <div class="samenvatting">
        <span
          >Overheid <strong class:achteruit={uitkomst.saldoMld < -0.05}>{miljard(uitkomst.saldoMld)}</strong
          ></span
        >
        <span>Achteruit <strong class="achteruit">{getal(achteruit)}%</strong></span>
        <span>Vooruit <strong class="vooruit">{getal(vooruit)}%</strong></span>
      </div>

      <p class="kernzin">{kernzin}</p>

      <div class="kerngetallen">
        <div class="kerngetal">
          <div class="l">Overheid per saldo</div>
          <div class="w" class:achteruit={uitkomst.saldoMld < -0.05}>{miljard(uitkomst.saldoMld)}</div>
          <div class="t">per jaar; plus = meer inkomsten of minder uitgaven</div>
        </div>
        <div class="kerngetal">
          <div class="l">Armoederisico</div>
          <div class="w">{procent(basis!.armoede.personen)} → {procent(uitkomst.armoede.personen)}</div>
          <div class="t">
            kinderen {procent(basis!.armoede.kinderen)} → {procent(uitkomst.armoede.kinderen)}
          </div>
        </div>
        <div class="kerngetal">
          <div class="l">Ongelijkheid (Gini)</div>
          <div class="w">{getal(basis!.gini, 3)} → {getal(uitkomst.gini, 3)}</div>
          <div class="t">0 = iedereen evenveel, 1 = één persoon alles</div>
        </div>
        <div class="kerngetal">
          <div class="l">Erop achteruit / vooruit</div>
          <div class="w">
            <span class="achteruit">{getal(achteruit)}%</span> /
            <span class="vooruit">{getal(vooruit)}%</span>
          </div>
          <div class="t">van alle personen, meer dan 1% verschil</div>
        </div>
      </div>

      <JouwEffect {params} scenario={toestand.p} bind:invoer bind:ingevuld />

      <div class="kaart twee">
        <Figuur
          titel="Wie gaat erop vooruit of achteruit?"
          uitleg="Gemiddelde verandering van het besteedbaar inkomen per groep. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen (gecorrigeerd voor de grootte van het huishouden)."
        >
          {#snippet legenda()}
            <span><i class="legenda-blok" style="background: var(--gain)"></i>erop vooruit</span>
            <span><i class="legenda-blok" style="background: var(--loss)"></i>erop achteruit</span>
          {/snippet}
          {#snippet grafiek()}
            <StavenDivergent
              rijen={uitkomst.decielen.map((d, i) => ({
                label: `Groep ${i + 1}`,
                sub: i === 0 ? "laagste inkomens" : i === 9 ? "hoogste inkomens" : undefined,
                waarde: d.relatief,
                tekst: `${procentVerschil(d.relatief)} · ${euroVerschil(d.gemiddeld)}`,
                tip: [
                  `Groep ${i + 1}`,
                  `${euroVerschil(d.gemiddeld)} per huishouden per jaar`,
                  `${procentVerschil(d.relatief)} van het besteedbaar inkomen`,
                ],
              }))}
              asLabel={(v) => procentVerschil(v, Math.abs(v) < 1 && v !== 0 ? 1 : 0)}
              drempel={0.05}
              labelBreedte={120}
              beschrijving="Verandering van het besteedbaar inkomen per inkomensgroep"
            />
          {/snippet}
          {#snippet tabel()}
            <table class="data">
              <thead><tr><th>Groep</th><th>Per huishouden</th><th>In %</th></tr></thead>
              <tbody>
                {#each uitkomst.decielen as d, i (i)}
                  <tr
                    ><td>{i + 1}</td><td class="num">{euroVerschil(d.gemiddeld)}</td><td class="num"
                      >{procentVerschil(d.relatief)}</td
                    ></tr
                  >
                {/each}
              </tbody>
            </table>
          {/snippet}
        </Figuur>
        <Figuur
          titel="Hoeveel mensen winnen en verliezen?"
          uitleg="Aandeel personen per groep naar de grootte van hun verandering."
        >
          {#snippet legenda()}
            {#each KLASSEN as k (k.naam)}<span
                ><i class="legenda-blok" style="background: {k.kleur}"></i>{k.naam}</span
              >{/each}
          {/snippet}
          {#snippet grafiek()}
            <Gestapeld
              rijen={[
                ...uitkomst.decielen.map((d, i) => ({ label: `Groep ${i + 1}`, aandelen: d.aandelen })),
                { label: "Iedereen", aandelen: uitkomst.winnaars, vet: true },
              ]}
              beschrijving="Aandeel winnaars en verliezers per inkomensgroep"
            />
          {/snippet}
          {#snippet tabel()}
            <table class="data">
              <thead
                ><tr
                  ><th>Groep</th>{#each KLASSEN as k (k.naam)}<th>{k.naam}</th>{/each}</tr
                ></thead
              >
              <tbody>
                {#each uitkomst.decielen as d, i (i)}
                  <tr
                    ><td>{i + 1}</td>{#each d.aandelen as a, j (j)}<td class="num">{getal(a)}%</td>{/each}</tr
                  >
                {/each}
                <tr
                  ><td>Iedereen</td>{#each uitkomst.winnaars as a, j (j)}<td class="num">{getal(a)}%</td
                    >{/each}</tr
                >
              </tbody>
            </table>
          {/snippet}
        </Figuur>
      </div>

      <div class="kaart">
        <div class="kop-met-keuze">
          <h2>Netto inkomen en marginale druk</h2>
          <label>
            <span class="visueel-verborgen">Huishouden</span>
            <select bind:value={curveId}>
              {#each voorbeelden.curves as c (c.id)}<option value={c.id}>{c.label}</option>{/each}
            </select>
          </label>
        </div>
        <div class="twee">
          <Figuur titel="Wat houdt dit huishouden over?" uitleg="Besteedbaar inkomen bij elk bruto inkomen.">
            {#snippet legenda()}
              <span
                ><i class="legenda-lijn" style="border-color: var(--zero); border-top-style: dashed"
                ></i>Huidig {params.jaar}</span
              >
              <span><i class="legenda-lijn" style="border-color: var(--accent)"></i>Scenario</span>
            {/snippet}
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[
                  { naam: "Huidig", waarden: curve.nu.besteedbaar, soort: "huidig" },
                  { naam: "Scenario", waarden: curve.sc.besteedbaar, soort: "scenario" },
                ]}
                beschrijving="Besteedbaar inkomen bij elk bruto inkomen, huidig en scenario"
              />
            {/snippet}
          </Figuur>
          <Figuur titel="Hoeveel gaat er af van een extra euro?" uitleg="Pieken laten de armoedeval zien.">
            {#snippet legenda()}
              <span
                ><i class="legenda-lijn" style="border-color: var(--zero); border-top-style: dashed"
                ></i>Huidig {params.jaar}</span
              >
              <span><i class="legenda-lijn" style="border-color: var(--accent)"></i>Scenario</span>
            {/snippet}
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[
                  { naam: "Huidig", waarden: curve.nu.marginaleDruk, soort: "huidig" },
                  { naam: "Scenario", waarden: curve.sc.marginaleDruk, soort: "scenario" },
                ]}
                yLabel={(v) => procent(v, 0)}
                yMin={-20}
                yMax={120}
                beschrijving="Marginale druk bij elk bruto inkomen, huidig en scenario"
              />
            {/snippet}
          </Figuur>
        </div>
      </div>

      <div class="kaart">
        <Figuur
          titel="Wat betekent het voor deze huishoudens?"
          uitleg={jij
            ? "Verandering van het besteedbaar inkomen per jaar. De onderste rij is jouw situatie."
            : "Verandering van het besteedbaar inkomen per jaar. Vul hierboven je eigen situatie in om die hier te zien."}
        >
          {#snippet legenda()}
            <span><i class="legenda-blok" style="background: var(--gain)"></i>erop vooruit</span>
            <span><i class="legenda-blok" style="background: var(--loss)"></i>erop achteruit</span>
          {/snippet}
          {#snippet grafiek()}
            <StavenDivergent
              rijen={huishoudens.map((x) => ({
                label: `${x.label} · ${euro(x.a.bruto)}`,
                sub: x.sub,
                waarde: x.d,
                tekst: euroVerschil(x.d),
                tip: [
                  `${x.label}: ${x.sub}`,
                  `Belasting ${euro(x.a.belasting)} → ${euro(x.b.belasting)}`,
                  `Toeslagen ${euro(x.a.toeslagen)} → ${euro(x.b.toeslagen)}`,
                  `Besteedbaar ${euroVerschil(x.d)} per jaar (${euroVerschil(x.d / 12)} per maand)`,
                ],
              }))}
              asLabel={(v) => euroVerschil(v)}
              drempel={50}
              labelBreedte={220}
              beschrijving="Verandering van het besteedbaar inkomen per voorbeeldhuishouden"
            />
          {/snippet}
          {#snippet tabel()}
            <table class="data">
              <thead
                ><tr
                  ><th>Huishouden</th><th>Bruto</th><th>Nu</th><th>Scenario</th><th>Per jaar</th><th
                    >Per maand</th
                  ></tr
                ></thead
              >
              <tbody>
                {#each huishoudens as x (x.label)}
                  <tr>
                    <td>{x.label} <span class="notitie">{x.sub}</span></td>
                    <td class="num">{euro(x.a.bruto)}</td>
                    <td class="num">{euro(x.a.besteedbaar)}</td>
                    <td class="num">{euro(x.b.besteedbaar)}</td>
                    <td class="num">{euroVerschil(x.d)}</td>
                    <td class="num">{euroVerschil(x.d / 12)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/snippet}
        </Figuur>
      </div>

      <div class="kaart">
        <div class="kop-met-keuze">
          <h2>Vergelijk met een voorstel</h2>
          <label>
            <span class="visueel-verborgen">Voorstel om mee te vergelijken</span>
            <select bind:value={vergelijkId}>
              <option value="">Kies een voorstel…</option>
              {#each presets.filter((p) => p.wijzigingen.length) as pr (pr.id)}<option value={pr.id}
                  >{pr.naam}</option
                >{/each}
            </select>
          </label>
        </div>
        {#if vergelijking && rijenVergelijking.length}
          <div class="tabel-wrap">
            <table class="data">
              <thead><tr><th></th><th>Jouw scenario</th><th>{vergelijkNaam}</th></tr></thead>
              <tbody>
                {#each rijenVergelijking as rij (rij.label)}
                  <tr><td>{rij.label}</td><td class="num">{rij.a}</td><td class="num">{rij.b}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="notitie">
            Groepen: gemiddelde verandering van het besteedbaar inkomen ten opzichte van het huidige stelsel.
          </p>
        {:else}
          <p class="notitie">Zet je eigen scenario naast een bekend voorstel.</p>
        {/if}
      </div>

      <div class="kaart">
        <h2>Wat betekent het voor de overheid?</h2>
        <p class="notitie">
          Effect per jaar in miljarden euro; plus = meer inkomsten of minder uitgaven. Toeslagen zijn
          geschaald naar de raming van Dienst Toeslagen.
        </p>
        <div class="tabel-wrap">
          <table class="data">
            <thead><tr><th>Post</th><th>Effect</th></tr></thead>
            <tbody>
              {#each POSTEN as post (post.id)}
                {@const v = uitkomst.posten[post.id]}
                <tr>
                  <td>{post.label}</td>
                  <td class="num" class:vooruit={v > 0.05} class:achteruit={v < -0.05}
                    >{Math.abs(v) < 0.05 ? "–" : miljard(v)}</td
                  >
                </tr>
              {/each}
              <tr
                ><td><strong>Totaal</strong></td><td class="num"
                  ><strong>{miljard(uitkomst.saldoMld)}</strong></td
                ></tr
              >
            </tbody>
          </table>
        </div>
        <p class="notitie">
          Statische doorrekening op {getal(basis!.aantal)} modelhuishoudens die samen Nederland in {params.jaar}
          nabootsen.
          <a href={pad("methodiek")}>Hoe werkt het model en wat zit er niet in?</a>
        </p>
      </div>
    {/if}
  </section>
</div>

<style>
  .lab {
    display: grid;
    grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  .instellingen {
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 24px);
    overflow: auto;
    padding: 14px;
  }
  .paneel-knop {
    display: none;
    width: 100%;
    font-weight: 600;
  }
  @media (max-width: 900px) {
    .lab {
      grid-template-columns: minmax(0, 1fr);
    }
    .instellingen {
      position: static;
      max-height: none;
    }
    .paneel-knop {
      display: block;
    }
    .paneel-inhoud:not(.open) {
      display: none;
    }
  }
  .groep {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .groepkop {
    font-family: var(--f-body);
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted);
    margin: 0;
  }
  h2 {
    font-size: 18px;
    margin: 0 0 6px;
  }
  .presets,
  .knoppenrij {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .presets button,
  .knoppenrij button {
    font-size: 13px;
    padding: 5px 10px;
  }
  .schuif {
    display: grid;
    grid-template-columns: 1fr 82px;
    gap: 2px 8px;
    align-items: center;
  }
  .schuif label {
    grid-column: 1 / -1;
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 14px;
  }
  .schuif input[type="number"] {
    width: 100%;
    font-size: 13px;
    min-height: 32px;
    padding: 4px 6px;
  }
  .huidig {
    font-family: var(--f-num);
    font-size: 12px;
    color: var(--muted);
    white-space: nowrap;
  }
  .knop-uitleg {
    margin: -4px 0 4px;
  }
  .schakelaar {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .schijven {
    border-collapse: collapse;
    width: 100%;
  }
  .schijven th {
    font-size: 11px;
    text-align: left;
    color: var(--muted);
    font-weight: 600;
  }
  .schijven td {
    padding: 2px 4px 2px 0;
  }
  .schijven input {
    width: 100%;
    font-size: 13px;
    min-height: 32px;
    padding: 4px 6px;
  }
  .gevorderd {
    padding: 12px 0;
    border-bottom: 1px solid var(--line);
  }
  .gevorderd > summary {
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
  }
  .uitkomsten {
    /* Ruimte vasthouden tot de uitkomsten er zijn, zodat de pagina niet verspringt. */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .samenvatting {
    display: none;
  }
  @media (max-width: 900px) {
    .samenvatting {
      display: flex;
      position: sticky;
      top: 0;
      z-index: 4;
      gap: 14px;
      flex-wrap: wrap;
      justify-content: space-between;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
    }
    .samenvatting strong {
      font-family: var(--f-num);
    }
  }
  .kernzin {
    font-size: 18px;
    margin: 0;
    max-width: 70ch;
  }
  .twee {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
  }
  .kop-met-keuze {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .kop-met-keuze label {
    flex: 1 1 260px;
    min-width: 0;
  }
  .kop-met-keuze select {
    width: 100%;
  }
  .tabel-wrap {
    overflow-x: auto;
  }
</style>
