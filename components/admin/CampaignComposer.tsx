"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import { blankCampaign, describeAudience, formatInZone, scheduleProblem, toCampaignPayload, utcToZonedLocal, validateCampaign, zonedTimeToUtcIso, type CampaignAudience, type CampaignDraft, type EmailCampaign } from "@/lib/admin/campaigns";
import { blankSchedule, describeSchedule, scheduleFromSeries, toSchedulePayload, validateSchedule, WEEKDAYS, type CampaignSeriesItem, type SeriesSchedule } from "@/lib/admin/campaign-series";
import type { CustomerSegment } from "@/lib/admin/segments";
import { randomId } from "@/lib/random-id";

import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { Notice, Select, TextArea, TextInput } from "./ui";

/** Write an email and send it to the opted-in customers of one segment: now, at a set time, or on repeat. Pass `campaign` or `series` to change one. */
export function CampaignComposer({ segment, campaign, series, onClose }: { segment: CustomerSegment | null; campaign?: EmailCampaign; series?: CampaignSeriesItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const timeZone = store?.timezone ?? "UTC";
  const editing = campaign !== undefined;
  const editingSeries = series !== undefined;
  const source = campaign ?? series;
  const [draft, setDraft] = useState<CampaignDraft>(source ? { subject: source.subject, body: source.body, buttonLabel: source.buttonLabel ?? "", buttonUrl: source.buttonUrl ?? "" } : blankCampaign);
  const [when, setWhen] = useState<"now" | "later" | "repeat">(editingSeries ? "repeat" : editing ? "later" : "now");
  const [schedule, setSchedule] = useState<SeriesSchedule>(series ? scheduleFromSeries(series) : blankSchedule);
  const [localTime, setLocalTime] = useState(campaign?.scheduledAt ? utcToZonedLocal(campaign.scheduledAt, timeZone) : "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState(false);
  // One key per composed message: pressing send twice (or retrying after a dropped connection) can never send it twice.
  const [attemptKey] = useState(() => `campaign-${randomId()}`);

  const audience = useQuery({
    queryKey: ["campaign-audience", segment?.id],
    enabled: segment !== null,
    queryFn: () => adminApi.post<CampaignAudience>("email-campaigns/audience", { segment_id: segment?.id }),
  });
  const summary = audience.data ? describeAudience(audience.data) : null;
  const set = (patch: Partial<CampaignDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const fieldMap: Record<string, string> = { button_label: "buttonLabel", button_url: "buttonUrl", send_at: "sendAt", day_of_week: "dayOfWeek", day_of_month: "dayOfMonth", send_time: "sendTime", ends_on: "endsOn" };
  const showApiErrors = (e: unknown) => {
    const fields = Object.fromEntries(Object.entries(apiFieldErrors(e)).map(([k, v]) => [fieldMap[k] ?? k, v]));
    setErrors(fields);
    if (Object.keys(fields).length === 0) toast.error(errorMessage(e));
  };

  const test = useMutation({
    mutationFn: () => adminApi.post<{ sentTo: string }>("email-campaigns/test", toCampaignPayload(segment?.id ?? "", draft)),
    onSuccess: (r) => toast.success(`Test email sent to ${r.sentTo}`),
    onError: showApiErrors,
  });

  const sendAt = when === "later" ? zonedTimeToUtcIso(localTime, timeZone) : null;

  const send = useMutation({
    mutationFn: () => {
      if (when === "repeat") {
        const recurring = { ...toCampaignPayload(segment?.id ?? "", draft), ...toSchedulePayload(schedule) };

        return editingSeries ? adminApi.patch<EmailCampaign | CampaignSeriesItem>(`campaign-series/${series.id}`, recurring) : adminApi.post<EmailCampaign | CampaignSeriesItem>("campaign-series", recurring);
      }

      const body = { ...toCampaignPayload(segment?.id ?? "", draft), ...(sendAt ? { send_at: sendAt } : {}) };

      return editing ? adminApi.patch<EmailCampaign>(`email-campaigns/${campaign.id}`, body) : adminApi.post<EmailCampaign>("email-campaigns", body, { idempotencyKey: attemptKey });
    },
    onSuccess: async (result) => {
      setConfirm(false);

      if (when === "repeat") {
        const next = (result as CampaignSeriesItem).nextRunAt;
        toast.success(next ? `Recurring campaign saved. Next send: ${formatInZone(next, timeZone)}` : "Recurring campaign saved");
        await queryClient.invalidateQueries({ queryKey: ["campaign-series"] });
        onClose();

        return;
      }

      const c = result as EmailCampaign;
      toast.success(c.status === "scheduled" && c.scheduledAt ? `Campaign scheduled for ${formatInZone(c.scheduledAt, timeZone)}` : `Campaign on its way to ${c.recipientsCount} customer${c.recipientsCount === 1 ? "" : "s"}`);
      await queryClient.invalidateQueries({ queryKey: ["email-campaigns"] });
      onClose();
    },
    onError: (e) => { setConfirm(false); showApiErrors(e); },
  });

  function validate(): boolean {
    const problems = validateCampaign(draft);
    if (when === "later") {
      const timeProblem = scheduleProblem(localTime, timeZone);
      if (timeProblem) problems.sendAt = timeProblem;
    }

    if (when === "repeat") Object.assign(problems, validateSchedule(schedule));
    setErrors(problems);

    return Object.keys(problems).length === 0;
  }

  const canSend = (audience.data?.eligible ?? 0) > 0;

  return (
    <>
      <Modal open={segment !== null} wide onClose={onClose} title={editingSeries ? "Edit recurring campaign" : editing ? "Edit scheduled campaign" : segment ? `Email “${segment.name}”` : "Email segment"} footer={<>
        <Button variant="secondary" onClick={() => validate() && test.mutate()} disabled={test.isPending}>{test.isPending ? "Sending test…" : "Send me a test"}</Button>
        <Button onClick={() => validate() && setConfirm(true)} disabled={!canSend || send.isPending}>{when === "repeat" ? (editingSeries ? "Save changes" : "Create recurring campaign") : when === "later" ? (editing ? "Save changes" : "Schedule campaign") : audience.data ? `Send to ${audience.data.eligible} customer${audience.data.eligible === 1 ? "" : "s"}` : "Send"}</Button>
      </>}>
        <div className="space-y-4">
          {audience.isLoading ? <p role="status" className="text-sm text-neutral-500">Checking who can be emailed…</p> : audience.error ? <Notice tone="red">{errorMessage(audience.error)}</Notice> : summary ? (
            <Notice tone={canSend ? "blue" : "amber"}>
              <strong>{summary.headline}</strong>
              {summary.notes.length > 0 ? <span className="block text-xs">{summary.notes.join(" ")} Only customers who ticked “email me news and offers” (or joined your newsletter) are included.</span> : null}
            </Notice>
          ) : null}

          <TextInput label="Subject" value={draft.subject} onChange={(e) => set({ subject: e.target.value })} error={errors.subject} maxLength={150} />
          <TextArea label="Message" rows={8} value={draft.body} onChange={(e) => set({ body: e.target.value })} error={errors.body} hint="Leave a blank line between paragraphs. {first_name} becomes each customer's first name." />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Button text (optional)" value={draft.buttonLabel} onChange={(e) => set({ buttonLabel: e.target.value })} error={errors.buttonLabel} placeholder="Shop the offers" maxLength={40} />
            <TextInput label="Button link (optional)" type="url" value={draft.buttonUrl} onChange={(e) => set({ buttonUrl: e.target.value })} error={errors.buttonUrl} placeholder="https://" />
          </div>
          <fieldset className="space-y-3 rounded-xl border border-black/10 p-4">
            <legend className="px-1 text-sm font-medium">When to send</legend>
            {editing || editingSeries ? null : (
              <div role="radiogroup" className="flex flex-wrap gap-2">
                {([["now", "Send now"], ["later", "Schedule for later"], ["repeat", "Repeat"]] as const).map(([key, label]) => (
                  <label key={key} className={`cursor-pointer rounded-xl border px-4 py-2 text-sm font-medium ${when === key ? "border-brand bg-brand-soft text-brand" : "border-black/10 hover:bg-neutral-50"}`}>
                    <input type="radio" name="when" className="sr-only" checked={when === key} onChange={() => setWhen(key)} />
                    {label}
                  </label>
                ))}
              </div>
            )}
            {when === "later" ? (
              <div className="max-w-xs">
                <TextInput label={`Send at (${timeZone} time)`} type="datetime-local" value={localTime} onChange={(e) => setLocalTime(e.target.value)} error={errors.sendAt} hint="Who receives it is decided at that moment, so new sign-ups are included and anyone who unsubscribes is left out." />
              </div>
            ) : null}
            {when === "repeat" ? (
              <div className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select label="Repeat" value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value as SeriesSchedule["frequency"] })}>
                    <option value="weekly">Every week</option>
                    <option value="monthly">Every month</option>
                  </Select>
                  {schedule.frequency === "weekly" ? (
                    <Select label="On" value={schedule.dayOfWeek} onChange={(e) => setSchedule({ ...schedule, dayOfWeek: Number(e.target.value) })} error={errors.dayOfWeek}>
                      {WEEKDAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
                    </Select>
                  ) : (
                    <Select label="On day" value={schedule.dayOfMonth} onChange={(e) => setSchedule({ ...schedule, dayOfMonth: Number(e.target.value) })} error={errors.dayOfMonth}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
                    </Select>
                  )}
                  <TextInput label={`At (${timeZone} time)`} type="time" value={schedule.sendTime} onChange={(e) => setSchedule({ ...schedule, sendTime: e.target.value })} error={errors.sendTime} />
                  <TextInput label="Stop after (optional)" type="date" value={schedule.endsOn} onChange={(e) => setSchedule({ ...schedule, endsOn: e.target.value })} error={errors.endsOn} />
                </div>
                <p className="text-xs text-neutral-500">Each time it goes out, it reaches whoever is opted in at that moment. Months use days 1 to 28 so every month has the date. A run that cannot send is recorded, and after 3 failed runs in a row it pauses itself.</p>
              </div>
            ) : null}
          </fieldset>
          <p className="text-xs text-neutral-500">Every email includes your store name and an unsubscribe link automatically.</p>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        danger={false}
        title={when === "repeat" ? (editingSeries ? "Save these changes?" : "Start this recurring campaign?") : when === "later" ? (editing ? "Save these changes?" : "Schedule this campaign?") : `Send to ${audience.data?.eligible ?? 0} customer${audience.data?.eligible === 1 ? "" : "s"}?`}
        message={when === "repeat" ? `“${draft.subject.trim()}” will be emailed to the opted-in customers in “${segment?.name ?? ""}”. ${describeSchedule({ ...schedule, dayOfWeek: schedule.frequency === "weekly" ? schedule.dayOfWeek : null, dayOfMonth: schedule.frequency === "monthly" ? schedule.dayOfMonth : null })} (${timeZone} time)${schedule.endsOn ? `, until ${schedule.endsOn}` : ""}. You can pause or stop it at any time.` : when === "later" && sendAt ? `“${draft.subject.trim()}” will be emailed to the opted-in customers in “${segment?.name ?? ""}” on ${formatInZone(sendAt, timeZone)} (${timeZone}). You can change or cancel it until then.` : `“${draft.subject.trim()}” will be emailed to the opted-in customers in “${segment?.name ?? ""}”. This cannot be undone.`}
        confirmLabel={when === "repeat" ? (editingSeries ? "Save changes" : "Start recurring campaign") : when === "later" ? (editing ? "Save changes" : "Schedule campaign") : "Send campaign"}
        busy={send.isPending}
        onConfirm={() => send.mutate()}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}
