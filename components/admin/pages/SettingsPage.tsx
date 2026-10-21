"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/admin/client";
import { apiFieldErrors, errorMessage, useMe, useStore } from "@/lib/admin/hooks";
import { flatten, gatewaySchema, settingsSchema } from "@/lib/admin/schemas";
import { testEmailPayload, type TestEmailType } from "@/lib/admin/test-email";
import type { Gateway } from "@/lib/admin/types";
import type { NotificationSettings, StoreSettings } from "@/lib/types";

import { ConfirmDialog } from "../ConfirmDialog";
import { Modal } from "../Modal";
import { MoneyField } from "../MoneyField";
import { useToast } from "../Toast";
import { Badge, Card, CardBody, CardHeader, ErrorState, Notice, PageHeader, Spinner, Select, TextArea, TextInput, Toggle } from "../ui";

const NOTIFICATION_DEFAULTS: NotificationSettings = {
  customer_order_confirmation: true,
  customer_order_updates: true,
  customer_payment_receipt: true,
  customer_refund: true,
  merchant_new_order: true,
  merchant_payment_failed: true,
  merchant_low_stock: true,
  merchant_new_review: true,
  merchant_review_digest: false,
  merchant_campaign_failure: true,
  campaign_tracking: true,
  low_stock_threshold: 5,
  merchant_email: null,
  abandoned_cart_reminder: false,
  abandoned_cart_delay_hours: 4,
  abandoned_cart_second_reminder: false,
  abandoned_cart_second_delay_hours: 24,
  abandoned_cart_discount_percent: 10,
  review_request: false,
  review_request_delay_days: 3,
};

export function SettingsPage() {
  const { data: me } = useMe();
  const { data: store } = useStore();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["store-settings"], queryFn: () => adminApi.get<StoreSettings>("store/settings") });

  return (
    <>
      <PageHeader title="Settings" description="Contact details, SEO, checkout rules and payments." />
      {isLoading ? <Spinner /> : error || !data ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : (
        <div className="space-y-6">
          <SettingsForm key={JSON.stringify(data)} settings={data} currency={store?.currency} />
          {me?.permissions.includes("billing.manage") ? <GatewaysCard /> : <Notice tone="blue">Only the store owner can manage payment gateways.</Notice>}
        </div>
      )}
    </>
  );
}

