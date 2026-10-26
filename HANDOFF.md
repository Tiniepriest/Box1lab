# Handoff: Box 1 Rekenlab → openbare website

Dit document is de overdracht van een prototype (gebouwd in een Claude-chat) naar een echt project in deze repository. Het is geschreven voor Claude Code, dat er langere tijd zelfstandig aan werkt, en voor de eigenaar die het project stuurt.

**Lees dit document helemaal voordat je begint.** Werk daarna fase voor fase (zie §9). Leg beslissingen en voortgang vast in `docs/DECISIONS.md` en `docs/PROGRESS.md`, zodat een volgende sessie kan oppakken waar de vorige stopte.

---

## 1. Doel

Een openbare, gratis, Nederlandstalige website waarmee iedereen kan zien:

1. **Wat het belasting- en toeslagenstelsel voor hem of haar betekent**: een persoonlijke calculator.
2. **Wat er gebeurt als je de regels verandert**: een scenariolab met effecten op de schatkist, per inkomensgroep, voor armoede en ongelijkheid, en voor je eigen huishouden.
3. **Wat de plannen van politieke partijen voor jouw portemonnee betekenen**: een verkiezingsmodule. Je vult je eigen situatie in en ziet per partij het effect op je besteedbaar inkomen.

De toon is uitleggend en neutraal: geen politiek oordeel, wel heldere cijfers met eerlijke onzekerheid.

**Doelgroep.** Geïnteresseerde burgers zonder fiscale kennis (primair), en journalisten, studenten en beleidsmakers die snel een idee willen doorrekenen (secundair).

---

## 2. Uitgangspunt: het prototype

In `prototype/` staan twee bestanden:

- `engine.js`: de rekenkern (pure JavaScript, geen afhankelijkheden).
- `belastinglab.html`: de volledige prototypepagina. Dat is de engine plus UI in één bestand. Open het in een browser om te zien hoe het werkt.

### Wat het prototype doet

- **Box 1-belasting 2026** met vrij in te stellen schijven, een belastingvrije voet, heffingskortingen (AHK, AK, ouderenkorting, IACK, elk schaalbaar), hypotheekrenteaftrek en eigenwoningforfait als aparte knoppen, en een lager AOW-tarief in de 1e schijf.
- **Toeslagen als formules** (vereenvoudigd): zorgtoeslag, huurtoeslag, kindgebonden budget en kinderopvangtoeslag. Elk heeft een niveau-knop (%), plus de afbouwparameters.
- **Netto-koppeling** van uitkeringen en AOW (aan/uit). De overheid betaalt dan een hoger bruto bedrag zodat het netto gelijk blijft.
- **Optioneel gedragseffect**: een elasticiteit van het belastbaar inkomen (ETI) voor werkenden, standaard 0.
- **Synthetische populatie**: 6 huishoudtypes × 200 = 1.200 huishoudens, gewogen naar 8,25 mln huishoudens en 16,9 mln personen. Inkomens zijn lognormaal, plus uitkeringsfractie, koop/huur, hypotheek, kinderen en kinderopvang.
- **Kalibratie**: het modelresultaat per post wordt geschaald naar de begrotingstotalen van 2026 (schaalfactor per post).
- **Uitkomsten**:
  - saldo voor de overheid per post;
  - deciel-effecten (naar gestandaardiseerd besteedbaar inkomen);
  - winnaars en verliezers in 5 klassen;
  - armoederisico (60% van het mediaan-equivalent inkomen), ook voor kinderen;
  - Gini-coëfficiënt;
  - grafieken van netto inkomen en marginale druk per huishoudtype;
  - 7 voorbeeldhuishoudens plus een eigen huishouden;
  - een "budgetneutraal maken"-oplosser;
  - een scenariocode (base64-JSON) om te delen.

### Referentie-uitkomsten van het prototype

Gebruik deze als **regressie-baseline**. Ze mogen veranderen zodra de engine bewust verbetert, maar elke verandering moet verklaard worden in `docs/DECISIONS.md`.

Kalibratie, huidig stelsel 2026:

