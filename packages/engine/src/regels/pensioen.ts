import type { Parameters } from "../parameters/schema.ts";

/**
 * Standaard werknemersdeel van de pensioenpremie per jaar: een percentage van het loon tussen de franchise en de
 * aftoppingsgrens (parameters in `pensioenpremie`). De premie wordt ingehouden op het brutoloon en verlaagt het
 * fiscale loon.
 */
export function standaardPensioenpremie(loon: number, p: Parameters): number {
  const { werknemer, franchise, aftoppingsgrens } = p.pensioenpremie;
  return (Math.max(0, Math.min(loon, aftoppingsgrens) - franchise) * werknemer) / 100;
}