function SettingsForm({ settings, currency }: { settings: StoreSettings; currency?: string }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [v, setV] = useState({
    contact: { email: settings.contact.email ?? "", phone: settings.contact.phone ?? "", address: settings.contact.address ?? "" },
    seo: { title: settings.seo.title ?? "", description: settings.seo.description ?? "", og_image: settings.seo.og_image ?? "" },
    checkout: { allow_guest_checkout: settings.checkout.allow_guest_checkout, require_phone: settings.checkout.require_phone, shipping_flat_rate: settings.checkout.shipping_flat_rate ?? 0 },
    reviews: { enabled: settings.reviews?.enabled ?? true, require_approval: settings.reviews?.require_approval ?? false },
    inventory: { low_stock_notice: settings.inventory?.low_stock_notice ?? 5 },
    whatsapp: { enabled: settings.whatsapp?.enabled ?? false, number: settings.whatsapp?.number ?? "", message: settings.whatsapp?.message ?? "" },
    notifications: { ...NOTIFICATION_DEFAULTS, ...settings.notifications, merchant_email: settings.notifications?.merchant_email ?? "" },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sendTest = useMutation({
    mutationFn: (type: TestEmailType) => adminApi.post<{ sentTo: string }>("store/settings/test-email", testEmailPayload(type, v.notifications.abandoned_cart_discount_percent)),
    onSuccess: (result) => toast.success(`Test email sent to ${result.sentTo}`),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const save = useMutation({
    mutationFn: () => adminApi.put("store/settings", {
      contact: { email: v.contact.email || null, phone: v.contact.phone || null, address: v.contact.address || null },
      seo: { title: v.seo.title || null, description: v.seo.description || null, og_image: v.seo.og_image || null },
      checkout: v.checkout,
      reviews: v.reviews,
      inventory: v.inventory,
      whatsapp: { enabled: v.whatsapp.enabled, number: v.whatsapp.number || null, message: v.whatsapp.message || null },
      notifications: { ...v.notifications, merchant_email: v.notifications.merchant_email || null },
    }),
    onSuccess: async () => { toast.success("Settings saved"); await queryClient.invalidateQueries({ queryKey: ["store-settings"] }); },
    onError: (e) => { const f = apiFieldErrors(e); setErrors(f); toast.error(Object.keys(f).length ? "Please fix the highlighted fields." : errorMessage(e)); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = settingsSchema.safeParse(v);
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate();
  }

  const followUpOn = v.notifications.abandoned_cart_reminder && v.notifications.abandoned_cart_second_reminder;
  const set = <G extends keyof typeof v>(group: G, key: keyof (typeof v)[G], value: unknown) => setV((s) => ({ ...s, [group]: { ...s[group], [key]: value } }));

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <Card>
        <CardHeader title="Contact" description="Shown in your storefront footer." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <TextInput label="Email" type="email" value={v.contact.email} onChange={(e) => set("contact", "email", e.target.value)} error={errors["contact.email"]} />
          <TextInput label="Phone" value={v.contact.phone} onChange={(e) => set("contact", "phone", e.target.value)} error={errors["contact.phone"]} />
          <TextArea label="Address" className="sm:col-span-2" rows={2} value={v.contact.address} onChange={(e) => set("contact", "address", e.target.value)} error={errors["contact.address"]} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Search engines & sharing" description="How your store appears in Google and when shared on social media." />
        <CardBody className="space-y-4">
          <TextInput label="Page title" value={v.seo.title} onChange={(e) => set("seo", "title", e.target.value)} error={errors["seo.title"]} hint={`${v.seo.title.length}/70`} />
          <TextArea label="Description" rows={3} value={v.seo.description} onChange={(e) => set("seo", "description", e.target.value)} error={errors["seo.description"]} hint={`${v.seo.description.length}/300`} />
          <TextInput label="Share image URL" value={v.seo.og_image} onChange={(e) => set("seo", "og_image", e.target.value)} error={errors["seo.og_image"]} placeholder="https://…" hint="Must be an https:// link. Upload one in Media and copy its URL." />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Checkout" />
        <CardBody className="space-y-4">
          <Toggle label="Allow guest checkout" description="Customers can order without creating an account." checked={v.checkout.allow_guest_checkout} onChange={(x) => set("checkout", "allow_guest_checkout", x)} />
          <Toggle label="Require phone number" description="Useful for delivery." checked={v.checkout.require_phone} onChange={(x) => set("checkout", "require_phone", x)} />
          <div className="max-w-xs"><MoneyField label="Flat shipping rate" currency={currency} value={v.checkout.shipping_flat_rate} onChange={(x) => set("checkout", "shipping_flat_rate", x ?? 0)} optional error={errors["checkout.shipping_flat_rate"]} hint="Added to every order. Only used while you have no delivery zones; once you add zones on the Shipping page, they set the price." /></div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Stock notes" description="Show shoppers “Only 3 left” on a product page when stock runs low. It only appears for products where you track stock." />
        <CardBody>
          <div className="max-w-xs">
            <TextInput label="Show when this many or fewer are left" type="number" min={0} max={100} inputMode="numeric" value={Number.isNaN(v.inventory.low_stock_notice) ? "" : v.inventory.low_stock_notice} onChange={(e) => set("inventory", "low_stock_notice", e.target.value === "" ? Number.NaN : Number(e.target.value))} error={errors["inventory.low_stock_notice"]} hint="Use 0 to turn the note off." />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Customer reviews" description="Customers who bought a product can rate it from its page. Ratings also help your products stand out in search results." />
        <CardBody className="space-y-4">
          <Toggle label="Show reviews on product pages" checked={v.reviews.enabled} onChange={(x) => set("reviews", "enabled", x)} />
          <div className="space-y-3 border-t border-black/[0.06] pt-4">
            <Toggle label="Ask customers for a review after delivery" description="Emails each customer a few days after their order is marked delivered, with a link to review every product they bought. One email per order, and never more than one a week per customer." disabled={!v.reviews.enabled} checked={v.notifications.review_request} onChange={(x) => set("notifications", "review_request", x)} />
            <div className="grid max-w-xl items-end gap-4 sm:grid-cols-2">
              <Select label="Send after delivery" disabled={!v.reviews.enabled || !v.notifications.review_request} value={v.notifications.review_request_delay_days} onChange={(e) => set("notifications", "review_request_delay_days", Number(e.target.value))} error={errors["notifications.review_request_delay_days"]}>
                {[1, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} day{d === 1 ? "" : "s"} later</option>)}
              </Select>
              <div><Button type="button" variant="secondary" disabled={sendTest.isPending} onClick={() => sendTest.mutate("review_request")}>Send me a test</Button></div>
            </div>
          </div>
          <Toggle label="Approve reviews before they appear" description="New and edited reviews wait for you on the Reviews page. Off means they appear straight away." disabled={!v.reviews.enabled} checked={v.reviews.require_approval} onChange={(x) => set("reviews", "require_approval", x)} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="WhatsApp ordering" description="Add an “Order on WhatsApp” button to your product and cart pages. Customers land in a chat with you, with their order already typed out." />
        <CardBody className="space-y-4">
          <Toggle label="Show the WhatsApp order button" checked={v.whatsapp.enabled} onChange={(x) => set("whatsapp", "enabled", x)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="WhatsApp number" type="tel" inputMode="tel" value={v.whatsapp.number} onChange={(e) => set("whatsapp", "number", e.target.value)} error={errors["whatsapp.number"]} placeholder="+234 801 234 5678" hint="Include the country code." />
            <TextInput label="Opening message (optional)" value={v.whatsapp.message} onChange={(e) => set("whatsapp", "message", e.target.value)} error={errors["whatsapp.message"]} placeholder="Hi, I'd like to order:" hint="The customer's items follow this line." />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Email notifications" description="Choose which emails your store sends. Customer emails use your store name and theme colour." />
        <CardBody className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-neutral-500">Emails to your customers</h3>
            <Toggle label="Order confirmation" description="Sent as soon as an order is placed." checked={v.notifications.customer_order_confirmation} onChange={(x) => set("notifications", "customer_order_confirmation", x)} />
            <Toggle label="Payment receipt" description="Sent when a payment is confirmed." checked={v.notifications.customer_payment_receipt} onChange={(x) => set("notifications", "customer_payment_receipt", x)} />
            <Toggle label="Order updates" description="Sent when an order is shipped, delivered, completed or cancelled." checked={v.notifications.customer_order_updates} onChange={(x) => set("notifications", "customer_order_updates", x)} />
            <Toggle label="Refund notice" description="Sent when you refund an order." checked={v.notifications.customer_refund} onChange={(x) => set("notifications", "customer_refund", x)} />
          </div>

          <div className="space-y-4 border-t border-black/[0.06] pt-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-neutral-500">Win back abandoned carts</h3>
            <Toggle label="Abandoned cart reminder" description="Email shoppers who leave items in their cart after typing their email at checkout, or who are signed in. Each cart gets one reminder with a link back to it." checked={v.notifications.abandoned_cart_reminder} onChange={(x) => set("notifications", "abandoned_cart_reminder", x)} />
            <div className="max-w-xs">
              <Select label="Send after" disabled={!v.notifications.abandoned_cart_reminder} value={v.notifications.abandoned_cart_delay_hours} onChange={(e) => set("notifications", "abandoned_cart_delay_hours", Number(e.target.value))} error={errors["notifications.abandoned_cart_delay_hours"]}>
                {[1, 2, 4, 8, 24, 48].map((h) => <option key={h} value={h}>{h === 1 ? "1 hour" : h < 24 ? `${h} hours` : `${h / 24} day${h === 24 ? "" : "s"}`} of inactivity</option>)}
              </Select>
            </div>
            <Toggle label="Follow-up with a discount code" description="Send one more email if the shopper still has not ordered. Each follow-up gets its own single-use code, valid for 7 days and applied automatically from the email." disabled={!v.notifications.abandoned_cart_reminder} checked={v.notifications.abandoned_cart_second_reminder} onChange={(x) => set("notifications", "abandoned_cart_second_reminder", x)} />
            <div className="grid max-w-xl gap-4 sm:grid-cols-2">
              <Select label="Send follow-up after" disabled={!followUpOn} value={v.notifications.abandoned_cart_second_delay_hours} onChange={(e) => set("notifications", "abandoned_cart_second_delay_hours", Number(e.target.value))} error={errors["notifications.abandoned_cart_second_delay_hours"]}>
                {[12, 24, 48, 72].map((h) => <option key={h} value={h}>{h < 24 ? `${h} hours` : `${h / 24} day${h === 24 ? "" : "s"}`} after the first</option>)}
              </Select>
              <TextInput label="Discount (%)" type="number" min={0} max={50} inputMode="numeric" disabled={!followUpOn} value={Number.isNaN(v.notifications.abandoned_cart_discount_percent) ? "" : v.notifications.abandoned_cart_discount_percent} onChange={(e) => set("notifications", "abandoned_cart_discount_percent", e.target.value === "" ? Number.NaN : Number(e.target.value))} error={errors["notifications.abandoned_cart_discount_percent"]} hint="Use 0 to send the follow-up without a code. Maximum 50." />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" disabled={sendTest.isPending} onClick={() => sendTest.mutate("abandoned_cart_first")}>Send me a test of the reminder</Button>
              <Button type="button" variant="secondary" disabled={sendTest.isPending} onClick={() => sendTest.mutate("abandoned_cart_followup")}>Send me a test of the follow-up</Button>
              <p className="text-xs text-neutral-500">Sent to your login email with sample items. The follow-up shows the discount typed above, even if you have not saved yet.</p>
            </div>
          </div>

          <div className="space-y-4 border-t border-black/[0.06] pt-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-neutral-500">Campaign emails</h3>
            <Toggle label="Track opens and clicks" description="Shows how many customers opened each campaign and clicked its button. It adds a tiny hidden image and routes the button through your store, and the email tells customers it measures this. Opens are approximate, because some mail apps load images automatically and others block them." checked={v.notifications.campaign_tracking} onChange={(x) => set("notifications", "campaign_tracking", x)} />
          </div>

          <div className="space-y-4 border-t border-black/[0.06] pt-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-neutral-500">Alerts to you</h3>
            <div className="max-w-md">
              <TextInput label="Send alerts to" type="email" value={v.notifications.merchant_email ?? ""} onChange={(e) => set("notifications", "merchant_email", e.target.value)} error={errors["notifications.merchant_email"]} placeholder={settings.contact.email ?? "Your login email"} hint="Leave empty to use your contact email, or your login email if there is none." />
            </div>
            <Toggle label="New paid order" description="When a customer's payment goes through." checked={v.notifications.merchant_new_order} onChange={(x) => set("notifications", "merchant_new_order", x)} />
            <Toggle label="Failed payment" description="When a payment is declined or does not match the order." checked={v.notifications.merchant_payment_failed} onChange={(x) => set("notifications", "merchant_payment_failed", x)} />
            <Toggle label="New review" description="When a customer reviews a product, or a review is waiting for your approval." checked={v.notifications.merchant_new_review} onChange={(x) => set("notifications", "merchant_new_review", x)} />
            <div className="ml-1 space-y-3 border-l-2 border-black/[0.06] pl-4">
              <Toggle label="Send one daily summary instead" description="Reviews are collected into a single email each morning at 8:00 in your store's time zone, instead of one email per review. No email on days without reviews." disabled={!v.notifications.merchant_new_review} checked={v.notifications.merchant_review_digest} onChange={(x) => set("notifications", "merchant_review_digest", x)} />
              <Button type="button" variant="secondary" disabled={sendTest.isPending} onClick={() => sendTest.mutate("review_digest")}>Send me a test summary</Button>
            </div>
            <Toggle label="Campaign could not be sent" description="When a scheduled campaign, or a run of a recurring one, was due but could not go out. Includes the reason, and says if a recurring campaign paused itself." checked={v.notifications.merchant_campaign_failure} onChange={(x) => set("notifications", "merchant_campaign_failure", x)} />
            <Toggle label="Low stock" description="When a product's stock drops to the level below. You get one alert each time it crosses it." checked={v.notifications.merchant_low_stock} onChange={(x) => set("notifications", "merchant_low_stock", x)} />
            <div className="max-w-xs">
              <TextInput label="Low stock level" type="number" min={0} inputMode="numeric" disabled={!v.notifications.merchant_low_stock} value={Number.isNaN(v.notifications.low_stock_threshold) ? "" : v.notifications.low_stock_threshold} onChange={(e) => set("notifications", "low_stock_threshold", e.target.value === "" ? Number.NaN : Number(e.target.value))} error={errors["notifications.low_stock_threshold"]} hint="Alert when stock falls to this many units or fewer. Use 0 to turn it off." />
            </div>
          </div>
        </CardBody>
      </Card>

      <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

const PROVIDERS = { paystack: { name: "Paystack", keyHint: "sk_live_… or sk_test_…" }, flutterwave: { name: "Flutterwave", keyHint: "FLWSECK-… or FLWSECK_TEST-…" } } as const;

function GatewaysCard() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["gateways"], queryFn: () => adminApi.get<Gateway[]>("payment-gateways") });
  const [editing, setEditing] = useState<Gateway | null>(null);
  const [toRemove, setToRemove] = useState<Gateway | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["gateways"] });

  const toggle = useMutation({
    mutationFn: ({ g, body }: { g: Gateway; body: Record<string, boolean> }) => adminApi.put(`payment-gateways/${g.provider}`, body),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (g: Gateway) => adminApi.delete(`payment-gateways/${g.provider}`),
    onSuccess: async () => { toast.success("Gateway removed"); setToRemove(null); await refresh(); },
    onError: (e) => { setToRemove(null); toast.error(errorMessage(e)); },
  });

  return (
    <Card>
      <CardHeader title="Payments" description="Connect your own payment provider. Customers pay you directly." />
      <CardBody className="space-y-4">
        {isLoading ? <Spinner /> : error ? <ErrorState message={errorMessage(error)} onRetry={() => refetch()} /> : data?.map((g) => (
          <div key={g.provider} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{PROVIDERS[g.provider].name} {g.configured ? <Badge tone={g.isActive ? "green" : "neutral"}>{g.isActive ? "Active" : "Disabled"}</Badge> : <Badge>Not connected</Badge>} {g.isDefault ? <Badge tone="blue">Default</Badge> : null}</p>
                {g.configured ? <p className="mt-1 text-xs text-neutral-500">Secret key {g.secretKeyHint}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setEditing(g)}>{g.configured ? "Update keys" : "Connect"}</Button>
                {g.configured ? <>
                  <Button variant="ghost" onClick={() => toggle.mutate({ g, body: { is_active: !g.isActive } })}>{g.isActive ? "Disable" : "Enable"}</Button>
                  {!g.isDefault && g.isActive ? <Button variant="ghost" onClick={() => toggle.mutate({ g, body: { is_default: true } })}>Make default</Button> : null}
                  <Button variant="ghost" className="!text-red-700" onClick={() => setToRemove(g)}>Remove</Button>
                </> : null}
              </div>
            </div>
            {g.configured ? (
              <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs">
                <p className="font-medium">Webhook URL: add this in your {PROVIDERS[g.provider].name} dashboard</p>
                <p className="mt-1 break-all font-mono">{g.webhookUrl}</p>
                <p className="mt-1 text-neutral-500">Orders are only marked paid after the provider confirms the payment through this webhook or the customer&apos;s return visit.</p>
              </div>
            ) : null}
          </div>
        ))}
      </CardBody>

      {editing ? <GatewayModal gateway={editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); toast.success("Gateway saved"); await refresh(); }} /> : null}
      <ConfirmDialog open={toRemove !== null} title="Remove gateway?" message={`${toRemove ? PROVIDERS[toRemove.provider].name : ""} will no longer be offered at checkout.`} confirmLabel="Remove" busy={remove.isPending} onConfirm={() => toRemove && remove.mutate(toRemove)} onClose={() => setToRemove(null)} />
    </Card>
  );
}

