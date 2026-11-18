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
  import Tooltip, { type TipRegel } from "./Tooltip.svelte";

  /* Gestapelde staven per groep: aandeel personen per klasse (samen 100%). */
  let {
    rijen,
    labelBreedte = 76,
    beschrijving,
  }: {
    rijen: { label: string; aandelen: number[]; vet?: boolean }[];
    /** Ruimte voor de labels links, in pixels. */
    labelBreedte?: number;
    beschrijving: string;
  } = $props();

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const LABEL = $derived(labelBreedte);
  const RIJ = 26;
  const BINNEN = $derived(B - LABEL - 8);
  const H = $derived(rijen.length * RIJ + 22);

  let tip = $state<{ x: number; y: number; onder: number; regels: TipRegel[] } | null>(null);
  let actief = $state<number | null>(null);
  /** Percentage in het vlak als het past; tekstkleur passend bij licht of sterk vlak. */
  const PAST = 30;
  const sterk = (k: number) => k === 0 || k === 4;

  function segmenten(aandelen: number[]) {
    let x = LABEL;
    return aandelen.map((a, k) => {
      const w = (BINNEN * a) / 100;
      const s = { x, w, k };
      x += w;
      return s;
    });
  }

  /** Tooltip boven de rij, met een staaltje per klasse. */
  function beweeg(e: PointerEvent, r: { label: string; aandelen: number[] }, i: number) {
    const svg = (e.currentTarget as SVGElement).ownerSVGElement!;
    const box = svg.parentElement!.getBoundingClientRect();
    const schaalPx = svg.getBoundingClientRect().width / B;
    actief = i;
    tip = {
      x: e.clientX - box.left,
      y: (i * RIJ + 1) * schaalPx,
      onder: ((i + 1) * RIJ - 1) * schaalPx,
      regels: [
        r.label,
        ...KLASSEN.map((k, j) => ({ tekst: `${k.naam}: ${getal(r.aandelen[j] ?? 0)}%`, kleur: k.kleur })),
      ],
    };
  }
  function sluit() {
    actief = null;
    tip = null;
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
      <g
        role="presentation"
        onpointermove={(e) => beweeg(e, r, i)}
        onpointerdown={(e) => beweeg(e, r, i)}
        onpointerleave={(e) => e.pointerType !== "touch" && sluit()}
      >
        <rect x="0" y={y - 3} width={B} height={RIJ - 2} rx="3" class="band" class:actief={actief === i} />
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
            {#if s.w >= PAST}
              <text
                x={s.x + (s.w - 2) / 2}
                y={y + (RIJ - 8) / 2}
                text-anchor="middle"
                dominant-baseline="middle"
                class="seg"
                class:sterk={sterk(s.k)}>{Math.round(r.aandelen[s.k] ?? 0)}%</text
              >
            {/if}
          {/if}
        {/each}
      </g>
    {/each}
  </svg>
  {#if tip}<Tooltip {...tip} {breedte} onsluit={sluit} />{/if}
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
  .band {
    fill: transparent;
  }
  .band.actief {
    fill: color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .seg {
    fill: var(--fg);
    font-family: var(--f-num);
    font-size: 10.5px;
    pointer-events: none;
  }
  .seg.sterk {
    fill: var(--op-sterk);
  }
</style>
