/*
 * Draait de ongewijzigde prototype-engine (prototype/engine.js) en schrijft de uitkomsten naar
 * packages/engine/test/golden/prototype-2026.json. Die uitkomsten zijn de pariteitsbaseline voor fase 1.
 *
 * De macro-logica (run, decielen, armoede, gini, oplosser) staat in het prototype in belastinglab.html
 * en is hieronder letterlijk overgenomen.
 *
 * Gebruik: node scripts/prototype-golden.cjs
 */
/* eslint-disable */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "prototype/engine.js"), "utf8");
const ctx = { module: { exports: {} }, Math, Infinity };
vm.runInNewContext(src, ctx);
const { HUIDIG, PRESETS, buildPop, baseline, totals, calcHH, OFFICIEEL } = ctx.module.exports;

/* ---- uit belastinglab.html ---- */
const POP = buildPop();
const BASE = baseline(POP);
const BT = totals(BASE, POP);
const OVERIG = 4.0;
const SC = {
  ib: OFFICIEEL.ib / (BT.tax - BT.ew),
  zt: OFFICIEEL.zorg / BT.zt,
  ht: OFFICIEEL.huur / BT.ht,
  kg: OFFICIEEL.kgb / BT.kg,
  ko: OFFICIEEL.kot / BT.ko,
};
const ORDER = POP.map((h, i) => i).sort((a, b) => BASE[a].best / BASE[a].eq - BASE[b].best / BASE[b].eq);
const PW = POP.map((h, i) => h.w * (BASE[i].adults + BASE[i].kids));
const DEC = new Array(POP.length);
(function () {
  const T = PW.reduce((a, b) => a + b, 0);
  let c = 0;
  ORDER.forEach((i) => {
    c += PW[i];
    DEC[i] = Math.min(9, Math.floor(((c - PW[i] / 2) / T) * 10));
  });
})();
function wMedian(vals, ws) {
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
  const T = ws.reduce((a, b) => a + b, 0);
  let c = 0;
  for (const i of idx) {
    c += ws[i];
    if (c >= T / 2) return vals[i];
  }
}
const EQB = BASE.map((r) => r.best / r.eq);
const ARMGRENS = 0.6 * wMedian(EQB, PW);
function gini(vals, ws) {
  const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b]);
  let T = 0,
    S = 0;
  idx.forEach((i) => {
    T += ws[i];
    S += ws[i] * vals[i];
  });
  let cs = 0,
    B = 0;
  idx.forEach((i) => {
    const w = ws[i];
    cs += w * vals[i];
    B += w * (cs - (w * vals[i]) / 2);
  });
  return 1 - (2 * B) / (T * S);
}
function armoede(res) {
  let p = 0,
    k = 0,
    T = 0,
    TK = 0;
  res.forEach((r, i) => {
    const w = POP[i].w;
    const ps = (r.adults + r.kids) * w;
    T += ps;
    TK += r.kids * w;
    if (r.best / r.eq < ARMGRENS) {
      p += ps;
      k += r.kids * w;
    }
  });
  return { all: (p / T) * 100, kids: (k / TK) * 100 };
}
function run(p) {
  const res = POP.map((h) => calcHH(h, p, HUIDIG));
  const t = totals(res, POP);
  const lines = [
    ["box1", (t.tax - BT.tax) * SC.ib],
    ["eigenWoning", (BT.ew - t.ew) * SC.ib],
    ["overigeAftrek", OVERIG * (1 - p.overig / 100)],
    ["zorgtoeslag", (BT.zt - t.zt) * SC.zt],
    ["huurtoeslag", (BT.ht - t.ht) * SC.ht],
    ["kgb", (BT.kg - t.kg) * SC.kg],
    ["kot", (BT.ko - t.ko) * SC.ko],
    ["uitkeringen", -t.uitk * SC.ib],
  ];
  return { res, lines, total: lines.reduce((s, l) => s + l[1], 0) };
}
function verdeling(res) {
  const dec = Array.from({ length: 10 }, () => ({ d: 0, b: 0, w: 0, pw: 0, sh: [0, 0, 0, 0, 0] }));
  const all = [0, 0, 0, 0, 0];
  let allW = 0;
  res.forEach((r, i) => {
    const a = BASE[i],
      g = dec[DEC[i]],
      w = POP[i].w,
      pw = PW[i];
    const d = r.best - a.best,
      rel = (d / Math.max(1, a.best)) * 100;
    g.d += d * w;
    g.b += a.best * w;
    g.w += w;
    g.pw += pw;
    const c = rel < -5 ? 0 : rel < -1 ? 1 : rel <= 1 ? 2 : rel <= 5 ? 3 : 4;
    g.sh[c] += pw;
    all[c] += pw;
    allW += pw;
  });
  return {
    decielen: dec.map((g) => ({
      gemiddeld: g.d / g.w,
      relatief: (g.d / g.b) * 100,
      aandelen: g.sh.map((v) => (v / g.pw) * 100),
    })),
    alle: all.map((v) => (v / allW) * 100),
  };
}
function solve(fn, lo, hi) {
  for (let k = 0; k < 45; k++) {
    const m = (lo + hi) / 2;
    fn(m) > 0 ? (lo = m) : (hi = m);
  }
  return (lo + hi) / 2;
}

