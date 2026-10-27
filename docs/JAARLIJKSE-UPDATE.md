# Jaarlijkse update

Twee keer per jaar veranderen de cijfers: rond **Prinsjesdag** (september, voorlopige bedragen voor volgend jaar) en in **januari** (definitieve bedragen). Voor deze update hoef je niet te kunnen programmeren.

## Stappen

### 1. Nieuw parameterbestand

Kopieer het bestand van het vorige jaar:

```
data/parameters/2026.yaml  →  data/parameters/2027.yaml
```

Pas bovenaan `jaar: 2027` aan. Loop daarna elke sectie langs en vul de nieuwe bedragen in. Werk bij elke sectie ook de `bron` bij (een link naar de Belastingdienst, rijksoverheid.nl, CBS of CPB).

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
