<script lang="ts" module>
  export interface Rij {
    label: string;
    sub?: string;
    waarde: number;
    tekst: string;
    tip: string[];
    /** Deze rij valt op (bijvoorbeeld jouw eigen situatie tussen voorbeelden). */
    nadruk?: boolean;
  }
</script>

<script lang="ts">
  import { mooieStap } from "../../lib/format.ts";
  import Tooltip from "./Tooltip.svelte";

  /*
   * Horizontale staven vanaf een nullijn: rechts (groen) is erop vooruit, links (rood) erop achteruit.
   * Waarden dicht bij nul worden grijs. De waarden staan rechts in een eigen kolom, zoals in een tabel, zodat ze
   * nooit over een staaf, een label of de nullijn lopen. Meer details in de tooltip.
   */
  let {
    rijen,
    asLabel = (v: number) => String(v),
    drempel = 0,
    labelBreedte = 150,
    neutraal = false,
    subAltijd = false,
    beschrijving,
  }: {
    rijen: Rij[];
    asLabel?: (v: number) => string;
    drempel?: number;
    labelBreedte?: number;
    /** Eén kleur voor plus en min (het teken staat bij de waarde), zodat de kleur geen oordeel geeft. */
    neutraal?: boolean;
    /** De toelichting altijd tonen; past hij niet naast het label, dan op een eigen regel eronder. */
    subAltijd?: boolean;
    beschrijving: string;
  } = $props();

  let breedte = $state(0);
  // Teken op de echte breedte, zodat tekst op een telefoon even groot blijft als op een groot scherm.
  const B = $derived(Math.max(300, breedte || 640));
  const LBMax = $derived(Math.min(labelBreedte, B * 0.42));
  // Past een label niet naast de staaf (bijvoorbeeld op een telefoon), dan staan de labels boven de staven.
  const boven = $derived(
    rijen.some((r) => r.label.length * 7.2 > LBMax - 8 || (r.sub ?? "").length * 6.2 > LBMax - 8),
  );
  const LB = $derived(boven ? 0 : LBMax);
  /** Past label plus toelichting op één regel boven de staaf? Anders laten we de toelichting weg. */
  const past = (r: Rij) => r.label.length * 7.2 + ((r.sub ?? "").length + 3) * 6.2 <= B;
  // Labels boven de staven en een toelichting die moet blijven staan maar niet naast het label past: twee regels.
  const tweeRegels = $derived(boven && subAltijd && rijen.some((r) => r.sub && !past(r)));
  // Labels boven de staven: meer ruimte boven het label dan tussen label en staaf, zodat ze bij elkaar horen.
  const RIJ = $derived(boven ? (tweeRegels ? 68 : 54) : 34);
  const LABELRUIMTE = $derived(boven ? (tweeRegels ? 31 : 17) : 0);
  const STAAF = $derived(boven ? 18 : RIJ - 14);
  const RAND = 12;
  const H = $derived(rijen.length * RIJ + 28);
  const TEKEN = 6.4;
  /** Kolom rechts voor de waarden. */
  const KOLOM = $derived(Math.max(0, ...rijen.map((r) => r.tekst.length * TEKEN)) + 14);
  const half = $derived((B - LB - RAND - KOLOM) / 2);
  // Zonder verschillen (huidig beleid) toch een leesbare as van −1 tot +1. Een beetje lucht aan de buitenkant.
  const grootste = $derived(Math.max(1, ...rijen.map((r) => Math.abs(r.waarde))));
  const schaal = $derived(half / (grootste * 1.08));
  const max = $derived(half / schaal);
  const midden = $derived(LB + half);
  const stap = $derived(mooieStap(max, 2));
  const ticks = $derived.by(() => {
    const t: number[] = [];
    for (let v = -Math.floor(max / stap) * stap; v <= max + 1e-9; v += stap) t.push(Number(v.toFixed(10)));
    return t;
  });

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);

  function kleur(v: number): string {
    if (Math.abs(v) <= drempel) return "var(--zero)";
    if (neutraal) return "var(--accent)";
    return v > 0 ? "var(--gain)" : "var(--loss)";
  }

  /** De waarde in de kleur van de staaf (in de tekstvariant, voor genoeg contrast). */
  function tekstKleur(v: number): string {
    if (neutraal || Math.abs(v) <= drempel) return "";
    return v > 0 ? "plus" : "min";
  }

  function beweeg(e: PointerEvent, r: Rij) {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    tip = { x: e.clientX - box.left, y: e.clientY - box.top, regels: r.tip };
  }
