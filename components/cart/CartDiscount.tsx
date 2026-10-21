"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/money";
import { normalizeCode, RECOVERY_CODE_KEY } from "@/lib/recovery-code";

interface Preview { code: string; discountTotal: number; subtotal: number; total: number }

function readCode(): string | null {
  try {
    return normalizeCode(window.localStorage.getItem(RECOVERY_CODE_KEY));
  } catch {
    return null;
  }
}

function writeCode(code: string | null) {
  try {
    if (code) window.localStorage.setItem(RECOVERY_CODE_KEY, code);
    else window.localStorage.removeItem(RECOVERY_CODE_KEY);
  } catch {
    /* storage unavailable: the code only lasts for this page view */
  }
}

/**
 * Lets a shopper try a discount code before checkout. The code is remembered in the browser (the same
 * place a reminder email's code goes), so checkout starts with it filled in. Nothing is used up here.
 */
export function CartDiscount({ cartId, subtotal, currency }: { cartId: string; subtotal: number; currency: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCode(readCode());
  }, []);

  const preview = useQuery({
    queryKey: ["cart-discount", cartId, code, subtotal],
    enabled: code !== null,
    queryFn: () => api.post<Preview>(`cart/${cartId}/discount`, { code }),
  });

  useEffect(() => {
    // A saved code that no longer works (expired, used up, cart now too small) is dropped quietly.
    if (preview.error instanceof ApiError && preview.error.status === 422) {
      writeCode(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCode(null);
    }
  }, [preview.error]);

  async function apply(event: FormEvent) {
    event.preventDefault();
    const tidy = normalizeCode(input);
    if (!tidy) return setMessage("Enter a valid discount code.");

    setBusy(true);
    setMessage(null);
    try {
      await api.post<Preview>(`cart/${cartId}/discount`, { code: tidy });
      writeCode(tidy);
      setCode(tidy);
      setInput("");
    } catch (e) {
      setMessage(e instanceof ApiError ? (e.fieldErrors.code?.[0] ?? e.message) : "Could not check that code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function remove() {
    writeCode(null);
    setCode(null);
    setMessage(null);
  }

  const applied = code !== null ? preview.data : undefined;

  return (
    <div className="mt-4 border-t border-black/10 pt-4 text-sm">
      {applied ? (
        <>
          <div className="flex justify-between"><dt>Discount ({applied.code})</dt><dd className="font-medium">−{formatMoney(applied.discountTotal, currency)}</dd></div>
          <div className="mt-2 flex justify-between"><dt className="font-semibold">Estimated total</dt><dd className="font-semibold">{formatMoney(applied.total, currency)}</dd></div>
          <button type="button" onClick={remove} className="mt-2 underline underline-offset-4 opacity-70 hover:opacity-100">Remove code</button>
        </>
      ) : (
        <form onSubmit={apply} noValidate>
          <label htmlFor="cart-code" className="mb-1 block font-medium">Discount code</label>
          <div className="flex gap-2">
            <input id="cart-code" value={input} onChange={(e) => setInput(e.target.value)} autoCapitalize="characters" autoComplete="off" className="min-w-0 flex-1 rounded-[var(--sf-radius)] border border-black/20 bg-transparent px-3 py-2" />
            <Button type="submit" variant="secondary" disabled={busy}>{busy ? "Checking…" : "Apply"}</Button>
          </div>
          {message ? <p role="alert" className="mt-2 text-red-700">{message}</p> : null}
        </form>
      )}
    </div>
  );
}