| Post | Model | Begroting 2026 | Schaalfactor |
|---|---|---|---|
| Loon-/inkomstenbelasting + premies volksverzekeringen (na HRA) | €166,3 mld | €165,0 mld | 0,99 |
| Afgetrokken hypotheekrente (grondslag) | €23,7 mld | €24,0 mld | 1,01 |
| Zorgtoeslag | €5,4 mld | €6,4 mld | 1,19 |
| Huurtoeslag | €6,2 mld | €5,6 mld | 0,90 |
| Kindgebonden budget | €4,1 mld | €3,6 mld | 0,87 |
| Kinderopvangtoeslag | €6,3 mld | €6,6 mld | 1,06 |

Scenario's (statisch, netto-koppeling aan, ETI 0):

| Scenario | Overheid per saldo | Armoederisico | Gini |
|---|---|---|---|
| Huidig 2026 | €0 | 11,3% | 0,271 |
| Flat 40% boven €18k, alle kortingen/aftrek/toeslagen af | +€30,7 mld | 23,4% (kinderen 23,4%) | 0,331 |
| 35% tot €50k / 40% tot €150k / 45%, €18k vrij, alles af | +€20,8 mld | 22,7% | – |
| Huidig zonder huurtoeslag | +€5,6 mld | 14,9% | – |
| Huidig zonder HRA (forfait blijft) | +€9,4 mld | 11,5% | – |
| Huidig zonder HRA en zonder forfait | +€5,5 mld | 11,5% | – |

Daarnaast: in het flat-scenario is een vrijstelling van ±€26.700 nodig voor budgetneutraliteit, of alle tarieven × 0,815.

### Bekende zwakke plekken van het prototype

Deze moeten in fase 1–2 opgelost of expliciet geaccepteerd worden:

1. **Toeslagformules zijn benaderingen.** De afbouwparameters zijn gekalibreerd op totalen, niet op de wettelijke formules. Implementeer ze exact volgens de *Toeslagenkaart 2026* van de Belastingdienst: normpremie, drempelinkomen, normhuur, kwaliteitskortingsgrens, aftoppingsgrenzen, vermogenstoets, en de KOT-tabel per inkomensgroep.
2. **Netto-koppeling geldt voor álle uitkeringen.** In werkelijkheid zijn vooral AOW en bijstand netto gekoppeld (aan het netto minimumloon). WW en WIA zijn een percentage van het oude bruto loon. Maak dit per uitkeringssoort.
3. **AOW-bedragen, nominale zorgpremie en kinderbijslag zijn ronde schattingen** (`AOW1=19800`, `AOW2=13600`, `ZORGPREMIE=2000`, `KINDERBIJSLAG=1400`). Vervang ze door officiële bedragen voor 2026, inclusief vakantiegeld en de leeftijdsafhankelijke kinderbijslag.
4. **De inkomensafhankelijke Zvw-bijdrage ontbreekt**, net als werkgeverspremies. Benoem ze expliciet buiten scope, of neem ze op.
5. **Wet Hillen ontbreekt.** Het eigenwoningforfait voor huiseigenaren zonder of met weinig hypotheekschuld wordt nu niet goed behandeld.
6. **De populatie is synthetisch en eenvoudig**: de lognormale parameters zijn met de hand gekozen, met een `KAL`-schaal `{inc:1.3, rente:0.55, kot:0.75}` om op begrotingstotalen uit te komen. Dat is pragmatisch maar fragiel. Zie §5 voor de verbetering.
7. **De ouderenkorting-afbouw is een benadering.** Controleer alle kortingformules tegen de Belastingdienst-tabellen voor 2026.
8. **Box 2 en 3, ondernemersfaciliteiten** (zelfstandigenaftrek, MKB-winstvrijstelling) en giftenaftrek zitten er niet in. "Overige aftrekposten" is één vaste post van €4 mld.

---

## 3. Productontwerp

### 3.1 Pagina's

