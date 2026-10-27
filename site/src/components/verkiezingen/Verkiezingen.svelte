<script lang="ts">
  import {
    MODEL_VERSIE,
    effectVoorHuishouden,
    huishoudenUitInvoer,
    invoerSchema,
    type Invoer,
    type Parameters,
    type Partij,
    type Verkiezing,
  } from "@box1lab/engine";
  import { euroVerschil, getal, miljard, procent, procentVerschil } from "../../lib/format.ts";
  import { leesInvoer, voorbeeldInvoer } from "../../lib/opslag.ts";
  import { pad } from "../../lib/pad.ts";
  import { REPO, meldFoutUrl } from "../../lib/project.ts";
  import Figuur from "../grafieken/Figuur.svelte";
  import StavenDivergent from "../grafieken/StavenDivergent.svelte";
  import InvoerFormulier from "../Invoer.svelte";

  interface Macro {
    saldoMld: number;
    armoede: number;
    armoedeNu: number;
    gini: number;
    giniNu: number;
    decielen: number[];
  }

  let {
    params,
    verkiezing,
    partijen,
    macro,
    preview,
  }: {
    params: Parameters;
    verkiezing: Verkiezing;
    partijen: Partij[];
    macro: Record<string, Macro>;
    preview: boolean;
  } = $props();

  let invoer = $state<Invoer>(voorbeeldInvoer());
  let eigenSituatie = $state(false);
  $effect(() => {
    const opgeslagen = leesInvoer();
    if (opgeslagen) {
      invoer = opgeslagen;
      eigenSituatie = true;
    }
  });

  let sorteren = $state<"alfabet" | "uitkomst">("alfabet");

  const geldig = $derived(invoerSchema.safeParse($state.snapshot(invoer)));
  const effecten = $derived.by(() => {
    if (!geldig.success) return [];
    const h = huishoudenUitInvoer(geldig.data, params);
    const lijst = partijen.map((p) => ({ partij: p, ...effectVoorHuishouden(h, params, p) }));
    return sorteren === "uitkomst" ? [...lijst].sort((a, b) => b.totaal - a.totaal) : lijst;
  });

  const CATEGORIE: Record<string, string> = {
    belasting: "Belasting",
    toeslagen: "Toeslagen",
    zorg: "Zorg",
    wonen: "Wonen",
    uitkeringen: "Uitkeringen",
  };
  const ZEKERHEID: Record<string, string> = {
    hoog: "Zeker: het programma noemt een bedrag",
    middel: "Redelijk zeker: uitwerking door ons ingevuld",
    laag: "Onzeker: vertaling is een aanname",
  };

  function bronLink(p: Partij, document: string): string {
    return document === "programma" ? p.programma.url : (p.bronnen[document] ?? p.programma.url);
  }

  let vergelijkA = $state(partijen[0]?.id ?? "");
  let vergelijkB = $state(partijen[1]?.id ?? "");
</script>

