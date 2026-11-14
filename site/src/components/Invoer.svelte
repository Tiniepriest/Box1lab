<script lang="ts">
  import {
    bijstandsnormPerJaar,
    heeftAowLeeftijd,
    persoonInvoerSchema,
    renteUitHypotheek,
    type Invoer,
    type Parameters,
    type PersoonInvoer,
  } from "@box1lab/engine";
  import { untrack } from "svelte";
  import { euro, getal, procent } from "../lib/format.ts";
  import { bewaarInvoer, leesBewaard, voorbeeldInvoer, wisInvoer } from "../lib/opslag.ts";

  /*
   * Het gedeelde invoerformulier (HANDOFF §3.3). Alles blijft in de browser (D-052): zolang het tabblad openstaat
   * onthouden we het op dit apparaat, zodat het meegaat naar andere pagina's en er de volgende keer nog staat
   * (D-077). Wie dat niet wil, zet het uit; dan alleen zolang het tabblad openstaat.
   */
  let { invoer = $bindable(), params }: { invoer: Invoer; params: Parameters } = $props();

  let onthouden = $state(true);
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
    // Terug naar het voorbeeld; dat bewaren we niet, net als bij het begin.
    invoer = voorbeeldInvoer(params);
    begin = JSON.stringify($state.snapshot(invoer));
    onthouden = true;
    melding = "Je gegevens zijn gewist uit deze browser.";
  }
  // Rekenhulp voor de hypotheekrente, als klein venster bij het veld. Schuld en percentage worden niet bewaard,
  // alleen de rente die de bezoeker overneemt.
  let hulpOpen = $state(false);
  let schuld = $state(0);
  let rentePercentage = $state(0);
  let rekenknop = $state<HTMLButtonElement>();
  let rentevak = $state<HTMLElement>();
  const uitgerekend = $derived(
    schuld > 0 && rentePercentage > 0 ? renteUitHypotheek(schuld, rentePercentage) : null,
  );
  function sluitHulp() {
    hulpOpen = false;
    rekenknop?.focus();
  }
  function neemOver() {
    if (uitgerekend !== null) invoer.hypotheekrente = uitgerekend;
    sluitHulp();
  }
  $effect(() => {
    if (!hulpOpen) return;
    document.getElementById("schuld")?.focus();
    // Klikken buiten het venster sluit het.
    const buiten = (e: PointerEvent) => {
      if (rentevak && !rentevak.contains(e.target as Node)) hulpOpen = false;
    };
    window.addEventListener("pointerdown", buiten);
    return () => window.removeEventListener("pointerdown", buiten);
  });

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
    <strong>Privacy:</strong> wat je invult, verlaat je browser niet. We onthouden het op dit apparaat; op een gedeelde
    computer zet je onderaan "Onthoud" uit.
  </p>

  <fieldset>
    <legend>1. Je huishouden</legend>
    <div class="keuze" role="group" aria-label="Woon je alleen of met een partner?">
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
        <!-- Vanaf de AOW-leeftijd rekent de engine de AOW vanzelf mee (D-088). -->
        <p class="notitie">
          Je hebt de AOW-leeftijd ({params.uitkeringen.aowLeeftijd}): we rekenen je AOW mee.
          {#if persoon.soort === "loondienst" || persoon.soort === "zzp"}
            Vul hieronder in wat je daarnaast verdient. Heb je ook pensioen? Kies dan "AOW en pensioen" en tel
            je loon bij het pensioen op.
          {:else if persoon.soort === "bijstand" || persoon.soort === "werknemersverzekering"}
            Bijstand, WW en WIA stoppen bij de AOW-leeftijd; we rekenen alleen met de AOW.
          {:else}
            Heb je ook pensioen? Kies dan "AOW en pensioen".
          {/if}
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
          {partner ? "voor jullie samen" : ""}, met vakantiegeld. Dat is het gemiddelde over {params.jaar}.
          {#if partner}Heeft je partner inkomen, dan gaat dat er netto vanaf.{/if}
          Heb je meer dan {euro(params.bijstand.vermogensgrens[partner ? "gezin" : "alleenstaand"])} aan spaargeld
          en beleggingen{partner
            ? ""
            : " (met kinderen: " + euro(params.bijstand.vermogensgrens.gezin) + ")"}, dan krijg je geen
          bijstand.
        </p>
        <p class="notitie">
          Let op: lagere bedragen onder de {params.bijstand.minimumLeeftijd} jaar, de kostendelersnorm (als je met
          andere volwassenen woont) en bijverdienen zitten er niet in.
        </p>
      {/if}
      {#if persoon.soort === "geen" && !heeftAowLeeftijd(persoon.leeftijd, params)}
        <p class="notitie">
          Heb je geen inkomen en weinig spaargeld? Dan kun je misschien bijstand krijgen. Kies dan "Bijstand".
        </p>
      {/if}
      {#if persoon.soort !== "geen" && persoon.soort !== "bijstand" && !(heeftAowLeeftijd(persoon.leeftijd, params) && persoon.soort === "werknemersverzekering")}
        <div class="rij">
          <label for="bedrag-{i}">
            {persoon.soort === "aow"
              ? "Aanvullend pensioen, bruto"
              : persoon.soort === "zzp"
                ? heeftAowLeeftijd(persoon.leeftijd, params)
                  ? "Winst naast je AOW"
                  : "Winst"
                : persoon.soort === "loondienst" && heeftAowLeeftijd(persoon.leeftijd, params)
                  ? "Bruto loon naast je AOW"
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
        <!-- Geen rekenregel, alleen een vraag: zo'n maandbedrag is bijna altijd een jaarbedrag. -->
        {#if persoon.periode === "maand" && persoon.bedrag > 50000}
          <p class="notitie">Klopt dit? Je vulde {euro(persoon.bedrag)} per maand in.</p>
        {/if}
        {#if persoon.periode === "maand" && persoon.soort !== "aow" && persoon.soort !== "zzp"}
          <div class="vinkjes">
            <label class="vinkje">
              <input
                type="checkbox"
                checked={!persoon.inclusiefVakantiegeld}
                onchange={(e) => (persoon.inclusiefVakantiegeld = !e.currentTarget.checked)}
              />
              Vakantiegeld komt er nog bij (8%)
            </label>
            {#if persoon.soort === "loondienst"}
              <label class="vinkje">
                <input type="checkbox" bind:checked={persoon.dertiendeMaand} />
                13e maand
              </label>
            {/if}
          </div>
        {/if}
        {#if persoon.soort === "loondienst"}
          <div class="rij">
            <label for="extra-{i}">Bonus per jaar</label>
            <input id="extra-{i}" type="number" min="0" step="100" bind:value={persoon.extraPerJaar} />
          </div>
          <div class="rij">
            <label for="premie-{i}">Eigen pensioenpremie per maand</label>
            <input
              id="premie-{i}"
              type="number"
              min="0"
              step="10"
              bind:value={persoon.pensioenpremiePerMaand}
            />
          </div>
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
          <p class="notitie">
            De AOW zelf rekenen we volgens de bedragen van de SVB. Vul je pensioen in zoals het op je rekening
            komt, bruto; vakantiegeld tellen we er niet bij.
          </p>
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
    <div class="keuze" role="group" aria-label="Hoe woon je?">
      <button type="button" aria-pressed={invoer.wonen === "huur"} onclick={() => (invoer.wonen = "huur")}
        >Huur</button
      >
      <button type="button" aria-pressed={invoer.wonen === "koop"} onclick={() => (invoer.wonen = "koop")}
        >Koop</button
      >
    </div>
    {#if invoer.wonen === "huur"}
      <div class="rij">
        <label for="huur">Huur per maand, zonder servicekosten (€)</label>
        <input id="huur" type="number" min="0" step="10" bind:value={invoer.huurPerMaand} />
      </div>
      <p class="notitie">
        Kale huur: zonder servicekosten, gas, water en licht. Staat in je huurcontract. Woon je in,
        bijvoorbeeld bij je ouders? Vul dan 0 in.
      </p>
      {#if invoer.huurPerMaand > 0}
        <label class="vinkje">
          <input type="checkbox" bind:checked={invoer.zelfstandigeWoning} />
          Ik huur een hele woning, met een eigen voordeur, keuken en toilet (geen kamer)
        </label>
      {/if}
    {:else if invoer.wonen === "koop"}
      <div class="rij">
        <label for="woz">WOZ-waarde (€)</label>
        <input id="woz" type="number" min="0" step="5000" bind:value={invoer.woz} />
      </div>
      <p class="notitie">
        Staat op de aanslag van de gemeentelijke belastingen, of zoek je huis op in het
        <a href="https://www.wozwaardeloket.nl/">WOZ-waardeloket</a>.
      </p>
      <div class="rentevak" bind:this={rentevak}>
        <div class="rij">
          <label for="rente">Hypotheekrente per maand, zonder aflossing (€)</label>
          <div class="metknop">
            <!-- Het formulier vraagt per maand, de berekening rekent per jaar. -->
            <input
              id="rente"
              type="number"
              min="0"
              step="10"
              value={Math.round((invoer.hypotheekrente / 12) * 100) / 100}
              oninput={(e) => (invoer.hypotheekrente = leesGetal(e) * 12)}
            />
            <button
              type="button"
              class="rekenknop"
              bind:this={rekenknop}
              aria-label="Rente uitrekenen"
              title="Rente uitrekenen"
              aria-expanded={hulpOpen}
              aria-controls="rekenhulp"
              onclick={() => (hulpOpen = !hulpOpen)}
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <rect
                  x="4"
                  y="2"
                  width="12"
                  height="16"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                />
                <rect x="6.5" y="4.5" width="7" height="3" rx="0.5" fill="currentColor" />
                <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
                <circle cx="10" cy="10.5" r="1" fill="currentColor" />
                <circle cx="12.5" cy="10.5" r="1" fill="currentColor" />
                <circle cx="7.5" cy="14" r="1" fill="currentColor" />
                <circle cx="10" cy="14" r="1" fill="currentColor" />
                <circle cx="12.5" cy="14" r="1" fill="currentColor" />
              </svg>
            </button>
          </div>
        </div>
        {#if hulpOpen}
          <div
            id="rekenhulp"
            class="rekenhulp"
            role="dialog"
            aria-labelledby="titel-rekenhulp"
            tabindex="-1"
            onkeydown={(e) => e.key === "Escape" && sluitHulp()}
          >
            <div class="hulpkop">
              <strong id="titel-rekenhulp">Rente uitrekenen</strong>
              <button type="button" class="sluit" aria-label="Sluiten" onclick={sluitHulp}>×</button>
            </div>
            <p class="notitie">
              Wat je elke maand aan de bank betaalt, is rente plus aflossing. In de app van je bank staat vaak
              hoeveel daarvan rente is. Weet je dat niet, vul dan in hoeveel hypotheek je nog hebt en wat je
              rente is.
            </p>
            <label class="veld"
              >Hypotheek die je nog hebt (€)
              <input
                id="schuld"
                type="number"
                min="0"
                step="5000"
                value={schuld}
                oninput={(e) => (schuld = leesGetal(e))}
              />
            </label>
            <label class="veld"
              >Rente (%)
              <input
                id="rentepercentage"
                type="number"
                min="0"
                step="0.01"
                value={rentePercentage}
                oninput={(e) => (rentePercentage = leesGetal(e))}
              />
            </label>
            <button type="button" class="primair" disabled={uitgerekend === null} onclick={neemOver}>
              {uitgerekend === null ? "Vul beide in" : `Gebruik ${euro(uitgerekend / 12)} per maand`}
            </button>
            <p class="notitie">
              Meer leningdelen met een andere rente? Reken per deel uit en tel op. Of neem de betaalde rente
              over vorig jaar van de jaaropgave van je bank, gedeeld door 12.
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </fieldset>

  <fieldset>
    <legend>5. Vermogen</legend>
    <div class="rij">
      <label for="vermogen">Spaargeld (€)</label>
      <input
        id="vermogen"
        type="number"
        min="0"
        step="1000"
        value={invoer.vermogen}
        oninput={(e) => (invoer.vermogen = leesGetal(e))}
      />
    </div>
    <div class="rij">
      <label for="beleggingen">Beleggingen en 2e woning (€)</label>
      <input
        id="beleggingen"
        type="number"
        min="0"
        step="1000"
        value={invoer.beleggingen}
        oninput={(e) => (invoer.beleggingen = leesGetal(e))}
      />
    </div>
    <div class="rij">
      <label for="schulden">Schulden, zonder hypotheek (€)</label>
      <input
        id="schulden"
        type="number"
        min="0"
        step="1000"
        value={invoer.schulden}
        oninput={(e) => (invoer.schulden = leesGetal(e))}
      />
    </div>
    <p class="notitie">
      {partner ? "Van jullie samen" : "Van jou"}, op 1 januari. Voor box 3 en de vermogensgrens van toeslagen.
      Een studieschuld telt mee als schuld.
    </p>
  </fieldset>

  <div class="opslaan">
    <label class="vinkje"
      ><input type="checkbox" bind:checked={onthouden} /> Onthoud op dit apparaat, ook als ik het tabblad sluit</label
    >
    <button type="button" class="stil" onclick={wis}>Wis mijn gegevens</button>
    {#if melding}<p class="notitie" role="status">{melding}</p>{/if}
  </div>
</form>

<style>
  .invoer {
    /* Het formulier staat vaak in een smalle kolom: de indeling hangt af van zijn eigen breedte, niet van het scherm. */
    container: invoer / inline-size;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .privacy {
    font-size: 14px;
    color: var(--muted);
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
    font-size: 14px;
  }
  /* Is het formulier smal (een telefoon, of de kolom naast de uitkomst), dan staat de vraag boven het veld. */
  @container invoer (max-width: 460px) {
    .rij {
      grid-template-columns: minmax(0, 1fr);
      gap: 4px;
    }
  }
  .rentevak {
    position: relative;
  }
  .metknop {
    display: flex;
    gap: 6px;
  }
  .metknop input {
    flex: 1 1 80px;
    min-width: 0;
  }
  .rekenknop {
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    padding: 0 8px;
    color: var(--accent);
  }
  .rekenhulp {
    position: absolute;
    z-index: 5;
    top: calc(100% + 6px);
    right: 0;
    width: min(340px, 100%);
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--schaduw);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hulpkop {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sluit {
    border: 0;
    background: none;
    font-size: 20px;
    line-height: 1;
    padding: 2px 6px;
  }
  .veld {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
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
  .vinkjes {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 20px;
  }
  .vinkje {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
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
