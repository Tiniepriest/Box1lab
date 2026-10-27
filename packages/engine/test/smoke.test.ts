import { describe, expect, it } from "vitest";
import { MODEL_VERSIE } from "../src/index.ts";

describe("engine", () => {
  it("exporteert een modelversie", () => {
    expect(MODEL_VERSIE).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
