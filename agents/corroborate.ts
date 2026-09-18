/**
 * Agent 2 — RECOUPEMENT (FIABILITE.md).
 *  - regroupe les articles par événement (similarité lexicale + termes forts),
 *  - compte les rédactions indépendantes (par propriétaire, agences, sans agrégateurs ni réseaux sociaux),
 *  - compte les pays, cherche une source primaire, interroge le fact-check,
 *  - attribue un niveau : Confirmé / Bien corroboré / Insuffisant.
 *
 * Deux passes : (1) preuves locales pour tous les clusters ; (2) requête GDELT ciblée + fact-check
 * pour les clusters retenus par la charte (budget GDELT : une requête / 5 s).
 */
import { fold, jaccard, sharedCount, strongTerms, tokens, stableId } from "../lib/text.ts";
import { ownerOf, isAggregator, primarySourceFor, DOI_RE, mediaNameFor, agencyReprint } from "../lib/domains.ts";
import { gdeltQuery, setGdeltReserve, termsQuery, toRawArticle, GDELT_MIN_GAP_MS } from "../lib/gdelt.ts";
import { noteRateLimit } from "./harvest.ts";
import { searchFactChecks } from "../lib/factcheck.ts";
import { env } from "../lib/env.ts";
import type { Cluster, Evidence, Level, RawArticle, SourceRef } from "./types.ts";
import type { Reporter } from "./report.ts";

const PRIORITY: Record<string, number> = { institution: 0, solutions: 1, agency: 2, media: 3 };
function priority(a: RawArticle): number {
  if (a.via === "rss") return PRIORITY[a.feedKind ?? "media"] ?? 3;
  if (a.via === "gdelt") return 4;
  return 5;
}

/* ---------------- Regroupement ---------------- */
interface Indexed { a: RawArticle; toks: Set<string>; strong: Set<string> }

export function cluster(articles: RawArticle[], rep: Reporter): Cluster[] {
  rep.stage("recoupement:clusters", articles.length);
  const sorted = [...articles].sort((x, y) => priority(x) - priority(y));
  const indexed: Indexed[] = sorted.map((a) => ({ a, toks: new Set(tokens(a.title)), strong: new Set(strongTerms(a.title).map(fold)) }));
  const clusters: Array<{ lead: Indexed; members: Indexed[]; toks: Set<string>; strong: Set<string> }> = [];
  const index = new Map<string, number[]>(); // jeton → clusters

  let tooShort = 0;
  for (const it of indexed) {
    if (it.toks.size < 2) { tooShort++; rep.reject("recoupement", it.a.title, it.a.url, "titre trop court pour etre recoupe"); continue; }
    const candidates = new Set<number>();
    for (const t of it.toks) for (const c of index.get(t) ?? []) candidates.add(c);
    let best: number | null = null, bestScore = 0;
    for (const ci of candidates) {
      const c = clusters[ci]!;
      const sameLang = c.lead.a.lang && it.a.lang && c.lead.a.lang === it.a.lang;
      const j = jaccard(it.toks, c.toks);
      const s = sharedCount(it.strong, c.strong);
      const ok = sameLang ? j >= 0.4 || (s >= 2 && j >= 0.15) : s >= 2 && (j >= 0.1 || it.strong.size >= 3);
      const score = j + s * 0.2;
      if (ok && score > bestScore) { best = ci; bestScore = score; }
    }
    if (best == null) {
      const ci = clusters.length;
      clusters.push({ lead: it, members: [it], toks: new Set(it.toks), strong: new Set(it.strong) });
      for (const t of it.toks) { const arr = index.get(t) ?? []; arr.push(ci); index.set(t, arr); }
    } else {
      const c = clusters[best]!;
      c.members.push(it);
      for (const t of it.toks) if (!c.toks.has(t)) { c.toks.add(t); const arr = index.get(t) ?? []; arr.push(best); index.set(t, arr); }
      for (const s of it.strong) c.strong.add(s);
    }
  }
  if (tooShort) rep.note(`${tooShort} titres trop courts pour être recoupés`);
  const out: Cluster[] = clusters.map((c) => ({
    id: stableId(c.lead.a.url),
    lead: c.lead.a,
    members: c.members.map((m) => m.a),
    strong: strongTerms(c.lead.a.title),
  }));
  rep.endStage(out.length);
  return out;
}

/* ---------------- Preuves ---------------- */
function sourceRef(a: RawArticle, owner: string): SourceRef {
  return { titre: a.title, url: a.url, media: a.feedName ?? mediaNameFor(a.domain), pays: a.country, langue: a.lang, date: a.publishedAt, proprietaire: owner, via: a.via };
}