| Pagina | Doel | Kern |
|---|---|---|
| **Home** | In 10 seconden snappen wat de site doet | Eén vraag als ingang: "Wat betekent het belastingstelsel voor jou?" Daarna drie tegels: *Jouw situatie*, *Speel minister van Financiën*, *Verkiezingen*. Eén opvallende, actuele visual, bijvoorbeeld marginale druk naar inkomen. |
| **Jouw situatie** (calculator) | Persoonlijk inzicht in het huidige stelsel | Invoer stap voor stap (zie §3.3). Uitkomst: bruto → netto als waterval, je effectieve en marginale druk, je positie in de inkomensverdeling, "waar gaat jouw belasting naartoe" (optioneel, op basis van de rijksbegroting). |
| **Scenariolab** | Zelf regels veranderen | Het prototype, maar netter: links instellingen in groepen (eenvoudig/gevorderd), rechts kerngetallen → decielen → winnaars/verliezers → curves → jouw huishouden → overheid → methodiek. |
| **Voorstellen** | Bekende ideeën met één klik | Presetgalerij: flat tax, toeslagen afschaffen, HRA afbouwen, basisinkomen, hogere AHK, enzovoort. Per voorstel een korte uitleg, de kerncijfers en een knop "open in lab". |
| **Verkiezingen** | Effect per partij op jouw inkomen | Zie §4. |
| **Uitleg** | Begrippen en hoe het stelsel werkt | Korte artikelen: armoedeval, marginale druk, toeslagen, HRA en forfait, wat is een deciel. Elk artikel met een interactief mini-voorbeeld. |
| **Methodiek** | Vertrouwen en controleerbaarheid | Hoe het model werkt, kalibratietabel, beperkingen, bronnen, changelog per update, link naar de broncode. |
| **Over** | Wie, waarom, onafhankelijkheid, privacy | Ook contact en melden van fouten (link naar GitHub-issues). |

### 3.2 Wat mensen interessant vinden

Gebruik deze lijst om te prioriteren en voor de content:

- **"Wat houd ik over van €100 extra?"** De marginale druk en de armoedeval zijn voor veel mensen een eyeopener. Maak dit prominent, met een schuifje voor bruto-inkomen.
- **"Ben ik rijk of arm?"** Je positie in de inkomensverdeling (deciel/percentiel), gestandaardiseerd voor huishoudgrootte.
- **"Wat als …"**: de knoppen in het lab, maar vooral de presets met één klik.
- **Winnaars en verliezers**: mensen willen weten of zíj erop vooruit gaan, en of de rekening eerlijk verdeeld is.
- **Deelbare uitkomsten**: een scenario-link en een deelafbeelding ("Met dit plan gaat deciel 1 er 30% op achteruit"), handig voor social media en journalisten.
- **Vergelijken**: twee scenario's naast elkaar, of jouw situatie onder twee partijen.
- **Tijdreis**: "Hoe was dit in 2015?" Optioneel, latere fase, zodra er parameterbestanden voor eerdere jaren zijn.

### 3.3 Invoer van je eigen situatie

Eén gedeeld invoerformulier, gebruikt door de calculator, het lab en de verkiezingsmodule. Stapsgewijs, met slimme standaardwaarden en altijd "weet ik niet" (dan een gemiddelde gebruiken en dat melden).

1. **Huishouden**: alleen / met partner; leeftijd(en) (AOW ja/nee); aantal kinderen en hun leeftijden.
2. **Inkomen per persoon**: soort (loondienst, zzp, uitkering met type, AOW + pensioen, geen); bruto per jaar of per maand (met en zonder vakantiegeld).
3. **Wonen**: huur (kale huur per maand) of koop (WOZ-waarde, hypotheekrente per jaar, aflossingsvrij deel optioneel).
4. **Kinderopvang**: uren en uurprijs per kind (optioneel).
5. **Vermogen**: spaargeld en beleggingen (voor de vermogenstoets van toeslagen en box 3, als die wordt toegevoegd).

**Privacy-eis:** alle invoer blijft in de browser. Geen server, geen opslag, geen analytics op invoervelden. Optioneel lokaal onthouden (localStorage, met een duidelijke "wis mijn gegevens"-knop). Vermeld dit zichtbaar bij het formulier.

---

## 4. Verkiezingsmodule

### 4.1 Gebruikerservaring

