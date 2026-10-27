<script lang="ts">
  import { berekenHuishouden, eigenWoningSaldo, maakHuishouden, type Parameters } from "@box1lab/engine";
  import { euro } from "../../lib/format.ts";

  /* Interactief voorbeeld: forfait, aftrekbare rente, Wet Hillen en het belastingvoordeel van een eigen woning. */
  let { params }: { params: Parameters } = $props();

  let woz = $state(400000);
  let rente = $state(8000);
  let bruto = $state(60000);

  const saldo = $derived(eigenWoningSaldo(rente, woz, params));
  const r = $derived(
    berekenHuishouden(
      maakHuishouden(
        {
          inkomen1: bruto,
          soort1: "werk",
          soort2: null,
          inkomen2: 0,
          kinderLeeftijden: [],
          huurPerMaand: 0,
          hypotheekrente: rente,
          woz,
          kinderopvangKosten: 0,
        },
        params,
      ),
      params,
    ),
  );
</script>

<div class="mini kaart">
  <label for="mini-woz">WOZ-waarde: <strong class="num">{euro(woz)}</strong></label>
  <input id="mini-woz" type="range" min="100000" max="1500000" step="10000" bind:value={woz} />
  <label for="mini-rente">Hypotheekrente per jaar: <strong class="num">{euro(rente)}</strong></label>
  <input id="mini-rente" type="range" min="0" max="30000" step="250" bind:value={rente} />
  <label for="mini-ew-bruto">Bruto inkomen per jaar: <strong class="num">{euro(bruto)}</strong></label>
  <input id="mini-ew-bruto" type="range" min="20000" max="200000" step="1000" bind:value={bruto} />
  <table class="data">
    <tbody>
      <tr><td>Eigenwoningforfait (bijtelling)</td><td class="num">+{euro(saldo.forfait)}</td></tr>
      <tr><td>Aftrekbare hypotheekrente</td><td class="num">−{euro(saldo.aftrekbareRente)}</td></tr>
      <tr><td>Aftrek Wet Hillen</td><td class="num">−{euro(saldo.hillenAftrek)}</td></tr>
      <tr
        ><td><strong>Saldo eigen woning</strong></td><td class="num"><strong>{euro(saldo.saldo)}</strong></td
        ></tr
      >
      <tr
        ><td><strong>Je betaalt hierdoor minder belasting</strong></td><td class="num"
          ><strong>{euro(r.eigenWoning)}</strong></td
        ></tr
      >
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
  input[type="range"] {
    width: 100%;
  }
  td {
    white-space: normal !important;
  }
</style>
