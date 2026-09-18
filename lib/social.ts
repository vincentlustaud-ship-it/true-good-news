/**
 * Réseaux sociaux : repérage uniquement (SOURCES.md). On n'en tire que des liens vers des articles,
 * jamais une source ni un contenu. Bluesky et Mastodon : API publiques. Reddit : seulement avec
 * des identifiants d'application ; sinon ignoré et consigné.
 */
import { env, USER_AGENT } from "./env.ts";
import { fetchJSON } from "./http.ts";
import { domainOf, stripHtml, truncate } from "./text.ts";
import { isAggregator } from "./domains.ts";

export interface Spotted { url: string; title: string | null; description: string | null; image: string | null; spottedOn: "bluesky" | "mastodon" | "reddit" }

const SOCIAL_HOSTS = ["bsky.app", "mastodon.social", "reddit.com", "redd.it", "twitter.com", "x.com", "facebook.com", "instagram.com", "youtube.com", "youtu.be", "tiktok.com", "t.co", "threads.net", "linkedin.com"];
function usable(url: string | undefined | null): url is string {
  if (!url || !/^https:\/\//.test(url)) return false;
  const d = domainOf(url);
  if (!d) return false;
  if (SOCIAL_HOSTS.some((h) => d === h || d.endsWith("." + h))) return false;
  if (isAggregator(d)) return false;
  return true;
}

interface BskyPost { record?: { text?: string; facets?: Array<{ features?: Array<{ $type?: string; uri?: string }> }> }; embed?: { $type?: string; external?: { uri?: string; title?: string; description?: string; thumb?: string } } }

/**
 * Recherche Bluesky : `app.bsky.feed.searchPosts` n'est plus ouverte sans authentification.
 * Vérifié le 18 septembre 2026 : l'hôte public répond bien (`app.bsky.actor.getProfile` → 200) mais
 * la recherche renvoie 403, et la même requête sur `bsky.social` répond `AuthMissing`. On passe donc
 * par un mot de passe d'application, gratuit, comme pour Reddit. Sans identifiants, Bluesky est
 * ignoré et consigné — jamais présenté comme une panne réseau.
 */
async function blueskyToken(notes: string[]): Promise<string | null> {
  const id = env.blueskyIdentifier, pw = env.blueskyAppPassword;
  if (!id || !pw) { notes.push("Bluesky : ignoré (BLUESKY_IDENTIFIER / BLUESKY_APP_PASSWORD absents ; la recherche de posts n'est plus ouverte sans authentification)"); return null; }
  try {
    const res = await fetch("https://bsky.social/xrpc/com.atproto.server.createSession", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ identifier: id, password: pw }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { notes.push(`Bluesky : authentification refusée (${res.status})`); return null; }
    const { accessJwt } = (await res.json()) as { accessJwt?: string };
    if (!accessJwt) { notes.push("Bluesky : jeton absent de la réponse d'authentification"); return null; }
    return accessJwt;
  } catch (e) {
    notes.push(`Bluesky : authentification impossible (${(e as Error).name})`);
    return null;
  }
}

export async function spotBluesky(queries: string[], notes: string[]): Promise<Spotted[]> {
  const out: Spotted[] = [];
  const token = await blueskyToken(notes);
  if (!token) return out;
  for (const q of queries) {
    const p = new URLSearchParams({ q, limit: "50", sort: "latest" });
    const j = await fetchJSON<{ posts?: BskyPost[] }>(`https://bsky.social/xrpc/app.bsky.feed.searchPosts?${p}`, { timeoutMs: 10_000, headers: { Authorization: `Bearer ${token}` } });
    if (!j) { notes.push(`Bluesky : pas de réponse pour « ${q} »`); continue; }
    for (const post of j.posts ?? []) {
      const ext = post.embed?.external;
      if (ext && usable(ext.uri)) out.push({ url: ext.uri, title: ext.title ? truncate(ext.title, 300) : null, description: ext.description ? truncate(ext.description, 600) : null, image: ext.thumb && /^https:\/\//.test(ext.thumb) ? null : null, spottedOn: "bluesky" });
      for (const f of post.record?.facets ?? []) for (const ft of f.features ?? []) if (ft.$type === "app.bsky.richtext.facet#link" && usable(ft.uri)) out.push({ url: ft.uri, title: null, description: null, image: null, spottedOn: "bluesky" });
    }
  }
  return out;
}

interface MastoStatus { content?: string; card?: { url?: string; title?: string; description?: string; image?: string } }

export async function spotMastodon(instance: string, tags: string[], notes: string[]): Promise<Spotted[]> {
  const out: Spotted[] = [];
  for (const tag of tags) {
    const j = await fetchJSON<MastoStatus[]>(`https://${instance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=40`, { timeoutMs: 8_000 });
    if (!j || !Array.isArray(j)) { notes.push(`Mastodon (${instance}) : pas de réponse pour #${tag}`); continue; }
    for (const s of j) {
      if (s.card && usable(s.card.url)) out.push({ url: s.card.url, title: s.card.title ? truncate(s.card.title, 300) : null, description: s.card.description ? truncate(stripHtml(s.card.description), 600) : null, image: null, spottedOn: "mastodon" });
      else if (s.content) {
        for (const m of s.content.matchAll(/href="(https:\/\/[^"]+)"/g)) if (usable(m[1])) out.push({ url: m[1]!, title: null, description: null, image: null, spottedOn: "mastodon" });
      }
    }
  }
  return out;
}

export async function spotReddit(subreddits: string[], notes: string[]): Promise<Spotted[]> {
  const id = env.redditClientId, secret = env.redditClientSecret;
  if (!id || !secret) { notes.push("Reddit : ignoré (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET absents)"); return []; }
  const out: Spotted[] = [];
  try {
    const tok = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(8_000),
    });
    if (!tok.ok) { notes.push(`Reddit : authentification refusée (${tok.status})`); return []; }
    const { access_token } = (await tok.json()) as { access_token?: string };
    if (!access_token) return [];
    for (const sub of subreddits) {
      const res = await fetch(`https://oauth.reddit.com/r/${sub}/new?limit=50`, { headers: { Authorization: `Bearer ${access_token}`, "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(8_000) });
      if (!res.ok) { notes.push(`Reddit r/${sub} : ${res.status}`); continue; }
      const j = (await res.json()) as { data?: { children?: Array<{ data?: { url?: string; title?: string } }> } };
      for (const c of j.data?.children ?? []) if (usable(c.data?.url)) out.push({ url: c.data!.url!, title: null, description: null, image: null, spottedOn: "reddit" });
    }
  } catch (e) {
    notes.push(`Reddit : erreur (${(e as Error).message})`);
  }
  return out;
}