1. De gebruiker vult zijn situatie in (§3.3), of hergebruikt die van de calculator.
2. Uitkomst: **per partij de verandering in besteedbaar inkomen per jaar en per maand** ten opzichte van het basispad (beleid zoals het nu is vastgesteld, zie §4.3).
3. Weergave:
   - een horizontaal staafdiagram met één staaf per partij;
   - **standaardvolgorde alfabetisch** of willekeurig, met een optie om op uitkomst te sorteren;
   - neutrale, uniforme kleuren: winst blauw, verlies oranje (zoals in het prototype), géén partijkleuren als hoofdcodering.
4. Per partij uitklapbaar:
   - welke maatregelen het effect veroorzaken (belasting, toeslagen, zorg, wonen);
   - welke maatregelen **niet** zijn meegenomen;
   - de bron per maatregel;
   - een betrouwbaarheidsindicatie.
5. Daarnaast per partij het **macrobeeld**: deciel-effecten, armoederisico, Gini en saldo voor de overheid. Zo zie je niet alleen "wat krijg ik" maar ook "wat doet het voor het land".
6. Vergelijkfunctie: twee partijen naast elkaar.
7. Prominente disclaimer: dit is een vereenvoudigde doorrekening, geen stemadvies; het CPB (Keuzes in Kaart) is leidend; niet alle maatregelen zijn modelleerbaar.

### 4.2 Datamodel per partij

Elke partij is een **scenario als diff op het basispad**, in een eigen bestand. Voorbeeld van de structuur (fictief, niet invullen met echte partijdata zonder bron):

```yaml
# data/verkiezingen/tk-2027/partij-x.yaml
id: partij-x
naam: Partij X
programma:
  titel: "Verkiezingsprogramma 2027–2031"
  url: https://example.org/programma.pdf
  geraadpleegd: 2027-01-15
bronnen:
  cpb: https://www.cpb.nl/keuzes-in-kaart-...    # als de partij heeft deelgenomen
status: concept            # concept | gecontroleerd | gepubliceerd
gecontroleerd_door: ""     # naam/initialen van de tweede controleur
maatregelen:
  - id: ahk-verhogen
    omschrijving: "Algemene heffingskorting +€500"
    parameter: ahk.max
    wijziging: { type: plus, waarde: 500 }
    bron: { document: programma, pagina: 34, citaat: "..." }
    zekerheid: hoog          # hoog | middel | laag (vertaling naar parameter)
  - id: huurtoeslag-normhuur
    omschrijving: "Eigen bijdrage huurtoeslag omlaag"
    parameter: huurtoeslag.basishuur
    wijziging: { type: factor, waarde: 0.9 }
    bron: { document: programma, pagina: 51, citaat: "..." }
    zekerheid: laag
    toelichting: "Programma noemt geen bedrag; 10% aangenomen."
niet_gemodelleerd:
  - "Btw-verhoging op levensmiddelen"
  - "Verlaging eigen risico zorg"
```

Eisen:

- **Schemavalidatie** (bijvoorbeeld met zod of JSON Schema). Elke parameter die in een partijbestand voorkomt, moet in de engine bestaan. De build faalt bij een fout.
- **Elke maatregel heeft een bron met paginanummer**, en een vrij citaat waar mogelijk.
- **Vier-ogen-principe**: `status: gepubliceerd` alleen na controle door een tweede persoon. De site toont alleen gepubliceerde partijen, behalve in een previewmodus.
- **Zelfde methode voor elke partij.** Leg vaste vertaalregels vast in `docs/METHODIEK-VERKIEZINGEN.md`, bijvoorbeeld: "programma noemt richting zonder bedrag → maatregel niet modelleren en onder `niet_gemodelleerd` zetten", tenzij het CPB een bedrag noemt.
- **Uitbreiding buiten box 1.** Partijplannen gaan vaak over het eigen risico, de zorgpremie, de btw en de huurprijs. Bepaal in overleg met de eigenaar welke posten erbij komen. Een redelijke eerste uitbreiding:
  - het eigen risico, als verwachte kosten per huishoudtype;
  - de nominale zorgpremie;
  - de btw, als een vast aandeel van de bestedingen per deciel (Nibud/CBS-budgetonderzoek).
  
  Markeer zulke posten duidelijk als "schatting".

### 4.3 Basispad

