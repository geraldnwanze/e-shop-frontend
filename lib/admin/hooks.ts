"use client";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "../api/errors";
import { adminApi } from "./client";
import type { Billing } from "./billing-types";
import type { Me, StoreDetails } from "./types";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => adminApi.get<Me>("auth/me"), staleTime: 60_000 });
}

export function useStore(enabled = true) {
  return useQuery({ queryKey: ["store"], queryFn: () => adminApi.get<StoreDetails>("store"), staleTime: 60_000, enabled });
}

export function useBilling(enabled = true) {
  return useQuery({ queryKey: ["billing"], queryFn: () => adminApi.get<Billing>("billing"), staleTime: 30_000, enabled });
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return "Too many attempts. Please wait a moment.";
    return error.message || fallback;
  }
  return fallback;
}

/** First message per field from an ApiError, e.g. { "variants.0.sku": "This SKU is already in use." } */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};

  return Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0]]));
}
