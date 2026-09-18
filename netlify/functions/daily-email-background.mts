import { verifyInternal } from "../../lib/auth.ts";
import { readJson } from "../../lib/functions.ts";
import { isIsoDate } from "../../lib/dates.ts";
import { getPublished } from "../../lib/publish.ts";
import { listConfirmed } from "../../lib/subscribers.ts";
import { renderDailyEmail, sendMails } from "../../lib/email.ts";
import { storage } from "../../lib/storage.ts";
import { env } from "../../lib/env.ts";

/** Envoi des 5 retenues aux abonnés confirmés, déclenché à la validation. En échec : retenté au cycle suivant. */
export default async (req: Request) => {
  if (!verifyInternal(req, "email")) return new Response("non autorisé", { status: 401 });
  const body = await readJson<{ date?: unknown }>(req);
  const date = typeof body?.date === "string" && isIsoDate(body.date) ? body.date : null;
  if (!date) return new Response("date requise", { status: 400 });
  const kv = storage();
  const file = await getPublished(date);
  if (!file) return new Response("journée non publiée", { status: 404 });
  if (!env.resendKey) { await kv.setJSON("state", "email-pending", { date, since: new Date().toISOString() }); console.log("RESEND_API_KEY absente : envoi mis en attente"); return new Response("", { status: 202 }); }
  const subs = await listConfirmed();
  const mails = subs.map((s) => {
    const unsub = `${env.siteUrl}/api/unsubscribe?token=${encodeURIComponent(s.unsubToken)}`;
    return { to: s.email, ...renderDailyEmail(file, s.lang, unsub), headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
  });
  const r = await sendMails(mails);
  console.log(`daily-email ${date} : ${r.sent} envoyés, ${r.failed} en échec${r.error ? " (" + r.error + ")" : ""}`);
  if (r.failed) await kv.setJSON("state", "email-pending", { date, since: new Date().toISOString() });
  else await kv.delete("state", "email-pending");
  return new Response("", { status: 202 });
};
