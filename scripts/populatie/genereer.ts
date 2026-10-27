import {
  aowPerJaar,
  vulBijstandIn,
  type Kalibratie,
  type Lid,
  type Parameters,
  type PopulatieHuishouden,
} from "@box1lab/engine";
import { inverseNormaal } from "./normaal.ts";
import type { Spec } from "./spec.ts";
import { maakToeval } from "./toeval.ts";

/*
 * Genereert de synthetische populatie: per CBS-cel (leeftijd referentiepersoon × samenstelling) een aantal
 * huishoudens met inkomens, woning en kinderopvang volgens de aannames in de spec. Het startgewicht van een
 * huishouden is het aantal echte huishoudens in de cel gedeeld door het aantal synthetische.
 */

export const TYPES = [
  "alleenstaand",
  "paar0",
  "paar1",
  "paar2",
  "paar3",
  "eenouder1",
  "eenouder2",
  "eenouder3",
] as const;
export type HuishoudType = (typeof TYPES)[number];

const logistisch = (x: number) => 1 / (1 + Math.exp(-x));

function profiel(spec: Spec, leeftijd: number): number {
  let f = spec.inkomen.leeftijdsprofiel[0]!.factor;
  for (const r of spec.inkomen.leeftijdsprofiel) if (leeftijd >= r.vanaf) f = r.factor;
  return f;
}

interface Cel {
  van: number;
  tot: number;
  type: HuishoudType;
  N: number;
}

