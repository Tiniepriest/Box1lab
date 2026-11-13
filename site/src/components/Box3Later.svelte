<script lang="ts">
  import {
    invoerSchema,
    vergelijkBox3,
    type Box3Werkelijk,
    type Invoer,
    type Parameters,
  } from "@box1lab/engine";
  import { euro, getal } from "../lib/format.ts";

  /*
   * Box 3 in een later jaar (werkelijk rendement) naast box 3 nu (forfaitair met tegenbewijsregeling), voor het
   * spaargeld en de beleggingen uit de situatie. De bezoeker kiest de rendementen (fase 33, D-085).
   */
  let {
    params,
    regels,
    invoer,
  }: {
    /** De regels van het jaar waarmee we vergelijken (het basispad, bijvoorbeeld 2027). */
    params: Parameters;
    /** De regels voor werkelijk rendement (data/vooruitblik). */
    regels: Box3Werkelijk;
    invoer: Invoer;
  } = $props();

  const v = regels.voorbeeld;
  let spaarrente = $state(v.spaarrente);
  let dividend = $state(v.dividend);
  let koersstijging = $state(v.koersstijging);
  let verkopen = $state(false);

  const getalOf0 = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

  const situatie = $derived.by(() => {
    const g = invoerSchema.safeParse($state.snapshot(invoer));
    if (!g.success) return null;
    return {
      bank: g.data.vermogen,
      overig: g.data.beleggingen,
      schulden: g.data.schulden,
      partners: g.data.personen.length > 1,
    };
  });
  const samen = $derived(invoer.personen.length > 1);
  const u = $derived.by(() => {
    if (!situatie) return null;
    return vergelijkBox3(
      situatie,
      situatie.partners,
      {
        spaarrente: getalOf0(spaarrente),
        dividend: getalOf0(dividend),
        koersstijging: getalOf0(koersstijging),
        verkopen,
      },
      params,
      regels,
    );
  });
  const pct = (x: number) => `${getal(x, 2).replace(/,?0+$/, "")}%`;
  const b = $derived(params.box3);
  const later = regels.jaar;
  const nu = $derived(params.jaar);
  const schijf = regels.tarief.schijven;
</script>

