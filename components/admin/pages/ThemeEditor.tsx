"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useStore } from "@/lib/admin/hooks";
import type { ThemeOption } from "@/lib/admin/types";
import { matchesPreset, presetFor, type ThemePreset } from "@/lib/admin/theme-presets";
import { buildThemePayload, COLOR_FIELDS, FONT_OPTIONS, isHex, moveItem, SECTION_LABELS, validateConfiguration } from "@/lib/admin/theme";
import type { HomepageSection, ThemeConfiguration } from "@/lib/types";

import { MediaPicker } from "../MediaPicker";
import { useToast } from "../Toast";
import { Card, CardBody, CardHeader, ErrorState, PageHeader, Select, Spinner, TextArea, TextInput, Toggle } from "../ui";

interface ThemeState { theme: { id: string; name: string; slug: string } | null; configuration: ThemeConfiguration }
type Errors = Record<string, string>;

export function ThemeEditor() {
  const themes = useQuery({ queryKey: ["themes"], queryFn: () => adminApi.get<ThemeOption[]>("themes") });
  const current = useQuery({ queryKey: ["store-theme"], queryFn: () => adminApi.get<ThemeState>("store/theme") });

  if (themes.isLoading || current.isLoading) return <Spinner />;
  if (themes.error || current.error || !themes.data || !current.data) return <ErrorState message={errorMessage(themes.error ?? current.error)} onRetry={() => { void themes.refetch(); void current.refetch(); }} />;

  return <Editor key={current.dataUpdatedAt} themes={themes.data} initial={current.data} />;
}

