/** Google Fact Check Tools (FIABILITE.md). Sans clé : non interrogé, et le niveau reste plafonné à « Bien corroboré ». */
import { env } from "./env.ts";
import { fetchJSON } from "./http.ts";
import { fold, sharedCount, tokens } from "./text.ts";
import type { FactCheckHit } from "../agents/types.ts";

interface ClaimReview { url?: string; title?: string; textualRating?: string; languageCode?: string; reviewDate?: string; publisher?: { name?: string; site?: string } }
interface Claim { text?: string; claimant?: string; claimDate?: string; claimReview?: ClaimReview[] }

/** Verdicts qui valent démenti (False, Misleading, Altered, Fabricated) et leurs équivalents usuels. */
const DENY = ["false", "faux", "fausse", "falso", "falsa", "falsch", "fake", "misleading", "trompeur", "trompeuse", "engañoso", "enganoso", "irreführend", "altered", "manipulé", "manipulated", "manipulado", "fabricated", "fabriqué", "fabricado", "inventé", "pants on fire", "incorrect", "inexact", "erroné", "mostly false", "plutôt faux", "mayormente falso", "ложь", "неправда", "假", "虚假", "誤り", "デマ", "झूठ"];

export function isDenial(rating: string): boolean {
  const r = fold(rating);
  if (/\b(true|vrai|verdadero|verdadeiro|wahr|correct|exact)\b/.test(r) && !/\b(not|pas|no|nicht|mostly false|partly|partiellement|half)\b/.test(r)) return false;
  return DENY.some((d) => r.includes(fold(d)));
}

export async function searchFactChecks(query: string, langs: string[], referenceTitle: string): Promise<{ interroge: boolean; hits: FactCheckHit[] }> {
  const key = env.factcheckKey;
  if (!key) return { interroge: false, hits: [] };
  const refTokens = tokens(referenceTitle);
  const hits: FactCheckHit[] = [];
  const seen = new Set<string>();
  let interroge = false;
  for (const lang of [...new Set(langs)]) {
    const p = new URLSearchParams({ query, languageCode: lang, pageSize: "10", key });
    const j = await fetchJSON<{ claims?: Claim[] }>(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${p}`, { timeoutMs: 8_000 });
    if (!j) continue;
    interroge = true;
    for (const c of j.claims ?? []) {
      // Pertinence : l'affirmation vérifiée doit partager au moins deux jetons avec le titre évalué.
      const claimText = c.text ?? "";
      if (sharedCount(tokens(claimText), refTokens) < 2) continue;
      for (const r of c.claimReview ?? []) {
        if (!r.url || seen.has(r.url)) continue;
        seen.add(r.url);
        const verdict = r.textualRating ?? "";
        hits.push({ texte: claimText.slice(0, 300), verdict, verificateur: r.publisher?.name ?? r.publisher?.site ?? "?", url: r.url, langue: r.languageCode ?? null, date: r.reviewDate ?? null, dementi: isDenial(verdict) });
      }
    }
  }
  return { interroge, hits };
}