<div class="verkiezingen">
  {#if verkiezing.fictief}
    <p class="waarschuwing fictief" role="note">
      <strong>Dit is een voorbeeld met fictieve partijen.</strong> De partijen op deze pagina bestaan niet; hun
      "programma's" zijn verzonnen om deze pagina te testen.
    </p>
  {/if}
  {#if preview}
    <p class="waarschuwing" role="note">
      Previewmodus: ook partijen die nog niet gecontroleerd zijn, staan hieronder.
    </p>
  {/if}

  <section class="kaart situatie">
    <p>
      {eigenSituatie ? "Je opgeslagen situatie" : "Een voorbeeldhuishouden"}: we rekenen uit hoeveel er per
      jaar meer of minder te besteden is dan onder het basispad.
    </p>
    <details>
      <summary>Pas je situatie aan</summary>
      <InvoerFormulier bind:invoer {params} standaarden={null} />
    </details>
  </section>

  {#if !geldig.success}
    <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
  {:else if effecten.length === 0}
    <p class="notitie">Er zijn nog geen partijen gepubliceerd.</p>
  {:else}
    <div class="kaart">
      <Figuur
        titel="Wat betekenen de plannen voor jouw huishouden?"
        uitleg="Verandering van het besteedbaar inkomen per jaar ten opzichte van het basispad. Alleen maatregelen die het model kan doorrekenen; zie per partij wat niet is meegenomen."
      >
        {#snippet legenda()}
          <span><i class="legenda-blok" style="background: var(--gain)"></i>meer te besteden</span>
          <span><i class="legenda-blok" style="background: var(--loss)"></i>minder te besteden</span>
          <span class="sorteren">
            Volgorde:
            <button type="button" aria-pressed={sorteren === "alfabet"} onclick={() => (sorteren = "alfabet")}
              >alfabet</button
            >
            <button
              type="button"
              aria-pressed={sorteren === "uitkomst"}
              onclick={() => (sorteren = "uitkomst")}>uitkomst</button
            >
          </span>
        {/snippet}
        {#snippet grafiek()}
          <StavenDivergent
            rijen={effecten.map((e) => ({
              label: e.partij.naam,
              sub: `${e.partij.maatregelen.length} maatregelen doorgerekend`,
              waarde: e.totaal,
              tekst: `${euroVerschil(e.totaal)} per jaar`,
              tip: [
                e.partij.naam,
                `${euroVerschil(e.totaal)} per jaar`,
                `${euroVerschil(e.totaal / 12)} per maand`,
              ],
            }))}
            asLabel={(v) => euroVerschil(v)}
            drempel={25}
            labelBreedte={190}
            beschrijving="Verandering van het besteedbaar inkomen per partij"
          />
        {/snippet}
        {#snippet tabel()}
          <table class="data">
            <thead><tr><th>Partij</th><th>Per jaar</th><th>Per maand</th></tr></thead>
            <tbody>
              {#each effecten as e (e.partij.id)}
                <tr>
                  <td>{e.partij.naam}</td>
                  <td class="num">{euroVerschil(e.totaal)}</td>
                  <td class="num">{euroVerschil(e.totaal / 12)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/snippet}
      </Figuur>
    </div>

    <section class="partijen" aria-label="Per partij">
      {#each effecten as e (e.partij.id)}
        {@const m = macro[e.partij.id]!}
        <details class="kaart partij">
          <summary>
            <span class="naam">{e.partij.naam}</span>
            <span class="num" class:vooruit={e.totaal > 25} class:achteruit={e.totaal < -25}
              >{euroVerschil(e.totaal)} per jaar</span
            >
            {#if e.partij.status !== "gepubliceerd"}<span class="status">{e.partij.status}</span>{/if}
          </summary>

          <h3>Maatregelen en wat ze voor jou betekenen</h3>
          <div class="tabel-wrap">
            <table class="data maatregelen">
              <thead
                ><tr><th>Maatregel</th><th>Onderwerp</th><th>Voor jou</th><th>Bron</th><th>Zekerheid</th></tr
                ></thead
              >
              <tbody>
                {#each e.perMaatregel as pm (pm.maatregel.id)}
                  <tr>
                    <td class="tekst">
                      {pm.maatregel.omschrijving}
                      {#if pm.maatregel.toelichting}<br /><span class="notitie"
                          >{pm.maatregel.toelichting}</span
                        >{/if}
                    </td>
                    <td>{CATEGORIE[pm.maatregel.categorie]}</td>
                    <td class="num">{euroVerschil(pm.effect)}</td>
                    <td class="tekst">
                      <a href={bronLink(e.partij, pm.maatregel.bron.document)} rel="noopener"
                        >{pm.maatregel.bron.document === "programma"
                          ? "programma"
                          : pm.maatregel.bron.document}, p. {pm.maatregel.bron.pagina}</a
                      >
                      {#if pm.maatregel.bron.citaat}<br /><q class="notitie">{pm.maatregel.bron.citaat}</q
                        >{/if}
                    </td>
                    <td class="tekst">{ZEKERHEID[pm.maatregel.zekerheid]}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          {#if e.partij.niet_gemodelleerd.length}
            <h3>Niet meegenomen</h3>
            <ul>
              {#each e.partij.niet_gemodelleerd as n (n)}<li>{n}</li>{/each}
            </ul>
          {/if}

          <h3>Wat doet het voor Nederland?</h3>
          <div class="kerngetallen klein">
            <div class="kerngetal">
              <div class="l">Overheid per saldo</div>
              <div class="w">{miljard(m.saldoMld)}</div>
            </div>
            <div class="kerngetal">
              <div class="l">Armoederisico</div>
              <div class="w">{procent(m.armoedeNu)} → {procent(m.armoede)}</div>
            </div>
            <div class="kerngetal">
              <div class="l">Gini</div>
              <div class="w">{getal(m.giniNu, 3)} → {getal(m.gini, 3)}</div>
            </div>
          </div>
          <table class="data decielen">
            <thead
              ><tr
                ><th>Inkomensgroep</th>{#each m.decielen as _, i (i)}<th>{i + 1}</th>{/each}</tr
              ></thead
            >
            <tbody
              ><tr
                ><td>Verandering</td>{#each m.decielen as d, i (i)}<td class="num">{procentVerschil(d)}</td
                  >{/each}</tr
              ></tbody
            >
          </table>

          <p class="notitie">
            Programma: <a href={e.partij.programma.url} rel="noopener">{e.partij.programma.titel}</a>,
            geraadpleegd op
            {new Date(e.partij.programma.geraadpleegd).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}.
            {#if e.partij.gecontroleerd_door}Gecontroleerd door {e.partij.gecontroleerd_door}.{/if}
          </p>
        </details>
      {/each}
    </section>

    {#if partijen.length >= 2}
      <section class="kaart">
        <h2>Twee partijen naast elkaar</h2>
        <div class="vergelijk-keuze">
          <label
            >Partij 1 <select bind:value={vergelijkA}
              >{#each partijen as p (p.id)}<option value={p.id}>{p.naam}</option>{/each}</select
            ></label
          >
          <label
            >Partij 2 <select bind:value={vergelijkB}
              >{#each partijen as p (p.id)}<option value={p.id}>{p.naam}</option>{/each}</select
            ></label
          >
        </div>
        {#if vergelijkA && vergelijkB}
          {@const a = effecten.find((x) => x.partij.id === vergelijkA)!}
          {@const b = effecten.find((x) => x.partij.id === vergelijkB)!}
          {@const ma = macro[vergelijkA]!}
          {@const mb = macro[vergelijkB]!}
          <div class="tabel-wrap">
            <table class="data">
              <thead><tr><th></th><th>{a.partij.naam}</th><th>{b.partij.naam}</th></tr></thead>
              <tbody>
                <tr
                  ><td>Voor jouw huishouden, per jaar</td><td class="num">{euroVerschil(a.totaal)}</td><td
                    class="num">{euroVerschil(b.totaal)}</td
                  ></tr
                >
                <tr
                  ><td>Overheid per saldo</td><td class="num">{miljard(ma.saldoMld)}</td><td class="num"
                    >{miljard(mb.saldoMld)}</td
                  ></tr
                >
                <tr
                  ><td>Armoederisico</td><td class="num">{procent(ma.armoede)}</td><td class="num"
                    >{procent(mb.armoede)}</td
                  ></tr
                >
                <tr
                  ><td>Gini</td><td class="num">{getal(ma.gini, 3)}</td><td class="num"
                    >{getal(mb.gini, 3)}</td
                  ></tr
                >
                {#each ma.decielen as d, i (i)}
                  <tr
                    ><td>Inkomensgroep {i + 1}</td><td class="num">{procentVerschil(d)}</td><td class="num"
                      >{procentVerschil(mb.decielen[i]!)}</td
                    ></tr
                  >
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}
  {/if}

  <section class="kaart disclaimer" aria-label="Belangrijk">
    <h2>Belangrijk om te weten</h2>
    <ul>
      <li>
        <strong>Geen stemadvies.</strong> Deze pagina laat alleen zien wat de doorrekenbare plannen doen voor inkomens.
      </li>
      <li>
        <strong>Vereenvoudigd.</strong> Niet alle maatregelen zijn door te rekenen; per partij staat wat er niet
        in zit. Het CPB (Keuzes in Kaart) is leidend.
      </li>
      <li><strong>Basispad.</strong> {verkiezing.basispad.toelichting}</li>
      <li>
        Hoe we programma's vertalen, staat in de <a href="{REPO}/blob/main/docs/METHODIEK-VERKIEZINGEN.md"
          >methodiek</a
        >. Zie je een fout?
        <a href={meldFoutUrl(`parameterjaar ${params.jaar}, model ${MODEL_VERSIE}`)} data-meldfout>Meld het</a
        >.
      </li>
    </ul>
    <p class="notitie"><a href={pad("methodiek")}>Hoe rekent Box1lab?</a></p>
  </section>
</div>

<style>
  .verkiezingen {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .fictief {
    font-size: 15px;
  }
  .situatie p {
    margin: 0 0 8px;
  }
  .situatie summary,
  .partij summary {
    cursor: pointer;
  }
  .situatie details[open] summary {
    margin-bottom: 12px;
  }
  .sorteren {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-left: auto;
  }
  .sorteren button {
    font-size: 12px;
    padding: 3px 8px;
  }
  .partijen {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .partij summary {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: baseline;
    font-size: 17px;
  }
  .partij .naam {
    font-weight: 600;
  }
  .status {
    font-size: 12px;
    background: var(--warn-bg);
    color: var(--warn);
    border-radius: 4px;
    padding: 1px 6px;
  }
  h3 {
    font-family: var(--f-body);
    font-size: 15px;
    margin: 18px 0 6px;
  }
  h2 {
    font-size: 19px;
    margin: 0 0 8px;
  }
  .maatregelen td.tekst {
    white-space: normal;
    min-width: 160px;
  }
  .klein {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    margin-bottom: 10px;
  }
  .klein .w {
    font-size: 17px;
  }
  .decielen {
    font-size: 12px;
  }
  .tabel-wrap,
  .decielen {
    overflow-x: auto;
    display: block;
  }
  .vergelijk-keuze {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin-bottom: 10px;
  }
  .disclaimer ul {
    margin: 0;
    padding-left: 18px;
  }
</style>
