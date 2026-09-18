import type { Config, Context } from "@netlify/functions";
import { json, error, readJson, clientIp } from "../../lib/functions.ts";
import { rateLimited } from "../../lib/auth.ts";
import { env } from "../../lib/env.ts";
import { createPending, validEmail } from "../../lib/subscribers.ts";
import { renderConfirmEmail, sendMails } from "../../lib/email.ts";

/** POST /api/subscribe {email, lang} — double opt-in : envoie le mail de confirmation. Réponse volontairement générique. */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return error(405, "POST uniquement");
  if (!env.resendKey) return error(503, "abonnement indisponible pour le moment");
  if (rateLimited("subscribe:" + clientIp(req, context), 5, 10 * 60_000)) return error(429, "trop de tentatives, réessayez plus tard");
  const body = await readJson<{ email?: unknown; lang?: unknown }>(req);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const lang = body?.lang === "en" ? "en" : "fr";
  if (!validEmail(email)) return error(400, "adresse invalide");
  const sub = await createPending(email, lang);
  if (sub) {
    const confirmUrl = `${env.siteUrl}/api/confirm?token=${encodeURIComponent(sub.confirmToken!)}`;
    const mail = renderConfirmEmail(lang, confirmUrl);
    const r = await sendMails([{ to: sub.email, ...mail }]);
    if (r.failed) return error(503, "envoi impossible pour le moment");
  }
  return json({ ok: true });
};

export const config: Config = { path: "/api/subscribe" };
