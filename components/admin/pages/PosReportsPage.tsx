"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage, useMe, useStore } from "@/lib/admin/hooks";
import { describeVariance, PERIODS, periodRange, shiftDuration, type PeriodKey } from "@/lib/admin/pos-reports";
import type { CashierReport, PosShift } from "@/lib/admin/types";
import { formatMoney } from "@/lib/money";

import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, tableClasses } from "../ui";

type Tab = "cashiers" | "shifts";

export function PosReportsPage() {
  const { data: store } = useStore();
  const { data: me } = useMe();
  const currency = store?.currency ?? "NGN";
  const money = (minor: number) => formatMoney(minor, currency);
  const isManager = me?.permissions.includes("staff.manage") ?? false;

  const [tab, setTab] = useState<Tab>("cashiers");
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [page, setPage] = useState(1);
  const [openShift, setOpenShift] = useState<string | null>(null);
  const range = periodRange(period);

  const report = useQuery({ queryKey: ["pos-report", range], queryFn: () => adminApi.get<CashierReport>("pos/reports/cashiers", range), enabled: tab === "cashiers" });
  const shifts = useQuery({ queryKey: ["pos-shifts", range, page], queryFn: () => adminApi.list<PosShift>("pos/shifts", { ...range, page }), enabled: tab === "shifts" });

  return (
    <>
      <PageHeader title="POS reports" description={isManager ? "How each cashier is doing, and whether every drawer balances." : "Your in-store sales and shifts."} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Report" className="inline-flex rounded-xl bg-neutral-100 p-1 text-sm">
          {(["cashiers", "shifts"] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => { setTab(t); setPage(1); }} className={`rounded-lg px-4 py-1.5 font-medium ${tab === t ? "bg-white shadow-sm" : "text-neutral-600"}`}>{t === "cashiers" ? "Cashiers" : "Shifts"}</button>
          ))}
        </div>
        <div role="group" aria-label="Period" className="flex gap-2">
          {PERIODS.map((p) => <Button key={p.key} type="button" variant={period === p.key ? "primary" : "secondary"} className="!px-3 !py-1.5" aria-pressed={period === p.key} onClick={() => { setPeriod(p.key); setPage(1); }}>{p.label}</Button>)}
        </div>
      </div>

      {tab === "cashiers" ? (
        <Card>
          {report.isLoading ? <Spinner /> : report.error ? <div className="p-4"><ErrorState message={errorMessage(report.error)} onRetry={() => report.refetch()} /></div> : report.data && report.data.cashiers.length === 0 ? (
            <EmptyState title="No in-store sales in this period" description="Sales rung up on the Point of sale screen appear here." />
          ) : report.data ? (
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr>
                  <th className={tableClasses.th}>Cashier</th><th className={`${tableClasses.th} text-right`}>Sales</th><th className={`${tableClasses.th} text-right`}>Revenue</th><th className={`${tableClasses.th} text-right`}>Average</th>
                  <th className={`${tableClasses.th} text-right`}>Cash</th><th className={`${tableClasses.th} text-right`}>Transfer</th><th className={`${tableClasses.th} text-right`}>Card</th>
                  <th className={`${tableClasses.th} text-right`}>Voids</th><th className={`${tableClasses.th} text-right`}>Drawer</th>
                </tr></thead>
                <tbody>
                  {report.data.cashiers.map((c) => {
                    const v = describeVariance(c.cashVariance);

                    return (
                      <tr key={c.userId}>
                        <td className={`${tableClasses.td} font-medium`}>{c.name}</td>
                        <td className={`${tableClasses.td} text-right`}>{c.salesCount}</td>
                        <td className={`${tableClasses.td} text-right font-semibold`}>{money(c.grossSales)}</td>
                        <td className={`${tableClasses.td} text-right`}>{money(c.averageSale)}</td>
                        <td className={`${tableClasses.td} text-right`}>{money(c.byMethod.cash.total)}</td>
                        <td className={`${tableClasses.td} text-right`}>{money(c.byMethod.transfer.total)}</td>
                        <td className={`${tableClasses.td} text-right`}>{money(c.byMethod.card.total)}</td>
                        <td className={`${tableClasses.td} text-right`}>{c.voidedCount > 0 ? <span className="text-red-700">{c.voidedCount} · {money(c.voidedTotal)}</span> : "—"}</td>
                        <td className={`${tableClasses.td} text-right`}>{c.cashVariance === null ? <span className="text-neutral-400">No closed shifts</span> : <Badge tone={v.tone}>{v.label}{c.cashVariance !== 0 ? ` ${money(Math.abs(c.cashVariance))}` : ""}</Badge>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : (
        <Card>
          {shifts.isLoading ? <Spinner /> : shifts.error ? <div className="p-4"><ErrorState message={errorMessage(shifts.error)} onRetry={() => shifts.refetch()} /></div> : shifts.data && shifts.data.items.length === 0 ? (
            <EmptyState title="No shifts in this period" description="Start a shift from the Point of sale screen." />
          ) : shifts.data ? (
            <>
              <div className={tableClasses.wrap}>
                <table className={tableClasses.table}>
                  <thead><tr>
                    <th className={tableClasses.th}>Cashier</th><th className={tableClasses.th}>Opened</th><th className={tableClasses.th}>Length</th>
                    <th className={`${tableClasses.th} text-right`}>Expected</th><th className={`${tableClasses.th} text-right`}>Counted</th><th className={tableClasses.th}>Result</th><th className={tableClasses.th}><span className="sr-only">Details</span></th>
                  </tr></thead>
                  <tbody>
                    {shifts.data.items.map((s) => {
                      const v = describeVariance(s.variance);

                      return (
                        <tr key={s.id}>
                          <td className={`${tableClasses.td} font-medium`}>{s.cashier.name ?? "Former staff member"}</td>
                          <td className={tableClasses.td}>{new Date(s.openedAt).toLocaleString()}</td>
                          <td className={tableClasses.td}>{shiftDuration(s.openedAt, s.closedAt)}</td>
                          <td className={`${tableClasses.td} text-right`}>{s.expectedCash === null ? "—" : money(s.expectedCash)}</td>
                          <td className={`${tableClasses.td} text-right`}>{s.countedCash === null ? "—" : money(s.countedCash)}</td>
                          <td className={tableClasses.td}>{s.isOpen ? <Badge tone="blue">Open</Badge> : <Badge tone={v.tone}>{v.label}{s.variance ? ` ${money(Math.abs(s.variance))}` : ""}</Badge>}</td>
                          <td className={tableClasses.td}><button type="button" className="font-medium text-brand hover:underline" onClick={() => setOpenShift(s.id)}>View</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pager meta={shifts.data.meta} onPage={setPage} />
            </>
          ) : null}
        </Card>
      )}

      <ShiftDetail id={openShift} onClose={() => setOpenShift(null)} money={money} />
    </>
  );
}

function ShiftDetail({ id, onClose, money }: { id: string | null; onClose: () => void; money: (minor: number) => string }) {
  const query = useQuery({ queryKey: ["pos-shift-detail", id], queryFn: () => adminApi.get<PosShift>(`pos/shifts/${id}`), enabled: id !== null });
  const shift = query.data;
  const summary = shift?.summary;
  const v = describeVariance(shift?.variance ?? null);

  return (
    <Modal open={id !== null} onClose={onClose} title={shift ? `Shift · ${shift.cashier.name ?? "Former staff member"}` : "Shift"} footer={<Button type="button" onClick={onClose}>Close</Button>}>
      {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={errorMessage(query.error)} /> : shift && summary ? (
        <div className="space-y-4 text-sm">
          <p className="text-neutral-600">{new Date(shift.openedAt).toLocaleString()} → {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : "still open"} ({shiftDuration(shift.openedAt, shift.closedAt)})</p>
          <dl className="space-y-1">
            <Row label="Sales" value={`${summary.salesCount} · ${money(summary.grossSales)}`} />
            {summary.discounts > 0 ? <Row label="Discounts given" value={money(summary.discounts)} /> : null}
            <Row label="Cash" value={money(summary.byMethod.cash.total)} />
            <Row label="Transfer" value={money(summary.byMethod.transfer.total)} />
            <Row label="Card" value={money(summary.byMethod.card.total)} />
            <Row label="Voided" value={summary.voidedCount > 0 ? `${summary.voidedCount} · ${money(summary.voidedTotal)}` : "None"} />
          </dl>
          <dl className="space-y-1 rounded-xl bg-neutral-50 p-3">
            <Row label="Opening float" value={money(summary.openingFloat)} />
            <Row label="Expected in drawer" value={money(summary.expectedCash)} />
            <Row label="Counted" value={summary.countedCash === null ? "Not counted yet" : money(summary.countedCash)} />
            {shift.variance !== null ? <div className="flex justify-between pt-1 font-semibold"><dt>Result</dt><dd><Badge tone={v.tone}>{v.label}{shift.variance ? ` ${money(Math.abs(shift.variance))}` : ""}</Badge></dd></div> : null}
          </dl>
          {shift.notes ? <p className="whitespace-pre-line rounded-xl border border-black/10 p-3">{shift.notes}</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><dt className="text-neutral-500">{label}</dt><dd>{value}</dd></div>;
}
