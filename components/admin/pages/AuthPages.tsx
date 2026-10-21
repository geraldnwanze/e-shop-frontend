"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage } from "@/lib/admin/hooks";
import { adminLoginSchema, adminRegisterSchema, flatten, forgotSchema, resetSchema } from "@/lib/admin/schemas";

import { CheckIcon } from "../icons";
import { BrandMark } from "../shell-parts";
import { Notice, TextInput } from "../ui";

const PERKS = [
  "Your store is live the moment you sign up",
  "Paystack and Flutterwave payments built in",
  "Your own domain, themes and full order tracking",
];

function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="bo min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="bo-sidebar relative flex flex-col justify-between overflow-hidden px-12 py-12 text-white max-lg:hidden lg:sticky lg:top-0 lg:h-screen lg:self-start" aria-hidden>
        <Link href="/" className="flex items-center gap-3" tabIndex={-1}>
          <BrandMark />
          <span className="font-display text-lg font-bold">Shop Platform</span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            Sell online with a store that&apos;s <span className="bg-gradient-to-r from-[#a99bff] via-[#ff7ad1] to-[#ffb86b] bg-clip-text text-transparent">truly yours</span>.
          </h2>
          <ul className="mt-8 space-y-3.5 text-white/75">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-[#b5a9ff]"><CheckIcon className="size-3.5" /></span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="relative mt-12 max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
              <p className="text-xs text-white/50">Revenue this week</p>
              <p className="font-display text-2xl font-bold">₦1.28M</p>
              <svg viewBox="0 0 200 56" className="mt-3 w-full">
                <path className="mk-draw" d="M0 46 C25 42 35 18 60 26 S100 44 125 24 S170 6 200 10" fill="none" stroke="#b5a9ff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mk-float absolute -right-6 -top-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1a1442]/90 p-3.5 pr-5 shadow-xl backdrop-blur">
              <span className="grid size-9 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300"><CheckIcon className="size-4" /></span>
              <div><p className="text-[11px] text-white/50">Payment received</p><p className="text-sm font-bold">₦24,500.00</p></div>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/40">Launch in minutes. Grow at your own pace.</p>
      </aside>

      <main className="flex min-h-screen justify-center px-4 pb-12 pt-10 sm:pt-[10vh] lg:pt-[12vh]">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900">&larr; Back to homepage</Link>
          <div className="bo-enter rounded-3xl border border-black/[0.06] bg-white p-8 shadow-[0_1px_2px_rgb(20_10_90/0.04),0_30px_70px_-30px_rgb(20_10_90/0.3)] sm:p-10">
            <div className="mb-6 lg:hidden"><BrandMark /></div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-1.5 text-sm text-neutral-500">{subtitle}</p> : null}
            <div className="mt-7">{children}</div>
            {footer ? <div className="mt-7 border-t border-black/[0.06] pt-5 text-sm text-neutral-600">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}

/** Shared submit state: validation errors, API field errors, a top-level message, and a busy flag. */
function useAuthForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (e) {
      const fields = apiFieldErrors(e);
      setErrors(fields);
      setMessage(Object.keys(fields).length === 0 ? errorMessage(e) : null);
    } finally {
      setBusy(false);
    }
  }

  return { errors, setErrors, message, setMessage, busy, run };
}

