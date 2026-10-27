<script lang="ts">
  import type { Snippet } from "svelte";

  /*
   * Omlijsting van elke grafiek (HANDOFF §7): een titel die de vraag stelt, één zin uitleg, een legenda, de grafiek
   * zelf en een tabelweergave voor wie de grafiek niet kan of wil lezen.
   */
  let {
    titel,
    uitleg,
    legenda,
    grafiek,
    tabel,
  }: { titel: string; uitleg?: string; legenda?: Snippet; grafiek: Snippet; tabel?: Snippet } = $props();
</script>

<figure class="figuur">
  <figcaption>
    <h3>{titel}</h3>
    {#if uitleg}<p class="uitleg">{uitleg}</p>{/if}
  </figcaption>
  {#if legenda}<div class="legenda">{@render legenda()}</div>{/if}
  <div class="grafiek">{@render grafiek()}</div>
  {#if tabel}
    <details>
      <summary>Toon als tabel</summary>
      <div class="tabel-wrap">{@render tabel()}</div>
    </details>
  {/if}
</figure>

<style>
  .figuur {
    margin: 0;
    min-width: 0;
  }
  h3 {
    font-family: var(--f-body);
    font-size: 15px;
    font-weight: 600;
    margin: 0 0 2px;
  }
  .uitleg {
    color: var(--muted);
    font-size: 13px;
    margin: 0 0 8px;
    max-width: 70ch;
  }
  .legenda {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 12px;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .grafiek {
    position: relative;
  }
  details {
    margin-top: 8px;
    font-size: 13px;
  }
  summary {
    cursor: pointer;
    color: var(--accent);
  }
  .tabel-wrap {
    overflow-x: auto;
    margin-top: 6px;
  }
</style>
