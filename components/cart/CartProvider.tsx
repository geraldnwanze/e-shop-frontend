"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { Cart } from "@/lib/types";

/**
 * The cart UUID is stored in localStorage. localStorage is per-origin, so each
 * store (subdomain or custom domain) has its own cart automatically; the server
 * additionally scopes every cart to its tenant.
 */
export const CART_STORAGE_KEY = "sf:cart";

interface AddInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

interface CartContextValue {
  cart: Cart | undefined;
  itemCount: number;
  isLoading: boolean;
  addItem: (input: AddInput) => Promise<Cart>;
  updateQuantity: (itemId: string, quantity: number) => Promise<Cart>;
  removeItem: (itemId: string) => Promise<Cart>;
  /** Forget the local cart (after a successful checkout). */
  reset: () => void;
  cartId: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CART_STORAGE_KEY, id);
    else window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode): cart lives for this page view only */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [cartId, setCartId] = useState<string | null>(null);

  useEffect(() => {
    // Hydrate from storage after mount (it does not exist during SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartId(readStored());
  }, []);

  const persist = useCallback((id: string | null) => {
    writeStored(id);
    setCartId(id);
  }, []);

  const query = useQuery({
    queryKey: ["cart", cartId],
    queryFn: () => api.get<Cart>(`cart/${cartId}`),
    enabled: cartId !== null,
  });

  useEffect(() => {
    // A cart we can no longer use (other store, deleted, or already checked out elsewhere) is dropped.
    if (query.error instanceof ApiError && [403, 404, 409].includes(query.error.status)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      persist(null);
    }
  }, [query.error, persist]);

  const createCart = useCallback(async () => {
    const cart = await api.post<Cart>("cart");
    persist(cart.id);
    queryClient.setQueryData(["cart", cart.id], cart);
    return cart;
  }, [persist, queryClient]);

  const addMutation = useMutation({
    mutationFn: async (input: AddInput): Promise<Cart> => {
      const body = { product_id: input.productId, variant_id: input.variantId ?? null, quantity: input.quantity };
      let id = cartId ?? (await createCart()).id;

      try {
        return await api.post<Cart>(`cart/${id}/items`, body);
      } catch (error) {
        // The stored cart was already checked out: start a fresh one and retry once.
        if (error instanceof ApiError && error.status === 409 && error.code === "CONFLICT") {
          id = (await createCart()).id;
          return api.post<Cart>(`cart/${id}/items`, body);
        }
        throw error;
      }
    },
    onSuccess: (cart) => queryClient.setQueryData(["cart", cart.id], cart),
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => api.patch<Cart>(`cart/${cartId}/items/${itemId}`, { quantity }),
    onSuccess: (cart) => queryClient.setQueryData(["cart", cart.id], cart),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => api.delete<Cart>(`cart/${cartId}/items/${itemId}`),
    onSuccess: (cart) => queryClient.setQueryData(["cart", cart.id], cart),
  });

  const value = useMemo<CartContextValue>(
    () => ({
      cart: query.data,
      cartId,
      itemCount: query.data?.itemCount ?? 0,
      isLoading: query.isLoading,
      addItem: (input) => addMutation.mutateAsync(input),
      updateQuantity: (itemId, quantity) => updateMutation.mutateAsync({ itemId, quantity }),
      removeItem: (itemId) => removeMutation.mutateAsync(itemId),
      reset: () => {
        queryClient.removeQueries({ queryKey: ["cart"] });
        persist(null);
      },
    }),
    [query.data, query.isLoading, cartId, addMutation, updateMutation, removeMutation, queryClient, persist],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
