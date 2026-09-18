import type { PublishedFile, CandidatesFile, Report, RunStats, Story } from "../../agents/types.ts";

export interface NewsResponse {
  date: string | null; publishedAt?: string; latest: string | null; prev: string | null; next: string | null;
  stats: RunStats | null; stories: Story[]; views: Record<string, number>;
}

export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(init?.headers ?? {}) } });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* vide */ }
  if (!res.ok) throw new ApiError(res.status, (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`);
  return body as T;
}

export const api = {
  news: (date?: string | null) => call<NewsResponse>(`/api/news${date ? `?date=${encodeURIComponent(date)}` : ""}`),
  view: (ids: string[]) => call<{ ok: boolean }>("/api/view", { method: "POST", body: JSON.stringify({ ids }) }).catch(() => null),
  subscribe: (email: string, lang: string) => call<{ ok: boolean }>("/api/subscribe", { method: "POST", body: JSON.stringify({ email, lang }) }),
  admin: {
    login: (password: string) => call<{ ok: boolean }>("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) }),
    logout: () => call<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
    candidates: (date?: string | null) => call<{ date: string; today: string; candidates: CandidatesFile | null; report: Report | null; published: PublishedFile | null; candidateDates: string[]; publishedDates: string[]; reportDates: string[] }>(`/api/admin/candidates${date ? `?date=${encodeURIComponent(date)}` : ""}`),
    publish: (date: string, ids: string[], replace = false) => call<{ ok: boolean; email: { ok: boolean; status: number; skipped: boolean } }>("/api/admin/publish", { method: "POST", body: JSON.stringify({ date, ids, replace }) }),
    run: (date?: string) => call<{ ok: boolean; date: string }>("/api/admin/run", { method: "POST", body: JSON.stringify({ date }) }),
    correction: (date: string, id: string, texte: string) => call<{ ok: boolean; corrections: Array<{ date: string; texte: string }> }>("/api/admin/correction", { method: "POST", body: JSON.stringify({ date, id, texte }) }),
  },
};
