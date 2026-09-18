import type { Config } from "@netlify/functions";
import { json, error } from "../../lib/functions.ts";
import { isIsoDate } from "../../lib/dates.ts";
import { getPublished, publishedDates, neighbours, viewsFor } from "../../lib/publish.ts";

/** GET /api/news?date=YYYY-MM-DD — sert `published` (défaut : dernier jour publié). Public, en lecture. */
export default async (req: Request) => {
  if (req.method !== "GET") return error(405, "GET uniquement");
  const url = new URL(req.url);
  const wanted = url.searchParams.get("date");
  if (wanted && !isIsoDate(wanted)) return error(400, "date invalide");
  const dates = await publishedDates();
  const latest = dates[dates.length - 1] ?? null;
  const date = wanted ?? latest;
  if (!date) return json({ date: null, latest: null, prev: null, next: null, stats: null, stories: [], views: {} }, { headers: { "Cache-Control": "public, max-age=60" } });
  const file = await getPublished(date);
  const nav = neighbours(dates, date);
  if (!file) return json({ date, latest: nav.latest, prev: nav.prev, next: nav.next, stats: null, stories: [], views: {} }, { status: wanted ? 404 : 200, headers: { "Cache-Control": "public, max-age=60" } });
  const views = await viewsFor(file.stories);
  return json({ date: file.date, publishedAt: file.publishedAt, latest: nav.latest, prev: nav.prev, next: nav.next, stats: file.stats, stories: file.stories, views }, { headers: { "Cache-Control": "public, max-age=60" } });
};

export const config: Config = { path: "/api/news" };
