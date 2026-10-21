import { NextRequest, NextResponse } from "next/server";

import { isSameOrigin, isUploadRequest, maxBodyBytes, requiresJsonBody, resolveUpstreamPath, SESSION_COOKIE } from "@/lib/bff";
import { env } from "@/lib/env";
import { normalizeHost } from "@/lib/host";

/**
 * Backend-for-frontend for the storefront browser code.
 *
 *  - The tenant is derived from THIS request's Host header and sent to Laravel as
 *    X-Storefront-Host. Nothing the browser sends can select a different store.
 *  - The customer's Sanctum token lives in an httpOnly, host-scoped cookie (so it is
 *    unreachable from JavaScript and naturally per-store); it is attached here.
 *  - Only an explicit allowlist of storefront endpoints is forwarded.
 */
type Context = { params: Promise<{ path: string[] }> };

const SESSION_SECONDS = 60 * 60 * 24 * 7;

async function handle(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const host = normalizeHost(request.headers.get("host"));
  const method = request.method;
  const upstreamPath = resolveUpstreamPath(method, (await params).path);

  if (!host || upstreamPath === null) {
    return json({ status: false, statusCode: 404, message: "Not found", data: {}, meta: { errorCode: "NOT_FOUND" } }, 404);
  }

  if (method !== "GET" && (!isSameOrigin(request.headers.get("origin"), host, normalizeHost) || (requiresJsonBody(method) && !(request.headers.get("content-type") ?? "").includes(isUploadRequest(method, upstreamPath) ? "multipart/form-data" : "application/json")))) {
    return json({ status: false, statusCode: 403, message: "Forbidden", data: {}, meta: { errorCode: "FORBIDDEN" } }, 403);
  }

  const upload = isUploadRequest(method, upstreamPath);
  const body = method === "GET" || method === "DELETE" ? undefined : upload ? await request.arrayBuffer() : await request.text();
  if (body !== undefined && (typeof body === "string" ? body.length : body.byteLength) > maxBodyBytes(method, upstreamPath)) {
    return json({ status: false, statusCode: 413, message: "Payload too large", data: {}, meta: { errorCode: "VALIDATION_FAILED" } }, 413);
  }

  const url = new URL(`${env.apiUrl}/storefront/${upstreamPath}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const headers = new Headers({ Accept: "application/json", "X-Storefront-Host": host });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body) headers.set("Content-Type", upload ? (request.headers.get("content-type") ?? "multipart/form-data") : "application/json");

  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);

  // Laravel's per-IP rate limits must see the visitor, not this server.
  const clientIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (clientIp) headers.set("X-Forwarded-For", clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(url, { method, headers, body, cache: "no-store", signal: AbortSignal.timeout(25_000) });
  } catch {
    return json({ status: false, statusCode: 502, message: "The store service is unavailable. Please try again.", data: {}, meta: { errorCode: "SERVER_ERROR" } }, 502);
  }

  if ((upstream.headers.get("content-type") ?? "").startsWith("application/pdf")) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/pdf", "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment", "Cache-Control": "private, no-store" },
    });
  }

  const payload = await upstream.json().catch(() => null);
  const secure = env.scheme === "https";

  if (payload === null) {
    return json({ status: false, statusCode: 502, message: "Unexpected response from the store service.", data: {}, meta: { errorCode: "SERVER_ERROR" } }, 502);
  }

  const response = json(payload, upstream.status);
  for (const name of ["x-request-id", "retry-after", "idempotent-replayed"]) {
    const value = upstream.headers.get(name);
    if (value) response.headers.set(name, value);
  }

  // Session management: the token is moved into an httpOnly cookie and removed from the body.
  if (upstream.ok && (upstreamPath === "auth/login" || upstreamPath === "auth/register") && typeof payload?.data?.token === "string") {
    response.cookies.set(SESSION_COOKIE, payload.data.token, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: SESSION_SECONDS });
    delete payload.data.token;
    return withBody(response, payload, upstream.status);
  }

  if (upstreamPath === "auth/logout" || (upstreamPath === "auth/me" && upstream.status === 401)) {
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
  }

  return response;
}

function json(payload: unknown, status: number): NextResponse {
  const response = NextResponse.json(payload, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function withBody(previous: NextResponse, payload: unknown, status: number): NextResponse {
  const next = json(payload, status);
  previous.cookies.getAll().forEach((cookie) => next.cookies.set(cookie));
  previous.headers.forEach((value, key) => {
    if (key.startsWith("x-") || key === "retry-after") next.headers.set(key, value);
  });
  return next;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
