<script lang="ts" module>
  /** Een regel in de tooltip, eventueel met een staaltje in de kleur van de reeks (blok, of lijn bij `lijn`). */
  export type TipRegel = string | { tekst: string; kleur?: string; lijn?: "doorgetrokken" | "gestippeld" };
</script>

<script lang="ts">
  /*
   * Zwevend tekstvak bij een grafiek, relatief aan de grafiekcontainer (D-096).
   * - Blijft binnen de container: rechts van de aanwijzer, of links als het daar niet past.
   * - Staat boven het punt of de rij (`y`), zodat die zelf zichtbaar blijft; past dat niet, dan onder de rij
   *   (`onder`, de onderkant; standaard gelijk aan `y`).
   * - Op een aanraakscherm blijft het staan na een tik; een tik buiten de grafiek sluit het (`onsluit`).
   */
  let {
    x,
    y,
    regels,
    onder,
    breedte = 0,
    onsluit,
  }: {
    x: number;
    y: number;
    onder?: number;
    regels: TipRegel[];
    breedte?: number;
    onsluit?: () => void;
  } = $props();

  const MARGE = 12;
  let el = $state<HTMLDivElement>();
  let w = $state(0);
  let h = $state(0);

  const links = $derived.by(() => {
    if (!breedte || !w) return x + MARGE;
    const l = x + MARGE + w <= breedte ? x + MARGE : x - MARGE - w;
    return Math.max(0, Math.min(l, breedte - w));
  });
  const boven = $derived(y - MARGE - h >= 0 ? y - MARGE - h : (onder ?? y) + MARGE);

  $effect(() => {
    if (!onsluit || !el) return;
    const grafiek = el.parentElement;
    const buiten = (e: PointerEvent) => {
      if (grafiek && !grafiek.contains(e.target as Node)) onsluit();
    };
    window.addEventListener("pointerdown", buiten, true);
    return () => window.removeEventListener("pointerdown", buiten, true);
  });
</script>

<div
  bind:this={el}
  bind:clientWidth={w}
  bind:clientHeight={h}
  class="tip"
  style:left="{links}px"
  style:top="{boven}px"
  style:visibility={w ? "visible" : "hidden"}
  role="tooltip"
>
  {#each regels as r, i (i)}
    {@const regel = typeof r === "string" ? { tekst: r } : r}
    <div class:kop={i === 0}>
      {#if regel.kleur}<i
          class="staal"
          class:lijn={!!regel.lijn}
          class:gestippeld={regel.lijn === "gestippeld"}
          style:--kleur={regel.kleur}
        ></i>{/if}{regel.tekst}
    </div>
  {/each}
</div>

<style>
  .tip {
    position: absolute;
    pointer-events: none;
    background: var(--panel);
    color: var(--fg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 6px 9px;
    font-size: 12px;
    line-height: 1.45;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
    z-index: 5;
    width: max-content;
    max-width: min(280px, 100%);
  }
  .kop {
    font-weight: 600;
  }
  .staal {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 2px;
    background: var(--kleur);
    margin-right: 6px;
    vertical-align: -1px;
  }
  .staal.lijn {
    width: 14px;
    height: 0;
    border-radius: 0;
    background: none;
    border-top: 2px solid var(--kleur);
    vertical-align: 3px;
  }
  .staal.gestippeld {
    border-top-style: dashed;
  }
</style>
