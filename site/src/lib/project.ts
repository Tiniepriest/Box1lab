/** Links naar de repository. Werkt op server en in de browser. */
export const REPO = "https://github.com/Tiniepriest/Box1lab";

/**
 * Link naar het formulier "Fout melden" (.github/ISSUE_TEMPLATE/fout.yml), met pagina en versie al ingevuld.
 * In de browser vult `meldfout.ts` de actuele pagina (met scenario) in op het moment van klikken.
 */
export function meldFoutUrl(versie: string, pagina?: string): string {
  const url = new URL(`${REPO}/issues/new`);
  url.searchParams.set("template", "fout.yml");
  url.searchParams.set("versie", versie);
  if (pagina) url.searchParams.set("pagina", pagina);
  return url.href;
}
