import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/* Uitlegartikelen (HANDOFF §3.1): korte stukken in gewone taal, elk met een interactief voorbeeld. */
const uitleg = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/uitleg" }),
  schema: z.object({
    titel: z.string(),
    samenvatting: z.string(),
    volgorde: z.number(),
  }),
});

export const collections = { uitleg };