export function LoginPage() {
  const f = useAuthForm();
  const [v, setV] = useState({ email: "", password: "" });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = adminLoginSchema.safeParse(v);
    if (!parsed.success) return f.setErrors(flatten(parsed.error));
    f.setErrors({});
    void f.run(async () => {
      await adminApi.post("auth/login", { ...parsed.data, device_name: "dashboard" });
      // "/" redirects on the server to the console or the dashboard according to the role, with no intermediate bounce.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload deliberately discards all client state across the auth boundary
      window.location.assign("/");
    });
  }

  return (
    <AuthCard title="Sign in" subtitle="Manage your store" footer={<>New here? <Link href="/register" className="font-semibold text-brand hover:underline">Create your store</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {f.message ? <Notice tone="red">{f.message}</Notice> : null}
        <TextInput label="Email" type="email" name="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} error={f.errors.email} />
        <TextInput label="Password" type="password" name="password" autoComplete="current-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={f.errors.password} />
        <div className="text-right text-sm"><Link href="/forgot-password" className="font-medium text-brand hover:underline">Forgot password?</Link></div>
        <Button type="submit" disabled={f.busy} className="w-full">{f.busy ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthCard>
  );
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export function RegisterPage({ platformDomain }: { platformDomain: string }) {
  const f = useAuthForm();
  const [v, setV] = useState({ name: "", email: "", store_name: "", store_slug: "", password: "", password_confirmation: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === "store_slug" ? e.target.value.toLowerCase().replace(/^https?:\/\//, "").replace(/[^a-z0-9-]/g, "").slice(0, 40) : e.target.value;
    setV((s) => ({ ...s, [key]: value, ...(key === "store_name" && !slugTouched ? { store_slug: slugify(value) } : {}) }));
    if (key === "store_slug") setSlugTouched(true);
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = adminRegisterSchema.safeParse(v);
    if (!parsed.success) return f.setErrors(flatten(parsed.error));
    f.setErrors({});
    void f.run(async () => {
      await adminApi.post("auth/register", parsed.data);
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload deliberately discards all client state across the auth boundary
      window.location.assign("/dashboard");
    });
  }

  return (
    <AuthCard title="Create your store" subtitle="Your store is live the moment you sign up." footer={<>Already have a store? <Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {f.message ? <Notice tone="red">{f.message}</Notice> : null}
        <TextInput label="Your name" name="name" autoComplete="name" value={v.name} onChange={set("name")} error={f.errors.name} />
        <TextInput label="Email" type="email" name="email" autoComplete="email" value={v.email} onChange={set("email")} error={f.errors.email} />
        <TextInput label="Store name" name="store_name" value={v.store_name} onChange={set("store_name")} error={f.errors.store_name} />
        <TextInput label="Store URL" name="store_slug" value={v.store_slug} onChange={set("store_slug")} error={f.errors.store_slug} suffix={`.${platformDomain}`} placeholder="your-store" autoCapitalize="none" autoCorrect="off" spellCheck={false} hint="This is where customers will find your store. It follows your store name; edit it if you like." />
        <TextInput label="Password" type="password" name="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={f.errors.password} />
        <TextInput label="Confirm password" type="password" name="password_confirmation" autoComplete="new-password" value={v.password_confirmation} onChange={set("password_confirmation")} error={f.errors.password_confirmation} />
        <Button type="submit" disabled={f.busy} className="w-full">{f.busy ? "Creating your store…" : "Create store"}</Button>
      </form>
    </AuthCard>
  );
}

export function ForgotPasswordPage() {
  const f = useAuthForm();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = forgotSchema.safeParse({ email });
    if (!parsed.success) return f.setErrors(flatten(parsed.error));
    f.setErrors({});
    void f.run(async () => {
      await adminApi.post("auth/forgot-password", parsed.data);
      setSent(true);
    });
  }

  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a link to choose a new one." footer={<Link href="/login" className="font-semibold text-brand hover:underline">Back to sign in</Link>}>
      {sent ? (
        <Notice tone="green">If an account exists for that email, a reset link is on its way.</Notice>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {f.message ? <Notice tone="red">{f.message}</Notice> : null}
          <TextInput label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={f.errors.email} />
          <Button type="submit" disabled={f.busy} className="w-full">{f.busy ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";
  const f = useAuthForm();
  const [v, setV] = useState({ password: "", password_confirmation: "" });
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = resetSchema.safeParse(v);
    if (!parsed.success) return f.setErrors(flatten(parsed.error));
    f.setErrors({});
    void f.run(async () => {
      await adminApi.post("auth/reset-password", { token, email, ...parsed.data });
      setDone(true);
    });
  }

  if (!token || !email) return <AuthCard title="Invalid reset link"><Notice tone="red">This password reset link is incomplete. Request a new one.</Notice><p className="mt-4 text-sm"><Link href="/forgot-password" className="font-semibold text-brand hover:underline">Request a new link</Link></p></AuthCard>;

  return (
    <AuthCard title="Choose a new password" subtitle={email}>
      {done ? (
        <><Notice tone="green">Your password has been reset.</Notice><p className="mt-4"><Link href="/login" className="font-semibold text-brand hover:underline">Sign in</Link></p></>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          {f.message ? <Notice tone="red">{f.message}</Notice> : null}
          {f.errors.email ? <Notice tone="red">{f.errors.email}</Notice> : null}
          <TextInput label="New password" type="password" name="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} error={f.errors.password} />
          <TextInput label="Confirm password" type="password" name="password_confirmation" autoComplete="new-password" value={v.password_confirmation} onChange={(e) => setV({ ...v, password_confirmation: e.target.value })} error={f.errors.password_confirmation} />
          <Button type="submit" disabled={f.busy} className="w-full">{f.busy ? "Saving…" : "Reset password"}</Button>
        </form>
      )}
    </AuthCard>
  );
}

export function EmailVerifiedPage() {
  return (
    <AuthCard title="Email verified" subtitle="Thanks! Your email address is confirmed.">
      <Link href="/dashboard" className="font-semibold text-brand hover:underline">Go to your dashboard</Link>
    </AuthCard>
  );
}
