<script lang="ts">
  import {
    aandeelUitVerdeling,
    berekenHuishouden,
    bijstandVermogen,
    bijstandVermogensgrens,
    bijstandVermogenTeHoog,
    heeftAowLeeftijd,
    huishoudenUitInvoer,
    inkomenscurve,
    invoerSchema,
    marginaleDrukVan,
    metInkomen,
    MODEL_VERSIE,
    overVanInkomen,
    pasToe,
    type Invoer,
    type Parameters,
    type Preset,
  } from "@box1lab/engine";
  import { euro, euroVerschil, getal, procent } from "../lib/format.ts";
  import { pad } from "../lib/pad.ts";
  import { SITUATIE_GEWIJZIGD, leesBewaard, voorbeeldInvoer } from "../lib/opslag.ts";
  import Figuur from "./grafieken/Figuur.svelte";
  import Lijnen from "./grafieken/Lijnen.svelte";
  import StavenDivergent from "./grafieken/StavenDivergent.svelte";
  import Waterval from "./grafieken/Waterval.svelte";
  import InvoerFormulier from "./Invoer.svelte";
  import JaarVergelijking from "./JaarVergelijking.svelte";
  import Loonstrook from "./Loonstrook.svelte";
  import WatAls from "./WatAls.svelte";

  let {
    params,
    plekGrenzen,
    presets,
    volgend = null,
    actueel = null,
    begroting = {},
  }: {
    params: Parameters;
    /** Verdeling van het gestandaardiseerd besteedbaar inkomen, gemaakt tijdens de build (zie lib/verdeling.ts). */
    plekGrenzen: number[];
    presets: Preset[];
    /** Parameters van volgend jaar, met de secties die nog geen bron hebben. */
    volgend?: { params: Parameters; nogNiet: string[]; geraamd: string[] } | null;
    /** Wat elk voorstel de overheid per jaar oplevert (+) of kost (−), in miljard euro; berekend tijdens de build. */
    begroting?: Record<string, number>;
    /** Het tabblad met de nieuwste verkiezing of het Belastingplan, voor "Volgende stap" (D-064). */
    actueel?: {
      href: string;
      naam: string;
      soort: "verkiezing" | "akkoord";
      jaar: number;
      aangenomen?: boolean;
    } | null;
  } = $props();

  // Heeft volgend jaar een eigen pagina (zoals het Belastingplan)? Dan staat het overzicht daar en hier alleen de kern.
  const jaarPagina = $derived(!!volgend && actueel?.jaar === volgend.params.jaar);
  // Na de stemming is het niet meer alleen het plan van het kabinet: de Kamer heeft het gewijzigd.
  const welkPlan = $derived(actueel?.aangenomen ? "het aangenomen plan" : "het plan van het kabinet");

  // Wat doen de voorstellen met dit huishouden? De parametersets rekenen we één keer uit.
  const voorstelParams = presets
    .filter((pr) => pr.wijzigingen.length > 0)
    .map((pr) => ({ preset: pr, p: pasToe(params, pr.wijzigingen) }));

  let invoer = $state<Invoer>(voorbeeldInvoer(params));
  // Rekenen we met het voorbeeld of met wat de bezoeker zelf heeft ingevuld (en dus bewaard)?
  let eigen = $state(false);
  $effect(() => {
    const lees = () => (eigen = leesBewaard() !== null);
    lees();
    window.addEventListener(SITUATIE_GEWIJZIGD, lees);
    return () => window.removeEventListener(SITUATIE_GEWIJZIGD, lees);
  });

  // Op een telefoon staat de uitkomst onder het lange formulier: een balk onderaan laat hem zien zolang hij
  // nog onder het scherm ligt.
  let uitkomsten: HTMLElement;
  let balk = $state(false);
  $effect(() => {
    const waarnemer = new IntersectionObserver(([e]) => {
      balk = !e!.isIntersecting && e!.boundingClientRect.top > 0;
    });
    waarnemer.observe(uitkomsten);
    return () => waarnemer.disconnect();
  });

  const geldig = $derived(invoerSchema.safeParse($state.snapshot(invoer)));
  // De laatste geldige invoer: klopt één veld even niet, dan blijft de uitkomst staan (review 3.3).
  let vorige = $state<Invoer | null>(null);
  $effect(() => {
    if (geldig.success) vorige = geldig.data;
  });
  const data = $derived(geldig.success ? geldig.data : vorige);
  const huishouden = $derived(data ? huishoudenUitInvoer(data, params) : null);
  const r = $derived(huishouden ? berekenHuishouden(huishouden, params) : null);
  const marginaal = $derived(huishouden ? marginaleDrukVan(huishouden, params, 0, 100) : 0);

  const stappen = $derived.by(() => {
    if (!r) return [];
    const s: { label: string; bedrag: number; soort: "totaal" | "plus" | "min" }[] = [
      { label: "Bruto inkomen", bedrag: r.bruto, soort: "totaal" },
    ];
    if (r.pensioenpremie > 0) s.push({ label: "Pensioenpremie", bedrag: r.pensioenpremie, soort: "min" });
    if (Math.round(r.belasting) > 0)
      s.push({ label: "Belasting en premies", bedrag: r.belasting, soort: "min" });
    if (r.zvw > 0) s.push({ label: "Bijdrage zorgverzekering", bedrag: r.zvw, soort: "min" });
    if (r.zorgtoeslag > 0) s.push({ label: "Zorgtoeslag", bedrag: r.zorgtoeslag, soort: "plus" });
    if (r.huurtoeslag > 0) s.push({ label: "Huurtoeslag", bedrag: r.huurtoeslag, soort: "plus" });
    if (r.kgb > 0) s.push({ label: "Kindgebonden budget", bedrag: r.kgb, soort: "plus" });
    if (r.kot > 0) s.push({ label: "Kinderopvangtoeslag", bedrag: r.kot, soort: "plus" });
    if (r.kinderbijslag > 0) s.push({ label: "Kinderbijslag", bedrag: r.kinderbijslag, soort: "plus" });
    s.push({ label: "Te besteden", bedrag: overVanInkomen(r), soort: "totaal" });
    return s;
  });

  // Bovenaan: wat je overhoudt van je inkomen, zonder box 3 (D-076).
  const over = $derived(r ? overVanInkomen(r) : 0);

  // Boven de zin bovenaan: van bruto naar wat je overhoudt, in één regel die optelt (D-078).
  const opbouw = $derived.by(() => {
    if (!r || !huishouden) return "";
    // "a, b en c"
    const lijst = (x: string[]) => (x.length > 1 ? `${x.slice(0, -1).join(", ")} en ${x.at(-1)}` : x[0]!);
    const belasting = r.belasting + r.zvw;
    const betalen = samen ? "Jullie betalen" : "Je betaalt";
    // Onder de belastingvrije voet: "Je betaalt geen belasting."
    const betaaldZin =
      Math.round(belasting) > 0
        ? `${betalen} ${lijst([`${euro(belasting)} belasting`, ...(r.pensioenpremie > 0 ? [`${euro(r.pensioenpremie)} pensioenpremie`] : [])])} per jaar.`
        : r.pensioenpremie > 0
          ? `${betalen} geen belasting en ${euro(r.pensioenpremie)} pensioenpremie per jaar.`
          : `${betalen} geen belasting.`;
    const gekregen: string[] = [];
    if (r.toeslagen + r.kinderbijslag > 0) {
      const wat =
        r.kinderbijslag > 0
          ? r.toeslagen > 0
            ? "toeslagen en kinderbijslag"
            : "kinderbijslag"
          : "toeslagen";
      gekregen.push(`${euro(r.toeslagen + r.kinderbijslag)} aan ${wat}`);
    }
    if (r.basisinkomen > 0) gekregen.push(`${euro(r.basisinkomen)} basisinkomen`);
    // Alleen bijstand: wat je netto krijgt; de gemeente betaalt de belasting over de bruto bijstand.
    const alleenBijstand = huishouden.leden.every(
      (l) => l.soort === "uitkering" && l.uitkeringSoort === "bijstand",
    );
    const zinnen = alleenBijstand
      ? [
          `${samen ? "Jullie krijgen" : "Je krijgt"} ${euro((r.bruto - r.belasting - r.zvw) / 12)} bijstand per maand. De gemeente betaalt de belasting daarover.`,
        ]
      : [
          `${samen ? "Jullie bruto inkomen is" : "Je bruto inkomen is"} ${euro(r.bruto)} per jaar.`,
          betaaldZin,
        ];
    if (gekregen.length) zinnen.push(`${samen ? "Jullie krijgen" : "Je krijgt"} ${lijst(gekregen)}.`);
    return zinnen.join(" ");
  });

  const positie = $derived(r ? aandeelUitVerdeling(r.besteedbaar / r.equivalentie, plekGrenzen) : null);

  // Bij bijstand zegt een curve over het bruto inkomen weinig: bijverdienen gaat van de uitkering af.
  const curve = $derived.by(() => {
    if (!huishouden || invoer.personen[0]!.soort === "bijstand") return null;
    const nu = huishouden.leden[0]!.inkomen;
    const max = Math.max(120000, Math.ceil((nu * 1.6) / 10000) * 10000);
    const x: number[] = [];
    for (let v = 0; v <= max; v += max / 120) x.push(Math.round(v));
    return { x, ...inkomenscurve((b) => metInkomen(huishouden, 0, b), params, params, x, 100), nu };
  });

  // Hetzelfde huishouden met de regels van volgend jaar, bij hetzelfde bruto inkomen: de kern voor "Volgende stap".
  const volgendJaar = $derived.by(() => {
    if (!volgend || !jaarPagina || !data || !r) return null;
    const r2 = berekenHuishouden(huishoudenUitInvoer(data, volgend.params), volgend.params);
    return r2.besteedbaar - r.besteedbaar;
  });

  const voorstellen = $derived(
    huishouden && r
      ? voorstelParams.map((v) => ({
          preset: v.preset,
          d: berekenHuishouden(huishouden, v.p, params).besteedbaar - r.besteedbaar,
        }))
      : [],
  );

  // Meer dan één volwassene, of kinderen: dan spreken we het huishouden aan met "jullie".
  const samen = $derived(invoer.personen.length > 1 || invoer.kinderen.length > 0);

  /** "kost de overheid € 3,7 mld per jaar" of "levert de overheid € 29,8 mld per jaar op". */
  function overheid(id: string): string | undefined {
    const mld = begroting[id];
    if (mld === undefined) return undefined;
    const bedrag = `€ ${getal(Math.abs(mld), 1)} mld`;
    if (Math.abs(mld) < 0.05) return "kost de overheid bijna niets";
    return mld < 0 ? `kost de overheid ${bedrag} per jaar` : `levert de overheid ${bedrag} per jaar op`;
  }

  // Ongeveer tien punten van de curve voor de tabel.
  const curvePunten = $derived(
    curve ? curve.x.map((_, i) => i).filter((i) => i % 12 === 0 || i === curve.x.length - 1) : [],
  );

  // Wat er niet in de berekening zit; alleen wat voor deze situatie kan uitmaken.
  const nietIn = $derived.by(() => {
    const x = ["box 2 (een eigen bv)", "gemeentelijke regelingen en afronding door de Belastingdienst"];
    if (!data) return x;
    const d = data;
    if (d.vermogen + d.beleggingen > 0)
      x.push("de tegenbewijsregeling in box 3 (als je echte rendement lager was)");
    if (d.personen.some((q) => q.soort === "bijstand"))
      x.push("jongerennormen, de kostendelersnorm en bijverdienen in de bijstand");
    if (d.wonen === "huur" && d.huurPerMaand > 0) x.push("het inkomen van medebewoners bij de huurtoeslag");
    if (d.personen.some((q) => q.soort === "aow" || heeftAowLeeftijd(q.leeftijd, params)))
      x.push("een onvolledige AOW, bijvoorbeeld na jaren in het buitenland");
    x.push("alimentatie, aftrek van giften en zorgkosten, en veranderingen halverwege het jaar");
    return x;
  });

  // Welk veld klopt niet? Met een aanwijzing waar (review 3.3).
  const foutmelding = $derived.by(() => {
    if (geldig.success) return "";
    const pad0 = geldig.error.issues[0]?.path ?? [];
    const wie = pad0[0] === "personen" ? (pad0[1] === 1 ? " van je partner" : "") : "";
    const veld = String(pad0.at(-1) ?? "");
    const namen: Record<string, string> = {
      leeftijd: `Vul de leeftijd${wie} in, tussen 15 en 110 jaar.`,
      bedrag: `Vul het bedrag${wie} in, 0 of meer.`,
      extraPerJaar: "Vul de bonus in, 0 of meer.",
      pensioenpremiePerMaand: "Vul de pensioenpremie in, 0 of meer.",
      huurPerMaand: "Vul de huur in, 0 of meer.",
      woz: "Vul de WOZ-waarde in, 0 of meer.",
      hypotheekrente: "Vul de hypotheekrente in, 0 of meer.",
      vermogen: "Vul je spaargeld in, 0 of meer.",
      beleggingen: "Vul je beleggingen in, 0 of meer.",
      schulden: "Vul je schulden in, 0 of meer.",
      urenPerMaand: "Vul de uren kinderopvang in, 0 of meer.",
      uurprijs: "Vul de uurprijs van de kinderopvang in, 0 of meer.",
      inkomen: "Vul het inkomen van je kind in, 0 of meer.",
    };
    if (pad0[0] === "kinderen" && veld === "leeftijd")
      return "Vul de leeftijd van elk kind in, tussen 0 en 30 jaar.";
    return namen[veld] ?? "Vul alle velden in met een getal (0 mag ook).";
  });

  // Waarom een toeslag of de bijstand er niet (helemaal) is (D-088): een korte uitleg onder het bedrag bovenaan.
  const letOp = $derived.by(() => {
    if (!r || !data) return [];
    const x: string[] = [];
    const ht = params.toeslagen.huurtoeslag;
    const bijstand = data.personen.some(
      (q) => q.soort === "bijstand" && !heeftAowLeeftijd(q.leeftijd, params),
    );
    if (bijstand && bijstandVermogenTeHoog(data, params))
      x.push(
        `Met ${euro(bijstandVermogen(data))} aan spaargeld en beleggingen krijg ${samen ? "jullie" : "je"} geen bijstand: de grens is ${euro(bijstandVermogensgrens(data, params))}. Eerst gebruik ${samen ? "jullie" : "je"} dat geld.`,
      );
    if (r.beperkingen.kinderopvangtoeslag === "werk")
      x.push(
        `Kinderopvangtoeslag krijg je alleen als ${invoer.personen.length > 1 ? "jullie allebei werken" : "je werkt"}. Studie of een traject naar werk telt ook, maar zit niet in deze berekening.`,
      );
    if (r.beperkingen.huurtoeslag === "kamer")
      x.push(
        "Voor een kamer krijg je geen huurtoeslag, alleen voor een woning met eigen voordeur, keuken en toilet.",
      );
    if (r.beperkingen.huurtoeslag === "jongeren")
      x.push(
        `Ben je jonger dan ${ht.jongeren.totLeeftijd} en woon je zonder kinderen? Dan telt voor de huurtoeslag alleen de huur tot ${euro(ht.jongeren.huurgrens)} per maand.`,
      );
    return x;
  });

  const effectief = $derived(
    r && r.bruto > 0 ? ((r.belasting + r.zvw - r.toeslagen - r.kinderbijslag) / r.bruto) * 100 : 0,
  );
