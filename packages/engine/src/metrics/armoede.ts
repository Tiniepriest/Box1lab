import type { Huishouden, Resultaat } from "../huishouden.ts";
import type { Parameters } from "../parameters/schema.ts";

/*
 * Armoede volgens CBS, Nibud en SCP (D-098). Een huishouden is arm als het inkomen lager is dan zijn eigen
 * armoedegrens én het vrij opneembaar vermogen niet groter is dan die grens over een jaar. De grens is het
 * normbedrag voor de basisbehoeften van het huishoudtype plus de werkelijke huur en energie. Studenten- en
 * institutionele huishoudens telt het CBS niet mee; die zitten niet in de nagebootste bevolking.
 */

export interface Armoede {
  /** Percentage personen in een huishouden onder de armoedegrens. */
  personen: number;
  /** Percentage kinderen (jonger dan de volwassenleeftijd) in een huishouden onder de armoedegrens. */
  kinderen: number;
}

export interface ArmoedeToets {
  /** Armoedegrens van dit huishouden, euro per jaar. */
  grens: number;
  /** Inkomen dat het CBS ertegen zet, euro per jaar. */
  inkomen: number;
  /** Vrij opneembaar vermogen: spaargeld en beleggingen, zonder schulden en zonder de eigen woning. */
  vermogen: number;
  arm: boolean;
  /** Personen in het huishouden van 18 jaar of ouder, en kinderen jonger dan 18. */
  volwassenen: number;
  minderjarigen: number;
}

/** Samenstelling zoals het CBS die telt: volwassenen (ook meerderjarige kinderen), tieners en jongere kinderen. */
function samenstelling(h: Huishouden, p: Parameters) {
  const volwassenVanaf = p.zorg.volwassenVanaf;
  const tienerVanaf = p.armoede.tienerVanaf;
  const meerderjarig = h.kinderen.filter((l) => l >= volwassenVanaf).length;
  return {
    volwassenen: (h.partners ? 2 : 1) + meerderjarig,
    tieners: h.kinderen.filter((l) => l >= tienerVanaf && l < volwassenVanaf).length,
    kinderen: h.kinderen.filter((l) => l < tienerVanaf).length,
  };
}

/** Prijsstijging van het peiljaar van de tabel tot het jaar van de parameters. */
function indexfactor(p: Parameters): number {
  return p.armoede.indexatie.reduce((f, i) => f * (1 + i / 100), 1);
}

/**
 * De armoedetoets voor één huishouden. `eigenRisicoPerVolwassene` is het gemiddelde verbruik van het verplicht
 * eigen risico (euro per jaar); het CBS trekt dat af van het inkomen, net als de nominale premie.
 */
export function armoedeToets(
  h: Huishouden,
  r: Resultaat,
  p: Parameters,
  eigenRisicoPerVolwassene: number,
): ArmoedeToets {
  const s = samenstelling(h, p);
  const type = p.armoede.typen.find(
    (t) => t.volwassenen === s.volwassenen && t.tieners === s.tieners && t.kinderen === s.kinderen,
  );
  if (!type)
    throw new Error(
      `Geen armoedegrens voor ${s.volwassenen} volwassene(n), ${s.tieners} tiener(s) en ${s.kinderen} kind(eren).`,
    );
  const f = indexfactor(p);
  // Werkelijke huur voor huurders (de kale huur; de huurtoeslag zit in het inkomen). Van eigenaren kent het model
  // alleen de hypotheekrente, niet de andere kosten van de woning: dan, zoals het CBS doet als de werkelijke
  // woonlasten onbekend zijn, het normbedrag. Energie: altijd het normbedrag (het verbruik zit niet in het model).
  const wonen = h.huurPerMaand > 0 ? h.huurPerMaand : type.huur * f;
  const grens = 12 * ((type.grens - type.huur) * f + wonen);
  const inkomen = r.besteedbaar - r.kot - r.zorgpremie - eigenRisicoPerVolwassene * s.volwassenen;
  const vermogen = h.box3 ? h.box3.bank + h.box3.overig : Math.max(0, h.vermogen);
  return {
    grens,
    inkomen,
    vermogen,
    arm: inkomen < grens && vermogen <= grens,
    volwassenen: s.volwassenen,
    minderjarigen: s.tieners + s.kinderen,
  };
}

/** Gemiddeld verbruik van het verplicht eigen risico per volwassene: de opbrengst gedeeld door alle volwassenen. */
export function eigenRisicoPerVolwassene(
  populatie: readonly Huishouden[],
  gewichten: readonly number[],
  p: Parameters,
): number {
  let volwassenen = 0;
  populatie.forEach((h, i) => (volwassenen += gewichten[i]! * samenstelling(h, p).volwassenen));
  return volwassenen ? (p.armoede.eigenRisicoMld * 1e9) / volwassenen : 0;
}

/** Aandeel personen en kinderen onder de armoedegrens. `gewichten` zijn huishoudgewichten. */
export function onderArmoedegrens(
  populatie: readonly Huishouden[],
  resultaten: readonly Resultaat[],
  gewichten: readonly number[],
  p: Parameters,
  eigenRisico: number,
): Armoede {
  let arm = 0;
  let armKinderen = 0;
  let personen = 0;
  let kinderen = 0;
  resultaten.forEach((r, i) => {
    const w = gewichten[i]!;
    const t = armoedeToets(populatie[i]!, r, p, eigenRisico);
    const ps = (t.volwassenen + t.minderjarigen) * w;
    personen += ps;
    kinderen += t.minderjarigen * w;
    if (t.arm) {
      arm += ps;
      armKinderen += t.minderjarigen * w;
    }
  });
  return { personen: (arm / personen) * 100, kinderen: kinderen ? (armKinderen / kinderen) * 100 : 0 };
}
