/* Nederlandse notatie voor bedragen en percentages (HANDOFF §7: € 1.234, 12,5%). Alleen opmaak, geen rekenregels. */

const MIN = "−";

export function getal(v: number, decimalen = 0): string {
  return v.toLocaleString("nl-NL", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

export function euro(v: number, decimalen = 0): string {
  const r = Number(v.toFixed(decimalen));
  return `${r < 0 ? MIN : ""}€ ${getal(Math.abs(r), decimalen)}`;
}

/** Bedrag met teken: +€ 120, −€ 45, € 0. */
export function euroVerschil(v: number, decimalen = 0): string {
  const r = Number(v.toFixed(decimalen));
  if (r === 0) return `€ ${getal(0, decimalen)}`;
  return `${r > 0 ? "+" : MIN}€ ${getal(Math.abs(r), decimalen)}`;
}

export function miljard(v: number, decimalen = 1): string {
  const r = Number(v.toFixed(decimalen));
  if (r === 0) return `€ ${getal(0, decimalen)} mld`;
  return `${r > 0 ? "+" : MIN}€ ${getal(Math.abs(r), decimalen)} mld`;
}

export function procent(v: number, decimalen = 1): string {
  const r = Number(v.toFixed(decimalen));
  return `${r < 0 ? MIN : ""}${getal(Math.abs(r), decimalen)}%`;
}

export function procentVerschil(v: number, decimalen = 1): string {
  const r = Number(v.toFixed(decimalen));
  if (r === 0) return `${getal(0, decimalen)}%`;
  return `${r > 0 ? "+" : MIN}${getal(Math.abs(r), decimalen)}%`;
}

/** Een "mooie" stapgrootte voor assen. */
export function mooieStap(bereik: number, aantal: number): number {
  const ruw = bereik / Math.max(1, aantal);
  const macht = Math.pow(10, Math.floor(Math.log10(ruw || 1)));
  return [1, 2, 2.5, 5, 10].map((m) => m * macht).find((m) => m >= ruw) ?? ruw;
}