Het vergelijkingspunt is het **vastgestelde beleid voor het eerste kabinetsjaar**, niet het huidige jaar. Gebruik de CPB-raming (de middellangetermijnverkenning voor de verkiezingen). Als dat te complex is, gebruik je in een eerste versie het huidige jaar en vermeld je dat duidelijk.

### 4.4 Risico's

- **Politieke gevoeligheid.** Fouten worden direct opgemerkt en gedeeld. Bescherm daartegen met bronnen, het vier-ogen-principe, een publieke changelog, een "meld een fout"-knop en snelle correcties.
- **Juridisch**: geen gebruik van partijlogo's zonder toestemming; namen zijn prima. Een disclaimer en geen stemadvies.
- **Timing**: programma's verschijnen kort voor de verkiezingen, en Keuzes in Kaart nog later. Plan de module zo dat een partij binnen een uur toe te voegen is zodra de vertaling klaar is.

---

## 5. Model en data

### 5.1 Architectuur van de engine

- **TypeScript-pakket** `packages/engine`, zonder afhankelijkheden van UI of DOM. Het draait in de browser en in Node (voor tests en scripts).
- **Parameters los van code.** Alle bedragen, grenzen en percentages per jaar staan in `data/parameters/2026.yaml` (en later 2027, enzovoort). De engine leest een parameterobject. Een scenario is een **diff** op een parameterset.
- **Regels als pure functies**, per regeling een eigen module:
  - `box1.ts`, `heffingskortingen.ts`, `eigenwoning.ts`;
  - `toeslagen/zorgtoeslag.ts`, `toeslagen/huurtoeslag.ts`, `toeslagen/kgb.ts`, `toeslagen/kot.ts`;
  - `uitkeringen.ts`, `zorg.ts`, `huishouden.ts` (combineert alles).
- **Uitkomstmaten** apart: `metrics/decielen.ts`, `metrics/armoede.ts`, `metrics/gini.ts`, `metrics/winnaars.ts`, `metrics/marginaal.ts`.
- **Prestatie**: de hele populatie (±2.000–5.000 huishoudens) moet in ruim onder 50 ms door te rekenen zijn, zodat schuifjes direct reageren. Draai zware dingen (oplosser, curves) eventueel in een Web Worker.

### 5.2 Populatie en kalibratie

Doel: de populatie verbeteren van "met de hand gekozen" naar "systematisch herwogen".

1. Genereer een ruimere synthetische populatie (bijvoorbeeld 3.000–5.000 huishoudens) met meer huishoudtypes en variatie (leeftijd, zzp, studenten, meerdere uitkeringssoorten).
2. **Herweeg met raking / iterative proportional fitting** naar meerdere marges tegelijk, uit CBS StatLine-tabellen:
   - aantal huishoudens per type;
   - inkomenspercentielen van bruto en besteedbaar huishoudinkomen (tabel 83934NED);
   - aantal ontvangers per toeslag;
   - huur/koop-verdeling.
   
   Totalen uit de begroting (belastingopbrengst, toeslaguitgaven, HRA) zijn ook kalibratiedoelen.
3. Doe dit **offline** in een script (`scripts/kalibreer.ts` of Python), met als resultaat `data/populatie/2026.json`. De website laadt alleen dat bestand.
4. Maak een **kalibratierapport** (Markdown of HTML) bij elke run: model tegen doel per marge. Publiceer het op de Methodiek-pagina.
5. De schaalfactoren per post (zoals in het prototype) blijven als laatste correctie bestaan, maar moeten na herweging dicht bij 1 liggen. Laat de build waarschuwen als een factor buiten 0,9–1,1 valt.

Echte microdata (CBS remote access, IPO) zijn op termijn een optie, maar vallen buiten scope: dure toegang en strenge outputcontrole.

### 5.3 Tests

- **Unit tests per regeling** met voorbeelden uit officiële bronnen: Belastingdienst-rekenvoorbeelden, proefberekening toeslagen, Nibud. Minimaal 5 cases per regeling, inclusief randgevallen (net onder en boven grenzen).
- **Golden tests** voor de voorbeeldhuishoudens en de presets (§2 als eerste baseline).
- **Eigenschapstests**: netto inkomen is monotoon niet-dalend in bruto inkomen bij gelijke situatie, behalve op bekende armoedeval-punten (documenteer die); het huidige scenario geeft nul verschil; budgetneutrale oplossing geeft saldo ≈ 0.
- **Schema-tests** voor alle YAML-bestanden.
- **CI** (GitHub Actions): lint, typecheck, tests, schemavalidatie en build bij elke push en pull request.

