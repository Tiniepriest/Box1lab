<script lang="ts">
  import { berekenHuishouden, maakHuishouden, type EenvoudigeInvoer, type Parameters } from "@box1lab/engine";
  import { euro } from "../../lib/format.ts";

  /*
   * Interactief voorbeeld: verschuif het bruto inkomen en zie wat er van € 100 extra overblijft, en waar de rest
   * heen gaat (belasting of minder toeslag).
   */
  let {
    params,
    invoer,
    start = 30000,
    max = 80000,
  }: { params: Parameters; invoer: EenvoudigeInvoer; start?: number; max?: number } = $props();

  let bruto = $state(start);
  const EXTRA = 100;

  const uitkomst = $derived.by(() => {
    const maak = (x: number) => maakHuishouden({ ...invoer, inkomen1: x }, params);
    const a = berekenHuishouden(maak(bruto), params);
    const b = berekenHuishouden(maak(bruto + EXTRA), params);
    const belasting = b.belasting + b.zvw - a.belasting - a.zvw;
    const toeslag = a.toeslagen - b.toeslagen;
    const over = b.besteedbaar - a.besteedbaar;
    return { a, belasting, toeslag, over };
  });

  const deel = (v: number) => `${Math.max(0, Math.min(100, v))}%`;
</script>

<div class="mini kaart">
  <label for="mini-bruto-{invoer.soort2 ?? 'alleen'}-{invoer.kinderLeeftijden.length}">
    Bruto inkomen per jaar: <strong class="num">{euro(bruto)}</strong>
  </label>
  <input
    id="mini-bruto-{invoer.soort2 ?? 'alleen'}-{invoer.kinderLeeftijden.length}"
    type="range"
    min="0"
    {max}
    step="500"
    bind:value={bruto}
  />
  <p>
    Te besteden: <strong class="num">{euro(uitkomst.a.besteedbaar / 12)}</strong> per maand. Van € 100 extra
    bruto houd je <strong class="num">{euro(uitkomst.over)}</strong> over.
  </p>
  <div
    class="balk"
    role="img"
    aria-label="Verdeling van € 100 extra: {euro(uitkomst.over)} houd je, {euro(
      uitkomst.belasting,
    )} gaat naar belasting, {euro(uitkomst.toeslag)} minder toeslag"
  >
    <span class="over" style:width={deel(uitkomst.over)}></span>
    <span class="belasting" style:width={deel(uitkomst.belasting)}></span>
    <span class="toeslag" style:width={deel(uitkomst.toeslag)}></span>
  </div>
  <ul class="legenda">
    <li><i class="legenda-blok" style="background: var(--gain)"></i>Houd je: {euro(uitkomst.over)}</li>
    <li>
      <i class="legenda-blok" style="background: var(--zero)"></i>Belasting en premies: {euro(
        uitkomst.belasting,
      )}
    </li>
    <li>
      <i class="legenda-blok" style="background: var(--loss)"></i>Minder toeslag: {euro(uitkomst.toeslag)}
    </li>
  </ul>
</div>

<style>
  .mini {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 18px 0;
  }
  input[type="range"] {
    width: 100%;
  }
  p {
    margin: 0;
  }
  .balk {
    display: flex;
    gap: 2px;
    height: 18px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--soft);
  }
  .balk span {
    display: block;
    height: 100%;
  }
  .over {
    background: var(--gain);
  }
  .belasting {
    background: var(--zero);
  }
  .toeslag {
    background: var(--loss);
  }
  .legenda {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-size: 13px;
    color: var(--muted);
  }
</style>