export function genereerPopulatie(spec: Spec, kal: Kalibratie, p: Parameters): PopulatieHuishouden[] {
  const toeval = maakToeval(spec.zaad);
  const cellen: Cel[] = kal.huishoudens.leeftijdsgroepen.flatMap((g) =>
    TYPES.map((type) => ({ van: g.van, tot: g.tot, type, N: g[type] })),
  );
  const totaal = cellen.reduce((s, c) => s + c.N, 0);
  const geldig = cellen.filter((c) => c.N >= spec.minimaleCel);
  // Gewicht van overgeslagen kleine cellen gaat naar dezelfde samenstelling in de andere leeftijdsgroepen.
  const opschaling = Object.fromEntries(
    TYPES.map((t) => {
      const alle = cellen.filter((c) => c.type === t).reduce((s, c) => s + c.N, 0);
      const mee = geldig.filter((c) => c.type === t).reduce((s, c) => s + c.N, 0);
      return [t, mee ? alle / mee : 0];
    }),
  ) as Record<HuishoudType, number>;

  const aowAlleen = aowPerJaar(p, false);
  const aowPartner = aowPerJaar(p, true);
  const s = spec.inkomen;
  const pop: PopulatieHuishouden[] = [];

  for (const cel of geldig) {
    const n = Math.max(spec.minimumPerCel, Math.round((spec.aantal * cel.N) / totaal));
    const gewicht = (cel.N * opschaling[cel.type]) / n;
    const partners = cel.type.startsWith("paar");
    const eenouder = cel.type.startsWith("eenouder");
    const aantalKinderen = Number(cel.type.slice(-1)) || 0;
    const categorie = partners ? "paar" : eenouder ? "eenouder" : "alleenstaand";

    for (let j = 0; j < n; j++) {
      const q = (j + 0.5) / n; // inkomenspositie binnen de cel
      const zq = inverseNormaal(q);
      const leeftijd = Math.min(cel.tot - 1, Math.floor(cel.van + (cel.tot - cel.van) * toeval.uniform()));
      const aow = leeftijd >= p.uitkeringen.aowLeeftijd;

      // Inkomen
      let leden: Lid[];
      if (aow) {
        const pmed = partners ? spec.pensioen.mediaanPaar : spec.pensioen.mediaanAlleenstaand;
        const pensioen = pmed * Math.exp(spec.pensioen.spreiding * zq);
        if (partners) {
          const a = spec.pensioen.aandeelHoofd;
          leden = [
            { inkomen: aowPartner + pensioen * a, soort: "aow", uitkering: aowPartner },
            { inkomen: aowPartner + pensioen * (1 - a), soort: "aow", uitkering: aowPartner },
          ];
        } else {
          leden = [{ inkomen: aowAlleen + pensioen, soort: "aow", uitkering: aowAlleen }];
        }
      } else {
        const factor = partners ? 1 : eenouder ? s.factorEenouder : s.factorAlleenstaand;
        const mediaan = s.mediaanHoofdverdiener * profiel(spec, leeftijd) * factor;
        let hoofd: Lid;
        // Werkenden: werknemer met de standaard pensioenpremie, of zelfstandig ondernemer.
        const werk = (inkomen: number): Lid =>
          toeval.uniform() < s.zelfstandigKans
            ? {
                inkomen,
                soort: "werk",
                uitkering: 0,
                ondernemer: { urencriterium: toeval.uniform() < s.urencriteriumKans, starter: false },
              }
            : { inkomen, soort: "werk", uitkering: 0, pensioenpremie: "standaard" };
        const bijstand = (): Lid => ({
          inkomen: 0,
          soort: "uitkering",
          uitkering: 0,
          uitkeringSoort: "bijstand",
        });
        if (toeval.uniform() < s.uitkeringKans[categorie]) {
          const x = s.uitkering.minimum + (s.uitkering.maximum - s.uitkering.minimum) * toeval.uniform();
          hoofd =
            toeval.uniform() < s.aandeelBijstand
              ? bijstand()
              : { inkomen: x, soort: "uitkering", uitkering: x, uitkeringSoort: "werknemersverzekering" };
        } else {
          hoofd = werk(mediaan * Math.exp(s.spreiding * zq));
        }
        leden = [hoofd];
        if (partners) {
          if (hoofd.uitkeringSoort === "bijstand") {
            leden.push(bijstand());
          } else if (hoofd.soort === "werk" && toeval.uniform() < s.partnerWerkt) {
            const rho = s.partnerCorrelatie;
            const z2 = rho * zq + Math.sqrt(1 - rho * rho) * toeval.normaal();
            const x2 =
              s.mediaanHoofdverdiener *
              profiel(spec, leeftijd) *
              s.partnerAandeel *
              Math.exp(s.spreiding * z2);
            leden.push(werk(x2));
          } else {
            leden.push({ inkomen: 0, soort: "geen", uitkering: 0 });
          }
        }
      }
      vulBijstandIn(
        leden,
        leden.map((l) => l.uitkeringSoort === "bijstand"),
        partners,
        p,
      );
      const bruto = leden.reduce((t, l) => t + l.inkomen, 0);

      // Kinderen
      const k = spec.kinderen;
      const oudste = Math.round(leeftijd - k.leeftijdsverschil + k.spreiding * toeval.normaal());
      const kinderen = Array.from({ length: aantalKinderen }, (_, i) =>
        Math.max(0, Math.min(30, Math.round(oudste - i * k.tussenruimte))),
      );
      const ki = k.inkomen;
      const bijbaan = () => ki.bijbaan.minimum + (ki.bijbaan.maximum - ki.bijbaan.minimum) * toeval.uniform();
      const kindInkomens = kinderen.map((l) => {
        if (l < p.zorg.volwassenVanaf) return 0;
        if (l < ki.studieTotLeeftijd) return bijbaan();
        return toeval.uniform() < ki.werkKans
          ? ki.mediaanWerk * Math.exp(ki.spreiding * toeval.normaal())
          : bijbaan();
      });

      // Woning
      const w = spec.woning;
      const koopScore =
        w.koop.basis +
        w.koop.perJaarLeeftijd * Math.min(leeftijd, w.koop.maxLeeftijdEffect) +
        w.koop.inkomen * (q - 0.5) +
        (partners ? 0 : w.koop.alleenstaand);
      let woonvorm: PopulatieHuishouden["woonvorm"];
      let huurPerMaand = 0;
      let woz = 0;
      let hypotheekrente = 0;
      if (toeval.uniform() < logistisch(koopScore)) {
        woonvorm = "koop";
        woz = Math.min(
          w.wozMaximum,
          Math.max(
            w.wozMinimum,
            w.wozPerBrutoInkomen * bruto * (1 + w.wozSpreiding * (2 * toeval.uniform() - 1)),
          ),
        );
        const rest = Math.max(0, 1 - (leeftijd - 30) / (w.hypotheekAfgelostOpLeeftijd - 30));
        const hypotheek =
          Math.min(w.hypotheekPerBrutoInkomen * bruto, w.hypotheekMaximum) *
          Math.min(1, rest) *
          (1 + w.hypotheekSpreiding * (2 * toeval.uniform() - 1));
        hypotheekrente = (w.hypotheekrentePct / 100) * Math.min(hypotheek, woz);
      } else if (toeval.uniform() < logistisch(w.corporatie.basis + w.corporatie.inkomen * (q - 0.5))) {
        woonvorm = "corporatie";
        huurPerMaand =
          w.huurCorporatie.minimum + (w.huurCorporatie.maximum - w.huurCorporatie.minimum) * toeval.uniform();
      } else {
        woonvorm = "particulier";
        huurPerMaand =
          w.huurParticulier.minimum +
          (w.huurParticulier.maximum - w.huurParticulier.minimum) * toeval.uniform();
      }

      // Kinderopvang
      const ko = spec.kinderopvang;
      const allenWerken = leden.every((l) => l.soort === "werk" && l.inkomen > 0);
      const kinderopvang: PopulatieHuishouden["kinderopvang"] = [];
      if (
        allenWerken &&
        kinderen.some((l) => l < ko.buitenschoolse.totLeeftijd) &&
        toeval.uniform() < ko.kans
      ) {
        for (const l of kinderen) {
          if (l >= ko.buitenschoolse.totLeeftijd) continue;
          const soort = l < ko.dagopvang.totLeeftijd ? "dagopvang" : "buitenschoolse";
          const factor =
            ko.uurprijsFactor.minimum +
            (ko.uurprijsFactor.maximum - ko.uurprijsFactor.minimum) * toeval.uniform();
          kinderopvang.push({
            soort,
            urenPerMaand: ko[soort].urenPerMaand,
            uurprijs: p.toeslagen.kinderopvangtoeslag.maxUurprijs[soort] * factor,
          });
        }
      }

      pop.push({
        type: cel.type,
        leeftijd,
        woonvorm,
        gewicht,
        leden,
        partners,
        kinderen,
        ...(kindInkomens.some((y) => y > 0) ? { kindInkomens } : {}),
        huurPerMaand,
        hypotheekrente,
        woz,
        kinderopvang,
        vermogen: 0,
      });
    }
  }
  return pop;
}
