<script lang="ts">
  import { heeftAowLeeftijd, type Invoer, type Parameters, type PersoonInvoer } from "@box1lab/engine";
  import { euro } from "../lib/format.ts";
  import { bewaarInvoer, leesInvoer, wisInvoer } from "../lib/opslag.ts";

  /*
   * Het gedeelde invoerformulier (HANDOFF §3.3). Alles blijft in de browser. Onthouden kan alleen als de bezoeker
   * dat aanzet, en is altijd te wissen. "Weet ik niet" gebruikt een mediaan uit de modelpopulatie.
   */
  let {
    invoer = $bindable(),
    params,
    standaarden,
  }: {
    invoer: Invoer;
    params: Parameters;
    /** Medianen uit de populatie voor "weet ik niet"; null zolang de populatie laadt. */
    standaarden: { huur: number; woz: number; rente: number } | null;
  } = $props();

  let onthouden = $state(false);
  let weetNiet = $state({ huur: false, woz: false, rente: false });
  let melding = $state("");

  $effect(() => {
    const opgeslagen = leesInvoer();
    if (opgeslagen) {
      invoer = opgeslagen;
      onthouden = true;
    }
  });

  $effect(() => {
    const kopie = $state.snapshot(invoer) as Invoer;
    if (onthouden) bewaarInvoer(kopie);
  });

  $effect(() => {
    if (!standaarden) return;
    if (weetNiet.huur) invoer.huurPerMaand = standaarden.huur;
    if (weetNiet.woz) invoer.woz = standaarden.woz;
    if (weetNiet.rente) invoer.hypotheekrente = standaarden.rente;
  });

  const partner = $derived(invoer.personen.length === 2);

  function nieuwePersoon(): PersoonInvoer {
    return { leeftijd: 35, soort: "loondienst", bedrag: 0, periode: "maand", inclusiefVakantiegeld: false };
  }
  function zetPartner(aan: boolean) {
    invoer.personen = aan ? [invoer.personen[0]!, nieuwePersoon()] : [invoer.personen[0]!];
  }
  function kindErbij() {
    invoer.kinderen = [
      ...invoer.kinderen,
      { leeftijd: 4, inkomen: 0, opvang: "geen", urenPerMaand: 0, uurprijs: 0 },
    ];
  }
  function kindWeg(i: number) {
    invoer.kinderen = invoer.kinderen.filter((_, j) => j !== i);
  }
  function opvangGekozen(i: number) {
    const k = invoer.kinderen[i]!;
    if (k.opvang !== "geen" && k.uurprijs === 0) {
      k.uurprijs = params.toeslagen.kinderopvangtoeslag.maxUurprijs[k.opvang];
      if (k.urenPerMaand === 0) k.urenPerMaand = k.opvang === "dagopvang" ? 80 : 40;
    }
  }
  function wis() {
    wisInvoer();
    onthouden = false;
    melding = "Je gegevens zijn gewist uit deze browser.";
  }
  function getal(e: Event): number {
    const v = Number((e.currentTarget as HTMLInputElement).value);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }

  const SOORTEN: { waarde: PersoonInvoer["soort"]; label: string }[] = [
    { waarde: "loondienst", label: "Werk in loondienst" },
    { waarde: "zzp", label: "Zelfstandig (zzp)" },
    { waarde: "bijstand", label: "Bijstand" },
    { waarde: "werknemersverzekering", label: "WW of WIA" },
    { waarde: "aow", label: "AOW en pensioen" },
    { waarde: "geen", label: "Geen inkomen" },
  ];
</script>

