"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import { ApiError } from "../api/errors";
import type { Customer } from "../types";

/** The signed-in customer for this store, or null. The session itself is an httpOnly cookie. */
export function useCustomer() {
  return useQuery({
    queryKey: ["customer"],
    queryFn: async (): Promise<Customer | null> => {
      try {
        return await api.get<Customer>("auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 60_000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.post("auth/logout"),
    onSettled: () => {
      queryClient.setQueryData(["customer"], null);
      queryClient.removeQueries({ queryKey: ["account"] });
    },
  });
}
