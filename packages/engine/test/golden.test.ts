import { describe, expect, it } from "vitest";
import { berekenGolden } from "./golden/bereken.ts";
import opgeslagen from "./golden/engine-2026.json";

/*
 * Golden tests (HANDOFF §5.3): de engine moet dezelfde kerncijfers geven als in golden/engine-2026.json.
 * Faalt deze test na een bewuste wijziging? Draai `npm run golden` en verklaar het verschil in de pull request
 * en in docs/DECISIONS.md.
 */

const nu = berekenGolden(2026);

describe("golden 2026", () => {
  it("kalibratie", () => {
    expect(nu.kalibratie).toEqual(opgeslagen.kalibratie);
  });

  it.each(opgeslagen.scenarios.map((s) => [s.id, s] as const))("scenario %s", (id, verwacht) => {
    expect(nu.scenarios.find((s) => s.id === id)).toEqual(verwacht);
  });

  it("alle presets staan in het golden-bestand", () => {
    expect(nu.scenarios.map((s) => s.id)).toEqual(opgeslagen.scenarios.map((s) => s.id));
  });

  it.each(opgeslagen.voorbeelden.map((v) => [v.id, v] as const))("voorbeeldhuishouden %s", (id, verwacht) => {
    expect(nu.voorbeelden.find((v) => v.id === id)).toEqual(verwacht);
  });

  it("oplosser", () => {
    expect(nu.oplosser).toEqual(opgeslagen.oplosser);
  });
});
