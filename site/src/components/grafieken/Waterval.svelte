<script lang="ts">
  import { euro, euroVerschil } from "../../lib/format.ts";
  import Tooltip from "./Tooltip.svelte";

  /*
   * Waterval van bruto naar besteedbaar: elke stap telt op (blauw) of trekt af (oranje); begin en eind zijn
   * grijze totaalstaven. Horizontaal, zodat de labels ook op een telefoon leesbaar blijven.
   */
  let {
    stappen,
    beschrijving,
  }: {
    stappen: { label: string; bedrag: number; soort: "totaal" | "plus" | "min" }[];
    beschrijving: string;
  } = $props();

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const LABEL = $derived(Math.min(190, B * 0.42));
  const RIJ = 30;
  const R = $derived(Math.min(90, B * 0.24));
  const H = $derived(stappen.length * RIJ + 8);

  const posities = $derived.by(() => {
    let stand = 0;
    return stappen.map((s) => {
      if (s.soort === "totaal") {
        stand = s.bedrag;
        return { van: 0, tot: s.bedrag };
      }
      const van = stand;
      stand += s.soort === "plus" ? s.bedrag : -s.bedrag;
      return { van, tot: stand };
    });
  });
  const max = $derived(Math.max(1, ...posities.flatMap((p) => [p.van, p.tot])));
  const X = (v: number) => LABEL + (Math.max(0, v) / max) * (B - LABEL - R);

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);

  function kleur(soort: string) {
    return soort === "totaal" ? "var(--zero)" : soort === "plus" ? "var(--gain)" : "var(--loss)";
  }
  function tekst(s: { bedrag: number; soort: string }) {
    return s.soort === "totaal" ? euro(s.bedrag) : euroVerschil(s.soort === "plus" ? s.bedrag : -s.bedrag);
  }
</script>

<div bind:clientWidth={breedte}>
  <svg viewBox="0 0 {B} {H}" role="img" aria-label={beschrijving}>
    {#each stappen as s, i (s.label)}
      {@const p = posities[i]!}
      {@const y = i * RIJ + 4}
      {@const x1 = X(Math.min(p.van, p.tot))}
      {@const w = Math.max(1, Math.abs(X(p.tot) - X(p.van)))}
      <g
        role="presentation"
        onpointermove={(e) => {
          const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
          tip = {
            x: e.clientX - box.left,
            y: e.clientY - box.top,
            regels: [s.label, tekst(s) + " per jaar"],
          };
        }}
        onpointerleave={() => (tip = null)}
      >
        <rect x="0" y={y - 3} width={B} height={RIJ} fill="transparent" />
        <text
          x="0"
          y={y + (RIJ - 10) / 2}
          dominant-baseline="middle"
          class="label"
          class:totaal={s.soort === "totaal"}>{s.label}</text
        >
        <rect x={x1} {y} width={w} height={RIJ - 10} rx="3" fill={kleur(s.soort)} />
        <text x={x1 + w + 6} y={y + (RIJ - 10) / 2} dominant-baseline="middle" class="waarde">{tekst(s)}</text
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
  }
  .label {
    fill: var(--fg);
    font-size: 12.5px;
  }
  .label.totaal {
    font-weight: 600;
  }
  .waarde {
    fill: var(--fg);
    font-family: var(--f-num);
    font-size: 11.5px;
  }
</style>
