/** Petits utilitaires partagés par les fonctions Netlify. */
import type { Context } from "@netlify/functions";
import { env } from "./env.ts";
import { internalToken } from "./auth.ts";

export function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}

export function clientIp(req: Request, context: Context): string {
  return context.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
}

export function redirect(location: string, status = 303): Response {
  return new Response(null, { status, headers: { Location: location, "Cache-Control": "no-store" } });
}

/** Déclenche une fonction d'arrière-plan de ce site avec un jeton interne. */
export async function triggerBackground(name: string, purpose: string, body: unknown): Promise<{ ok: boolean; status: number }> {
  const base = process.env.URL?.trim() || env.siteUrl;
  try {
    const res = await fetch(`${base}/.netlify/functions/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${internalToken(purpose)}` },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(15_000),
    });
    return { ok: res.status === 202 || res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
