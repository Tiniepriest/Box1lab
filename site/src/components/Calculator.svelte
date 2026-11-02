<script lang="ts">
  import {
    aandeelUitVerdeling,
    berekenHuishouden,
    huishoudenUitInvoer,
    inkomenscurve,
    invoerSchema,
    marginaleDrukVan,
    metInkomen,
    pasToe,
    type Invoer,
    type Parameters,
    type Preset,
  } from "@box1lab/engine";
  import { euro, euroVerschil, getal, procent } from "../lib/format.ts";
  import { pad } from "../lib/pad.ts";
  import { SITUATIE_GEWIJZIGD, leesBewaard, voorbeeldInvoer } from "../lib/opslag.ts";
  import Figuur from "./grafieken/Figuur.svelte";
  import Lijnen from "./grafieken/Lijnen.svelte";
  import StavenDivergent from "./grafieken/StavenDivergent.svelte";
  import Waterval from "./grafieken/Waterval.svelte";
  import InvoerFormulier from "./Invoer.svelte";
  import JaarVergelijking from "./JaarVergelijking.svelte";

  let {
    params,
    plekGrenzen,
    presets,
    volgend = null,
    actueel = null,
  }: {
    params: Parameters;
    /** Verdeling van het gestandaardiseerd besteedbaar inkomen, gemaakt tijdens de build (zie lib/verdeling.ts). */
    plekGrenzen: number[];
    presets: Preset[];
    /** Parameters van volgend jaar, met de secties die nog geen bron hebben. */
    volgend?: { params: Parameters; nogNiet: string[]; geraamd: string[] } | null;
    /** Het tabblad met de nieuwste verkiezing of het Belastingplan, voor "Volgende stap" (D-064). */
    actueel?: { href: string; naam: string; soort: "verkiezing" | "akkoord"; jaar: number } | null;
  } = $props();

  // Heeft volgend jaar een eigen pagina (zoals het Belastingplan)? Dan staat het overzicht daar en hier alleen de kern.
  const jaarPagina = $derived(!!volgend && actueel?.jaar === volgend.params.jaar);

  // Wat doen de voorstellen met dit huishouden? De parametersets rekenen we één keer uit.
  const voorstelParams = presets
    .filter((pr) => pr.wijzigingen.length > 0)
    .map((pr) => ({ preset: pr, p: pasToe(params, pr.wijzigingen) }));

  let invoer = $state<Invoer>(voorbeeldInvoer(params));
  // Rekenen we met het voorbeeld of met wat de bezoeker zelf heeft ingevuld (en dus bewaard)?
  let eigen = $state(false);
  $effect(() => {
    const lees = () => (eigen = leesBewaard() !== null);
    lees();
    window.addEventListener(SITUATIE_GEWIJZIGD, lees);
    return () => window.removeEventListener(SITUATIE_GEWIJZIGD, lees);
  });

  // Op een telefoon staat de uitkomst onder het lange formulier: een balk onderaan laat hem zien zolang hij
  // nog onder het scherm ligt.
  let uitkomsten: HTMLElement;
  let balk = $state(false);
  $effect(() => {
    const waarnemer = new IntersectionObserver(([e]) => {
      balk = !e!.isIntersecting && e!.boundingClientRect.top > 0;
    });
    waarnemer.observe(uitkomsten);
    return () => waarnemer.disconnect();
  });

  const geldig = $derived(invoerSchema.safeParse($state.snapshot(invoer)));
  const huishouden = $derived(geldig.success ? huishoudenUitInvoer(geldig.data, params) : null);
  const r = $derived(huishouden ? berekenHuishouden(huishouden, params) : null);
  const marginaal = $derived(huishouden ? marginaleDrukVan(huishouden, params, 0, 100) : 0);

  const stappen = $derived.by(() => {
    if (!r) return [];
    const s: { label: string; bedrag: number; soort: "totaal" | "plus" | "min" }[] = [
      { label: "Bruto inkomen", bedrag: r.bruto, soort: "totaal" },
    ];
    if (r.pensioenpremie > 0) s.push({ label: "Pensioenpremie", bedrag: r.pensioenpremie, soort: "min" });
    s.push({ label: "Belasting en premies", bedrag: r.belasting, soort: "min" });
    if (r.zvw > 0) s.push({ label: "Bijdrage zorgverzekering", bedrag: r.zvw, soort: "min" });
    if (r.zorgtoeslag > 0) s.push({ label: "Zorgtoeslag", bedrag: r.zorgtoeslag, soort: "plus" });
    if (r.huurtoeslag > 0) s.push({ label: "Huurtoeslag", bedrag: r.huurtoeslag, soort: "plus" });
    if (r.kgb > 0) s.push({ label: "Kindgebonden budget", bedrag: r.kgb, soort: "plus" });
    if (r.kot > 0) s.push({ label: "Kinderopvangtoeslag", bedrag: r.kot, soort: "plus" });
    if (r.kinderbijslag > 0) s.push({ label: "Kinderbijslag", bedrag: r.kinderbijslag, soort: "plus" });
    s.push({ label: "Premie zorgverzekering", bedrag: r.zorgpremie, soort: "min" });
    s.push({ label: "Te besteden", bedrag: r.besteedbaar, soort: "totaal" });
    return s;
  });

  const positie = $derived(r ? aandeelUitVerdeling(r.besteedbaar / r.equivalentie, plekGrenzen) : null);

  // Bij bijstand zegt een curve over het bruto inkomen weinig: bijverdienen gaat van de uitkering af.
  const curve = $derived.by(() => {
    if (!huishouden || invoer.personen[0]!.soort === "bijstand") return null;
    const nu = huishouden.leden[0]!.inkomen;
    const max = Math.max(120000, Math.ceil((nu * 1.6) / 10000) * 10000);
    const x: number[] = [];
    for (let v = 0; v <= max; v += max / 120) x.push(Math.round(v));
    return { x, ...inkomenscurve((b) => metInkomen(huishouden, 0, b), params, params, x, 100), nu };
  });

  // Hetzelfde huishouden met de regels van volgend jaar, bij hetzelfde bruto inkomen: de kern voor "Volgende stap".
  const volgendJaar = $derived.by(() => {
    if (!volgend || !jaarPagina || !geldig.success || !r) return null;
    const r2 = berekenHuishouden(huishoudenUitInvoer(geldig.data, volgend.params), volgend.params);
    return r2.besteedbaar - r.besteedbaar;
  });

  const voorstellen = $derived(
    huishouden && r
      ? voorstelParams.map((v) => ({
          preset: v.preset,
          d: berekenHuishouden(huishouden, v.p, params).besteedbaar - r.besteedbaar,
        }))
      : [],
  );

  // Meer dan één volwassene, of kinderen: dan spreken we het huishouden aan met "jullie".
  const samen = $derived(invoer.personen.length > 1 || invoer.kinderen.length > 0);

  const effectief = $derived(
    r && r.bruto > 0
      ? ((r.belasting + r.zvw + r.zorgpremie - r.toeslagen - r.kinderbijslag) / r.bruto) * 100
      : 0,
  );
