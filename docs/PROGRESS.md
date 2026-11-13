# Voortgang

## Fase 0: Opzet — klaar (PR #1)

- [x] Repository-structuur (§6), npm-workspaces
- [x] Astro + Svelte + TypeScript, lege homepagina met designtokens en donkere modus
- [x] ESLint, Prettier, Vitest
- [x] CI (lint, format, typecheck, test, build) op elke push en pull request
- [x] Deploy naar GitHub Pages bij elke push naar `main`
- [x] `CLAUDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`
- [x] `prototype/` ongewijzigd toegevoegd
- [ ] Lege site online: gebeurt automatisch zodra de eigenaar PR #1 merget

## Fase 1: Engine naar TypeScript — klaar (PR #2)

- [x] `packages/engine`: één module per regeling, metrics apart, simulatie, oplosser, inkomenscurves
- [x] Alle getallen in `data/parameters/2026.yaml`, `data/kalibratie/2026.yaml`, `data/populatie/spec-2026.yaml`
- [x] Schemavalidatie met leesbare foutmeldingen; `npm run valideer` in CI
- [x] Scenario's als lijst wijzigingen; 6 presets in `data/presets/`
- [x] Pariteit met het prototype: alle cijfers uit HANDOFF §2, plus exacte golden tests op posten, decielen, voorbeeldhuishoudens, curves en oplosser
- [x] Eigenschapstests (huidig = nul verschil, netto stijgt met bruto, niveau-knoppen), prestatie: 2,6 ms per scenario
- [x] `docs/JAARLIJKSE-UPDATE.md` en `docs/NIEUWE-REGELING.md`

## Fase 2: Engine correct maken — klaar (PR #3)

- [x] Alle bedragen 2026 gecontroleerd tegen officiële bronnen (Belastingdienst, Dienst Toeslagen, SVB, Rijksoverheid); zie D-014
- [x] Zorgtoeslag, huurtoeslag (nieuwe lineaire methode 2026), kindgebonden budget en kinderopvangtoeslag exact volgens de rekenpublicaties 2026, getest met hun rekenvoorbeelden
- [x] AOW-varianten van arbeids- en combinatiekorting, alleenstaande-ouderenkorting, ouderenkorting gecorrigeerd
- [x] Eigenwoningforfait-tabel, villataks, Wet Hillen, aftrekbeperking; eigen woning in het belastbaar en toetsingsinkomen
- [x] Netto-koppeling per uitkeringssoort; Zvw-bijdrage AOW'ers; kinderbijslag naar leeftijd
- [x] Unit tests per regeling (50), golden tests op de nieuwe engine, eigenschapstests inclusief bekende armoedeval-punten
- [x] Verschillen met de prototype-baseline verklaard (D-020)
- [x] Bekend probleem (te veel toeslag in de populatie) opgelost in fase 3

## Fase 3: Populatie en kalibratie — klaar (PR #4)

- [x] Populatie offline gegenereerd uit de CBS-huishoudenscellen 2026 (4.024 huishoudens) en herwogen met begrensde raking naar 32 marges (CBS, Dienst Toeslagen); `npm run kalibreer`
- [x] Kalibratierapport `docs/kalibratie-2026.md`
- [x] Alle schaalfactoren 1,00 (eis 0,9–1,1); decielgrenzen besteedbaar inkomen binnen 0,2% van CBS (eis 5%)
- [x] Meerderjarige thuiswonende kinderen met eigen inkomen, belasting en zorgtoeslag
- [x] Kalibratiedoelen vervangen door officiële bronnen; hypotheekrente uit CBS
- [x] CI controleert of de populatie actueel is (`npm run kalibreer:controle`)

## Fase 4: Site MVP — klaar (PR #5)

- [x] Pagina's Home, Jouw situatie, Scenariolab, Methodiek, Over
- [x] Gedeeld invoerformulier (§3.3) met privacy, lokaal onthouden en wissen
- [x] Calculator: waterval bruto → netto, marginale en effectieve druk, € 100 extra, curves, plek in Nederland
- [x] Lab met alle functies van het prototype; scenario delen via de link; rekenen in een Web Worker
- [x] Methodiek met automatisch kalibratierapport en bronnenlijst uit het parameterbestand
- [x] Lighthouse 98–100 op alle pagina's; 375 px zonder horizontaal scrollen; licht en donker gecontroleerd
- [x] Browsercontrole en schermafdrukken in CI

## Fase 5: Content en delen — klaar (PR #6)

