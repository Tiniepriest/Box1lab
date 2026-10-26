import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";

// GitHub Pages serveert de site onder /Box1lab/. Bij een eigen domein: base weghalen en site aanpassen.
export default defineConfig({
  site: "https://tiniepriest.github.io",
  base: "/Box1lab",
  trailingSlash: "ignore",
  integrations: [svelte()],
});
