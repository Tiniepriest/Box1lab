import type { APIRoute, GetStaticPaths } from "astro";
import { params } from "../../lib/data.ts";
import { maakAfbeelding } from "../../lib/deelafbeelding.ts";
import { kerncijfers, kernzin } from "../../lib/voorstellen.ts";

/* Deelafbeeldingen per voorstel en één algemene, gemaakt tijdens de build. */
export const getStaticPaths: GetStaticPaths = () => [
  { params: { id: "standaard" } },
  ...kerncijfers.map((k) => ({ params: { id: k.preset.id } })),
];

export const GET: APIRoute = async ({ params: p }) => {
  const k = kerncijfers.find((x) => x.preset.id === p.id);
  const png = k
    ? await maakAfbeelding({
        titel: k.preset.naam,
        zin: kernzin(k),
        decielen: k.decielen,
        voet: `Doorgerekend met de regels van ${params.jaar}. Verandering van het besteedbaar inkomen per inkomensgroep.`,
      })
    : await maakAfbeelding({
        titel: "Wat betekent het belastingstelsel voor jou?",
        zin: "Reken je eigen situatie door en speel minister van Financiën.",
        voet: `Gratis en onafhankelijk · regels van ${params.jaar}`,
      });
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
