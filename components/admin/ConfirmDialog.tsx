"use client";

import { Button } from "@/components/ui/Button";

import { Modal } from "./Modal";

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", busy, onConfirm, onClose, danger = true }: { open: boolean; title: string; message: string; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<>
      <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
      <Button onClick={onConfirm} disabled={busy} className={danger ? "!bg-red-600 !bg-none !text-white !shadow-none" : ""}>{busy ? "Working…" : confirmLabel}</Button>
    </>}>
      <p className="text-sm text-neutral-700">{message}</p>
    </Modal>
  );
}
