/**
 * Shipping zone helpers shared by the dashboard editor (pure, unit-tested with node --test).
 */

export const EVERYWHERE = "*";
export const MAX_RATES = 10;

export interface ShippingRate {
  id: string;
  name: string;
  description: string | null;
  price: number;
  freeOver: number | null;
  isActive: boolean;
  position: number;
}

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  isActive: boolean;
  position: number;
  rates: ShippingRate[];
}

export interface ShippingLocations {
  countries: { code: string; name: string }[];
  states: string[];
  everywhere: string;
}

export type CoverageMode = "states" | "countries" | "everywhere";

export interface RateDraft {
  /** Stable React key; the server id is only sent back for rates that already exist. */
  key: string;
  id?: string;
  name: string;
  description: string;
  price: number | null;
  freeOver: number | null;
  isActive: boolean;
}

export interface ZoneDraft {
  id?: string;
  name: string;
  mode: CoverageMode;
  states: string[];
  countries: string[];
  isActive: boolean;
  rates: RateDraft[];
}

let counter = 0;
export const newRateDraft = (patch: Partial<RateDraft> = {}): RateDraft => ({ key: `new-${++counter}`, name: "", description: "", price: null, freeOver: null, isActive: true, ...patch });

export function emptyZoneDraft(): ZoneDraft {
  return { name: "", mode: "states", states: [], countries: [], isActive: true, rates: [newRateDraft({ name: "Standard delivery" })] };
}

export function zoneToDraft(zone: ShippingZone): ZoneDraft {
  const mode: CoverageMode = zone.countries.includes(EVERYWHERE) ? "everywhere" : zone.states.length > 0 ? "states" : "countries";

  return {
    id: zone.id,
    name: zone.name,
    mode,
    states: mode === "states" ? [...zone.states] : [],
    countries: mode === "countries" ? [...zone.countries] : [],
    isActive: zone.isActive,
    rates: zone.rates.map((r) => newRateDraft({ id: r.id, name: r.name, description: r.description ?? "", price: r.price, freeOver: r.freeOver, isActive: r.isActive })),
  };
}

/** The body for POST/PUT /shipping-zones. */
export function draftToPayload(d: ZoneDraft) {
  return {
    name: d.name.trim(),
    countries: d.mode === "states" ? ["NG"] : d.mode === "everywhere" ? [EVERYWHERE] : d.countries,
    states: d.mode === "states" ? d.states : [],
    is_active: d.isActive,
    rates: d.rates.map((r) => ({
      ...(r.id ? { id: r.id } : {}),
      name: r.name.trim(),
      description: r.description.trim() === "" ? null : r.description.trim(),
      price: r.price ?? 0,
      free_over: r.freeOver,
      is_active: r.isActive,
    })),
  };
}

/** Field-level problems the merchant can fix before anything is sent. Keys match the API's error keys. */
export function validateDraft(d: ZoneDraft): Record<string, string> {
  const errors: Record<string, string> = {};

  if (d.name.trim() === "") errors.name = "Give the zone a name";
  if (d.mode === "states" && d.states.length === 0) errors.states = "Choose at least one state";
  if (d.mode === "countries" && d.countries.length === 0) errors.countries = "Choose at least one country";
  if (d.rates.length === 0) errors.rates = "Add at least one delivery method";

  d.rates.forEach((r, i) => {
    if (r.name.trim() === "") errors[`rates.${i}.name`] = "Name this delivery method";
    if (r.price === null) errors[`rates.${i}.price`] = "Enter a price (use 0 for free)";
    if (r.freeOver !== null && r.freeOver <= 0) errors[`rates.${i}.free_over`] = "Enter an amount above 0, or leave empty";
  });

  return errors;
}

/** "Lagos, Ogun" / "Nigeria, Ghana" / "Everywhere else", for the zone list. */
export function describeCoverage(zone: Pick<ShippingZone, "countries" | "states">, countryNames: Record<string, string> = {}): string {
  if (zone.countries.includes(EVERYWHERE)) return "Everywhere else";
  if (zone.states.length > 0) return `Nigeria: ${zone.states.join(", ")}`;

  return zone.countries.map((c) => countryNames[c] ?? c).join(", ");
}