---

## 6. Techniek

Aanbevolen stack. Wijk af als er een goede reden is, en noteer die in `docs/DECISIONS.md`.

- **Astro** als sitegenerator: statische pagina's, goed voor SEO, content in Markdown/MDX, interactieve onderdelen als "islands".
- **Svelte** (of Preact) voor de interactieve onderdelen: lab, calculator, verkiezingsmodule. Licht en snel.
- **TypeScript** overal.
- **Grafieken**: eigen SVG-componenten zoals in het prototype (zodat je volledige controle over stijl en toegankelijkheid hebt), of een kleine bibliotheek zoals Observable Plot. Geen zware chart-frameworks.
- **Styling**: CSS custom properties (design tokens, zie §7) en component-scoped CSS. Tailwind mag, maar is niet nodig.
- **Hosting**: statisch, via GitHub Actions naar Cloudflare Pages, Netlify of GitHub Pages. Er is geen backend nodig.
- **Analytics**: alleen privacyvriendelijk en zonder cookies (Plausible, GoatCounter of Cloudflare Web Analytics), en nooit op invoerwaarden. Overleg met de eigenaar.
- **Deelafbeeldingen (OG-images)**: genereer per preset en per partij bij de build (bijvoorbeeld met Satori). Gedeelde scenario-links krijgen een generieke afbeelding, want er is geen server.

### Voorgestelde mappenstructuur

```
/
├─ HANDOFF.md                 (dit document)
├─ CLAUDE.md                  (korte werkinstructies voor Claude Code, maak je in fase 0)
├─ docs/
│  ├─ DECISIONS.md            (beslissingen + reden)
│  ├─ PROGRESS.md             (voortgang per fase)
│  ├─ JAARLIJKSE-UPDATE.md    (stappenplan nieuw jaar)
│  └─ METHODIEK-VERKIEZINGEN.md
├─ prototype/                 (referentie, niet aanpassen)
├─ packages/engine/           (TS-rekenkern + tests)
├─ data/
│  ├─ parameters/2026.yaml
│  ├─ populatie/2026.json     (gegenereerd)
│  ├─ kalibratie/2026.yaml    (doelen + bronnen)
│  ├─ presets/*.yaml
│  └─ verkiezingen/<verkiezing>/<partij>.yaml
├─ scripts/                   (kalibratie, validatie, rapporten)
└─ site/                      (Astro-project)
   └─ src/content/uitleg/*.mdx
```

---

## 7. Visueel ontwerp

Uitgangspunt: **rustig, betrouwbaar, helder.** Denk aan een goede datajournalistieke site, geen overheidsportaal en geen marketingpagina.

- **Kleur** (bouw verder op de tokens in het prototype):
  - Basis: koel lichtgrijs met wit (`--bg #f6f7f9`, `--panel #fff`) en een diepblauw accent (`--accent #1f4e8c`).
  - **Betekeniskleuren**: winst/vooruit blauw (`#2a78d6`), verlies/achteruit oranje (`#eb6834`), neutraal grijs. Blauw/oranje is kleurenblind-veilig. Gebruik geen rood/groen voor winst en verlies.
  - Lichte tussentinten voor "kleine winst" en "klein verlies" (zie de winnaars/verliezers-grafiek in het prototype).
  - **Donkere modus** vanaf het begin, met eigen tokens (in het prototype al aanwezig).
  - Partijkleuren hooguit als klein accent naast de naam, nooit als enige codering.
