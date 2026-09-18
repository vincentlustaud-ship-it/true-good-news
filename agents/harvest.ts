/**
 * Agent 1 — COLLECTE (SOURCES.md).
 * GDELT (repérage mondial) + flux RSS/Atom vérifiés (data/feeds.json) + réseaux sociaux (repérage seul).
 * Sortie : articles bruts dédupliqués, chacun réduit à titre / résumé court / URL / date / média / pays / langue / image en lien.
 */
import feedsJson from "../data/feeds.json" with { type: "json" };
import queriesJson from "../data/gdelt-queries.json" with { type: "json" };
import { readFeed, type FeedDef } from "../lib/rss.ts";
import { gdeltQuery, gdeltRateLimitStats, setGdeltReserve, toRawArticle, GDELT_MIN_GAP_MS } from "../lib/gdelt.ts";
import { spotBluesky, spotMastodon, spotReddit, type Spotted } from "../lib/social.ts";
import { fetchOpenGraph } from "../lib/og.ts";
import { mapLimit } from "../lib/http.ts";
import { harvestWindow } from "../lib/dates.ts";
import { domainOf, truncate } from "../lib/text.ts";
import { isAggregator, mediaCountryFor } from "../lib/domains.ts";
import type { RawArticle } from "./types.ts";
import type { Reporter } from "./report.ts";

export interface HarvestOptions {
  date: string; skipSocial?: boolean; skipGdelt?: boolean; limitFeeds?: number; gdeltQueries?: number;
  /** Temps que réclament les étapes situées après la collecte, pour le calcul du budget d'attente GDELT. */
  reserveAfterMs?: number;
}
export interface HarvestResult { articles: RawArticle[]; feedsOk: number; feedsFailed: number; gdeltOk: boolean }

const TRACKING = /^(utm_|fbclid|gclid|mc_|ref$|ref_|source$|CMP$|ns_|ito$|xtor$|at_)/i;

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^amp\./, "");
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch { return url; }
}

/** Consigne l'état de la limitation de débit GDELT : c'est ce qui explique une collecte mondiale pauvre. */
export function noteRateLimit(rep: Reporter): void {
  const s = gdeltRateLimitStats();
  if (!s.limites) return;
  rep.note(`GDELT a limité le débit ${s.limites} fois, ${s.nouvelles_tentatives} nouvelle(s) tentative(s) (budget d'attente restant : ${s.budget_restant_s} s)`);
  if (s.budget_epuise) rep.alert("Budget d'attente GDELT épuisé : les requêtes suivantes ont été abandonnées sans nouvelle tentative pour tenir dans la durée d'une fonction d'arrière-plan.");
}

