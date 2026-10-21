"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Accessible modal on the native <dialog> element (focus trap, Esc, backdrop). */
export function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-2rem)] rounded-2xl p-0 text-neutral-900 shadow-[0_30px_80px_-20px_rgb(20_10_90/0.5)] backdrop:bg-[#0d0926]/50 backdrop:backdrop-blur-sm ${wide ? "max-w-3xl" : "max-w-lg"}`}
    >
      {open ? (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-center justify-between border-b border-black/[0.06] px-5 py-4">
            <h2 id="modal-title" className="font-display font-semibold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100">✕</button>
          </header>
          <div className="overflow-y-auto p-5">{children}</div>
          {footer ? <footer className="flex justify-end gap-2 border-t border-black/[0.06] bg-[#faf9ff] px-5 py-3">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
