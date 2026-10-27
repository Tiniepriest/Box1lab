<script lang="ts">
  import { equivalentiefactor, type Parameters } from "@box1lab/engine";
  import { euro } from "../../lib/format.ts";

  /*
   * Interactief voorbeeld: in welke inkomensgroep valt een huishouden? De groepsgrenzen zijn tijdens de build
   * berekend uit de modelbevolking (gestandaardiseerd besteedbaar inkomen per jaar).
   */
  let { params, grenzen }: { params: Parameters; grenzen: number[] } = $props();

  let perMaand = $state(3000);
  let partner = $state(false);
  let jong = $state(0);
  let oud = $state(0);

  const factor = $derived(
    equivalentiefactor(partner ? 2 : 1, [...Array(jong).fill(5), ...Array(oud).fill(15)], params),
  );
  const gestandaardiseerd = $derived((perMaand * 12) / factor);
  const groep = $derived(grenzen.filter((g) => gestandaardiseerd > g).length + 1);
</script>

<div class="mini kaart">
  <label for="mini-deciel-bedrag"
    >Wat jullie samen per maand te besteden hebben (netto, met toeslagen): <strong class="num"
      >{euro(perMaand)}</strong
    ></label
  >
  <input id="mini-deciel-bedrag" type="range" min="500" max="15000" step="50" bind:value={perMaand} />
  <div class="rij">
    <label><input type="checkbox" bind:checked={partner} /> Met partner</label>
    <label
      >Kinderen onder {params.methodiek.equivalentie.kindVanafLeeftijd}
      <select bind:value={jong}
        >{#each [0, 1, 2, 3, 4] as n (n)}<option value={n}>{n}</option>{/each}</select
      >
    </label>
    <label
      >Kinderen vanaf {params.methodiek.equivalentie.kindVanafLeeftijd}
      <select bind:value={oud}
        >{#each [0, 1, 2, 3] as n (n)}<option value={n}>{n}</option>{/each}</select
      >
    </label>
  </div>
  <p>
    Jullie huishouden telt als <strong class="num"
      >{factor.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}</strong
    >
    keer een alleenstaande. Gecorrigeerd is dat {euro(gestandaardiseerd / 12)} per maand: jullie horen bij
    <strong>groep {groep}</strong> van 10.
  </p>
  <div class="groepen" aria-hidden="true">
    {#each Array(10) as _, i (i)}<span class:actief={i + 1 === groep}>{i + 1}</span>{/each}
  </div>
</div>

<style>
  .mini {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 18px 0;
  }
  .rij {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
  }
  input[type="range"] {
    width: 100%;
  }
  p {
    margin: 0;
  }
  .groepen {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
  }
  .groepen span {
    text-align: center;
    font-family: var(--f-num);
    font-size: 12px;
    padding: 4px 0;
    background: var(--soft);
    border-radius: 3px;
  }
  .groepen span.actief {
    background: var(--accent);
    color: var(--panel);
  }
</style>