</script>

<div bind:clientWidth={breedte}>
  <svg viewBox="0 0 {B} {H}" role="img" aria-label={beschrijving}>
    {#each ticks as t (t)}
      <line x1={midden + t * schaal} x2={midden + t * schaal} y1="0" y2={H - 22} class="raster" />
      <text x={midden + t * schaal} y={H - 6} text-anchor="middle" class="as">{asLabel(t)}</text>
    {/each}
    <line x1={midden} x2={midden} y1="0" y2={H - 22} class="nul" />
    {#each rijen as r, i (r.label)}
      {@const y = i * RIJ + 6 + LABELRUIMTE}
      {@const h = STAAF}
      {@const w = Math.max(1, Math.abs(r.waarde) * schaal)}
      {@const x = r.waarde >= 0 ? midden : midden - w}
      <g
        class="rij"
        role="presentation"
        onpointermove={(e) => beweeg(e, r)}
        onpointerleave={() => (tip = null)}
      >
        <rect x="0" y={y - 4 - LABELRUIMTE} width={B} height={RIJ} fill="transparent" />
        {#if boven && tweeRegels}
          <text x="0" y={y - 21} class="label" class:nadruk={r.nadruk}>{r.label}</text>
          {#if r.sub}<text x="0" y={y - 7} class="sub">{r.sub}</text>{/if}
        {:else if boven}
          <text x="0" y={y - 7} class="label" class:nadruk={r.nadruk}
            >{r.label}{#if r.sub && past(r)}<tspan class="sub">&nbsp;· {r.sub}</tspan>{/if}</text
          >
        {:else}
          <text
            x="0"
            y={y + (r.sub ? h / 2 - 3 : h / 2)}
            dominant-baseline="middle"
            class="label"
            class:nadruk={r.nadruk}>{r.label}</text
          >
          {#if r.sub}<text x="0" y={y + h / 2 + 11} dominant-baseline="middle" class="sub">{r.sub}</text>{/if}
        {/if}
        <rect {x} {y} width={w} height={h} rx="4" fill={kleur(r.waarde)} />
        <text
          x={B}
          y={y + h / 2}
          dominant-baseline="middle"
          text-anchor="end"
          class="waarde {tekstKleur(r.waarde)}">{r.tekst}</text
        >
      </g>
    {/each}
  </svg>
  {#if tip}<Tooltip {...tip} {breedte} />{/if}
</div>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
    overflow: visible;
  }
  .raster {
    stroke: var(--line);
    stroke-width: 1;
  }
  .nul {
    stroke: var(--zero);
    stroke-width: 1.5;
  }
  .as {
    fill: var(--muted);
    font-size: 11px;
  }
  /* Een rand in de kleur van de kaart, zodat raster- en nullijn niet door de tekst lopen. */
  .label,
  .sub,
  .waarde {
    paint-order: stroke;
    stroke: var(--panel);
    stroke-width: 4px;
    stroke-linejoin: round;
  }
  .label {
    fill: var(--fg);
    font-size: 12.5px;
    font-weight: 600;
  }
  .nadruk {
    fill: var(--accent);
  }
  .sub {
    fill: var(--muted);
    font-size: 11px;
  }
  .waarde {
    fill: var(--fg);
    font-family: var(--f-num);
    font-size: 11px;
  }
  .waarde.plus {
    fill: var(--gain-tekst);
  }
  .waarde.min {
    fill: var(--loss-tekst);
  }
  .rij:hover rect[rx] {
    opacity: 0.85;
  }
</style>
