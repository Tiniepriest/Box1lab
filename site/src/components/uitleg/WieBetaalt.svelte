<script lang="ts">
  import { euro, getal, mooieStap, procent } from "../../lib/format.ts";
  import Figuur from "../grafieken/Figuur.svelte";
  import Tooltip from "../grafieken/Tooltip.svelte";

  /*
   * Wie betaalt de belasting (D-080)? Per inkomensgroep het deel van alle belasting in box 1 en box 3, gestapeld.
   * Box 3 is maar een klein deel van het totaal; daarom staat de verdeling van box 3 zelf er klein onder.
   */
  let { box1, box3, huishoudens }: { box1: number[]; box3: number[]; huishoudens: number[] } = $props();

  type Laag = { naam: string; kleur: string; bedrag: number[]; aandeel: number[] };

  const som = (x: number[]) => x.reduce((a, b) => a + b, 0);
  const totaal = $derived(som(box1) + som(box3));
  const samen: Laag[] = $derived([
    { naam: "Box 1", kleur: "var(--box1)", bedrag: box1, aandeel: box1.map((v) => (v / totaal) * 100) },
    { naam: "Box 3", kleur: "var(--box3)", bedrag: box3, aandeel: box3.map((v) => (v / totaal) * 100) },
  ]);
  const apart: Laag[] = $derived([
    { naam: "Box 3", kleur: "var(--box3)", bedrag: box3, aandeel: box3.map((v) => (v / som(box3)) * 100) },
  ]);

  const mld = (v: number) => `€ ${getal(v, 1)} mld`;
  const naam = (i: number) =>
    i === 0 ? "Groep 1 (laagste 10%)" : i === 9 ? "Groep 10 (hoogste 10%)" : `Groep ${i + 1}`;
  const perHuishouden = (i: number) => ((box1[i]! + box3[i]!) * 1e9) / huishoudens[i]!;

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const LINKS = 40;
  const ONDER = 40;
  const BOVEN = 18;
  const BINNEN = $derived(B - LINKS - 4);
  const vak = $derived(BINNEN / 10);
  const breed = $derived(Math.min(44, vak * 0.62));

  /** Staaf met afgeronde bovenhoeken (het einde van de staaf), recht op de basislijn. */
  function staaf(x: number, boven: number, w: number, h: number, rond: boolean): string {
    const r = rond ? Math.min(4, h, w / 2) : 0;
    return `M${x},${boven + h} V${boven + r} Q${x},${boven} ${x + r},${boven} H${x + w - r} Q${x + w},${boven} ${x + w},${boven + r} V${boven + h} Z`;
  }

  function schaal(lagen: Laag[], H: number) {
    const hoogte = H - ONDER - BOVEN;
    const hoogste = Math.max(...lagen[0]!.aandeel.map((_, i) => som(lagen.map((l) => l.aandeel[i]!))));
    const stap = mooieStap(hoogste, 5);
    const max = Math.ceil(hoogste / stap) * stap;
    const y = (v: number) => BOVEN + hoogte - (v / max) * hoogte;
    const ticks = Array.from({ length: Math.round(max / stap) + 1 }, (_, k) => k * stap);
    return { hoogte, max, y, ticks };
  }

  // Elke grafiek een eigen tekstvak: `bij` is de beschrijving van de grafiek.
  let tip = $state<{ x: number; y: number; regels: string[]; bij: string } | null>(null);
  function beweeg(e: PointerEvent, lagen: Laag[], i: number, bij: string) {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    const regels =
      lagen.length > 1
        ? [
            naam(i),
            `Box 1: ${mld(box1[i]!)}`,
            `Box 3: ${mld(box3[i]!)}`,
            `${procent(som(lagen.map((l) => l.aandeel[i]!)))} van alle belasting`,
            `gemiddeld ${euro(perHuishouden(i))} per huishouden per jaar`,
          ]
        : [naam(i), `Box 3: ${mld(box3[i]!)}`, `${procent(lagen[0]!.aandeel[i]!)} van alle box 3-belasting`];
    tip = { x: e.clientX - box.left, y: e.clientY - box.top, regels, bij };
  }
</script>