- **Typografie**: IBM Plex Serif voor koppen, Plex Sans voor tekst en Plex Mono voor cijfers (tabular). Dat werkt in het prototype goed. Cijfers altijd met `tabular-nums` en Nederlandse notatie (€1.234, 12,5%).
- **Layout**: mobile-first. Instellingen op mobiel in een uitklapbaar paneel of als bottom sheet, met de uitkomsten altijd in beeld. Op desktop instellingen links (sticky) en uitkomsten rechts.
- **Hiërarchie**: eerst de kernboodschap in één zin ("Met dit plan gaat 78% van de mensen erop achteruit"), dan kerngetallen, dan grafieken, dan details en tabellen.
- **Elke grafiek** heeft:
  - een titel die de vraag stelt;
  - een tooltip;
  - een tabelweergave voor toegankelijkheid;
  - een zin uitleg in gewone taal.
- **Toegankelijkheid**: WCAG 2.2 AA, toetsenbordbediening, schermlezerlabels, en `prefers-reduced-motion` respecteren.
- **Taal**: B1-niveau. Vakterm de eerste keer uitleggen, met een link naar de Uitleg-pagina.

---

## 8. Updatebaarheid

Het moet mogelijk zijn om **zonder programmeerkennis** cijfers bij te werken, en met programmeerkennis snel nieuwe regelingen toe te voegen.

- **Jaarlijkse update** (rond Prinsjesdag en januari): stappenplan in `docs/JAARLIJKSE-UPDATE.md`.
  1. Kopieer `data/parameters/<jaar>.yaml` naar het nieuwe jaar en vul de nieuwe bedragen in. Elke waarde heeft een `bron:`-veld.
  2. Werk de kalibratiedoelen bij: begroting en CBS-tabellen.
  3. Draai `npm run kalibreer` en controleer het rapport.
  4. Draai de tests. Golden tests die wijzigen worden in de pull request uitgelegd.
  5. Voeg een changelog-regel toe en merge. De deploy gaat automatisch.
- **Presets en partijen** zijn YAML-bestanden. Een pull request met alleen een nieuw YAML-bestand is genoeg; CI valideert het.
- **Uitlegteksten** zijn MDX-bestanden.
- **Versie op de site**: toon onderaan elke pagina het parameterjaar, de modelversie en de datum van de laatste update.

---

## 9. Fasering

Werk in deze volgorde. Elke fase eindigt met werkende code op `main`, groene CI en een update van `docs/PROGRESS.md`. Maak per fase (of per logisch onderdeel) een pull request, zodat de eigenaar kan meekijken.