</script>

<div class="calculator">
  <section class="kaart formulier" aria-labelledby="titel-invoer">
    <h2 id="titel-invoer">Vul je situatie in</h2>
    {#if !eigen}
      <p class="voorbeeld">
        <strong>Dit is een voorbeeld:</strong> een alleenstaande met een modaal inkomen ({euro(
          params.loon.modaal,
        )}
        bruto per jaar met vakantiegeld) die huurt. Pas het aan naar jouw situatie.
      </p>
    {/if}
    <InvoerFormulier bind:invoer {params} />
  </section>

  <section class="uitkomsten" aria-labelledby="titel-uitkomst" bind:this={uitkomsten}>
    <h2 id="titel-uitkomst" class="visueel-verborgen">Uitkomst</h2>
    {#if !geldig.success}
      <p class="waarschuwing" role="status">
        {foutmelding}{r ? " Hieronder staat nog de uitkomst van wat je eerst invulde." : ""}
      </p>
    {/if}
    {#if r && data}
      <p class="opbouw">{opbouw}</p>
      <!-- Het antwoord als grootste getal op de pagina; alleen deze regel wordt voorgelezen als hij verandert. -->
      <p class="kernzin" aria-live="polite">
        <span class="kern-label"
          >{eigen ? (samen ? "Jullie houden" : "Je houdt") : "In dit voorbeeld houd je"} per maand over om van te
          leven</span
        >
        <strong class="kern-bedrag">{euro(over / 12)}</strong>
        <span class="kern-jaar">{euro(over)} per jaar</span>
      </p>
      {#if letOp.length}
        <ul class="let-op">
          {#each letOp as zin (zin)}<li>{zin}</li>{/each}
        </ul>
      {/if}
      <Loonstrook {params} invoer={data} box3={r.box3} />

      <div class="kerngetallen">
        {#if invoer.personen[0]!.soort === "bijstand"}
          <div class="kerngetal">
            <div class="l">Van € 100 bijverdienen houd je over</div>
            <div class="w">weinig of niets</div>
            <div class="t">wat je verdient, gaat van je bijstand af (soms mag je een deel houden)</div>
          </div>
        {:else}
          <div class="kerngetal">
            <div class="l">Van € 100 extra bruto houd je over</div>
            <div class="w">{euro(100 - marginaal)}</div>
            <div class="t">marginale druk {procent(marginaal, 0)}</div>
          </div>
        {/if}
        <div class="kerngetal">
          <div class="l">Belasting min toeslagen</div>
          <div class="w">{procent(effectief, 0)}</div>
          <div class="t">
            {effectief < 0
              ? `${samen ? "jullie krijgen" : "je krijgt"} meer aan toeslagen dan ${samen ? "jullie" : "je"} aan belasting ${samen ? "betalen" : "betaalt"}`
              : "van je bruto inkomen (effectieve druk)"}
          </div>
        </div>
        <div class="kerngetal">
          <div class="l">Je plek in Nederland (schatting)</div>
          {#if positie !== null}
            <div class="w">ongeveer {getal(positie * 100)}%</div>
            <div class="t">
              van de mensen heeft minder te besteden dan {samen ? "jullie" : "jij"}, volgens een nagebootste
              bevolking
            </div>
          {/if}
        </div>
      </div>

      <section class="volgende" aria-labelledby="titel-volgende">
        <h2 id="titel-volgende">Volgende stap</h2>
        <div class="stappen">
          {#if actueel}
            <a class="kaart stap" href={actueel.href}>
              <strong>{actueel.naam}</strong>
              <span>
                {#if volgendJaar !== null}
                  {#if Math.abs(volgendJaar) < 1}
                    In {actueel.jaar}
                    {samen ? "houden jullie" : "houd je"} volgens {welkPlan} evenveel over.
                  {:else}
                    In {actueel.jaar}
                    {samen ? "houden jullie" : "houd je"} volgens {welkPlan}
                    <strong class={volgendJaar > 0 ? "vooruit" : "achteruit"}
                      >{euro(Math.abs(volgendJaar / 12))}</strong
                    >
                    per maand {volgendJaar > 0 ? "meer" : "minder"} over{volgend?.params.status ===
                    "voorlopig"
                      ? " (voorlopig)"
                      : ""}.
                  {/if}
                  Bij hetzelfde bruto inkomen; prijzen stijgen ook, dus dit is geen koopkrachtcijfer.
                {/if}
                {actueel.soort === "akkoord"
                  ? actueel.aangenomen
                    ? "Waar komt het verschil vandaan?"
                    : "Wat veranderen de routes naar een meerderheid daaraan?"
                  : "Wat doen de plannen van de partijen met jou?"}
              </span>
              <span class="actie">Bekijk {actueel.naam} →</span>
            </a>
          {/if}
          <a class="kaart stap" href={pad("lab")}>
            <strong>Scenariolab</strong>
            <span
              >Verander zelf de regels, of kies een kant-en-klaar voorstel, en zie wat het met jou doet.</span
            >
            <span class="actie">Naar het Scenariolab →</span>
          </a>
        </div>
      </section>

      <div class="kaart">
        <Figuur
          titel="Van bruto naar netto: waar gaat je geld heen?"
          uitleg="Belasting en premies gaan eraf, toeslagen en kinderbijslag komen erbij. Huur, hypotheek, de premie van je zorgverzekering en kosten van kinderopvang moet je nog van het bedrag onderaan betalen."
        >
          {#snippet grafiek()}
            <Waterval {stappen} beschrijving="Waterval van bruto inkomen naar besteedbaar inkomen" />
          {/snippet}
          {#snippet tabel()}
            <table class="data">
              <thead><tr><th>Stap</th><th>Per jaar</th><th>Per maand</th></tr></thead>
              <tbody>
                {#each stappen as s (s.label)}
                  <tr>
                    <td>{s.label}</td>
                    <td class="num"
                      >{s.soort === "min" ? "−" : s.soort === "plus" ? "+" : ""}{euro(s.bedrag)}</td
                    >
                    <td class="num">{euro(s.bedrag / 12)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {/snippet}
        </Figuur>
        {#if r.eigenWoning > 0}
          <p class="notitie">
            De hypotheekrenteaftrek scheelt je {euro(r.eigenWoning / 12)} belasting per maand ({euro(
              r.eigenWoning,
            )} per jaar); dat zit al in de belasting hierboven.
          </p>
        {/if}
      </div>

      <WatAls {params} invoer={data} {samen} />

      {#if curve}
        <div class="kaart">
          <Figuur
            titel="Wat houd je over als je meer of minder verdient?"
            uitleg={invoer.personen.length === 2
              ? "Het bruto inkomen van de eerste persoon verandert; de rest van het huishouden blijft gelijk."
              : "Je bruto inkomen verandert; de rest blijft gelijk."}
          >
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[{ naam: "Wat je overhoudt", waarden: curve.over, soort: "scenario" }]}
                markering={{ x: curve.nu, label: "jij" }}
                beschrijving={`Wat je per jaar overhoudt bij verschillende bruto inkomens. Bij jouw inkomen: ${euro(over)} per jaar.`}
              />
            {/snippet}
            {#snippet tabel()}
              <table class="data">
                <thead><tr><th>Bruto per jaar</th><th>Wat je overhoudt</th><th>Marginale druk</th></tr></thead
                >
                <tbody>
                  {#each curvePunten as i (i)}
                    <tr>
                      <td class="num">{euro(curve.x[i]!)}</td>
                      <td class="num">{euro(curve.over[i]!)}</td>
                      <td class="num">{procent(curve.marginaleDruk[i]!, 0)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/snippet}
          </Figuur>
          <Figuur
            titel="Hoeveel gaat er af van elke extra euro?"
            uitleg="De marginale druk: belasting plus toeslagen die je kwijtraakt. Boven de stippellijn houd je minder dan de helft over van elke extra euro. Bij lage inkomens heet dat de armoedeval."
          >
            {#snippet grafiek()}
              <Lijnen
                x={curve.x}
                reeksen={[{ naam: "Marginale druk", waarden: curve.marginaleDruk, soort: "scenario" }]}
                yLabel={(v) => procent(v, 0)}
                yMin={-20}
                yMax={110}
                markering={{ x: curve.nu, label: "jij" }}
                hulplijn={{ y: 50, label: "50%" }}
                beschrijving={`Marginale druk bij verschillende bruto inkomens. Bij jouw inkomen: ${procent(marginaal, 0)}.`}
              />
            {/snippet}
            {#snippet tabel()}
              <table class="data">
                <thead><tr><th>Bruto per jaar</th><th>Marginale druk</th></tr></thead>
                <tbody>
                  {#each curvePunten as i (i)}
                    <tr>
                      <td class="num">{euro(curve.x[i]!)}</td>
                      <td class="num">{procent(curve.marginaleDruk[i]!, 0)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/snippet}
          </Figuur>
        </div>
      {/if}
      {#if volgend && !jaarPagina}
        <JaarVergelijking {params} {volgend} {invoer} />
      {/if}
      {#if voorstellen.length}
        <div class="kaart">
          <Figuur
            titel="Wat doen de voorstellen met {samen ? 'jullie' : 'jou'}?"
            uitleg="Plus: {samen
              ? 'jullie houden'
              : 'je houdt'} per maand meer over als het voorstel zou worden ingevoerd; min: minder. Daarbij staat wat het voorstel de overheid per jaar kost of oplevert; dat geld komt ergens vandaan of gaat ergens naartoe."
          >
            {#snippet grafiek()}
              <StavenDivergent
                rijen={voorstellen.map((v) => ({
                  label: v.preset.naam,
                  sub: overheid(v.preset.id),
                  waarde: v.d / 12,
                  tekst: euroVerschil(v.d / 12),
                  tip: [
                    v.preset.naam,
                    `${euroVerschil(v.d / 12)} per maand`,
                    `${euroVerschil(v.d)} per jaar`,
                    ...(overheid(v.preset.id) ? [overheid(v.preset.id)!] : []),
                  ],
                }))}
                asLabel={(v) => euroVerschil(v)}
                drempel={5}
                labelBreedte={220}
                neutraal
                subAltijd
                beschrijving="Verandering per maand per voorstel voor dit huishouden"
              />
            {/snippet}
            {#snippet tabel()}
              <table class="data">
                <thead
                  ><tr><th>Voorstel</th><th>Per maand</th><th>Per jaar</th><th>Overheid per jaar</th></tr
                  ></thead
                >
                <tbody>
                  {#each voorstellen as v (v.preset.id)}
                    <tr>
                      <td><a href={pad(`voorstellen/${v.preset.id}`)}>{v.preset.naam}</a></td>
                      <td class="num">{euroVerschil(v.d / 12)}</td>
                      <td class="num">{euroVerschil(v.d)}</td>
                      <td>{overheid(v.preset.id) ?? "—"}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/snippet}
          </Figuur>
          <p class="notitie">
            <a href={pad("voorstellen")}>Bekijk alle voorstellen</a> en wat ze voor heel Nederland doen.
          </p>
        </div>
      {/if}
      <div class="notitie niet-in">
        <p>
          Dit is een vereenvoudigde berekening: regels van {params.jaar}, model {MODEL_VERSIE}. Wat zit er
          niet in?
        </p>
        <ul>
          {#each nietIn as zin (zin)}<li>{zin}</li>{/each}
        </ul>
        <p><a href={pad("methodiek")}>Hoe rekenen we?</a></p>
      </div>
    {/if}
  </section>
</div>

{#if balk && r}
  <div class="snelbalk">
    <span
      >{eigen ? (samen ? "Jullie houden" : "Je houdt") : "Voorbeeld:"}
      <strong>{euro(over / 12)}</strong> per maand over</span
    >
    <button type="button" onclick={() => uitkomsten.scrollIntoView({ behavior: "smooth", block: "start" })}
      >Bekijk ↓</button
    >
  </div>
{/if}

<style>
  .volgende h2 {
    font-size: 18px;
    margin: 0 0 8px;
  }
  .stappen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .stap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--fg);
    text-decoration: none;
    font-size: 15px;
    padding: 14px;
  }
  .stap:hover {
    box-shadow:
      0 0 0 1px var(--accent),
      var(--schaduw);
  }
  .stap > strong {
    font-size: 16px;
  }
  .stap span {
    flex: 1;
  }
  .stap .actie {
    flex: 0;
    color: var(--accent);
    font-weight: 600;
  }
  .calculator {
    display: grid;
    grid-template-columns: minmax(0, 380px) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  @media (max-width: 900px) {
    .calculator {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .formulier {
    position: sticky;
    top: 12px;
    max-height: calc(100vh - 24px);
    overflow: auto;
  }
  @media (max-width: 900px) {
    .formulier {
      position: static;
      max-height: none;
    }
  }
  h2 {
    font-size: 20px;
    margin: 0 0 12px;
  }
  .uitkomsten {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }
  .opbouw {
    margin: 0 0 -8px;
    color: var(--muted);
    font-size: 15px;
  }
  .kernzin {
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .kern-label {
    font-size: 16px;
  }
  .kern-bedrag {
    font-family: var(--f-display);
    font-size: 44px;
    line-height: 1.1;
    font-variant-numeric: tabular-nums;
  }
  .kern-jaar {
    color: var(--muted);
    font-size: 15px;
  }
  .kerngetal .w {
    font-size: 26px;
  }
  .niet-in p {
    margin: 0;
  }
  .niet-in ul {
    margin: 4px 0;
    padding-left: 18px;
  }
  .let-op {
    margin: 0;
    padding: 10px 12px 10px 30px;
    background: var(--soft);
    border-radius: var(--radius);
    font-size: 15px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .voorbeeld {
    margin: 0 0 12px;
    font-size: 14px;
    background: var(--soft);
    border-radius: var(--radius);
    padding: 10px 12px;
  }
  .snelbalk {
    display: none;
  }
  @media (max-width: 900px) {
    .snelbalk {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
      background: var(--panel);
      border-top: 1px solid var(--line);
      box-shadow: 0 -4px 12px rgb(0 0 0 / 8%);
      font-size: 15px;
    }
    .snelbalk button {
      flex: 0 0 auto;
    }
  }
  .kaart :global(.figuur + .figuur) {
    margin-top: 18px;
  }
</style>
