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

## Fase 4: Site MVP — bezig

## Open vragen voor de eigenaar

- Licentie van de broncode (bijvoorbeeld MIT voor code en CC BY voor teksten). Nog niet gekozen; er staat geen LICENSE-bestand.
- Naam en domein van de site.

## TODO: bron nodig

`npm run valideer` toont de actuele lijst. Na fase 3:

- `overigeAftrekposten`: vaste schatting van € 4 mld uit het prototype
