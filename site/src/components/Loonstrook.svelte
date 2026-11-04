<script lang="ts">
  import { loonstrook, type Invoer, type Parameters } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";

  /* "Klopt het met je loonstrook?": het netto maandloon, en vakantiegeld, 13e maand en bonus apart (D-074). */
  let { params, invoer }: { params: Parameters; invoer: Invoer } = $props();

  const stroken = $derived(loonstrook(invoer, params));
  // Wie loon of een uitkering per jaar invulde, krijgt geen loonstrook maar wel een tip.
  const perJaar = $derived(
    invoer.personen.some(
      (x) =>
        (x.soort === "loondienst" || x.soort === "werknemersverzekering") &&
        x.periode === "jaar" &&
        x.bedrag > 0,
    ),
  );
  const extras = $derived(stroken.some((s) => s.vakantiegeld || s.dertiendeMaand || s.bonus));
</script>

{#if stroken.length || perJaar}
  <section class="kaart loonstrook" aria-labelledby="titel-loonstrook">
    <h2 id="titel-loonstrook">Klopt het met je loonstrook?</h2>
    {#if stroken.length}
      <p class="notitie">
        Zo ziet {stroken.every((s) => s.uitkering) ? "je uitkering" : "je loonstrook"} er ongeveer uit.
        {#if extras}Het bedrag hierboven is een gemiddelde over het jaar: daarin zitten ook de bedragen die je
          één keer per jaar krijgt, en de toeslagen en de zorgpremie.{/if}
      </p>
    {/if}
    {#each stroken as s (s.persoon)}
      {#if invoer.personen.length > 1}<h3>{s.persoon === 0 ? "Jij" : "Je partner"}</h3>{/if}
      <table class="data">
        <thead><tr><th></th><th>Bruto</th><th>Netto</th></tr></thead>
        <tbody>
          <tr class="maand">
            <td>Per maand</td>
            <td class="num">{euro(s.brutoPerMaand)}</td>
            <td class="num">{euro(s.nettoPerMaand)}</td>
          </tr>
          {#if s.vakantiegeld}
            <tr>
              <td>Vakantiegeld <span class="hint">meestal in mei</span></td>
              <td class="num">{euro(s.vakantiegeld.bruto)}</td>
              <td class="num">{euro(s.vakantiegeld.netto)}</td>
            </tr>
          {/if}
          {#if s.dertiendeMaand}
            <tr>
              <td>13e maand <span class="hint">meestal in december</span></td>
              <td class="num">{euro(s.dertiendeMaand.bruto)}</td>
              <td class="num">{euro(s.dertiendeMaand.netto)}</td>
            </tr>
          {/if}
          {#if s.bonus}
            <tr>
              <td>Bonus</td>
              <td class="num">{euro(s.bonus.bruto)}</td>
              <td class="num">{euro(s.bonus.netto)}</td>
            </tr>
          {/if}
        </tbody>
      </table>
      <p class="notitie">
        Per maand gaat er {euro(s.loonheffingPerMaand)} loonheffing af{s.pensioenpremiePerMaand > 0
          ? ` en ${euro(s.pensioenpremiePerMaand)} pensioenpremie`
          : ""}.
        {#if s.vakantiegeldInMaand}Je vakantiegeld zit al in je maandbedrag.{/if}
      </p>
    {/each}
    {#if extras}
      <p class="notitie">
        Van een bedrag dat je één keer per jaar krijgt, gaat meer belasting af dan van je gewone loon: het
        komt bovenop je jaarloon. Je loonstrook kan een paar tientjes afwijken, want je werkgever rekent met
        tabellen.
      </p>
    {/if}
    {#if stroken.some((s) => !s.uitkering)}
      <p class="notitie">
        Niet op je loonstrook: toeslagen, de premie van je zorgverzekering, en de combinatiekorting en
        hypotheekrenteaftrek (die krijg je via je aangifte).
      </p>
    {/if}
    {#if perJaar}
      <p class="notitie">Vul je bruto loon per maand in, dan zie je hier wat er op je loonstrook staat.</p>
    {/if}
  </section>
{/if}

<style>
  h2 {
    font-size: 18px;
    margin: 0 0 4px;
  }
  h3 {
    font-size: 16px;
    margin: 16px 0 0;
  }
  table {
    margin-top: 8px;
  }
  .maand td {
    font-weight: 600;
  }
  .hint {
    color: var(--muted);
    font-size: 13px;
    font-weight: 400;
  }
  .notitie {
    margin: 6px 0 0;
  }
</style>
