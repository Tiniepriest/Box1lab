<script lang="ts">
  import { loonstrook, type Invoer, type Parameters } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";

  /*
   * Vakjes onder de zin bovenaan: loon per maand, vakantiegeld, 13e maand en bonus, bruto en netto, om met de
   * loonstrook te vergelijken (D-074), en de box 3-belasting per jaar, die los staat van het bedrag bovenaan (D-076).
   */
  let { params, invoer, box3 }: { params: Parameters; invoer: Invoer; box3: number } = $props();

  const vakjes = $derived(
    loonstrook(invoer, params).flatMap((s) => {
      const wie = invoer.personen.length > 1 ? (s.persoon === 0 ? " (jij)" : " (partner)") : "";
      const v = [
        {
          label: `${s.uitkering ? "Uitkering" : "Loon"} per maand${wie}`,
          netto: s.nettoPerMaand,
          sub: `bruto ${euro(s.brutoPerMaand)}${s.vakantiegeldInMaand ? ", met vakantiegeld" : ""}`,
        },
      ];
      if (s.vakantiegeld)
        v.push({
          label: `Vakantiegeld${wie}`,
          netto: s.vakantiegeld.netto,
          sub: `bruto ${euro(s.vakantiegeld.bruto)}`,
        });
      if (s.dertiendeMaand)
        v.push({
          label: `13e maand${wie}`,
          netto: s.dertiendeMaand.netto,
          sub: `bruto ${euro(s.dertiendeMaand.bruto)}`,
        });
      if (s.bonus)
        v.push({ label: `Bonus${wie}`, netto: s.bonus.netto, sub: `bruto ${euro(s.bonus.bruto)}` });
      return v;
    }),
  );
</script>

{#if vakjes.length || box3 > 0}
  <ul class="loonstrook">
    {#each vakjes as v (v.label)}
      <li>
        <span class="l">{v.label}</span>
        <span class="t">{v.sub}</span>
        <span class="w"><span class="t">netto</span> {euro(v.netto)}</span>
      </li>
    {/each}
    {#if box3 > 0}
      <li class="box3">
        <span class="l">Box 3-belasting</span>
        <span class="t">per jaar</span>
        <span class="w">{euro(box3)}</span>
      </li>
    {/if}
  </ul>
{/if}

<style>
  /* Even breed als de kerngetallen eronder: de vakjes verdelen de hele breedte. */
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  li {
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border-radius: var(--radius);
    box-shadow: var(--schaduw);
    padding: 8px 12px;
  }
  .l,
  .t {
    font-size: 12px;
    font-weight: 400;
    color: var(--muted);
  }
  .l {
    margin-bottom: 2px;
  }
  .w {
    font-size: 18px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
</style>
