<script lang="ts">
  import { euro, mooieStap, procent } from "../../lib/format.ts";
  import Tooltip from "./Tooltip.svelte";

  /*
   * Lijngrafiek over bruto inkomen. Eén of twee reeksen: "huidig" (grijs gestippeld) en eventueel "scenario"
   * (accentkleur). Met een verticale hulplijn en tooltip die de waarden bij dat inkomen toont.
   */
  let {
    x,
    reeksen,
    yEenheid = "euro",
    yLabel = yEenheid === "procent" ? (v: number) => procent(v, 0) : (v: number) => euro(v),
    yMin,
    yMax,
    markering,
    beschrijving,
    xTitel = "bruto inkomen per jaar",
  }: {
    x: number[];
    reeksen: { naam: string; waarden: number[]; soort: "huidig" | "scenario" }[];
    /** Eenvoudige keuze voor de as, ook bruikbaar vanuit een Astro-eiland (functies kunnen daar niet mee). */
    yEenheid?: "euro" | "procent";
    yLabel?: (v: number) => string;
    yMin?: number;
    yMax?: number;
    /** Optioneel: een punt om te markeren (bijvoorbeeld "jij"). */
    markering?: { x: number; label: string };
    beschrijving: string;
    xTitel?: string;
  } = $props();

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const H = $derived(B < 480 ? 240 : 280);
  const L = 64;
  const R = 26;
  const T = 12;
  const O = 38;
  const IB = $derived(B - L - R);
  const IH = $derived(H - T - O);

  const bereik = $derived.by(() => {
    const alle = reeksen.flatMap((r) => r.waarden).filter((v) => Number.isFinite(v));
    let lo = Math.min(...alle);
    let hi = Math.max(...alle);
    if (yMin !== undefined) lo = Math.max(lo, yMin);
    if (yMax !== undefined) hi = Math.min(hi, yMax);
    if (hi - lo < 1e-9) hi = lo + 1;
    const stap = mooieStap(hi - lo, 5);
    return { lo: Math.floor(lo / stap) * stap, hi: Math.ceil(hi / stap) * stap, stap };
  });

  const X = (v: number) => L + ((v - x[0]!) / (x[x.length - 1]! - x[0]!)) * IB;
  const Y = (v: number) =>
    T + IH - ((Math.min(bereik.hi, Math.max(bereik.lo, v)) - bereik.lo) / (bereik.hi - bereik.lo)) * IH;

  const yTicks = $derived.by(() => {
    const t: number[] = [];
    for (let v = bereik.lo; v <= bereik.hi + 1e-9; v += bereik.stap) t.push(Number(v.toFixed(8)));
    return t;
  });
  const xTicks = $derived.by(() => {
    const stap = mooieStap(x[x.length - 1]! - x[0]!, B < 480 ? 4 : 6);
    const t: number[] = [];
    for (let v = Math.ceil(x[0]! / stap) * stap; v <= x[x.length - 1]!; v += stap) t.push(v);
    return t;
  });
  const pad = (w: number[]) =>
    w.map((v, i) => `${i ? "L" : "M"}${X(x[i]!).toFixed(1)},${Y(v).toFixed(1)}`).join("");

  let actief = $state<number | null>(null);
  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);

  function beweeg(e: PointerEvent) {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const box = svg.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * B;
    const i = Math.max(0, Math.min(x.length - 1, Math.round(((px - L) / IB) * (x.length - 1))));
    actief = i;
    const ouder = svg.parentElement!.getBoundingClientRect();
    tip = {
      x: e.clientX - ouder.left,
      y: e.clientY - ouder.top,
      regels: [`Bruto ${euro(x[i]!)}`, ...reeksen.map((r) => `${r.naam}: ${yLabel(r.waarden[i]!)}`)],
    };
  }
</script>

<div bind:clientWidth={breedte}>
  <svg viewBox="0 0 {B} {H}" role="img" aria-label={beschrijving}>
    {#each yTicks as v (v)}
      <line x1={L} x2={B - R} y1={Y(v)} y2={Y(v)} class="raster" />
      <text x={L - 6} y={Y(v)} text-anchor="end" dominant-baseline="middle" class="as">{yLabel(v)}</text>
    {/each}
    {#each xTicks as v (v)}
      <text x={X(v)} y={H - 20} text-anchor="middle" class="as">{v === 0 ? "€ 0" : `${euro(v / 1000)}k`}</text
      >
    {/each}
    <text x={L + IB / 2} y={H - 3} text-anchor="middle" class="as">{xTitel}</text>
    {#each reeksen as r (r.naam)}
      <path d={pad(r.waarden)} class={r.soort} />
    {/each}
    {#if markering}
      <line x1={X(markering.x)} x2={X(markering.x)} y1={T} y2={T + IH} class="markering" />
      <text x={X(markering.x) + 4} y={T + 10} class="markering-tekst">{markering.label}</text>
    {/if}
    {#if actief !== null}
      <line x1={X(x[actief]!)} x2={X(x[actief]!)} y1={T} y2={T + IH} class="hulplijn" />
    {/if}
    <rect
      x={L}
      y={T}
      width={IB}
      height={IH}
      fill="transparent"
      role="presentation"
      onpointermove={beweeg}
      onpointerleave={() => {
        actief = null;
        tip = null;
      }}
    />
  </svg>
  {#if tip}<Tooltip {...tip} {breedte} />{/if}
</div>

<style>
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .raster {
    stroke: var(--line);
  }
  .as {
    fill: var(--muted);
    font-size: 11px;
  }
  path {
    fill: none;
    stroke-width: 2;
  }
  .huidig {
    stroke: var(--zero);
    stroke-dasharray: 5 4;
  }
  .scenario {
    stroke: var(--accent);
  }
  .hulplijn {
    stroke: var(--muted);
    stroke-width: 1;
  }
  .markering {
    stroke: var(--fg);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .markering-tekst {
    fill: var(--fg);
    font-size: 11px;
    font-weight: 600;
  }
</style>
