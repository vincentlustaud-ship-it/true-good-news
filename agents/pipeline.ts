/**
 * Orchestration des cinq agents. Écrit `candidates/YYYY-MM-DD` et `reports/YYYY-MM-DD`.
 * Ne publie jamais : la publication est un acte humain dans /admin.
 */
import { harvest, type HarvestOptions } from "./harvest.ts";
import { cluster, localEvidence, deepCorroborate } from "./corroborate.ts";
import { qualify } from "./qualify.ts";
import { select } from "./edit.ts";
import { translateAndEnrich } from "./translate.ts";
import { Reporter } from "./report.ts";
import { storage, readOnly, type KV } from "../lib/storage.ts";
import { addDays } from "../lib/dates.ts";
import { setGdeltDeadline, GDELT_MIN_GAP_MS } from "../lib/gdelt.ts";
import type { CandidatesFile, Cluster, RawArticle, RecentTopic, Report, RunStats } from "./types.ts";

export interface PipelineOptions extends HarvestOptions {
  dryRun?: boolean;
  /** Réutilise une collecte brute fournie (rejeu hors ligne). */
  rawArticles?: RawArticle[];
  /** Nombre maximal de requêtes GDELT de recoupement (5 s chacune). */
  maxGdeltCorroboration?: number;
  /** Nombre maximal d'appels LLM. */
  maxLlmCalls?: number;
  /** Mode développement : saute la qualification (dry-run uniquement, jamais écrit). */
  skipQualify?: boolean;
  /**
   * Instant de coupure de l'exécution, en millisecondes epoch (fonction d'arrière-plan Netlify).
   * Absent = aucune limite de durée, le budget d'attente GDELT retombe sur son pool de repli.
   */
  deadlineAt?: number;
  onRaw?: (articles: RawArticle[]) => Promise<void> | void;
}

export interface PipelineResult { report: Report; candidates: CandidatesFile | null; written: boolean }

/* Estimations pessimistes du travail restant, pour décider si une attente de reprise GDELT tient
 * avant la coupure. Volontairement hautes : les sous-estimer ferait dépasser la limite, les
 * surestimer ne coûte que des reprises refusées. Elles sont recalculées à chaque requête par les
 * agents, à partir du nombre de requêtes qu'il leur reste. */
const QUALIFY_CONCURRENCY = 8;
const QUALIFY_PER_CALL_MS = 10_000;  // borne haute observée pour un appel de qualification
const TAIL_MS = 45_000;              // édition, traduction, Open Graph, écriture du stockage
function qualifyReserveMs(maxCalls: number): number {
  return Math.ceil(maxCalls / QUALIFY_CONCURRENCY) * QUALIFY_PER_CALL_MS;
}

