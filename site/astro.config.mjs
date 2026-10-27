import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { laadVerkiezing, laadVerkiezingen } from "@box1lab/engine/node";

// Verkiezingen met fictieve partijen staan niet in de sitemap (en hebben noindex).
const fictief = laadVerkiezingen().filter((id) => laadVerkiezing(id).verkiezing.fictief);

// GitHub Pages serveert de site onder /Box1lab/. Bij een eigen domein: base weghalen en site aanpassen (D-051).
export default defineConfig({
  site: "https://tiniepriest.github.io",
  base: "/Box1lab",
  trailingSlash: "ignore",
  integrations: [
    svelte(),
    mdx(),
    sitemap({ filter: (pagina) => !fictief.some((id) => pagina.includes(`/verkiezingen/${id}`)) }),
  ],
  // Kleine stylesheet: inline in de HTML, zodat er geen blokkerend verzoek nodig is.
  build: { inlineStylesheets: "always" },
});
