<script lang="ts">
  import { watAls, type Invoer, type Parameters, type WatAls } from "@box1lab/engine";
  import { euro, euroVerschil } from "../lib/format.ts";

  /* "Wat als?": veelgestelde veranderingen in je eigen situatie, en wat je dan netto meer of minder overhoudt. */
  let { params, invoer, samen }: { params: Parameters; invoer: Invoer; samen: boolean } = $props();

  const rijen = $derived(watAls(invoer, params));

  /** "Belasting en premies +€ 40, toeslagen en kinderbijslag −€ 25 per maand." (verschillen onder € 1 vallen weg) */
  function detail(w: WatAls): string {
    const delen: string[] = [];
    const teken = (v: number) => `${v > 0 ? "+" : "−"}${euro(Math.abs(v / 12))}`;
    if (Math.abs(w.belasting) >= 12) delen.push(`belasting en premies ${teken(w.belasting)}`);
    if (Math.abs(w.toeslagen) >= 12) delen.push(`toeslagen en kinderbijslag ${teken(w.toeslagen)}`);
    if (!delen.length) return "";
    const zin = `${delen.join(", ")} per maand.`;
    return zin[0]!.toUpperCase() + zin.slice(1);
  }
</script>

{#if rijen.length}
  <section class="kaart watals" aria-labelledby="titel-watals">
    <h2 id="titel-watals">Wat als…?</h2>
    <p class="notitie">
      Wat {samen ? "jullie" : "je"} per maand meer of minder overhoudt als er iets verandert.
    </p>
    <ul>
      {#each rijen as w (w.id)}
        <li>
          <div class="kop">
            <strong>{w.label}</strong>
            <span class="bedrag" class:vooruit={w.verschil >= 12} class:achteruit={w.verschil <= -12}
              >{Math.abs(w.verschil) < 12 ? "€ 0" : euroVerschil(w.verschil / 12)} per maand</span
            >
          </div>
          <p class="notitie">{w.uitleg} {detail(w)}</p>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  h2 {
    font-size: 18px;
    margin: 0 0 4px;
  }
  ul {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
  }
  li {
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }
  .kop {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .bedrag {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    white-space: nowrap;
  }
  li .notitie {
    margin: 2px 0 0;
  }
</style>
