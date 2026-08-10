import type { Config, Context } from "@netlify/functions";
import { XMLParser } from "fast-xml-parser";

// Curated whitelist: real, published journalism dedicated to positive /
// solutions-focused reporting. The filtering happens by SOURCE, not by an
// automated "positivity" classifier on arbitrary news — every item that
// comes out of these feeds was already selected as a good-news story by a
// real newsroom. This is what keeps the app honest: no AI-invented stories,
// no sentiment-guessing on generic wire copy.
const SOURCES = [
  { name: "Positive News", url: "https://www.positive.news/feed/" },
  { name: "Good News Network", url: "https://www.goodnewsnetwork.org/feed/" },
  { name: "Reasons to be Cheerful", url: "https://reasonstobecheerful.world/feed/" },
  { name: "The Optimist Daily", url: "https://www.optimistdaily.com/feed/" },
];

type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

function stripHtml(input: string | undefined): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(source: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "BonnesNouvelles/1.0 (+daily good news digest)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

    return items.map((item: Record<string, unknown>): NewsItem => {
      const title = stripHtml(String(item.title ?? ""));
      const link = String(item.link ?? "");
      const pubDateRaw = String(item.pubDate ?? "");
      const publishedAt = pubDateRaw ? new Date(pubDateRaw).toISOString() : new Date(0).toISOString();
      const rawSummary =
        (item["content:encoded"] as string) ??
        (item.description as string) ??
        "";
      const summary = stripHtml(rawSummary).slice(0, 280);

      return {
        id: link || `${source.name}-${title}`,
        title,
        link,
        source: source.name,
        publishedAt,
        summary,
      };
    });
  } catch {
    return [];
  }
}

export default async (_req: Request, _context: Context) => {
  const results = await Promise.all(SOURCES.map(fetchFeed));
  let items = results.flat().filter((item) => item.title && item.link);

  // Dedup by link
  const seen = new Set<string>();
  items = items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Daily digest: today's items first; widen the window only if there
  // aren't enough to avoid an empty app on quiet news days.
  const now = Date.now();
  const windowsHours = [24, 48, 72];
  let selected: NewsItem[] = [];
  for (const hours of windowsHours) {
    const cutoff = now - hours * 60 * 60 * 1000;
    selected = items.filter((item) => new Date(item.publishedAt).getTime() >= cutoff);
    if (selected.length >= 6) break;
  }
  if (selected.length === 0) selected = items.slice(0, 12);

  return new Response(
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: selected.length,
      items: selected,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=1800",
      },
    },
  );
};

export const config: Config = {
  path: "/api/news",
};
