"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import { describeVariance } from "@/lib/admin/pos-reports";
import type { PosShift } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";

import { Modal } from "./Modal";
import { MoneyField } from "./MoneyField";
import { useToast } from "./Toast";
import { Badge, Notice, TextArea } from "./ui";

/** The API answers with an empty object while no shift is open. */
const asShift = (data: PosShift | Record<string, never> | undefined): PosShift | null => (data && "id" in data ? (data as PosShift) : null);

export function PosShiftBar({ currency }: { currency: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const money = (minor: number) => formatMoney(minor, currency);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [float, setFloat] = useState<number | null>(null);
  const [counted, setCounted] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [closed, setClosed] = useState<PosShift | null>(null);

  const query = useQuery({ queryKey: ["pos-shift"], queryFn: () => adminApi.get<PosShift | Record<string, never>>("pos/shift"), refetchInterval: 60_000 });
  const shift = asShift(query.data);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["pos-shift"] }), queryClient.invalidateQueries({ queryKey: ["pos-shifts"] }), queryClient.invalidateQueries({ queryKey: ["pos-report"] })]);

  const start = useMutation({
    mutationFn: () => adminApi.post<PosShift>("pos/shifts", { opening_float: float ?? 0 }),
    onSuccess: async () => { setStarting(false); setFloat(null); setErrors({}); toast.success("Shift started"); await refresh(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (!Object.keys(f).length) toast.error(errorMessage(e)); },
  });

  const close = useMutation({
    mutationFn: () => adminApi.post<PosShift>(`pos/shifts/${shift?.id}/close`, { counted_cash: counted ?? 0, notes: notes.trim() || null }),
    onSuccess: async (result) => { setClosing(false); setClosed(result); setCounted(null); setNotes(""); setErrors({}); await refresh(); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); if (!Object.keys(f).length) toast.error(errorMessage(e)); },
  });

  const summary = shift?.summary;
  const expected = summary?.expectedCash ?? 0;
  const difference = counted === null ? null : counted - expected;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-sm">
        {query.isLoading ? <span className="text-neutral-500">Checking your shift…</span> : shift ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Badge tone="green">Shift open</Badge>
              <span className="text-neutral-600">Since {new Date(shift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <span>{summary?.salesCount ?? 0} sale{summary?.salesCount === 1 ? "" : "s"} · <strong>{money(summary?.grossSales ?? 0)}</strong></span>
              <span className="text-neutral-600">Cash in drawer: {money(expected)}</span>
            </div>
            <Button type="button" variant="secondary" onClick={() => setClosing(true)}>Close shift</Button>
          </>
        ) : (
          <>
            <span className="text-neutral-600">No shift open. Start one to track your cash drawer and sales.</span>
            <Button type="button" onClick={() => setStarting(true)}>Start shift</Button>
          </>
        )}
      </div>

      <Modal open={starting} onClose={() => setStarting(false)} title="Start your shift" footer={<>
        <Button type="button" variant="secondary" onClick={() => setStarting(false)}>Cancel</Button>
        <Button type="button" disabled={start.isPending} onClick={() => start.mutate()}>{start.isPending ? "Starting…" : "Start shift"}</Button>
      </>}>
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">Count the cash in the drawer and enter it as your opening float. Sales you ring up from now on are counted in this shift.</p>
          <MoneyField label="Opening float" currency={currency} value={float} onChange={setFloat} optional error={errors.opening_float} hint="Leave empty if the drawer starts empty." />
        </div>
      </Modal>

      <Modal open={closing} onClose={() => setClosing(false)} title="Close your shift" footer={<>
        <Button type="button" variant="secondary" onClick={() => setClosing(false)}>Keep selling</Button>
        <Button type="button" disabled={close.isPending || counted === null} onClick={() => close.mutate()}>{close.isPending ? "Closing…" : "Close shift"}</Button>
      </>}>
        <div className="space-y-4 text-sm">
          <dl className="space-y-1 rounded-xl bg-neutral-50 p-3">
            <div className="flex justify-between"><dt className="text-neutral-500">Opening float</dt><dd>{money(summary?.openingFloat ?? 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-neutral-500">Cash sales</dt><dd>{money(summary?.byMethod.cash.total ?? 0)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Cash that should be in the drawer</dt><dd>{money(expected)}</dd></div>
          </dl>
          <MoneyField label="Cash counted" currency={currency} value={counted} onChange={setCounted} error={errors.counted_cash} hint="Count the drawer and enter what is actually there." />
          {difference !== null ? (
            <Notice tone={difference === 0 ? "green" : difference > 0 ? "amber" : "red"}>
              {difference === 0 ? "The drawer balances." : difference > 0 ? `${money(difference)} over.` : `${money(-difference)} short.`}
            </Notice>
          ) : null}
          <TextArea label="Notes (optional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} />
        </div>
      </Modal>

      <Modal open={closed !== null} onClose={() => setClosed(null)} title="Shift closed" footer={<Button type="button" onClick={() => setClosed(null)}>Done</Button>}>
        {closed?.summary ? (
          <div className="space-y-3 text-sm">
            <p><Badge tone={describeVariance(closed.variance).tone}>{describeVariance(closed.variance).label}</Badge>{closed.variance ? <span className="ml-2 font-semibold">{money(Math.abs(closed.variance))} {closed.variance > 0 ? "over" : "short"}</span> : null}</p>
            <dl className="space-y-1">
              <div className="flex justify-between"><dt className="text-neutral-500">Sales</dt><dd>{closed.summary.salesCount} · {money(closed.summary.grossSales)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Expected cash</dt><dd>{money(closed.summary.expectedCash)}</dd></div>
              <div className="flex justify-between"><dt className="text-neutral-500">Counted cash</dt><dd>{money(closed.summary.countedCash ?? 0)}</dd></div>
            </dl>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
