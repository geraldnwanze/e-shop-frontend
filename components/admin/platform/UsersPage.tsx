"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { errorMessage } from "@/lib/admin/hooks";
import type { PlatformUser } from "@/lib/admin/platform-types";
import { useDebounced } from "@/lib/use-debounced";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { Pager } from "../Pager";
import { useToast } from "../Toast";
import { TenantPicker } from "./TenantPicker";
import { Badge, Card, EmptyState, ErrorState, Notice, PageHeader, Select, Spinner, TextInput, tableClasses } from "../ui";

const ROLES = ["merchant_owner", "merchant_admin", "merchant_staff", "customer", "platform_admin"];
const MANAGEABLE = ["merchant_owner", "merchant_admin", "merchant_staff"];

const CONFIRMATIONS = {
  suspend: { title: "Suspend this account?", message: "They are signed out immediately and cannot sign in until reactivated.", label: "Suspend", action: "suspend" },
  activate: { title: "Reactivate this account?", message: "They will be able to sign in again straight away.", label: "Reactivate", action: "activate" },
  verify: { title: "Mark this email as verified?", message: "Use this only if you have confirmed the address belongs to them. Their store will be able to take orders straight away.", label: "Mark verified", action: "verify-email" },
  revoke: { title: "Sign this user out everywhere?", message: "All of their active sessions end immediately. They can sign in again.", label: "Sign out", action: "revoke-tokens" },
} as const;

