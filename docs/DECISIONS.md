# Beslissingen

Nieuwste onderaan. Elke beslissing: wat, waarom, en eventueel wat het zou veranderen.

## Fase 0

### D-001 Repository en hosting

- Openbare repo `Tiniepriest/Box1lab` (werktitel, gekozen door de eigenaar). Naam en domein van de site volgen later.
- Hosting op **GitHub Pages** via GitHub Actions: gratis bij een openbare repo, geen extra account. De site staat onder `https://tiniepriest.github.io/Box1lab/`; daarom staat `base: "/Box1lab"` in `site/astro.config.mjs`. Bij een eigen domein gaat die `base` eruit.

### D-002 TypeScript 6.0 in plaats van 7.0

TypeScript 7 (de nieuwe native compiler) is uit, maar `typescript-eslint`, `@astrojs/check` en `svelte-check` ondersteunen hem nog niet (peer-range tot 6.x). Overstappen zodra dat wel zo is.

### D-003 Monorepo met npm-workspaces

`packages/engine` (pure TS-rekenkern) en `site` (Astro). De engine wordt niet apart gebouwd: Vite en Vitest lezen de TypeScript-bron direct (`exports: ./src/index.ts`). Minder bouwstappen, minder dat kan breken.

### D-004 Lettertypen zelf hosten

IBM Plex via `@fontsource` in plaats van Google Fonts. De site belooft privacy; Google Fonts zou bij elk bezoek het IP-adres naar Google sturen.

### D-005 Onderhoudbaarheid als harde eis

Op verzoek van de eigenaar: nieuwe tarieven en regelingen moeten eenvoudig toe te voegen zijn. Uitgewerkt in `CLAUDE.md` (§ Onderhoudbaarheid): geen bedragen in code, één module per regeling, scenario's als diff, schemavalidatie in CI.

### D-006 Commit-identiteit

Commits gebruiken het GitHub no-reply-adres van de eigenaar, zodat het persoonlijke e-mailadres niet in een openbare geschiedenis komt.

## Fase 1

### D-007 Parameters in YAML met één bron per sectie

Alle beleidsgetallen staan in `data/parameters/<jaar>.yaml`. Elke sectie (één regeling) heeft een verplicht veld `bron`; het schema dwingt dat af. Een bron per losse waarde zou het bestand twee keer zo lang en lastiger leesbaar maken, terwijl de waarden binnen een regeling bijna altijd uit dezelfde publicatie komen. Wijkt één waarde af, dan noemt de `bron` dat.

Schrijfwijze, gekozen voor wie zonder programmeerkennis bijwerkt: percentages als percentage (`35.75`), bedragen in euro per jaar tenzij de naam iets anders zegt (`basisbijdragePerMaand`).

### D-008 Heffingskortingen als staffel

Kortingen worden beschreven als een lijst stukken `{ vanaf, bedrag, tarief }`, precies zoals de Belastingdienst ze publiceert ("€ 5.685 − 6,51% × (inkomen − € 45.592)"). Een nieuwe korting of een extra knik in een bestaande korting is dan alleen een YAML-wijziging. Gevolg: op exact een knikpunt kan de waarde een fractie van een euro verschillen van het prototype (dat `<=` gebruikte waar de staffel `>=` gebruikt); de pariteitstests merken daar niets van.

### D-009 Scenario's als lijst wijzigingen

Een preset, partijplan of lab-instelling is een lijst `{ parameter: "pad.naar.waarde", zet | plus | maal }`. Het pad wordt gecontroleerd tegen de parameters en het resultaat opnieuw tegen het schema. Zo gaat een scenario vanzelf mee naar een nieuw parameterjaar, en faalt de validatie meteen als een regeling hernoemd wordt. De knoppen uit het prototype (bijvoorbeeld `ahk: 100`) zijn `niveau`-velden in de parameters geworden.

### D-010 Netto-koppeling: exacte kortsluiting

`gekoppeldBruto` geeft exact het oorspronkelijke bedrag terug als de belasting erop niet verandert, in plaats van een bisectie die op ±1e-7 uitkomt. Daardoor geeft "huidig beleid als scenario" exact nul verschil (eigenschapstest). Geen meetbaar effect op de pariteit.

### D-011 Populatie in fase 1 nog in de browser gegenereerd

De generator is een letterlijke port van het prototype; alle getallen staan in `data/populatie/spec-2026.yaml`. In fase 3 wordt de populatie offline gegenereerd en herwogen naar `data/populatie/2026.json`, zoals HANDOFF §5.2 voorschrijft.

### D-012 Pariteitsbaseline uit het prototype zelf

`scripts/prototype-golden.cjs` draait de ongewijzigde `prototype/engine.js` en schrijft alle uitkomsten (posten, decielen, winnaars, voorbeeldhuishoudens, curves, oplosser) naar `packages/engine/test/golden/prototype-2026.json`. De TS-engine reproduceert die tot op €0,001 mld per post, wat strenger is dan de ±0,1 mld uit de handoff. Alle referentiecijfers uit HANDOFF §2 worden gehaald, inclusief de oplosser (vrijstelling €26.675, tarieven × 0,8146).

### D-013 Leesbare foutmeldingen

Schema-objecten zijn `strict`: een onbekende sleutel is een fout in plaats van stil genegeerd. Meldingen noemen bestand en pad, bijvoorbeeld `data/parameters/2027.yaml: toeslagen.zorgtoeslag.drempelinkomn`.

## Fase 2

### D-014 Officiële bedragen 2026

Alle parameters zijn gecontroleerd tegen officiële bronnen (zie `bron` per sectie in `data/parameters/2026.yaml`). Gewijzigd ten opzichte van het prototype:

| Onderdeel                    | Prototype           | Nu                                       | Bron                                       |
| ---------------------------- | ------------------- | ---------------------------------------- | ------------------------------------------ |
| AOW-tarief eerste schijf     | 17,80%              | 17,85%                                   | Belastingdienst, tarieven 2026             |
| Ouderenkorting, afbouw vanaf | € 45.000            | € 46.002                                 | Belastingdienst, Fiscale Informatie 2026   |
| Alleenstaande-ouderenkorting | ontbrak             | € 540                                    | idem                                       |
| Arbeidskorting AOW'ers       | 0                   | eigen tabel (max € 2.840)                | Belastingdienst, tabel arbeidskorting 2026 |
| Combinatiekorting AOW'ers    | als niet-AOW        | 5,72%, max € 1.514                       | Belastingdienst, Fiscale Informatie 2026   |
| Eigenwoningforfait           | 0,35% van alle WOZ  | tabel + villataks 2,35% boven € 1,35 mln | Belastingdienst, Fiscale Informatie 2026   |
| Wet Hillen                   | ontbrak             | 71,867%                                  | idem                                       |
| AOW (bruto per jaar)         | € 19.800 / € 13.600 | € 21.056 / € 14.467                      | SVB                                        |
| Kinderbijslag                | € 1.400 per kind    | € 1.187–1.696 naar leeftijd              | SVB                                        |
| Nominale zorgpremie          | € 2.000             | € 1.884                                  | Rijksoverheid                              |
| Zvw-bijdrage AOW'ers         | ontbrak             | 4,85% tot € 79.409                       | Belastingdienst, loonheffingen 2026        |

Overgenomen uit het prototype en nu bevestigd: schijven en tarieven, algemene heffingskorting (ook AOW), arbeidskorting, combinatiekorting, maximaal aftrektarief 37,56%.

### D-015 Toeslagen exact volgens de rekenregels van Dienst Toeslagen

De vier toeslagen volgen nu de officiële rekenmethode 2026, getest met alle bruikbare rekenvoorbeelden uit de publicaties "Berekening <toeslag> 2026" van Dienst Toeslagen:

- **Zorgtoeslag**: standaardpremie − normpremie, met harde inkomensgrenzen en vermogenstoets.
- **Huurtoeslag**: de nieuwe lineaire berekening vanaf 2026 (delen A–D, basishuur, kwaliteitskortings- en aftoppingsgrens, inkomensafhankelijke correctie). Niet gemodelleerd: de lagere huurgrens voor jongeren onder 21 en medebewoners.
- **Kindgebonden budget**: bedrag per kind, leeftijdsverhogingen, alleenstaande-ouderkop, afbouw boven het drempelinkomen.
- **Kinderopvangtoeslag**: de volledige tabel 2026 (69 inkomensgroepen, eerste en volgend kind), maximale uurprijzen per opvangsoort en het maximum van 230 uur per maand. De tabel is met een script uit de officiële PDF overgenomen en gecontroleerd op aansluiting.

**Tegenstrijdige bron:** het Handboek Toeslagen noemt voor het kindgebonden budget een afbouw van 7,10%; de rekenpublicatie 2026 gebruikt 7,6% en haar rekenvoorbeelden kloppen alleen met 7,6%. We volgen de rekenpublicatie.

### D-016 Eigen woning in het belastbaar inkomen

Het prototype verrekende de eigen woning als losse correctie tegen het schijftarief. Nu telt het saldo (forfait − rente − Hillen-aftrek) mee in het belastbaar inkomen van de hoogste verdiener, zoals in de wet. Daardoor:

- werken de heffingskortingen op het juiste verzamelinkomen;
- telt de eigen woning mee in het toetsingsinkomen voor de toeslagen (hypotheekrente verhoogt dus de toeslagen);
- geldt de aftrekbeperking: aftrek in een schijf boven 37,56% levert maar 37,56% op.

Gevolg voor het scenario "zonder hypotheekrenteaftrek": de opbrengst daalt van € 9,4 naar € 7,3 mld, vooral omdat de Wet Hillen nu een groot deel van het forfait compenseert zodra de rente niet meer aftrekbaar is, en omdat de aftrekbeperking al in het basispad zit.

### D-017 Netto-koppeling per uitkeringssoort

AOW en bijstand zijn netto gekoppeld, WW en WIA niet (instelbaar in `uitkeringen.nettoKoppeling`). In de populatie is de onderste helft van de uitkeringsinkomens bijstand en de bovenste helft WW/WIA; dat is een aanname tot fase 3.

### D-018 Zvw: alleen de bijdrage van AOW'ers

De inkomensafhankelijke bijdrage Zvw die mensen zelf betalen, is opgenomen voor AOW'ers (4,85% over AOW en pensioen). De werkgeversheffing Zvw (6,10%) en de werknemersverzekeringen vallen **buiten het model**: die betaalt de werkgever of uitkeringsinstantie, en ze veranderen het besteedbaar inkomen van huishoudens niet direct.

### D-019 Bewust niet gemodelleerd

- AOW'ers met inkomen uit werk (de AOW-tabel van de arbeidskorting staat wel in de parameters).
- Woonlandfactoren, de 50%-regel voor niet-verzekerde partners (zorgtoeslag), huurtoeslag voor jongeren en medebewoners, kinderen met eigen inkomen.
- Vermogen: de vermogenstoetsen zitten in de rekenregels, maar de populatie heeft nog geen vermogen (iedereen 0). Het invoerformulier (fase 4) vraagt er wel naar.
- Afronding op hele euro's per maand, zoals Dienst Toeslagen doet: het model rekent onafgerond.

### D-020 Verschillen met de baseline van het prototype

`npm run vergelijk` (huidig stelsel 2026, statisch):

| Post                      | Prototype | Nu    |
| ------------------------- | --------- | ----- |
| IB + premies na HRA (mld) | 166,3     | 165,9 |
| Hypotheekrente (mld)      | 23,7      | 23,7  |
| Zorgtoeslag (mld)         | 5,4       | 5,3   |
| Huurtoeslag (mld)         | 6,2       | 14,3  |
| Kindgebonden budget (mld) | 4,1       | 6,7   |
| Kinderopvangtoeslag (mld) | 6,3       | 6,5   |

| Scenario               | Saldo prototype | Saldo nu | Armoede prototype | Armoede nu | Gini prototype | Gini nu |
| ---------------------- | --------------- | -------- | ----------------- | ---------- | -------------- | ------- |
| huidig                 | 0,0             | 0,0      | 11,3%             | 6,9%       | 0,271          | 0,255   |
| vlaktaks-40            | 30,7            | 30,5     | 23,4%             | 25,5%      | 0,331          | 0,328   |
| drie-schijven-35-40-45 | 20,8            | 20,3     | 22,7%             | 24,0%      | 0,330          | 0,327   |
| zonder-huurtoeslag     | 5,6             | 5,6      | 14,9%             | 14,5%      | 0,282          | 0,277   |
| zonder-hra             | 9,4             | 7,3      | 11,5%             | 7,4%       | 0,265          | 0,251   |
| zonder-hra-en-forfait  | 5,5             | 6,0      | 11,5%             | 7,4%       | 0,268          | 0,252   |

Oplosser vlaktaks: vrijstelling € 26.675 → € 26.257; tarieven × 0,815 → × 0,818.

**Verklaring.** De begrotingseffecten (saldo) blijven dicht bij het prototype, omdat ze per post worden geschaald naar de begrotingstotalen. De verdelingscijfers verschuiven wel, en daar zit één groot probleem:

- **De populatie past niet bij de exacte regels.** Met de echte formules zou de synthetische populatie € 14,3 mld huurtoeslag en € 6,7 mld kindgebonden budget krijgen, tegen € 5,6 en € 3,6 mld in de begroting (schaalfactoren 0,39 en 0,54). Het prototype verborg dit door de formules te "kalibreren" op de totalen. De regels zijn nu goed (ze halen de officiële rekenvoorbeelden); de populatie heeft te veel huurders met een huur en inkomen die recht geven op toeslag, geen niet-gebruik, en mogelijk te veel gezinnen in de afbouwzone. Dit is precies het werk van fase 3 (herwegen naar CBS-marges, waaronder het aantal ontvangers per toeslag).
- **Armoede daalt van 11,3% naar 6,9%.** Vooral bij AOW'ers (hogere AOW volgens de SVB, en de royalere huurtoeslag vanaf 2026) en bij huurders met lage inkomens. Omdat de toeslagen in de populatie te ruim uitvallen (zie hierboven), is dit cijfer te laag; het CBS-armoederisico ligt rond de 13–14%. **Tot fase 3 zijn de verdelingscijfers (armoede, Gini, decielen) niet betrouwbaar.**
- De kalibratiedoelen zelf (zoals € 3,6 mld kindgebonden budget) komen nog uit het prototype en worden in fase 3 gecontroleerd tegen de Miljoenennota 2026.

## Fase 3

### D-021 Populatie: structuur van CBS, inhoud uit aannames, herwogen naar marges

De populatie wordt offline gemaakt door `npm run kalibreer` (scripts/kalibreer.ts) en opgeslagen in `data/populatie/2026.json`; de site laadt alleen dat bestand.

1. **Structuur uit CBS.** Het startpunt zijn de 136 cellen (leeftijd referentiepersoon × samenstelling) uit CBS 71486ned, 1 januari 2026. Elke cel met minstens 1.000 echte huishoudens krijgt synthetische huishoudens naar rato (in totaal 4.024). "Overig huishouden" (48.384, 0,6%) zit er niet in.
2. **Inhoud uit aannames.** Inkomens (lognormaal, leeftijdsprofiel), pensioenen, woning (koop/corporatie/particulier, huur, WOZ, hypotheek), kinderleeftijden en kinderopvang volgen uit `data/populatie/spec-2026.yaml`. Dat zijn bewust aannames; ze hoeven alleen genoeg variatie te geven.
3. **Herweging** met begrensde raking (Deville & Särndal 1992; `scripts/populatie/herweeg.ts`, met unit tests) naar 32 marges tegelijk: huishoudens per samenstelling en leeftijdsgroep (CBS), koop/corporatie (CBS 82900NED), ontvangers en uitgaven per toeslag (Dienst Toeslagen, raming 2026), betaalde hypotheekrente en huurwaarde eigen woning (CBS 84493NED) en de negen decielgrenzen van het besteedbaar huishoudinkomen (CBS 83934NED). Gewichten mogen hoogstens een factor 5 omhoog of omlaag.