function Editor({ themes, initial }: { themes: ThemeOption[]; initial: ThemeState }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: store } = useStore();
  const [themeId, setThemeId] = useState<string | null>(initial.theme?.id ?? null);
  const [config, setConfig] = useState<ThemeConfiguration>(() => structuredClone(initial.configuration));
  const [errors, setErrors] = useState<Errors>({});
  const [picker, setPicker] = useState(false);

  const save = useMutation({
    mutationFn: () => adminApi.put<ThemeState>("store/theme", buildThemePayload(themeId, config)),
    onSuccess: async () => {
      toast.success("Theme saved. Your storefront is updated.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["store-theme"] }), queryClient.invalidateQueries({ queryKey: ["store"] })]);
    },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); toast.error(Object.keys(f).length ? "Please fix the highlighted fields." : errorMessage(e)); },
  });

  function submit() {
    const found = validateConfiguration(config);
    setErrors(found);
    if (Object.keys(found).length > 0) return toast.error("Please fix the highlighted fields.");
    save.mutate();
  }

  const selectedSlug = themes.find((t) => t.id === themeId)?.slug ?? initial.theme?.slug ?? null;
  const preset = presetFor(selectedSlug);
  const usingPreset = preset ? matchesPreset(config, preset) : false;
  const applyPreset = (p: ThemePreset) => { setConfig((c) => ({ ...c, colors: { ...p.colors }, fonts: { ...p.fonts } })); toast.success("Recommended colours and fonts applied. Save to publish them."); };

  const patch = (changes: Partial<ThemeConfiguration>) => setConfig((c) => ({ ...c, ...changes }));
  const err = (key: string) => errors[`configuration.${key}`];

  const setSection = (i: number, changes: Partial<HomepageSection>) => patch({ homepage: { sections: config.homepage.sections.map((s, idx) => (idx === i ? { ...s, ...changes } : s)) } });
  const setSectionConfig = (i: number, changes: Partial<HomepageSection["config"]>) => setSection(i, { config: { ...config.homepage.sections[i].config, ...changes } });

  return (
    <>
      <PageHeader title="Theme" description="Choose a template and make it yours." actions={<>
        {store ? <a href={store.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50">Preview storefront ↗</a> : null}
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save theme"}</Button>
      </>} />

      <div className="space-y-6">
        <Card>
          <CardHeader title="Template" description="The layout of your storefront. Your colours, fonts and content carry over when you switch." />
          <CardBody>
            <fieldset>
              <legend className="sr-only">Template</legend>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {themes.map((t) => (
                  <label key={t.id} className={`cursor-pointer rounded-lg border-2 p-4 ${themeId === t.id ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:border-neutral-400"}`}>
                    <input type="radio" name="theme" value={t.id} checked={themeId === t.id} onChange={() => setThemeId(t.id)} className="sr-only" />
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{t.name}</span>
                      {presetFor(t.slug) ? <span aria-hidden="true" className="flex -space-x-1">{(["primary", "accent", "background"] as const).map((k) => <span key={k} className="size-4 rounded-full ring-2 ring-white" style={{ backgroundColor: presetFor(t.slug)?.colors[k] }} />)}</span> : null}
                    </span>
                    <span className="mt-1 block text-sm text-neutral-500">{t.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {errors.theme_id ? <p role="alert" className="mt-2 text-sm text-red-600">{errors.theme_id}</p> : null}
            {preset && !usingPreset && themeId !== (initial.theme?.id ?? null) ? (
              <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-sm text-sky-900">Switching to <strong>{themes.find((t) => t.id === themeId)?.name}</strong>? It looks best with its own colours and fonts: {preset.mood.toLowerCase()}</p>
                <Button variant="secondary" onClick={() => applyPreset(preset)}>Apply recommended look</Button>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {preset ? (
          <Card>
            <CardHeader title="Recommended look" description={`The colours and fonts this template was designed around. ${preset.mood}`} />
            <CardBody className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex gap-2" aria-label="Recommended colours" role="img">
                  {COLOR_FIELDS.map(({ key, label }) => <span key={key} title={`${label} ${preset.colors[key]}`} className="size-9 rounded-full ring-1 ring-neutral-300" style={{ backgroundColor: preset.colors[key] }} />)}
                </div>
                <p className="text-sm text-neutral-600">{preset.fonts.heading} headings, {preset.fonts.body} text</p>
              </div>
              {usingPreset ? <span className="text-sm font-medium text-green-700">✓ You are using the recommended look</span> : <Button variant="secondary" onClick={() => applyPreset(preset)}>Use recommended look</Button>}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Colours" />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`color-${key}`} className="mb-1 block text-sm font-medium">{label}</label>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label={`${label} colour picker`} value={isHex(config.colors[key]) ? config.colors[key] : "#000000"} onChange={(e) => patch({ colors: { ...config.colors, [key]: e.target.value } })} className="h-9 w-10 cursor-pointer rounded border border-neutral-300" />
                  <input id={`color-${key}`} value={config.colors[key]} onChange={(e) => patch({ colors: { ...config.colors, [key]: e.target.value } })} className="w-full rounded-md border border-neutral-300 px-2 py-2 font-mono text-sm" />
                </div>
                {err(`colors.${key}`) ? <p role="alert" className="mt-1 text-sm text-red-600">{err(`colors.${key}`)}</p> : null}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Fonts" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Select label="Headings" value={config.fonts.heading} onChange={(e) => patch({ fonts: { ...config.fonts, heading: e.target.value } })} error={err("fonts.heading")}>{FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}</Select>
            <Select label="Body text" value={config.fonts.body} onChange={(e) => patch({ fonts: { ...config.fonts, body: e.target.value } })} error={err("fonts.body")}>{FONT_OPTIONS.map((f) => <option key={f}>{f}</option>)}</Select>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Hero banner" description="The big banner at the top of your homepage." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Headline" value={config.hero.title ?? ""} onChange={(e) => patch({ hero: { ...config.hero, title: e.target.value } })} error={err("hero.title")} />
            <TextInput label="Sub-headline" value={config.hero.subtitle ?? ""} onChange={(e) => patch({ hero: { ...config.hero, subtitle: e.target.value } })} error={err("hero.subtitle")} />
            <TextInput label="Button text" value={config.hero.cta_label ?? ""} onChange={(e) => patch({ hero: { ...config.hero, cta_label: e.target.value } })} error={err("hero.cta_label")} />
            <TextInput label="Button link" value={config.hero.cta_url ?? ""} onChange={(e) => patch({ hero: { ...config.hero, cta_url: e.target.value } })} error={err("hero.cta_url")} hint="e.g. /products" />
            <div className="sm:col-span-2">
              <TextInput label="Background image URL" value={config.hero.image_url ?? ""} onChange={(e) => patch({ hero: { ...config.hero, image_url: e.target.value } })} error={err("hero.image_url")} placeholder="https://…" />
              <button type="button" className="mt-1 text-sm underline" onClick={() => setPicker(true)}>Choose from media library</button>
            </div>
          </CardBody>
        </Card>

        <LinkList title="Navigation" description="Links in your storefront header." items={config.navigation} max={10} errors={errors} prefix="configuration.navigation" onChange={(navigation) => patch({ navigation })} />
        <Card>
          <CardHeader title="Footer" />
          <CardBody className="space-y-4">
            <TextArea label="Footer text" rows={2} value={config.footer.text ?? ""} onChange={(e) => patch({ footer: { ...config.footer, text: e.target.value } })} error={err("footer.text")} />
          </CardBody>
        </Card>
        <LinkList title="Footer links" items={config.footer.links} max={12} errors={errors} prefix="configuration.footer.links" onChange={(links) => patch({ footer: { ...config.footer, links } })} />

        <Card>
          <CardHeader title="Social links" description="Full https:// links. Leave blank to hide." />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            {(["facebook", "instagram", "twitter", "tiktok", "youtube"] as const).map((network) => (
              <TextInput key={network} label={network === "twitter" ? "X / Twitter" : network[0].toUpperCase() + network.slice(1)} value={config.social[network] ?? ""} onChange={(e) => patch({ social: { ...config.social, [network]: e.target.value } })} error={err(`social.${network}`)} placeholder="https://…" />
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Homepage sections" description="Turn sections on or off and change their order." />
          <ul className="divide-y divide-neutral-100">
            {config.homepage.sections.map((section, i) => {
              const base = `homepage.sections.${i}.config`;

              return (
                <li key={`${section.type}-${i}`} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Toggle label={SECTION_LABELS[section.type] ?? section.type} checked={section.enabled} onChange={(enabled) => setSection(i, { enabled })} />
                    <span className="flex gap-1">
                      <button type="button" aria-label={`Move ${SECTION_LABELS[section.type]} up`} disabled={i === 0} onClick={() => patch({ homepage: { sections: moveItem(config.homepage.sections, i, -1) } })} className="rounded border border-neutral-300 px-2 py-1 text-sm disabled:opacity-30">↑</button>
                      <button type="button" aria-label={`Move ${SECTION_LABELS[section.type]} down`} disabled={i === config.homepage.sections.length - 1} onClick={() => patch({ homepage: { sections: moveItem(config.homepage.sections, i, 1) } })} className="rounded border border-neutral-300 px-2 py-1 text-sm disabled:opacity-30">↓</button>
                    </span>
                  </div>

                  {section.enabled && section.type !== "hero" ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <TextInput label="Section title (optional)" value={section.config.title ?? ""} onChange={(e) => setSectionConfig(i, { title: e.target.value })} error={err(`${base}.title`)} />
                      {section.type === "featured_products" ? <TextInput label="Products to show" type="number" min={1} max={24} value={section.config.limit ?? 8} onChange={(e) => setSectionConfig(i, { limit: Number.parseInt(e.target.value, 10) || 1 })} error={err(`${base}.limit`)} /> : null}
                      {section.type === "testimonials" ? (
                        <div className="sm:col-span-2 space-y-3">
                          {(section.config.items ?? []).map((item, j) => (
                            <div key={j} className="grid gap-3 rounded-lg border border-neutral-200 p-3 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
                              <TextInput label="Quote" value={item.quote} onChange={(e) => setSectionConfig(i, { items: (section.config.items ?? []).map((x, idx) => (idx === j ? { ...x, quote: e.target.value } : x)) })} error={err(`${base}.items.${j}.quote`)} />
                              <TextInput label="Name" value={item.author} onChange={(e) => setSectionConfig(i, { items: (section.config.items ?? []).map((x, idx) => (idx === j ? { ...x, author: e.target.value } : x)) })} error={err(`${base}.items.${j}.author`)} />
                              <button type="button" aria-label={`Remove testimonial ${j + 1}`} onClick={() => setSectionConfig(i, { items: (section.config.items ?? []).filter((_, idx) => idx !== j) })} className="rounded border border-neutral-300 px-2 py-2 text-red-700 sm:mt-6">✕</button>
                            </div>
                          ))}
                          {(section.config.items?.length ?? 0) < 6 ? <Button type="button" variant="secondary" onClick={() => setSectionConfig(i, { items: [...(section.config.items ?? []), { quote: "", author: "" }] })}>Add testimonial</Button> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="flex justify-end"><Button onClick={submit} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save theme"}</Button></div>
      </div>

      <MediaPicker open={picker} onClose={() => setPicker(false)} multiple={false} folder="branding" onPick={(items) => items[0] && patch({ hero: { ...config.hero, image_url: items[0].url } })} />
    </>
  );
}

function LinkList({ title, description, items, max, errors, prefix, onChange }: { title: string; description?: string; items: { label: string; url: string }[]; max: number; errors: Errors; prefix: string; onChange: (items: { label: string; url: string }[]) => void }): ReactNode {
  const update = (i: number, changes: Partial<{ label: string; url: string }>) => onChange(items.map((x, idx) => (idx === i ? { ...x, ...changes } : x)));

  return (
    <Card>
      <CardHeader title={title} description={description} action={items.length < max ? <Button type="button" variant="secondary" onClick={() => onChange([...items, { label: "", url: "/" }])}>Add link</Button> : undefined} />
      <CardBody className="space-y-3">
        {items.length === 0 ? <p className="text-sm text-neutral-500">No links.</p> : items.map((item, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <TextInput label="Label" value={item.label} onChange={(e) => update(i, { label: e.target.value })} error={errors[`${prefix}.${i}.label`]} />
            <TextInput label="Link" value={item.url} onChange={(e) => update(i, { url: e.target.value })} error={errors[`${prefix}.${i}.url`]} placeholder="/products or https://…" />
            <div className="flex gap-1 sm:mt-6">
              <button type="button" aria-label={`Move link ${i + 1} up`} disabled={i === 0} onClick={() => onChange(moveItem(items, i, -1))} className="rounded border border-neutral-300 px-2 py-2 disabled:opacity-30">↑</button>
              <button type="button" aria-label={`Move link ${i + 1} down`} disabled={i === items.length - 1} onClick={() => onChange(moveItem(items, i, 1))} className="rounded border border-neutral-300 px-2 py-2 disabled:opacity-30">↓</button>
              <button type="button" aria-label={`Remove link ${i + 1}`} onClick={() => onChange(items.filter((_, idx) => idx !== i))} className="rounded border border-neutral-300 px-2 py-2 text-red-700">✕</button>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
