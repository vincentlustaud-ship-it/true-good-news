import type { Config } from "@netlify/functions";
import { json, error, readJson } from "../../lib/functions.ts";
import { isAdmin } from "../../lib/auth.ts";
import { isIsoDate, parisDate } from "../../lib/dates.ts";
import { getPublished } from "../../lib/publish.ts";
import { storage } from "../../lib/storage.ts";

/** POST /api/admin/correction {date, id, texte} — bandeau de correction daté sur une nouvelle publiée. On n'efface jamais. */
export default async (req: Request) => {
  if (!isAdmin(req)) return error(401, "non authentifié");
  if (req.method !== "POST") return error(405, "POST uniquement");
  const body = await readJson<{ date?: unknown; id?: unknown; texte?: unknown }>(req);
  const date = typeof body?.date === "string" ? body.date : "";
  const id = typeof body?.id === "string" ? body.id : "";
  const texte = typeof body?.texte === "string" ? body.texte.trim().slice(0, 1000) : "";
  if (!isIsoDate(date) || !id || !texte) return error(400, "date, id et texte requis");
  const file = await getPublished(date);
  const story = file?.stories.find((s) => s.id === id);
  if (!file || !story) return error(404, "nouvelle introuvable");
  story.corrections = [...(story.corrections ?? []), { date: parisDate(), texte }];
  await storage().setJSON("published", date, file);
  return json({ ok: true, corrections: story.corrections });
};

export const config: Config = { path: "/api/admin/correction" };
