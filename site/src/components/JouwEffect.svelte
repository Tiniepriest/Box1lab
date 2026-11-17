<script lang="ts">
  import {
    berekenHuishouden,
    huishoudenUitInvoer,
    invoerSchema,
    pasToe,
    statisch,
    type Invoer,
    type Parameters,
    type Wijziging,
  } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";
  import { SITUATIE_GEWIJZIGD, leesInvoer } from "../lib/opslag.ts";
  import { openSituatie } from "../lib/situatie.ts";

  /*
   * "Wat betekent dit voor jou?": het effect van een scenario of voorstel op het eigen huishouden, naast de
   * landelijke cijfers. Rekent met de situatie uit de kolom "Gerekend met" (D-064): die wordt meegegeven (lab), of
   * gelezen uit de browser en bijgewerkt als hij verandert (voorstelpagina's). Zonder eigen situatie: een knop naar
   * het formulier in die kolom.
   */
  let {
    params,
    scenario,
    wijzigingen,
    situatie,
  }: {
    params: Parameters;
    /** Het scenario als parameterset (lab) ... */
    scenario?: Parameters;
    /** ... of als wijzigingen op de basis (voorstelpagina's). */
    wijzigingen?: Wijziging[];
    /** De situatie uit de kolom op dezelfde pagina; zonder deze lezen we hem uit de browser. */
    situatie?: { invoer: Invoer; eigen: boolean };
  } = $props();

  let bewaard = $state<Invoer | null>(null);
  $effect(() => {
    if (situatie) return;
    const lees = () => (bewaard = leesInvoer());
    lees();
    window.addEventListener(SITUATIE_GEWIJZIGD, lees);
    return () => window.removeEventListener(SITUATIE_GEWIJZIGD, lees);
  });
  const invoer = $derived(situatie ? (situatie.eigen ? situatie.invoer : null) : bewaard);
  const ingevuld = $derived(invoer !== null);

  const nieuw = $derived(scenario ?? (wijzigingen ? pasToe(params, wijzigingen) : params));
  const uitkomst = $derived.by(() => {
    if (!invoer) return null;
    const geldig = invoerSchema.safeParse($state.snapshot(invoer));
    if (!geldig.success) return null;
    const h = huishoudenUitInvoer(geldig.data, params);
    const a = berekenHuishouden(h, params);
    // Statisch: je bruto inkomen is wat je invult; het gedragseffect hoort bij de bevolkingscijfers.
    const b = nieuw === params ? a : berekenHuishouden(h, statisch(nieuw), params);
    return { a, b, d: b.besteedbaar - a.besteedbaar };
  });
  /*
   * De regels van het overzicht, zo dat ze optellen tot "Te besteden". Een regel die nu en hiermee 0 is, valt weg,
   * behalve bruto, belasting en toeslagen. De premie van de zorgverzekering gaat er niet af (D-093).
   */
  const regels = $derived.by(() => {
    if (!uitkomst) return [];
    const { a, b } = uitkomst;
    const alle: { label: string; teken: "" | "−" | "+"; nu: number; hiermee: number; altijd?: boolean }[] = [
      { label: "Bruto inkomen", teken: "", nu: a.bruto, hiermee: b.bruto, altijd: true },
      { label: "Pensioenpremie", teken: "−", nu: a.pensioenpremie, hiermee: b.pensioenpremie },
      {
        label: "Belasting en premies",
        teken: "−",
        nu: a.belasting + a.zvw,
        hiermee: b.belasting + b.zvw,
        altijd: true,
      },
      { label: "Belasting box 3", teken: "−", nu: a.box3, hiermee: b.box3 },
      { label: "Toeslagen", teken: "+", nu: a.toeslagen, hiermee: b.toeslagen, altijd: true },
      { label: "Kinderbijslag", teken: "+", nu: a.kinderbijslag, hiermee: b.kinderbijslag },
      { label: "Basisinkomen", teken: "+", nu: a.basisinkomen, hiermee: b.basisinkomen },
    ];
    return alle.filter((r) => r.altijd || Math.abs(r.nu) >= 0.5 || Math.abs(r.hiermee) >= 0.5);
  });
  const samen = $derived(!!invoer && (invoer.personen.length > 1 || invoer.kinderen.length > 0));
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
          >{euro(Math.abs(uitkomst.d / 12))} per maand {uitkomst.d > 0 ? "meer" : "minder"}</strong
        >
        over ({euro(Math.abs(uitkomst.d))} per jaar).
      {/if}
    </p>
    <table class="data">
      <thead><tr><th>Per jaar</th><th>Nu</th><th>Hiermee</th></tr></thead>
      <tbody>
        {#each regels as r (r.label)}
          <tr
            ><td>{r.teken ? `${r.teken} ` : ""}{r.label}</td><td class="num">{euro(r.nu)}</td><td class="num"
              >{euro(r.hiermee)}</td
            ></tr
          >
        {/each}
        <tr class="totaal"
          ><td>Te besteden</td><td class="num">{euro(uitkomst.a.besteedbaar)}</td><td class="num"
            >{euro(uitkomst.b.besteedbaar)}</td
          ></tr
        >
      </tbody>
    </table>
  {/if}
  <button type="button" class:primair={!ingevuld} onclick={openSituatie}>
    {ingevuld ? "Pas je situatie aan" : "Vul je situatie in"}
  </button>
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
</style>
