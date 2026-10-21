"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../api/client";
import type { Product } from "../types";
import { useCustomer } from "./use-customer";

/** The signed-in customer's saved products (empty when signed out). */
export function useWishlist() {
  const { data: customer } = useCustomer();

  return useQuery({ queryKey: ["account", "wishlist"], queryFn: () => api.get<Product[]>("account/wishlist"), enabled: !!customer });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? api.delete(`account/wishlist/${productId}`) : api.put(`account/wishlist/${productId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", "wishlist"] }),
  });
}
