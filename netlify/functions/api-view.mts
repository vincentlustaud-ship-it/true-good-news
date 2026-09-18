import type { Config, Context } from "@netlify/functions";
import { json, error, readJson, clientIp } from "../../lib/functions.ts";
import { rateLimited } from "../../lib/auth.ts";
import { storage } from "../../lib/storage.ts";

/** POST /api/view {ids: [...]} — compteur d'affichages. Pas d'IP stockée, pas de cookie : la limite de débit est en mémoire seulement. */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return error(405, "POST uniquement");
  if (rateLimited("view:" + clientIp(req, context), 30, 10 * 60_000)) return json({ ok: true, limited: true });
  const body = await readJson<{ ids?: unknown }>(req);
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string" && /^[0-9a-f]{16}$/.test(x)).slice(0, 10) : [];
  const kv = storage();
  await Promise.all(ids.map(async (id) => {
    const n = (await kv.getJSON<number>("views", id)) ?? 0;
    await kv.setJSON("views", id, n + 1);
  }));
  return json({ ok: true });
};

export const config: Config = { path: "/api/view" };
