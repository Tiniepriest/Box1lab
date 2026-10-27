<script lang="ts">
  import {
    berekenHuishouden,
    huishoudenUitInvoer,
    invoerSchema,
    pasToe,
    type Invoer,
    type Parameters,
    type Wijziging,
  } from "@box1lab/engine";
  import { euro, euroVerschil } from "../lib/format.ts";
  import { leesBewaard, voorbeeldInvoer } from "../lib/opslag.ts";
  import InvoerFormulier from "./Invoer.svelte";

  /*
   * "Wat betekent dit voor jou?": het effect van een scenario of voorstel op het eigen huishouden, naast de
   * landelijke cijfers. Gebruikt de situatie die in dit tabblad of op dit apparaat bewaard is (D-052); zonder
   * bewaarde situatie kun je hem hier invullen.
   */
  let {
    params,
    scenario,
    wijzigingen,
    invoer = $bindable(voorbeeldInvoer()),
    ingevuld = $bindable(false),
  }: {
    params: Parameters;
    /** Het scenario als parameterset (lab) ... */
    scenario?: Parameters;
    /** ... of als wijzigingen op de basis (voorstelpagina's). */
    wijzigingen?: Wijziging[];
    invoer?: Invoer;
    /** Er is een eigen situatie: bewaard, of hier ingevuld. */
    ingevuld?: boolean;
  } = $props();

  let open = $state(false);

  $effect(() => {
    const bewaard = leesBewaard();
    if (bewaard) {
      invoer = bewaard.invoer;
      ingevuld = true;
    }
  });

  const nieuw = $derived(scenario ?? (wijzigingen ? pasToe(params, wijzigingen) : params));
  const uitkomst = $derived.by(() => {
    const geldig = invoerSchema.safeParse($state.snapshot(invoer));
    if (!geldig.success) return null;
    const h = huishoudenUitInvoer(geldig.data, params);
    const a = berekenHuishouden(h, params);
    const b = nieuw === params ? a : berekenHuishouden(h, nieuw, params);
    return { a, b, d: b.besteedbaar - a.besteedbaar };
  });
  const samen = $derived(invoer.personen.length > 1 || invoer.kinderen.length > 0);

  function openFormulier() {
    open = !open;
    if (open) ingevuld = true;
  }
</script>

<section class="kaart jouw" aria-labelledby="titel-jouw">
  <h2 id="titel-jouw">Wat betekent dit voor {samen ? "jullie" : "jou"}?</h2>
  {#if !ingevuld}
    <p>Vul je situatie in en zie wat dit voor jouw portemonnee betekent.</p>
  {:else if !uitkomst}
    <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
  {:else}
    <p class="kern">
      {#if Math.abs(uitkomst.d) < 1}
        {samen ? "Jullie houden" : "Je houdt"} evenveel over: {euro(uitkomst.a.besteedbaar / 12)} per maand.
      {:else}
        {samen ? "Jullie houden" : "Je houdt"}
        <strong class={uitkomst.d > 0 ? "vooruit" : "achteruit"}
          >{euroVerschil(uitkomst.d / 12)} per maand</strong
        >
        {uitkomst.d > 0 ? "meer" : "minder"} over ({euroVerschil(uitkomst.d)} per jaar).
      {/if}
    </p>
    <table class="data">
      <thead><tr><th>Per jaar</th><th>Nu</th><th>Hiermee</th></tr></thead>
      <tbody>
        <tr
          ><td>Belasting en premies</td><td class="num">{euro(uitkomst.a.belasting)}</td><td class="num"
            >{euro(uitkomst.b.belasting)}</td
          ></tr
        >
        <tr
          ><td>Toeslagen</td><td class="num">{euro(uitkomst.a.toeslagen)}</td><td class="num"
            >{euro(uitkomst.b.toeslagen)}</td
          ></tr
        >
        {#if uitkomst.a.kinderbijslag > 0 || uitkomst.b.kinderbijslag > 0}
          <tr
            ><td>Kinderbijslag</td><td class="num">{euro(uitkomst.a.kinderbijslag)}</td><td class="num"
              >{euro(uitkomst.b.kinderbijslag)}</td
            ></tr
          >
        {/if}
        <tr class="totaal"
          ><td>Te besteden</td><td class="num">{euro(uitkomst.a.besteedbaar)}</td><td class="num"
            >{euro(uitkomst.b.besteedbaar)}</td
          ></tr
        >
      </tbody>
    </table>
  {/if}
  <button type="button" class:primair={!ingevuld} aria-expanded={open} onclick={openFormulier}>
    {open ? "Formulier sluiten" : ingevuld ? "Pas je situatie aan" : "Vul je situatie in"}
  </button>
  {#if open}
    <div class="formulier"><InvoerFormulier bind:invoer {params} /></div>
  {/if}
</section>

<style>
  .jouw {
    display: flex;
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  h2 {
    font-size: 18px;
    margin: 0;
  }
  p {
    margin: 0;
  }
  .kern {
    font-size: 17px;
  }
  table {
    width: 100%;
    max-width: 480px;
  }
  .totaal td {
    font-weight: 600;
  }
  .formulier {
    width: 100%;
    max-width: 560px;
  }
</style>
