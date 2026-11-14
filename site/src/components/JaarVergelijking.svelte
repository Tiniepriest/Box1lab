<script lang="ts">
  import {
    berekenHuishouden,
    huishoudenUitInvoer,
    invoerSchema,
    jaarovergangPerOnderdeel,
    type Invoer,
    type Parameters,
  } from "@box1lab/engine";
  import { euro, euroVerschil } from "../lib/format.ts";

  /*
   * Wat verandert er volgend jaar voor dit huishouden, bij hetzelfde bruto inkomen? Op de pagina van het
   * Belastingplan (stap 1, D-064); op Jouw situatie alleen als er geen pagina voor volgend jaar is.
   */
  let {
    params,
    volgend,
    invoer,
    titel,
  }: {
    /** De regels van nu. */
    params: Parameters;
    /** De regels van volgend jaar (vaak voorlopig), met de secties die nog geen bron hebben of geraamd zijn. */
    volgend: { params: Parameters; nogNiet: string[]; geraamd: string[] };
    invoer: Invoer;
    titel?: string;
  } = $props();

  const j = $derived(volgend.params.jaar);
  const samen = $derived(invoer.personen.length > 1 || invoer.kinderen.length > 0);
  const uitkomst = $derived.by(() => {
    const geldig = invoerSchema.safeParse($state.snapshot(invoer));
    if (!geldig.success) return null;
    const r = berekenHuishouden(huishoudenUitInvoer(geldig.data, params), params);
    const r2 = berekenHuishouden(huishoudenUitInvoer(geldig.data, volgend.params), volgend.params);
    const { perOnderdeel } = jaarovergangPerOnderdeel(geldig.data, params, volgend.params);
    return { r, r2, d: r2.besteedbaar - r.besteedbaar, perOnderdeel };
  });
</script>

<section class="kaart jaar" aria-labelledby="titel-jaar">
  <h2 id="titel-jaar">
    {titel ?? `Wat verandert er in ${j} voor ${samen ? "jullie" : "jou"}?`}
    {#if volgend.params.status === "voorlopig"}<span class="voorlopig">voorlopig</span>{/if}
  </h2>
  {#if !uitkomst}
    <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
  {:else}
    {@const { r, r2, d, perOnderdeel } = uitkomst}
    <p class="kern">
      {#if Math.abs(d) < 1}
        Bij hetzelfde bruto inkomen {samen ? "houden jullie" : "houd je"} in {j} evenveel over als in {params.jaar}.
      {:else}
        Bij hetzelfde bruto inkomen {samen ? "houden jullie" : "houd je"} in {j}
        <strong class={d > 0 ? "vooruit" : "achteruit"}>{euroVerschil(d / 12)} per maand</strong>
        {d > 0 ? "meer" : "minder"} over dan in {params.jaar} ({euroVerschil(d)} per jaar).
      {/if}
    </p>
    <table class="data">
      <thead><tr><th>Per jaar</th><th>{params.jaar}</th><th>{j}</th></tr></thead>
      <tbody>
        <tr>
          <td>Belasting en premies</td><td class="num">{euro(r.belasting)}</td><td class="num"
            >{euro(r2.belasting)}</td
          >
        </tr>
        {#if r.box3 > 0 || r2.box3 > 0}
          <tr>
            <td>Belasting op sparen en beleggen (box 3)</td><td class="num">{euro(r.box3)}</td><td class="num"
              >{euro(r2.box3)}</td
            >
          </tr>
        {/if}
        <tr>
          <td>Toeslagen</td><td class="num">{euro(r.toeslagen)}</td><td class="num">{euro(r2.toeslagen)}</td>
        </tr>
        {#if r.kinderbijslag > 0}
          <tr>
            <td>Kinderbijslag</td><td class="num">{euro(r.kinderbijslag)}</td><td class="num"
              >{euro(r2.kinderbijslag)}</td
            >
          </tr>
        {/if}
        <tr>
          <td>Premie zorgverzekering</td><td class="num">{euro(r.zorgpremie)}</td><td class="num"
            >{euro(r2.zorgpremie)}</td
          >
        </tr>
        <tr class="totaal">
          <!-- Na zorgpremie en box 3: anders dan het bedrag bovenaan Jouw situatie, en dat zeggen we (review E10). -->
          <td>Te besteden na zorgpremie</td><td class="num">{euro(r.besteedbaar)}</td><td class="num"
            >{euro(r2.besteedbaar)}</td
          >
        </tr>
      </tbody>
    </table>
    {#if perOnderdeel.length > 1}
      <h3>Waar komt het verschil vandaan?</h3>
      <table class="data">
        <thead><tr><th>Onderdeel</th><th>Per jaar</th><th>Per maand</th></tr></thead>
        <tbody>
          {#each perOnderdeel as o (o.label)}
            <tr>
              <td>{o.label}</td>
              <td class="num">{euroVerschil(o.effect)}</td>
              <td class="num">{euroVerschil(o.effect / 12)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
    <p class="notitie">
      Je bruto loon, pensioen en WW houden we gelijk, zodat je ziet wat de nieuwe regels doen. AOW, bijstand,
      kinderbijslag en toeslagen gaan wel mee met de gewone jaarlijkse verhoging. Prijzen stijgen ook; dit is
      dus geen koopkrachtcijfer. "Te besteden na zorgpremie" is lager dan het bedrag bovenaan Jouw situatie:
      daar gaan de premie van je zorgverzekering en de box 3-belasting er niet af.
    </p>
  {/if}
  {#if volgend.params.status === "voorlopig"}
    <p class="notitie">
      <strong>Voorlopig.</strong>
      {volgend.params.toelichting}
      {#if volgend.geraamd.length}
        Geraamd met de gewone jaarlijkse verhoging: {volgend.geraamd.join(", ")}.
      {/if}
      {#if volgend.nogNiet.length}
        Nog niet (helemaal) bekend, dus gerekend met de bedragen van {params.jaar}: {volgend.nogNiet.join(
          ", ",
        )}.
      {/if}
    </p>
  {/if}
</section>

<style>
  h2 {
    font-size: 18px;
    margin: 0 0 8px;
  }
  .voorlopig {
    font-size: 12px;
    font-weight: 600;
    border: 1px solid var(--warn);
    background: var(--warn-bg);
    border-radius: 4px;
    padding: 1px 6px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .kern {
    margin: 0 0 10px;
  }
  h3 {
    font-size: 15px;
    margin: 18px 0 6px;
  }
  table {
    max-width: 480px;
  }
  .totaal td {
    font-weight: 600;
  }
  .notitie {
    margin: 10px 0 0;
  }
</style>