Resultaat (zie `docs/kalibratie-2026.md`): geconvergeerd in 5 iteraties; alle marges binnen 0,1%; mediane gewichtsfactor 0,91, 90% tussen 0,32 en 1,94. Schaalfactoren van de toeslagen 1,00 (eis 0,9–1,1); decielgrenzen binnen 0,2% van CBS (eis 5%).

### D-022 Belasting wordt niet geschaald, wel gecontroleerd

Voor box 1 alleen bestaat geen gepubliceerd totaal: de Miljoenennota noemt de loon- en inkomensheffing (€ 155,2 mld) voor alle boxen samen, en de raming voor box 3 schommelt tussen € 8,2 en 11,5 mld. Een schaalfactor op basis van een geschat box 1-totaal zou de scenario's een schijnzekerheid geven. Daarom: **schaalfactor belasting = 1**, en de opbrengst volgt uit de herwogen inkomensverdeling. Ter controle meldt het rapport de modelopbrengst (€ 152,0 mld) naast twee controlegetallen: 95% van wat huishoudens volgens CBS betalen aan belasting op inkomen en premies volksverzekeringen (alle boxen, geïndexeerd), en 105% van box 1 + box 2 volgens de Miljoenennota. Omdat box 2, box 3 en ondernemerswinst niet in het model zitten, is een uitkomst tussen die twee plausibel.

### D-023 Meerderjarige thuiswonende kinderen

CBS telt alle thuiswonende kinderen mee, ook volwassenen. In het model hadden die geen inkomen, waardoor gezinnen met volwassen kinderen arm leken en de herweging extreme gewichten nodig had (armoede 22%). Nu hebben kinderen vanaf 18 jaar (parameter `zorg.volwassenVanaf`) een eigen inkomen (bijbaan of werk, aannames in de spec), betalen ze eigen belasting en nominale premie, krijgen ze eigen zorgtoeslag, en telt hun inkomen mee in het rekeninkomen voor de huurtoeslag (onder 23 jaar boven de vrijstelling van € 6.218, bron: Berekening huurtoeslag 2026). Dienst Toeslagen telt zorgtoeslagontvangers per persoon; het model telt ze nu ook zo.

### D-024 Equivalentieschaal OECD-gemodificeerd

Kinderen vanaf 14 jaar tellen als volwassene (0,5), jongere kinderen als 0,3. Dat is de standaard OECD-gemodificeerde schaal; het prototype telde alle kinderen als 0,3. CBS gebruikt een eigen schaal, dus gestandaardiseerde inkomens zijn niet één op één vergelijkbaar met CBS-cijfers.

### D-025 Hetzelfde inkomensbegrip als CBS bij het kalibreren

CBS telt in het besteedbaar inkomen het voordeel van wonen in een eigen woning mee (huurwaarde, 2024: € 38,3 mld) en trekt de betaalde hypotheekrente af (€ 23,3 mld). Zonder die correctie moesten eigenaren in het model meer loon krijgen om op de CBS-decielgrenzen uit te komen, en betaalden ze te veel belasting (€ 159,8 mld). De kalibratie rekent daarom met: besteedbaar (model) − hypotheekrente + huurwaarde, met de huurwaarde evenredig aan de WOZ-waarde. **Alleen voor de kalibratie**: de uitkomsten op de site gebruiken het gewone besteedbaar inkomen van het model.

### D-026 Kalibratiedoelen vervangen

De doelen uit het prototype bleken deels onjuist. Nu: toeslagen volgens Dienst Toeslagen (raming 2026: zorgtoeslag € 6,3 mld, huurtoeslag € 5,6 mld, kindgebonden budget € 4,7 mld in plaats van 3,6, kinderopvangtoeslag € 5,7 mld in plaats van 6,6); hypotheekrente volgens CBS (€ 23,3 mld, 2024, niet geïndexeerd). Inkomensgrenzen van CBS 2024 zijn naar 2026 geïndexeerd met de cao-loonstijging marktsector (CPB MEV 2027: 5,3% en 4,3%, factor 1,0983).

### D-027 Controle in CI

`npm run kalibreer:controle` maakt de populatie opnieuw en vergelijkt die met het opgeslagen bestand. Verandert iemand de parameters, de doelen of de spec zonder opnieuw te kalibreren, dan faalt CI met de opdracht om `npm run kalibreer` te draaien.

### D-028 Verschillen met fase 2 en het prototype

| Scenario               | Saldo prototype | Saldo fase 2 | Saldo nu | Armoede prototype | Armoede nu | Gini nu |
| ---------------------- | --------------- | ------------ | -------- | ----------------- | ---------- | ------- |
| huidig                 | 0,0             | 0,0          | 0,0      | 11,3%             | 9,9%       | 0,227   |
| vlaktaks-40            | 30,7            | 30,5         | 41,6     | 23,4%             | 20,1%      | 0,274   |
| drie-schijven-35-40-45 | 20,8            | 20,3         | 29,4     | 22,7%             | 19,1%      | 0,274   |
| zonder-huurtoeslag     | 5,6             | 5,6          | 5,6      | 14,9%             | 11,8%      | 0,236   |
| zonder-hra             | 9,4             | 7,3          | 7,9      | 11,5%             | 10,3%      | 0,225   |
| zonder-hra-en-forfait  | 5,5             | 6,0          | 6,9      | 11,5%             | 10,2%      | 0,226   |

- **Vlaktaks en drie schijven leveren meer op** dan in het prototype. De posten verschuiven: belasting box 1 +7,9 (prototype −3,1) omdat de herwogen populatie meer inkomen heeft in de schijf die nu 40% gaat betalen; eigen woning +8,0 (prototype +5,5) door de forfaittabel, aftrekbeperking en de CBS-hypotheekrente; de netto-koppeling kost nu € 0,7 mld (prototype: € 2,2 mld besparing), omdat alleen AOW en bijstand gekoppeld zijn. Omdat de belasting niet meer geschaald wordt, zijn deze bedragen gevoeliger voor de inkomensverdeling bovenin, die niet direct gekalibreerd is (boven P90 volgt de verdeling uit de aannames).
- **Armoede 9,9%** onder het huidige beleid. De Gini van 0,227 is waarschijnlijk te laag: inkomen uit vermogen, aanmerkelijk belang en onderneming zit niet in het model, en dat zit vooral bovenin.

### D-029 Bekende beperkingen van de populatie

- Geen ondernemers, dga's of vermogensinkomen (box 2/3); hun inkomen telt als loon.
- Geen vermogen, dus de vermogenstoetsen van de toeslagen doen in de populatie niets.
- De verdeling boven P90 en de verdeling binnen decielen volgen uit de aannames.
- Niet-gebruik van toeslagen wordt niet apart gemodelleerd; de herweging vangt het grotendeels op via de ontvangersaantallen.

## Fase 4

### D-030 Kleuren winst en verlies gevalideerd

De vijf klassen (verlies groot, verlies, ~0, winst, winst groot) zijn per modus doorgerekend met de dataviz-validator: aangrenzende klassen zijn ook bij rood-groen-kleurenblindheid te onderscheiden (ΔE ≥ 12) en bij normaal zicht (ΔE ≥ 15). Daarvoor zijn de lichte tussentinten en het neutrale midden iets aangepast; de polen blauw `#2a78d6` en oranje `#eb6834` uit de handoff blijven. Tekst in de betekeniskleuren krijgt eigen, donkerdere tokens (`--gain-tekst`, `--loss-tekst`) die voldoen aan WCAG AA (≥ 5,4:1).

Vervangen door D-069 (groen en rood, op verzoek van de eigenaar).

### D-031 Rekenen in een Web Worker

Laden van de populatie, de basis bouwen, scenario's doorrekenen en de oplosser draaien in een Web Worker (`site/src/lib/rekenwerker.ts`), zoals HANDOFF §5.1 voorstelt. Alleen samenvattingen gaan terug naar de pagina. Bij snel schuiven telt alleen het laatste antwoord. Gevolg: blokkeertijd op de labpagina van 370 naar 60 ms; de oplosser (45 doorrekeningen) bevriest de pagina niet meer. De browser valideert het populatiebestand niet opnieuw tegen het schema; dat doen de build en CI al.

### D-032 Grafieken op ware breedte

Eigen SVG-componenten (`site/src/components/grafieken/`) die op de werkelijke breedte van hun container tekenen in plaats van te schalen. Zo blijft tekst op een telefoon even groot als op een groot scherm. Elke grafiek heeft een titel als vraag, een zin uitleg, een legenda, een tooltip en een tabelweergave (HANDOFF §7).

### D-033 Rekenregels voor de site in de engine

Ook wat de site nodig heeft voor invoer zit in de engine, zodat de site geen eigen rekenregels heeft: het invoerformulier en de omzetting naar een huishouden (`invoer.ts`, met vakantiegeld en AOW-leeftijd als parameter), de scenariocode (`scenario/code.ts`), "je plek in Nederland" (`metrics/positie.ts`) en de marginale druk van één persoon. "Weet ik niet" in het formulier gebruikt de mediaan uit de populatie, geen verzonnen bedrag.

### D-034 Labknoppen als data

De knoppen in het scenariolab staan in `data/lab/knoppen.yaml`. Een regeling in het lab zetten is een regel in dat bestand; CI controleert dat elke knop naar een bestaande parameter van het juiste type wijst. De huishoudtypes voor de curves staan in `data/voorbeelden/huishoudens.yaml`.

### D-035 Privacy

Invoer blijft in de browser. Onthouden in `localStorage` alleen als de bezoeker dat aanzet; "Wis mijn gegevens" haalt het weg; zonder `localStorage` werkt alles gewoon. Geen cookies, geen externe lettertypen of scripts.

### D-036 Browsercontrole in CI

`npm run schermafdrukken` start de gebouwde site, opent alle pagina's in Chrome (375 en 1280 px, licht en donker), faalt bij fouten in de console of horizontaal scrollen, controleert of het rekenen werkt (preset, budgetneutraal, calculator) en bewaart schermafdrukken. In CI is dat een aparte job; de schermafdrukken staan als artefact bij elke run.

### D-037 Lighthouse

Gemeten lokaal met Lighthouse 12 (mobiel profiel): alle vijf pagina's 98–100 op prestaties, toegankelijkheid, best practices en SEO.

## Fase 5

### D-038 Voorstellen met eigen pagina en deelafbeelding

Elk voorstel uit `data/presets/` krijgt een kaart op `/voorstellen` en een eigen pagina (`/voorstellen/<id>`) met kerncijfers, een tabel per inkomensgroep en een knop naar het lab. De cijfers worden tijdens de build uitgerekend op de volledige populatie, dus zonder JavaScript in de browser. Een preset kan een `uitleg` hebben. Toegevoegd: toeslagen afschaffen, hypotheekrenteaftrek naar 30%, algemene heffingskorting + € 500. Het voorstel "basisinkomen" uit de handoff zit er niet in: daarvoor is een nieuwe regeling nodig (een uitkering voor iedereen), die past bij `docs/NIEUWE-REGELING.md`.

### D-039 Deelafbeeldingen tijdens de build

Per voorstel en één algemene: 1200 × 630, gemaakt met Satori (opmaak naar SVG) en resvg (SVG naar PNG), in IBM Plex uit `@fontsource`. Geen externe dienst. Gedeelde scenariolinks uit het lab krijgen de algemene afbeelding, want er is geen server (HANDOFF §6). `npm audit` meldt een matig lek in `fflate` (via Satori: oneindige lus bij kapotte ZIP-bestanden). Satori draait alleen tijdens de build op onze eigen lettertypen en komt niet in de browser; niet uitbuitbaar, dus geaccepteerd.

### D-040 Uitleg als MDX met rekenende voorbeelden

Vijf artikelen in `site/src/content/uitleg/` (armoedeval, marginale druk, toeslagen, hypotheekrenteaftrek, decielen). Bedragen in de tekst komen rechtstreeks uit het parameterbestand, zodat de artikelen na een jaarlijkse update kloppen. Elk artikel heeft een klein interactief voorbeeld dat met de engine rekent. MDX-bestanden staan in `.prettierignore`, omdat Prettier uitdrukkingen in MDX kapotmaakte (`*` werd `\*`).

### D-041 Vergelijken

In het lab kun je je scenario naast een voorstel zetten: kerncijfers en verandering per inkomensgroep in één tabel.

## Fase 6

### D-042 Partij = lijst maatregelen op het basispad

Elke partij is één YAML-bestand in `data/verkiezingen/<verkiezing>/`, met per maatregel een parameterwijziging (`plus`, `factor` of `zet`), een bron met verplicht paginanummer en een zekerheid (`hoog`, `middel`, `laag`). Zo is een partijprogramma hetzelfde als een preset: een diff op een parameterset, die bij een nieuw parameterjaar vanzelf meegaat. Raakt één belofte meerdere parameters (bijvoorbeeld beide knikken van de algemene heffingskorting), dan staat dat onder `wijzigingen` in één maatregel, zodat de site het als één belofte toont. Schema en controles in `packages/engine/src/verkiezing.ts`; de werkwijze in `docs/METHODIEK-VERKIEZINGEN.md`.

### D-043 Controles in CI en vier-ogen-principe

`npm run valideer` controleert elk partijbestand, ook concepten: bestaan alle parameters, verwijst elke bron naar een bekend document, heeft elke maatregel met zekerheid `middel` of `laag` een toelichting, levert het programma een geldige parameterset op. `status: gepubliceerd` zonder `gecontroleerd_door` laat de build falen. De site toont alleen gepubliceerde partijen; `PUBLIC_VERKIEZINGEN_PREVIEW=1 npm run build` maakt een previewbuild met concepten, gemarkeerd als concept.

### D-044 Effect per maatregel stapelend

Het effect per maatregel op een huishouden wordt berekend door de maatregelen in volgorde van het bestand op te stapelen: het effect van maatregel n is het verschil tussen "maatregel 1 t/m n" en "1 t/m n−1". Zo tellen de effecten precies op tot het totaal (getest). Nadeel: bij maatregelen die op elkaar inwerken hangt de toerekening af van de volgorde. Dat staat in de methodiek; een volgorde-onafhankelijke toerekening (Shapley) kan later, maar kost veel meer rekenwerk.

### D-045 Basispad voorlopig 2026

HANDOFF §4.3 vraagt het vastgestelde beleid voor het eerste kabinetsjaar. Dat parameterbestand bestaat nog niet; de voorbeeldverkiezing rekent daarom op 2026 en de site zegt dat erbij (`basispad.toelichting`).

### D-046 Alleen fictieve partijen

