"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import type { PlatformSettings, PlatformTheme } from "@/lib/admin/platform-types";

import { useToast } from "../Toast";
import { Card, CardBody, CardHeader, ErrorState, Notice, PageHeader, Select, Spinner, TextInput, Toggle } from "../ui";

export function SettingsAdminPage() {
  const settings = useQuery({ queryKey: ["platform", "settings"], queryFn: () => adminApi.get<PlatformSettings>("admin/settings") });
  const themes = useQuery({ queryKey: ["platform", "themes"], queryFn: () => adminApi.get<PlatformTheme[]>("admin/themes") });

  if (settings.isLoading || themes.isLoading) return <Spinner />;
  if (settings.error || !settings.data) return <ErrorState message={errorMessage(settings.error)} onRetry={() => settings.refetch()} />;

  return <Form key={settings.dataUpdatedAt} settings={settings.data} themes={themes.data ?? []} />;
}

function Form({ settings, themes }: { settings: PlatformSettings; themes: PlatformTheme[] }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => adminApi.put("admin/settings", { platform: { name: v.platform.name, support_email: v.platform.support_email || null }, registration: v.registration, billing: { trial_days: v.billing.trial_days }, storefront: v.storefront }),
    onSuccess: async () => { toast.success("Settings saved"); await queryClient.invalidateQueries({ queryKey: ["platform", "settings"] }); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); toast.error(Object.keys(f).length ? "Please fix the highlighted fields." : errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const found: Record<string, string> = {};
    if (!v.platform.name.trim()) found["platform.name"] = "Name is required";
    if (v.platform.support_email && !/^\S+@\S+\.\S+$/.test(v.platform.support_email)) found["platform.support_email"] = "Enter a valid email";
    if (!Number.isInteger(v.billing.trial_days) || v.billing.trial_days < 0 || v.billing.trial_days > 90) found["billing.trial_days"] = "Enter a whole number from 0 to 90";
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  return (
    <>
      <PageHeader title="Platform settings" description="Rules that apply to the whole platform." />
      <form onSubmit={submit} noValidate className="max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Identity" />
          <CardBody className="space-y-4">
            <TextInput label="Platform name" value={v.platform.name} onChange={(e) => setV({ ...v, platform: { ...v.platform, name: e.target.value } })} error={errors["platform.name"]} />
            <TextInput label="Support email" type="email" value={v.platform.support_email ?? ""} onChange={(e) => setV({ ...v, platform: { ...v.platform, support_email: e.target.value } })} error={errors["platform.support_email"]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Sign-ups" />
          <CardBody className="space-y-3">
            <Toggle label="Allow new merchants to register" description="When off, the registration endpoint refuses new stores. Existing merchants are unaffected." checked={v.registration.enabled} onChange={(enabled) => setV({ ...v, registration: { enabled } })} />
            {!v.registration.enabled ? <Notice tone="amber">Registration is closed. New stores cannot be created until you turn this back on.</Notice> : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Free trial" description="New stores try the highest paid plan for free, with no card, then move to the free plan unless they subscribe." />
          <CardBody>
            <div className="max-w-xs"><TextInput label="Trial length (days)" type="number" min={0} max={90} inputMode="numeric" value={Number.isNaN(v.billing.trial_days) ? "" : v.billing.trial_days} onChange={(e) => setV({ ...v, billing: { trial_days: e.target.value === "" ? Number.NaN : Number(e.target.value) } })} error={errors["billing.trial_days"]} hint="Use 0 to turn trials off. Only affects stores created from now on." /></div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="New stores" />
          <CardBody>
            <Select label="Default theme" value={v.storefront.default_theme} onChange={(e) => setV({ ...v, storefront: { default_theme: e.target.value } })} error={errors["storefront.default_theme"]}>
              {themes.filter((t) => t.status === "active" || t.slug === v.storefront.default_theme).map((t) => <option key={t.id} value={t.slug}>{t.name}</option>)}
            </Select>
          </CardBody>
        </Card>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
      </form>
    </>
  );
}
