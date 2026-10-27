# Beslissingen

Nieuwste onderaan. Elke beslissing: wat, waarom, en eventueel wat het zou veranderen.

## Fase 0

### D-001 Repository en hosting

- Openbare repo `Tiniepriest/Box1lab` (werktitel, gekozen door de eigenaar). Naam en domein van de site volgen later.
- Hosting op **GitHub Pages** via GitHub Actions: gratis bij een openbare repo, geen extra account. De site staat onder `https://tiniepriest.github.io/Box1lab/`; daarom staat `base: "/Box1lab"` in `site/astro.config.mjs`. Bij een eigen domein gaat die `base` eruit.

### D-002 TypeScript 6.0 in plaats van 7.0

TypeScript 7 (de nieuwe native compiler) is uit, maar `typescript-eslint`, `@astrojs/check` en `svelte-check` ondersteunen hem nog niet (peer-range tot 6.x). Overstappen zodra dat wel zo is.

### D-003 Monorepo met npm-workspaces

`packages/engine` (pure TS-rekenkern) en `site` (Astro). De engine wordt niet apart gebouwd: Vite en Vitest lezen de TypeScript-bron direct (`exports: ./src/index.ts`). Minder bouwstappen, minder dat kan breken.

### D-004 Lettertypen zelf hosten

IBM Plex via `@fontsource` in plaats van Google Fonts. De site belooft privacy; Google Fonts zou bij elk bezoek het IP-adres naar Google sturen.

### D-005 Onderhoudbaarheid als harde eis

Op verzoek van de eigenaar: nieuwe tarieven en regelingen moeten eenvoudig toe te voegen zijn. Uitgewerkt in `CLAUDE.md` (§ Onderhoudbaarheid): geen bedragen in code, één module per regeling, scenario's als diff, schemavalidatie in CI.

### D-006 Commit-identiteit

Commits gebruiken het GitHub no-reply-adres van de eigenaar, zodat het persoonlijke e-mailadres niet in een openbare geschiedenis komt.
