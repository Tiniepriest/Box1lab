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