Echte partijdata pas na akkoord van de eigenaar (HANDOFF §10). De voorbeeldverkiezing heeft drie verzonnen partijen (A en B gepubliceerd, C concept) met bronnen op example.org. De pagina `/verkiezingen/voorbeeld` heeft een duidelijke waarschuwing, staat niet in het menu of op de home en heeft `noindex`. Weergave volgens HANDOFF §4.1: alfabetisch met sorteerknop op uitkomst, winst blauw en verlies oranje, geen partijkleuren of logo's, disclaimer dat het CPB leidend is.

## Fase 7

### D-047 Changelog als data

De publieke lijst van wijzigingen staat in `data/changelog.yaml` (nieuwste bovenaan, met soort `nieuw`, `cijfers`, `model` of `correctie`) en verschijnt op `/wijzigingen`. `npm run valideer` controleert het schema, de volgorde en dat de hoogste `modelversie` gelijk is aan `MODEL_VERSIE` (nu in `packages/engine/src/versie.ts`). Onderaan elke pagina staat "bijgewerkt" met de datum van de nieuwste regel, niet de builddatum: die verandert ook bij een tikfout of een update van een afhankelijkheid. De regels voor de fasen 1 t/m 7 zijn achteraf toegevoegd met de datums van de commits. Fase 3 (bevolking) veranderde de uitkomsten maar niet de rekenregels, en dus niet de modelversie.

### D-048 Meld een fout via een GitHub-formulier

"Meld een fout" opent het formulier `.github/ISSUE_TEMPLATE/fout.yml`, met pagina en versie al ingevuld. In de browser zet een klein script bij aanraken de huidige link in het veld "pagina"; in het lab zit het scenario daar al in. Calculatorinvoer staat nooit in de link en gaat dus niet mee (privacy-eis). Het formulier zegt dat de melding openbaar is. Melden kan alleen met een GitHub-account; een e-mailadres of formulier zonder account vraagt een externe dienst en een keuze van de eigenaar. De link staat onderaan elke pagina en onder de calculator, het lab, elk voorstel en de verkiezingspagina.

### D-049 Geen analytics; advertenties misschien later

Besluit van de eigenaar: nu geen analytics. Later misschien advertenties. Daarvoor eerst beslissen: advertentienetwerken plaatsen meestal cookies of volgen bezoekers. Dat vraagt een toestemmingsbanner (AVG, Telecommunicatiewet) en botst met de belofte op de pagina Over ("geen cookies, geen scripts van andere partijen"). Ook kunnen advertenties naast verkiezingscontent afbreuk doen aan de neutraliteit. Een contextuele advertentie zonder tracking of een sponsorvermelding past beter. Er is nu niets ingebouwd.

### D-050 Geen licentie

Besluit van de eigenaar: voorlopig geen licentie. De code is openbaar te bekijken, maar alle rechten zijn voorbehouden. Dat staat in de README.

### D-051 GitHub Pages, geen eigen domein

Besluit van de eigenaar. Overstappen naar een eigen domein later: in `site/astro.config.mjs` `site` aanpassen en `base` weghalen, een `CNAME`-bestand in `site/public/`, en de DNS bij de domeinregistrar. Alle interne links gaan via `pad()` en de repolink via `site/src/lib/project.ts`, dus verder hoeft er niets te veranderen.

## Fase 8a: formulier en privacy (verbeterlijst van de eigenaar)

### D-052 Situatie onthouden zolang het tabblad openstaat

Besluit van de eigenaar (punt 7b). Wat je invult, bewaren we in `sessionStorage`: alleen in deze browser, alleen voor dit tabblad, weg als je het sluit. Zo gaat je situatie mee naar het lab, de voorstellen en de verkiezingen. Langer bewaren (`localStorage`) blijft alleen op verzoek ("Onthoud ook als ik het tabblad sluit"). "Wis mijn gegevens" haalt beide weg. Het voorbeeld waarmee het formulier start, bewaren we pas als je iets verandert; anders zou het voorbeeld als "jouw situatie" in het lab verschijnen. De privacytekst bij het formulier en op de pagina Over is herschreven. Dit wijkt af van HANDOFF §3.3 ("optioneel lokaal onthouden"): er gaat nog steeds niets naar een server, en sessieopslag is functioneel en op verzoek van de bezoeker, dus geen toestemmingsbanner nodig.

### D-053 Formulier eenvoudiger

- "Weet ik niet" is weg. Het vulde een mediaan uit de modelbevolking in, en daar had niemand iets aan. Nu staat bij elk veld waar je het bedrag vindt (huurcontract, gemeentelijke aanslag of WOZ-waardeloket, jaaropgave hypotheek).
- "Anders" bij wonen is weg: het rekende precies hetzelfde als huur met € 0. Oude bewaarde invoer met "anders" wordt bij het lezen omgezet naar huur € 0.
- Nieuw veld bij loondienst: "Extra per jaar" (13e maand, eindejaarsuitkering, bonus), opgeteld bij het jaarinkomen. Het bijzonder tarief op de loonstrook speelt geen rol, want het model rekent met het hele jaar, zoals de aangifte.
- Een zzp'er krijgt geen vakantiegeld bijgeteld, en vult zijn winst in.

### D-054 Overige aftrekposten met bron

De vaste € 4 mld uit het prototype (TODO: bron nodig) is vervangen door het budgettair belang per regeling uit de Miljoenennota 2027, tabel 4.3.2, kolom 2026: persoonsgebonden aftrek 0,804, lijfrentepremieaftrek 1,378, premieaftrek arbeidsongeschiktheidsverzekering 0,626, zelfstandigenaftrek 0,306, startersaftrek 0,117, meewerkaftrek 0,007 en mkb-winstvrijstelling 2,730; samen € 5,968 mld. In het parameterbestand staat nu per post een bedrag (`posten`), zodat de jaarlijkse update gewoon de nieuwe tabel overneemt. De ondernemersfaciliteiten staan hier omdat de modelbevolking geen aparte zelfstandigen heeft.

Golden-verschil: alleen de voorstellen die de overige aftrekposten afschaffen veranderen. Vlaktaks 40%: saldo € 41,62 → € 43,59 mld; drie schijven: € 29,35 → € 31,32 mld (beide + € 1,968 mld, precies het verschil). De oplosser voor de budgetneutrale vlaktaks geeft daardoor een vrijstelling van € 28.322 in plaats van € 27.796 en tariefsfactor 0,7368 in plaats van 0,7487.

### D-055 Sitemap

`@astrojs/sitemap` maakt `sitemap-index.xml` tijdens de build, zonder verkiezingen met fictieve partijen. Een `robots.txt` heeft geen zin: zoekmachines lezen die alleen op de hoofdmap van het domein (`tiniepriest.github.io/robots.txt`), en die valt buiten deze repo. Om Google de sitemap te laten gebruiken, kan de eigenaar hem gratis aanmelden in Google Search Console.

## Fase 8b: bijstand, zzp en pensioen (verbeterlijst punten 1, 6 en 8)

### D-056 Bijstand volgt uit de norm

Je vult bij bijstand geen bedrag meer in. Het model neemt de netto norm per maand inclusief vakantiegeld (Rijksoverheid, 1 januari en 1 juli 2026) en rekent terug naar het bruto bedrag waarover de gemeente loonheffing inhoudt (`brutoVoorNetto`, dezelfde bisectie als de netto-koppeling). Een alleenstaande krijgt de alleenstaandennorm, een paar in de bijstand ieder de helft van de gezinsnorm, en als de partner werkt, vult de bijstand aan tot de gezinsnorm (min het netto inkomen van de partner). Niet in het model: jongerennormen (onder 21), de kostendelersnorm, vrijlatingen en de AOW-normen (AIO). In de calculator staat bij bijstand geen marginale druk en geen inkomenscurve, want bijverdienen gaat van de uitkering af. De voorbeeldhuishoudens en de nagebootste bevolking gebruiken dezelfde regel.

### D-057 Zelfstandigen

Een zzp'er vult de winst in. Het model trekt de zelfstandigenaftrek (€ 1.200, alleen met urencriterium), eventueel de startersaftrek (€ 2.123) en daarna de mkb-winstvrijstelling (12,7%) af, en rekent de inkomensafhankelijke bijdrage Zvw (4,85%) over de belastbare winst. De arbeidskorting gaat over de winst vóór die aftrekposten (Wet IB 2001, art. 8.11 lid 2: "winst uit onderneming", niet de belastbare winst). Verliesverrekening en investeringsaftrek zitten er niet in. Zelfstandigenaftrek en mkb-winstvrijstelling zijn knoppen in het lab.

In de nagebootste bevolking is 13% van de werkenden zelfstandig (60% met urencriterium); de herweging stemt het aantal huishoudens met een zelfstandige af op CBS (1,19 mln, 84493NED, 2024). De zelfstandigenaftrek en de mkb-winstvrijstelling zijn daardoor uit de overige aftrekposten gehaald (die zijn nu € 2,932 mld); starters- en meewerkaftrek blijven daar, want de bevolking heeft geen starters of meewerkende partners. Controle: de winst in het model is € 72,4 mld tegen € 65,2 mld bij CBS (geïndexeerd), 11% hoger.

### D-058 Pensioenpremie van werknemers

Werknemers betalen het werknemersdeel van de pensioenpremie; dat wordt op het loon ingehouden en verlaagt het fiscale loon, dus ook de belasting, de arbeidskorting en het toetsingsinkomen voor de toeslagen. Standaard rekent het model met de regeling van ABP, het grootste fonds: 8,13% van het loon tussen € 19.200 en € 137.800. In het formulier kun je kiezen voor de schatting, het bedrag van je loonstrook of geen pensioen. In de nagebootste bevolking betaalt iedere werknemer de standaardpremie: samen € 22,1 mld, tegen € 21,0 mld bij CBS (geïndexeerd, +5%). Dat een deel van de werknemers geen pensioen opbouwt en andere fondsen anders rekenen, valt daar ongeveer tegen weg.

De marginale druk laat de pensioenpremie buiten beschouwing: het is opbouw voor later, geen verlies. Besteedbaar inkomen is wel na pensioenpremie, net als bij CBS.

### D-059 Herweging en golden-verschillen

De nagebootste bevolking is opnieuw gemaakt (andere toevalsreeks door de nieuwe kenmerken) en herwogen met de extra marge voor zelfstandigen. Alle schaalfactoren blijven 1,00 en de decielgrenzen kloppen binnen 0,1%. De belastingopbrengst in het model daalt van € 152,0 naar € 144,1 mld, vooral door de pensioenpremie en de ondernemersaftrek; dat is nu vrijwel gelijk aan de € 144,7 mld box 1 en box 2 uit de Miljoenennota. Armoede 9,9% → 10,3%, Gini 0,227 → 0,225.

Golden-verschillen (modelversie 0.3.0):

- Saldo van de voorstellen: vlaktaks € 43,59 → € 41,86 mld; drie schijven € 31,32 → € 29,62 mld; hogere algemene heffingskorting −€ 4,45 → −€ 4,50 mld; de andere voorstellen veranderen minder dan € 0,1 mld. De oplosser geeft een vrijstelling van € 27.836 (was € 28.322).
- Voorbeeldhuishoudens: werkenden betalen nu pensioenpremie, dus minder belasting en iets meer toeslag, maar minder besteedbaar (P50 € 65.743 → € 64.536). P10 (bijstand) krijgt de norm: netto precies € 16.926, besteedbaar € 21.033 → € 21.993.

## Fase 8c: jouw situatie overal (verbeterlijst punten 7 en 11)

### D-060 "Wat betekent dit voor jou?"

Eén component (`JouwEffect.svelte`) laat het effect van een scenario op het eigen huishouden zien: wat je per maand meer of minder overhoudt, met belasting, toeslagen en kinderbijslag nu en straks. Hij gebruikt de bewaarde situatie (D-052), en wie niets bewaard heeft, kan het formulier in het blok zelf openen. Het blok staat in het scenariolab (onder de landelijke kerncijfers, rekent mee met elke knop) en op elke voorstelpagina. De rij "Jij" in de grafiek met voorbeeldhuishoudens volgt dezelfde situatie. De verkiezingspagina deed dit al per maatregel; echte partijen krijgen het zo vanzelf.

Op Jouw situatie staat een grafiek "Wat doen de voorstellen met jou?" met het verschil per maand per voorstel en een link naar het voorstel.

De staafgrafiek zet labels boven de staven als ze er niet naast passen (vooral op een telefoon).

## Fase 8d: cijfers 2027 (verbeterlijst punt 10)

### D-061 Voorlopig parameterjaar 2027

Besluit van de eigenaar: nu al live, duidelijk gemarkeerd als voorlopig. Een parameterbestand heeft daarvoor een `status` (`definitief` of `voorlopig`) en een `toelichting` die de site toont.

`data/parameters/2027.yaml` bevat wat er op 28 oktober 2026 officieel bekend is:

- Tarieven, algemene heffingskorting, arbeidskorting, ouderenkorting, alleenstaande-ouderenkorting en combinatiekorting: Belastingplan 2027, memorie van toelichting tabel 1 en 2, met de tweede nota van wijziging van 20 oktober 2026 (aanvangspunt toptarief € 80.578, arbeidskorting € 40 minder verhoogd). Afgeleid en zo vermeld: het afbouwpercentage van de algemene heffingskorting (nul bij het aanvangspunt van het toptarief, zoals in eerdere jaren) en de eerste twee knikken van de arbeidskorting (grenzen 2026 × 1,01248, de beperkte indexatie uit de memorie van toelichting).
- Zelfstandigenaftrek € 900, startersaftrek € 10 (afschaffing in 2028), mkb-winstvrijstelling 12,7%.
- Maximaal aftrektarief eigen woning 38,16%: gelijk aan het tarief van de tweede schijf, zoals in 2025 en 2026.
- Overige aftrekposten: kolom 2027 van dezelfde Miljoenennota-tabel.

Nog niet gepubliceerd, dus tijdelijk de bedragen van 2026 met `TODO: bron nodig`: de vier toeslagen, AOW-bedragen, bijstandsnormen, zorgpremie en Zvw-bijdrage, kinderbijslag, pensioenpremie (ABP gaat in 2027 over naar het nieuwe stelsel), eigenwoningforfait en Wet Hillen, en de kortingen voor AOW'ers die werken. `npm run valideer` noemt ze allemaal. De site noemt ze bij de vergelijking.

Wat de site ermee doet: op Jouw situatie staat "Wat verandert er in 2027 voor jou?", bij hetzelfde bruto inkomen (lonen en uitkeringen stijgen meestal ook; dat staat erbij). Er is nog geen kalibratie of bevolking voor 2027, dus geen landelijke doorrekening; `npm run valideer` slaat die voor 2027 over.

Bijwerken: zodra de bedragen definitief zijn (Belastingdienst half december, Dienst Toeslagen en SVB eind november en december), de TODO's invullen, de afgeleide waarden vervangen door de officiële en `status: definitief` zetten. Zie docs/JAARLIJKSE-UPDATE.md.

## Fase 8e: pensioenpremie realistischer (vraag van de eigenaar)

### D-062 Pensioenpremie: zelf invullen, en in de bevolking volgens CBS

Vervangt een deel van D-058. De eigenaar vond "iedere werknemer betaalt de ABP-premie" te grof.

**Calculator.** Je vult je eigen pensioenpremie per maand in, van je loonstrook (standaard 0). Er is geen schatting meer: fondsen verschillen te veel, en het echte bedrag staat op de loonstrook.

