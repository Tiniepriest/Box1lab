/*
 * Rekenkern van Box1lab. Puur TypeScript: geen DOM, geen UI, geen bestandstoegang.
 * Bestanden inlezen in Node (tests, scripts): zie "@box1lab/engine/node".
 */

export * from "./versie.ts";
export * from "./datum.ts";

export * from "./parameters/schema.ts";
export * from "./parameters/wijzig.ts";
export * from "./parameters/yaml.ts";
export * from "./regels/box1.ts";
export * from "./regels/heffingskortingen.ts";
export * from "./regels/eigenwoning.ts";
export * from "./regels/toeslagen/zorgtoeslag.ts";
export * from "./regels/toeslagen/huurtoeslag.ts";
export * from "./regels/toeslagen/kgb.ts";
export * from "./regels/toeslagen/kot.ts";
export * from "./regels/uitkeringen.ts";
export * from "./regels/kinderbijslag.ts";
export * from "./regels/zorg.ts";
export * from "./huishouden.ts";
export * from "./populatie.ts";
export * from "./metrics/armoede.ts";
export * from "./metrics/decielen.ts";
export * from "./metrics/gewogen.ts";
export * from "./metrics/gini.ts";
export * from "./metrics/marginaal.ts";
export * from "./metrics/winnaars.ts";
export * from "./simulatie.ts";
export * from "./oplosser.ts";
export * from "./scenario/preset.ts";
export * from "./voorbeelden.ts";
export * from "./invoer.ts";
export * from "./lab.ts";
export * from "./metrics/positie.ts";
export * from "./scenario/code.ts";
export * from "./verkiezing.ts";
export * from "./changelog.ts";
