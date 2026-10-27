/*
 * Vult bij een link "Meld een fout" (a[data-meldfout]) de huidige pagina in, met het scenario uit de link.
 * Gebeurt pas bij aanraken of klikken, zodat ook later veranderde scenario's meekomen. Invoer uit de calculator
 * staat niet in de link en gaat dus nooit mee.
 */
function vulIn(e: Event): void {
  const a = (e.target as Element | null)?.closest?.("a[data-meldfout]");
  if (!(a instanceof HTMLAnchorElement)) return;
  const url = new URL(a.href);
  url.searchParams.set("pagina", location.href);
  a.href = url.href;
}

for (const soort of ["pointerdown", "focusin", "click"]) document.addEventListener(soort, vulIn);