<section class="kaart box3later" aria-labelledby="titel-box3later">
  <h2 id="titel-box3later">Box 3 in {later}: belasting over je echte rendement</h2>
  {#if !situatie || !u}
    <p class="waarschuwing">Vul alle velden in met een getal (0 mag ook).</p>
  {:else if situatie.bank + situatie.overig <= 0}
    <p>
      Vanaf {later} betaal je in box 3 belasting over wat je spaargeld en beleggingen echt opbrengen, in plaats
      van over een vast rendement. {samen ? "Jullie hebben" : "Je hebt"} geen spaargeld of beleggingen ingevuld.
      Vul ze in bij
      {samen ? "jullie" : "je"} situatie om te zien wat er voor {samen ? "jullie" : "jou"} verandert.
    </p>
  {:else}
    <p class="kern">
      {#if u.later.belasting < 0.5 && u.nu.belasting < 0.5}
        Met deze percentages {samen ? "betalen jullie" : "betaal je"} in {nu} en in {later} geen box 3-belasting.
      {:else if Math.abs(u.verschil) < 0.5}
        Met deze percentages {samen ? "betalen jullie" : "betaal je"} in {later} evenveel box 3-belasting als in
        {nu}:
        {euro(u.later.belasting)} per jaar.
      {:else}
        Met deze percentages {samen ? "betalen jullie" : "betaal je"} in {later}
        <strong class={u.verschil > 0 ? "achteruit" : "vooruit"}
          >{euro(Math.abs(u.verschil))} per jaar {u.verschil > 0 ? "meer" : "minder"}</strong
        >
        box 3-belasting dan in {nu}.
      {/if}
    </p>

    <div class="velden">
      {#if situatie.bank > 0}
        <label>
          <span>Rente op {samen ? "jullie" : "je"} spaargeld</span>
          <span class="invoer"
            ><input
              type="number"
              step="0.1"
              bind:value={spaarrente}
              aria-label="Rente op spaargeld in procent"
            /> % per jaar</span
          >
        </label>
      {/if}
      {#if situatie.overig > 0}
        <label>
          <span>Dividend en rente op {samen ? "jullie" : "je"} beleggingen</span>
          <span class="invoer"
            ><input
              type="number"
              step="0.1"
              bind:value={dividend}
              aria-label="Dividend en rente in procent"
            /> % per jaar</span
          >
        </label>
        <label>
          <span>Koersstijging van {samen ? "jullie" : "je"} beleggingen</span>
          <span class="invoer"
            ><input
              type="number"
              step="0.1"
              bind:value={koersstijging}
              aria-label="Koersstijging in procent"
            /> % per jaar</span
          >
        </label>
        <label class="vinkje">
          <input type="checkbox" bind:checked={verkopen} />
          {samen ? "We verkopen onze" : "Ik verkoop mijn"} beleggingen in {later}
        </label>
      {/if}
    </div>

    <table class="data">
      <thead><tr><th>Per jaar</th><th>{nu}</th><th>{later}</th></tr></thead>
      <tbody>
        <tr>
          <td>Rendement waarover je belasting betaalt</td>
          <td class="num">{euro(u.nu.belast)}</td>
          <td class="num">{euro(u.later.belastbaar)}</td>
        </tr>
        <tr class="totaal">
          <td>Belasting box 3</td>
          <td class="num">{euro(u.nu.belasting)}</td>
          <td class="num">{euro(u.later.belasting)}</td>
        </tr>
      </tbody>
    </table>

    <ul class="notitie">
      <li>
        <strong>{nu}:</strong> belasting over een vast rendement ({pct(b.rendement.banktegoeden)} op spaargeld,
        {pct(b.rendement.overig)} op beleggingen) boven {euro(b.heffingsvrijVermogen)} per persoon, tegen
        {pct(b.tarief)}. Is je echte rendement lager, dan betaal je daarover{u.nu.tegenbewijs
          ? "; met deze percentages is dat zo"
          : ""}.
      </li>
      <li>
        <strong>{later}:</strong> rente en dividend tellen elk jaar, koerswinst alleen als je verkoopt, en dan
        alleen de winst vanaf 1 januari {later}. {euro(regels.regels.heffingsvrijResultaat)} rendement per persoon
        is vrij. Tarief {pct(schijf[0]!.tarief)}{#if schijf.length > 1}, boven {euro(schijf[0]!.tot ?? 0)} per persoon
          {pct(schijf[1]!.tarief)}{/if}.
        {#if u.later.verlies > 0}
          Bij verlies betaal je niets; {euro(u.later.verlies)} neem je mee naar volgende jaren.
        {/if}
      </li>
      {#if situatie.overig > 0 || situatie.schulden > 0}
        <li>
          {situatie.overig > 0
            ? `"Beleggingen en tweede woning" rekenen we als beleggingen; voor een tweede woning gelden in ${later} andere regels.`
            : ""}
          {situatie.schulden > 0 ? "Schulden laten we in dit voorbeeld weg." : ""}
        </li>
      {/if}
      <li>{regels.toelichting}</li>
    </ul>
  {/if}
</section>

<style>
  h2 {
    font-size: 20px;
    margin: 0 0 8px;
  }
  .kern {
    margin: 0 0 14px;
  }
  .velden {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 14px;
  }
  .velden label {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 4px 12px;
  }
  .invoer {
    white-space: nowrap;
    color: var(--muted);
  }
  .invoer input {
    width: 5.5em;
    text-align: right;
  }
  .velden .vinkje {
    display: flex;
    gap: 8px;
  }
  table {
    margin: 0 0 12px;
    width: 100%;
  }
  table td:first-child {
    white-space: normal;
  }
  ul.notitie {
    margin: 0;
    padding-left: 18px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