export async function harvest(opts: HarvestOptions, rep: Reporter): Promise<HarvestResult> {
  const { start, end } = harvestWindow(opts.date);
  const slackStart = new Date(start.getTime() - 12 * 3600 * 1000);
  const slackEnd = new Date(end.getTime() + 3 * 3600 * 1000);
  const inWindow = (iso: string | null) => iso == null || (Date.parse(iso) >= slackStart.getTime() && Date.parse(iso) <= slackEnd.getTime());

  const all: RawArticle[] = [];

  // ---- 1. Flux RSS / Atom ----
  let feeds = feedsJson as FeedDef[];
  if (opts.limitFeeds) feeds = feeds.slice(0, opts.limitFeeds);
  rep.stage("collecte:rss", feeds.length);
  let feedsOk = 0, feedsFailed = 0, rssKept = 0;
  const results = await mapLimit(feeds, 12, (f) => readFeed(f));
  results.forEach((r, i) => {
    const f = feeds[i]!;
    if (r.error) {
      feedsFailed++;
      rep.note(`flux en échec : ${f.name} (${r.error})`);
      // Le détail réel part dans les journaux Netlify : statut, cause réseau, durée, taille.
      console.error("[flux] " + JSON.stringify({ motif: r.error, ...(r.diagnostic ?? { flux: f.name, url: f.url }) }));
      return;
    }
    if (r.diagnostic?.tronque_et_repare) rep.note(`flux ${f.name} : corps au-delà du plafond, recoupé au dernier élément complet (${r.items.length} retenus)`);
    feedsOk++;
    for (const a of r.items) {
      if (!inWindow(a.publishedAt)) { rep.reject("collecte", a.title, a.url, "hors fenetre de 24 h"); continue; }
      all.push(a); rssKept++;
    }
  });
  rep.endStage(rssKept);

  // ---- 2. GDELT ----
  let gdeltOk = false;
  if (!opts.skipGdelt) {
    const queries = (queriesJson as { queries: Array<{ lang: string; query: string }> }).queries.slice(0, opts.gdeltQueries ?? 99);
    rep.stage("collecte:gdelt", queries.length);
    let gdeltKept = 0, answered = 0;
    for (const [i, q] of queries.entries()) {
      // Travail restant : les requêtes de repérage encore à faire, puis tout ce qui suit la collecte.
      setGdeltReserve((queries.length - 1 - i) * GDELT_MIN_GAP_MS + (opts.reserveAfterMs ?? 0));
      const res = await gdeltQuery(q.query, { start, end, maxrecords: 250, sort: "hybridrel" });
      if (res === null) { rep.note(`GDELT sans réponse pour la requête ${q.lang}`); continue; }
      answered++;
      for (const g of res) {
        const a = toRawArticle(g);
        if (!a) continue;
        if (a.lang == null) a.lang = q.lang;
        all.push(a); gdeltKept++;
      }
    }
    gdeltOk = answered > 0;
    noteRateLimit(rep);
    if (!gdeltOk) rep.alert("GDELT indisponible : repli sur les flux RSS directs uniquement (couverture mondiale réduite).");
    rep.endStage(gdeltKept);
  }

  // ---- 3. Réseaux sociaux : repérage ----
  if (!opts.skipSocial) {
    rep.stage("collecte:social", 0);
    const notes: string[] = [];
    const spotted: Spotted[] = [];
    const [b, m, r] = await Promise.all([
      spotBluesky(["#goodnews", "\"good news\" science", "\"bonne nouvelle\""], notes),
      spotMastodon("mastodon.social", ["goodnews", "bonnenouvelle", "conservation"], notes),
      spotReddit(["UpliftingNews", "goodnews"], notes),
    ]);
    spotted.push(...b, ...m, ...r);
    for (const n of notes) rep.note(n);
    const seen = new Set<string>();
    const unique = spotted.filter((s) => { const c = canonicalUrl(s.url); if (seen.has(c)) return false; seen.add(c); return true; }).slice(0, 40);
    // Titre manquant ⇒ métadonnées Open Graph, si robots.txt l'autorise.
    const enriched = await mapLimit(unique, 6, async (s): Promise<RawArticle | null> => {
      const domain = domainOf(s.url);
      if (!domain) return null;
      let title = s.title, summary = s.description, image: string | null = null, lang: string | null = null;
      if (!title) {
        const { og, robotsBlocked } = await fetchOpenGraph(s.url);
        if (robotsBlocked) { rep.reject("collecte", s.url, s.url, "robots.txt interdit la lecture de la page"); return null; }
        if (!og?.title) { rep.reject("collecte", s.url, s.url, "titre introuvable"); return null; }
        title = og.title; summary = summary ?? og.description; image = og.image; lang = og.lang;
      }
      return { url: s.url, title: truncate(title, 300), summary, domain, lang, country: mediaCountryFor(domain), publishedAt: null, image, via: "social", spottedOn: s.spottedOn };
    });
    let socialKept = 0;
    for (const a of enriched) if (a) { all.push(a); socialKept++; }
    rep.endStage(socialKept);
  }

  // ---- 4. Dédoublonnage et exclusions ----
  rep.stage("collecte:dedup", all.length);
  const byUrl = new Map<string, RawArticle>();
  let aggregators = 0;
  for (const a of all) {
    if (isAggregator(a.domain)) { aggregators++; rep.reject("collecte", a.title, a.url, "agregateur ou reseau social"); continue; }
    const key = canonicalUrl(a.url);
    const prev = byUrl.get(key);
    if (!prev) { byUrl.set(key, a); continue; }
    // On garde la version la plus riche (RSS avec résumé > GDELT sans résumé), en complétant les trous.
    const keep = prev.via === "rss" || (prev.summary && !a.summary) ? prev : a;
    const other = keep === prev ? a : prev;
    keep.summary ??= other.summary; keep.image ??= other.image; keep.lang ??= other.lang; keep.country ??= other.country; keep.publishedAt ??= other.publishedAt;
    byUrl.set(key, keep);
  }
  const articles = [...byUrl.values()];
  if (aggregators) rep.note(`${aggregators} liens d'agrégateurs ou de réseaux sociaux écartés`);
  rep.endStage(articles.length);

  return { articles, feedsOk, feedsFailed, gdeltOk };
}
