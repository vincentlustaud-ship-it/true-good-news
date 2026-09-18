/** Métadonnées Open Graph : on ne lit que ce qui sert (titre, description courte, image en lien direct). */
import { fetchHtmlIfAllowed } from "./http.ts";
import { decodeEntities, stripHtml, truncate } from "./text.ts";

export interface OpenGraph { title: string | null; description: string | null; image: string | null; lang: string | null }

function metaContent(html: string, names: string[]): string | null {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
    const m = re.exec(html);
    if (!m) continue;
    const c = /content=["']([^"']*)["']/i.exec(m[0]);
    if (c && c[1]!.trim()) return decodeEntities(c[1]!.trim());
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
    const m2 = re2.exec(html);
    if (m2 && m2[1]!.trim()) return decodeEntities(m2[1]!.trim());
  }
  return null;
}

export function parseOpenGraph(html: string, baseUrl: string): OpenGraph {
  const head = html.slice(0, 200_000);
  let image = metaContent(head, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]);
  if (image) {
    try { image = new URL(image, baseUrl).toString(); } catch { image = null; }
    if (image && !/^https:\/\//.test(image)) image = null; // hotlink en https uniquement (CSP img-src https:)
  }
  const description = metaContent(head, ["og:description", "twitter:description", "description"]);
  const title = metaContent(head, ["og:title", "twitter:title"]) ?? (() => { const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head); return t ? stripHtml(t[1]) : null; })();
  const langM = /<html[^>]+lang=["']([a-zA-Z-]+)["']/i.exec(head) ?? /og:locale["'][^>]+content=["']([a-zA-Z_-]+)/i.exec(head);
  const lang = langM ? langM[1]!.slice(0, 2).toLowerCase() : null;
  return { title: title ? truncate(stripHtml(title), 300) : null, description: description ? truncate(stripHtml(description), 600) : null, image, lang };
}

export async function fetchOpenGraph(url: string): Promise<{ og: OpenGraph | null; robotsBlocked: boolean }> {
  const { html, robotsBlocked } = await fetchHtmlIfAllowed(url);
  if (robotsBlocked) return { og: null, robotsBlocked: true };
  if (!html) return { og: null, robotsBlocked: false };
  return { og: parseOpenGraph(html, url), robotsBlocked: false };
}
