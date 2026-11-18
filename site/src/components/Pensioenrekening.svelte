<script lang="ts">
  import { kanInleggen, pensioenrekening, type Invoer, type Parameters } from "@box1lab/engine";
  import { euro, procent } from "../lib/format.ts";

  /*
   * "Inleggen voor je pensioen": wat je terugkrijgt van de Belastingdienst als je geld inlegt op een pensioenrekening
   * (lijfrente). De berekening staat in de engine (pensioenrekening.ts); hier alleen de keuzes en de tekst.
   */
  let { params, invoer }: { params: Parameters; invoer: Invoer } = $props();

  const wie = $derived(invoer.personen.map((_, i) => i).filter((i) => kanInleggen(invoer, i, params)));
  let gekozen = $state(0);
  const persoon = $derived(wie.includes(gekozen) ? gekozen : (wie[0] ?? 0));
  const soort = $derived(invoer.personen[persoon]?.soort);

  let inleg = $state(5000);
  // Wie in loondienst werkt, bouwt meestal pensioen op via het werk; een zzp'er meestal niet. Je kunt het aanpassen.
  let viaWerkKeuze = $state<boolean | null>(null);
  let vorigeSoort = $state<string | undefined>(undefined);
  $effect(() => {
    if (soort !== vorigeSoort) {
      vorigeSoort = soort;
      viaWerkKeuze = null;
    }
  });
  const viaWerk = $derived(viaWerkKeuze ?? soort === "loondienst");

  const r = $derived(
    wie.length && Number.isFinite(inleg) && inleg > 0
      ? pensioenrekening(invoer, params, { persoon, inleg, pensioenViaWerk: viaWerk })
      : null,
  );
  const jij = $derived(invoer.personen.length > 1 && persoon === 1 ? "je partner" : "je");
  const Jij = $derived(jij === "je" ? "Je" : "Je partner");
  const krijgt = $derived(jij === "je" ? "krijg je" : "krijgt je partner");
  const rekenhulp =
    "https://www.belastingdienst.nl/wps/wcm/connect/nl/aftrek-en-kortingen/content/hulpmiddel-lijfrentepremie-2016-en-daarna";
</script>

{#if wie.length}
  <section class="kaart pensioen" aria-labelledby="titel-pensioen">
    <h2 id="titel-pensioen">Inleggen voor je pensioen</h2>
    <p class="notitie">
      Leg je geld in op een pensioenrekening of lijfrenteverzekering, dan mag je dat aftrekken van je inkomen.
      Je betaalt dan minder belasting.
    </p>

    <div class="velden">
      {#if wie.length > 1}
        <fieldset>
          <legend>Wie legt in?</legend>
          <label><input type="radio" bind:group={gekozen} value={0} /> Jij</label>
          <label><input type="radio" bind:group={gekozen} value={1} /> Je partner</label>
        </fieldset>
      {/if}
      <label class="bedrag-veld">
        <span>Inleg per jaar</span>
        <input type="number" min="0" step="500" bind:value={inleg} />
      </label>
      <label class="vinkje">
        <input type="checkbox" checked={viaWerk} onchange={(e) => (viaWerkKeuze = e.currentTarget.checked)} />
        {jij === "je"
          ? "Ik bouw ook pensioen op via mijn werk"
          : "Mijn partner bouwt ook pensioen op via het werk"}
      </label>
    </div>

    {#if r}
      <p class="uitkomst" aria-live="polite">
        Als {jij}
        {euro(r.inleg)} inlegt op een pensioenrekening, {krijgt} ongeveer
        <strong class="num">{euro(r.teruggave)}</strong> terug van de Belastingdienst{r.aftrek > 0
          ? ` (${procent((r.teruggave / r.aftrek) * 100, 0)} van ${r.aftrek < r.inleg ? `wat ${jij} mag aftrekken` : "de inleg"})`
          : ""}.
      </p>
      <ul class="details">
        {#if r.toeslagen >= 1}
          <li>
            Omdat het inkomen lager wordt, gaan de toeslagen ook omhoog: {euro(r.toeslagen)} per jaar.
          </li>
        {:else if r.toeslagen <= -1}
          <li>De toeslagen gaan {euro(-r.toeslagen)} per jaar omlaag.</li>
        {/if}
        <li>De inleg kost {jij} dan netto <strong class="num">{euro(r.nettoKosten)}</strong>.</li>
        {#if r.jaarruimte !== null}
          <li>
            {#if r.aftrek < r.inleg}
              {Jij} mag dit jaar ongeveer {euro(r.jaarruimte)} aftrekken (de jaarruimte). Over de rest {krijgt}
              niets terug.
            {:else}
              {Jij} mag dit jaar ongeveer {euro(r.jaarruimte)} aftrekken (de jaarruimte).
            {/if}
          </li>
        {:else}
          <li>
            Wie via het werk pensioen opbouwt, mag minder aftrekken, soms niets. Hoeveel, reken je uit met het
            <a href={rekenhulp} rel="noopener">hulpmiddel lijfrentepremie</a> van de Belastingdienst. Wij rekenen
            met de hele inleg.
          </li>
        {/if}
      </ul>
      <p class="notitie">
        Het geld komt pas vrij als je met pensioen gaat. Dan betaal je er belasting over, vaak tegen een lager
        tarief. Het geld op de rekening telt niet mee voor box 3. De jaarruimte gaat officieel over het
        inkomen van vorig jaar; wij nemen dit jaar. Ruimte die je in eerdere jaren niet hebt gebruikt (de
        reserveringsruimte), zit er niet in.
      </p>
    {/if}
  </section>
{/if}

<style>
  h2 {
    font-size: 18px;
    margin: 0 0 4px;
  }
  .velden {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px 20px;
    margin: 12px 0;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 12px;
    align-items: center;
  }
  legend {
    font-size: 14px;
    margin-bottom: 4px;
  }
  .bedrag-veld {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
  }
  .bedrag-veld input {
    width: 150px;
  }
  .vinkje {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 14px;
  }
  .uitkomst {
    font-size: 17px;
    margin: 0;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }
  .uitkomst strong {
    font-size: 22px;
    white-space: nowrap;
  }
  .details {
    margin: 0 0 8px;
    padding-left: 20px;
    font-size: 15px;
  }
  .details li + li {
    margin-top: 4px;
  }
</style>
