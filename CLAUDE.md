# Werkinstructies voor Claude Code

Lees eerst `docs/PROGRESS.md` (waar staan we) en `docs/DECISIONS.md` (wat is al besloten). Het volledige plan staat in `HANDOFF.md`.

## Commando's

| Commando                          | Wat                                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm test`                        | Alle tests (Vitest)                                                                             |
| `npm run lint`                    | ESLint                                                                                          |
| `npm run format` / `format:check` | Prettier                                                                                        |
| `npm run typecheck`               | `tsc` voor de engine en `astro check` voor de site                                              |
| `npm run build`                   | Bouwt de site naar `site/dist`                                                                  |
| `npm run dev`                     | Lokale ontwikkelserver                                                                          |
| `npm run valideer`                | Controleert alle databestanden en toont waarden zonder bron                                     |
| `npm run kalibreer`               | Maakt en herweegt de populatie (`data/populatie/<jaar>.json`) en schrijft het kalibratierapport |
| `npm run kalibreer:controle`      | Controleert (in CI) of de populatie actueel is                                                  |
| `npm run golden`                  | Schrijft de kerncijfers naar het golden-bestand (na een bewuste wijziging)                      |
| `npm run vergelijk`               | Vergelijkt de engine met de prototype-baseline                                                  |
| `npm run schermafdrukken`         | Bouw eerst; controleert de site in Chrome en maakt schermafdrukken                              |
| `npm run ci`                      | Alles wat CI doet, in volgorde                                                                  |

Node 24 (`.nvmrc`). npm-workspaces: `packages/engine` en `site`.

## Onderhoudbaarheid (eis van de eigenaar)

Nieuwe tarieven en nieuwe regelingen moeten makkelijk toe te voegen zijn.

- **Geen bedragen, grenzen of percentages in code.** Alles staat in `data/parameters/<jaar>.yaml` met een `bron`. Een getal in de engine dat geen wiskundige constante is, is een bug.
- **Elke regeling is één module** met een eigen sectie in het parameterbestand, een eigen schema en eigen tests.
- **Een scenario, preset of partij is een diff op een parameterset**, zodat een jaarlijkse update daar vanzelf in meegaat.
- **Schemavalidatie in CI.** Een fout in een YAML-bestand laat de build falen met een leesbare melding.
- Werk `docs/JAARLIJKSE-UPDATE.md` en `docs/NIEUWE-REGELING.md` bij als het proces verandert.

## Conventies

- Code en identifiers mogen Engels of Nederlands zijn; domeintermen in het Nederlands (`zorgtoeslag`, `heffingskorting`, `drempelinkomen`). UI-tekst altijd Nederlands, B1-niveau.
- De engine is puur: geen DOM, geen UI, geen I/O. De UI bevat nooit eigen rekenregels.
- `prototype/` en `HANDOFF.md` niet aanpassen.
- Verzin nooit bedragen of bronnen. Geen officiële bron gevonden: `TODO: bron nodig` en noemen in `PROGRESS.md`.
- Na elke enginewijziging: golden tests vergelijken en elk verschil verklaren in `DECISIONS.md`.

## Git

- Eén branch en pull request per fase (`fase-N-...`). De eigenaar merget; niet zelf naar `main` mergen.
- Een volgende fase mag verder bouwen op de branch van de vorige; vermeld dat in de PR.
- Commits als `Tiniepriest <127693624+Tiniepriest@users.noreply.github.com>` (staat in de lokale git-config). De repo is openbaar: nooit een persoonlijk e-mailadres in commits.

## Stop en vraag de eigenaar bij

Naam en domein van de site, analytics, echte partijdata, uitbreiding naar zorg/btw/box 3, alles wat geld kost of een externe dienst vereist, afwijken van de fasering, de licentie.
