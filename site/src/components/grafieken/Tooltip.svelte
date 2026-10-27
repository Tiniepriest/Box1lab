<script lang="ts">
  /* Zwevend tekstvak bij een grafiek. Positie relatief aan de grafiekcontainer. */
  let { x, y, regels, breedte = 0 }: { x: number; y: number; regels: string[]; breedte?: number } = $props();
  const links = $derived(breedte && x > breedte - 200 ? x - 12 : x + 12);
  const omdraaien = $derived(breedte > 0 && x > breedte - 200);
</script>

<div class="tip" class:omdraaien style:left="{links}px" style:top="{y + 12}px" role="tooltip">
  {#each regels as r, i (i)}
    <div class:kop={i === 0}>{r}</div>
  {/each}
</div>

<style>
  .tip {
    position: absolute;
    pointer-events: none;
    background: var(--panel);
    color: var(--fg);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 6px 9px;
    font-size: 12px;
    line-height: 1.45;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.16);
    z-index: 5;
    max-width: 260px;
    white-space: nowrap;
  }
  .tip.omdraaien {
    transform: translateX(-100%);
  }
  .kop {
    font-weight: 600;
  }
</style>
