<script lang="ts">
  import { berekenHuishouden, maakHuishouden, type Parameters } from "@box1lab/engine";
  import { euro } from "../../lib/format.ts";

  /* Interactief voorbeeld: welke toeslagen krijgt een huishouden bij een inkomen en huur? */
  let { params }: { params: Parameters } = $props();

  let partner = $state(false);
  let kinderen = $state(0);
  let huur = $state(750);
  let bruto = $state(25000);

  const r = $derived(
    berekenHuishouden(
      maakHuishouden(
        {
          inkomen1: bruto,
          soort1: "werk",
          soort2: partner ? "geen" : null,
          inkomen2: 0,
          kinderLeeftijden: Array.from({ length: kinderen }, () => 6),
          huurPerMaand: huur,
          hypotheekrente: 0,
          woz: 0,
          kinderopvangKosten: 0,
        },
        params,
      ),
      params,
    ),
  );
</script>

<div class="mini kaart">
  <div class="rij">
    <label><input type="checkbox" bind:checked={partner} /> Met partner (zonder inkomen)</label>
    <label>
      Kinderen
      <select bind:value={kinderen}>
        <option value={0}>geen</option>
        <option value={1}>1</option>
        <option value={2}>2</option>
        <option value={3}>3</option>
      </select>
    </label>
  </div>
  <label for="mini-toeslag-bruto">Bruto inkomen per jaar: <strong class="num">{euro(bruto)}</strong></label>
  <input id="mini-toeslag-bruto" type="range" min="0" max="80000" step="500" bind:value={bruto} />
  <label for="mini-toeslag-huur">Kale huur per maand: <strong class="num">{euro(huur)}</strong></label>
  <input id="mini-toeslag-huur" type="range" min="0" max="1400" step="10" bind:value={huur} />
  <table class="data">
    <thead><tr><th>Toeslag</th><th>Per maand</th></tr></thead>
    <tbody>
      <tr><td>Zorgtoeslag</td><td class="num">{euro(r.zorgtoeslag / 12)}</td></tr>
      <tr><td>Huurtoeslag</td><td class="num">{euro(r.huurtoeslag / 12)}</td></tr>
      <tr><td>Kindgebonden budget</td><td class="num">{euro(r.kgb / 12)}</td></tr>
      <tr><td><strong>Samen</strong></td><td class="num"><strong>{euro(r.toeslagen / 12)}</strong></td></tr>
    </tbody>
  </table>
</div>

<style>
  .mini {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 18px 0;
  }
  .rij {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    align-items: center;
  }
  input[type="range"] {
    width: 100%;
  }
</style>