**Nagebootste bevolking.** Wie pensioenpremie betaalt en hoeveel, volgt uit CBS 84493NED (2024, posten 1.1 en 11.4.1.1):

- _Wie_: per werknemershuishouden een kans op deelname, passend gemaakt op twee CBS-verdelingen tegelijk: het aandeel werknemershuishoudens met premie per 10%-groep gestandaardiseerd inkomen (van 12% in de laagste tot 94% in de op één na hoogste groep) en per leeftijdsgroep van de hoofdkostwinner (41% onder 25, 89% van 25 tot 65, 45% vanaf 65). Daarna getrokken met een vast zaad, zodat de bevolking reproduceerbaar is.
- _Hoeveel_: een vast deel van het loon, per 10%-groep zo hoog dat premie ÷ al het loon in die groep klopt met CBS (1,0% tot 5,6%). Dat is het gemiddelde over alle fondsen, niet de regeling van één fonds.
- De 10%-groep hangt af van het besteedbaar inkomen en dus van de premie; de kalibratie wisselt daarom drie keer af tussen toekennen en herwegen.

Uitkomst: totaal € 20,8 mld tegen € 21,0 mld bij CBS (geïndexeerd, −1,1%; was +5,2%); deelname per leeftijdsgroep klopt; per 10%-groep wijkt alleen de laagste groep af (16% tegen 12%). Het rapport `docs/kalibratie-2026.md` laat de tabel per groep zien. De voorbeeldhuishoudens in het lab rekenen nog met de ABP-regeling uit `pensioenpremie` in het parameterbestand, als herkenbaar voorbeeld.

Golden-verschil (alleen cijfers die van de bevolking afhangen; voorbeeldhuishoudens niet): belasting in het model € 144,1 → € 145,3 mld (Miljoenennota € 144,7 mld), omdat minder werknemers premie aftrekken; armoede 10,34% → 10,34%, Gini 0,2250 → 0,2254. Saldo vlaktaks € 41,86 → € 41,40 mld, drie schijven € 29,62 → € 29,17 mld, hogere algemene heffingskorting −€ 4,50 → −€ 4,48 mld; de andere voorstellen veranderen minder dan € 0,01 mld. Oplosser: vrijstelling € 27.762 (was € 27.836).

## Fase 9: Belastingplan 2027, twee routes

### D-063 Routes naar een akkoord in de verkiezingsmodule

Vraag van de eigenaar: de twee routes naar een meerderheid voor het Belastingplan 2027 (links PRO en Volt, rechts JA21, BBB en SGP) naast elkaar zetten, zoals bij verkiezingen. De verkiezingsmodule kan dat nu:

- `soort: akkoord` (naast `verkiezing`): de site spreekt van routes en bronnen in plaats van partijen en programma's, en van "geen oordeel" in plaats van "geen stemadvies". `datum` is de stemming.
- `uitleg`: een korte uitleg bovenaan.
- Een basispad in een ander jaar dan de site: dan rekent de site met de parameters van dat jaar op de huidige nagebootste bevolking, zolang dat jaar geen eigen kalibratie heeft. Hier: het voorlopige Belastingplan 2027 (D-061).
- `vierOgen: false`: alleen op besluit van de eigenaar. Gepubliceerde routes hoeven dan geen controleur te hebben; de pagina meldt duidelijk "Niet onafhankelijk gecontroleerd".

Besluiten van de eigenaar (2 november 2026): nu online met aannames van Box1lab, en geen controle door een tweede persoon.

Stand op 2 november: geen akkoord, geen amendementen van deze partijen, en vrijwel geen bedragen. Om de routes gelijk te behandelen, krijgt elke route alleen een vertaling die te herleiden is tot een getal uit de memorie van toelichting:

- **PRO en Volt** ("lasten op arbeid verlagen, vermogen zwaarder belasten"): de extra verhoging van de tarieven in de eerste en tweede schijf voor 2027 gaat niet door (0,57 procentpunt, "besluitvorming 2027", tabel 5 en 6). Zekerheid laag. Effect in het model: −€ 3,1 mld voor de overheid.
- **JA21, BBB en SGP**: de vrijheidsbijdrage van burgers vervalt, dus volledige inflatiecorrectie (factor 1,026 in plaats van 1,01248) op de geïndexeerde bedragen in box 1; en de startersaftrek blijft € 2.123. Zekerheid middel. Effect in het model: −€ 1,2 mld (volgens de memorie van toelichting is de hele vrijheidsbijdrage van burgers € 1,5 mld, inclusief bedragen buiten box 1).
- De dekking (box 2 en 3 bij links, bezuinigingen bij rechts) en de eisen buiten belastingen staan onder "niet doorgerekend". Het saldo voor de overheid is dus zonder dekking; dat staat op de pagina.

Bijwerken: na de amendementen (debat 4 november), een eventueel akkoord en de stemming van 12 november. Als er een akkoord is, kan de "winnende" route worden vervangen door wat er echt is afgesproken, en het basispad door het aangenomen Belastingplan.

## Fase 10: indeling van de site

### D-064 Tabbladen en je situatie altijd in beeld

Vraag van de eigenaar (2 november 2026): de site volgen zoals mensen hem gebruiken. Je vult je situatie in, en bekijkt dan je huidige situatie, de plannen voor volgend jaar en het scenariolab. Je situatie moet daarbij in beeld blijven, zodat duidelijk is dat de uitkomsten daarop gebaseerd zijn. De pagina's waar je rekent en vergelijkt moeten te onderscheiden zijn van de uitleg en "over".

Besluiten van de eigenaar:

- **Menu in twee lagen.** Grote tabbladen voor de pagina's waar je met je situatie rekent: Jouw situatie, de nieuwste echte verkiezing of vergelijking van routes (nu "Belastingplan 2027", uit `menu` in `verkiezing.yaml`) en Scenariolab. Uitleg, Methodiek en Over staan klein rechtsboven, op een telefoon onder "Meer". Een vinkje bij Jouw situatie laat zien dat er een eigen situatie bewaard is.
- **Voorstellen horen bij het Scenariolab**, als tweede keuze ("Zelf bouwen | Kant-en-klare voorstellen"). De adressen blijven gelijk.
- **Je situatie staat op elk tabblad links** (op een telefoon als balk bovenaan): wat er is ingevuld en wat je nu overhoudt, met een knop om het aan te passen. Zonder eigen situatie staat er dat met een voorbeeldhuishouden wordt gerekend.
- **Eén pagina voor volgend jaar**: eerst wat het kabinetsplan voor jou betekent ten opzichte van dit jaar, dan wat de routes daar nog aan veranderen. Op Jouw situatie blijft een korte verwijzing.
- **Een volgende stap** onder de uitkomst op Jouw situatie, en op de home één hoofdknop: "Begin met je situatie".

## Fase 11: verbeteringen na een kritische blik

### D-065 Bedragen 2027: ramen met de wettelijke indexatie

Vraag van de eigenaar (2 november 2026): toeslagen, AOW, bijstand en kinderbijslag stonden voor 2027 op het niveau van 2026. Daardoor leek 2027 voor mensen met toeslagen slechter dan het wordt. Geen extra waarschuwing, wel betere bedragen.

Besluit: wat officieel is, gaat erin; wat nog niet officieel is maar een wettelijke indexatieregel heeft met een bekende factor, wordt geraamd. De bron begint dan met `Raming:` en noemt de berekening. `npm run valideer` toont de ramingen als waarschuwing en de site noemt ze in de notitie bij "Wat verandert er?". Wat geen regel heeft, blijft `TODO: bron nodig` op het niveau van 2026.

Stand op 2 november 2026:

- **Officieel**: minimumloon per 1 januari 2027 (€ 15,29 per uur, referentiemaandloon € 2.385, +2,05%; regeling van 29 oktober 2026), dus drempelinkomen € 30.910. Percentages zorgtoeslag (1,930 / 4,307 / 13,760) en afbouw kindgebonden budget (8,05%) staan in de wettekst per 2027. Vermogensgrens zorgtoeslag en kindgebonden budget: wettekst per 2027 × tabelcorrectiefactor = € 119.122 / € 158.748.
- **Raming uit de begroting**: standaardpremie € 2.277, nominale premie € 2.029, verlaagde Zvw-bijdrage 5,02% (VWS-begroting 2027, tabel 77); maximum bijdrage-inkomen € 82.547 (CPB, MEV 2027). Het model geeft daarmee precies de maximale zorgtoeslag uit de begroting (€ 1.680 en € 3.223); een test controleert dat.
- **Raming met indexatie**: huurtoeslag, kindgebonden budget en kinderbijslag × 1,026 (de tabelcorrectiefactor; de beperking tot 48% uit het Belastingplan geldt alleen voor de inkomstenbelasting). AOW en bijstand: bedragen per 1 juli 2026 + 2,05%; de verhoging per 1 juli 2027 is nog onbekend en zit er niet in.
- **Nog niet**: kinderopvangtoeslag, eigen woning (forfait), arbeids- en combinatiekorting voor AOW'ers, pensioenpremie ABP.

Gevolg: bij hetzelfde bruto loon gaan toeslagen en de zorgpremie omhoog. Het voorbeeldhuishouden (€ 3.200 per maand, huur € 850) houdt in 2027 € 33 per maand meer over in plaats van € 8. De notitie bij de vergelijking zegt nu dat loon, pensioen en WW gelijk blijven en dat AOW, bijstand, kinderbijslag en toeslagen meegaan met de gewone verhoging.

Bijwerken: zorgpremies (12 november), standaardpremie (november), huurtoeslag (Staatscourant, eind november), AOW, bijstand, kinderbijslag en kindgebonden budget (december).

### D-066 Wie de site gebruikt: telefoon, weinig tijd, voorbeeld en delen

Besluiten van de eigenaar (2 november 2026) na een kritische blik op wie de site gebruikt. De meeste bezoekers komen via nieuws of sociale media op een telefoon en willen snel weten wat iets voor hen betekent.

- **Uitkomst in beeld op een telefoon.** Op Jouw situatie staat het formulier boven de uitkomst. Zolang de uitkomst onder het scherm ligt, staat onderaan een balk met wat je overhoudt en een knop "Bekijk". Op een smal scherm staat de vraag boven het invulveld.
- **Het voorbeeld is modaal en heet zo.** Het voorbeeld is een alleenstaande met een modaal inkomen (`loon.modaal` in het parameterbestand, CPB, per jaar inclusief vakantiegeld; in het formulier als maandloon met het vinkje vakantiegeld), die huurt. Zolang je niets hebt aangepast, staat er "Dit is een voorbeeld" en "In dit voorbeeld houd je". "Wis mijn gegevens" zet het voorbeeld terug.
- **Een eigen deelplaatje en een deelknop** voor de pagina van een echte verkiezing of het Belastingplan, en een deelknop bij elk voorstel. De knop deelt alleen de link; wat je invult staat daar niet in.
- **Titels zoals mensen zoeken**: "Belastingplan 2027: wat betekent het voor jou?", "Netto inkomen, belasting en toeslagen berekenen", "Scenariolab: speel minister van Financiën".
- **Jouw situatie laadt de bevolking niet meer.** "Je plek in Nederland" gebruikt een verdeling in duizend stukken die tijdens de build wordt gemaakt (`verdeling` in de engine, `plekGrenzen` in `site/src/lib/basis.ts`), tot op 0,1 procentpunt gelijk aan de berekening op de hele bevolking. Dat scheelt op die pagina ruim 1 MB aan data en de rekenwerker. Het lab laadt de bevolking nog wel.

Niet gedaan, op besluit van de eigenaar: een waarschuwing bij de uitkomst voor 2027 (in plaats daarvan betere bedragen, D-065), een andere manier om fouten te melden, meer tekst op de pagina Over en uitleg bij moeilijke woorden.

## Fase 12: vlaktaks als voorbeeld

### D-067 Vlaktaks 35% boven € 24.000

Besluit van de eigenaar (2 november 2026): het voorbeeld van een vlaktaks wordt 35% boven een belastingvrije voet van € 24.000 per persoon, in plaats van 40% boven € 18.000. De rest blijft gelijk: alle heffingskortingen, de hypotheekrenteaftrek, het forfait, de overige aftrekposten en alle toeslagen vervallen.

- Nieuw adres `/voorstellen/vlaktaks-35`; het oude adres `/voorstellen/vlaktaks-40` stuurt door (`redirects` in `site/astro.config.mjs`), zodat gedeelde links blijven werken.
- `npm run vergelijk` vergelijkt de vlaktaks niet meer met het prototype; dat had 40% boven € 18.000.

Golden-verschil: alleen de vlaktaks en de oplosser veranderen.

|                         | 40% boven € 18.000 | 35% boven € 24.000 |
| ----------------------- | ------------------ | ------------------ |
| Saldo voor de overheid  | +€ 41,40 mld       | −€ 1,66 mld        |
| Armoede (personen)      | 19,6%              | 15,5%              |
| Gini                    | 0,271              | 0,274              |
| Achteruit (> 5% / 1–5%) | 71,2% / 12,4%      | 32,3% / 15,8%      |
| Minder dan 1% verschil  | 4,3%               | 10,8%              |
| Vooruit (1–5% / > 5%)   | 6,1% / 6,1%        | 15,9% / 25,2%      |

De oplosser maakt de vlaktaks budgetneutraal: via de vrijstelling € 23.555 (was € 27.762), of via de tarieven × 1,014 (was × 0,742).

## Fase 13: de top van de inkomensverdeling

### D-068 Topinkomens volgens CBS

Vraag van de eigenaar (2 november 2026): met 80% belasting boven € 100.000 ging de hoogste inkomensgroep er in het model op vooruit. De formules klopten; de vraag was of de top van de bevolking klopt.

**Wat we vonden.** De inkomensposities in een CBS-cel lagen vast ((j + 0,5) / n). In een cel van 50 huishoudens is de hoogste positie het 99e percentiel, dus de top werd afgekapt: het hoogste inkomen was € 254.000. Vergeleken met CBS 83931NED (personen naar persoonlijk bruto inkomen, 2024), met de werkgeverslasten erbij zoals CBS die meetelt:

| Persoonlijk bruto inkomen (CBS-begrip, 2024) | CBS       | Model vóór | Model na    |
| -------------------------------------------- | --------- | ---------- | ----------- |
| € 100.000–200.000: personen                  | 1.219.900 | 1.287.400  | 1.219.900   |
| € 200.000 of meer: personen                  | 149.500   | 122.400    | 149.500     |
| € 200.000 of meer: gemiddeld                 | € 311.100 | € 226.700  | € 311.100   |
| Hoogste inkomen in de bevolking (2026)       |           | € 254.000  | € 1.575.000 |

**Wat we doen.**

- Werkenden met een inkomen boven € 150.000 (2026) vervangen we door extra huishoudens per cel waarvan het inkomen van de hoofdverdiener een Pareto-verdeling volgt. De staart is verdeeld in acht stukken die naar boven steeds half zo groot worden; elk huishouden krijgt het gemiddelde inkomen van zijn stuk, zodat het totale inkomen in de staart behouden blijft. De gewone huishoudens blijven verder precies gelijk (eigen toevalsreeks voor de staart).
- Alfa 2,6: dan is het gemiddelde boven € 200.000 vóór de herweging € 314.500 (CBS € 311.100); 2,5 en 2,7 zitten verder af.
- De herweging stemt nu ook af op het aantal personen in beide klassen, het totale inkomen boven € 200.000 en de totale winst van zelfstandigen (CBS 84493NED, post 2.1; die stond er al als controle). Zonder dat laatste doel kwam de winst 18% te hoog uit, door de hoge winsten in de staart.
- Werkgeverslasten om het model met CBS te vergelijken: premies 2024 19,47% tot € 71.624 (CPB MEV 2027, bijlage 17) en pensioenpremie werkgever 1,68 × werknemer (CBS 84494NED). Ter controle: de sociale lasten van werkgevers zonder pensioen zijn volgens CBS 15,8% van het loon; dat past bij 19,47% met een maximum.