const HH = [
  {
    pc: "P10",
    x1: 20000,
    s1: "uitk",
    x2: 0,
    s2: "",
    kids: 0,
    kids12: false,
    huur: 750,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  },
  {
    pc: "P20",
    x1: 25000,
    s1: "aow",
    x2: 0,
    s2: "",
    kids: 0,
    kids12: false,
    huur: 650,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  },
  {
    pc: "P30",
    x1: 32000,
    s1: "werk",
    x2: 0,
    s2: "",
    kids: 0,
    kids12: false,
    huur: 850,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  },
  {
    pc: "P50",
    x1: 48000,
    s1: "werk",
    x2: 22000,
    s2: "werk",
    kids: 2,
    kids12: true,
    huur: 0,
    rente: 9000,
    woz: 400000,
    kotKosten: 0,
  },
  {
    pc: "P75",
    x1: 62000,
    s1: "werk",
    x2: 40000,
    s2: "werk",
    kids: 2,
    kids12: true,
    huur: 0,
    rente: 12000,
    woz: 500000,
    kotKosten: 0,
  },
  {
    pc: "P90",
    x1: 110000,
    s1: "werk",
    x2: 60000,
    s2: "werk",
    kids: 0,
    kids12: false,
    huur: 0,
    rente: 15000,
    woz: 650000,
    kotKosten: 0,
  },
  {
    pc: "P99",
    x1: 350000,
    s1: "werk",
    x2: 50000,
    s2: "werk",
    kids: 0,
    kids12: false,
    huur: 0,
    rente: 20000,
    woz: 1200000,
    kotKosten: 0,
  },
  {
    pc: "Jij",
    x1: 45000,
    s1: "werk",
    x2: 30000,
    s2: "werk",
    kids: 1,
    kids12: true,
    huur: 1100,
    rente: 0,
    woz: 0,
    kotKosten: 8000,
  },
];
const AOW1 = 19800,
  AOW2 = 13600;
