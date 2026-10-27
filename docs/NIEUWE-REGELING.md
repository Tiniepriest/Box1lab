# Een nieuwe regeling toevoegen

Voor als er een nieuwe belasting, korting of toeslag bijkomt, of een bestaande regeling anders gaat werken. Hiervoor is programmeerkennis nodig. Reken op vier plekken; een voorbeeld staat onderaan.

## 1. Parameters: `data/parameters/<jaar>.yaml`

Voeg een sectie toe met alle bedragen, grenzen en percentages van de regeling, plus een `bron`. Geef de regeling een `niveau: 100` als het lab hem moet kunnen afschalen of afschaffen.

Regel: **geen enkel beleidsgetal in de code.** Alles wat bij een nieuwe wet of een nieuw jaar kan veranderen, hoort in dit bestand.

## 2. Schema: `packages/engine/src/parameters/schema.ts`

Beschrijf dezelfde sectie in `parametersSchema`. Gebruik `z.strictObject` (zodat tikfouten opvallen), `bron` voor de bronvermelding, `pct` voor percentages en `nietNegatief` voor bedragen. TypeScript leidt het type `Parameters` hier automatisch uit af.

## 3. Rekenregel: één module

Maak een nieuw bestand, bijvoorbeeld `packages/engine/src/regels/toeslagen/<naam>.ts`, met één pure functie:

- invoer: wat de regeling nodig heeft van het huishouden (inkomen, aantal kinderen, ...) en `p: Parameters`;
- uitvoer: een bedrag per jaar;
- geen bestandstoegang, geen DOM, geen afhankelijkheid van andere regelingen behalve via argumenten.

Exporteer hem in `packages/engine/src/index.ts`.

## 4. Inbouwen

- `packages/engine/src/huishouden.ts`: roep de functie aan in `berekenHuishouden` en voeg het bedrag toe aan `Resultaat` en aan `besteedbaar`.
- `packages/engine/src/simulatie.ts`: tel het mee in `totalen`, voeg een post toe aan `POSTEN` en reken het effect uit in `simuleer`.
- Als er een begrotingstotaal bestaat: voeg een doel toe aan `data/kalibratie/<jaar>.yaml` en het `kalibratieSchema`.

## 5. In het lab

Wil je de regeling in het scenariolab kunnen aanpassen? Voeg een knop toe aan `data/lab/knoppen.yaml`, bijvoorbeeld:

```yaml
- {
    parameter: toeslagen.energietoeslag.niveau,
    label: "Energietoeslag",
    eenheid: niveau,
    min: 0,
    max: 200,
    stap: 5,
  }
```

## 6. Tests

In `packages/engine/test/`: minimaal vijf gevallen uit officiële rekenvoorbeelden (Belastingdienst, proefberekening toeslagen, Nibud), inclusief net onder en net boven elke grens. Voeg ook een geval toe aan de niveau-knoppentest in `eigenschappen.test.ts`.

Draai daarna `npm run ci`. Veranderen golden tests? Dat is verwacht als de regeling in het basispad meetelt: draai `npm run golden` en verklaar het verschil in `docs/DECISIONS.md`.

## Voorbeeld

Stel: er komt een "energietoeslag" van €500 per huishouden, afgebouwd met 10% boven €25.000.

```yaml
# data/parameters/2027.yaml
toeslagen:
  energietoeslag:
    bron: "Staatsblad 2027, 123"
    niveau: 100
    bedrag: 500
    drempelinkomen: 25000
    afbouw: 10
```

```ts
// schema.ts, binnen toeslagen
energietoeslag: z.strictObject({ bron, niveau, bedrag: nietNegatief, drempelinkomen: nietNegatief, afbouw: pct }),
```

```ts
// regels/toeslagen/energietoeslag.ts
export function energietoeslag(inkomen: number, p: Parameters): number {
  const e = p.toeslagen.energietoeslag;
  return (
    Math.max(0, e.bedrag - (e.afbouw / 100) * Math.max(0, inkomen - e.drempelinkomen)) * (e.niveau / 100)
  );
}
```

Daarna is de regeling meteen beschikbaar voor presets en partijplannen, bijvoorbeeld `{ parameter: toeslagen.energietoeslag.bedrag, plus: 100 }`.