**Niet aangepast.** Onder € 50.000 wijkt de verdeling van personen af van CBS (minder mensen onder € 10.000, meer tussen € 20.000 en € 40.000): bijbaantjes van 15- tot 18-jarigen en kleine inkomens van partners zitten niet in het model. De verdeling van huishoudens (de decielgrenzen van het besteedbaar inkomen) klopt wel; voor belasting en toeslagen maakt dit weinig uit.

**Gevolg.** Box 1 levert in het model € 149,9 mld op (was € 145,3 mld). Dat is 93% van de CBS-belasting van huishoudens over alle boxen (€ 160,6 mld; box 2 en 3 zitten niet in het model, dus lager hoort zo) en 104% van de Miljoenennota-opbrengst voor box 1 en 2 samen (kasbasis). De twee controles liggen ongeveer € 10 mld uit elkaar; het model zit ertussen. Gini 0,225 → 0,233, armoede 10,3% → 10,2%.

Golden-verschil: alle cijfers die van de bevolking afhangen, niet de voorbeeldhuishoudens. Saldo vlaktaks −€ 1,66 → −€ 2,84 mld (de hoogste inkomens profiteren meer van 35%); de andere voorstellen veranderen minder dan € 0,1 mld. Oplosser: vrijstelling € 23.555 → € 23.246, tarieven × 1,014 → × 1,024. Het scenario van de eigenaar (vlaktaks met 30% tot € 100.000 en 80% daarboven): hoogste groep +4,7% → +0,5%, saldo −€ 0,9 → +€ 3,4 mld. De hoogste groep gaat er gemiddeld nog net op vooruit, omdat de meeste mensen daarin tweeverdieners zijn. Wie alleen verdient, gaat er boven ongeveer € 165.000 op achteruit; een tweeverdiener met zo'n inkomen kan er nog op vooruitgaan als de partner onder € 100.000 verdient.

**Correctie (2 november 2026).** In de eerste versie van deze beslissing en in de changelog stonden cijfers van een tussenversie van de bevolking, van vóór de herweging op de winst van zelfstandigen: saldo vlaktaks −€ 3,14 mld, drie schijven € 28,93 mld, vrijstelling € 23.167, het scenario van de eigenaar +0,4% en +€ 3,2 mld, en de grens van € 155.000. De cijfers hierboven komen uit de bevolking die in de site zit (golden-bestand).

## Fase 14: nieuw uiterlijk

### D-069 Stijl "Papier", groen voor vooruit en rood voor achteruit

De eigenaar vond het uiterlijk te veel een dashboard en wilde iets in de richting van De Correspondent. Drie richtingen zijn op de echte pagina's vergeleken, licht en donker, op telefoon en computer: "Krant" (wit, zwart, alles serif, alleen lijnen), "Papier" en "Data" (schreefloos, dikke zwarte lijnen, markeerstift). De eigenaar koos Papier.

**Papier.** Warm gebroken wit papier (`#f6f2ea`) met vlakken zonder rand en een zachte schaduw; in donkere modus een warm donkergrijs (`#1a1814`) in plaats van koud blauwgrijs. Koppen, inleidingen, de kernzin en grote getallen in Source Serif 4; de rest in Inter. Inter vervangt ook IBM Plex Mono voor getallen, met `tabular-nums` zodat kolommen recht blijven. Knoppen in donker inktblauw (`#26365e`), dat niet botst met rood en groen. De grootte van de paginakop en de inleiding staat nu één keer in `global.css` in plaats van per pagina. Lettertypen blijven lokaal via `@fontsource` (D-004), geen externe dienst.

**Groen en rood.** Op verzoek van de eigenaar is groen erop vooruit en rood erop achteruit. Dat wijkt af van HANDOFF §7 ("nooit rood/groen") en vervangt de kleuren van D-030; de reden in de handoff was kleurenblindheid. Daarom:

- Het rood is donker en het groen lichter, zodat ze ook in helderheid verschillen. Gecontroleerd met de dataviz-validator (simulatie Machado 2009): de polen verschillen bij rood-groenblindheid ΔE 11,1 (licht, `#a82418` en `#169065`) en 12,6 (donker, `#d95544` en `#58c295`); doel ≥ 8. Bij normaal zicht ΔE 28,6 en 29,1.
- De vijf klassen (verlies groot, verlies, ~0, winst, winst groot) zijn per modus nagerekend: de kleinste afstand tussen buren is ΔE 10,4 (licht) en 8,7 (donker) bij kleurenblindheid, 17,2 en 17,8 bij normaal zicht. Het neutrale midden is grijs en de tussentinten zijn lichter (licht) of donkerder (donker) dan de polen, zoals bij een tweezijdige schaal hoort.
- Het groen in donkere modus is iets lichter dan de helderheidsband die de validator voor gewone categorieën aanhoudt (0,74 tegen 0,67). Een donkerder groen zou dichter bij het rood komen voor kleurenblinde lezers; dat weegt zwaarder.
- Kleur is nooit het enige signaal: bedragen hebben een plus- of minteken, grafieken hebben een tabelweergave en de tekst noemt "erop vooruit" of "erop achteruit".
- Tekst in groen en rood heeft eigen tokens met een contrast van minstens 5,3:1 op alle achtergronden (WCAG AA). Gedempte tekst haalt minstens 4,9:1.
- Lijnen die niet goed of slecht zijn (zoals de marginale druk) zijn inktblauw, nooit rood of groen.

Ook aangepast: de deelafbeeldingen (kleuren en lettertypen), het favicon en de kleur van de browserbalk (licht en donker). In het `[data-theme="dark"]`-blok ontbraken `--gain-tekst` en `--loss-tekst`; die staan er nu wel.

## Fase 15: Belastingplan 2027 na de aanpassingen van 3 november

### D-070 Stap 1 per onderdeel en een derde route

Voorstellen 8, 9 en 10 van 2 november 2026; de eigenaar vroeg ze bij te werken met het nieuws van 3 november.

**Stap 1 per onderdeel.** Stap 1 liet alleen het totaal zien, waardoor niet te zien was wat er in het plan van het kabinet zit. Nu staat eronder "Waar komt het verschil vandaan?": per onderdeel van de regels (tarieven en schijven, algemene heffingskorting, arbeidskorting, ouderenkorting, combinatiekorting, eigen woning, zelfstandigenaftrek, pensioenpremie, zorgpremie, toeslagen, kinderbijslag, AOW en bijstand, overig) wat het voor dit huishouden doet. De onderdelen van het nieuwe jaar worden in vaste volgorde één voor één overgenomen (`jaarovergangPerOnderdeel` in de engine); zo tellen ze precies op tot het totaal. De volgorde bepaalt de verdeling een beetje (een hogere schijfgrens is meer waard bij een hoger tarief), net als bij de maatregelen van een route. Het gaat om onderdelen van de regels, niet om politieke maatregelen: de vrijheidsbijdrage zit bijvoorbeeld verspreid over de schijven en de kortingen.

**Derde route: het kabinet met ChristenUnie en 50PLUS.** Op 3 november stuurde het kabinet de Kamerbrief "Aanpassingen Belastingplan en box 3" (2026D55029). Met ChristenUnie, 50PLUS en de Groep Markuszower lijkt een meerderheid in de Tweede Kamer mogelijk. De route heeft twee maatregelen:

- Het gewijzigde amendement Grinwis en Van Brenk (37 022, nr. 27), waar het kabinet oordeel Kamer aan geeft: tarief eerste en tweede schijf −0,14 procentpunt, de verlaging van de ouderenkorting met € 100 vervalt, en de drie bedragen van de arbeidskorting worden € 116 lager (verhoging € 17 in plaats van € 133). Het eerste percentage van de arbeidskorting volgt uit het lagere bedrag bij de eerste knik (1.026 / 12.114 = 8,47%); de andere percentages blijven gelijk. Zekerheid hoog. In het model kost het amendement € 0,06 mld; de indieners ramen € 5 miljoen opbrengst. Het maximale aftrektarief van de eigen woning laten we op 38,16%; het amendement noemt het niet.
- € 347 miljoen extra koopkracht waarmee de vrijheidsbijdrage in 2027 "effectief teniet" wordt gedaan, ingevuld met de tabelcorrectiefactor. De Kamer kiest de precieze invulling nog. Aanname: alle geïndexeerde bedragen in box 1 × 1,00396, de factor waarbij het model precies € 347 miljoen kost (ongeveer 30% van de volledige correctie × 1,013353 uit de route van JA21, BBB en SGP). Zekerheid laag.

Samen: saldo −€ 0,41 mld; de laagste inkomensgroep −0,03% (minder arbeidskorting), de andere groepen +0,04% tot +0,22%. De twee andere routes blijven, met een bijgewerkte uitleg. Box 3 (uitstel naar 2029, geen lagere vrijstelling), box 2, de aftrek voor specifieke zorgkosten en de btw op sierteelt staan bij "niet meegenomen".

Het basispad blijft het plan zoals ingediend met de tweede nota van wijziging: de aanpassingen van 3 november zijn nog geen wettekst. Na de stemming van 12 november wordt het basispad wat is aangenomen.

## Fase 16: scenariolab

### D-071 Basisinkomen, negatieve belasting en een rustiger begin

Voorstellen 1, 2 en 14 van 2 november 2026. De eigenaar vroeg het basisinkomen zo simpel mogelijk te houden; geen voorbeelden in de galerij en geen uitlegartikel (3 viel af).

**Negatieve belasting** (`box1.negatieveBelasting`, standaard uit). Aan: de belasting kan negatief worden. Onder de vrijstelling is de heffing negatief tegen het tarief van de eerste schijf boven de vrijstelling, en heffingskortingen die hoger zijn dan de heffing worden uitbetaald. Met de vlaktaks (35% boven € 24.000) is dat precies de negatieve inkomstenbelasting van Friedman: wie niets verdient krijgt € 8.400 per jaar, aflopend tot nul bij € 24.000. Met de huidige regels is het een uitbetaalbare heffingskorting. Het geldt per persoon, zoals de inkomstenbelasting, dus ook voor een partner zonder inkomen en voor meerderjarige kinderen. Bijstand en AOW zijn netto gekoppeld (knoppen), dus wat zij uitbetaald krijgen gaat van hun uitkering af. `brutoVoorNetto` ging ervan uit dat belasting nooit negatief is; nu zoekt het vanaf 0 en geeft 0 als bruto 0 al genoeg netto oplevert.

**Basisinkomen** (`basisinkomen.perVolwassenePerMaand`, standaard 0). Eén knop. Het bedrag is onbelast, gaat naar elke volwassene in het huishouden (ook meerderjarige kinderen) en komt in plaats van (een deel van) de bijstand en de AOW: die gaan zoveel omlaag dat het netto inkomen van de ontvanger na belasting en Zvw-bijdrage met het basisinkomen daalt, maar niet verder dan de hele uitkering. Voor de toeslagen telt dan het oorspronkelijke inkomen, zodat iemand in de bijstand of met alleen AOW er niet op vooruit of achteruit gaat zolang het basisinkomen lager is dan de uitkering. WW en WIA blijven, net als toeslagen, kinderbijslag en heffingskortingen; die kun je met de bestaande knoppen lager zetten. Het overheidssaldo heeft een eigen post "Basisinkomen"; wat de uitkeringen minder kosten staat bij "Uitkeringen en AOW".

Ter controle: € 1.000 per maand met één tarief van 50% en zonder algemene en arbeidskorting kost per saldo € 0,1 mld (basisinkomen −€ 175,2 mld, uitkeringen +€ 50,8 mld, box 1 +€ 108,9 mld, eigen woning +€ 15,7 mld). Het model rekent statisch: of mensen stoppen of beginnen met werken zit er niet in, en bij een basisinkomen is dat juist de kern van de discussie. De knop voor het gedragseffect gaat alleen over werkenden die meer of minder uren maken.

**Rustiger begin.** Zolang er niets veranderd is, toont het lab alleen de kernzin, een blok "Begin bij een voorstel" met de voorstellen en de grafieken van netto inkomen en marginale druk. De blokken met effecten (allemaal nul) verschijnen zodra je iets verandert.

Golden: alleen de nieuwe post `basisinkomen` (0) in elk scenario; verder geen verschil. Modelversie 0.4.0.

## Fase 17: wat als

### D-072 "Wat als…?" op Jouw situatie

Voorstel 13 van 2 november 2026. Onder "Van bruto naar netto" staat een blok met veranderingen in je eigen situatie en wat je dan per maand meer of minder overhoudt, met hoeveel daarvan door belasting en premies en hoeveel door toeslagen en kinderbijslag komt. Alleen andere invoer, dezelfde rekenregels (`watAls` in de engine):