### Fase 0: Opzet (klein)
- Repository-structuur zoals in §6, Astro + Svelte + TypeScript, lint/format, Vitest, CI.
- `CLAUDE.md` met korte werkinstructies (testcommando's, conventies, verwijzing naar dit document).
- `prototype/` ongewijzigd toevoegen.
- **Klaar als**: `npm test` en `npm run build` slagen in CI, en er staat een lege site online (preview-deploy).

### Fase 1: Engine naar TypeScript, met pariteit
- Port `prototype/engine.js` naar `packages/engine`, met parameters in `data/parameters/2026.yaml`.
- Golden tests met de cijfers uit §2. Ze moeten binnen ±0,1 mld en ±0,1 procentpunt kloppen.
- **Klaar als**: de TS-engine reproduceert het prototype.

### Fase 2: Engine correct maken
- Los de zwakke plekken 1–5 en 7 uit §2 op: exacte toeslagregels, netto-koppeling per uitkeringssoort, officiële bedragen, Zvw-bijdrage (of expliciet buiten scope), Wet Hillen, kortingen controleren.
- Unit tests per regeling met officiële voorbeelden.
- **Klaar als**: alle regelingen hun officiële testcases halen. De verschillen met de baseline uit §2 staan verklaard in `DECISIONS.md`.

### Fase 3: Populatie en kalibratie
- Raking naar CBS-marges en begrotingstotalen (§5.2), kalibratierapport.
- **Klaar als**: alle schaalfactoren tussen 0,9 en 1,1, en de deciel-grenzen van het besteedbaar inkomen binnen 5% van CBS.

### Fase 4: Site MVP
- Pagina's Home, Jouw situatie, Scenariolab, Methodiek, Over. Gedeeld invoerformulier (§3.3).
- Lab met alle functies van het prototype, netter en mobielvriendelijk.
- Scenario delen via URL-hash (zoals in het prototype).
- **Klaar als**: Lighthouse ≥ 90 op alle categorieën, bruikbaar op 375px breed, licht en donker gecontroleerd.

### Fase 5: Content en delen
- Presetgalerij (minstens 6 voorstellen), Uitleg-artikelen (minstens 5), OG-afbeeldingen, scenario's vergelijken.

### Fase 6: Verkiezingsmodule
- Schema, validatie, UI (§4), `METHODIEK-VERKIEZINGEN.md`.
- Alleen **fictieve testpartijen** (`Partij A`, `Partij B`) totdat de eigenaar echte data aanlevert of goedkeurt.
- Previewmodus voor `status: concept`.
- **Klaar als**: een nieuwe partij toevoegen kan met alleen een YAML-bestand, en de build valideert het.

### Fase 7: Afronding
- Privacyvriendelijke analytics (na akkoord), eigen domein (na akkoord), foutmeldknop, changelog-pagina.

---

## 10. Werkafspraken voor Claude Code

- **Zelfstandig werken binnen een fase.** Kies een redelijke oplossing, noteer de keuze in `docs/DECISIONS.md` en ga door.
- **Stop en vraag de eigenaar** bij:
  - de naam van de site en het domein;
  - de keuze voor analytics;
  - het toevoegen of publiceren van **echte partijdata**;
  - uitbreiding naar zorg, btw of box 3;
  - alles wat geld kost of een externe dienst vereist;
  - het afwijken van de fasering.
- **Verzin nooit bedragen of bronnen.** Zoek officiële bronnen op, zoals de Belastingdienst, rijksoverheid.nl, CBS en CPB. Waar dat niet lukt, markeer je de waarde als `TODO: bron nodig` en noem je hem in `PROGRESS.md`.
- **Kleine commits** met duidelijke berichten, en een pull request per fase of onderdeel.
- **Houd de engine puur** en volledig getest. De UI mag nooit eigen rekenregels bevatten.
- **Vergelijk na elke enginewijziging** de golden tests en verklaar elk verschil.

---

## 11. Bronnen

- Belastingdienst: tarieven en heffingskortingen 2026: https://www.belastingdienst.nl/wps/wcm/connect/nl/voorlopige-aanslag/content/voorlopige-aanslag-tarieven-en-heffingskortingen
- Belastingdienst: Toeslagenkaart 2026: https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/themaoverstijgend/brochures_en_publicaties/toeslagenkaart-2026
- CBS: grenzen van 10%-groepen inkomen & vermogen (83934NED): https://www.cbs.nl/nl-nl/cijfers/detail/83934NED
- CBS: inkomen van huishoudens; inkomensklassen (83932NED): https://www.cbs.nl/nl-nl/cijfers/detail/83932NED
- Miljoenennota 2026, bijlagen (kerngegevens): https://www.rijksfinancien.nl/miljoenennota/2026/bijlage
- Miljoenennota 2026, poster (opbrengst loon- en inkomstenbelasting €110,3 mld): https://www.rijksoverheid.nl/binaries/rijksoverheid/documenten/brochures/2025/09/12/miljoenennotaposter-2026/MINFIN_MNPoster_PD2025_0911_DEF2_LR.pdf
- Premies volksverzekeringen 2026: https://www.rendement.nl/inkomstenbelasting/nieuws/tarieven-inkomstenbelasting-2026-lager-tarief-eerste-schijf.html
- Toeslagen 2024 (€20,7 mld): https://app.1848.nl/static/pdf/33/92/33922dd11cd5788bd5f35e827b505f6de506ecad.pdf
- CPB: MIMOSI microsimulatiemodel: https://www.cpb.nl/sites/default/files/publicaties/download/mimosi-microsimulatiemodel-voor-belastingen-sociale-zekerheid-loonkosten-en-koopkracht.pdf
- EUROMOD: landenrapport Nederland: https://euromod-web.jrc.ec.europa.eu/sites/default/files/2022-01/Y12_CR_NL_Final.pdf
- PolicyEngine (inspiratie voor UX en uitkomstmaten): https://github.com/PolicyEngine

Let op: een deel van de bedragen in het prototype is geschat (zie §2, zwakke plekken). Gebruik de bronnen hierboven als startpunt en controleer elke waarde opnieuw voor het parameterbestand.
