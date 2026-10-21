import { toApiError } from "../api/errors";
import type { ApiEnvelope } from "../types";
import type { Meta, Page } from "./types";

/**
 * Browser access to the merchant API. Everything goes through this app's
 * /api/admin BFF (httpOnly session cookie, strict origin check, allowlist).
 */
interface Options {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export function qs(params: Query = {}): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "" && value !== false) q.set(key, value === true ? "1" : String(value));
  }
  const s = q.toString();

  return s ? `?${s}` : "";
}

async function send<T>(method: string, path: string, body?: unknown, options: Options = {}): Promise<{ data: T; meta: Meta }> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    credentials: "same-origin",
    signal: options.signal,
  });

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || json === null) {
    throw toApiError(response.status, json);
  }

  return { data: json.data, meta: json.meta as Meta };
}

export const adminApi = {
  get: async <T>(path: string, query?: Query, options?: Options) => (await send<T>("GET", path + qs(query), undefined, options)).data,
  list: async <T>(path: string, query?: Query, options?: Options): Promise<Page<T>> => {
    const { data, meta } = await send<T[]>("GET", path + qs(query), undefined, options);
    return { items: data, meta };
  },
  post: async <T>(path: string, body?: unknown, options?: Options) => (await send<T>("POST", path, body ?? {}, options)).data,
  put: async <T>(path: string, body?: unknown, options?: Options) => (await send<T>("PUT", path, body ?? {}, options)).data,
  patch: async <T>(path: string, body?: unknown, options?: Options) => (await send<T>("PATCH", path, body ?? {}, options)).data,
  delete: async <T>(path: string, options?: Options) => (await send<T>("DELETE", path, undefined, options)).data,
  /** Multipart upload (file field name: "file"). */
  upload: async <T>(path: string, file: File, extra: Record<string, string> = {}, method: "POST" = "POST") => {
    const form = new FormData();
    form.append("file", file);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);

    return (await send<T>(method, path, form)).data;
  },
};