- **€ 100 per maand meer bruto loon** (bij een jaarbedrag € 1.200; bij een zzp'er € 1.200 meer winst). Met vakantiegeld als dat zo is ingevuld.
- **Een dag minder werken**: inkomen, bonus en eigen pensioenpremie 20% lager (4 in plaats van 5 dagen). Alleen bij loondienst en zzp. Met een werkende partner ook "je partner werkt een dag minder".
- **Samenwonen met iemand met een modaal inkomen** (alleen zonder partner): het huishouden met partner, vergeleken met jouw huishouden plus de partner alleen zonder eigen woonlasten. Zo zie je vooral wat er met de toeslagen gebeurt; zonder toeslagen is het vaak € 0. De partner is jonger dan de AOW-leeftijd.
- **Een kind erbij**: een baby zonder kinderopvang. De kosten van het kind zelf zitten er niet in.

Verschillen onder € 1 per maand tonen we als € 0.

## Fase 18: box 3

### D-073 Box 3 in de berekening en vermogen in de bevolking

Voorstellen 11 en 12 van 2 november 2026; de eigenaar gaf toestemming voor uitbreiding naar box 3 (HANDOFF §10).

**Regels** (`regels/box3.ts`). Het forfaitaire stelsel: een vast rendement per soort vermogen (banktegoeden, overige bezittingen, schulden boven de drempel), over het deel van de rendementsgrondslag boven het heffingsvrij vermogen, tegen 36%. Heffingsvrij vermogen en schuldendrempel per persoon, dubbel voor partners; voor partners maakt de verdeling niet uit, want het tarief is vlak. Getest met het rekenvoorbeeld van de Belastingdienst (alleenstaand, € 150.000 spaargeld: grondslag € 90.643, belasting € 417). Niet in het model: de tegenbewijsregeling (wie een lager werkelijk rendement had, betaalt minder) en box 3-vermogen van meerderjarige kinderen.

- 2026: Belastingdienst, rekenhulp voorlopige aanslag 2026 (heffingsvrij € 59.357, drempel € 3.800, 1,28% / 6,00% / 2,70%; de percentages voor bank en schulden zijn voorlopig).
- 2027: heffingsvrij € 60.098 (€ 59.357 × 1,01248, de beperkte inflatiecorrectie; de voorgestelde verlaging naar € 30.846 gaat volgens de Kamerbrief van 3 november niet door), overige bezittingen 6,37% (Rendement, januari 2026; geen officiële bron gevonden, wel overal hetzelfde getal). Bank, schulden en drempel geraamd op 2026.

**In de berekening.** De box 3-belasting staat apart in het resultaat (`box3`) en gaat af van het besteedbaar inkomen. Het voordeel uit sparen en beleggen telt mee in het toetsingsinkomen van de toeslagen, want dat is het verzamelinkomen. De vermogensgrens van de toeslagen gaat over de rendementsgrondslag. Niet: de afbouw van de ouderenkorting over het verzamelinkomen (die rekent het model alleen over box 1). In het overheidssaldo een eigen post "Box 3: sparen en beleggen". Bij "Wat verandert er in 2027" een eigen onderdeel "Box 3".

**Invoer.** Het veld "Spaargeld en beleggingen" is gesplitst in spaargeld, beleggingen en tweede woning, en schulden zonder hypotheek (met een studieschuld). Bewaarde situaties blijven werken: de nieuwe velden zijn standaard 0.

**Vermogen in de bevolking** (`scripts/populatie/vermogen.ts`). Uit CBS 83834NED (stand 1 januari 2025, voorlopig): per 10%-groep gestandaardiseerd inkomen en per leeftijdsgroep van de hoofdkostwinner hoeveel huishoudens elk bestanddeel hebben, het totaal, en het gemiddelde en de mediaan onder wie het heeft. Per huishouden en bestanddeel:

- de kans dat het er is: kans in de 10%-groep × kans in de leeftijdsgroep ÷ kans voor iedereen;
- het bedrag: lognormaal, met mediaan 10%-groep × leeftijdsgroep ÷ iedereen, en de spreiding die bij gemiddelde en mediaan van de 10%-groep past;
- daarna per 10%-groep geschaald op het CBS-totaal.

Banktegoeden zijn bank- en spaartegoeden; overige bezittingen zijn effecten, onroerend goed behalve de eigen woning en overige bezittingen; schulden zijn studieschulden en overige schulden. Ondernemingsvermogen (box 1) en aanmerkelijk belang (box 2) tellen niet mee. Niet geïndexeerd naar 2026.

Het toekennen gebeurt in dezelfde rondes als de pensioenpremie (de 10%-groep hangt af van de gewichten), en nog één keer met de gewichten na herwegen. Omdat de grote vermogens zwaar tellen, schoof het totaal van de overige bezittingen bij het herwegen toch nog 10% weg. Daarom zijn twee marges toegevoegd: het totaal van de banktegoeden en van de overige bezittingen (CBS). Na herweging kloppen beide; de schulden zitten 0,3% hoger.

**Gevolg.** Box 3 levert in het model € 9,5 mld op, betaald door 2,2 miljoen huishoudens; de raming voor 2026 is € 10,5 mld. Lager hoort zo: geen tegenbewijsregeling, vermogen van een jaar eerder en geen vermogen buiten particuliere huishoudens. Box 1 € 149,9 → € 149,5 mld. Armoede 10,2% → 10,3%, Gini 0,233 → 0,232 (box 3 gaat nu af van het besteedbaar inkomen; de mediaan daalt van € 37.516 naar € 37.221). Vóór de herweging zitten de toeslagen nu dichter bij Dienst Toeslagen, omdat de vermogensgrens werkt (uitgaven huurtoeslag vóór herweging +36% → +17%).

Golden-verschil: alle cijfers die van de bevolking afhangen, plus een nieuwe post `box3` (0 in de bestaande voorstellen). Saldo vlaktaks −€ 2,84 → −€ 2,50 mld, drie schijven € 29,19 → € 29,84 mld, zonder hypotheekrenteaftrek € 7,90 → € 7,99 mld, algemene heffingskorting + € 500 −€ 4,49 → −€ 4,57 mld; de andere voorstellen veranderen minder dan € 0,15 mld. Het verschil komt van het opnieuw herwegen met de vermogensgrens van de toeslagen en de twee nieuwe marges. Modelversie 0.5.0.

## Fase 19: loonstrook

### D-074 Netto maandloon, vakantiegeld en 13e maand apart

Wens van de eigenaar (4 november 2026): vakantiegeld en 13e maand uit het netto bedrag halen en apart laten zien, zodat bezoekers de uitkomst kunnen vergelijken met hun loonstrook.

Een kaart "Klopt het met je loonstrook?" op Jouw situatie, per werknemer of uitkeringsgerechtigde (werknemersverzekering) die een bedrag per maand invulde (`loonstrook.ts`). Per maand: bruto, loonheffing, pensioenpremie en netto. Per jaar apart: vakantiegeld, 13e maand en bonus, bruto en netto.

- **Rekenwijze.** De loonheffing gaat over het hele jaar, zoals de aangifte en de rest van het model. Het netto maandloon is een twaalfde van het netto jaarloon zonder extra's. Elke extra levert op wat het netto jaarinkomen erdoor stijgt, in de volgorde vakantiegeld, 13e maand, bonus. Samen is dat precies het netto inkomen uit werk van het model. De werkgever houdt over extra's het tarief voor bijzondere beloningen in, dat op hetzelfde neerkomt (de belasting over het laatste stuk jaarloon, met de afbouw van de kortingen). Daarom kan een echte loonstrook een paar tientjes afwijken; dat staat erbij.
- **Wat er niet op staat.** De combinatiekorting en de hypotheekrenteaftrek (die komen via de aangifte of een voorlopige aanslag), toeslagen en de nominale zorgpremie. De inkomensafhankelijke bijdrage Zvw betaalt de werkgever, die staat ook in het model niet bij werknemers.
- **Bedrag per jaar.** Wie het loon per jaar invult, krijgt geen loonstrook: dan weten we niet wat erin zit. De kaart vraagt dan om het bedrag per maand.
- **Bovenaan** blijft het gemiddelde besteedbaar inkomen per maand staan, omdat alle vergelijkingen op de site daarover gaan. De kaart legt uit dat dat een gemiddelde is.
- **Beknopt (later op 4 november, wens van de eigenaar).** De aparte kaart is vervangen door een rij kleine vakjes direct onder de zin bovenaan: per maand, vakantiegeld, 13e maand en bonus, elk met bruto boven en netto (groot) onder. Ook de regel uitleg is weg (wens van de eigenaar); de vakjes verdelen de hele breedte, net als de kerngetallen eronder. De loonheffing per maand en de uitleg over bijzondere beloningen staan er niet meer bij.

Geen verandering in de rekenregels, dus geen nieuwe modelversie en geen golden-verschil.

## Fase 20: hypotheekrente per maand

### D-075 Hypotheekrente per maand, met een rekenhulp

Wens van de eigenaar (4 november 2026): mensen weten hun maandbedrag beter dan de rente per jaar, en zien vaak alleen het totaal dat ze aan de bank betalen, rente plus aflossing.

- **Per maand.** Het veld vraagt de hypotheekrente per maand. De invoer bewaart nog steeds de rente per jaar (`hypotheekrente`), zodat bewaarde situaties, links en de rekenkern niet veranderen; het formulier rekent om.
- **Rekenhulp.** Een rekenmachine-knop naast het veld opent een klein venster voor wie alleen het totale maandbedrag kent (wens van de eigenaar: een icoontje in plaats van een uitklapblok, zodat het formulier kort blijft). Omdat een knop met alleen een icoon minder opvalt, zegt de hint bij het veld dat je erop kunt klikken. Het venster sluit met Escape, de sluitknop of een klik ernaast; de focus gaat terug naar de knop. Uit dat totaal alleen is de rente niet te halen: het deel rente hangt af van de schuld, de rente en de looptijd. Daarom vraagt de hulp wat mensen wel weten of makkelijk vinden: de hypotheek die nog openstaat (in de app van de bank) en het rentepercentage (in het contract of de app). Rente per maand = schuld × rente ÷ 12 (`renteUitHypotheek`). Dat is de rente van deze maand; door aflossen is het jaargemiddelde iets lager, aan het begin van een annuïteit van 30 jaar tegen 4% ongeveer 1%, tegen het eind meer. De hulp wijst ook op de bank-app (die het maandbedrag vaak al splitst) en de jaaropgave (betaalde rente vorig jaar ÷ 12). Meer leningdelen: per deel uitrekenen en optellen.
- De bezoeker neemt de uitkomst over met de knop "Gebruik € … per maand"; het veld verandert niet stilletjes. Schuld en percentage worden niet bewaard.
- De notitie over de hypotheekrenteaftrek noemt nu eerst het bedrag per maand.

Geen andere rekenregels, geen nieuwe modelversie, geen golden-verschil.

## Fase 21: box 3 apart van wat je overhoudt

### D-076 Het bedrag bovenaan zonder box 3

Wens van de eigenaar (4 november 2026): mensen zien het forfaitaire rendement in box 3 niet als geld dat ze op hun rekening krijgen en kunnen uitgeven. Het bedrag dat ze bovenaan Jouw situatie zien, moet daar dus niet van afhangen.

- Het rendement telde al nergens als inkomen (D-073); alleen de box 3-belasting ging af van het besteedbaar inkomen. Wie spaargeld invulde, zag het bedrag bovenaan dalen, zonder dat er iets tegenover stond.
- Nieuw: `overVanInkomen(r)` = besteedbaar inkomen zonder de box 3-belasting. Dat staat bovenaan Jouw situatie, in de balk onderaan op een telefoon, in de kolom "Gerekend met jouw situatie" en als eind van de waterval. Daaronder staat de box 3-belasting per jaar, sinds fase 24 als eigen vakje naast de loonstrookvakjes (zonder uitlegregel). De effectieve druk (belasting min toeslagen als deel van het bruto inkomen) telt box 3 ook niet meer mee.
- Ongewijzigd: `besteedbaar` in de engine. Verschillen tussen voorstellen, jaren en de wat-als-vragen, de bevolking (armoede, Gini, inkomensgroepen) en "je plek in Nederland" rekenen met de box 3-belasting erbij, anders zou een voorstel voor box 3 voor niemand iets veranderen.
- Ook ongewijzigd: het voordeel uit box 3 telt mee in het toetsingsinkomen van de toeslagen. Zo rekent Dienst Toeslagen echt, en de toeslag die je krijgt, staat wel op je rekening.

Geen andere rekenregels, geen nieuwe modelversie, geen golden-verschil.

## Fase 22: situatie onthouden

### D-077 Standaard onthouden op dit apparaat

Besluit van de eigenaar (4 november 2026): wat bezoekers invullen, moet er de volgende keer nog staan, ook na het sluiten van het tabblad. Dit vervangt het deel van D-052 waarin langer bewaren alleen op verzoek was.

- "Onthoud op dit apparaat, ook als ik het tabblad sluit" staat nu standaard aan. De situatie gaat dan in `localStorage` (en, zoals eerst, in `sessionStorage`). Wie het uitzet, bewaart alleen voor het tabblad; die keuze geldt zolang het tabblad openstaat.
- Ongewijzigd: het voorbeeld waarmee het formulier start, bewaren we pas als je iets verandert. "Wis mijn gegevens" haalt alles weg; daarna staat het vinkje weer aan, maar er wordt pas weer iets bewaard als je iets invult.
- Privacy: er gaat nog steeds niets naar een server, en de gegevens zijn alleen voor de bezoeker zelf, om een dienst te leveren waar die om vraagt (het formulier invullen). Dat is functionele opslag, dus geen toestemmingsbanner nodig. De privacytekst bij het formulier en op de pagina Over noemt het onthouden, en wat je doet op een gedeelde computer.

## Fase 25: van bruto naar wat je overhoudt

### D-078 Eén regel boven de zin bovenaan

Wens van de eigenaar (4 november 2026): bovenaan ook het bruto inkomen per jaar en de belasting, in de volgorde bruto, belasting, netto.

Boven "Je houdt € … per maand over" staan kleiner twee of drie korte zinnen: "Je bruto inkomen is € … per jaar. Je betaalt € … belasting en € … voor de zorgverzekering per jaar." Pensioenpremie komt in de tweede zin als die er is; toeslagen en kinderbijslag (en in een scenario het basisinkomen) in een derde zin, "Je krijgt € … aan toeslagen en kinderbijslag." Samen tellen ze op tot het jaarbedrag in de zin eronder (op afronding na). De zorgpremie stond er eerst ook in; die is eruit gehaald (D-079). Lage inkomens: onder de belastingvrije voet staat er "Je betaalt geen belasting.", zonder kinderen "aan toeslagen" in plaats van "aan toeslagen en kinderbijslag", de waterval laat een belastingstap van € 0 weg, en een negatieve effectieve druk krijgt de uitleg "je krijgt meer aan toeslagen dan je aan belasting betaalt". Op verzoek van de eigenaar heet het "belasting": de inkomstenbelasting met de premies volksverzekeringen (op de loonstrook samen de loonheffing), plus de inkomensafhankelijke bijdrage Zvw voor wie die zelf betaalt. De box 3-belasting staat er niet in; die heeft een eigen vakje (D-076).

### D-079 Zorgpremie niet van het bedrag bovenaan

Besluit van de eigenaar (4 november 2026): de nominale premie van de zorgverzekering is geen belasting en hoort niet in het bedrag bovenaan.

- `overVanInkomen` telt de zorgpremie er weer bij: het bedrag bovenaan is nu wat er op je rekening komt (netto inkomen, toeslagen en kinderbijslag). De premie betaal je daar nog van, net als huur en kinderopvang; dat staat bij de waterval en op Methodiek. De waterval heeft geen stap "Premie zorgverzekering" meer, en de effectieve druk telt de premie niet mee.
- De zorgtoeslag blijft erin: die komt echt op je rekening. Daardoor is het bedrag bovenaan voor iedereen ongeveer € 157 per maand per volwassene hoger dan het besteedbaar inkomen.
- Ongewijzigd: `besteedbaar` in de engine trekt de premie wel af, zoals het CBS. Daarmee rekenen de verschillen tussen voorstellen (de premie is in elk scenario gelijk, dus daar verandert niets), de bevolkingscijfers, de armoedegrens en "je plek in Nederland".

## Fase 27: wie betaalt de belasting?

### D-080 Grafiek box 1 en box 3 per inkomensgroep

Wens van de eigenaar (4 november 2026): een staafgrafiek met horizontaal de inkomensgroepen en per staaf box 1 en box 3 in twee kleuren.

- **Plek:** in het Scenariolab, onder "Netto inkomen en marginale druk" (eerst als aparte uitlegpagina gebouwd; de eigenaar wil het bij de andere grafieken in het lab). Zonder wijzigingen toont de grafiek de huidige verdeling; in een scenario de verdeling in het scenario, met per groep een streepje voor hoe het nu is. De rekenwerker stuurt `belastingPerDeciel` mee voor de basis en voor elk scenario; in een scenario blijven de groepen die van nu, net als bij de andere effecten per groep.
- **Groepen:** tien even grote groepen (decielen), zoals overal op de site; percentielen geven honderd onleesbare staven.
- **Hoogte:** het deel van alle belasting in box 1 en box 3 samen, zodat alle staven samen 100% zijn. Bedragen (€ mld en gemiddeld per huishouden) staan bij aanwijzen en in de tabel.
- **Box 3 apart:** box 3 is ongeveer 6% van het totaal en is in de gestapelde staven bijna onzichtbaar. Eerst stond eronder een tweede grafiek met alleen box 3; op verzoek van de eigenaar is dat één grafiek met vinkjes voor box 1 en box 3. De staven zijn het deel van de belasting in de boxen die aan staan (box 3 alleen: het deel van alle box 3-belasting). Het laatste vinkje kan niet uit.
- **Box 1** is de inkomstenbelasting met de premies volksverzekeringen, na heffingskortingen (`Resultaat.belasting`), ook van meerderjarige kinderen. Niet: Zvw-bijdrage, toeslagen, btw, box 2.
- **Indeling zonder box 3-belasting.** Met de gewone decielen (`Basis.decielen`) betaalt groep 1 € 2,4 mld box 3, een kwart van alle box 3-belasting: wie veel vermogen en weinig inkomen heeft, valt juist door de box 3-belasting in de laagste groep, omdat het rendement niet als inkomen telt en de belasting wel (D-073, D-076). Deze grafiek deelt daarom in op het gestandaardiseerd besteedbaar inkomen zonder de box 3-belasting (`belastingPerDeciel`). Dan betaalt groep 1 € 0,4 mld en groep 10 € 3,8 mld. Box 1 verandert weinig (groep 10 € 59,3 → € 60,1 mld).
- **Kleuren:** `--box1` (inktblauw) en `--box3` (oker), per modus gecontroleerd met de dataviz-validator (licht #3d5a99 / #b8741a, donker #6f8fd6 / #b47a22): binnen de helderheidsband, ook bij kleurenblindheid te onderscheiden, contrast ≥ 3:1. Rood en groen blijven voor winst en verlies.

Uitkomst 2026: de hoogste 10% betaalt 40% van alle belasting in box 1 en box 3, de laagste helft 15%; de hoogste groep betaalt 40% van de box 3-belasting.

## Fase 29: verschil met nu

### D-081 Verschil in belasting per inkomensgroep

Wens van de eigenaar (4 november 2026): in de grafiek van D-080 is het verschil met nu niet goed te zien. Een knop maakt de huidige situatie nul, zodat de staven het verschil laten zien. Eerst als voorbeeld voorgelegd (vlaktaks 35%) en goedgekeurd.

- Vinkje "Verschil met nu" in de legenda, alleen in een scenario. De staven zijn dan het verschil in belasting per huishouden per jaar (box 1 en box 3, met dezelfde vinkjes), omhoog meer en omlaag minder; per box gestapeld vanaf de nullijn. De eenheid is euro per huishouden per jaar, omdat dat het makkelijkst te begrijpen is; het bedrag voor de hele groep (€ mld) staat bij aanwijzen en in de tabel.
- Eén getal bij de staaf met het grootste verschil. Verandert er niets in de gekozen boxen, dan staat dat er in een zin onder.
- Onder de grafiek: "Alleen belasting. Wat er met toeslagen gebeurt, zie je bij 'Wie gaat erop vooruit of achteruit?'". Bij een vlaktaks betaalt elke groep minder belasting (samen € 28,7 mld), omdat de toeslagen verdwijnen; zonder die zin lijkt het of iedereen erop vooruitgaat.
- Kleuren blijven box 1 en box 3; rood en groen zijn voor wat huishoudens netto overhouden, en dit is alleen de belasting.

## Fase 30: uitkeringen en toeslagen in het verschil

### D-082 Uitkeringen en toeslagen als derde laag

Wens van de eigenaar (4 november 2026): bij voorstellen als "toeslagen afschaffen" en "zonder huurtoeslag" stond het verschil met nu (D-081) overal op 0, omdat de grafiek alleen belasting telde. De eigenaar wil één term voor alles wat huishoudens van de overheid ontvangen; gekozen is "Uitkeringen en toeslagen".

- Derde vinkje "Uitkeringen en toeslagen", alleen bij "Verschil met nu" en standaard aan. Minder ontvangen telt omhoog, net als meer belasting: voor de portemonnee is dat hetzelfde. Titel dan "Hoeveel meer betaalt of minder krijgt elke inkomensgroep?". Zonder verschil blijft de grafiek het aandeel in de belasting; uitkeringen passen niet in "welk deel van de belasting".
- Wat erin zit: AOW (alleen het AOW-deel, niet het aanvullend pensioen), bijstand, WW en WIA, de vier toeslagen, kinderbijslag en basisinkomen. Uitkeringen tellen bruto, want de belasting erover staat al bij box 1; zo telt niets dubbel. Bij een netto gekoppelde uitkering vallen het bruto verschil en het verschil in belasting tegen elkaar weg.
- De engine geeft per huishouden een nieuw veld `uitkering` (bruto uitkeringen na netto-koppeling en na wat het basisinkomen vervangt; zit al in `bruto`). `belastingPerDeciel` telt per groep `ontvangen` op. Geen andere rekenregels, dus geen nieuwe modelversie; de golden tests blijven gelijk.
- Het totaal per groep komt dicht bij "Wie gaat erop vooruit of achteruit?", maar niet precies, omdat de groepen daar zijn ingedeeld met de box 3-belasting erin (zie de open vraag bij fase 27). (Gecorrigeerd in fase 31: hier stond dat ook de Zvw-bijdrage en het gedragseffect meetellen. Het gedragseffect staat standaard uit, dus het verschil komt alleen door de indeling.)
- Kleur: paars (`--ontvangen`, licht #9c6bc9, donker #9a52b8), naast box 1 en box 3 gecontroleerd op alle paren (kleurenblindheid, normaal zicht, contrast) in licht en donker.

## Fase 31: Belastingplan 2027 aangenomen in de Tweede Kamer

### D-083 Basispad 2027 is het aangenomen plan, zonder routes

De Tweede Kamer nam het Belastingplan 2027 op 12 november 2026 aan met 76 tegen 74 stemmen (Handelingen II 2026/27, nr. 24). Vraag van de eigenaar (13 november): 2027 bijwerken met het akkoord. Besluit van de eigenaar: de pagina "Belastingplan 2027" toont het aangenomen plan, zonder de drie routes (D-063, D-070). Die routes waren wijzigingen op het oude voorstel en zouden op het aangenomen plan dubbel tellen. Ze staan in de git-geschiedenis.

Wat er in de wet zit, naast het wetsvoorstel met de tweede nota van wijziging:

- **Derde nota van wijziging** (37 022, nr. 29, 4 november): de inflatiecorrectie voor 2027 wordt voor 59,8% toegepast in plaats van 48%, dus × 1,015548 in plaats van × 1,01248 (de € 347 miljoen uit de Kamerbrief van 3 november), en × 1,011661 voor de eerste schijfgrens. Ook de aftrek specifieke zorgkosten (per 2028) en de btw op sierteelt; die zitten niet in het model.
- **Vierde nota van wijziging** (37 022, nr. 51, 10 november): de schijfgrenzen met die indexatie: € 39.337 en € 80.819.
- **Amendement Grinwis c.s.** (nr. 42): eerste en tweede schijf −0,14 procentpunt, de verlaging van de ouderenkorting met € 100 vervalt, en de drie bedragen van de arbeidskorting stijgen € 17 in plaats van € 133.
- **Amendement Klaver en Dassen** (nr. 80, PRO en Volt): eerste schijf nog eens −0,25 procentpunt. Het lagere box 3-tarief (35,5%) en het toptarief van 38,5% gelden pas vanaf 2029; de bevroren schijfgrens in box 2 en de erf- en schenkbelasting zitten niet in het model.
- Niet voor 2027: amendement 78 (eerste schijf −0,03 procentpunt vanaf 2028), 73 (geen beperkte indexatie in 2028), en de amendementen over auto's, vliegbelasting en de WBSO.

Gevolg in `data/parameters/2027.yaml`:

- Tarieven 35,84% (8,19% belasting plus 27,65% premies volksverzekeringen) tot € 39.337, 38,02% tot € 80.819, daarboven 49,50%. Voor AOW'ers in de eerste schijf 17,94%. Officieel: vierde nota van wijziging plus de amendementen.
- Maximaal aftrektarief eigen woning 38,02%: dat beweegt mee met de tweede schijf. In D-070 bleef het bij de route nog 38,16%; dat was te voorzichtig.
- Heffingskortingen en het heffingsvrij vermogen in box 3: de bedragen van 2026 × 1,015548, naar boven afgerond op hele euro's. Zo komen ook de bedragen in tabel 1 en 2 van de memorie van toelichting uit (bijvoorbeeld € 3.115 × 1,01248 = € 3.153,87 → € 3.154). Dit blijft een raming tot de officiële bedragen in december: algemene heffingskorting € 3.164 (AOW'ers € 1.584, het deel zonder AOW-premie), arbeidskorting € 1.029 / € 5.400 / € 5.791 met knikken op € 12.151 en € 26.247, ouderenkorting € 2.100 tot € 46.718, alleenstaande ouderenkorting € 549, combinatiekorting maximaal € 2.927 vanaf € 6.336, heffingsvrij vermogen € 60.280. Afbouwpunten die aan het minimumloon hangen (€ 30.910 en € 47.834) blijven gelijk; de afbouw van de algemene heffingskorting is weer zo dat die nul is bij het toptarief (6,34% en 3,174%).

Effect ten opzichte van het oude basispad: het model geeft de overheid € 1,37 mld minder aan box 1 (de stukken: € 0,88 mld voor amendement 80 en € 0,35 mld voor de derde nota; amendement 42 is budgetneutraal). Wie werkt en € 46.000 verdient, houdt € 6 per maand meer over, bij € 120.000 € 12; AOW'ers € 16 tot € 23 (ouderenkorting); bij € 20.000 is het € 3 minder, omdat de arbeidskorting minder stijgt. De bijstand verandert niet (netto-koppeling).

De site: `aangenomen: true` in `verkiezing.yaml` (nieuw veld in het schema). De pagina, de home, "Volgende stap" op Jouw situatie en het deelplaatje spreken dan van het aangenomen plan in plaats van het plan van het kabinet en de routes; er is geen stap 2 meer. Geen andere rekenregels, dus geen nieuwe modelversie; de golden tests (2026) blijven gelijk.

Bijwerken: na de stemming in de Eerste Kamer (december) en als de officiële bedragen van de heffingskortingen er zijn.

## Fase 32: noot over box 3

### D-084 Box 3 in 2027 in één noot

Vraag van de eigenaar (13 november 2026): op sociale media ging rond dat iedereen met wat vermogen in box 3 veel meer gaat betalen. In twee zinnen op de pagina Belastingplan 2027 zetten wat er echt verandert.

- Nieuw, optioneel veld `noot` (titel en tekst) in `verkiezing.yaml`, getoond als opvallende kaart onder de uitleg.
- Inhoud: in 2027 blijft het forfaitaire stelsel met 36% en de tegenbewijsregeling; het heffingsvrij vermogen gaat naar ongeveer € 60.000 (€ 60.280, raming, D-083). Het tarief van 38,5% boven € 60.000 rendement per jaar (amendement 80) gaat met de rest van het nieuwe stelsel in op 1 januari 2029 (Belastingplan 2027, artikel III); volgens de toelichting van het amendement raakt het vrijwel alleen mensen met meer dan een miljoen euro vermogen.
- De zin over box 3 aan het eind van de uitleg is weg, zodat het niet dubbel staat.
- Aangepast op verzoek van de eigenaar (13 november 2026): de bijzin dat het hogere tarief "vrijwel alleen mensen met meer dan een miljoen euro vermogen" raakt, is weg uit de noot en de changelog; te politiek. De noot zegt alleen dat het tarief van 38,5% pas in 2029 komt.

## Fase 33: box 3 in 2029

### D-085 Rekenvoorbeeld box 3 op basis van werkelijk rendement

Wens van de eigenaar (13 november 2026): naast "Wat doet het plan met jou?" een blok voor 2029, met een invulveld voor je rendement, dat laat zien hoeveel belasting je dan betaalt. Geen volledige kolom 2029: de meeste bedragen voor 2029 zijn onbekend, en box 3 hangt dan af van je echte rendement, dat het model niet kent.

**Regels** (`data/vooruitblik/box3-2029.yaml`, schema en rekenregel in `regels/box3werkelijk.ts`):

- Wet werkelijk rendement box 3 (36 748, nr. 2; aangenomen door de Tweede Kamer op 12 februari 2026): het inkomen is het resultaat min € 1.800 heffingsvrij resultaat per persoon (artikel 5.2 en 5.40); rente en dividend zijn reguliere voordelen (artikel 5.7); een negatief resultaat telt als verlies voor zover het hoger is dan € 500 en wordt verrekend met latere jaren (artikel 5.65 en 5.67).
- Novelle uitbreiding vermogenswinstbelasting box 3 (37 053, aangenomen op 12 november 2026): alle financiële instrumenten vallen onder de vermogenswinstbelasting, dus koerswinst telt pas bij verkoop; de verkrijgingsprijs is de waarde op 1 januari 2029, dus winst van daarvoor blijft onbelast; bij banktegoeden is het rendement de rente. Ingang 1 januari 2029.
- Tarief 35,5%, boven € 60.000 per persoon 38,5% (Belastingplan 2027, artikel III, amendement 80). Partners verdelen in het voorbeeld gelijk; bij oplopende tarieven is dat het voordeligst.
- De Eerste Kamer moet over alle drie nog stemmen. Bedragen zonder inflatiecorrectie.

**Vergelijking met 2027:** het forfaitaire stelsel (`box3`), maar nooit meer dan 36% over het echte rendement, zonder heffingsvrij vermogen en met de koersstijging, ook als je niet verkoopt (tegenbewijsregeling; Belastingdienst, "Wat is mijn werkelijk rendement?").

**Invoer:** spaargeld en "beleggingen en tweede woning" uit de situatie; de bezoeker kiest rente op spaargeld, dividend en rente op beleggingen, koersstijging, en of hij de beleggingen in 2029 verkoopt. Startwaarden 1,5%, 2% en 5%: voorbeeldwaarden van Box1lab, geen voorspelling (in het databestand, met die toelichting). Schulden en de andere regels voor een tweede woning (vermogenswinst bij verkoop, huur) zitten niet in het voorbeeld; dat staat erbij. Zonder spaargeld en beleggingen staat er alleen een korte uitleg en de uitnodiging ze in te vullen.

**Opmaak:** naast stap 1 als er ruimte is (twee kolommen vanaf ongeveer 816 px voor de inhoud), anders eronder. Nieuw veld `box3Vooruitblik` (jaar) in `verkiezing.yaml`.

Voorbeeld (alleenstaand, € 40.000 spaargeld en € 150.000 beleggingen, 1,5% / 2% / 5%): 2027 € 2.474, 2029 € 639 zonder verkoop en € 3.302 als je verkoopt. De rekenregels van het model voor 2026 en 2027 veranderen niet: geen nieuwe modelversie, golden tests gelijk.

## Fase 34: verkoopbedrag

### D-086 Hoeveel je verkoopt in plaats van alles of niets

Wens van de eigenaar (13 november 2026): in het rekenvoorbeeld van D-085 een veld voor het bedrag dat je verkoopt, omdat bijvoorbeeld € 10.000 verkopen iets anders oplevert dan alles verkopen.

- Het vinkje "Ik verkoop mijn beleggingen" is vervangen door "Bedrag dat je in 2029 verkoopt (€)", standaard 0.
- Belast is alleen de winst op dat deel: de verkoopprijs min de verkrijgingsprijs. Voor wat je op 1 januari 2029 al had, is de verkrijgingsprijs de waarde op die dag (novelle 37 053, memorie van toelichting, paragraaf 2.2). Het voorbeeld verkoopt aan het eind van het jaar, dus het verkochte deel was op 1 januari verkocht / (1 + koersstijging) waard; winst = verkocht × koersstijging / (1 + koersstijging). Bij een koersdaling is het verlies.
- Meer verkopen dan de beleggingen aan het eind van het jaar waard zijn, kan niet; het voorbeeld rekent dan met die waarde en zegt dat erbij.
- In de uitleg staat nu ook: "verkoopprijs min de waarde op 1 januari 2029 (of je aankoopprijs als je later koopt)".
- Niet in het voorbeeld: verkopen na meer jaren groei, bijkopen tegen een andere prijs (gemiddelde verkrijgingsprijs) en kosten. Het blok blijft één jaar.

Voorbeeld: € 200.000 beleggingen, 2% dividend, 5% koersstijging, € 10.000 verkocht: € 476 winst, belasting 2029 € 950 (zonder verkoop € 781).

## Fase 36: later verkopen is later betalen

### D-087 Uitleg onder de uitkomst van box 3 in 2029

Wens van de eigenaar (13 november 2026): duidelijk maken dat je in jaren zonder verkoop alleen over rente en dividend betaalt, en in het jaar van verkoop over de opgebouwde winst. Niet in het blauwe vlak (dat gaat over 2027 en blijft kort), maar direct onder de uitkomst van het rekenvoorbeeld (D-085).

- Met een verkoop en koerswinst: "Hierin zit € … koerswinst, omdat je in 2029 verkoopt. In jaren dat je niets verkoopt, betaal je alleen over rente en dividend. Koerswinst wordt belast in het jaar dat je verkoopt, en dan over alle winst sinds 1 januari 2029, of sinds je de beleggingen kocht als dat later was. Wachten met verkopen betekent dus later betalen, niet minder."
- Zonder verkoop: "Je verkoopt niets, dus je betaalt alleen over rente en dividend. Verkoop je later, dan betaal je in dat jaar over alle winst sinds 1 januari 2029: wachten met verkopen betekent later betalen, niet minder."
- Bewust geen "dus heb je voordeel": of je over meerdere jaren samen meer of minder betaalt dan in het oude stelsel, hangt af van je rendement. Een berekening over meerdere jaren is voorgesteld maar nog niet gebouwd.

## Fase 37: rekenregels na de expertreview

### D-088 Fouten uit de review van model 0.5.0

Op 10 november 2026 heeft een expert (Fable 5.2, op verzoek van de eigenaar) de calculator gecontroleerd op commit 96176d4. De bedragen van 2026 klopten, op het AOW-vakantiegeld na; de fouten zaten in hoe regels samenwerken. De eigenaar vroeg de nodige wijzigingen door te voeren. Elke fout heeft een test in `packages/engine/test/review.test.ts`, met de huishoudens uit de review. Modelversie 0.6.0.

- **E1 Vakantiegeld op pensioen.** `jaarbedrag` deed bij elk maandbedrag behalve zzp 8% erbij, ook bij een pensioen; het vinkje stond daar niet. Nu alleen bij loon en bij WW of WIA. Een pensioen vul je in zoals het op je rekening komt. (Sommige fondsen betalen in mei apart vakantiegeld; de meeste niet. Wie dat heeft, kan het jaarbedrag invullen.)
- **E2 Afbouw over het verzamelinkomen.** De algemene heffingskorting bouwt sinds 2025 af over het verzamelinkomen, box 1 + 2 + 3 (Rijksoverheid, "Wat is een heffingskorting"); de ouderenkorting deed dat al (D-073 noemde het als gat). `box1Uitkomst` krijgt het box 3-inkomen mee voor de kortingen. Voorbeeld uit de review (€ 50.000 loon, € 100.000 spaargeld, € 150.000 beleggingen): € 502 meer belasting.
- **E3 Onbenutte kortingen tegen box 3.** Een heffingskorting is een belastingdeel en premiedelen, in de verhouding van het tarief in de eerste schijf: 8,10 / 35,75 belasting (Belastingdienst, Fiscale Informatie 2026, Heffingskortingen); voor AOW'ers 8,10 / 17,85. Alleen het belastingdeel kan van de belasting in box 3 af; het premiedeel alleen van de premies. Nieuwe parameter `box1.premieVolksverzekeringen` (27,65 in 2026 en 2027). De review noemde "tot € 3.115 per persoon"; dat is te veel, het is hoogstens het belastingdeel (€ 706). Geen inkomen en € 200.000 spaargeld: box 3 € 648 → € 0.
- **Partners.** Partners mogen het box 3-inkomen vrij verdelen (art. 2.17). Omdat de verdeling nu uitmaakt voor de kortingen, kiest het model de goedkoopste uit stappen van 5% en de punten waarop iemand zijn onbenutte korting precies opmaakt (`verdeelBox3`).
- **Hoe het in het resultaat staat.** `belasting` is de box 1-belasting zonder het effect van vermogen; `box3` is alles wat het vermogen kost: box 3-belasting na de onbenutte kortingen, plus de lagere kortingen door het box 3-inkomen. Zo blijft het bedrag bovenaan los van het vermogen (D-076). In het overheidssaldo staat de lagere korting daardoor bij "Box 3".
- **E4 Tariefsaanpassing** (Wet IB 2001, art. 2.10 lid 2 en 3): 11,94% over het laagste van de posten en het deel van belastbaar inkomen plus posten boven € 78.426. Posten: ondernemersaftrek, mkb-winstvrijstelling en de aftrekbare kosten van de eigen woning (art. 3.120), dus de rente. (a) Voor ondernemers ontbrak hij: zzp € 150.000 winst € 2.400 meer belasting. Nieuwe parameter `ondernemers.aftrekMaxTarief` (37,56; 2027 38,02), los van `eigenWoning.aftrekMaxTarief`, omdat voorstellen dat laatste op 0 zetten om de hypotheekrenteaftrek af te schaffen. (b) Bij de eigen woning ging hij over het saldo (rente − forfait − Hillen); nu over de rente. Het forfait wordt gewoon tegen het toptarief belast. Review-voorbeeld (€ 250.000, WOZ € 1,5 mln, € 30.000 rente): € 985 meer belasting. Nieuwe functie `tariefsaanpassing`; `aftrekbeperking` rekent nu met belastbaar inkomen en rente.
- **E5 Kinderopvangtoeslag** alleen als alle ouders soort "werk" hebben. Studie, trajecten en een zieke partner tellen in het echt ook; dat staat op de site. `Resultaat.beperkingen` zegt waarom, voor de uitleg op Jouw situatie.
- **E6 Huurtoeslag.** Alleen voor een zelfstandige woning (Wet op de huurtoeslag, art. 11 lid 1): nieuwe vraag "Ik huur een hele woning, met een eigen voordeur, keuken en toilet (geen kamer)", standaard aan (`zelfstandigeWoning`; bewaarde situaties krijgen die standaard). Is iedereen jonger dan 21 en zijn er geen kinderen, dan telt de huur tot € 498,20 (art. 13 lid 1 onder b; parameter `toeslagen.huurtoeslag.jongeren`; 2027 geraamd × 1,026). Niet: de uitzondering voor een handicap en aangewezen onzelfstandige woonvormen.
- **E7 AOW-leeftijd.** Vanaf de AOW-leeftijd krijgt iedereen AOW (volledige opbouw). Bij loondienst of zzp komt het loon of de winst erbij (`Lid.aowLeeftijd`): tarieven en kortingen voor AOW'ers, arbeidskorting over het loon, bijdrage Zvw alleen over de AOW (loondienst) of over alles (zzp), netto-koppeling en basisinkomen over het AOW-deel. Bijstand, WW en WIA stoppen bij de AOW-leeftijd: dan alleen AOW. De site noemt dat bij het veld.
- **E8 Vermogensgrens bijstand**: € 8.000 alleen, € 16.000 voor een paar of een alleenstaande ouder (Participatiewet art. 34; bedragen van gemeente Den Haag en Noardeast-Fryslân; Rijksoverheid had geen pagina met de bedragen). Spaargeld plus beleggingen min schulden; de eigen woning niet. Daarboven geen bijstand en een uitleg bij de uitkomst. 2027: raming gelijk aan 2026.
- **E9 AOW-vakantiegeld** per halfjaar: € 106,55 / € 76,10 tot juli (MAX Vandaag), € 104,78 / € 74,85 daarna (Knab). svb.nl was niet bereikbaar; nakijken staat in PROGRESS.
- **Meegevonden.** Het voordeel van de eigen woning (`eigenWoning`) telde de belasting van meerderjarige kinderen ten onrechte mee. In het saldo maakte dat niets uit, maar de verdeling tussen de posten "Box 1" en "Eigen woning" klopte niet: voorstellen die de hypotheekrenteaftrek afschaffen, kregen elk een ander bedrag bij "Eigen woning" (€ 4,65 / € 6,99 / € 6,47 mld). Nu is dat bij alle drie € 6,05 mld: wat de aftrek nu kost.

Niet gedaan uit de review: E10 en de punten voor de site staan in fase 38. De standaard "Onthoud op dit apparaat" blijft aan (D-077, besluit van de eigenaar).

**Gevolg voor de bevolking** (opnieuw herwogen; de doelen kloppen weer): box 1 € 149,5 → € 150,6 mld, waarvan € 0,25 mld de tariefsaanpassing voor ondernemers en ongeveer € 0,8 mld die voor de eigen woning (met een klein effect van het herwegen). Box 3 € 9,5 → € 9,9 mld: + € 0,46 mld lagere kortingen, − € 0,04 mld onbenutte kortingen. Kinderopvangtoeslag vóór herweging € 8,15 → € 8,14 mld: in de bevolking hebben bijna alleen werkende ouders opvang. Armoede 10,29% → 10,42%, kinderen 10,06% → 10,49%, Gini 0,2321 → 0,2317.

**Golden-verschillen** (saldo per jaar): vlaktaks 35% −€ 2,50 → −€ 3,69 mld (het huidige stelsel brengt € 1,0 mld meer op via de tariefsaanpassing en € 0,4 mld via box 3; de vlaktaks schaft beide af); 35/40/45% € 29,84 → € 28,84 mld (zelfde reden); zonder hypotheekrenteaftrek € 7,99 → € 7,56 mld en zonder aftrek en forfait € 6,90 → € 6,47 mld (de aftrek kost nu minder, door de tariefsaanpassing over de rente); hypotheekrenteaftrek 30% € 1,19 → € 1,67 mld (de tariefsaanpassing gaat nu over de hele rente, in alle schijven boven 30%); algemene heffingskorting + € 500 −€ 4,57 → −€ 4,53 mld; zonder huurtoeslag en toeslagen afschaffen gelijk. Oplosser vlaktaks: vrijstelling € 23.342 → € 23.035. Voorbeeldhuishoudens: P20 (AOW) door het vakantiegeld per halfjaar; P90 en P99 (eigen woning, toptarief) € 272 en € 501 meer belasting.

## Fase 38: Jouw situatie na de expertreview

### D-089 Duidelijker, toegankelijker en neutraler

De punten uit dezelfde review (D-088) over de site. Bouwt voort op fase 37.

- **E10 Twee keer "Te besteden".** Bovenaan staat wat je overhoudt zonder zorgpremie en box 3 (D-076, D-079); de curve liet het besteedbaar inkomen zien (€ 36.268 tegen € 38.152 in het voorbeeld). De curve laat nu hetzelfde bedrag zien ("Wat je overhoudt", `Curve.over`). Op de pagina van het Belastingplan staat een regel "Premie zorgverzekering", heet het totaal "Te besteden na zorgpremie" en zegt de toelichting waarom het lager is dan bovenaan. Daar blijft het besteedbaar inkomen staan, omdat het verschil tussen de jaren ook box 3 en de premie moet meetellen.
- **Het antwoord vooraan.** Het bedrag per maand is het grootste getal (44px), met "Je houdt per maand over om van te leven" erboven en het jaarbedrag eronder; de kerngetallen zijn kleiner (26px). Alleen deze regel heeft `aria-live`, niet de hele uitkomst.
- **Fouten in de invoer.** De melding zegt welk veld niet klopt (bijvoorbeeld "Vul de leeftijd in, tussen 15 en 110 jaar."), en de uitkomst van de laatste goede invoer blijft staan.
- **Voorstellen.** Naast elk voorstel staat wat het de overheid per jaar kost of oplevert (uit dezelfde doorrekening als de voorstellenpagina), ook op een telefoon (op een eigen regel). De staven hebben één kleur; plus en min staan bij het getal. Zo zie je wat je zelf wint of verliest niet los van de rekening.
- **Grafieken.** Een stippellijn bij 50% marginale druk, met het gebied erboven licht gekleurd; de uitleg zegt nu dat "armoedeval" voor lage inkomens geldt. Beide lijngrafieken hebben een tabel (elf punten) en een beschrijving met jouw getal.
- **Teksten.** "€ 100 bruto per maand erbij (plus vakantiegeld)" als er vakantiegeld bovenop komt; "Een dag per week minder werken"; "Een baby erbij, zonder kinderopvang", niet bij de AOW-leeftijd. Bij 2027: "Bij hetzelfde bruto inkomen; prijzen stijgen ook, dus dit is geen koopkrachtcijfer." Bij alleen bijstand: wat je netto krijgt, niet bruto en belasting. "Je plek in Nederland (schatting)", "ongeveer …%". Onderaan een lijst wat er niet in zit, afhankelijk van de invoer, met de regels en de modelversie. In het formulier: "Vakantiegeld komt er nog bij (8%)", "Huur per maand, zonder servicekosten", een hint naar bijstand bij geen inkomen, "Klopt dit?" boven € 50.000 per maand, kortere privacytekst en de bijstandsuitleg in korte zinnen.
- **Toegankelijkheid.** Randen van invoervelden `--rand-invoer` (3,7:1 licht, 3,6:1 donker; was 1,35:1). De knoppen Alleen/Met partner en Huur/Koop zijn een groep met `aria-pressed` (geen radiogroep meer). Kleine tekst in het formulier 14px.
- **Privacy en techniek.** Een Content-Security-Policy `connect-src 'self'`, en `npm run schermafdrukken` faalt als een pagina iets bij een andere site ophaalt. De deploy draait nu dezelfde controles als CI vóór de build. De kop van `2026.yaml` zei dat alles tegen officiële bronnen was gecontroleerd; nu staat er dat sommige bedragen uit de pers komen.

**Niet gedaan, voor de eigenaar** (in PROGRESS): standaard niet onthouden (D-077 is een besluit van de eigenaar); meer voorbeelden van de andere kant bij de voorstellen, of de keuze uitleggen (politieke keuze); fouten melden zonder GitHub (e-mail of formulier is een externe dienst); "weet ik niet" bij de pensioenpremie. Ook niet: een andere schaal voor "Je plek in Nederland" (V1; de CBS-factoren zijn niet gecontroleerd), een rand om het scrollende formulier, een andere kleur voor belasting in de waterval en vertraagd rekenen; die zijn klein of niet gemeten.
