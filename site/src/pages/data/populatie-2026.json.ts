import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_MAP } from "@box1lab/engine/node";

/* De herwogen populatie als statisch bestand voor de browser (gemaakt door `npm run kalibreer`). */
export const GET: APIRoute = () =>
  new Response(readFileSync(join(DATA_MAP, "populatie/2026.json"), "utf8"), {
    headers: { "Content-Type": "application/json" },
  });
