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
 * Plafond des attentes de reprise. Deux modes.
 *
 * **Date limite** (fonction d'arrière-plan). Le pipeline annonce l'instant où la fonction sera
 * coupée, puis, à chaque étape, le temps que le travail restant réclame encore (`setGdeltReserve`).
 * Une reprise n'est accordée que si elle tient dans
 *   `date limite − maintenant − travail restant − marge de sécurité`.
 * Le budget suit donc l'exécution réelle : une qualification plus rapide que prévu rend
 * immédiatement du temps aux reprises, au lieu de le laisser inutilisé. C'est ce qui remplace le
 * forfait de 3 minutes fixé à l'avance, trop conservateur d'environ 5 minutes en pratique.
 *
 * **Repli** (`npm run harvest`, tests) : sans date limite, rien ne coupe l'exécution ; un pool
 * global de 3 minutes protège seulement contre un emballement.
 *
 * Dans les deux cas, budget épuisé ⇒ on ne retente plus, la requête rend null et l'appelant dégrade
 * proprement (repli RSS pour la collecte, cluster non renforcé pour le recoupement).
 */
export const GDELT_MIN_GAP_MS = MIN_GAP;
const FALLBACK_BUDGET_MS = 180_000;
const DEFAULT_SAFETY_MS = 75_000;

let deadlineAt: number | null = null;
let safetyMs = DEFAULT_SAFETY_MS;
let reserveMs = 0;
let fallbackBudgetLeftMs = FALLBACK_BUDGET_MS;
let rateLimitedCount = 0;
let retryCount = 0;
let budgetExhausted = false;

/**
 * Déclare l'instant de coupure de l'exécution (null = aucune limite, mode repli).
 * `safetyMs` est la marge laissée intacte sous la date limite, jamais consommée par les reprises.
 */
export function setGdeltDeadline(at: number | null, opts: { safetyMs?: number } = {}): void {
  deadlineAt = at;
  safetyMs = opts.safetyMs ?? DEFAULT_SAFETY_MS;
  reserveMs = 0;
}

/** Temps que le travail restant réclame après la requête en cours. Mis à jour à chaque étape. */
export function setGdeltReserve(ms: number): void {
  reserveMs = Math.max(0, Math.round(ms));
}

/** Temps encore disponible pour une attente de reprise, sans entamer la marge de sécurité. */
function retryBudgetLeftMs(): number {
  if (deadlineAt === null) return fallbackBudgetLeftMs;
  return Math.max(0, deadlineAt - Date.now() - reserveMs - safetyMs);
}

export interface GdeltOptions { timespan?: string; start?: Date; end?: Date; maxrecords?: number; sort?: "hybridrel" | "datedesc" | "tonedesc" }

/* ---------------- Journalisation de diagnostic ----------------
 * Les échecs étaient avalés : le rapport disait « sans réponse » sans dire pourquoi, ce qui ne
 * permet pas de distinguer un délai dépassé, une erreur réseau, un blocage d'adresse ou un 5xx.
 * Chaque tentative ratée émet désormais une ligne JSON sur console.error, visible dans les journaux
 * Netlify. Purement additif : les valeurs de retour et la logique de reprise sont inchangées.
 */

/** Déplie la chaîne `cause` : sous Node, `fetch` masque DNS et connexion derrière « fetch failed ». */
function describeError(e: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  let cur: unknown = e;
  for (let depth = 0; cur != null && depth < 4; depth++) {
    const prefix = depth === 0 ? "" : `cause${depth > 1 ? depth : ""}_`;
    if (typeof cur !== "object") { out[`${prefix}valeur`] = String(cur); break; }
    const o = cur as { name?: unknown; message?: unknown; code?: unknown; errno?: unknown; syscall?: unknown; hostname?: unknown; cause?: unknown };
    out[`${prefix}type`] = typeof o.name === "string" ? o.name : cur.constructor?.name ?? "inconnu";
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

function excerpt(txt: string): string {
  return txt.replace(/\s+/g, " ").trim().slice(0, 240);
}

function logFailure(query: string, attempt: number, startedAt: number, motif: string, detail: Record<string, unknown>): void {
  console.error("[gdelt] " + JSON.stringify({
    motif,
    tentative: attempt + 1,
    duree_ms: Date.now() - startedAt,
    requete: query.slice(0, 90),
    ...detail,
  }));
}

async function rawQuery(query: string, opts: GdeltOptions): Promise<GdeltArticle[] | null> {
  const p = new URLSearchParams({ query, mode: "artlist", format: "json", maxrecords: String(opts.maxrecords ?? 250), sort: opts.sort ?? "hybridrel" });
  if (opts.start && opts.end) { p.set("startdatetime", toGdeltStamp(opts.start)); p.set("enddatetime", toGdeltStamp(opts.end)); }
  else p.set("timespan", opts.timespan ?? "24h");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?${p.toString()}`;
  for (let attempt = 0; ; attempt++) {
    const gap = Math.max(0, lastCall + MIN_GAP - Date.now());
    if (gap > 0) await sleep(gap);
    lastCall = Date.now();
    const startedAt = Date.now();
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      const txt = await res.text();
      if (res.status === 429 || /limit requests/i.test(txt)) {
        rateLimitedCount++;
        const wait = RETRY_WAITS_MS[attempt];
        logFailure(query, attempt, startedAt, "limitation de débit", {
          statut: res.status, statut_texte: res.statusText,
          retry_after: res.headers.get("retry-after"), serveur: res.headers.get("server"),
          corps: excerpt(txt),
          suite: wait === undefined ? "abandon : 4 tentatives épuisées" : `nouvelle tentative dans ${wait / 1000} s`,
        });
        if (wait === undefined) return null; // les 4 tentatives sont épuisées
        // Coût certain de la tentative suivante : l'attente, puis l'espacement poli.
        const cost = wait + MIN_GAP;
        const left = retryBudgetLeftMs();
        if (cost > left) {
          budgetExhausted = true;
          logFailure(query, attempt, startedAt, "budget d'attente épuisé", {
            mode: deadlineAt === null ? "pool de repli" : "date limite",
            budget_restant_ms: Math.round(left), cout_requis_ms: cost,
            ...(deadlineAt === null ? {} : { avant_coupure_ms: Math.round(deadlineAt - Date.now()), travail_restant_ms: reserveMs, marge_securite_ms: safetyMs }),
          });
          return null;
        }
        if (deadlineAt === null) fallbackBudgetLeftMs -= cost;
        retryCount++;
        await sleep(wait);
        continue;
      }
      if (!res.ok) {
        logFailure(query, attempt, startedAt, "réponse HTTP en erreur", {
          statut: res.status, statut_texte: res.statusText,
          content_type: res.headers.get("content-type"), serveur: res.headers.get("server"),
          corps: excerpt(txt),
        });
        return null;
      }
      if (!txt.trim().startsWith("{")) {
        if (txt.trim() === "") return [];
        logFailure(query, attempt, startedAt, "corps non-JSON", {
          statut: res.status, content_type: res.headers.get("content-type"),
          taille_octets: txt.length, corps: excerpt(txt),
        });
        return null;
      }
      const j = JSON.parse(txt) as { articles?: GdeltArticle[] };
      return j.articles ?? [];
    } catch (e) {
      logFailure(query, attempt, startedAt, "exception lors de l'appel", {
        delai_tentative_ms: ATTEMPT_TIMEOUT_MS,
        ...describeError(e),
      });
      return null;
    }
  }
}

/** Compteurs de limitation de débit, pour le rapport consultable depuis /admin. */
export function gdeltRateLimitStats(): { limites: number; nouvelles_tentatives: number; budget_epuise: boolean; budget_restant_s: number } {
  return { limites: rateLimitedCount, nouvelles_tentatives: retryCount, budget_epuise: budgetExhausted, budget_restant_s: Math.round(retryBudgetLeftMs() / 1000) };
}

/** Remet le budget à zéro (rejeu d'une journée dans le même processus, tests). */
export function resetGdeltRateLimitBudget(): void {
  fallbackBudgetLeftMs = FALLBACK_BUDGET_MS;
  reserveMs = 0;
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
