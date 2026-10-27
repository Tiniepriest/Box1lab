# data/

Alle cijfers van het model staan hier, los van de code. Je hoeft niet te kunnen programmeren om ze bij te werken.

| Map                                       | Inhoud                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `parameters/<jaar>.yaml`                  | Alle bedragen, grenzen en percentages van één jaar. Elke waarde heeft een `bron`.               |
| `kalibratie/<jaar>.yaml`                  | Doelen voor de kalibratie (begroting, CBS) met bronnen.                                         |
| `populatie/<jaar>.json`                   | De synthetische populatie. **Gegenereerd** door `npm run kalibreer`, niet met de hand bewerken. |
| `presets/*.yaml`                          | Bekende voorstellen ("flat tax", "zonder huurtoeslag") als wijziging op de parameters.          |
| `verkiezingen/<verkiezing>/<partij>.yaml` | Partijplannen als wijziging op het basispad.                                                    |

CI controleert al deze bestanden. Een tikfout of een onbekende parameter laat de build falen met een leesbare melding.