</script>

<div class="calculator">
  <section class="kaart formulier" aria-labelledby="titel-invoer">
    <h2 id="titel-invoer">Vul je situatie in</h2>
    {#if !eigen}
      <p class="voorbeeld">
        <strong>Dit is een voorbeeld:</strong> een alleenstaande met een modaal inkomen ({euro(
          params.loon.modaal,
        )}
        bruto per jaar met vakantiegeld) die huurt. Pas het aan naar jouw situatie.
      </p>
    {/if}
    <InvoerFormulier bind:invoer {params} />
  </section>

  <section class="uitkomsten" aria-live="polite" aria-labelledby="titel-uitkomst" bind:this={uitkomsten}>
    <h2 id="titel-uitkomst" class="visueel-verborgen">Uitkomst</h2>
    {#if !geldig.success || !r}
      <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
    {:else}
      <p class="kernzin">
        {eigen ? (samen ? "Jullie houden" : "Je houdt") : "In dit voorbeeld houd je"}
        <strong>{euro(r.besteedbaar / 12)}</strong> per maand over om van te leven ({euro(r.besteedbaar)} per jaar).
      </p>

      <div class="kerngetallen">
        {#if invoer.personen[0]!.soort === "bijstand"}
          <div class="kerngetal">
            <div class="l">Van € 100 bijverdienen houd je over</div>
            <div class="w">weinig of niets</div>
            <div class="t">wat je verdient, gaat van je bijstand af (soms mag je een deel houden)</div>
          </div>
        {:else}
          <div class="kerngetal">
            <div class="l">Van € 100 extra bruto houd je over</div>
            <div class="w">{euro(100 - marginaal)}</div>
            <div class="t">marginale druk {procent(marginaal, 0)}</div>
          </div>
        {/if}
        <div class="kerngetal">
          <div class="l">Belasting min toeslagen</div>
          <div class="w">{procent(effectief, 0)}</div>
          <div class="t">van je bruto inkomen (effectieve druk)</div>
        </div>
        <div class="kerngetal">
          <div class="l">Je plek in Nederland</div>
          {#if positie !== null}
            <div class="w">{getal(positie * 100)}%</div>
            <div class="t">van de mensen heeft minder te besteden dan {samen ? "jullie" : "jij"}</div>
          {/if}
        </div>
      </div>

      <section class="volgende" aria-labelledby="titel-volgende">
        <h2 id="titel-volgende">Volgende stap</h2>
        <div class="stappen">
          {#if actueel}
            <a class="kaart stap" href={actueel.href}>
              <strong>{actueel.naam}</strong>
              <span>
                {#if volgendJaar !== null}
                  {#if Math.abs(volgendJaar) < 1}
                    In {actueel.jaar}
                    {samen ? "houden jullie" : "houd je"} volgens het plan van het kabinet evenveel over.
                  {:else}
                    In {actueel.jaar}
                    {samen ? "houden jullie" : "houd je"} volgens het plan van het kabinet
                    <strong class={volgendJaar > 0 ? "vooruit" : "achteruit"}
                      >{euro(Math.abs(volgendJaar / 12))}</strong
                    >
                    per maand {volgendJaar > 0 ? "meer" : "minder"} over{volgend?.params.status ===
                    "voorlopig"
                      ? " (voorlopig)"
                      : ""}.
                  {/if}
                {/if}
                {actueel.soort === "akkoord"
                  ? "Wat veranderen de routes naar een meerderheid daaraan?"
                  : "Wat doen de plannen van de partijen met jou?"}
              </span>
              <span class="actie">Bekijk {actueel.naam} →</span>
            </a>
          {/if}
          <a class="kaart stap" href={pad("lab")}>
            <strong>Scenariolab</strong>
            <span
              >Verander zelf de regels, of kies een kant-en-klaar voorstel, en zie wat het met jou doet.</span
            >
            <span class="actie">Naar het Scenariolab →</span>
          </a>
        </div>
      </section>

      <div class="kaart">
        <Figuur
          titel="Van bruto naar netto: waar gaat je geld heen?"
          uitleg="Belasting en premies gaan eraf, toeslagen en kinderbijslag komen erbij. Huur, hypotheek en kosten van kinderopvang moet je nog van het bedrag onderaan betalen."
        >
          {#snippet grafiek()}
            <Waterval {stappen} beschrijving="Waterval van bruto inkomen naar besteedbaar inkomen" />
          {/snippet}
          {#snippet tabel()}
            <table class="data">
              <thead><tr><th>Stap</th><th>Per jaar</th><th>Per maand</th></tr></thead>
              <tbody>
                {#each stappen as s (s.label)}
                  <tr>
                    <td>{s.label}</td>
                    <td class="num"
                      >{s.soort === "min" ? "−" : s.soort === "plus" ? "+" : ""}{euro(s.bedrag)}</td
                    >
                    <td class="num">{euro(s.bedrag / 12)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/snippet}
        </Figuur>
        {#if r.eigenWoning > 0}
          <p class="notitie">
            De hypotheekrenteaftrek scheelt je {euro(r.eigenWoning)} belasting per jaar; dat zit al in de belasting
            hierboven.
          </p>
        {/if}
      </div>

      {#if curve}
        <div class="kaart">
          <Figuur
            titel="Wat houd je over als je meer of minder verdient?"
            uitleg={invoer.personen.length === 2
              ? "Het bruto inkomen van de eerste persoon verandert; de rest van het huishouden blijft gelijk."
              : "Je bruto inkomen verandert; de rest blijft gelijk."}
          >
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[{ naam: "Te besteden", waarden: curve.besteedbaar, soort: "scenario" }]}
                markering={{ x: curve.nu, label: "jij" }}
                beschrijving="Besteedbaar inkomen bij verschillende bruto inkomens"
              />
            {/snippet}
          </Figuur>
          <Figuur
            titel="Hoeveel gaat er af van elke extra euro?"
            uitleg="De marginale druk: belasting plus toeslagen die je kwijtraakt. Pieken boven de 50% heten de armoedeval."
          >
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[{ naam: "Marginale druk", waarden: curve.marginaleDruk, soort: "scenario" }]}
                yLabel={(v) => procent(v, 0)}
                yMin={-20}
                yMax={110}
                markering={{ x: curve.nu, label: "jij" }}
                beschrijving="Marginale druk bij verschillende bruto inkomens"
              />
            {/snippet}
          </Figuur>
        </div>
      {/if}
      {#if volgend && !jaarPagina && geldig.success}
        <JaarVergelijking {params} {volgend} {invoer} />
      {/if}
      {#if voorstellen.length}
        <div class="kaart">
          <Figuur
            titel="Wat doen de voorstellen met {samen ? 'jullie' : 'jou'}?"
            uitleg="Verandering van wat {samen
              ? 'jullie'
              : 'je'} per maand overhoudt als het voorstel zou worden ingevoerd."
          >
            {#snippet legenda()}
              <span><i class="legenda-blok" style="background: var(--gain)"></i>meer over</span>
              <span><i class="legenda-blok" style="background: var(--loss)"></i>minder over</span>
            {/snippet}
            {#snippet grafiek()}
              <StavenDivergent
                rijen={voorstellen.map((v) => ({
                  label: v.preset.naam,
                  waarde: v.d / 12,
                  tekst: euroVerschil(v.d / 12),
                  tip: [
                    v.preset.naam,
                    `${euroVerschil(v.d / 12)} per maand`,
                    `${euroVerschil(v.d)} per jaar`,
                  ],
                }))}
                asLabel={(v) => euroVerschil(v)}
                drempel={5}
                labelBreedte={220}
                beschrijving="Verandering per maand per voorstel voor dit huishouden"
              />
            {/snippet}
            {#snippet tabel()}
              <table class="data">
                <thead><tr><th>Voorstel</th><th>Per maand</th><th>Per jaar</th></tr></thead>
                <tbody>
                  {#each voorstellen as v (v.preset.id)}
                    <tr>
                      <td><a href={pad(`voorstellen/${v.preset.id}`)}>{v.preset.naam}</a></td>
                      <td class="num">{euroVerschil(v.d / 12)}</td>
                      <td class="num">{euroVerschil(v.d)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/snippet}
          </Figuur>
          <p class="notitie">
            <a href={pad("voorstellen")}>Bekijk alle voorstellen</a> en wat ze voor heel Nederland doen.
          </p>
        </div>
      {/if}
      <p class="notitie">
        Dit is een vereenvoudigde berekening voor {params.jaar}. Niet meegenomen: box 2 en 3, jongerennormen
        en de kostendelersnorm in de bijstand, gemeentelijke regelingen en afronding door de Belastingdienst.
        <a href={pad("methodiek")}>Hoe rekenen we?</a>
      </p>
    {/if}
  </section>
</div>

{#if balk && r}
  <div class="snelbalk">
    <span
      >{eigen ? (samen ? "Jullie houden" : "Je houdt") : "Voorbeeld:"}
      <strong>{euro(r.besteedbaar / 12)}</strong> per maand over</span
    >
    <button type="button" onclick={() => uitkomsten.scrollIntoView({ behavior: "smooth", block: "start" })}
      >Bekijk ↓</button
    >
  </div>
{/if}

<style>
  .volgende h2 {
    font-size: 18px;
    margin: 0 0 8px;
  }
  .stappen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .stap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--fg);
    text-decoration: none;
    font-size: 15px;
    padding: 14px;
  }
  .stap:hover {
    border-color: var(--accent);
  }
  .stap > strong {
    font-size: 16px;
  }
  .stap span {
    flex: 1;
  }
  .stap .actie {
    flex: 0;
    color: var(--accent);
    font-weight: 600;
  }
  .calculator {
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .calculator {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .formulier {
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 24px);
    overflow: auto;
  }
  @media (max-width: 900px) {
    .formulier {
      position: static;
      max-height: none;
    }
  }
  h2 {
    font-size: 20px;
    margin: 0 0 12px;
  }
  .uitkomsten {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .kernzin {
    font-size: 19px;
    margin: 0;
  }
  .voorbeeld {
    margin: 0 0 12px;
    font-size: 14px;
    border: 1px dashed var(--warn);
    background: var(--warn-bg);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .snelbalk {
    display: none;
  }
  @media (max-width: 900px) {
    .snelbalk {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
      background: var(--panel);
      border-top: 1px solid var(--line);
      box-shadow: 0 -4px 12px rgb(0 0 0 / 8%);
      font-size: 15px;
    }
    .snelbalk button {
      flex: 0 0 auto;
    }
  }
  .kaart :global(.figuur + .figuur) {
    margin-top: 18px;
  }
</style>
