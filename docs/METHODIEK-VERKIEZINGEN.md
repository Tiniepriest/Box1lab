# Methodiek verkiezingsmodule

Hoe we verkiezingsprogramma's vertalen naar het model. Deze regels gelden voor **elke partij op dezelfde manier**. Wijk je ervan af, leg dat dan vast in `docs/DECISIONS.md` en pas het toe op alle partijen.

> Echte partijen komen er pas in na akkoord van de eigenaar (HANDOFF §10). Tot dan staan er alleen fictieve testpartijen in `data/verkiezingen/voorbeeld/`.

## Bestanden

```
data/verkiezingen/<verkiezing>/verkiezing.yaml   naam, datum, basispad
data/verkiezingen/<verkiezing>/<partij>.yaml     één bestand per partij
```

Het schema staat in `packages/engine/src/verkiezing.ts`. `npm run valideer` (in CI) controleert elk bestand: bestaan alle parameters, heeft elke maatregel een bron met paginanummer, klopt het vier-ogen-principe, en levert het programma een geldige parameterset op.

## Basispad

Het vergelijkingspunt is het **vastgestelde beleid voor het eerste kabinetsjaar** volgens de CPB-raming voor de verkiezingen (HANDOFF §4.3). Zolang dat parameterbestand er niet is, gebruiken we het huidige jaar, en de site zegt dat er duidelijk bij (`basispad.toelichting`).

## Vertaalregels

1. **Bedrag of percentage genoemd** → modelleren zoals genoemd. Zekerheid `hoog`.
2. **Richting zonder bedrag** ("de huurtoeslag gaat flink omhoog") → **niet modelleren**; zet de maatregel onder `niet_gemodelleerd`. Uitzondering: het CPB noemt in Keuzes in Kaart een bedrag; dan dat bedrag gebruiken, met het CPB als bron.
3. **Bedrag genoemd, uitwerking onduidelijk** (bijvoorbeeld "heffingskorting + € 300" zonder te zeggen hoe de afbouw verandert) → de eenvoudigste lezing die het genoemde bedrag oplevert. Zekerheid `middel`, met een `toelichting` die de keuze uitlegt.
4. **Maatregel buiten het model** (btw, eigen risico, box 3, huurprijzen, werkgeverslasten) → onder `niet_gemodelleerd`, met een korte reden.
5. **Gefaseerde invoering** → het bedrag dat in het eerste kabinetsjaar geldt.
6. **Tegenfinanciering zonder concrete maatregel** ("we halen het geld op bij grote bedrijven") → niet modelleren.
7. **CPB en programma verschillen** → het CPB is leidend, met het CPB als bron.

Zekerheid `middel` of `laag` vereist altijd een `toelichting`; de build faalt anders.

## Vier-ogen-principe

- Iedereen mag een partij toevoegen met `status: concept`.
- Een tweede persoon controleert elke maatregel tegen de bron en zet `status: gecontroleerd`.
- Na akkoord van de eigenaar: `status: gepubliceerd` en `gecontroleerd_door: <naam of initialen>`. De build weigert `gepubliceerd` zonder controleur.
- De site toont alleen gepubliceerde partijen. Een previewbuild met concepten maak je met `PUBLIC_VERKIEZINGEN_PREVIEW=1 npm run build`.

## Een partij toevoegen

1. Kopieer een bestaand partijbestand en geef het de naam `<partij-id>.yaml`.
2. Vul `programma` in (titel, link, datum geraadpleegd) en eventueel `bronnen` (bijvoorbeeld de CPB-doorrekening).
3. Voeg per maatregel toe: wat het is, welke parameter, de wijziging (`plus`, `factor` of `zet`), de bron met paginanummer en zo mogelijk een citaat, en de zekerheid. Raakt één belofte meerdere parameters (bijvoorbeeld beide knikken van een heffingskorting), gebruik dan een lijst `wijzigingen` met per regel een `parameter` en `wijziging`; de site toont het dan als één maatregel.
4. Zet niet-modelleerbare punten onder `niet_gemodelleerd`.
5. `npm run valideer`, pull request, controle door een tweede persoon.

Welke parameters er zijn, zie je in `data/parameters/<jaar>.yaml`. Ontbreekt er een (bijvoorbeeld voor een nieuwe regeling)? Zie `docs/NIEUWE-REGELING.md`.

## Weergave (HANDOFF §4.1)

- Standaard alfabetisch, met een knop om op uitkomst te sorteren.
- Winst blauw, verlies oranje; geen partijkleuren of logo's.
- Per partij: de maatregelen met hun effect op jouw huishouden, de bronnen, de zekerheid, wat niet is meegenomen, en het macrobeeld (saldo, armoede, Gini, effect per inkomensgroep).
- Een duidelijke disclaimer: vereenvoudigde doorrekening, geen stemadvies, het CPB is leidend.