function toHH(e) {
  const paar = !!e.s2;
  const mk = (x, s, paarAow) => ({
    x: s === "geen" ? 0 : x,
    soort: s,
    b: s === "uitk" ? x : s === "aow" ? Math.min(x, paarAow ? AOW2 : AOW1) : 0,
  });
  const leden = [mk(e.x1, e.s1, paar && e.s2 === "aow")];
  if (paar) leden.push(mk(e.x2, e.s2, e.s1 === "aow"));
  return {
    leden,
    paar,
    kids: e.kids,
    kids12: e.kids > 0 && e.kids12,
    huur: e.huur,
    rente: e.huur ? 0 : e.rente,
    woz: e.huur ? 0 : e.woz,
    kotKosten: e.kids > 0 ? e.kotKosten : 0,
  };
}
const CURVES = [
  (x) => ({
    leden: [{ x, soort: "werk", b: 0 }],
    paar: false,
    kids: 0,
    kids12: false,
    huur: 850,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  }),
  (x) => ({
    leden: [{ x, soort: "werk", b: 0 }],
    paar: false,
    kids: 1,
    kids12: true,
    huur: 850,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  }),
  (x) => ({
    leden: [
      { x, soort: "werk", b: 0 },
      { x: 0, soort: "geen", b: 0 },
    ],
    paar: true,
    kids: 2,
    kids12: true,
    huur: 950,
    rente: 0,
    woz: 0,
    kotKosten: 0,
  }),
  (x) => ({
    leden: [
      { x: 0.6 * x, soort: "werk", b: 0 },
      { x: 0.4 * x, soort: "werk", b: 0 },
    ],
    paar: true,
    kids: 2,
    kids12: true,
    huur: 0,
    rente: 0.034 * 3.6 * x * 0.8,
    woz: Math.max(260000, 4.6 * x),
    kotKosten: 0,
  }),
];
const pick = (r) => ({
  bruto: r.bruto,
  belasting: r.tax,
  eigenWoning: r.ew,
  zorgtoeslag: r.zt,
  huurtoeslag: r.ht,
  kgb: r.kg,
  kot: r.ko,
  uitkeringKosten: r.uitkKost,
  besteedbaar: r.best,
});

const out = {
  bron: "prototype/engine.js + macro-logica uit prototype/belastinglab.html, gegenereerd door scripts/prototype-golden.cjs",
  kalibratie: {
    modelMld: {
      ib: BT.tax - BT.ew,
      hypotheekrente: BT.rente,
      zorgtoeslag: BT.zt,
      huurtoeslag: BT.ht,
      kgb: BT.kg,
      kot: BT.ko,
    },
    huishoudens: BT.hh,
    personen: BT.pers,
  },
  armoedegrens: ARMGRENS,
  scenarios: PRESETS.map((p) => {
    const r = run(p);
    const arm = armoede(r.res);
    return {
      naam: p.naam,
      saldoMld: r.total,
      posten: Object.fromEntries(r.lines),
      armoede: arm.all,
      armoedeKinderen: arm.kids,
      gini: gini(
        r.res.map((x) => x.best / x.eq),
        PW,
      ),
      ...verdeling(r.res),
    };
  }),
  voorbeeldhuishoudens: HH.map((e) => {
    const h = toHH(e);
    return {
      pc: e.pc,
      invoer: e,
      scenarios: PRESETS.map((p) => pick(p === HUIDIG ? calcHH(h, HUIDIG, HUIDIG) : calcHH(h, p, HUIDIG))),
    };
  }),
  curves: CURVES.map((f) =>
    [12000, 25000, 40000, 60000, 90000, 140000].map((x) => ({
      x,
      huidig: calcHH(f(x), HUIDIG, HUIDIG).best,
      flat: calcHH(f(x), PRESETS[1], HUIDIG).best,
    })),
  ),
  oplosser: (() => {
    const flat = PRESETS[1];
    const t1 = JSON.parse(JSON.stringify(flat));
    const vrij = solve(
      (v) => {
        t1.vrij = v;
        return run(t1).total;
      },
      0,
      150000,
    );
    const t2 = JSON.parse(JSON.stringify(flat));
    const r0 = flat.brk.map((b) => b.r);
    const k = solve(
      (v) => {
        t2.brk.forEach((b, i) => (b.r = r0[i] * v));
        return -run(t2).total;
      },
      0,
      2.5,
    );
    return { flatVrijstelling: vrij, flatTariefFactor: k };
  })(),
};
const file = path.join(root, "packages/engine/test/golden/prototype-2026.json");
fs.writeFileSync(file, JSON.stringify(out, null, 1) + "\n");
console.log("geschreven:", path.relative(root, file));
console.log(
  out.scenarios
    .map(
      (s) => `${s.naam.padEnd(28)} ${s.saldoMld.toFixed(2)}  ${s.armoede.toFixed(2)}  ${s.gini.toFixed(4)}`,
    )
    .join("\n"),
);
console.log("oplosser", out.oplosser);
