<script lang="ts">
  import {
    aandeelOnder,
    berekenHuishouden,
    huishoudenUitInvoer,
    inkomenscurve,
    invoerSchema,
    marginaleDrukVan,
    metInkomen,
    type Invoer,
    type Kalibratie,
    type Parameters,
  } from "@box1lab/engine";
  import { euro, getal, procent } from "../lib/format.ts";
  import { startRekenen, type BasisSamenvatting } from "../lib/rekenen.ts";
  import { pad } from "../lib/pad.ts";
  import { voorbeeldInvoer } from "../lib/opslag.ts";
  import Figuur from "./grafieken/Figuur.svelte";
  import Lijnen from "./grafieken/Lijnen.svelte";
  import Waterval from "./grafieken/Waterval.svelte";
  import InvoerFormulier from "./Invoer.svelte";

  let {
    params,
    kalibratie,
    populatieUrl,
  }: { params: Parameters; kalibratie: Kalibratie; populatieUrl: string } = $props();

  let invoer = $state<Invoer>(voorbeeldInvoer());
  let basis = $state<BasisSamenvatting | null>(null);
  let laadFout = $state("");

  $effect(() => {
    startRekenen(params, kalibratie, populatieUrl).then(
      (b) => (basis = b),
      (e: Error) => (laadFout = e.message),
    );
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

  const positie = $derived.by(() => {
    if (!basis || !r) return null;
    const aandeel = aandeelOnder(
      r.besteedbaar / r.equivalentie,
      basis.gestandaardiseerd,
      basis.persoonsgewichten,
    );
    return { aandeel, deciel: Math.min(10, Math.floor(aandeel * 10) + 1) };
  });

  // Bij bijstand zegt een curve over het bruto inkomen weinig: bijverdienen gaat van de uitkering af.
  const curve = $derived.by(() => {
    if (!huishouden || invoer.personen[0]!.soort === "bijstand") return null;
    const nu = huishouden.leden[0]!.inkomen;
    const max = Math.max(120000, Math.ceil((nu * 1.6) / 10000) * 10000);
    const x: number[] = [];
    for (let v = 0; v <= max; v += max / 120) x.push(Math.round(v));
    return { x, ...inkomenscurve((b) => metInkomen(huishouden, 0, b), params, params, x, 100), nu };
  });

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
    <InvoerFormulier bind:invoer {params} />
  </section>

  <section class="uitkomsten" aria-live="polite" aria-labelledby="titel-uitkomst">
    <h2 id="titel-uitkomst" class="visueel-verborgen">Uitkomst</h2>
    {#if !geldig.success || !r}
      <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
    {:else}
      <p class="kernzin">
        {samen ? "Jullie houden" : "Je houdt"} <strong>{euro(r.besteedbaar / 12)}</strong> per maand over om
        van te leven ({euro(r.besteedbaar)} per jaar).
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
          {#if positie}
            <div class="w">{getal(positie.aandeel * 100)}%</div>
            <div class="t">van de mensen heeft minder te besteden dan {samen ? "jullie" : "jij"}</div>
          {:else if laadFout}
            <div class="t">Kon de verdeling niet laden.</div>
          {:else}
            <div class="t">Laden…</div>
          {/if}
        </div>
      </div>

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
      <p class="notitie">
        Dit is een vereenvoudigde berekening voor {params.jaar}. Niet meegenomen: box 2 en 3,
        ondernemersaftrek, gemeentelijke regelingen en afronding door de Belastingdienst.
        <a href={pad("methodiek")}>Hoe rekenen we?</a>
      </p>
    {/if}
  </section>
</div>

<style>
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
  .kaart :global(.figuur + .figuur) {
    margin-top: 18px;
  }
</style>
