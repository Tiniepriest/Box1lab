/*
 * Deelafbeeldingen (Open Graph, 1200 × 630) tijdens de build: Satori zet een opmaak om naar SVG, resvg naar PNG.
 * Kleuren uit de lichte designtokens; lettertype IBM Plex (lokaal, geen externe dienst).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const require = createRequire(import.meta.url);
const font = (pakket: string, bestand: string) => readFileSync(require.resolve(`${pakket}/files/${bestand}`));
const LETTERS = [
  {
    name: "Plex",
    data: font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-400-normal.woff"),
    weight: 400 as const,
  },
  {
    name: "Plex",
    data: font("@fontsource/ibm-plex-sans", "ibm-plex-sans-latin-600-normal.woff"),
    weight: 600 as const,
  },
  {
    name: "PlexSerif",
    data: font("@fontsource/ibm-plex-serif", "ibm-plex-serif-latin-600-normal.woff"),
    weight: 600 as const,
  },
];

const KLEUR = {
  bg: "#f6f7f9",
  panel: "#ffffff",
  fg: "#14181f",
  muted: "#5a6270",
  accent: "#1f4e8c",
  gain: "#2a78d6",
  loss: "#eb6834",
  zero: "#a3abb7",
  line: "#dde1e7",
};

type Knoop = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, ...children: unknown[]): Knoop => ({
  type,
  props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
});

export interface Kaart {
  titel: string;
  zin: string;
  /** Verandering per inkomensgroep in procent (optioneel). */
  decielen?: number[];
  voet: string;
}

export async function maakAfbeelding(k: Kaart): Promise<ArrayBuffer> {
  const max = Math.max(1, ...(k.decielen ?? [1]).map((v) => Math.abs(v)));
  const staven = k.decielen
    ? h(
        "div",
        { flexDirection: "column", gap: 8, width: 412, flexShrink: 0 },
        h(
          "div",
          {
            height: 220,
            alignItems: "center",
            gap: 8,
            borderBottom: `0px solid ${KLEUR.line}`,
            position: "relative",
          },
          ...k.decielen.map((v) =>
            h(
              "div",
              { flexDirection: "column", height: 220, width: 34, justifyContent: "center" },
              h(
                "div",
                {
                  height: 110,
                  alignItems: "flex-end",
                  justifyContent: "center",
                },
                v > 0
                  ? h("div", {
                      width: 34,
                      height: Math.max(2, (v / max) * 108),
                      background: KLEUR.gain,
                      borderRadius: 4,
                    })
                  : h("div", {}),
              ),
              h("div", { height: 2, background: KLEUR.zero, width: 34 }),
              h(
                "div",
                {
                  height: 108,
                  alignItems: "flex-start",
                  justifyContent: "center",
                },
                v < 0
                  ? h("div", {
                      width: 34,
                      height: Math.max(2, (-v / max) * 106),
                      background: KLEUR.loss,
                      borderRadius: 4,
                    })
                  : h("div", {}),
              ),
            ),
          ),
        ),
        h(
          "div",
          { justifyContent: "space-between", width: 412, fontSize: 20, color: KLEUR.muted },
          h("div", {}, "laagste inkomens"),
          h("div", {}, "hoogste"),
        ),
      )
    : null;

  const opmaak = h(
    "div",
    {
      width: 1200,
      height: 630,
      background: KLEUR.bg,
      padding: 56,
      flexDirection: "column",
      fontFamily: "Plex",
      color: KLEUR.fg,
    },
    h("div", { fontFamily: "PlexSerif", fontSize: 30, fontWeight: 600, color: KLEUR.accent }, "Box1lab"),
    h(
      "div",
      { height: 400, flexShrink: 0, alignItems: "center", gap: 48, marginTop: 24, marginBottom: 24 },
      h(
        "div",
        { flexDirection: "column", width: k.decielen ? 620 : 1088, flexShrink: 0, gap: 20 },
        h("div", { fontFamily: "PlexSerif", fontSize: 52, fontWeight: 600, lineHeight: 1.1 }, k.titel),
        h("div", { fontSize: 30, lineHeight: 1.35, color: KLEUR.fg }, k.zin),
      ),
      ...(staven ? [staven] : []),
    ),
    h("div", { fontSize: 22, color: KLEUR.muted, flexShrink: 0 }, k.voet),
  );

  const svg = await satori(opmaak as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: LETTERS,
  });
  const png = new Resvg(svg).render().asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
