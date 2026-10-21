"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type ToastKind = "success" | "error";
interface ToastItem { id: number; kind: ToastKind; message: string }

const ToastContext = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, kind, message }]);
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === "error" ? 7000 : 3500);
  }, []);

  const api = useMemo(() => ({ success: (m: string) => push("success", m), error: (m: string) => push("error", m) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} role={t.kind === "error" ? "alert" : "status"} className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-[0_18px_40px_-14px_rgb(20_10_90/0.5)] ${t.kind === "error" ? "bg-red-600 text-white" : "bg-[#0d0926] text-white"}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
