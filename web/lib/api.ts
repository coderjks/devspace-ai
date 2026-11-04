import { API_BASE } from "./utils";

export function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("devspace_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ApiOptions = {
  /** Set to 0, or `cache: false`, for reads that must always be fresh (for example polling). */
  cacheTtlMs?: number;
  cache?: boolean;
};

const DEFAULT_GET_TTL_MS = 10_000;

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const getCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<unknown>>();

export function clearApiCache(): void {
  getCache.clear();
  inFlight.clear();
}

function hashToken(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (Math.imul(hash, 31) + value.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function requestKey(path: string, headers: Record<string, string>): string {
  return `${hashToken(JSON.stringify(headers))}:${path}`;
}

async function doFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.detail === "string" ? data.detail : `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function api<T>(path: string, init?: RequestInit, options?: ApiOptions): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  if (method !== "GET") {
    try {
      return await doFetch<T>(path, init);
    } finally {
      // A write can change almost any screen's data; drop short-lived GET
      // results so the next page load reads the new state.
      clearApiCache();
    }
  }

  const headers: Record<string, string> = {
    ...authHeaders(),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  const key = requestKey(path, headers);
  const ttl = options?.cache === false ? 0 : (options?.cacheTtlMs ?? DEFAULT_GET_TTL_MS);

  if (ttl > 0) {
    const cached = getCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise as Promise<T>;
    }
    const promise = doFetch<T>(path, init);
    const entry: CacheEntry = { expiresAt: Date.now() + ttl, promise: promise as Promise<unknown> };
    getCache.set(key, entry);
    promise.catch(() => {
      if (getCache.get(key) === entry) getCache.delete(key);
    });
    return promise;
  }

  // Fresh reads still share one network call when several components ask for
  // the same URL at the same moment.
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const promise = doFetch<T>(path, init) as Promise<unknown>;
  inFlight.set(key, promise);
  promise.then(
    () => inFlight.delete(key),
    () => inFlight.delete(key),
  );
  return promise as Promise<T>;
}

export async function logout() {
  const token = typeof window !== "undefined" ? localStorage.getItem("devspace_token") : null;
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => undefined);
  if (typeof window !== "undefined") {
    clearApiCache();
    localStorage.removeItem("devspace_token");
    window.location.href = "/login";
  }
}
