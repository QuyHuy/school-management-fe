import { getAccessToken } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

function getBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const token = getAccessToken();

  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const resp = await fetch(url, {
    ...init,
    headers,
  });

  const contentType = resp.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await resp.json()
    : await resp.text();

  if (!resp.ok) {
    throw new ApiError(resp.statusText || "Request failed", resp.status, payload);
  }

  return payload as T;
}

