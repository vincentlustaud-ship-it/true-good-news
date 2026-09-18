/** Lecture d'un flux RSS / Atom / RDF : titre, lien, résumé court, date, image déclarée. Rien d'autre. */
import { XMLParser } from "fast-xml-parser";
import { fetchText } from "./http.ts";
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

export async function readFeed(feed: FeedDef): Promise<{ items: RawArticle[]; error: string | null }> {
  const xml = await fetchText(feed.url, { timeoutMs: 12_000, maxBytes: 3_000_000, accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" });
  if (xml == null) return { items: [], error: "pas de réponse" };
  let parsed: Any;
  try { parsed = parser.parse(xml) as Any; } catch { return { items: [], error: "XML illisible" }; }
  const rss = parsed.rss as Any | undefined;
  const channel = rss?.channel as Any | undefined;
  const feedNode = parsed.feed as Any | undefined;
  const rdf = parsed["rdf:RDF"] as Any | undefined;
  let raw: unknown = channel?.item ?? feedNode?.entry ?? rdf?.item;
  if (!raw) return { items: [], error: "aucun élément" };
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
  return { items, error: null };
}
