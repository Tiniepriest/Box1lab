<script lang="ts">
  import { loonstrook, type Invoer, type Parameters } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";

  /* Netto per maand, en vakantiegeld, 13e maand en bonus apart: beknopt, om met de loonstrook te vergelijken (D-074). */
  let { params, invoer }: { params: Parameters; invoer: Invoer } = $props();

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

{#if vakjes.length}
  <div class="loonstrook" aria-label="Zoals op je loonstrook">
    <ul>
      {#each vakjes as v (v.label)}
        <li>
          <span class="l">{v.label}</span>
          <span class="t">{v.sub}</span>
          <span class="w"><span class="t">netto</span> {euro(v.netto)}</span>
        </li>
      {/each}
    </ul>
    <p class="notitie">
      Ongeveer zoals op je loonstrook. Het bedrag hierboven is het gemiddelde, met toeslagen en zorgpremie.
    </p>
  </div>
{/if}

<style>
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  li {
    display: flex;
    flex-direction: column;
    background: var(--panel);
    border-radius: var(--radius);
    box-shadow: var(--schaduw);
    padding: 8px 12px;
    min-width: 130px;
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
  .notitie {
    margin: 6px 0 0;
    font-size: 12px;
  }
</style>
