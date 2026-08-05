import type { ApiErrorBody } from "./types";

const BASE = "/api/v1";

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: ApiErrorBody["details"];
  requestId: string;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.details = body.details ?? [];
    this.requestId = body.requestId;
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= (async () => {
    const res = await fetch(`${BASE}/admin/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function toError(body: unknown, status: number): ApiError {
  if (body && typeof body === "object" && "message" in body) {
    return new ApiError(body as ApiErrorBody);
  }
  return new ApiError({
    success: false,
    statusCode: status,
    code: "NETWORK_ERROR",
    message: `Request failed with status ${status}.`,
    details: [],
    requestId: "",
  });
}

async function rawRequest(
  path: string,
  init: RequestInit,
): Promise<{ data: unknown; meta?: unknown; response: Response }> {
  const response = await fetch(`${BASE}${path}`, {
    credentials: "include",
    ...init,
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    throw toError(body, response.status);
  }
  if (body && typeof body === "object" && "data" in body) {
    const envelope = body as { data: unknown; meta?: unknown };
    return { data: envelope.data, meta: envelope.meta, response };
  }
  return { data: body, meta: undefined, response };
}

async function request<T>(
  path: string,
  init?: RequestInit,
  retried = false,
): Promise<T> {
  try {
    const { data } = await rawRequest(path, init ?? {});
    return data as T;
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === 401 &&
      !retried &&
      !path.startsWith("/admin/auth/")
    ) {
      if (await refreshSession()) {
        return request<T>(path, init, true);
      }
      if (typeof window !== "undefined") {
        window.location.assign("/login");
      }
    }
    throw error;
  }
}

function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, jsonInit("POST", body));
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, jsonInit("PATCH", body));
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export function apiUpload<T>(
  path: string,
  formData: FormData,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: extraHeaders,
    body: formData,
  });
}

export interface QueryString {
  [key: string]: string | number | boolean | undefined | null;
}

export function qs(params: QueryString): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );
  if (entries.length === 0) return "";
  const search = new URLSearchParams();
  for (const [key, value] of entries) search.set(key, String(value));
  return `?${search.toString()}`;
}

/** Fetch a CSV/string endpoint (wrapped by the API envelope) and trigger a download. */
export async function downloadCsv(
  path: string,
  filename: string,
): Promise<void> {
  const response = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw toError(body, response.status);
  }
  const text = await response.text();
  let csv = text;
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      parsed &&
      typeof parsed === "object" &&
      "data" in (parsed as Record<string, unknown>)
    ) {
      const value = (parsed as { data: unknown }).data;
      if (typeof value === "string") csv = value;
    }
  } catch {
    csv = text;
  }
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
