import { NextRequest, NextResponse } from "next/server";

import { revalidateTag } from "next/cache";

import { ADMIN_SESSION_COOKIE, adminResponseTags, affectsStorefront, isForwardableContentType, isStrictSameOrigin, PUBLIC_PATHS, resolveAdminPath, storefrontTags } from "@/lib/admin-bff";
import { env } from "@/lib/env";
import { isAppHost, normalizeHost } from "@/lib/host";

/**
 * Backend-for-frontend for the merchant dashboard (app.<platform-domain> only).
 *
 *  - The Sanctum token lives in an httpOnly cookie and is attached here; JavaScript never sees it.
 *  - Only an explicit allowlist of merchant endpoints is forwarded.
 *  - Writes must come from the dashboard origin (Origin header) with a JSON or multipart body.
 *  - Storefront hosts get a 404: this BFF must never be reachable under a store's domain.
 */
type Context = { params: Promise<{ path: string[] }> };

const MAX_BODY_BYTES = 8 * 1024 * 1024; // matches the 5 MB upload limit plus multipart overhead
const SESSION_SECONDS = 60 * 60 * 24 * 7;

const fail = (status: number, message: string, errorCode: string) =>
  json({ status: false, statusCode: status, message, data: {}, meta: { errorCode }, requestId: null }, status);

async function handle(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const host = normalizeHost(request.headers.get("host"));
  const method = request.method;

  if (!host || !isAppHost(host, env.platformDomain)) return fail(404, "Not found", "NOT_FOUND");

  const upstreamPath = resolveAdminPath(method, (await params).path);
  if (upstreamPath === null) return fail(404, "Not found", "NOT_FOUND");

  const hasBody = method !== "GET" && method !== "DELETE";

  if (method !== "GET" && !isStrictSameOrigin(request.headers.get("origin"), host, normalizeHost)) return fail(403, "Forbidden", "FORBIDDEN");

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token && !PUBLIC_PATHS.has(upstreamPath)) return fail(401, "Unauthenticated.", "UNAUTHENTICATED");

  let body: ArrayBuffer | undefined;
  if (hasBody) {
    body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY_BYTES) return fail(413, "Payload too large", "VALIDATION_FAILED");
    if (body.byteLength > 0 && !isForwardableContentType(request.headers.get("content-type"))) return fail(415, "Unsupported content type", "VALIDATION_FAILED");
  }

  const url = new URL(`${env.apiUrl}/${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const headers = new Headers({ Accept: "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const contentType = request.headers.get("content-type");
  if (body && body.byteLength > 0 && contentType) headers.set("Content-Type", contentType);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
  const clientIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(url, { method, headers, body, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  } catch {
    return fail(502, "The API is unavailable. Please try again.", "SERVER_ERROR");
  }

  if ((upstream.headers.get("content-type") ?? "").startsWith("application/pdf")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment", "Cache-Control": "private, no-store" },
    });
  }

  if ((upstream.headers.get("content-type") ?? "").startsWith("text/csv")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment", "Cache-Control": "private, no-store" },
    });
  }

  const payload = await upstream.json().catch(() => null);
  if (payload === null) return fail(502, "Unexpected response from the API.", "SERVER_ERROR");

  const secure = env.scheme === "https";
  const clear = { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: 0 };
  const response = json(payload, upstream.status);

  for (const name of ["x-request-id", "retry-after", "idempotent-replayed"]) {
    const value = upstream.headers.get(name);
    if (value) response.headers.set(name, value);
  }

  if (upstream.ok && (upstreamPath === "auth/login" || upstreamPath === "auth/register") && typeof payload?.data?.token === "string") {
    const sessionToken: string = payload.data.token;
    delete payload.data.token; // the browser never receives the token
    const next = json(payload, upstream.status);
    next.cookies.set(ADMIN_SESSION_COOKIE, sessionToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_SECONDS });
    const requestId = upstream.headers.get("x-request-id");
    if (requestId) next.headers.set("x-request-id", requestId);
    return next;
  }

  // A merchant edit must be visible on the storefront straight away, not after the data cache expires.
  if (upstream.ok && token && affectsStorefront(method, upstreamPath)) {
    await revalidateStorefront(token);
  } else if (upstream.ok && method !== "GET" && upstreamPath.startsWith("admin/")) {
    for (const tag of adminResponseTags(payload)) revalidateTag(tag, { expire: 0 });
  }

  // Logout, or an expired/revoked token: drop the cookie so the dashboard sends the user to /login.
  if (upstreamPath === "auth/logout" || (upstream.status === 401 && token)) {
    response.cookies.set(ADMIN_SESSION_COOKIE, "", clear);
  }

  return response;
}

/** Invalidate cached storefront data for every verified hostname of the signed-in merchant's store. */
async function revalidateStorefront(token: string): Promise<void> {
  try {
    const response = await fetch(`${env.apiUrl}/domains`, { headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(8_000) });
    const body = await response.json().catch(() => null);

    for (const tag of storefrontTags(Array.isArray(body?.data) ? body.data : [])) revalidateTag(tag, { expire: 0 });
  } catch {
    /* best effort: the 60s cache expiry remains the fallback */
  }
}

function json(payload: unknown, status: number): NextResponse {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
