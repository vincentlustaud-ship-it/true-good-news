/**
 * Accès HTTP poli (SOURCES.md) : User-Agent explicite, timeout court, un seul fetch par URL
 * (cache mémoire par exécution), robots.txt lu et respecté avant toute page HTML.
 * Échec ⇒ null, jamais d'exception qui bloque le pipeline.
 */
import { USER_AGENT } from "./env.ts";

const textCache = new Map<string, Promise<string | null>>();
const robotsCache = new Map<string, Promise<RobotsRules | null>>();

export interface FetchOpts { timeoutMs?: number; accept?: string; maxBytes?: number; headers?: Record<string, string> }

/** Résultat détaillé : ce qu'il faut pour savoir *pourquoi* un flux n'a pas pu être lu. */
export interface FetchResult {
  text: string | null;
  /** true si le corps dépassait `maxBytes` et a été coupé : le document est incomplet. */
  truncated: boolean;
  status: number | null;
  statusText: string | null;
  contentType: string | null;
  bytes: number;
  finalUrl: string | null;
  ms: number;
  /** Renseigné quand rien n'a pu être lu. */
  failure: { motif: string; detail: Record<string, unknown> } | null;
}

/** Déplie la chaîne `cause` : sous Node, `fetch` masque DNS et connexion derrière « fetch failed ». */
export function describeFetchError(e: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let cur: unknown = e;
  for (let depth = 0; cur != null && depth < 4; depth++) {
    const prefix = depth === 0 ? "" : `cause${depth > 1 ? depth : ""}_`;
    if (typeof cur !== "object") { out[`${prefix}valeur`] = String(cur); break; }
    const o = cur as { name?: unknown; message?: unknown; code?: unknown; errno?: unknown; syscall?: unknown; hostname?: unknown; cause?: unknown };
    out[`${prefix}type`] = typeof o.name === "string" ? o.name : "inconnu";
    if (o.message !== undefined) out[`${prefix}message`] = String(o.message).slice(0, 300);
    if (o.code !== undefined) out[`${prefix}code`] = String(o.code);
    if (o.errno !== undefined) out[`${prefix}errno`] = String(o.errno);
    if (o.syscall !== undefined) out[`${prefix}syscall`] = String(o.syscall);
    if (o.hostname !== undefined) out[`${prefix}hote`] = String(o.hostname);
    if (o.cause === undefined) break;
    cur = o.cause;
  }
  return out;
}

const resultCache = new Map<string, Promise<FetchResult>>();

export async function fetchDetailed(url: string, opts: FetchOpts = {}): Promise<FetchResult> {
  const cached = resultCache.get(url);
  if (cached) return cached;
  const started = Date.now();
  const p = (async (): Promise<FetchResult> => {
    const base = { text: null, truncated: false, status: null, statusText: null, contentType: null, bytes: 0, finalUrl: null, ms: 0 };
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: opts.accept ?? "*/*", ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        redirect: "follow",
      });
      const meta = { status: res.status, statusText: res.statusText, contentType: res.headers.get("content-type"), finalUrl: res.url || url };
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return { ...base, ...meta, bytes: body.length, ms: Date.now() - started,
          failure: { motif: "réponse HTTP en erreur", detail: { statut: res.status, statut_texte: res.statusText, content_type: meta.contentType, corps: body.replace(/\s+/g, " ").trim().slice(0, 200) } } };
      }
      const max = opts.maxBytes ?? 2_000_000;
      const reader = res.body?.getReader();
      let buf: Buffer;
      let truncated = false;
      if (!reader) {
        buf = Buffer.from(await res.text());
      } else {
        const chunks: Uint8Array[] = [];
        let total = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          total += value.byteLength;
          if (total >= max) { truncated = true; reader.cancel().catch(() => {}); break; }
        }
        buf = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      }
      const m = /charset=([\w-]+)/i.exec(meta.contentType ?? "");
      const enc = (m?.[1] ?? "utf-8").toLowerCase();
      let text: string;
      try { text = new TextDecoder(enc).decode(buf); } catch { text = buf.toString("utf8"); }
      return { ...base, ...meta, text, truncated, bytes: buf.byteLength, ms: Date.now() - started, failure: null };
    } catch (e) {
      return { ...base, ms: Date.now() - started, failure: { motif: "exception lors de l'appel", detail: { delai_ms: opts.timeoutMs ?? 10_000, ...describeFetchError(e) } } };
    }
  })();
  resultCache.set(url, p);
  return p;
}

export async function fetchText(url: string, opts: FetchOpts = {}): Promise<string | null> {
  const cached = textCache.get(url);
  if (cached) return cached;
  const p = fetchDetailed(url, opts).then((r) => r.text);
  textCache.set(url, p);
  return p;
}

export async function fetchJSON<T>(url: string, opts: FetchOpts = {}): Promise<T | null> {
  const t = await fetchText(url, { ...opts, accept: opts.accept ?? "application/json" });
  if (t == null) return null;
  try { return JSON.parse(t) as T; } catch { return null; }
}

/* ---------- robots.txt ---------- */
interface RobotsRules { allow: string[]; disallow: string[] }

function parseRobots(txt: string): RobotsRules {
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  let cur: { agents: string[]; allow: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (field === "user-agent") {
      if (!cur || !lastWasAgent) { cur = { agents: [], allow: [], disallow: [] }; groups.push(cur); }
      cur.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (field === "allow") cur.allow.push(value);
    else if (field === "disallow") cur.disallow.push(value);
  }
  const mine = groups.find((g) => g.agents.some((a) => a === "truegoodnews" || a.startsWith("truegoodnews/")));
  const star = groups.find((g) => g.agents.includes("*"));
  const g = mine ?? star;
  return g ? { allow: g.allow, disallow: g.disallow } : { allow: [], disallow: [] };
}

function ruleMatches(rule: string, pathAndQuery: string): boolean {
  if (rule === "") return false;
  let re = "^";
  for (const ch of rule) {
    if (ch === "*") re += ".*";
    else if (ch === "$") re += "$";
    else re += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(re).test(pathAndQuery);
}

export async function robotsAllows(url: string): Promise<boolean> {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const origin = u.origin;
  let p = robotsCache.get(origin);
  if (!p) {
    p = (async () => {
      const txt = await fetchText(origin + "/robots.txt", { timeoutMs: 6_000, maxBytes: 200_000, accept: "text/plain" });
      return txt == null ? null : parseRobots(txt);
    })();
    robotsCache.set(origin, p);
  }
  const rules = await p;
  if (!rules) return true; // pas de robots.txt lisible : aucune interdiction exprimée
  const target = u.pathname + u.search;
  let best: { allow: boolean; len: number } | null = null;
  for (const r of rules.allow) if (ruleMatches(r, target) && (!best || r.length > best.len)) best = { allow: true, len: r.length };
  for (const r of rules.disallow) if (ruleMatches(r, target) && (!best || r.length > best.len)) best = { allow: false, len: r.length };
  return best ? best.allow : true;
}

/** Récupère une page HTML seulement si robots.txt l'autorise. */
export async function fetchHtmlIfAllowed(url: string): Promise<{ html: string | null; robotsBlocked: boolean }> {
  if (!(await robotsAllows(url))) return { html: null, robotsBlocked: true };
  const html = await fetchText(url, { timeoutMs: 8_000, maxBytes: 400_000, accept: "text/html,application/xhtml+xml" });
  return { html, robotsBlocked: false };
}

export function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

/** Exécute des tâches avec une concurrence bornée. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}
