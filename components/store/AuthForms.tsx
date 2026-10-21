"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Panel } from "@/components/store/PageBanner";
import { headingStyle } from "@/themes/shared/ui";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { fieldErrors, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/lib/schemas";
import type { Customer } from "@/lib/types";

import { FormField } from "./FormField";

function AuthShell({ title, intro, children, footer }: { title: string; intro: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <Container className="max-w-md py-12 sm:py-16">
      <Panel className="!p-7 shadow-lg sm:!p-9">
        <h1 className="font-heading text-3xl" style={headingStyle}>{title}</h1>
        <p className="mt-2 text-sm opacity-70">{intro}</p>
        {children}
      </Panel>
      <p className="mt-6 text-center text-sm">{footer}</p>
    </Container>
  );
}

function useAuthSubmit() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(path: "auth/login" | "auth/register", body: unknown, serverMap: Record<string, string> = {}) {
    setLoading(true);
    setFormError(null);
    try {
      const data = await api.post<{ customer: Customer }>(path, body);
      queryClient.setQueryData(["customer"], data.customer);
      router.push("/account");
    } catch (e) {
      if (e instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(e.fieldErrors)) mapped[serverMap[key] ?? key] = messages[0];
        setErrors(mapped);
        setFormError(Object.keys(mapped).length === 0 ? (e.status === 429 ? "Too many attempts. Please wait a minute." : e.message) : null);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return { errors, setErrors, formError, loading, run };
}

export function LoginForm() {
  const { errors, setErrors, formError, loading, run } = useAuthSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run("auth/login", parsed.data);
  }

  return (
    <AuthShell title="Welcome back" intro="Sign in to see your orders, wishlist and saved addresses." footer={<>New here? <Link href="/account/register" className="font-medium underline underline-offset-4">Create an account</Link></>}>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {formError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}
        <FormField label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <FormField label="Password" type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <p className="text-right text-sm"><Link href="/account/forgot-password" className="underline underline-offset-4">Forgot your password?</Link></p>
        <Button type="submit" disabled={loading} className="w-full !py-3">{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterForm() {
  const { errors, setErrors, formError, loading, run } = useAuthSubmit();
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", passwordConfirmation: "" });
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((s) => ({ ...s, [key]: e.target.value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = registerSchema.safeParse(v);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    void run(
      "auth/register",
      { first_name: parsed.data.firstName, last_name: parsed.data.lastName, email: parsed.data.email, phone: parsed.data.phone || null, password: parsed.data.password, password_confirmation: parsed.data.passwordConfirmation, accepts_marketing: acceptsMarketing },
      { first_name: "firstName", last_name: "lastName", password_confirmation: "passwordConfirmation" },
    );
  }

  return (
    <AuthShell title="Create an account" intro="Track orders, save favourites and check out faster." footer={<>Already registered? <Link href="/account/login" className="font-medium underline underline-offset-4">Sign in</Link></>}>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4">
        {formError ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{formError}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name" name="firstName" autoComplete="given-name" value={v.firstName} onChange={set("firstName")} error={errors.firstName} />
          <FormField label="Last name" name="lastName" autoComplete="family-name" value={v.lastName} onChange={set("lastName")} error={errors.lastName} />
        </div>
        <FormField label="Email" type="email" name="email" autoComplete="email" value={v.email} onChange={set("email")} error={errors.email} />
        <FormField label="Phone (optional)" type="tel" name="phone" autoComplete="tel" value={v.phone} onChange={set("phone")} error={errors.phone} />
        <FormField label="Password" type="password" name="password" autoComplete="new-password" value={v.password} onChange={set("password")} error={errors.password} />
        <FormField label="Confirm password" type="password" name="passwordConfirmation" autoComplete="new-password" value={v.passwordConfirmation} onChange={set("passwordConfirmation")} error={errors.passwordConfirmation} />
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" name="acceptsMarketing" checked={acceptsMarketing} onChange={(e) => setAcceptsMarketing(e.target.checked)} className="mt-0.5" />
          <span>Email me news and offers from this store. <span className="opacity-60">You can unsubscribe at any time.</span></span>
        </label>
        <Button type="submit" disabled={loading} className="w-full !py-3">{loading ? "Creating account…" : "Create account"}</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) return setError(parsed.error.issues[0].message);

    setError(null);
    setState("loading");
    try {
      await api.post("auth/forgot-password", { email: parsed.data.email });
      setState("sent");
    } catch (e) {
      setState("idle");
      setError(e instanceof ApiError ? (e.status === 429 ? "Too many requests. Please wait a minute and try again." : (e.fieldErrors.email?.[0] ?? e.message)) : "Something went wrong. Please try again.");
    }
  }

  return (
    <AuthShell title="Forgot your password?" intro="Enter your email and we will send you a link to choose a new one." footer={<Link href="/account/login" className="font-medium underline underline-offset-4">Back to sign in</Link>}>
      {state === "sent" ? (
        <p role="status" className="mt-6 rounded-[var(--sf-radius)] bg-primary/10 p-4 text-sm">If that email has an account, a reset link is on its way. It works for an hour. Check your spam folder if you do not see it.</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {error ? <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <FormField label="Email" type="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" disabled={state === "loading"} className="w-full !py-3">{state === "loading" ? "Sending…" : "Send reset link"}</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, passwordConfirmation: confirmation });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));

    setErrors({});
    setFormError(null);
    setState("loading");
    try {
      await api.post("auth/reset-password", { email, token, password: parsed.data.password, password_confirmation: parsed.data.passwordConfirmation });
      setState("done");
      window.setTimeout(() => router.push("/account/login"), 2500);
    } catch (e) {
      setState("idle");
      if (e instanceof ApiError) {
        setErrors({ password: e.fieldErrors.password?.[0] ?? "" });
        setFormError(e.fieldErrors.token?.[0] ?? (e.fieldErrors.password ? null : e.status === 429 ? "Too many attempts. Please wait a minute." : e.message));
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    }
  }

  if (!email || token.length !== 64) {
    return (
      <AuthShell title="This link doesn't work" intro="The reset link is incomplete. Ask for a new one." footer={<Link href="/account/login" className="font-medium underline underline-offset-4">Back to sign in</Link>}>
        <div className="mt-6"><Link href="/account/forgot-password" className="inline-block rounded-[var(--sf-radius)] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg">Send a new link</Link></div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" intro={`For ${email}`} footer={<Link href="/account/login" className="font-medium underline underline-offset-4">Back to sign in</Link>}>
      {state === "done" ? (
        <p role="status" className="mt-6 rounded-[var(--sf-radius)] bg-primary/10 p-4 text-sm">Your password has been changed. Taking you to sign in…</p>
      ) : (
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {formError ? (
            <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{formError} {formError.includes("expired") ? <Link href="/account/forgot-password" className="underline underline-offset-4">Ask for a new link</Link> : null}</p>
          ) : null}
          <FormField label="New password" type="password" name="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <FormField label="Confirm new password" type="password" name="passwordConfirmation" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} error={errors.passwordConfirmation} />
          <Button type="submit" disabled={state === "loading"} className="w-full !py-3">{state === "loading" ? "Saving…" : "Change password"}</Button>
        </form>
      )}
    </AuthShell>
  );
}
