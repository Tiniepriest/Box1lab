<script lang="ts">
  import { euro, euroVerschil, getal, miljard, mooieStap, procent } from "../../lib/format.ts";
  import Figuur from "../grafieken/Figuur.svelte";
  import Tooltip from "../grafieken/Tooltip.svelte";

  /*
   * Wie betaalt de belasting (D-080)? Per inkomensgroep het deel van de belasting in box 1 en box 3, gestapeld.
   * Met de vinkjes zet je een box aan of uit; de staven zijn dan het deel van de belasting in de boxen die aan
   * staan. In een scenario tonen de staven het scenario en een streepje hoe het nu is (`nu`). Met "Verschil met nu"
   * is nu de nullijn en tonen de staven hoeveel meer of minder belasting een huishouden in die groep betaalt (D-081).
   * Dan kan er een derde laag bij: wat het huishouden minder of meer krijgt aan uitkeringen en toeslagen (D-082).
   * Minder krijgen telt omhoog, net als meer belasting: voor de portemonnee is dat hetzelfde.
   */
  let {
    box1,
    box3,
    ontvangen,
    huishoudens,
    nu = null,
  }: {
    box1: number[];
    box3: number[];
    ontvangen: number[];
    huishoudens: number[];
    nu?: { box1: number[]; box3: number[]; ontvangen: number[] } | null;
  } = $props();

  let met1 = $state(true);
  let met3 = $state(true);
  let metO = $state(true);
  let verschil = $state(false);
  const toonVerschil = $derived(verschil && !!nu);
  const metOntvangen = $derived(toonVerschil && metO);
  // Het laatste vinkje kan niet uit. Zonder verschil telt alleen box 1 en box 3: staan die allebei uit, dan weer aan.
  const aantalAan = $derived(Number(met1) + Number(met3) + Number(metOntvangen));
  $effect(() => {
    if (!toonVerschil && !met1 && !met3) {
      met1 = true;
      met3 = true;
    }
  });

  const som = (x: number[]) => x.reduce((a, b) => a + b, 0);
  // De lagen die aan staan. `aandeel`: deel van het totaal van die lagen (%). `delta`: verschil met nu per
  // huishouden per jaar (euro).
  const lagen = $derived.by(() => {
    const aan = [
      ...(met1 ? [{ naam: "Box 1", kleur: "var(--box1)", bedrag: box1, nu: nu?.box1, teken: 1 }] : []),
      ...(met3 ? [{ naam: "Box 3", kleur: "var(--box3)", bedrag: box3, nu: nu?.box3, teken: 1 }] : []),
      ...(metOntvangen
        ? [
            {
              naam: "Uitkeringen en toeslagen",
              kleur: "var(--ontvangen)",
              bedrag: ontvangen,
              nu: nu?.ontvangen,
              teken: -1,
            },
          ]
        : []),
    ];
    const totaal = som(aan.map((l) => som(l.bedrag)));
    return aan.map((l) => ({
      naam: l.naam,
      kleur: l.kleur,
      ontvangen: l.teken < 0,
      bedrag: l.bedrag,
      aandeel: l.bedrag.map((v) => (v / totaal) * 100),
      deltaMld: l.bedrag.map((v, i) => l.teken * (v - (l.nu?.[i] ?? v))),
      delta: l.bedrag.map((v, i) => (l.teken * (v - (l.nu?.[i] ?? v)) * 1e9) / huishoudens[i]!),
    }));
  });
  const waarden = $derived(lagen.map((l) => (toonVerschil ? l.delta : l.aandeel)));
  const groepTotaal = (i: number) => som(waarden.map((w) => w[i]!));
  const groepAandeel = (i: number) => som(lagen.map((l) => l.aandeel[i]!));
  const groepDeltaMld = (i: number) => som(lagen.map((l) => l.deltaMld[i]!));
  // Hoe het nu is, met dezelfde boxen: voor het streepje boven elke staaf.
  const nuAandeel = $derived.by(() => {
    if (!nu || toonVerschil) return null;
    const per = nu.box1.map((b, i) => (met1 ? b : 0) + (met3 ? nu.box3[i]! : 0));
    return per.map((v) => (v / som(per)) * 100);
  });
  const welke = $derived(met1 && met3 ? "box 1 en box 3 samen" : met1 ? "box 1" : "box 3");
  const opsomming = (x: string[]) =>
    x.length < 2 ? (x[0] ?? "") : `${x.slice(0, -1).join(", ")} en ${x.at(-1)}`;
  const welkeLagen = $derived(
    opsomming(lagen.map((l) => (l.ontvangen ? "uitkeringen en toeslagen" : l.naam.toLowerCase()))),
  );
  // Eén regel per laag in de tooltip, in woorden: "€ 1.775 minder belasting", "€ 634 minder".
  const inWoorden = (v: number, ontvangen: boolean) =>
    Math.abs(v) < 0.5
      ? "geen verschil"
      : `${euro(Math.abs(v))} ${v > 0 === ontvangen ? "minder" : "meer"}${ontvangen ? "" : " belasting"}`;

  const mld = (v: number) => `€ ${getal(v, 1)} mld`;
  const naam = (i: number) =>
    i === 0 ? "Groep 1 (laagste 10%)" : i === 9 ? "Groep 10 (hoogste 10%)" : `Groep ${i + 1}`;
  const perHuishouden = (i: number) =>
    (((met1 ? box1[i]! : 0) + (met3 ? box3[i]! : 0)) * 1e9) / huishoudens[i]!;

  let breedte = $state(0);
  const B = $derived(Math.max(300, breedte || 640));
  const H = 260;
  const LINKS = $derived(toonVerschil ? 64 : 40);
  const ONDER = 40;
  const BOVEN = 18;
  const BINNEN = $derived(B - LINKS - 4);
  const hoogte = H - ONDER - BOVEN;
  const vak = $derived(BINNEN / 10);
  const breed = $derived(Math.min(44, vak * 0.62));

  // De as loopt van het laagste tot het hoogste punt, altijd met 0 erin (in verschil-modus kan het onder 0).
  const schaal = $derived.by(() => {
    const plus = box1.map((_, i) => som(waarden.map((w) => Math.max(0, w[i]!))));
    const min = box1.map((_, i) => som(waarden.map((w) => Math.min(0, w[i]!))));
    const hi0 = Math.max(0, ...plus, ...(nuAandeel ?? []));
    const lo0 = Math.min(0, ...min);
    const stap = mooieStap(hi0 - lo0 || 1, 5);
    const hi = Math.ceil(hi0 / stap) * stap;
    const lo = Math.floor(lo0 / stap) * stap;
    const ticks: number[] = [];
    for (let t = lo; t <= hi + stap / 2; t += stap) ticks.push(Math.round(t / stap) * stap);
    return { hi, lo, ticks };
  });
  const y = (v: number) => BOVEN + ((schaal.hi - v) / (schaal.hi - schaal.lo || 1)) * hoogte;
  const asLabel = (t: number) => (toonVerschil ? euroVerschil(t) : `${getal(t)}%`);

  /**
   * De stukjes van één staaf: positieve waarden van 0 omhoog, negatieve omlaag, met 2px ruimte ertussen. Alleen
   * het buitenste stuk aan elke kant krijgt afgeronde hoeken (het einde van de staaf).
   */
  function stukken(i: number) {
    const uit: { kleur: string; boven: number; h: number; rond: "boven" | "onder" | null }[] = [];
    let plus = 0;
    let min = 0;
    let laatstePlus = -1;
    let laatsteMin = -1;
    lagen.forEach((l, k) => {
      const h = Math.abs(y(waarden[k]![i]!) - y(0));
      if (h < 1.5) return;
      if (waarden[k]![i]! > 0) {
        const gat = plus > 0 ? 2 : 0;
        uit.push({ kleur: l.kleur, boven: y(0) - plus - h, h: h - gat, rond: null });
        plus += h;
        laatstePlus = uit.length - 1;
      } else {
        const gat = min > 0 ? 2 : 0;
        uit.push({ kleur: l.kleur, boven: y(0) + min + gat, h: h - gat, rond: null });
        min += h;
        laatsteMin = uit.length - 1;
      }
    });
    if (laatstePlus >= 0) uit[laatstePlus]!.rond = "boven";
    if (laatsteMin >= 0) uit[laatsteMin]!.rond = "onder";
    return { uit, plus, min };
  }

  function staaf(x: number, boven: number, w: number, h: number, rond: "boven" | "onder" | null): string {
    const r = rond ? Math.min(4, h, w / 2) : 0;
    const o = boven + h;
    if (rond === "onder")
      return `M${x},${boven} V${o - r} Q${x},${o} ${x + r},${o} H${x + w - r} Q${x + w},${o} ${x + w},${o - r} V${boven} Z`;
    return `M${x},${o} V${boven + r} Q${x},${boven} ${x + r},${boven} H${x + w - r} Q${x + w},${boven} ${x + w},${boven + r} V${o} Z`;
  }

  // Eén getal bij de staaf: de hoogste groep (aandeel), of de groep met het grootste verschil.
  const gelabeld = $derived(
    toonVerschil
      ? box1.reduce((b, _, i) => (Math.abs(groepTotaal(i)) > Math.abs(groepTotaal(b)) ? i : b), 0)
      : 9,
  );

  const geenVerschil = $derived(box1.every((_, i) => Math.abs(groepTotaal(i)) < 0.5));

  let tip = $state<{ x: number; y: number; regels: string[] } | null>(null);
  function beweeg(e: PointerEvent, i: number) {
    const box = (e.currentTarget as SVGElement).ownerSVGElement!.parentElement!.getBoundingClientRect();
    const regels = toonVerschil
      ? [
          naam(i),
          ...lagen.map((l) => `${l.naam}: ${inWoorden(l.delta[i]!, l.ontvangen)}`),
          `Samen: ${euroVerschil(groepTotaal(i))} per huishouden per jaar`,
          `Hele groep: ${miljard(groepDeltaMld(i))}`,
        ]
      : [
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
    titel={metOntvangen
      ? "Hoeveel meer betaalt of minder krijgt elke inkomensgroep?"
      : toonVerschil
        ? "Hoeveel meer of minder belasting betaalt elke inkomensgroep?"
        : "Welk deel van de belasting betaalt elke inkomensgroep?"}
    uitleg={metOntvangen
      ? `Verschil met nu in ${welkeLagen}, per huishouden per jaar. Omhoog is meer belasting betalen of minder ontvangen, omlaag minder betalen of meer ontvangen. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen.`
      : toonVerschil
        ? `Verschil met nu in de belasting in ${welke}, per huishouden per jaar. Omhoog is meer belasting, omlaag minder. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen.`
        : `Als deel van alle belasting in ${welke}${nu ? ", in dit scenario" : ""}. Box 1 is inkomen uit werk, uitkering en pensioen; box 3 is sparen en beleggen. De groepen zijn tien even grote delen van de bevolking, van laag naar hoog inkomen.`}
  >
    {#snippet legenda()}
      <!-- Het laatste vinkje kan niet uit: dan valt er niets te zien. -->
      <label class="vinkje"
        ><input type="checkbox" bind:checked={met1} disabled={met1 && aantalAan === 1} /><i
          class="legenda-blok"
          style="background: var(--box1)"
        ></i>Box 1</label
      >
      <label class="vinkje"
        ><input type="checkbox" bind:checked={met3} disabled={met3 && aantalAan === 1} /><i
          class="legenda-blok"
          style="background: var(--box3)"
        ></i>Box 3</label
      >
      {#if toonVerschil}
        <label class="vinkje"
          ><input type="checkbox" bind:checked={metO} disabled={metO && aantalAan === 1} /><i
            class="legenda-blok"
            style="background: var(--ontvangen)"
          ></i>Uitkeringen en toeslagen</label
        >
      {/if}
      {#if nuAandeel}<span><i class="legenda-nu"></i>nu</span>{/if}
      {#if nu}
        <label class="vinkje verschil"><input type="checkbox" bind:checked={verschil} />Verschil met nu</label
        >
      {/if}
    {/snippet}
    {#snippet grafiek()}
      <div class="houder" bind:clientWidth={breedte}>
        <svg
          viewBox="0 0 {B} {H}"
          role="img"
          aria-label={toonVerschil
            ? `Verschil met nu in ${welkeLagen} per huishouden, per inkomensgroep`
            : `Aandeel van de belasting in ${welke} per inkomensgroep`}
        >
          {#each schaal.ticks as t (t)}
            <line x1={LINKS} x2={B} y1={y(t)} y2={y(t)} class={t === 0 ? "nul" : "raster"} />
            <text x={LINKS - 6} y={y(t)} text-anchor="end" dominant-baseline="middle" class="as"
              >{asLabel(t)}</text
            >
          {/each}
          {#each box1 as _, i (i)}
            {@const x = LINKS + i * vak + (vak - breed) / 2}
            {@const s = stukken(i)}
            <g role="presentation" onpointermove={(e) => beweeg(e, i)} onpointerleave={() => (tip = null)}>
              <rect x={LINKS + i * vak} y={BOVEN} width={vak} height={hoogte} fill="transparent" />
              {#each s.uit as st, k (k)}
                <path d={staaf(x, st.boven, breed, st.h, st.rond)} fill={st.kleur} />
              {/each}
              {#if nuAandeel}
                <line x1={x - 4} x2={x + breed + 4} y1={y(nuAandeel[i]!)} y2={y(nuAandeel[i]!)} class="nu" />
              {/if}
              {#if i === gelabeld && !(toonVerschil && geenVerschil)}
                {#if toonVerschil}
                  {@const omlaag = groepTotaal(i) < 0}
                  <!-- Bij de rechterrand rechts uitlijnen, anders valt het getal van de grafiek af. -->
                  {@const rechts = x + breed / 2 + 36 > B}
                  <text
                    x={rechts ? x + breed : x + breed / 2}
                    y={omlaag ? y(0) + s.min + 14 : y(0) - s.plus - 6}
                    text-anchor={rechts ? "end" : "middle"}
                    class="waarde">{euroVerschil(groepTotaal(i))}</text
                  >
                {:else}
                  <text
                    x={x + breed / 2}
                    y={Math.min(y(0) - s.plus, nuAandeel ? y(nuAandeel[i]!) : Infinity) - 6}
                    text-anchor="middle"
                    class="waarde">{procent(groepAandeel(i), 0)}</text
                  >
                {/if}
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
      {#if toonVerschil}
        <p class="notitie">
          {#if geenVerschil}<strong>In dit scenario verandert er niets in {welkeLagen}.</strong>{/if}
          {#if metOntvangen}
            Uitkeringen en toeslagen: AOW, bijstand, WW en WIA (bruto; de belasting erover staat bij box 1),
            toeslagen, kinderbijslag en basisinkomen.
          {:else}
            Alleen belasting. Zet "Uitkeringen en toeslagen" aan om ook te zien wat huishoudens meer of minder
            krijgen.
          {/if}
        </p>
      {/if}
    {/snippet}
    {#snippet tabel()}
      {#if toonVerschil}
        <table class="data">
          <thead>
            <tr>
              <th>Groep</th>
              {#each lagen as l (l.naam)}<th>
                  {l.ontvangen ? "Minder uitkeringen en toeslagen" : `${l.naam}: meer belasting`} per huishouden
                </th>{/each}
              <th>Samen per huishouden</th>
              <th>Hele groep</th>
            </tr>
          </thead>
          <tbody>
            {#each box1 as _, i (i)}
              <tr>
                <td>{naam(i)}</td>
                {#each lagen as l (l.naam)}<td class="num">{euroVerschil(l.delta[i]!)}</td>{/each}
                <td class="num">{euroVerschil(groepTotaal(i))}</td>
                <td class="num">{miljard(groepDeltaMld(i))}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
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
      {/if}
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
  .verschil {
    color: var(--fg);
    font-weight: 600;
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
  .notitie {
    margin: 6px 0 0;
  }
</style>
