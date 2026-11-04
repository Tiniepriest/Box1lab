<script lang="ts">
  import { euro, getal, mooieStap, procent } from "../../lib/format.ts";
  import Figuur from "../grafieken/Figuur.svelte";
  import Tooltip from "../grafieken/Tooltip.svelte";

  /*
   * Wie betaalt de belasting (D-080)? Per inkomensgroep het deel van de belasting in box 1 en box 3, gestapeld.
   * Met de vinkjes zet je een box aan of uit; de staven zijn dan het deel van de belasting in de boxen die aan
   * staan. Box 3 alleen laat zien hoe die kleine post verdeeld is. In een scenario tonen de staven het scenario en
   * een streepje hoe het nu is (`nu`).
   */
  let {
    box1,
    box3,
    huishoudens,
    nu = null,
  }: {
    box1: number[];
    box3: number[];
    huishoudens: number[];
    nu?: { box1: number[]; box3: number[] } | null;
  } = $props();

  let met1 = $state(true);
  let met3 = $state(true);

  const som = (x: number[]) => x.reduce((a, b) => a + b, 0);
  // De lagen die aan staan, met per groep het deel van het totaal van die lagen.
  const lagen = $derived.by(() => {
    const aan = [
      ...(met1 ? [{ naam: "Box 1", kleur: "var(--box1)", bedrag: box1 }] : []),
      ...(met3 ? [{ naam: "Box 3", kleur: "var(--box3)", bedrag: box3 }] : []),
    ];
    const totaal = som(aan.map((l) => som(l.bedrag)));
    return aan.map((l) => ({ ...l, aandeel: l.bedrag.map((v) => (v / totaal) * 100) }));
  });
  const groepAandeel = (i: number) => som(lagen.map((l) => l.aandeel[i]!));
  // Hoe het nu is, met dezelfde boxen: voor het streepje boven elke staaf.
  const nuAandeel = $derived.by(() => {
    if (!nu) return null;
    const per = nu.box1.map((b, i) => (met1 ? b : 0) + (met3 ? nu.box3[i]! : 0));
    return per.map((v) => (v / som(per)) * 100);
  });
  const welke = $derived(met1 && met3 ? "box 1 en box 3 samen" : met1 ? "box 1" : "box 3");

  const mld = (v: number) => `€ ${getal(v, 1)} mld`;
  const naam = (i: number) =>
    i === 0 ? "Groep 1 (laagste 10%)" : i === 9 ? "Groep 10 (hoogste 10%)" : `Groep ${i + 1}`;
  const perHuishouden = (i: number) =>
    (((met1 ? box1[i]! : 0) + (met3 ? box3[i]! : 0)) * 1e9) / huishoudens[i]!;

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const H = 260;
  const LINKS = 40;
  const ONDER = 40;
  const BOVEN = 18;
  const BINNEN = $derived(B - LINKS - 4);
  const hoogte = H - ONDER - BOVEN;
  const vak = $derived(BINNEN / 10);
  const breed = $derived(Math.min(44, vak * 0.62));

  const schaal = $derived.by(() => {
    const hoogste = Math.max(...box1.map((_, i) => groepAandeel(i)), ...(nuAandeel ?? []));
    const stap = mooieStap(hoogste, 5);
    const max = Math.ceil(hoogste / stap) * stap;
    return { max, ticks: Array.from({ length: Math.round(max / stap) + 1 }, (_, k) => k * stap) };
  });
  const y = (v: number) => BOVEN + hoogte - (v / schaal.max) * hoogte;

  /** Staaf met afgeronde bovenhoeken (het einde van de staaf), recht op de basislijn. */
  function staaf(x: number, boven: number, w: number, h: number, rond: boolean): string {
    const r = rond ? Math.min(4, h, w / 2) : 0;
    return `M${x},${boven + h} V${boven + r} Q${x},${boven} ${x + r},${boven} H${x + w - r} Q${x + w},${boven} ${x + w},${boven + r} V${boven + h} Z`;
  }

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);
  function beweeg(e: PointerEvent, i: number) {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    const regels = [
      naam(i),
      ...lagen.map((l) => `${l.naam}: ${mld(l.bedrag[i]!)}`),
      `${procent(groepAandeel(i))} van alle belasting in ${welke}`,
      `gemiddeld ${euro(perHuishouden(i))} per huishouden per jaar`,
    ];
    if (nuAandeel) regels.push(`nu: ${procent(nuAandeel[i]!)}`);
    tip = { x: e.clientX - box.left, y: e.clientY - box.top, regels };
  }
</script>