- [x] Voorstellengalerij met 8 voorstellen, elk met eigen pagina, uitleg en "open in het lab"
- [x] 5 uitlegartikelen met interactief voorbeeld
- [x] Deelafbeeldingen (Open Graph) per voorstel en algemeen
- [x] Scenario vergelijken met een voorstel
- [x] Browsercontrole uitgebreid naar alle nieuwe pagina's; Lighthouse 99–100

## Fase 6: Verkiezingsmodule — klaar (PR #7)

- [x] Schema per partij met bron (paginanummer), zekerheid en toelichting; controle in CI, ook voor concepten
- [x] Vier-ogen-principe: `gepubliceerd` alleen met controleur; previewbuild voor concepten
- [x] Pagina per verkiezing: effect op jouw huishouden per maatregel, bronnen, niet meegenomen, macrobeeld en effect per inkomensgroep
- [x] Methodiek in `docs/METHODIEK-VERKIEZINGEN.md`
- [x] Alleen fictieve testpartijen; pagina niet in het menu en `noindex`

## Fase 7: Afronding — klaar (PR #8)

- [x] Changelog-pagina `/wijzigingen` uit `data/changelog.yaml`, gecontroleerd tegen de modelversie
- [x] "Meld een fout" met een ingevuld GitHub-formulier, onderaan elke pagina en bij alle uitkomsten
- [x] Besluiten eigenaar vastgelegd: geen analytics, geen licentie, GitHub Pages (D-049 t/m D-051)

## Fase 8: verbeterlijst van de eigenaar — bezig

Punten 1–8 en 10–13 uit de lijst van 27 oktober 2026 (9, netto invullen, valt af).

- [x] 8a: "weet ik niet" weg (2), extra per jaar (3), zzp zonder vakantiegeld (4), "anders" weg (5), situatie onthouden per tabblad met nieuwe privacytekst (7b), sitemap (12), bron overige aftrekposten (13)
- [x] 8b: bijstandsnorm (1), zzp-aftrekposten (8), pensioenpremie (6), herweging
- [x] 8c: jouw situatie in lab, voorstellen en calculator (7, 11)
- [x] 8e: pensioenpremie zelf invullen; in de bevolking volgens CBS per inkomensgroep en leeftijd (D-062)
- [x] 8d: cijfers 2027 (10), voorlopig. Bijwerken als de definitieve bedragen er zijn (november en december 2026), zie D-061

## Fase 9: Belastingplan 2027, twee routes — klaar

- [x] Verkiezingsmodule geschikt voor routes naar een akkoord (D-063)
- [x] Pagina `/verkiezingen/belastingplan-2027` met de routes PRO en Volt en JA21, BBB en SGP; link op de home
- [ ] Bijwerken na het debat (4 november), een akkoord en de stemming (12 november)

## Fase 10: indeling van de site — klaar

Voorstellen van 2 november 2026, alle goedgekeurd (D-064).

- [x] 10a: menu in twee lagen met tabbladen, "Belastingplan 2027" in het menu, Voorstellen onder het Scenariolab
- [x] 10b: je situatie links op elk tabblad (kolom "Gerekend met jouw situatie", op een telefoon een balk bovenaan)
- [x] 10c: één pagina voor 2027 (stap 1 kabinetsplan, stap 2 routes), volgende stap op Jouw situatie, hoofdknop op de home

## Fase 11: verbeteringen na een kritische blik — klaar

Punten 1, 2, 3, 6, 7 en 9 van 2 november 2026 (4, 5 en 8 niet).

- [x] 11a: bedragen 2027 geraamd met de wettelijke indexatie (3, D-065). Bijwerken als de officiële bedragen er zijn (november en december 2026)
- [x] 11b: uitkomst in beeld op een telefoon (1), modaal als voorbeeld (2), deelplaatje en deelknop (6), titels voor zoekmachines (7), lichtere pagina Jouw situatie (9) (D-066)

## Fase 12: vlaktaks als voorbeeld — klaar

- [x] Vlaktaks 35% boven € 24.000 in plaats van 40% boven € 18.000, oud adres stuurt door (D-067)

## Fase 13: de top van de inkomensverdeling — klaar

- [x] Topinkomens volgens CBS: Pareto-staart in de bevolking, herweging op personen boven € 100.000 en € 200.000, hun inkomen en de winst van zelfstandigen (D-068)

## Fase 14: nieuw uiterlijk — klaar

- [x] Stijl "Papier": warm papier, vlakken zonder rand, Source Serif 4 en Inter, ook in donkere modus (D-069)
- [x] Groen voor erop vooruit, rood voor erop achteruit, gecontroleerd op kleurenblindheid (D-069)

