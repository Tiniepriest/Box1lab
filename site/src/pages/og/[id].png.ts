import type { APIRoute, GetStaticPaths } from "astro";
import { laadVerkiezing } from "@box1lab/engine/node";
import { params } from "../../lib/data.ts";
import { maakAfbeelding } from "../../lib/deelafbeelding.ts";
import { verkiezingIds } from "../../lib/verkiezingen.ts";
import { kerncijfers, kernzin } from "../../lib/voorstellen.ts";

/* Deelafbeeldingen per voorstel, per (echte) verkiezing of Belastingplan, en één algemene, gemaakt tijdens de build. */
const verkiezingen = verkiezingIds.map((id) => laadVerkiezing(id).verkiezing).filter((v) => !v.fictief);

export const getStaticPaths: GetStaticPaths = () => [
  { params: { id: "standaard" } },
  ...kerncijfers.map((k) => ({ params: { id: k.preset.id } })),
  ...verkiezingen.map((v) => ({ params: { id: `verkiezing-${v.id}` } })),
];

export const GET: APIRoute = async ({ params: p }) => {
  const k = kerncijfers.find((x) => x.preset.id === p.id);
  const v = verkiezingen.find((x) => `verkiezing-${x.id}` === p.id);
  const datum = v ? new Date(v.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) : "";
  const png = k
    ? await maakAfbeelding({
        titel: k.preset.naam,
        zin: kernzin(k),
        decielen: k.decielen,
        voet: `Doorgerekend met de regels van ${params.jaar}. Verandering van het besteedbaar inkomen per inkomensgroep.`,
      })
    : v
      ? await maakAfbeelding({
          titel: `${v.menu ?? v.naam}: wat betekent het voor jou?`,
          zin:
            v.soort === "akkoord"
              ? v.aangenomen
                ? "Reken uit wat het plan dat de Tweede Kamer aannam met jouw portemonnee doet."
                : "Reken uit wat het plan van het kabinet en de routes naar een meerderheid met jouw portemonnee doen."
              : "Reken uit wat de plannen van de partijen met jouw portemonnee doen.",
          voet: `${v.soort === "akkoord" ? (v.aangenomen ? "Aangenomen in de Tweede Kamer" : "Stemming in de Tweede Kamer") : "Verkiezing"}: ${datum} · gratis en onafhankelijk`,
        })
      : await maakAfbeelding({
          titel: "Wat betekent het belastingstelsel voor jou?",
          zin: "Reken je eigen situatie door en speel minister van Financiën.",
          voet: `Gratis en onafhankelijk · regels van ${params.jaar}`,
        });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
