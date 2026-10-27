import { inverseNormaal } from "./normaal.ts";

/** Reproduceerbare toevalsgenerator (mulberry32): hetzelfde zaad geeft altijd dezelfde reeks. */
export function maakToeval(zaad: number) {
  let s = zaad >>> 0;
  const uniform = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    uniform,
    /** Standaardnormaal getrokken getal. */
    normaal: () => inverseNormaal(Math.min(1 - 1e-12, Math.max(1e-12, uniform()))),
  };
}

export type Toeval = ReturnType<typeof maakToeval>;
