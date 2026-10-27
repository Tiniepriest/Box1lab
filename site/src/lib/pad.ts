/** Pad binnen de site, rekening houdend met de basis-URL (GitHub Pages: /Box1lab/). Werkt op server en in de browser. */
export function pad(p: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${p.replace(/^\//, "")}`;
}
