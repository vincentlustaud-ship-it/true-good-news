import type { Config } from "@netlify/functions";
import { json, error } from "../../lib/functions.ts";
import { isAdmin } from "../../lib/auth.ts";
import { storage } from "../../lib/storage.ts";
import { isIsoDate, parisDate } from "../../lib/dates.ts";
import { getPublished, publishedDates } from "../../lib/publish.ts";
import type { CandidatesFile, Report } from "../../agents/types.ts";

/** GET /api/admin/candidates?date= — candidates du jour (ou dernière journée disponible), rapport, publication éventuelle. */
export default async (req: Request) => {
  if (!isAdmin(req)) return error(401, "non authentifié");
  if (req.method !== "GET") return error(405, "GET uniquement");
  const url = new URL(req.url);
  const wanted = url.searchParams.get("date");
  if (wanted && !isIsoDate(wanted)) return error(400, "date invalide");
  const kv = storage();
  const candidateDates = await kv.list("candidates");
  const reportDates = await kv.list("reports");
  const today = parisDate();
  const date = wanted ?? (candidateDates.includes(today) ? today : candidateDates[candidateDates.length - 1] ?? today);
  const [candidates, report, published, pubDates] = await Promise.all([
    kv.getJSON<CandidatesFile>("candidates", date),
    kv.getJSON<Report>("reports", date),
    getPublished(date),
    publishedDates(),
  ]);
  return json({ date, today, candidates, report, published, candidateDates: candidateDates.slice(-30), publishedDates: pubDates.slice(-30), reportDates: reportDates.slice(-30) });
};

export const config: Config = { path: "/api/admin/candidates" };