<div class="kaart">
  <Figuur
    titel="Welk deel van de belasting betaalt elke inkomensgroep?"
    uitleg={`Als deel van alle belasting in ${welke}${nu ? ", in dit scenario" : ""}. Box 1 is inkomen uit werk, uitkering en pensioen; box 3 is sparen en beleggen. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen.`}
  >
    {#snippet legenda()}
      <!-- Het laatste vinkje kan niet uit: dan valt er niets te zien. -->
      <label class="vinkje"
        ><input type="checkbox" bind:checked={met1} disabled={met1 && !met3} /><i
          class="legenda-blok"
          style="background: var(--box1)"
        ></i>Box 1</label
      >
      <label class="vinkje"
        ><input type="checkbox" bind:checked={met3} disabled={met3 && !met1} /><i
          class="legenda-blok"
          style="background: var(--box3)"
        ></i>Box 3</label
      >
      {#if nu}<span><i class="legenda-nu"></i>nu</span>{/if}
    {/snippet}
    {#snippet grafiek()}
      <div class="houder" bind:clientWidth={breedte}>
        <svg
          viewBox="0 0 {B} {H}"
          role="img"
          aria-label="Aandeel van de belasting in {welke} per inkomensgroep"
        >
          {#each schaal.ticks as t (t)}
            <line x1={LINKS} x2={B} y1={y(t)} y2={y(t)} class={t === 0 ? "nul" : "raster"} />
            <text x={LINKS - 6} y={y(t)} text-anchor="end" dominant-baseline="middle" class="as"
              >{getal(t)}%</text
            >
          {/each}
          {#each box1 as _, i (i)}
            {@const x = LINKS + i * vak + (vak - breed) / 2}
            {@const hoogten = lagen.map((l) => (l.aandeel[i]! / schaal.max) * hoogte)}
            {@const zichtbaar = hoogten.map((h, k) => k === 0 || h >= 2.5)}
            {@const laatste = zichtbaar.lastIndexOf(true)}
            {@const top = hoogten.reduce((a, h, k) => a + (zichtbaar[k] ? h : 0), 0)}
            <g role="presentation" onpointermove={(e) => beweeg(e, i)} onpointerleave={() => (tip = null)}>
              <rect x={LINKS + i * vak} y={BOVEN} width={vak} height={hoogte} fill="transparent" />
              {#each lagen as l, k (l.naam)}
                {#if zichtbaar[k]}
                  {@const onder = hoogten.slice(0, k).reduce((a, h, j) => a + (zichtbaar[j] ? h : 0), 0)}
                  <!-- 2px ruimte tussen de lagen, in de kleur van de achtergrond -->
                  <path
                    d={staaf(
                      x,
                      y(0) - onder - hoogten[k]!,
                      breed,
                      hoogten[k]! - (k > 0 ? 2 : 0),
                      k === laatste,
                    )}
                    fill={l.kleur}
                  />
                {/if}
              {/each}
              {#if nuAandeel}
                <line x1={x - 4} x2={x + breed + 4} y1={y(nuAandeel[i]!)} y2={y(nuAandeel[i]!)} class="nu" />
              {/if}
              {#if i === 9}
                <text
                  x={x + breed / 2}
                  y={Math.min(y(0) - top, nuAandeel ? y(nuAandeel[i]!) : Infinity) - 6}
                  text-anchor="middle"
                  class="waarde">{procent(groepAandeel(i), 0)}</text
                >
              {/if}
              <text x={LINKS + (i + 0.5) * vak} y={H - ONDER + 16} text-anchor="middle" class="as"
                >{i + 1}</text
              >
            </g>
          {/each}
          <text x={LINKS + BINNEN / 2} y={H - 6} text-anchor="middle" class="as"
            >inkomensgroep, van laag naar hoog inkomen</text
          >
        </svg>
        {#if tip}<Tooltip {...tip} {breedte} />{/if}
      </div>
    {/snippet}
    {#snippet tabel()}
      <table class="data">
        <thead>
          <tr>
            <th>Groep</th>
            {#each lagen as l (l.naam)}<th>{l.naam}</th>{/each}
            <th>Deel van {welke}</th>
            {#if nuAandeel}<th>Nu</th>{/if}
            <th>Per huishouden</th>
          </tr>
        </thead>
        <tbody>
          {#each box1 as _, i (i)}
            <tr>
              <td>{naam(i)}</td>
              {#each lagen as l (l.naam)}<td class="num">{mld(l.bedrag[i]!)}</td>{/each}
              <td class="num">{procent(groepAandeel(i))}</td>
              {#if nuAandeel}<td class="num">{procent(nuAandeel[i]!)}</td>{/if}
              <td class="num">{euro(perHuishouden(i))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/snippet}
  </Figuur>
</div>

<style>
  .houder {
    position: relative;
  }
  .vinkje {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: inherit;
  }
  .vinkje input {
    margin: 0 2px 0 0;
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
  .nu {
    stroke: var(--fg);
    stroke-width: 2;
  }
  .legenda-nu {
    display: inline-block;
    width: 14px;
    height: 2px;
    background: var(--fg);
    vertical-align: middle;
    margin-right: 5px;
  }
</style>