export async function runPipeline(opts: PipelineOptions): Promise<PipelineResult> {
  const rep = new Reporter(opts.date, !!opts.dryRun);
  const kv: KV = opts.dryRun ? readOnly(storage()) : storage();
  if (opts.skipQualify && !opts.dryRun) throw new Error("--skip-qualify n'est autorisé qu'avec --dry-run");

  // Budget d'attente GDELT : adossé à la coupure réelle de la fonction, pas à un forfait.
  const maxCorro = opts.maxGdeltCorroboration ?? 45;
  const corroborationReserveMs = maxCorro * GDELT_MIN_GAP_MS;
  const qualifyMs = opts.skipQualify ? 0 : qualifyReserveMs(opts.maxLlmCalls ?? 150);
  setGdeltDeadline(opts.deadlineAt ?? null);
  if (opts.deadlineAt) {
    rep.alert(`Coupure de l'exécution prévue dans ${Math.round((opts.deadlineAt - Date.now()) / 1000)} s ; le budget d'attente GDELT s'y adosse.`);
  }

  // 1. Collecte
  let articles: RawArticle[];
  let feedsOk = 0, feedsFailed = 0, gdeltOk = false;
  if (opts.rawArticles) {
    articles = opts.rawArticles;
    rep.stage("collecte:rejeu", articles.length); rep.note("collecte rejouée depuis un fichier"); rep.endStage(articles.length);
    gdeltOk = articles.some((a) => a.via === "gdelt");
  } else {
    // Après la collecte restent la qualification, le recoupement GDELT, puis l'édition et la traduction.
    const h = await harvest({ ...opts, reserveAfterMs: qualifyMs + corroborationReserveMs + TAIL_MS }, rep);
    articles = h.articles; feedsOk = h.feedsOk; feedsFailed = h.feedsFailed; gdeltOk = h.gdeltOk;
    if (opts.onRaw) await opts.onRaw(articles);
  }
  const countries = new Set(articles.map((a) => a.country).filter(Boolean));
  const languages = new Set(articles.map((a) => a.lang).filter(Boolean));

  // 2. Recoupement, passe locale
  const clusters = cluster(articles, rep);
  localEvidence(clusters, rep);

  // Priorité pour la qualification : clusters déjà multi-sources, puis flux institutionnels / de solutions,
  // puis le reste par taille. Le budget d'appels LLM borne la liste.
  const prio = (c: Cluster) => {
    const ev = c.evidence!;
    let s = ev.redactions_independantes * 10 + ev.pays * 5;
    if (c.lead.feedKind === "institution") s += 30;
    if (c.lead.feedKind === "solutions") s += 25;
    if (c.lead.via === "social") s += 5;
    return s;
  };
  const ordered = [...clusters].sort((a, b) => prio(b) - prio(a));

  // 3. Qualification (charte)
  let accepted: Cluster[];
  if (opts.skipQualify) {
    rep.stage("qualification", ordered.length);
    rep.alert("MODE DÉVELOPPEMENT : qualification sautée, rien ne peut être proposé ni publié.");
    for (const c of ordered.slice(0, 40)) c.qualification = { universelle: true, bonne_nouvelle: true, categorie: "Société", raison_courte: "(non qualifiée : mode développement)", exclusions_declenchees: [], doute: false, pays_cites: [], modele: "aucun", evalue_le: new Date().toISOString(), erreur: "skip-qualify" };
    accepted = ordered.slice(0, 40);
    rep.endStage(accepted.length);
  } else {
    const q = await qualify(ordered, rep, { maxCalls: opts.maxLlmCalls ?? 150 });
    if (!q.ok) {
      const report = rep.finish();
      if (!opts.dryRun) await kv.setJSON("reports", opts.date, report);
      return { report, candidates: null, written: !opts.dryRun };
    }
    accepted = ordered.filter((c) => c.qualification && c.qualification.universelle && c.qualification.bonne_nouvelle && !c.qualification.doute && c.qualification.categorie);
  }

  // 4. Recoupement, passe GDELT ciblée + fact-check (sur les qualifiées seulement)
  await deepCorroborate(accepted, rep, gdeltOk && !opts.skipGdelt, maxCorro, TAIL_MS);

  // 5. Édition : 10 candidates, diversité, anti-répétition 14 jours
  const recentAll = (await kv.getJSON<RecentTopic[]>("state", "recent-topics")) ?? [];
  const floor = addDays(opts.date, -14);
  const recent = recentAll.filter((r) => r.date >= floor);
  const chosen = select(accepted, recent, rep, 10);

  // 6. Traduction + Open Graph sur les 10 retenues
  const stories = await translateAndEnrich(chosen, rep);

  const stats: RunStats = {
    analysees: articles.length, pays: countries.size, langues: languages.size,
    flux_ok: feedsOk, flux_echec: feedsFailed, gdelt_ok: gdeltOk,
    clusters: clusters.length, corroborees: accepted.filter((c) => c.evidence!.niveau !== "insuffisant").length,
    qualifiees: accepted.length,
  };
  rep.setStats(stats);
  for (const s of stories) rep.addCandidate({ id: s.id, title: s.fr?.title ?? s.original.title, niveau: s.evidence.niveau, categorie: s.category, media: s.media.name });
  const report = rep.finish();
  const candidates: CandidatesFile = { date: opts.date, generatedAt: report.finishedAt!, stats, alerts: report.alerts, candidates: stories };

  if (!opts.dryRun) {
    await kv.setJSON("candidates", opts.date, candidates);
    await kv.setJSON("reports", opts.date, report);
  }
  return { report, candidates, written: !opts.dryRun };
}
