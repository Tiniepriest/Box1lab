---
name: bluesky
description: Zoek Nederlandse Bluesky-posts waar Box1lab bij helpt, stel per post drie reacties voor, en plaats alleen de reactie die de eigenaar kiest. Ook voor een eigen bericht op Bluesky. Gebruik bij "/bluesky", "zoek Bluesky", "Bluesky-reacties".
---

# Bluesky-reacties voor Box1lab

De eigenaar kiest en verstuurt; jij zoekt en schrijft voor. **Plaats nooit iets dat de eigenaar niet letterlijk heeft gekozen.**

1. Lees `promo/instructies.md` en `promo/feitenblad.md`. Zeg het als het feitenblad ouder is dan `data/parameters/` (vergelijk `git log -1` van beide); stel dan voor om eerst `npm run feitenblad` te draaien.
2. Draai `npm run bluesky -- zoek` (of `zoek <uren>` als de eigenaar een periode noemt). Zegt het script dat `.env` ontbreekt, leg dan uit hoe je een app-wachtwoord maakt (staat bovenin `scripts/bluesky.ts`) en stop.
3. Beoordeel elke post volgens stap 1 van de instructies. Toon de posts die passen, genummerd, met link, schrijver, een korte samenvatting en de opties A, B en C met het aantal tekens. Noem de afgevallen posts alleen als aantal, met de reden in een paar woorden.
4. Wacht op de keuze, bijvoorbeeld "2B" of "1A, 3C" of "2B maar zonder de laatste zin". Toon de definitieve tekst nog één keer als de eigenaar iets veranderde.
5. Plaats per keuze: `npm run bluesky -- reageer "<link>" "<tekst>"`. Meld de link die het script teruggeeft.

Een eigen bericht: geef drie opties volgens "Een eigen bericht" in de instructies, en plaats de gekozen tekst met `npm run bluesky -- bericht "<tekst>"`.
