/**
 * Agent 5 — ÉDITION.
 * Sélection des 10 candidates : max 2 par catégorie, max 2 par pays, max 1 par média (propriétaire) ;
 * tri par niveau, puis nombre de pays, puis fraîcheur ; exclusion des sujets publiés sous 14 jours.
 * L'agent propose ; il ne publie jamais.
 */
import { jaccard, sharedCount, fold, fingerprint } from "../lib/text.ts";
import { ownerOf, mediaCountryFor } from "../lib/domains.ts";
import { isAccepted } from "./qualify.ts";
import type { Cluster, RecentTopic } from "./types.ts";
import type { Reporter } from "./report.ts";

const LEVEL_RANK = { confirme: 0, bien_corrobore: 1, insuffisant: 2 } as const;

export function isRepeat(fp: string[], strong: string[], recent: RecentTopic[]): RecentTopic | null {
  const s = strong.map(fold);
  for (const r of recent) {
    if (jaccard(fp, r.fingerprint) >= 0.5) return r;
    if (s.length >= 2 && sharedCount(s, r.fingerprint) >= Math.min(3, s.length)) return r;
  }
  return null;
}

export function select(clusters: Cluster[], recent: RecentTopic[], rep: Reporter, target = 10): Cluster[] {
  rep.stage("edition", clusters.length);
  const eligible: Cluster[] = [];
  for (const c of clusters) {
    if (!isAccepted(c)) continue;
    const ev = c.evidence!;
    if (ev.niveau === "insuffisant") { rep.reject("edition", c.lead.title, c.lead.url, `corroboration insuffisante (${ev.redactions_independantes} redactions, ${ev.pays} pays)`); continue; }
    const rpt = isRepeat(fingerprint(c.lead.title), c.strong, recent);
    if (rpt) { rep.reject("edition", c.lead.title, c.lead.url, `sujet deja publie le ${rpt.date} (${rpt.title.slice(0, 60)})`); continue; }
    eligible.push(c);
  }
  eligible.sort((a, b) => {
    const la = LEVEL_RANK[a.evidence!.niveau], lb = LEVEL_RANK[b.evidence!.niveau];
    if (la !== lb) return la - lb;
    if (a.evidence!.pays !== b.evidence!.pays) return b.evidence!.pays - a.evidence!.pays;
    if (a.evidence!.redactions_independantes !== b.evidence!.redactions_independantes) return b.evidence!.redactions_independantes - a.evidence!.redactions_independantes;
    return (b.lead.publishedAt ?? "").localeCompare(a.lead.publishedAt ?? "");
  });
  const byCat = new Map<string, number>(), byCountry = new Map<string, number>(), byOwner = new Set<string>();
  const chosen: Cluster[] = [];
  const deferred: Cluster[] = [];
  for (const c of eligible) {
    const cat = c.qualification!.categorie!;
    const country = c.lead.country ?? mediaCountryFor(c.lead.domain) ?? "??";
    const owner = ownerOf(c.lead.domain);
    if ((byCat.get(cat) ?? 0) >= 2) { deferred.push(c); rep.reject("edition", c.lead.title, c.lead.url, `diversite : deja 2 en ${cat}`); continue; }
    if ((byCountry.get(country) ?? 0) >= 2) { deferred.push(c); rep.reject("edition", c.lead.title, c.lead.url, `diversite : deja 2 medias de ${country}`); continue; }
    if (byOwner.has(owner)) { deferred.push(c); rep.reject("edition", c.lead.title, c.lead.url, `diversite : media ${owner} deja retenu`); continue; }
    chosen.push(c);
    byCat.set(cat, (byCat.get(cat) ?? 0) + 1);
    byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
    byOwner.add(owner);
    if (chosen.length >= target) break;
  }
  if (chosen.length < target) rep.alert(`Seulement ${chosen.length} candidate(s) éligible(s) sur ${target} attendues.`);
  rep.note(`${eligible.length} éligibles, ${chosen.length} retenues, ${deferred.length} écartées pour diversité`);
  rep.endStage(chosen.length);
  return chosen;
}
