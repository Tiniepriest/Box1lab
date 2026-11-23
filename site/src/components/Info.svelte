<script lang="ts">
  /*
   * Een (i) met uitleg die verschijnt bij aanwijzen of focus. Op een aanraakscherm opent en sluit een tik hem; een
   * tik ergens anders of Escape sluit hem. Het tekstvak blijft binnen het scherm.
   */
  let { tekst, label = "Uitleg" }: { tekst: string | string[]; label?: string } = $props();

  const id = `info-${Math.random().toString(36).slice(2, 9)}`;
  const regels = $derived(Array.isArray(tekst) ? tekst : [tekst]);
  let knop = $state<HTMLButtonElement>();
  let vak = $state<HTMLDivElement>();
  let hover = $state(false);
  let focus = $state(false);
  let vast = $state(false);
  const open = $derived(hover || focus || vast);
  let positie = $state<{ links: number; boven: number } | null>(null);

  const MARGE = 8;
  $effect(() => {
    if (!open || !knop || !vak) {
      positie = null;
      return;
    }
    const k = knop.getBoundingClientRect();
    const w = vak.offsetWidth;
    const h = vak.offsetHeight;
    const links = Math.max(MARGE, Math.min(k.left + k.width / 2 - w / 2, window.innerWidth - w - MARGE));
    const onder = k.bottom + 6;
    const boven = onder + h > window.innerHeight - MARGE && k.top - 6 - h >= MARGE ? k.top - 6 - h : onder;
    positie = { links, boven };
  });

  $effect(() => {
    if (!vast) return;
    const buiten = (e: PointerEvent) => {
      if (!knop?.contains(e.target as Node) && !vak?.contains(e.target as Node)) vast = false;
    };
    const sluit = () => (vast = false);
    window.addEventListener("pointerdown", buiten, true);
    window.addEventListener("scroll", sluit, true);
    return () => {
      window.removeEventListener("pointerdown", buiten, true);
      window.removeEventListener("scroll", sluit, true);
    };
  });
</script>

<span
  class="info"
  role="presentation"
  onmouseenter={() => (hover = true)}
  onmouseleave={() => (hover = false)}
>
  <button
    bind:this={knop}
    type="button"
    class="i"
    aria-label={label}
    aria-describedby={open ? id : undefined}
    aria-expanded={open}
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      vast = !vast;
    }}
    onfocus={() => (focus = true)}
    onblur={() => (focus = false)}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        vast = false;
        focus = false;
        hover = false;
      }
    }}>i</button
  >
  {#if open}
    <div
      bind:this={vak}
      {id}
      role="tooltip"
      class="vak"
      style:left="{positie?.links ?? 0}px"
      style:top="{positie?.boven ?? 0}px"
      style:visibility={positie ? "visible" : "hidden"}
    >
      {#each regels as r, i (i)}<p>{r}</p>{/each}
    </div>
  {/if}
</span>

<style>
  .info {
    display: inline-block;
    vertical-align: baseline;
    line-height: 1;
  }
  .i {
    all: unset;
    box-sizing: border-box;
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    margin-left: 4px;
    border: 1px solid var(--muted);
    border-radius: 50%;
    color: var(--muted);
    font: italic 600 11px/1 var(--f-display);
    cursor: help;
    vertical-align: -2px;
  }
  .i:hover,
  .i[aria-expanded="true"] {
    color: var(--accent);
    border-color: var(--accent);
  }
  .i:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  .vak {
    position: fixed;
    z-index: 50;
    width: max-content;
    max-width: min(320px, calc(100vw - 16px));
    background: var(--panel);
    color: var(--fg);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 8px 10px;
    font: 400 13px/1.45 var(--f-body);
    font-style: normal;
    text-align: left;
    white-space: normal;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
  }
  .vak p {
    margin: 0;
  }
  .vak p + p {
    margin-top: 6px;
  }
</style>
