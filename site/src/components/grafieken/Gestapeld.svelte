<script lang="ts" module>
  /** De vijf klassen, van groot verlies naar grote winst. */
  export const KLASSEN = [
    { naam: "Verlies meer dan 5%", kleur: "var(--loss)" },
    { naam: "Verlies 1–5%", kleur: "var(--loss2)" },
    { naam: "Minder dan 1% verschil", kleur: "var(--neutral)" },
    { naam: "Winst 1–5%", kleur: "var(--gain2)" },
    { naam: "Winst meer dan 5%", kleur: "var(--gain)" },
  ] as const;
</script>

<script lang="ts">
  import { getal } from "../../lib/format.ts";
  import Tooltip from "./Tooltip.svelte";

  /* Gestapelde staven per groep: aandeel personen per klasse (samen 100%). */
  let {
    rijen,
    beschrijving,
  }: { rijen: { label: string; aandelen: number[]; vet?: boolean }[]; beschrijving: string } = $props();

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const LABEL = 76;
  const RIJ = 26;
  const BINNEN = $derived(B - LABEL - 8);
  const H = $derived(rijen.length * RIJ + 22);

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);

  function segmenten(aandelen: number[]) {
    let x = LABEL;
    return aandelen.map((a, k) => {
      const w = (BINNEN * a) / 100;
      const s = { x, w, k };
      x += w;
      return s;
    });
  }

  function beweeg(e: PointerEvent, r: { label: string; aandelen: number[] }) {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    tip = {
      x: e.clientX - box.left,
      y: e.clientY - box.top,
      regels: [r.label, ...KLASSEN.map((k, i) => `${k.naam}: ${getal(r.aandelen[i] ?? 0)}%`)],
    };
  }
</script>

<div bind:clientWidth={breedte}>
  <svg viewBox="0 0 {B} {H}" role="img" aria-label={beschrijving}>
    {#each [0, 25, 50, 75, 100] as t (t)}
      <text
        x={LABEL + (BINNEN * t) / 100}
        y={H - 5}
        text-anchor={t === 0 ? "start" : t === 100 ? "end" : "middle"}
        class="as">{t}%</text
      >
    {/each}
    {#each rijen as r, i (r.label)}
      {@const y = i * RIJ + 4}
      <g role="presentation" onpointermove={(e) => beweeg(e, r)} onpointerleave={() => (tip = null)}>
        <rect x="0" y={y - 3} width={B} height={RIJ} fill="transparent" />
        <text x="0" y={y + (RIJ - 8) / 2} dominant-baseline="middle" class="label" class:vet={r.vet}
          >{r.label}</text
        >
        {#each segmenten(r.aandelen) as s (s.k)}
          {#if s.w > 0.5}
            <rect
              x={s.x}
              {y}
              width={Math.max(0, s.w - 2)}
              height={RIJ - 8}
              rx="2"
              fill={KLASSEN[s.k]!.kleur}
            />
          {/if}
        {/each}
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
  }
  .as {
    fill: var(--muted);
    font-size: 11px;
  }
  .label {
    fill: var(--fg);
    font-size: 12px;
  }
  .vet {
    font-weight: 600;
  }
</style>
