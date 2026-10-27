import { z } from "zod";

/** Een datum als JJJJ-MM-DD. YAML maakt van een kale datum een Date; die zetten we terug naar tekst. */
export const datumSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Een datum schrijf je als JJJJ-MM-DD.")
  .or(z.date().transform((d) => d.toISOString().slice(0, 10)));
