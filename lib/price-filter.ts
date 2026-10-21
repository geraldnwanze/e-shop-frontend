import { toMinor } from "./money.ts";

/**
 * Shoppers type prices in major units ("1,500"); the API filters on minor units.
 * Anything that is not a plain amount is ignored, and a reversed range is put the right way round.
 */
export function parsePriceRange(minInput?: string, maxInput?: string): { min: number | null; max: number | null } {
  let min = minInput ? toMinor(minInput) : null;
  let max = maxInput ? toMinor(maxInput) : null;

  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  return { min, max };
}
