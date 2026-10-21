"use client";

import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage, useMe } from "@/lib/admin/hooks";

import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, PageHeader, Spinner } from "../ui";

export function AccountPage() {
  const toast = useToast();
  const { data: me, isLoading } = useMe();
  const resend = useMutation({ mutationFn: () => adminApi.post("auth/email/resend"), onSuccess: () => toast.success("Verification email sent"), onError: (e) => toast.error(errorMessage(e)) });
  const reset = useMutation({ mutationFn: () => adminApi.post("auth/forgot-password", { email: me?.email }), onSuccess: () => toast.success("Password reset email sent"), onError: (e) => toast.error(errorMessage(e)) });

  if (isLoading || !me) return <Spinner />;

  return (
    <>
      <PageHeader title="Account" description="Your sign-in details." />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-neutral-500">Name</dt><dd className="font-medium">{me.name}</dd></div>
              <div><dt className="text-neutral-500">Role</dt><dd className="font-medium">{me.role.replace("merchant_", "")}</dd></div>
              <div className="sm:col-span-2"><dt className="text-neutral-500">Email</dt><dd className="flex items-center gap-2 font-medium">{me.email} <Badge tone={me.emailVerified ? "green" : "amber"}>{me.emailVerified ? "Verified" : "Not verified"}</Badge></dd></div>
            </dl>
            {!me.emailVerified ? <div className="mt-4"><Button variant="secondary" onClick={() => resend.mutate()} disabled={resend.isPending}>Resend verification email</Button></div> : null}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Password" description="We'll email you a link to choose a new password." />
          <CardBody><Button variant="secondary" onClick={() => reset.mutate()} disabled={reset.isPending}>{reset.isPending ? "Sending…" : "Send password reset email"}</Button></CardBody>
        </Card>
      </div>
    </>
  );
}
