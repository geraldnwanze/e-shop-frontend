import type { ApiEnvelope } from "../types";
import { toApiError } from "./errors";

/**
 * Browser API access. Calls go to this app's own /api/shop BFF (same origin, so no
 * CORS even on custom domains); the BFF adds the tenant header and the customer's
 * httpOnly session cookie. The browser never sees the API URL or the token.
 */
interface Options {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

async function send<T>(method: string, path: string, body?: unknown, options: Options = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/shop/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    signal: options.signal,
  });

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || json === null) {
    throw toApiError(response.status, json);
  }

  return json;
}

async function call<T>(method: string, path: string, body?: unknown, options: Options = {}): Promise<T> {
  return (await send<T>(method, path, body, options)).data;
}

export const api = {
  get: <T>(path: string, options?: Options) => call<T>("GET", path, undefined, options),
  /** A list endpoint with its `meta` (pagination and any extras such as a rating summary). */
  getPage: async <T, M = Record<string, never>>(path: string, query: Record<string, string | number> = {}, options?: Options): Promise<{ data: T; meta: M & { currentPage?: number; lastPage?: number; total?: number } }> => {
    const qs = new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString();
    const envelope = await send<T>("GET", qs ? `${path}?${qs}` : path, undefined, options);

    return { data: envelope.data, meta: (envelope as unknown as { meta: M & { currentPage?: number; lastPage?: number; total?: number } }).meta };
  },
  post: <T>(path: string, body?: unknown, options?: Options) => call<T>("POST", path, body ?? {}, options),
  /** Upload one file as multipart form data (the browser adds the boundary). */
  upload: async <T>(path: string, form: FormData): Promise<T> => {
    const response = await fetch(`/api/shop/${path}`, { method: "POST", headers: { Accept: "application/json" }, body: form, credentials: "same-origin" });
    const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

    if (!response.ok || json === null) throw toApiError(response.status, json);

    return json.data;
  },
  put: <T>(path: string, body?: unknown, options?: Options) => call<T>("PUT", path, body ?? {}, options),
  patch: <T>(path: string, body?: unknown, options?: Options) => call<T>("PATCH", path, body ?? {}, options),
  delete: <T>(path: string, options?: Options) => call<T>("DELETE", path, undefined, options),
};
