import {
  berekenHuishouden,
  budgetneutraalViaTarieven,
  budgetneutraalViaVrijstelling,
  maakBasis,
  maakHuishouden,
  pasToe,
  simuleer,
} from "../../src/index.ts";
import {
  laadKalibratie,
  laadParameters,
  laadPopulatie,
  laadPresets,
  laadVoorbeelden,
} from "../../src/node/index.ts";

/**
 * De kerncijfers van het model voor een parameterjaar: kalibratie, alle presets, alle voorbeeldhuishoudens en
 * de oplosser. `npm run golden` schrijft ze naar golden/engine-<jaar>.json; golden.test.ts vergelijkt de engine
 * daarmee. Verandert een cijfer bewust, draai dan `npm run golden` en verklaar het verschil in de pull request.
 */
export function berekenGolden(jaar = 2026) {
  const params = laadParameters(jaar);
  const presets = laadPresets(params);
  const basis = maakBasis(params, laadPopulatie(jaar).huishoudens, laadKalibratie(jaar));
  // "+ 0" maakt van −0 een 0, zodat de JSON-vergelijking klopt.
  const r = (x: number, d = 4) => Math.round(x * 10 ** d) / 10 ** d + 0;
  const t = basis.totalen;

  const scenarios = presets.map((preset) => {
    const u = simuleer(basis, pasToe(params, preset.wijzigingen));
    return {
      id: preset.id,
      saldoMld: r(u.saldoMld),
      posten: Object.fromEntries(Object.entries(u.posten).map(([k, v]) => [k, r(v)])),
      armoede: r(u.armoede.personen),
      armoedeKinderen: r(u.armoede.kinderen),
      gini: r(u.gini, 5),
      decielenRelatief: u.decielen.map((d) => r(d.relatief, 3)),
      winnaars: u.winnaars.map((w) => r(w, 3)),
    };
  });

  const voorbeelden = laadVoorbeelden().huishoudens.map((v) => {
    const h = maakHuishouden(v.invoer, params);
    return {
      id: v.id,
      scenarios: Object.fromEntries(
        presets.map((preset) => {
          const p = pasToe(params, preset.wijzigingen);
          const res = berekenHuishouden(h, p, p === params ? undefined : params);
          return [
            preset.id,
            {
              belasting: r(res.belasting, 2),
              toeslagen: r(res.toeslagen, 2),
              besteedbaar: r(res.besteedbaar, 2),
            },
          ];
        }),
      ),
    };
  });

  const vlaktaks = presets.find((p) => p.id === "vlaktaks-40");
  const oplosser = vlaktaks
    ? (() => {
        const s = pasToe(params, vlaktaks.wijzigingen);
        const v = budgetneutraalViaVrijstelling(basis, s);
        const k = budgetneutraalViaTarieven(basis, s);
        return {
          vlaktaksVrijstelling: v.gelukt ? r(v.waarde, 0) : null,
          vlaktaksTariefFactor: k.gelukt ? r(k.waarde) : null,
        };
      })()
    : null;

  return {
    jaar,
    toelichting: "Gegenereerd door `npm run golden`. Niet met de hand bewerken.",
    kalibratie: {
      modelMld: {
        ibNaHra: r(t.belasting),
        hypotheekrente: r(t.hypotheekrente),
        zorgtoeslag: r(t.zorgtoeslag),
        huurtoeslag: r(t.huurtoeslag),
        kindgebondenBudget: r(t.kgb),
        kinderopvangtoeslag: r(t.kot),
      },
      schaal: Object.fromEntries(Object.entries(basis.schaal).map(([k, v]) => [k, r(v)])),
      armoedegrens: r(basis.armoedegrens, 2),
      armoede: r(basis.armoede.personen),
      gini: r(basis.gini, 5),
    },
    scenarios,
    voorbeelden,
    oplosser,
  };
}

export type Golden = ReturnType<typeof berekenGolden>;
