<script lang="ts">
  import {
    bijstandsnormPerJaar,
    heeftAowLeeftijd,
    persoonInvoerSchema,
    type Invoer,
    type Parameters,
    type PersoonInvoer,
  } from "@box1lab/engine";
  import { untrack } from "svelte";
  import { euro, getal, procent } from "../lib/format.ts";
  import { bewaarInvoer, leesBewaard, wisInvoer } from "../lib/opslag.ts";

  /*
   * Het gedeelde invoerformulier (HANDOFF §3.3). Alles blijft in de browser (D-052): zolang het tabblad openstaat
   * onthouden we het, zodat het meegaat naar andere pagina's; op dit apparaat alleen als de bezoeker dat aanzet.
   */
  let { invoer = $bindable(), params }: { invoer: Invoer; params: Parameters } = $props();

  let onthouden = $state(false);
  let melding = $state("");
  // Het voorbeeld bewaren we pas als de bezoeker iets verandert; anders lijkt het voorbeeld "jouw situatie".
  let begin: string | null = null;
  let bewaren = false;

  $effect(() => {
    const bewaard = leesBewaard();
    if (bewaard) {
      invoer = bewaard.invoer;
      onthouden = bewaard.opApparaat;
      bewaren = true;
    }
    begin = JSON.stringify(untrack(() => $state.snapshot(invoer)));
  });

  $effect(() => {
    const tekst = JSON.stringify($state.snapshot(invoer));
    const opApparaat = onthouden;
    if (begin === null || (!bewaren && tekst === begin)) return;
    bewaren = true;
    bewaarInvoer(JSON.parse(tekst) as Invoer, opApparaat);
  });

  const partner = $derived(invoer.personen.length === 2);

  function nieuwePersoon(): PersoonInvoer {
    return persoonInvoerSchema.parse({
      leeftijd: 35,
      soort: "loondienst",
      bedrag: 0,
      periode: "maand",
      inclusiefVakantiegeld: false,
    });
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
    bewaren = false;
    begin = JSON.stringify($state.snapshot(invoer));
    onthouden = false;
    melding = "Je gegevens zijn gewist uit deze browser.";
  }
  function leesGetal(e: Event): number {
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
    <strong>Privacy:</strong> wat je invult blijft in je eigen browser. Er gaat niets naar een server. Zolang dit
    tabblad openstaat, onthouden we het, zodat je jouw situatie ook in het lab en bij de voorstellen ziet. Sluit
    je het tabblad, dan is het weg.
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
        <p class="notitie">Vul je winst in: je omzet min je kosten, vóór belasting.</p>
      {/if}
      {#if persoon.soort === "bijstand"}
        <p class="notitie">
          De bijstand is een vast bedrag: {euro(bijstandsnormPerJaar(params, partner) / 12)} netto per maand
          {partner ? "voor jullie samen" : ""}, inclusief vakantiegeld (gemiddelde over {params.jaar}).
          {#if partner}Heeft je partner inkomen, dan gaat dat er netto vanaf.{/if}
          Niet in het model: lagere bedragen onder de {params.bijstand.minimumLeeftijd} jaar, de kostendelersnorm
          als je met andere volwassenen woont, en bijverdienen.
        </p>
      {/if}
      {#if persoon.soort !== "geen" && persoon.soort !== "bijstand"}
        <div class="rij">
          <label for="bedrag-{i}">
            {persoon.soort === "aow"
              ? "Aanvullend pensioen, bruto"
              : persoon.soort === "zzp"
                ? "Winst"
                : "Bruto bedrag"}
          </label>
          <div class="bedrag">
            <input id="bedrag-{i}" type="number" min="0" step="50" bind:value={persoon.bedrag} />
            <select bind:value={persoon.periode} aria-label="Per maand of per jaar">
              <option value="maand">per maand</option>
              <option value="jaar">per jaar</option>
            </select>
          </div>
        </div>
        {#if persoon.periode === "maand" && persoon.soort !== "aow" && persoon.soort !== "zzp"}
          <label class="vinkje">
            <input type="checkbox" bind:checked={persoon.inclusiefVakantiegeld} />
            Vakantiegeld zit al in dit maandbedrag
          </label>
        {/if}
        {#if persoon.soort === "loondienst"}
          <div class="rij">
            <label for="extra-{i}">Extra per jaar <span class="hint">13e maand, bonus</span></label>
            <input id="extra-{i}" type="number" min="0" step="100" bind:value={persoon.extraPerJaar} />
          </div>
          <p class="notitie">
            Bruto, zonder vakantiegeld. Bijvoorbeeld een 13e maand, eindejaarsuitkering of bonus. Op je
            loonstrook gaat daar meer belasting van af; dat wordt in je aangifte verrekend. Wij rekenen meteen
            met het hele jaar.
          </p>
        {/if}
        {#if persoon.soort === "loondienst"}
          <div class="rij">
            <label for="premie-{i}"
              >Eigen pensioenpremie per maand <span class="hint">staat op je loonstrook</span></label
            >
            <input
              id="premie-{i}"
              type="number"
              min="0"
              step="10"
              bind:value={persoon.pensioenpremiePerMaand}
            />
          </div>
          <p class="notitie">
            Het deel dat jij zelf betaalt, vaak "pensioenpremie" of "pensioen werknemer" op je loonstrook.
            Bouw je geen pensioen op via je werk? Laat dan 0 staan. De premie gaat van je bruto loon af, vóór
            de belasting.
          </p>
        {/if}
        {#if persoon.soort === "zzp"}
          <label class="vinkje">
            <input type="checkbox" bind:checked={persoon.urencriterium} />
            Ik werk minstens {getal(params.ondernemers.urencriterium)} uur per jaar voor mijn bedrijf
          </label>
          <label class="vinkje">
            <input type="checkbox" bind:checked={persoon.starter} />
            Ik ben starter en mag de startersaftrek gebruiken
          </label>
          <p class="notitie">
            We trekken de zelfstandigenaftrek ({euro(params.ondernemers.zelfstandigenaftrek)}) en de
            mkb-winstvrijstelling ({procent(params.ondernemers.mkbWinstvrijstelling, 1)}) af en rekenen de
            inkomensafhankelijke bijdrage voor de zorgverzekering mee.
          </p>
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
    </div>
    {#if invoer.wonen === "huur"}
      <div class="rij">
        <label for="huur">Kale huur per maand (€)</label>
        <input id="huur" type="number" min="0" step="10" bind:value={invoer.huurPerMaand} />
      </div>
      <p class="notitie">
        Kale huur: zonder servicekosten, gas, water en licht. Staat in je huurcontract. Woon je in,
        bijvoorbeeld bij je ouders? Vul dan 0 in.
      </p>
    {:else if invoer.wonen === "koop"}
      <div class="rij">
        <label for="woz">WOZ-waarde (€)</label>
        <input id="woz" type="number" min="0" step="5000" bind:value={invoer.woz} />
      </div>
      <p class="notitie">
        Staat op de aanslag van de gemeentelijke belastingen, of zoek je huis op in het
        <a href="https://www.wozwaardeloket.nl/">WOZ-waardeloket</a>.
      </p>
      <div class="rij">
        <label for="rente">Betaalde hypotheekrente per jaar (€)</label>
        <input id="rente" type="number" min="0" step="100" bind:value={invoer.hypotheekrente} />
      </div>
      <p class="notitie">Staat op de jaaropgave van je hypotheek.</p>
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
        oninput={(e) => (invoer.vermogen = leesGetal(e))}
      />
    </div>
    <p class="notitie">Nodig voor de vermogensgrens van toeslagen. Box 3 zit nog niet in het model.</p>
  </fieldset>

  <div class="opslaan">
    <label class="vinkje"
      ><input type="checkbox" bind:checked={onthouden} /> Onthoud ook als ik het tabblad sluit (op dit apparaat)</label
    >
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
  .hint {
    display: block;
    color: var(--muted);
    font-size: 13px;
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
