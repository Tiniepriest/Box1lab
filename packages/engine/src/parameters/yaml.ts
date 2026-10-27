import { parse } from "yaml";

/** Leest YAML-tekst. Zuiver: krijgt tekst, geeft data. Validatie gebeurt daarna met het bijbehorende schema. */
export function leesYaml(tekst: string, bestand = "yaml"): unknown {
  try {
    return parse(tekst);
  } catch (e) {
    throw new Error(`${bestand}: geen geldige YAML — ${(e as Error).message}`, { cause: e });
  }
}
