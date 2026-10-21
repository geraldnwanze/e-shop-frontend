/** "Only 3 left" style note, or null when stock is not low (or unknown on older cached responses). */
export function stockNote(unitsLeft: number | null | undefined): string | null {
  if (!unitsLeft || unitsLeft < 1) return null;

  return unitsLeft === 1 ? "Only 1 left, order soon" : `Only ${unitsLeft} left`;
}