## Fase 15: Belastingplan 2027 bijgewerkt — klaar

Voorstellen 8, 9 en 10 van 2 november 2026, bijgewerkt met de Kamerbrief van 3 november (D-070).

- [x] Stap 1 per onderdeel: waar komt het verschil tussen 2026 en 2027 vandaan
- [x] Derde route: het kabinet met ChristenUnie en 50PLUS (amendement Grinwis en Van Brenk, € 347 miljoen koopkracht)
- [ ] Bijwerken na het debat (4 november) en de stemming (12 november): basispad wordt wat is aangenomen

## Fase 16: scenariolab — klaar

Voorstellen 1, 2 en 14 van 2 november 2026 (D-071).

- [x] Negatieve belasting (Friedman) als knop
- [x] Basisinkomen per volwassene als knop, zo simpel mogelijk
- [x] Lab zonder blokken vol nullen zolang er niets veranderd is

## Fase 17: wat als — klaar

- [x] "Wat als…?" op Jouw situatie: opslag, een dag minder werken, samenwonen, een kind erbij (voorstel 13, D-072)

## Fase 18: box 3 — klaar

Voorstellen 11 en 12 van 2 november 2026 (D-073).

- [x] Box 3 (forfaitair) in de berekening, 2026 en 2027; spaargeld, beleggingen en schulden apart in het formulier
- [x] Vermogen in de nagebootste bevolking volgens CBS; box 3-knoppen in het lab
- [ ] Bijwerken als het nieuwe box 3-stelsel (uiterlijk 2029) vastligt, en de percentages 2027 officieel zijn

## Fase 19: loonstrook — klaar

- [x] Netto maandloon, en vakantiegeld, 13e maand en bonus apart, om met de loonstrook te vergelijken (D-074)

## Fase 20: hypotheekrente per maand — klaar

- [x] Hypotheekrente per maand invullen, met een rekenhulp uit schuld en rentepercentage (D-075)

## Fase 21: box 3 apart van wat je overhoudt — klaar

- [x] Het bedrag bovenaan Jouw situatie zonder box 3-belasting; box 3 als eigen regel eronder (D-076)

## Fase 22: situatie onthouden — klaar

- [x] Standaard onthouden op dit apparaat; uitzetten kan (D-077)

## Fase 25: van bruto naar wat je overhoudt — klaar

- [x] Bruto inkomen, betaalde belasting en zorgverzekering (en toeslagen) boven de zin bovenaan (D-078)

## Fase 27: wie betaalt de belasting? — klaar

- [x] Staafgrafiek box 1 en box 3 per inkomensgroep in het Scenariolab, met vinkjes voor box 1 en box 3 en een streepje voor nu (D-080)
- [ ] Vraag aan de eigenaar: de decielen overal zonder de box 3-belasting indelen? (zie D-080)

## Fase 29: verschil met nu — klaar

- [x] "Verschil met nu" in de grafiek over wie de belasting betaalt: per huishouden per jaar (D-081)

## Fase 30: uitkeringen en toeslagen in het verschil — klaar

- [x] Derde laag "Uitkeringen en toeslagen" bij "Verschil met nu" (D-082)

## Fase 31: Belastingplan 2027 aangenomen — klaar

- [x] 2027 volgens het plan dat de Tweede Kamer op 12 november aannam: derde en vierde nota van wijziging, amendementen 42 en 80 (D-083)
- [x] Pagina "Belastingplan 2027" zonder routes; tekst over het aangenomen plan op de pagina, de home, Jouw situatie en het deelplaatje
- [x] Correctie in D-082: het verschil met "Wie gaat erop vooruit" komt alleen door de indeling in groepen
- [ ] Na de stemming in de Eerste Kamer (december) en de officiële bedragen van de heffingskortingen: ramingen vervangen

## Open vragen voor de eigenaar

- Echte partijdata voor een verkiezing: welke verkiezing, en wie controleert (vier ogen)?
- Advertenties: de eigenaar wil die misschien later. Eerst beslissen hoe, zonder tracking en zonder de neutraliteit te schaden (D-049).
- Tekst van de pagina Over: wie zit erachter? Nu staat er alleen dat het project open en neutraal is.

## TODO: bron nodig

`npm run valideer` toont de actuele lijst, en ook de ramingen die nog vervangen moeten worden. Op dit moment alleen in `data/parameters/2027.yaml` (voorlopig, D-061 en D-065).
