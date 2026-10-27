import type { Parameters } from "./parameters/schema.ts";
import { simuleer, type Basis } from "./simulatie.ts";

export type Oplossing =
  { gelukt: true; params: Parameters; waarde: number } | { gelukt: false; reden: string };

/** Bisectie: vindt x in [lo, hi] waar f van teken wisselt, met f(lo) > 0 en f(hi) < 0. */
function bisectie(f: (x: number) => number, lo: number, hi: number, stappen = 45): number {
  for (let i = 0; i < stappen; i++) {
    const m = (lo + hi) / 2;
    if (f(m) > 0) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/** Zoekt de vrijstelling waarbij het overheidssaldo van het scenario nul is. */
export function budgetneutraalViaVrijstelling(basis: Basis, scenario: Parameters, max = 150_000): Oplossing {
  const met = (v: number): Parameters => ({ ...scenario, box1: { ...scenario.box1, vrijstelling: v } });
  const saldo = (v: number) => simuleer(basis, met(v)).saldoMld;
  if (saldo(0) < 0) {
    return {
      gelukt: false,
      reden: "Zelfs zonder vrijstelling levert dit scenario minder op dan het huidige beleid.",
    };
  }
  if (saldo(max) > 0) return { gelukt: false, reden: `Niet mogelijk met een vrijstelling tot €${max}.` };
  const v = bisectie(saldo, 0, max);
  return { gelukt: true, params: met(v), waarde: v };
}

/** Zoekt de factor waarmee alle schijftarieven vermenigvuldigd moeten worden voor een saldo van nul. */
export function budgetneutraalViaTarieven(basis: Basis, scenario: Parameters, maxFactor = 2.5): Oplossing {
  const met = (k: number): Parameters => ({
    ...scenario,
    box1: { ...scenario.box1, schijven: scenario.box1.schijven.map((s) => ({ ...s, tarief: s.tarief * k })) },
  });
  const saldo = (k: number) => simuleer(basis, met(k)).saldoMld;
  if (saldo(0) > 0 || saldo(maxFactor) < 0) {
    return { gelukt: false, reden: "Niet mogelijk door alleen de tarieven te schalen." };
  }
  const k = bisectie((x) => -saldo(x), 0, maxFactor);
  return { gelukt: true, params: met(k), waarde: k };
}