export function UsersPage({ initialTenant }: { initialTenant?: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [tenant, setTenant] = useState(initialTenant ?? "");
  const [domain, setDomain] = useState("");
  const [page, setPage] = useState(1);
  const [active, setActive] = useState<PlatformUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [confirm, setConfirm] = useState<"suspend" | "activate" | "revoke" | "verify" | null>(null);
  const debounced = useDebounced(search);
  const debouncedDomain = useDebounced(domain.trim());

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["platform", "users", debounced, role, status, emailStatus, tenant, debouncedDomain, page], queryFn: () => adminApi.list<PlatformUser>("admin/users", { search: debounced, role, status, email_status: emailStatus, tenant, domain: debouncedDomain, page }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["platform", "users"] });

  const act = useMutation({
    mutationFn: ({ path, method = "post", body }: { path: string; method?: "post" | "patch"; body?: unknown }) => (method === "patch" ? adminApi.patch<PlatformUser>(path, body) : adminApi.post<PlatformUser>(path, body)),
    onSuccess: async (result, vars) => {
      toast.success(vars.path.endsWith("password-reset") ? "Password reset email sent" : vars.path.endsWith("verify-email") ? "Email marked as verified" : "Done");
      if (result && typeof result === "object" && "id" in result) setActive(result as PlatformUser);
      setConfirm(null);
      await refresh();
    },
    onError: (e) => { setConfirm(null); toast.error(errorMessage(e)); },
  });

  const manageable = active ? MANAGEABLE.includes(active.role) && active.tenant !== null : false;

  return (
    <>
      <PageHeader title="Users" description="Merchant accounts across the platform." />
      <Card>
        <div className="grid gap-3 border-b border-black/[0.06] p-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput label="Search" type="search" placeholder="Name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <TenantPicker label="Tenant" value={tenant} onChange={(id) => { setTenant(id); setPage(1); }} />
          <TextInput label="Domain" type="search" placeholder="e.g. shop.example.com or mystore" value={domain} onChange={(e) => { setDomain(e.target.value); setPage(1); }} hint="Matches any of a tenant's domains, including its store subdomain." />
          <Select label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All</option>{ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</Select>
          <Select label="Account status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="suspended">Suspended</option></Select>
          <Select label="Email status" value={emailStatus} onChange={(e) => { setEmailStatus(e.target.value); setPage(1); }}><option value="">All</option><option value="verified">Verified</option><option value="unverified">Unverified</option></Select>
          {search || tenant || domain || role || status || emailStatus ? (
            <div className="flex items-end"><button type="button" className="rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-50" onClick={() => { setSearch(""); setTenant(""); setDomain(""); setRole(""); setStatus(""); setEmailStatus(""); setPage(1); }}>Clear filters</button></div>
          ) : null}
        </div>
        {isLoading ? <Spinner /> : error ? <div className="p-4"><ErrorState message={errorMessage(error)} onRetry={() => refetch()} /></div> : data && data.items.length === 0 ? <EmptyState title="No users match" /> : (
          <>
            <div className={tableClasses.wrap}>
              <table className={tableClasses.table}>
                <thead><tr><th className={tableClasses.th}>User</th><th className={tableClasses.th}>Role</th><th className={tableClasses.th}>Tenant</th><th className={tableClasses.th}>Account status</th><th className={tableClasses.th}>Email status</th><th className={tableClasses.th}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {data?.items.map((u) => (
                    <tr key={u.id}>
                      <td className={tableClasses.td}><span className="font-medium">{u.name}</span><span className="block text-xs text-neutral-500">{u.email}</span></td>
                      <td className={tableClasses.td}>{u.role.replace("_", " ")}</td>
                      <td className={tableClasses.td}>{u.tenant ? <><span className="font-medium">{u.tenant.name}</span><span className="block text-xs text-neutral-500">{(u.tenant.domains?.find((d) => d.isPrimary) ?? u.tenant.domains?.[0])?.domain ?? u.tenant.slug}</span></> : <span className="text-neutral-400">—</span>}</td>
                      <td className={tableClasses.td}>{u.suspendedAt ? <Badge tone="red">Suspended</Badge> : <Badge tone="green">Active</Badge>}</td>
                      <td className={tableClasses.td}>{u.emailVerified ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}</td>
                      <td className={`${tableClasses.td} text-right`}><button type="button" className="font-medium text-brand hover:underline" onClick={() => { setActive(u); setNewRole(u.role); }}>Manage</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data ? <Pager meta={data.meta} onPage={setPage} /> : null}
          </>
        )}
      </Card>

      <Modal open={active !== null} onClose={() => setActive(null)} title="Manage user">
        {active ? (
          <div className="space-y-5">
            <div><p className="font-semibold">{active.name}</p><p className="text-sm text-neutral-500">{active.email} · {active.tenant?.name ?? "No tenant"}</p></div>
            {!manageable ? <Notice tone="blue">Platform administrators and accounts without a store are managed from the command line, not here.</Notice> : (
              <>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Select label="Role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>{MANAGEABLE.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}</Select></div>
                  <Button variant="secondary" disabled={newRole === active.role || act.isPending} onClick={() => act.mutate({ path: `admin/users/${active.id}`, method: "patch", body: { role: newRole } })}>Save role</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {active.suspendedAt
                    ? <Button variant="secondary" onClick={() => setConfirm("activate")}>Reactivate account</Button>
                    : <Button variant="secondary" className="!text-red-700" onClick={() => setConfirm("suspend")}>Suspend account</Button>}
                  {!active.emailVerified ? <Button variant="secondary" onClick={() => setConfirm("verify")}>Mark email verified</Button> : null}
                  <Button variant="secondary" onClick={() => setConfirm("revoke")}>Sign out everywhere</Button>
                  <Button variant="secondary" onClick={() => act.mutate({ path: `admin/users/${active.id}/password-reset` })} disabled={act.isPending}>Send password reset</Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        danger={confirm === "suspend"}
        title={confirm ? CONFIRMATIONS[confirm].title : ""}
        message={confirm ? CONFIRMATIONS[confirm].message : ""}
        confirmLabel={confirm ? CONFIRMATIONS[confirm].label : undefined}
        busy={act.isPending}
        onConfirm={() => active && confirm && act.mutate({ path: `admin/users/${active.id}/${CONFIRMATIONS[confirm].action}` })}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}