export function computeEvidence(c: Cluster, extra: RawArticle[], gdeltInterroge: boolean, factcheck: Evidence["factcheck"], query: string | null): Evidence {
  const pool = [...c.members, ...extra];
  const titles = pool.map((a) => a.title);
  const owners = new Map<string, RawArticle>();
  let aggregators = 0, reprints = 0;
  for (const a of pool) {
    if (a.via === "social") continue; // jamais une source
    if (isAggregator(a.domain)) { aggregators++; continue; }
    let owner = ownerOf(a.domain);
    const agency = agencyReprint(a.title, a.summary, titles.filter((t) => t !== a.title));
    if (agency && agency !== owner) { owner = agency; reprints++; }
    if (!owners.has(owner)) owners.set(owner, a);
  }
  const countries = new Set<string>();
  for (const a of owners.values()) if (a.country) countries.add(a.country);

  // Source primaire : domaine institutionnel / revue / DOI dans les textes, ou flux institutionnel.
  let primaire: Evidence["source_primaire"] = null;
  for (const a of pool) {
    const p = primarySourceFor(a.domain);
    if (p) { primaire = { type: p.type, nom: a.feedName ?? p.nom, url: a.url }; break; }
    if (a.feedKind === "institution") { primaire = { type: "institution", nom: a.feedName ?? mediaNameFor(a.domain), url: a.url }; break; }
    const doi = DOI_RE.exec(`${a.summary ?? ""}`);
    if (doi) { primaire = { type: "etude", nom: `DOI ${doi[0]}`, url: `https://doi.org/${doi[0]}` }; break; }
  }

  const n = owners.size, p = countries.size;
  let niveau: Level = "insuffisant";
  if (n >= 3 && p >= 2 && !factcheck.dementi) niveau = "bien_corrobore";
  const plafonne = !factcheck.interroge;
  if (n >= 5 && p >= 3 && !factcheck.dementi && primaire && factcheck.interroge) niveau = "confirme";
  if (factcheck.dementi) niveau = "insuffisant";

  const sources = [...owners.entries()].map(([o, a]) => sourceRef(a, o));
  if (primaire) {
    const i = sources.findIndex((s) => s.url === primaire!.url);
    if (i > 0) { const [s] = sources.splice(i, 1); sources.unshift(s!); }
  }
  return {
    niveau, redactions_independantes: n, pays: p, sources,
    source_primaire: primaire, factcheck, calcule_le: new Date().toISOString(),
    details: { proprietaires: [...owners.keys()], pays_liste: [...countries], agregateurs_ecartes: aggregators, reprises_agence: reprints, requete_recoupement: query, gdelt_interroge: gdeltInterroge, plafonne_sans_factcheck: plafonne && n >= 5 && p >= 3 && !!primaire },
  };
}

const EMPTY_FC: Evidence["factcheck"] = { interroge: false, resultats: [], dementi: false };

/** Passe 1 : preuves locales (membres du cluster seulement). */
export function localEvidence(clusters: Cluster[], rep: Reporter): void {
  rep.stage("recoupement:local", clusters.length);
  let ok = 0;
  for (const c of clusters) {
    c.evidence = computeEvidence(c, [], false, EMPTY_FC, null);
    if (c.evidence.niveau !== "insuffisant") ok++;
  }
  rep.note(`${ok} clusters déjà « Bien corroboré » ou mieux sur les seules sources directes`);
  rep.endStage(ok);
}

/** Termes de requête pour retrouver le même événement ailleurs : termes forts, sinon jetons les plus longs. */
export function corroborationTerms(c: Cluster): string[] {
  const strong = c.strong.filter((s) => s.length >= 3);
  if (strong.length >= 2) return strong.slice(0, 3);
  const toks = [...new Set(tokens(c.lead.title))].sort((a, b) => b.length - a.length);
  return [...strong, ...toks].slice(0, 3);
}

/** Passe 2 : GDELT ciblé + fact-check pour les clusters qualifiés. */
export async function deepCorroborate(clusters: Cluster[], rep: Reporter, gdeltEnabled: boolean, maxGdelt: number, reserveAfterMs = 0): Promise<void> {
  rep.stage("recoupement:gdelt", clusters.length);
  if (!env.factcheckKey) rep.note("GOOGLE_FACTCHECK_API_KEY absente : fact-check non interrogé, niveau plafonné à « Bien corroboré »");
  let calls = 0, boosted = 0, unavailable = 0;
  for (const c of clusters) {
    // Travail restant : les requêtes de recoupement encore permises, puis l'édition et la traduction.
    setGdeltReserve(Math.max(0, maxGdelt - calls - 1) * GDELT_MIN_GAP_MS + reserveAfterMs);
    const terms = corroborationTerms(c);
    let extra: RawArticle[] = [];
    let interroge = false;
    let query: string | null = null;
    if (gdeltEnabled && calls < maxGdelt && terms.length >= 2) {
      query = termsQuery(terms);
      calls++;
      const res = await gdeltQuery(query, { timespan: "72h", maxrecords: 100, sort: "hybridrel" });
      if (res === null) unavailable++;
      else {
        interroge = true;
        const leadStrong = c.strong.map(fold);
        const leadToks = tokens(c.lead.title);
        const known = new Set(c.members.map((m) => m.url));
        for (const g of res) {
          const a = toRawArticle(g);
          if (!a || known.has(a.url)) continue;
          const t = fold(a.title);
          const shares = leadStrong.some((s) => t.includes(s)) || jaccard(tokens(a.title), leadToks) >= 0.25;
          if (!shares) continue;
          extra.push(a);
        }
      }
    }
    const before = c.evidence?.redactions_independantes ?? 0;
    // Fact-check : mêmes termes, langue d'origine + anglais.
    const langs = ["en"]; if (c.lead.lang && c.lead.lang !== "en") langs.unshift(c.lead.lang);
    const fc = await searchFactChecks(terms.join(" "), langs, c.lead.title);
    const factcheck: Evidence["factcheck"] = { interroge: fc.interroge, resultats: fc.hits, dementi: fc.hits.some((h) => h.dementi) };
    c.evidence = computeEvidence(c, extra, interroge, factcheck, query);
    if (c.evidence.redactions_independantes > before) boosted++;
    if (factcheck.dementi) rep.reject("recoupement", c.lead.title, c.lead.url, `dementi fact-check : ${fc.hits.find((h) => h.dementi)?.url ?? "?"}`);
  }
  rep.note(`${calls} requêtes GDELT de recoupement (${unavailable} sans réponse), ${boosted} clusters renforcés`);
  noteRateLimit(rep);
  rep.endStage(clusters.filter((c) => c.evidence && c.evidence.niveau !== "insuffisant").length);
}
