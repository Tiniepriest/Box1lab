import {
  aowPerJaar,
  vulBijstandIn,
  type Kalibratie,
  type Lid,
  type Parameters,
  type PopulatieHuishouden,
} from "@box1lab/engine";
import { inverseNormaal, normaleVerdeling } from "./normaal.ts";
import type { Spec } from "./spec.ts";
import { maakToeval, type Toeval } from "./toeval.ts";

/*
 * Genereert de synthetische populatie: per CBS-cel (leeftijd referentiepersoon × samenstelling) een aantal
 * huishoudens met inkomens, woning en kinderopvang volgens de aannames in de spec. Het startgewicht van een
 * huishouden is het aantal echte huishoudens in de cel gedeeld door het aantal synthetische.
 *
 * Topinkomens (D-068): de inkomensposities in een cel liggen vast ((j + 0,5) / n), dus de hoogste positie is in een cel
 * van 50 huishoudens het 99e percentiel en de top wordt afgekapt. Daarom vervangen we werkenden met een inkomen boven
 * `inkomen.top.vanaf` door extra huishoudens per cel waarvan het inkomen van de hoofdverdiener een Pareto-verdeling
 * volgt, met het gewicht van het deel van de cel dat boven die grens ligt.
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
  // Een eigen reeks toevalsgetallen voor de topinkomens, zodat de gewone huishoudens niet veranderen.
  const staartToeval = maakToeval(spec.zaad + 7);

  for (const cel of geldig) {
    const n = Math.max(spec.minimumPerCel, Math.round((spec.aantal * cel.N) / totaal));
    const gewicht = (cel.N * opschaling[cel.type]) / n;
    const partners = cel.type.startsWith("paar");
    const eenouder = cel.type.startsWith("eenouder");
    const aantalKinderen = Number(cel.type.slice(-1)) || 0;
    const categorie = partners ? "paar" : eenouder ? "eenouder" : "alleenstaand";

    /**
     * Eén huishouden. Gewoon: op inkomenspositie `positie`; `top` is dan waar als de hoofdverdiener werkt en boven de
     * grens voor topinkomens uitkomt (die vervangen we). Met `staart`: een werkende hoofdverdiener uit het stuk
     * [van, tot) van de Pareto-staart (0 = de grens, 1 = het hoogste inkomen), met het gemiddelde inkomen van dat stuk;
     * het gewicht is het deel van de cel dat in dat stuk valt.
     */
    const maak = (
      toeval: Toeval,
      positie: number,
      gewicht: number,
      staart?: { van: number; tot: number },
    ): { huishouden: PopulatieHuishouden; top: boolean } | null => {
      const leeftijd = Math.min(cel.tot - 1, Math.floor(cel.van + (cel.tot - cel.van) * toeval.uniform()));
      const aow = leeftijd >= p.uitkeringen.aowLeeftijd;
      if (staart !== undefined && aow) return null;
      const factorType = partners ? 1 : eenouder ? s.factorEenouder : s.factorAlleenstaand;
      const mediaanWerk = s.mediaanHoofdverdiener * profiel(spec, leeftijd) * factorType;
      // Positie in de cel waarboven het lognormale inkomen de grens voor topinkomens haalt.
      const topPositie = normaleVerdeling(Math.log(s.top.vanaf / mediaanWerk) / s.spreiding);
      let q = positie;
      let topInkomen = 0;
      if (staart !== undefined) {
        const { van, tot } = staart;
        q = topPositie + ((1 - topPositie) * (van + tot)) / 2;
        // Gemiddelde van een Pareto-verdeling tussen de posities van en tot: zo blijft het totale inkomen in de staart
        // behouden, ook van de allerhoogste inkomens.
        const e = 1 - 1 / s.top.alfa;
        topInkomen = (s.top.vanaf * (Math.pow(1 - van, e) - Math.pow(1 - tot, e))) / (e * (tot - van));
        // Alleen werkenden: het deel met een uitkering zit al bij de gewone huishoudens.
        gewicht *= (1 - topPositie) * (1 - s.uitkeringKans[categorie]) * (tot - van);
        // Minder dan één echt huishouden (bijvoorbeeld bij jonge mensen, die bijna nooit zo veel verdienen): weglaten.
        if (gewicht < 1) return null;
      }
      const zq = inverseNormaal(q);
      let top = false;

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
        let hoofd: Lid;
        // Werkenden: werknemer (de pensioenpremie komt later, bij de kalibratie) of zelfstandig ondernemer.
        const werk = (inkomen: number): Lid =>
          toeval.uniform() < s.zelfstandigKans
            ? {
                inkomen,
                soort: "werk",
                uitkering: 0,
                ondernemer: { urencriterium: toeval.uniform() < s.urencriteriumKans, starter: false },
              }
            : { inkomen, soort: "werk", uitkering: 0 };
        const bijstand = (): Lid => ({
          inkomen: 0,
          soort: "uitkering",
          uitkering: 0,
          uitkeringSoort: "bijstand",
        });
        if (staart !== undefined) {
          hoofd = werk(topInkomen);
        } else if (toeval.uniform() < s.uitkeringKans[categorie]) {
          const x = s.uitkering.minimum + (s.uitkering.maximum - s.uitkering.minimum) * toeval.uniform();
          hoofd =
            toeval.uniform() < s.aandeelBijstand
              ? bijstand()
              : { inkomen: x, soort: "uitkering", uitkering: x, uitkeringSoort: "werknemersverzekering" };
        } else {
          hoofd = werk(mediaanWerk * Math.exp(s.spreiding * zq));
          top = hoofd.inkomen >= s.top.vanaf;
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

      const huishouden: PopulatieHuishouden = {
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
      };
      return { huishouden, top };
    };

    for (let j = 0; j < n; j++) {
      // Werkenden boven de grens voor topinkomens vervangen we door de staart hieronder. Hun toevalsgetallen worden
      // wel getrokken, zodat de andere huishoudens dezelfde blijven.
      const h = maak(toeval, (j + 0.5) / n, gewicht)!;
      if (!h.top) pop.push(h.huishouden);
    }
    // De staart in stukken die naar boven steeds half zo groot worden (de helft, een kwart, ...; het laatste stuk loopt
    // door tot het hoogste inkomen), zodat ook de allerhoogste inkomens een eigen huishouden hebben.
    const m = s.top.extraPerCel;
    for (let j = 0; j < m; j++) {
      const van = 1 - 0.5 ** j;
      const tot = j === m - 1 ? 1 : 1 - 0.5 ** (j + 1);
      const h = maak(staartToeval, 0, cel.N * opschaling[cel.type], { van, tot });
      if (h) pop.push(h.huishouden);
    }
  }
  return pop;
}
