/**
 * GDELT DOC 2.0 : gratuit, sans clé, une requête toutes les 5 secondes (SOURCES.md).
 * Toutes les requêtes passent par une file unique qui impose l'espacement.
 */
import { USER_AGENT } from "./env.ts";
import { sleep } from "./http.ts";
import { fromGdeltDate, toGdeltStamp } from "./dates.ts";
import { domainOf, truncate, stripHtml } from "./text.ts";
import map from "../data/gdelt-map.json" with { type: "json" };
import type { RawArticle } from "../agents/types.ts";

const COUNTRIES = (map as { countries: Record<string, string> }).countries;
const LANGS = (map as { languages: Record<string, string> }).languages;

interface GdeltArticle { url: string; title: string; seendate?: string; socialimage?: string; domain?: string; language?: string; sourcecountry?: string }

let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;
const MIN_GAP = 5_200;

export interface GdeltOptions { timespan?: string; start?: Date; end?: Date; maxrecords?: number; sort?: "hybridrel" | "datedesc" | "tonedesc" }

async function rawQuery(query: string, opts: GdeltOptions): Promise<GdeltArticle[] | null> {
  const p = new URLSearchParams({ query, mode: "artlist", format: "json", maxrecords: String(opts.maxrecords ?? 250), sort: opts.sort ?? "hybridrel" });
  if (opts.start && opts.end) { p.set("startdatetime", toGdeltStamp(opts.start)); p.set("enddatetime", toGdeltStamp(opts.end)); }
  else p.set("timespan", opts.timespan ?? "24h");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${p.toString()}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = Math.max(0, lastCall + MIN_GAP - Date.now());
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(25_000) });
      const txt = await res.text();
      if (res.status === 429 || /limit requests/i.test(txt)) { await sleep(8_000); continue; }
      if (!res.ok) return null;
      if (!txt.trim().startsWith("{")) return txt.trim() === "" ? [] : null;
      const j = JSON.parse(txt) as { articles?: GdeltArticle[] };
      return j.articles ?? [];
    } catch {
      return null;
    }
  }
  return null;
}

/** Interroge GDELT en respectant la file. null = GDELT indisponible (à distinguer de « aucun résultat »). */
export function gdeltQuery(query: string, opts: GdeltOptions = {}): Promise<GdeltArticle[] | null> {
  const next = chain.then(() => rawQuery(query, opts));
  chain = next.catch(() => null);
  return next;
}

export function toRawArticle(a: GdeltArticle): RawArticle | null {
  const domain = a.domain?.toLowerCase().replace(/^www\./, "") || domainOf(a.url);
  if (!domain || !a.url || !a.title) return null;
  return {
    url: a.url,
    title: truncate(stripHtml(a.title), 300),
    summary: null,
    domain,
    lang: a.language ? LANGS[a.language] ?? null : null,
    country: a.sourcecountry ? COUNTRIES[a.sourcecountry] ?? null : null,
    publishedAt: fromGdeltDate(a.seendate),
    image: a.socialimage && /^https:\/\//.test(a.socialimage) ? a.socialimage : null,
    via: "gdelt",
  };
}

/** Construit une requête GDELT à partir de termes : phrases entre guillemets, ET implicite. */
export function termsQuery(terms: string[]): string {
  return terms.map((t) => (/\s/.test(t) ? `"${t.replace(/"/g, "")}"` : t)).join(" ");
}
