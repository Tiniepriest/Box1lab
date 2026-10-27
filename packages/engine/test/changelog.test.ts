import { describe, expect, it } from "vitest";
import { MODEL_VERSIE, valideerChangelog } from "../src/index.ts";
import { laadChangelog } from "../src/node/index.ts";

const regel = (datum: string, modelversie?: string) => ({
  datum,
  soort: "model",
  titel: `regel ${datum}`,
  tekst: "x",
  ...(modelversie ? { modelversie } : {}),
});

describe("changelog", () => {
  it("de echte changelog is geldig en past bij MODEL_VERSIE", () => {
    const c = laadChangelog();
    expect(c.length).toBeGreaterThan(0);
    expect(c.some((r) => r.modelversie === MODEL_VERSIE)).toBe(true);
  });

  it("eist de nieuwste regel bovenaan", () => {
    expect(() =>
      valideerChangelog([regel("2026-01-01", "1.0.0"), regel("2026-02-01")], "c", "1.0.0"),
    ).toThrow(/nieuwste bovenaan/);
  });

  it("eist dat de hoogste modelversie MODEL_VERSIE is", () => {
    expect(() => valideerChangelog([regel("2026-02-01", "1.0.0")], "c", "1.1.0")).toThrow(
      /modelversie: 1.1.0/,
    );
    // Versies vergelijken als getallen, niet als tekst: 0.10.0 is hoger dan 0.9.0.
    expect(
      valideerChangelog([regel("2026-02-01", "0.10.0"), regel("2026-01-01", "0.9.0")], "c", "0.10.0"),
    ).toHaveLength(2);
  });

  it("weigert een onbekende soort", () => {
    expect(() =>
      valideerChangelog([{ ...regel("2026-01-01", "1.0.0"), soort: "x" }], "c", "1.0.0"),
    ).toThrow();
  });
});
