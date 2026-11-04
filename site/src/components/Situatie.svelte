<script lang="ts">
  import {
    berekenHuishouden,
    huishoudenUitInvoer,
    invoerSchema,
    overVanInkomen,
    type Invoer,
    type Parameters,
  } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";
  import { SITUATIE_GEWIJZIGD, leesBewaard, voorbeeldInvoer } from "../lib/opslag.ts";
  import { OPEN_SITUATIE, samenvatting } from "../lib/situatie.ts";
  import InvoerFormulier from "./Invoer.svelte";

  /*
   * "Gerekend met jouw situatie": de kolom links op de tabbladen Belastingplan en Scenariolab (D-064). Laat zien wat
   * er is ingevuld en wat je nu overhoudt, met een knop om het aan te passen. Het formulier bewaart in de browser
   * (D-052); andere onderdelen op de pagina luisteren naar SITUATIE_GEWIJZIGD en rekenen mee.
   */
  let {
    params,
    invoer = $bindable(voorbeeldInvoer(params)),
    eigen = $bindable(false),
    plakken = false,
    zelfstandig = true,
  }: {
    /** De parameters van nu: daarmee rekenen we "je houdt nu ... over". */
    params: Parameters;
    invoer?: Invoer;
    /** Er is een eigen situatie bewaard; anders rekent de pagina met een voorbeeld. */
    eigen?: boolean;
    /** Op een telefoon bovenaan blijven staan bij het scrollen. */
    plakken?: boolean;
    /** Een eigen kolom die blijft staan bij het scrollen; in het lab staat hij in de kolom met instellingen. */
    zelfstandig?: boolean;
  } = $props();

  let open = $state(false);
  let melding = $state("");
  let kolom: HTMLElement;

  $effect(() => {
    const bewaard = leesBewaard();
    if (bewaard) {
      invoer = bewaard.invoer;
      eigen = true;
    }
    const gewijzigd = () => {
      eigen = leesBewaard() !== null;
      // Gewist: terug naar het voorbeeld. Het formulier sluiten we, zodat het het voorbeeld niet meteen bewaart.
      if (!eigen) {
        open = false;
        invoer = voorbeeldInvoer(params);
        melding = "Je gegevens zijn gewist. We rekenen weer met een voorbeeld.";
      } else melding = "";
    };
    const openen = () => {
      open = true;
      kolom.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(SITUATIE_GEWIJZIGD, gewijzigd);
    window.addEventListener(OPEN_SITUATIE, openen);
    return () => {
      window.removeEventListener(SITUATIE_GEWIJZIGD, gewijzigd);
      window.removeEventListener(OPEN_SITUATIE, openen);
    };
  });

  const regels = $derived(samenvatting(invoer));
  const nu = $derived.by(() => {
    const geldig = invoerSchema.safeParse($state.snapshot(invoer));
    return geldig.success
      ? overVanInkomen(berekenHuishouden(huishoudenUitInvoer(geldig.data, params), params))
      : null;
  });
  const samen = $derived(invoer.personen.length > 1 || invoer.kinderen.length > 0);
</script>

<section
  class="kaart situatie"
  class:open
  class:plakken
  class:zelfstandig
  class:voorbeeld={!eigen}
  aria-labelledby="titel-situatie"
  bind:this={kolom}
>
  <div class="kop">
    <h2 id="titel-situatie">{eigen ? "Gerekend met jouw situatie" : "Gerekend met een voorbeeld"}</h2>
    <button
      type="button"
      class:primair={!eigen && !open}
      aria-expanded={open}
      aria-controls="situatie-formulier"
      onclick={() => (open = !open)}
    >
      {open ? "Klaar" : eigen ? "Aanpassen" : "Vul je situatie in"}
    </button>
  </div>
  {#if !open}
    <p class="kort">{regels.join(" · ")}</p>
    <ul class="regels">
      {#each regels as r (r)}<li>{r}</li>{/each}
    </ul>
    {#if nu !== null}
      <p class="nu">
        {samen ? "Jullie houden" : "Je houdt"} nu <strong class="num">{euro(nu / 12)}</strong> per maand over
        ({params.jaar}).
      </p>
    {/if}
    {#if !eigen}
      <p class="notitie uitleg">
        {melding ||
          "Dit is een voorbeeld: een alleenstaande met een modaal inkomen. Vul je eigen situatie in om te zien wat het voor jou betekent."}
      </p>
    {/if}
  {:else}
    <div id="situatie-formulier" class="formulier">
      <InvoerFormulier bind:invoer {params} />
      <button type="button" class="primair" onclick={() => (open = false)}>Klaar</button>
    </div>
  {/if}
</section>

<style>
  .situatie {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
  }
  /* Een voorbeeld ligt plat op het papier; een eigen situatie is een vlak. */
  .voorbeeld {
    background: var(--soft);
    box-shadow: none;
  }
  .kop {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 6px 10px;
  }
  h2 {
    font-family: var(--f-body);
    font-size: 15px;
    margin: 0;
  }
  .kop button {
    font-size: 14px;
    padding: 4px 10px;
  }
  .kort {
    display: none;
  }
  .regels {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 14px;
  }
  .regels li + li {
    margin-top: 2px;
  }
  .nu {
    margin: 0;
    font-size: 14px;
    border-top: 1px solid var(--line);
    padding-top: 8px;
  }
  .uitleg {
    margin: 0;
  }
  .formulier {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  .formulier :global(form) {
    width: 100%;
  }
  /* Naast de inhoud: blijft staan bij het scrollen; een lang formulier scrolt binnen de kolom. */
  @media (min-width: 901px) {
    .zelfstandig {
      position: sticky;
      top: 12px;
      max-height: calc(100vh - 24px);
      overflow: auto;
    }
  }
  /* Op een telefoon: een balk met één regel samenvatting. */
  @media (max-width: 900px) {
    .regels,
    .nu {
      display: none;
    }
    .kort {
      display: block;
      margin: 0;
      font-size: 13px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .situatie {
      padding: 10px 12px;
      gap: 4px;
    }
    .plakken:not(.open) {
      position: sticky;
      top: 0;
      z-index: 5;
      box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
    }
  }
</style>
