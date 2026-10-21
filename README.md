# Multi-Tenant E-Commerce Platform: Web App

One **Next.js 16** (App Router, TypeScript, Tailwind v4) application serves three surfaces. It is deployed **once**; there is never a
deployment per store or per theme.

| Surface | Hostname | Routes |
|---|---|---|
| **Storefronts** | `<slug>.mydomain.com` and merchants' verified custom domains | home, products, cart, checkout, account, order tracking |
| **Merchant dashboard** | `app.mydomain.com` | `/dashboard/*` (products, orders, customers, store, theme, domains, media, …) |
| **Platform console** | `app.mydomain.com` | `/admin/*` (tenants, stores, users, plans, subscriptions, themes, domains, settings) |

The backend is the Laravel API in the sibling repo `e-shop-backend` (start there for the full picture:
[architecture](../../laravel/e-shop-backend/docs/architecture.md), [deployment](../../laravel/e-shop-backend/docs/deployment.md)).

## Quick start

Requires Node 22.18+ (or 24+; `npm test` runs TypeScript natively) and a running API ([backend quick start](../../laravel/e-shop-backend/README.md#quick-start)).

```bash
cp .env.example .env            # API_URL=http://localhost:8000/api/v1   PLATFORM_DOMAIN=localhost
npm install
npm run dev
```

Browsers resolve `*.localhost` to your machine, so with `PLATFORM_DOMAIN=localhost` (in **both** this repo's `.env` and the API's):

- `http://icecream.localhost:3000`: the seeded demo storefront
- `http://app.localhost:3000`: dashboard / console login (`merchant@icecream.test` / `password`, or the seeded platform admin)

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Node's built-in test runner (pure logic: routing, BFF allow-lists, forms, money, SEO)
npm run build         # production build
```

> `next/font/google` downloads the Google Fonts at build time, so `npm run build` needs outbound network access. Only Inter is preloaded; the other nine selectable fonts are fetched by browsers only if a store uses them.

## How hostnames become stores

Hostname interpretation lives in exactly one place, **`proxy.ts`** (Next.js 16's renamed middleware):

```
icecream.mydomain.com/products  ──►  /s/icecream.mydomain.com/products     (storefront tree)
www.icecream.com/products       ──►  /s/www.icecream.com/products
app.mydomain.com/dashboard      ──►  unchanged                              (dashboard / console)
anyone requesting /s/…          ──►  404                                    (internal tree is never addressable)
```

The host becomes a route param, so pages, metadata and the data cache are all keyed per host. The **API** performs the real
host → tenant lookup: the storefront forwards the visitor's hostname in `X-Storefront-Host` and the API answers `404` for unknown
hosts and `403` for suspended stores. No tenant logic is duplicated in pages.

Server-side fetches (`lib/api/server.ts`) put the host in the request header **and** the URL (`?_h=`) so the Next.js data cache key is unique
per host, which means one store's cached data can never be served for another host. Responses are cached for 60 s (`STOREFRONT_REVALIDATE`)
and purged immediately (`revalidateTag('tenant:<host>')`) whenever a merchant or admin saves a change.

## Two backends-for-frontend

Browser code never talks to the Laravel API directly. It calls same-origin route handlers, which keeps tokens out of JavaScript and
sidesteps CORS (merchants' custom domains cannot be listed in an API CORS config).

| BFF | Used by | Auth | Guards |
|---|---|---|---|
| `/api/shop/*` | storefront (cart, checkout, payments, account, tracking, newsletter) | customer token in an **httpOnly, host-scoped cookie** (`sf_token`) | tenant = this request's `Host`; strict path allow-list; same-origin + JSON checks on writes; 200 KB body cap |
| `/api/admin/*` | dashboard and console | Sanctum token in an **httpOnly cookie** (`mt_token`) | works **only on the app host** (404 on any store host); allow-list; **strict** `Origin` check and JSON/multipart-only on writes; 8 MB cap; no tenant/user creation or deletion exposed |

Both strip the token from login responses, forward the visitor's IP (`CF-Connecting-IP`) so the API's rate limits apply per visitor, and
pass `Idempotency-Key` through. The allow-lists and checks are pure functions covered by unit tests (`lib/bff.ts`, `lib/admin-bff.ts`).

## Storefront

- **Themes**: `themes/<slug>/` implement the `ThemeDefinition` contract (`themes/types.ts`): `Header, Hero, ProductGrid, ProductCard, CategorySection, FeaturedProducts, Testimonials, Newsletter, Footer` plus style tokens. Six themes ship: `minimal` (full base), `fashion` and `modern` (own header/hero/cards), `electronics`, `beauty`, `restaurant` (minimal layout + their own product cards/tokens). A store's colours, fonts, hero, navigation, footer, social links and homepage sections all come from the API's theme configuration; nothing is hard-coded per merchant. Colours are re-validated as hex before becoming CSS variables.
- **Homepage builder**: the merchant's ordered, toggleable sections (`hero`, `featured_products`, `categories`, `testimonials`, `newsletter`) render through `HomeSections`; unknown section types are skipped, never a crash.
- **Cart / checkout**: the cart id lives in `localStorage` (per origin = per store); prices always come from the API. Checkout validates with Zod, sends an `Idempotency-Key` that is stable for the same payload, then initialises the payment and redirects to the provider (https only). The return page *asks the API to verify* with the provider and polls briefly, and never trusts the redirect itself.
- **SEO**: per-store title/description/Open Graph/Twitter card/favicon from the store's SEO settings, canonical URLs on the store's primary domain, `Product` JSON-LD (escaped), a per-store `sitemap.xml` and `robots.txt`; cart, checkout and account pages are `noindex`.
- **Accessibility/perf**: semantic landmarks, skip link, labelled forms with live error regions, reduced-motion support, `next/image` for known image hosts.

### Adding a theme

1. Create `themes/<slug>/index.tsx` exporting a `ThemeDefinition`. Spread `minimal` and override only what differs (see `themes/beauty/index.tsx`, about 30 lines).
2. Register it in `themes/index.ts`.
3. In the platform console → *Themes*, create a theme with the **same slug** (the slug is the registry key). Merchants can then select it.

No storefront engine code changes. A theme slug the code does not know falls back to `minimal`.

## Dashboard and platform console

Under `/dashboard` and `/admin` (client components using TanStack Query through `/api/admin`). Navigation is permission-aware (the API enforces
permissions regardless). A cookie gate in each layout redirects to `/login`; any 401 clears the cookie and returns to the login page.
Platform administrators are routed to `/admin`; everyone else to `/dashboard`.

Highlights: product editor with variants/images/stock history, order detail with status actions and idempotent refunds, a theme editor (colours, fonts,
hero, navigation, footer, social links, homepage sections), domain management with DNS instructions, write-only payment-gateway keys, and in the console:
tenant suspend/activate (storefront goes offline immediately), plan assignment, user management, themes, plans, subscriptions, domains, platform settings.

Money fields accept `1,500.00` and send integer **minor units**; client-side Zod validation mirrors, but never replaces, the API's rules.

## Environment

| Variable | Where | Meaning |
|---|---|---|
| `API_URL` | server, runtime | Laravel API base, e.g. `https://api.mydomain.com/api/v1` |
| `PLATFORM_DOMAIN` | server, runtime | Root domain; `app.<PLATFORM_DOMAIN>` is the dashboard/console; use `localhost` in development |
| `STOREFRONT_SCHEME` | server, runtime | `https` in production (canonical URLs, sitemap, session-cookie `Secure`) |
| `STOREFRONT_REVALIDATE` | server, runtime | Seconds the store data cache lives (default 60) |
| `IMAGE_HOSTS` | **build time** | Extra image hostnames for `next/image` (Cloudinary and DigitalOcean Spaces are built in) |
| `NEXT_OUTPUT=standalone` | build time | Produce a self-contained server (set by the Dockerfile) |

## Deployment

- **Docker on a VPS** (supported): `Dockerfile` (multi-stage, standalone output, non-root) and `compose.yaml`:

  ```bash
  cp .env.example .env     # API_URL, PLATFORM_DOMAIN=mydomain.com, STOREFRONT_SCHEME=https
  docker compose up -d --build
  ```

  One container serves every store and the app host; `/api/health` is the health check. Point `app`, `*` and `shops` DNS at it
  (see the backend's [Cloudflare guide](../../laravel/e-shop-backend/docs/cloudflare.md)). The standalone server build was verified; the **image** was not built where this repo was authored (no Docker daemon), so check it on first use.
- **Cloudflare Workers**: not configured here. If you adopt the OpenNext Cloudflare adapter, verify `proxy.ts` Host rewriting, the route handlers (cookies, multipart) and `revalidateTag` on that runtime first.

## Project layout

```
proxy.ts                    hostname -> /s/<host> rewriting; blocks direct /s access
app/
├── s/[host]/…              storefront routes (layout resolves store + theme + metadata)
├── dashboard/…  admin/…    merchant dashboard and platform console
├── login, register, …      auth pages (app host)
└── api/{shop,admin}/…      the two BFFs, plus /api/health
components/{store,cart,admin,ui}/
themes/                     theme registry + one folder per theme
lib/                        pure logic (host, money, checkout, schemas, BFF allow-lists) + API clients
tests/                      node --test unit tests (no browser/test-framework dependency)
```

## Security notes

- Tokens are never readable by JavaScript; cookies are `httpOnly`, `SameSite=Lax`, `Secure` over https, and host-scoped, so a customer session exists only on its own store.
- The tenant for storefront calls is the request's own `Host`; nothing the browser sends can select another store.
- Redirects to payment providers are allowed only for `https://` URLs; JSON-LD is escaped; colours/fonts from the API are re-validated before use in CSS.

## Known limitations

See the backend README. Frontend-specific: the storefront builds on any host the API resolves, so keep `app`/`*`/`shops` pointed at one deployment;
live tests of real payments, Cloudflare Workers, and the Docker image are for you to run (instructions above).
