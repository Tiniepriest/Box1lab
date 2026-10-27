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