function GatewayModal({ gateway, onClose, onSaved }: { gateway: Gateway; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = useState({ secret_key: "", public_key: gateway.publicKey ?? "", webhook_secret: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const info = PROVIDERS[gateway.provider];

  const save = useMutation({
    mutationFn: () => adminApi.put(`payment-gateways/${gateway.provider}`, {
      ...(v.secret_key ? { secret_key: v.secret_key } : {}),
      public_key: v.public_key || null,
      ...(v.webhook_secret ? { webhook_secret: v.webhook_secret } : {}),
      ...(gateway.configured ? {} : { is_active: true }),
    }),
    onSuccess: onSaved,
    onError: (e) => setErrors(Object.keys(apiFieldErrors(e)).length ? apiFieldErrors(e) : { secret_key: errorMessage(e) }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = gatewaySchema(gateway.provider, gateway.configured).safeParse(v);
    if (!parsed.success) return setErrors(flatten(parsed.error));
    setErrors({});
    save.mutate();
  }

  return (
    <Modal open onClose={onClose} title={`${info.name} credentials`} footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button type="submit" form="gateway-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
    </>}>
      <form id="gateway-form" onSubmit={submit} noValidate className="space-y-4" autoComplete="off">
        <Notice tone="blue">Keys are encrypted and can never be viewed again. {gateway.configured ? "Leave a field empty to keep its current value." : ""}</Notice>
        <TextInput label="Secret key" type="password" autoComplete="off" value={v.secret_key} onChange={(e) => setV({ ...v, secret_key: e.target.value })} error={errors.secret_key} placeholder={gateway.configured ? gateway.secretKeyHint ?? "" : info.keyHint} />
        <TextInput label="Public key (optional)" value={v.public_key} onChange={(e) => setV({ ...v, public_key: e.target.value })} error={errors.public_key} />
        {gateway.provider === "flutterwave" ? <TextInput label="Webhook secret hash" type="password" autoComplete="off" value={v.webhook_secret} onChange={(e) => setV({ ...v, webhook_secret: e.target.value })} error={errors.webhook_secret} hint="The “secret hash” you set under Settings → Webhooks in Flutterwave." placeholder={gateway.hasWebhookSecret ? "••••••••" : ""} /> : null}
      </form>
    </Modal>
  );
}
