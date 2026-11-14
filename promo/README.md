# Promotie: AI schrijft voor, jij verstuurt

Box1lab promoten op X en Bluesky. Een AI zoekt of leest posts en stelt per post drie reacties voor; jij kiest er een en verstuurt hem zelf. Zo blijft het binnen de regels van beide platforms, en kost het niets.

| Bestand          | Wat                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------- |
| `instructies.md` | Hoe de AI reacties en berichten schrijft: wanneer niet, drie opties, neutraal, B1       |
| `feitenblad.md`  | De enige cijfers die de AI mag gebruiken; gemaakt door de engine (`npm run feitenblad`) |
| `zoektermen.txt` | Waar `npm run bluesky -- zoek` op zoekt                                                 |

## X: jij vindt, de AI schrijft

X laat zich niet gratis doorzoeken, dus jij vindt de posts.

**Op je telefoon of computer: een Claude-project.**

1. Maak op claude.ai een project "Box1lab reacties".
2. Plak de inhoud van `instructies.md` bij de instructies van het project, en voeg `feitenblad.md` toe als bestand.
3. Zie je een post: deel de link of een schermafdruk in een chat in dat project. Je krijgt opties A, B en C, met een link die het antwoord op X klaarzet. Jij drukt op Posten.

**In Chrome op je computer: Claude in Chrome.** Op de pagina van een post, in het zijpaneel:

> Lees https://raw.githubusercontent.com/Tiniepriest/Box1lab/main/promo/instructies.md en volg die. Schrijf drie reacties op deze post.

Claude leest de post zelf. Je kunt ook vragen de gekozen reactie in het antwoordveld te zetten; op Posten druk je zelf.

## Bluesky: de AI zoekt ook

1. Maak in Bluesky een app-wachtwoord: Instellingen → Privacy en beveiliging → App-wachtwoorden.
2. Zet in `.env` (staat niet in git):
   ```
   BLUESKY_HANDLE=naam.bsky.social
   BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   ```
3. Typ in Claude Code `/bluesky`. Claude zoekt nieuwe posts, laat zien welke passen met drie opties per post, en plaatst alleen wat jij kiest ("2B"). Posts die je al zag, komen niet terug (`promo/.gezien.json`, staat niet in git).

## Bijwerken

Veranderen de parameters (de definitieve bedragen voor 2027 in december), draai dan `npm run feitenblad` en vervang het bestand in het Claude-project.
