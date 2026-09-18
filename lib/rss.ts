/** Lecture d'un flux RSS / Atom / RDF : titre, lien, résumé court, date, image déclarée. Rien d'autre. */
import { XMLParser } from "fast-xml-parser";
import { fetchDetailed, describeFetchError } from "./http.ts";
import { parseDateLoose } from "./dates.ts";
import { stripHtml, truncate, domainOf } from "./text.ts";
import type { RawArticle, FeedKind } from "../agents/types.ts";

export interface FeedDef { name: string; url: string; lang: string; country: string; kind: FeedKind; owner: string }

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", cdataPropName: "__cdata" });

type Any = Record<string, unknown>;
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") {
    const o = v as Any;
    if (o.__cdata != null) return text(o.__cdata);
    if (o["#text"] != null) return text(o["#text"]);
    if (o["@_href"] != null) return text(o["@_href"]);
  }
  return "";
}

function atomLink(v: unknown): string {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  const alt = arr.find((l) => typeof l === "object" && l && ((l as Any)["@_rel"] === "alternate" || !(l as Any)["@_rel"]));
  return text(alt ?? arr[0]);
}

function imageOf(it: Any): string | null {
  const cands: unknown[] = [it["media:content"], it["media:thumbnail"], it.enclosure];
  for (const c of cands) {
    const arr = Array.isArray(c) ? c : c ? [c] : [];
    for (const e of arr) {
      if (!e || typeof e !== "object") continue;
      const o = e as Any;
      const url = text(o["@_url"]);
      const type = text(o["@_type"]);
      const medium = text(o["@_medium"]);
      if (url && /^https:\/\//.test(url) && (!type || type.startsWith("image/")) && (!medium || medium === "image")) return url;
    }
  }
  return null;
}

/**
 * Un flux plus gros que le plafond est coupé en plein document : le parseur échoue et on perd tout.
 * On recoupe alors au dernier élément complet et on referme le document. Les flux étant
 * antéchronologiques, on conserve les plus récents, c'est-à-dire exactement ce qui nous intéresse.
 */
export function repairTruncatedFeed(xml: string): string | null {
  const closers: Array<[RegExp, string]> = [
    [/<\/item>/g, "</channel></rss>"],
    [/<\/entry>/g, "</feed>"],
  ];
  for (const [re, tail] of closers) {
    let last = -1;
    for (const m of xml.matchAll(re)) last = m.index + m[0].length;
    if (last < 0) continue;
    const head = xml.slice(0, last);
    if (/<rss[\s>]/i.test(head)) return head + "</channel></rss>";
    if (/<feed[\s>]/i.test(head)) return head + "</feed>";
    if (/<rdf:RDF[\s>]/i.test(head)) return head + "</rdf:RDF>";
    return head + tail;
  }
  return null;
}

export interface FeedRead { items: RawArticle[]; error: string | null; diagnostic: Record<string, unknown> | null }

export async function readFeed(feed: FeedDef): Promise<FeedRead> {
  const res = await fetchDetailed(feed.url, { timeoutMs: 15_000, maxBytes: 6_000_000, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" });
  const ctx = { flux: feed.name, url: feed.url, duree_ms: res.ms, octets: res.bytes, statut: res.status, content_type: res.contentType, ...(res.finalUrl && res.finalUrl !== feed.url ? { url_finale: res.finalUrl } : {}) };
  if (res.text == null) {
    return { items: [], error: res.failure?.motif ?? "pas de réponse", diagnostic: { ...ctx, ...(res.failure?.detail ?? {}) } };
  }
  let xml = res.text;
  let repaired = false;
  if (res.truncated) {
    const fixed = repairTruncatedFeed(xml);
    if (fixed == null) return { items: [], error: "corps tronqué et irréparable", diagnostic: { ...ctx, tronque: true } };
    xml = fixed;
    repaired = true;
  }
  let parsed: Any;
  try { parsed = parser.parse(xml) as Any; } catch (e) {
    return { items: [], error: "XML illisible", diagnostic: { ...ctx, tronque: res.truncated, debut: xml.slice(0, 160).replace(/\s+/g, " "), ...describeFetchError(e) } };
  }
  const note = repaired ? { tronque_et_repare: true } : null;
  const rss = parsed.rss as Any | undefined;
  const channel = rss?.channel as Any | undefined;
  const feedNode = parsed.feed as Any | undefined;
  const rdf = parsed["rdf:RDF"] as Any | undefined;
  let raw: unknown = channel?.item ?? feedNode?.entry ?? rdf?.item;
  if (!raw) return { items: [], error: "aucun élément", diagnostic: { ...ctx, debut: xml.slice(0, 160).replace(/\s+/g, " ") } };
  const list = (Array.isArray(raw) ? raw : [raw]) as Any[];
  const items: RawArticle[] = [];
  for (const it of list) {
    const title = truncate(stripHtml(text(it.title)), 300);
    const link = (text(it.link) || atomLink(it.link) || text(it.guid)).trim();
    if (!title || !/^https?:\/\//.test(link)) continue;
    const domain = domainOf(link);
    if (!domain) continue;
    const summaryRaw = text(it.description) || text(it.summary) || text(it["content:encoded"]) || text(it.content);
    const summary = summaryRaw ? truncate(stripHtml(summaryRaw), 600) : null;
    const publishedAt = parseDateLoose(it.pubDate ?? it.published ?? it.updated ?? it["dc:date"]);
    items.push({
      url: link, title, summary: summary || null, domain, lang: feed.lang, country: feed.country, publishedAt,
      image: imageOf(it), via: "rss", feedName: feed.name, feedKind: feed.kind,
    });
  }
  return { items, error: null, diagnostic: note ? { ...ctx, ...note } : null };
}
