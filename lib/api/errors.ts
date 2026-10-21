export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
    public readonly requestId: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNotFound() {
    return this.status === 404;
  }
}

/** Build an ApiError from a (possibly non-JSON) failed response body. */
export function toApiError(status: number, body: unknown): ApiError {
  const b = (body ?? {}) as { message?: string; meta?: { errorCode?: string; errors?: Record<string, unknown> }; requestId?: string | null };
  const errors: Record<string, string[]> = {};

  for (const [field, value] of Object.entries(b.meta?.errors ?? {})) {
    if (Array.isArray(value)) errors[field] = value.map(String);
  }

  return new ApiError(status, b.meta?.errorCode ?? "UNKNOWN", b.message ?? "Something went wrong.", errors, b.requestId ?? null);
}
