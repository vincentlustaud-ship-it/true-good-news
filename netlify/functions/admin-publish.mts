import type { Config } from "@netlify/functions";
import { json, error, readJson, triggerBackground } from "../../lib/functions.ts";
import { isAdmin } from "../../lib/auth.ts";
import { storage } from "../../lib/storage.ts";
import { isIsoDate } from "../../lib/dates.ts";
import { getPublished, writePublished } from "../../lib/publish.ts";
import type { CandidatesFile, PublishedFile } from "../../agents/types.ts";

/**
 * POST /api/admin/publish {date, ids: [5], replace?: boolean}
 * Seule voie vers `published`. Le serveur ne fait confiance à aucun paramètre client : les ids doivent
 * appartenir aux candidates de la journée, et il en faut exactement 5.
 */
export default async (req: Request) => {
  if (!isAdmin(req)) return error(401, "non authentifié");
  if (req.method !== "POST") return error(405, "POST uniquement");
  const body = await readJson<{ date?: unknown; ids?: unknown; replace?: unknown }>(req);
  const date = typeof body?.date === "string" ? body.date : "";
  if (!isIsoDate(date)) return error(400, "date invalide");
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string") : [];
  if (new Set(ids).size !== 5 || ids.length !== 5) return error(400, "il faut exactement 5 candidates distinctes");
  const kv = storage();
  const file = await kv.getJSON<CandidatesFile>("candidates", date);
  if (!file) return error(404, "aucune candidate pour cette date");
  const byId = new Map(file.candidates.map((c) => [c.id, c]));
  const stories = ids.map((id) => byId.get(id));
  if (stories.some((s) => !s)) return error(400, "une des candidates n'appartient pas à cette journée");
  const existing = await getPublished(date);
  if (existing && body?.replace !== true) return error(409, "cette journée est déjà publiée");
  const published: PublishedFile = { date, publishedAt: new Date().toISOString(), stats: file.stats, stories: stories as PublishedFile["stories"] };
  // Conserve les corrections déjà ajoutées si l'on remplace une publication.
  if (existing) for (const s of published.stories) { const prev = existing.stories.find((p) => p.id === s.id); if (prev?.corrections) s.corrections = prev.corrections; }
  await writePublished(published);
  const email = existing ? { ok: false, status: 0, skipped: true } : { ...(await triggerBackground("daily-email-background", "email", { date })), skipped: false };
  if (!existing && !email.ok) await kv.setJSON("state", "email-pending", { date, since: new Date().toISOString() });
  return json({ ok: true, date, published: published.stories.length, email });
};

export const config: Config = { path: "/api/admin/publish" };
