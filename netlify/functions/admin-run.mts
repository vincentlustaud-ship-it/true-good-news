import type { Config } from "@netlify/functions";
import { json, error, readJson, triggerBackground } from "../../lib/functions.ts";
import { isAdmin } from "../../lib/auth.ts";
import { isIsoDate, parisDate } from "../../lib/dates.ts";

/** POST /api/admin/run {date?} — relance le pipeline à la main (fonction d'arrière-plan). */
export default async (req: Request) => {
  if (!isAdmin(req)) return error(401, "non authentifié");
  if (req.method !== "POST") return error(405, "POST uniquement");
  const body = await readJson<{ date?: unknown }>(req);
  const date = typeof body?.date === "string" && isIsoDate(body.date) ? body.date : parisDate();
  const r = await triggerBackground("harvest-background", "harvest", { date });
  if (!r.ok) return error(502, `déclenchement impossible (${r.status})`);
  return json({ ok: true, date }, { status: 202 });
};

export const config: Config = { path: "/api/admin/run" };