<form class="invoer" onsubmit={(e) => e.preventDefault()} aria-label="Jouw situatie">
  <p class="privacy">
    <strong>Privacy:</strong> wat je invult blijft in je eigen browser. Er gaat niets naar een server.
  </p>

  <fieldset>
    <legend>1. Je huishouden</legend>
    <div class="keuze" role="radiogroup" aria-label="Woon je alleen of met een partner?">
      <button type="button" aria-pressed={!partner} onclick={() => zetPartner(false)}>Alleen</button>
      <button type="button" aria-pressed={partner} onclick={() => zetPartner(true)}>Met partner</button>
    </div>
  </fieldset>

  {#each invoer.personen as persoon, i (i)}
    <fieldset>
      <legend>{i === 0 ? (partner ? "2. Jij" : "2. Jouw inkomen") : "Je partner"}</legend>
      <div class="rij">
        <label for="leeftijd-{i}">Leeftijd</label>
        <input id="leeftijd-{i}" type="number" min="15" max="110" bind:value={persoon.leeftijd} />
      </div>
      {#if heeftAowLeeftijd(persoon.leeftijd, params) && persoon.soort !== "aow"}
        <p class="notitie">
          Je hebt de AOW-leeftijd ({params.uitkeringen.aowLeeftijd}). Kies "AOW en pensioen".
        </p>
      {/if}
      <div class="rij">
        <label for="soort-{i}">Soort inkomen</label>
        <select id="soort-{i}" bind:value={persoon.soort}>
          {#each SOORTEN as s (s.waarde)}<option value={s.waarde}>{s.label}</option>{/each}
        </select>
      </div>
      {#if persoon.soort === "zzp"}
        <p class="notitie">We rekenen je winst als loon. De zelfstandigenaftrek zit nog niet in het model.</p>
      {/if}
      {#if persoon.soort !== "geen"}
        <div class="rij">
          <label for="bedrag-{i}">
            {persoon.soort === "aow" ? "Aanvullend pensioen, bruto" : "Bruto bedrag"}
          </label>
          <div class="bedrag">
            <input id="bedrag-{i}" type="number" min="0" step="50" bind:value={persoon.bedrag} />
            <select bind:value={persoon.periode} aria-label="Per maand of per jaar">
              <option value="maand">per maand</option>
              <option value="jaar">per jaar</option>
            </select>
          </div>
        </div>
        {#if persoon.periode === "maand" && persoon.soort !== "aow"}
          <label class="vinkje">
            <input type="checkbox" bind:checked={persoon.inclusiefVakantiegeld} />
            Vakantiegeld zit al in dit maandbedrag
          </label>
        {/if}
        {#if persoon.soort === "aow"}
          <p class="notitie">De AOW zelf rekenen we volgens de bedragen van de SVB.</p>
        {/if}
      {/if}
    </fieldset>
  {/each}

  <fieldset>
    <legend>3. Kinderen</legend>
    {#each invoer.kinderen as kind, i (i)}
      <div class="kind">
        <div class="rij">
          <label for="kind-{i}">Leeftijd kind {i + 1}</label>
          <div class="bedrag">
            <input id="kind-{i}" type="number" min="0" max="30" bind:value={kind.leeftijd} />
            <button
              type="button"
              class="stil"
              onclick={() => kindWeg(i)}
              aria-label="Kind {i + 1} verwijderen">×</button
            >
          </div>
        </div>
        {#if kind.leeftijd >= params.zorg.volwassenVanaf}
          <div class="rij">
            <label for="kind-inkomen-{i}">Bruto jaarinkomen van dit kind</label>
            <input id="kind-inkomen-{i}" type="number" min="0" step="500" bind:value={kind.inkomen} />
          </div>
        {:else if kind.leeftijd < 13}
          <div class="rij">
            <label for="opvang-{i}">Kinderopvang</label>
            <select id="opvang-{i}" bind:value={kind.opvang} onchange={() => opvangGekozen(i)}>
              <option value="geen">Geen</option>
              <option value="dagopvang">Dagopvang</option>
              <option value="buitenschoolse">Buitenschoolse opvang</option>
              <option value="gastouder">Gastouder</option>
            </select>
          </div>
          {#if kind.opvang !== "geen"}
            <div class="rij twee">
              <label
                >Uren per maand <input
                  type="number"
                  min="0"
                  max="300"
                  bind:value={kind.urenPerMaand}
                /></label
              >
              <label
                >Uurprijs (€) <input type="number" min="0" step="0.01" bind:value={kind.uurprijs} /></label
              >
            </div>
          {/if}
        {/if}
      </div>
    {/each}
    <button type="button" onclick={kindErbij}>+ Kind toevoegen</button>
  </fieldset>

  <fieldset>
    <legend>4. Wonen</legend>
    <div class="keuze" role="radiogroup" aria-label="Hoe woon je?">
      <button type="button" aria-pressed={invoer.wonen === "huur"} onclick={() => (invoer.wonen = "huur")}
        >Huur</button
      >
      <button type="button" aria-pressed={invoer.wonen === "koop"} onclick={() => (invoer.wonen = "koop")}
        >Koop</button
      >
      <button type="button" aria-pressed={invoer.wonen === "anders"} onclick={() => (invoer.wonen = "anders")}
        >Anders</button
      >
    </div>
    {#if invoer.wonen === "huur"}
      <div class="rij">
        <label for="huur">Kale huur per maand (€)</label>
        <input
          id="huur"
          type="number"
          min="0"
          step="10"
          bind:value={invoer.huurPerMaand}
          disabled={weetNiet.huur}
        />
      </div>
      <label class="vinkje"><input type="checkbox" bind:checked={weetNiet.huur} /> Weet ik niet</label>
      {#if weetNiet.huur && standaarden}
        <p class="notitie">
          We gebruiken de middelste huur in het model: {euro(standaarden.huur)} per maand.
        </p>
      {/if}
    {:else if invoer.wonen === "koop"}
      <div class="rij">
        <label for="woz">WOZ-waarde (€)</label>
        <input id="woz" type="number" min="0" step="5000" bind:value={invoer.woz} disabled={weetNiet.woz} />
      </div>
      <label class="vinkje"><input type="checkbox" bind:checked={weetNiet.woz} /> Weet ik niet</label>
      <div class="rij">
        <label for="rente">Betaalde hypotheekrente per jaar (€)</label>
        <input
          id="rente"
          type="number"
          min="0"
          step="100"
          bind:value={invoer.hypotheekrente}
          disabled={weetNiet.rente}
        />
      </div>
      <label class="vinkje"><input type="checkbox" bind:checked={weetNiet.rente} /> Weet ik niet</label>
      {#if (weetNiet.woz || weetNiet.rente) && standaarden}
        <p class="notitie">
          We gebruiken de middelste waarde in het model: WOZ {euro(standaarden.woz)}, rente {euro(
            standaarden.rente,
          )}
          per jaar.
        </p>
      {/if}
    {:else}
      <p class="notitie">
        Bijvoorbeeld inwonend of in een instelling. We rekenen dan zonder woonkosten en huurtoeslag.
      </p>
    {/if}
  </fieldset>

  <fieldset>
    <legend>5. Vermogen</legend>
    <div class="rij">
      <label for="vermogen">Spaargeld en beleggingen (€)</label>
      <input
        id="vermogen"
        type="number"
        min="0"
        step="1000"
        value={invoer.vermogen}
        oninput={(e) => (invoer.vermogen = getal(e))}
      />
    </div>
    <p class="notitie">Nodig voor de vermogensgrens van toeslagen. Box 3 zit nog niet in het model.</p>
  </fieldset>

  <div class="opslaan">
    <label class="vinkje"><input type="checkbox" bind:checked={onthouden} /> Onthoud op dit apparaat</label>
    <button type="button" class="stil" onclick={wis}>Wis mijn gegevens</button>
    {#if melding}<p class="notitie" role="status">{melding}</p>{/if}
  </div>
</form>

<style>
  .invoer {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .privacy {
    font-size: 13px;
    background: var(--accent-soft);
    border-radius: 8px;
    padding: 8px 10px;
    margin: 0;
  }
  fieldset {
    border: 0;
    border-top: 1px solid var(--line);
    padding: 12px 0 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  legend {
    font-weight: 600;
    font-size: 15px;
    padding: 0 0 4px;
  }
  .rij {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(150px, 230px);
    align-items: center;
    gap: 8px;
  }
  .rij.twee {
    grid-template-columns: 1fr 1fr;
  }
  .rij.twee label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 13px;
  }
  .rij input,
  .rij select {
    width: 100%;
    min-width: 0;
  }
  .bedrag {
    display: flex;
    gap: 6px;
  }
  .bedrag input {
    flex: 1 1 80px;
    min-width: 80px;
  }
  .bedrag select {
    flex: 0 0 auto;
    width: auto;
  }
  .keuze {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .vinkje {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 13px;
  }
  .kind {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-bottom: 6px;
    border-bottom: 1px dashed var(--line);
  }
  .notitie {
    margin: 0;
  }
  .opslaan {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    border-top: 1px solid var(--line);
    padding-top: 12px;
  }
</style>
