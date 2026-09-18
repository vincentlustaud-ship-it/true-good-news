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

/**
 * Un 429 — ou la réponse en clair « Please limit requests to one every 5 seconds », que GDELT sert
 * avec un code 200 — n'est pas une panne : l'API demande d'attendre. On retente donc, avec une
 * attente croissante, au lieu d'abandonner après un seul délai fixe de 8 s.
 *
 * Toutes les autres issues gardent le comportement d'origine : réponse non-ok, corps non-JSON,
 * délai dépassé ou erreur réseau rendent immédiatement null, sans nouvelle tentative.
 */
const ATTEMPT_TIMEOUT_MS = 20_000;
const RETRY_WAITS_MS = [8_000, 20_000, 40_000]; // 4 tentatives au total

/**
 * Budget d'attente partagé par toute l'exécution. Une fonction d'arrière-plan Netlify est coupée à
 * 15 minutes, et le pipeline dépense déjà environ 5 minutes en espacement poli (58 requêtes au plus,
 * 13 de repérage + 45 de recoupement, une toutes les 5,2 s) auxquelles s'ajoutent les appels de
 * qualification. Les nouvelles attentes sont donc plafonnées à 3 minutes cumulées : au pire
 * 5 + 3 + ~3 minutes, soit une marge confortable sous la limite.
 *
 * Budget épuisé ⇒ on ne retente plus, la requête rend null et l'appelant dégrade proprement
 * (repli sur les flux RSS pour la collecte, cluster non renforcé pour le recoupement).
 */
const RETRY_BUDGET_MS = 180_000;
let retryBudgetLeftMs = RETRY_BUDGET_MS;
let rateLimitedCount = 0;
let retryCount = 0;
let budgetExhausted = false;

export interface GdeltOptions { timespan?: string; start?: Date; end?: Date; maxrecords?: number; sort?: "hybridrel" | "datedesc" | "tonedesc" }

async function rawQuery(query: string, opts: GdeltOptions): Promise<GdeltArticle[] | null> {
  const p = new URLSearchParams({ query, mode: "artlist", format: "json", maxrecords: String(opts.maxrecords ?? 250), sort: opts.sort ?? "hybridrel" });
  if (opts.start && opts.end) { p.set("startdatetime", toGdeltStamp(opts.start)); p.set("enddatetime", toGdeltStamp(opts.end)); }
  else p.set("timespan", opts.timespan ?? "24h");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${p.toString()}`;
  for (let attempt = 0; ; attempt++) {
    const gap = Math.max(0, lastCall + MIN_GAP - Date.now());
    if (gap > 0) await sleep(gap);
    lastCall = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      const txt = await res.text();
      if (res.status === 429 || /limit requests/i.test(txt)) {
        rateLimitedCount++;
        const wait = RETRY_WAITS_MS[attempt];
        if (wait === undefined) return null; // les 4 tentatives sont épuisées
        // Coût certain de la tentative suivante : l'attente, puis l'espacement poli.
        const cost = wait + MIN_GAP;
        if (cost > retryBudgetLeftMs) { budgetExhausted = true; return null; }
        retryBudgetLeftMs -= cost;
        retryCount++;
        await sleep(wait);
        continue;
      }
      if (!res.ok) return null;
      if (!txt.trim().startsWith("{")) return txt.trim() === "" ? [] : null;
      const j = JSON.parse(txt) as { articles?: GdeltArticle[] };
      return j.articles ?? [];
    } catch {
      return null;
    }
  }
}

/** Compteurs de limitation de débit, pour le rapport consultable depuis /admin. */
export function gdeltRateLimitStats(): { limites: number; nouvelles_tentatives: number; budget_epuise: boolean; budget_restant_s: number } {
  return { limites: rateLimitedCount, nouvelles_tentatives: retryCount, budget_epuise: budgetExhausted, budget_restant_s: Math.round(retryBudgetLeftMs / 1000) };
}

/** Remet le budget à zéro (rejeu d'une journée dans le même processus, tests). */
export function resetGdeltRateLimitBudget(): void {
  retryBudgetLeftMs = RETRY_BUDGET_MS;
  rateLimitedCount = 0;
  retryCount = 0;
  budgetExhausted = false;
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
