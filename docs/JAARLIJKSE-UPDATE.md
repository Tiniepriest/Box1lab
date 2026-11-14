# Jaarlijkse update

Twee keer per jaar veranderen de cijfers: rond **Prinsjesdag** (september, voorlopige bedragen voor volgend jaar) en in **januari** (definitieve bedragen). Voor deze update hoef je niet te kunnen programmeren.

## Stappen

### 0. Voorlopig jaar (na Prinsjesdag)

Na Prinsjesdag liggen de plannen voor het nieuwe jaar er, maar nog niet alle bedragen. Je kunt dan al een parameterbestand maken met `status: voorlopig` en een `toelichting` (zie `data/parameters/2027.yaml` als voorbeeld). Vul in wat officieel bekend is (Belastingplan, memorie van toelichting, nota's van wijziging, de begrotingen, wetteksten met een "toekomstige tekst" op wetten.overheid.nl). Heeft een bedrag een wettelijke indexatieregel met een bekende factor, raam het dan en begin de bron met `Raming:` plus de berekening (D-065). Laat de rest op het oude bedrag staan met `TODO: bron nodig` in de bron.

Vaste regels voor de ramingen:

| Bedrag                                          | Raming                                                                        | Officieel                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------- |
| Drempelinkomen toeslagen                        | 108% × 12 × referentiemaandloon per 1 januari (regeling minimumloon, oktober) | al in oktober              |
| Standaardpremie, nominale premie, Zvw-bijdrage  | Rijksbegroting VWS, tabel "Premieoverzicht Zvw"                               | november                   |
| Huurtoeslag, kindgebonden budget, kinderbijslag | × tabelcorrectiefactor (memorie van toelichting Belastingplan)                | eind november tot december |
| AOW, bijstand                                   | bedrag per 1 juli + stijging referentiemaandloon per 1 januari                | december                   |
| Vermogensgrens bijstand                         | grens van dit jaar (wordt per 1 januari geïndexeerd)                          | december                   |
| Huurgrens jongeren (huurtoeslag)                | × tabelcorrectiefactor, net als de huurgrens                                  | eind november              |

`npm run valideer` toont alle ramingen, zodat je ze kunt vervangen als de officiële bedragen er zijn. De site laat dan "Wat verandert er?" zien, met een duidelijke melding dat het voorlopig is en welke bedragen nog ontbreken: op de pagina van de verkiezing of het Belastingplan als stap 1 als die pagina dat jaar als basispad heeft, anders op Jouw situatie (D-064). Kalibratie en bevolking hoeven dan nog niet.

Zijn alle bedragen definitief, werk dan het bestand af volgens de stappen hieronder, zet `status: definitief` en haal de `toelichting` weg.

### 1. Nieuw parameterbestand

Kopieer het bestand van het vorige jaar:

```
data/parameters/2026.yaml  →  data/parameters/2027.yaml
```

Pas bovenaan `jaar: 2027` aan. Loop daarna elke sectie langs en vul de nieuwe bedragen in. Werk bij elke sectie ook de `bron` bij (een link naar de Belastingdienst, rijksoverheid.nl, CBS of CPB). Vergeet `loon.modaal` niet: het bruto modaal inkomen uit de kerngegevens van de nieuwste MEV of het CEP van het CPB; het voorbeeldhuishouden op de site verdient dat. Ook makkelijk te vergeten (D-088): `box1.premieVolksverzekeringen` (de premies in het tarief van de eerste schijf), `ondernemers.aftrekMaxTarief` en `eigenWoning.aftrekMaxTarief` (allebei het tarief van de tweede schijf), het AOW-vakantiegeld per halfjaar, `bijstand.vermogensgrens` en `toeslagen.huurtoeslag.jongeren`.

Let op de schrijfwijze, die bovenaan het bestand staat:

| Officieel                    | In het bestand                                   |
| ---------------------------- | ------------------------------------------------ |
| 35,75%                       | `35.75`                                          |
| € 3.115                      | `3115`                                           |
| afbouw 6,398% vanaf € 29.736 | `{ vanaf: 29736, bedrag: 3115, tarief: -6.398 }` |

Weet je een bedrag niet zeker? Laat de oude waarde staan en zet in de `bron`: `TODO: bron nodig`. `npm run valideer` toont dan een waarschuwing, zodat het niet vergeten wordt.

### 2. Kalibratiedoelen

Kopieer `data/kalibratie/<jaar>.yaml` en `data/populatie/spec-<jaar>.yaml` naar het nieuwe jaar en werk de doelen bij. Elke sectie noemt haar bron:

| Doel                                               | Waar te vinden                                                    |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| Huishoudens per samenstelling en leeftijd          | CBS StatLine 71486ned (1 januari van het jaar)                    |
| Koop, corporatie, particuliere huur                | CBS StatLine 82900NED                                             |
| Decielgrenzen besteedbaar inkomen                  | CBS StatLine 83934NED (nieuwste jaar)                             |
| Huurwaarde eigen woning, hypotheekrente, belasting | CBS StatLine 84493NED (nieuwste jaar)                             |
| Pensioenpremie werknemers, winst zelfstandigen     | CBS StatLine 84493NED, posten 11.4.1.1 en 2.1                     |
| Indexatie naar het modeljaar                       | CPB, kerngegevenstabel van de nieuwste MEV (cao-loon marktsector) |
| Ontvangers en uitgaven per toeslag                 | Dienst Toeslagen, Aantallen en bedragen (overtoeslagen.nl)        |
| Controle belastingopbrengst                        | Miljoenennota, bijlage belasting- en premieontvangsten            |

### 3. Controleren

```
npm run valideer
```

Dit controleert alle bestanden. Een fout ziet er bijvoorbeeld zo uit:

```
FOUT  data/parameters/2027.yaml: toeslagen.zorgtoeslag.drempelinkomn — Unrecognized key
```

Dat betekent: in de sectie `toeslagen` → `zorgtoeslag` staat een sleutel `drempelinkomn` die niet bestaat (tikfout voor `drempelinkomen`).

### 4. Kalibreren en testen

```
npm run kalibreer    # maakt de populatie en het kalibratierapport
npm test
npm run golden       # legt de nieuwe kerncijfers vast
```

Golden tests die wijzigen door de nieuwe cijfers zijn verwacht. Leg in de pull request uit wat er verandert en waarom.

### 5. Afronden

Voeg bovenaan `data/changelog.yaml` een regel toe met `soort: cijfers`, bijvoorbeeld:

```yaml
- datum: 2027-01-02
  soort: cijfers
  titel: Cijfers van 2027
  tekst: >-
    Nieuwe tarieven, heffingskortingen en toeslagen voor 2027, en een opnieuw gewogen bevolking.
```

De site toont hem op `/wijzigingen`, en de datum komt onderaan elke pagina als "bijgewerkt". Open een pull request en merge na groene CI. De site wordt automatisch bijgewerkt.

## Wat gaat vanzelf mee

Presets (`data/presets/`) en partijplannen (`data/verkiezingen/`) beschrijven alleen **wijzigingen** op de parameters. Ze hoeven bij een nieuw jaar niet te worden aangepast, tenzij een regeling verdwijnt of een andere naam krijgt. `npm run valideer` meldt dat dan.
