"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage, useStore } from "@/lib/admin/hooks";
import { deliveryStatus, engagementRates, formatInZone, RECIPIENT_FILTERS, resultsExportUrl, type CampaignRecipient, type EmailCampaign, type RecipientFilter } from "@/lib/admin/campaigns";
import { useDebounced } from "@/lib/use-debounced";
import { describeSchedule, SERIES_STATUS_LABEL, SERIES_STATUS_TONE, type CampaignSeriesItem } from "@/lib/admin/campaign-series";
import type { CustomerSegment } from "@/lib/admin/segments";

import { CampaignComposer } from "../CampaignComposer";
import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { useToast } from "../Toast";
import { Pager } from "../Pager";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, TextInput, tableClasses } from "../ui";

export function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<EmailCampaign | null>(null);
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [toCancel, setToCancel] = useState<EmailCampaign | null>(null);
  const [editingSeries, setEditingSeries] = useState<CampaignSeriesItem | null>(null);
  const [seriesToDelete, setSeriesToDelete] = useState<CampaignSeriesItem | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const timeZone = store?.timezone ?? "UTC";
  const segments = useQuery({ queryKey: ["customer-segments"], queryFn: () => adminApi.get<CustomerSegment[]>("customer-segments") });
  const rates = open ? engagementRates(open) : null;
  const rateCell = (c: EmailCampaign, kind: "open" | "click") => {
    const r = engagementRates(c);
    if (!r) return <span className="text-neutral-400">—</span>;
    const rate = kind === "open" ? r.openRate : r.clickRate;
    const count = kind === "open" ? c.openedCount ?? 0 : c.clickedCount ?? 0;

    return <span title={`${count} ${count === 1 ? "person" : "people"}`}>{rate === null ? "—" : `${rate}%`}</span>;
  };
  const segmentFor = (c: EmailCampaign) => segments.data?.find((s) => s.id === c.segmentId) ?? null;

  const series = useQuery({ queryKey: ["campaign-series"], queryFn: () => adminApi.get<CampaignSeriesItem[]>("campaign-series") });
  const seriesSegment = (s: CampaignSeriesItem) => segments.data?.find((x) => x.id === s.segmentId) ?? null;
  const refreshSeries = async () => { await queryClient.invalidateQueries({ queryKey: ["campaign-series"] }); await queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }); };

  const toggleSeries = useMutation({
    mutationFn: (s: CampaignSeriesItem) => adminApi.patch<CampaignSeriesItem>(`campaign-series/${s.id}`, { status: s.status === "active" ? "paused" : "active" }),
    onSuccess: refreshSeries,
    onError: (e) => toast.error(errorMessage(e)),
  });

  const removeSeries = useMutation({
    mutationFn: (s: CampaignSeriesItem) => adminApi.delete(`campaign-series/${s.id}`),
    onSuccess: async () => { toast.success("Recurring campaign deleted"); setSeriesToDelete(null); await refreshSeries(); },
    onError: (e) => { setSeriesToDelete(null); toast.error(errorMessage(e)); },
  });

  const cancel = useMutation({
    mutationFn: (c: EmailCampaign) => adminApi.post<EmailCampaign>(`email-campaigns/${c.id}/cancel`),
    onSuccess: async () => { toast.success("Campaign cancelled"); setToCancel(null); await queryClient.invalidateQueries({ queryKey: ["email-campaigns"] }); },
    onError: (e) => { setToCancel(null); toast.error(errorMessage(e)); },
  });
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["email-campaigns", page],
    queryFn: () => adminApi.list<EmailCampaign>("email-campaigns", { page }),
    // Emails go out in the background, so keep the numbers moving until everything has been sent.
    refetchInterval: (query) => (query.state.data?.items.some((c) => c.status === "sending") ? 4000 : false),
  });

  return (
    <>
      <PageHeader title="Email campaigns" description="Promotional emails you have sent to customer segments." actions={<ButtonLink href="/dashboard/customers/segments">Email a segment</ButtonLink>} />
      {series.data && series.data.length > 0 ? (
        <Card>
          <div className="border-b border-neutral-200 px-5 py-3"><h2 className="font-display font-semibold">Recurring campaigns</h2><p className="text-sm text-neutral-500">Each one sends again on its own schedule. Every run appears in the history below.</p></div>
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Subject</th><th className={tableClasses.th}>Segment</th><th className={tableClasses.th}>Repeats</th><th className={tableClasses.th}>Next send</th><th className={`${tableClasses.th} text-right`}>Sent</th><th className={tableClasses.th}>Status</th></tr></thead>
              <tbody>
                {series.data.map((s) => (
                  <tr key={s.id}>
                    <td className={`${tableClasses.td} font-medium`}>{s.subject}</td>
                    <td className={tableClasses.td}>{s.segmentName}</td>
                    <td className={tableClasses.td}>{describeSchedule(s)}{s.endsOn ? <span className="block text-xs text-neutral-500">until {s.endsOn}</span> : null}</td>
                    <td className={tableClasses.td}>{s.status === "active" && s.nextRunAt ? formatInZone(s.nextRunAt, timeZone) : "—"}</td>
                    <td className={`${tableClasses.td} text-right`}>{s.runsCount}</td>
                    <td className={tableClasses.td}>
                      <Badge tone={SERIES_STATUS_TONE[s.status]}>{SERIES_STATUS_LABEL[s.status]}</Badge>
                      {s.pauseReason ? <span role="note" className="mt-1 block max-w-xs text-xs text-amber-800">{s.pauseReason}</span> : null}
                      <span className="mt-1 block space-x-3 text-sm">
                        {s.status !== "ended" ? <button type="button" className="font-medium text-brand hover:underline" disabled={toggleSeries.isPending} onClick={() => toggleSeries.mutate(s)}>{s.status === "active" ? "Pause" : "Resume"}</button> : null}
                        <button type="button" className="font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40" disabled={seriesSegment(s) === null} title={seriesSegment(s) === null ? "Its segment no longer exists" : undefined} onClick={() => setEditingSeries(s)}>Edit</button>
                        <button type="button" className="text-red-700 underline" onClick={() => setSeriesToDelete(s)}>Delete</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className={series.data && series.data.length > 0 ? "mt-6" : ""}>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? (
          <EmptyState title="No campaigns yet" description="Open a customer segment and choose “Email this segment” to send your first one." action={<ButtonLink href="/dashboard/customers/segments">Go to segments</ButtonLink>} />
        ) : data ? (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>Subject</th><th className={tableClasses.th}>Segment</th><th className={tableClasses.th}>When</th><th className={`${tableClasses.th} text-right`}>Recipients</th><th className={`${tableClasses.th} text-right`}>Opened</th><th className={`${tableClasses.th} text-right`}>Clicked</th><th className={tableClasses.th}>Status</th></tr></thead>
                <tbody>
                  {data.items.map((c) => {
                    const s = deliveryStatus(c);

                    return (
                      <tr key={c.id}>
                        <td className={tableClasses.td}><button type="button" className="text-left font-medium text-brand hover:underline" onClick={() => setOpen(c)}>{c.subject}</button>{c.seriesId ? <span className="ml-2 align-middle"><Badge tone="blue">recurring</Badge></span> : null}{c.createdBy ? <span className="block text-xs text-neutral-500">by {c.createdBy}</span> : null}</td>
                        <td className={tableClasses.td}>{c.segmentName}</td>
                        <td className={tableClasses.td}>{c.status === "scheduled" && c.scheduledAt ? <span title={`${timeZone} time`}>{formatInZone(c.scheduledAt, timeZone)}</span> : new Date(c.createdAt).toLocaleString()}</td>
                        <td className={`${tableClasses.td} text-right`}>{c.status === "scheduled" ? "—" : c.recipientsCount}</td>
                        <td className={`${tableClasses.td} text-right`}>{rateCell(c, "open")}</td>
                        <td className={`${tableClasses.td} text-right`}>{rateCell(c, "click")}</td>
                        <td className={tableClasses.td}><Badge tone={s.tone}>{s.label}</Badge>{c.status === "scheduled" ? (
                          <span className="ml-3 space-x-3 text-sm">
                            <button type="button" className="font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40" disabled={segmentFor(c) === null} title={segmentFor(c) === null ? "Its segment no longer exists" : undefined} onClick={() => setEditing(c)}>Edit</button>
                            <button type="button" className="text-red-700 underline" onClick={() => setToCancel(c)}>Cancel</button>
                          </span>
                        ) : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager meta={data.meta} onPage={setPage} />
          </>
        ) : null}
      </Card>

      {editing ? <CampaignComposer key={editing.id} segment={segmentFor(editing)} campaign={editing} onClose={() => setEditing(null)} /> : null}

      {editingSeries ? <CampaignComposer key={editingSeries.id} segment={seriesSegment(editingSeries)} series={editingSeries} onClose={() => setEditingSeries(null)} /> : null}

      <ConfirmDialog open={seriesToDelete !== null} title="Delete this recurring campaign?" message={`“${seriesToDelete?.subject ?? ""}” will stop going out. Campaigns it already sent stay in the history.`} confirmLabel="Delete" busy={removeSeries.isPending} onConfirm={() => seriesToDelete && removeSeries.mutate(seriesToDelete)} onClose={() => setSeriesToDelete(null)} />

      <ConfirmDialog open={toCancel !== null} title="Cancel this campaign?" message={`“${toCancel?.subject ?? ""}” will not be sent.`} confirmLabel="Cancel campaign" busy={cancel.isPending} onConfirm={() => toCancel && cancel.mutate(toCancel)} onClose={() => setToCancel(null)} />

      <Modal open={open !== null} wide onClose={() => setOpen(null)} title={open?.subject ?? "Campaign"}>
        {open ? (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div><dt className="text-neutral-500">Recipients</dt><dd className="text-lg font-semibold">{open.recipientsCount}</dd></div>
              <div><dt className="text-neutral-500">Delivered</dt><dd className="text-lg font-semibold">{open.sentCount}</dd></div>
              <div><dt className="text-neutral-500">Failed</dt><dd className="text-lg font-semibold">{open.failedCount}</dd></div>
              {rates ? (
                <>
                  <div><dt className="text-neutral-500">Opened</dt><dd className="text-lg font-semibold">{open.openedCount ?? 0}{rates.openRate !== null ? <span className="ml-1 text-sm font-normal text-neutral-500">({rates.openRate}%)</span> : null}</dd></div>
                  <div><dt className="text-neutral-500">Clicked</dt><dd className="text-lg font-semibold">{open.clickedCount ?? 0}{rates.clickRate !== null ? <span className="ml-1 text-sm font-normal text-neutral-500">({rates.clickRate}%)</span> : null}</dd></div>
                </>
              ) : null}
            </dl>
            {rates ? (
              <p className="text-xs text-neutral-500">{rates.clickToOpenRate !== null ? `${rates.clickToOpenRate}% of people who opened it also clicked. ` : ""}Opens are approximate: some mail apps load images automatically (so can count an open that never happened) and others block them (so can miss one). Clicks are the more reliable number.</p>
            ) : open.status === "sent" ? (
              <p className="text-xs text-neutral-500">Opens and clicks were not measured for this campaign.</p>
            ) : null}
            <p className="text-neutral-600">To “{open.segmentName}” {open.status === "scheduled" && open.scheduledAt ? `on ${formatInZone(open.scheduledAt, timeZone)} (${timeZone})` : `on ${new Date(open.createdAt).toLocaleString()}`}</p>
            {open.status === "failed" && open.failureReason ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">This campaign could not be sent: {open.failureReason}</p> : null}
            <p className="whitespace-pre-line rounded-xl border border-black/10 bg-neutral-50 p-4">{open.body}</p>
            {rates && open.recipientsCount > 0 ? <CampaignRecipients campaignId={open.id} /> : null}
            {open.buttonLabel ? <p>Button: <strong>{open.buttonLabel}</strong> → <span className="break-all text-neutral-600">{open.buttonUrl}</span></p> : null}
          </div>
        ) : null}
      </Modal>
    </>
  );
}

/** Who got the campaign and what they did, with filters, so the merchant can follow up with the people who clicked. */
function CampaignRecipients({ campaignId }: { campaignId: string }) {
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  const query = useQuery({
    queryKey: ["campaign-recipients", campaignId, filter, debounced, page],
    queryFn: () => adminApi.list<CampaignRecipient>(`email-campaigns/${campaignId}/recipients`, { status: filter, search: debounced, page }),
  });
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <section aria-label="Recipients" className="space-y-3 border-t border-black/[0.06] pt-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5">
          {RECIPIENT_FILTERS.map((f) => (
            <button key={f.key} type="button" aria-pressed={filter === f.key} onClick={() => { setFilter(f.key); setPage(1); }} className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === f.key ? "border-brand bg-brand-soft text-brand" : "border-black/10 hover:bg-neutral-50"}`}>{f.label}</button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <div className="w-52"><TextInput label="Search" hideLabel type="search" placeholder="Search by email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
          <a href={resultsExportUrl(campaignId, filter, debounced)} download className="whitespace-nowrap pb-2 text-sm font-medium text-brand hover:underline">Export CSV</a>
        </div>
      </div>

      {query.isLoading ? <Spinner /> : query.error ? <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} /> : query.data && query.data.items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">No one matches.</p>
      ) : query.data ? (
        <>
          <div className={tableClasses.wrap}>
            <table className={tableClasses.table}>
              <thead><tr><th className={tableClasses.th}>Customer</th><th className={tableClasses.th}>Opened</th><th className={tableClasses.th}>Clicked</th></tr></thead>
              <tbody>
                {query.data.items.map((r) => (
                  <tr key={r.id}>
                    <td className={tableClasses.td}><span className="font-medium">{r.firstName ?? r.email}</span>{r.firstName ? <span className="block text-xs text-neutral-500">{r.email}</span> : null}{r.status === "failed" ? <span className="mt-0.5 block"><Badge tone="red">Not delivered</Badge></span> : null}</td>
                    <td className={tableClasses.td}>{r.openCount > 0 ? <><span className="font-medium">{r.openCount}×</span><span className="block text-xs text-neutral-500">last {when(r.lastOpenedAt)}</span></> : <span className="text-neutral-400">—</span>}</td>
                    <td className={tableClasses.td}>{r.clickCount > 0 ? <><span className="font-medium">{r.clickCount}×</span><span className="block text-xs text-neutral-500">last {when(r.lastClickedAt)}</span></> : <span className="text-neutral-400">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager meta={query.data.meta} onPage={setPage} />
        </>
      ) : null}
    </section>
  );
}