{#snippet staven(lagen: Laag[], H: number, beschrijving: string)}
  {@const s = schaal(lagen, H)}
  <div class="houder" bind:clientWidth={breedte}>
    <svg viewBox="0 0 {B} {H}" role="img" aria-label={beschrijving}>
      {#each s.ticks as t (t)}
        <line x1={LINKS} x2={B} y1={s.y(t)} y2={s.y(t)} class={t === 0 ? "nul" : "raster"} />
        <text x={LINKS - 6} y={s.y(t)} text-anchor="end" dominant-baseline="middle" class="as"
          >{getal(t)}%</text
        >
      {/each}
      {#each lagen[0]!.aandeel as _, i (i)}
        {@const x = LINKS + i * vak + (vak - breed) / 2}
        {@const hoogten = lagen.map((l) => (l.aandeel[i]! / s.max) * s.hoogte)}
        {@const zichtbaar = hoogten.map((h, k) => k === 0 || h >= 2.5)}
        {@const laatste = zichtbaar.lastIndexOf(true)}
        {@const top = hoogten.reduce((a, h, k) => a + (zichtbaar[k] ? h : 0), 0)}
        <g
          role="presentation"
          onpointermove={(e) => beweeg(e, lagen, i, beschrijving)}
          onpointerleave={() => (tip = null)}
        >
          <rect x={LINKS + i * vak} y={BOVEN} width={vak} height={s.hoogte} fill="transparent" />
          {#each lagen as l, k (l.naam)}
            {#if zichtbaar[k]}
              {@const onder = hoogten.slice(0, k).reduce((a, h, j) => a + (zichtbaar[j] ? h : 0), 0)}
              <!-- 2px ruimte tussen de lagen, in de kleur van de achtergrond -->
              <path
                d={staaf(
                  x,
                  s.y(0) - onder - hoogten[k]!,
                  breed,
                  hoogten[k]! - (k > 0 ? 2 : 0),
                  k === laatste,
                )}
                fill={l.kleur}
              />
            {/if}
          {/each}
          {#if i === 9}
            <text x={x + breed / 2} y={s.y(0) - top - 6} text-anchor="middle" class="waarde"
              >{procent(som(lagen.map((l) => l.aandeel[i]!)), 0)}</text
            >
          {/if}
          <text x={LINKS + (i + 0.5) * vak} y={H - ONDER + 16} text-anchor="middle" class="as">{i + 1}</text>
        </g>
      {/each}
      <text x={LINKS + BINNEN / 2} y={H - 6} text-anchor="middle" class="as"
        >inkomensgroep, van laag naar hoog inkomen</text
      >
    </svg>
    {#if tip?.bij === beschrijving}<Tooltip x={tip.x} y={tip.y} regels={tip.regels} {breedte} />{/if}
  </div>
{/snippet}

<div class="kaart">
  <Figuur
    titel="Welk deel van de belasting betaalt elke inkomensgroep?"
    uitleg="Box 1 (inkomen uit werk, uitkering en pensioen) en box 3 (sparen en beleggen), als deel van alle belasting in die twee boxen samen. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen."
  >
    {#snippet legenda()}
      <span><i class="legenda-blok" style="background: var(--box1)"></i>Box 1</span>
      <span><i class="legenda-blok" style="background: var(--box3)"></i>Box 3</span>
    {/snippet}
    {#snippet grafiek()}
      {@render staven(samen, 260, "Aandeel van de belasting in box 1 en box 3 per inkomensgroep")}
    {/snippet}
    {#snippet tabel()}
      <table class="data">
        <thead>
          <tr
            ><th>Groep</th><th>Box 1</th><th>Box 3</th><th>Deel van alle belasting</th><th>Per huishouden</th
            ></tr
          >
        </thead>
        <tbody>
          {#each box1 as _, i (i)}
            <tr>
              <td>{naam(i)}</td>
              <td class="num">{mld(box1[i]!)}</td>
              <td class="num">{mld(box3[i]!)}</td>
              <td class="num">{procent(samen[0]!.aandeel[i]! + samen[1]!.aandeel[i]!)}</td>
              <td class="num">{euro(perHuishouden(i))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/snippet}
  </Figuur>

  <div class="apart">
    <Figuur
      titel="Box 3 apart: welk deel van de box 3-belasting betaalt elke groep?"
      uitleg="Box 3 is maar een klein deel van het totaal. Hier zie je hoe de box 3-belasting zelf over de groepen verdeeld is."
    >
      {#snippet grafiek()}
        {@render staven(apart, 200, "Aandeel van de box 3-belasting per inkomensgroep")}
      {/snippet}
      {#snippet tabel()}
        <table class="data">
          <thead><tr><th>Groep</th><th>Box 3</th><th>Deel van alle box 3-belasting</th></tr></thead>
          <tbody>
            {#each box3 as b, i (i)}
              <tr>
                <td>{naam(i)}</td>
                <td class="num">{mld(b)}</td>
                <td class="num">{procent(apart[0]!.aandeel[i]!)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/snippet}
    </Figuur>
  </div>
</div>

<style>
  .houder {
    position: relative;
  }
  .apart {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  svg {
    width: 100%;
    height: auto;
    display: block;
  }
  .as {
    fill: var(--muted);
    font-size: 11px;
  }
  .waarde {
    fill: var(--fg);
    font-size: 12px;
    font-weight: 600;
  }
  .raster {
    stroke: var(--line);
    stroke-width: 1;
  }
  .nul {
    stroke: var(--zero);
    stroke-width: 1.5;
  }
</style>
