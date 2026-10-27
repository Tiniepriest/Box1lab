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
