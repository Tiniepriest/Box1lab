<script lang="ts" module>
  export interface Rij {
    label: string;
    sub?: string;
    waarde: number;
    tekst: string;
    tip: string[];
  }
</script>

<script lang="ts">
  import { mooieStap } from "../../lib/format.ts";
  import Tooltip from "./Tooltip.svelte";

  /*
   * Horizontale staven vanaf een nullijn: rechts (blauw) is erop vooruit, links (oranje) erop achteruit.
   * Waarden dicht bij nul worden grijs. De waarde staat naast de staaf; meer details in de tooltip.
   */
  let {
    rijen,
    asLabel = (v: number) => String(v),
    drempel = 0,
    labelBreedte = 150,
    beschrijving,
  }: {
    rijen: Rij[];
    asLabel?: (v: number) => string;
    drempel?: number;
    labelBreedte?: number;
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
  const RIJ = $derived(boven ? 50 : 34);
  const LABELRUIMTE = $derived(boven ? 17 : 0);
  const RAND = 12;
  const H = $derived(rijen.length * RIJ + 28);
  // Zonder verschillen (huidig beleid) toch een leesbare as van −1 tot +1.
  const max = $derived(Math.max(1, ...rijen.map((r) => Math.abs(r.waarde))) * 1.3);
  const midden = $derived(LB + (B - LB - RAND) / 2);
  const schaal = $derived((B - LB - RAND) / 2 / max);
  const stap = $derived(mooieStap(max, 2));
  const ticks = $derived.by(() => {
    const t: number[] = [];
    for (let v = -Math.floor(max / stap) * stap; v <= max + 1e-9; v += stap) t.push(Number(v.toFixed(10)));
    return t;
  });

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);

  /** Waar komt de waarde: naast de staaf, of (als die daar niet past) aan de andere kant van de nullijn? */
  function tekstPlek(r: Rij, x: number, w: number): { x: number; anker: "start" | "end" } {
    const tekstBreedte = r.tekst.length * 6.6;
    if (r.waarde >= 0) {
      return x + w + 5 + tekstBreedte <= B
        ? { x: x + w + 5, anker: "start" }
        : { x: midden - 5, anker: "end" };
    }
    return x - 5 - tekstBreedte >= LB + 4 ? { x: x - 5, anker: "end" } : { x: midden + 5, anker: "start" };
  }

  function kleur(v: number): string {
    if (Math.abs(v) <= drempel) return "var(--zero)";
    return v > 0 ? "var(--gain)" : "var(--loss)";
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
      {@const h = RIJ - 14 - LABELRUIMTE}
      {@const w = Math.max(1, Math.abs(r.waarde) * schaal)}
      {@const x = r.waarde >= 0 ? midden : midden - w}
      {@const plek = tekstPlek(r, x, w)}
      <g
        class="rij"
        role="presentation"
        onpointermove={(e) => beweeg(e, r)}
        onpointerleave={() => (tip = null)}
      >
        <rect x="0" y={y - 4 - LABELRUIMTE} width={B} height={RIJ} fill="transparent" />
        {#if boven}
          <text x="0" y={y - 7} class="label"
            >{r.label}{#if r.sub}<tspan class="sub"> · {r.sub}</tspan>{/if}</text
          >
        {:else}
          <text x="0" y={y + (r.sub ? h / 2 - 3 : h / 2)} dominant-baseline="middle" class="label"
            >{r.label}</text
          >
          {#if r.sub}<text x="0" y={y + h / 2 + 11} dominant-baseline="middle" class="sub">{r.sub}</text>{/if}
        {/if}
        <rect {x} {y} width={w} height={h} rx="4" fill={kleur(r.waarde)} />
        <text x={plek.x} y={y + h / 2} dominant-baseline="middle" text-anchor={plek.anker} class="waarde"
          >{r.tekst}</text
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
  .label {
    fill: var(--fg);
    font-size: 12.5px;
    font-weight: 600;
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
  .rij:hover rect[rx] {
    opacity: 0.85;
  }
</style>
