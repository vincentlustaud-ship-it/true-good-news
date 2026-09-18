/**
 * Agent 4 — TRADUCTION + MÉTADONNÉES.
 * DeepL FR/EN sur le titre et le résumé court réellement récupérés ; Open Graph (image en lien direct,
 * description) si robots.txt l'autorise. Sans DeepL : texte d'origine, mention explicite, lien de traduction externe.
 */
import { deeplTranslate } from "../lib/deepl.ts";
import { fetchOpenGraph } from "../lib/og.ts";
import { mapLimit } from "../lib/http.ts";
import { env } from "../lib/env.ts";
import { fingerprint, stableId, truncate } from "../lib/text.ts";
import { mediaCountryFor, mediaNameFor } from "../lib/domains.ts";
import type { Cluster, LocalizedText, Story } from "./types.ts";
import type { Reporter } from "./report.ts";

function pickOriginal(c: Cluster): { title: string; summary: string | null } {
  const lead = c.lead;
  const summary = lead.summary ?? c.members.find((m) => m.summary)?.summary ?? null;
  return { title: lead.title, summary };
}

export async function translateAndEnrich(clusters: Cluster[], rep: Reporter): Promise<Story[]> {
  rep.stage("traduction", clusters.length);
  const hasDeepl = !!env.deeplKey;
  if (!hasDeepl) rep.note("DEEPL_API_KEY absente : contenu en langue d'origine, lien de traduction externe");
  let translated = 0, ogOk = 0, robots = 0;

  const stories = await mapLimit(clusters, 4, async (c): Promise<Story> => {
    const orig = pickOriginal(c);
    let summary = orig.summary;
    let image: Story["image"] = null;
    let imageStatus: Story["imageStatus"] = "non_verifie";
    let lang = c.lead.lang;

    // Open Graph : une seule lecture de la page, uniquement si robots.txt l'autorise.
    const { og, robotsBlocked } = await fetchOpenGraph(c.lead.url);
    if (robotsBlocked) { imageStatus = "robots"; robots++; }
    else if (og) {
      ogOk++;
      if (og.image) { image = { url: og.image, source: "og" }; imageStatus = "ok"; } else imageStatus = "absent";
      if (!summary && og.description) summary = og.description;
      if (!lang && og.lang) lang = og.lang;
    } else imageStatus = "absent";
    if (!image && c.lead.image) { image = { url: c.lead.image, source: "rss" }; imageStatus = "ok"; }
    if (summary) summary = truncate(summary, 420);

    const original = { title: orig.title, summary, lang, url: c.lead.url };
    let fr: LocalizedText | null = null, en: LocalizedText | null = null;
    let provider: Story["translation"]["provider"] = null;
    let note: string | null = null;
    if (lang === "fr") fr = { title: original.title, summary, machine: false };
    if (lang === "en") en = { title: original.title, summary, machine: false };
    const texts = [original.title, ...(summary ? [summary] : [])];
    const need: Array<"fr" | "en"> = (["fr", "en"] as const).filter((t) => (t === "fr" ? !fr : !en));
    if (hasDeepl && need.length) {
      for (const target of need) {
        const r = await deeplTranslate(texts, target, lang);
        if (!r) { note = "traduction indisponible (DeepL en échec)"; continue; }
        const lt: LocalizedText = { title: r.texts[0]!, summary: summary ? r.texts[1] ?? null : null, machine: true };
        if (target === "fr") fr = lt; else en = lt;
        provider = "deepl";
        if (!original.lang && r.detected) original.lang = r.detected;
      }
      if (provider) translated++;
    } else if (need.length) note = "traduction indisponible (clé DeepL absente)";

    const q = c.qualification!;
    const media = { name: c.lead.feedName ?? mediaNameFor(c.lead.domain), domain: c.lead.domain, country: c.lead.country ?? mediaCountryFor(c.lead.domain) };
    return {
      id: stableId(c.lead.url),
      category: q.categorie!,
      original, fr, en,
      translation: { provider, note },
      media,
      publishedAt: c.lead.publishedAt,
      image, imageStatus,
      places: q.pays_cites,
      evidence: c.evidence!,
      qualification: q,
      fingerprint: fingerprint(en?.title ?? original.title),
    };
  });
  rep.note(`${ogOk} pages Open Graph lues, ${robots} refusées par robots.txt, ${translated} nouvelles traduites`);
  rep.endStage(stories.length);
  return stories;
}
