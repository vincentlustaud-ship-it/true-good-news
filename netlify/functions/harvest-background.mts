import { verifyInternal } from "../../lib/auth.ts";
import { readJson } from "../../lib/functions.ts";
import { isIsoDate, parisDate } from "../../lib/dates.ts";
import { runPipeline } from "../../agents/pipeline.ts";
import { purgePending, listConfirmed } from "../../lib/subscribers.ts";
import { storage } from "../../lib/storage.ts";
import { getPublished } from "../../lib/publish.ts";
import { renderDailyEmail, sendMails } from "../../lib/email.ts";
import { env } from "../../lib/env.ts";

/**
 * Pipeline complet en arrière-plan (suffixe -background : jusqu'à 15 min). Protégé par un jeton interne.
 * Écrit `candidates/<date>` et `reports/<date>` ; ne publie jamais.
 * Tâches d'entretien : purge des inscriptions non confirmées (48 h), nouvel essai d'un envoi d'email en attente.
 */
export default async (req: Request) => {
  if (!verifyInternal(req, "harvest")) return new Response("non autorisé", { status: 401 });
  const body = await readJson<{ date?: unknown }>(req);
  const date = typeof body?.date === "string" && isIsoDate(body.date) ? body.date : parisDate();
  const startedAt = Date.now();
  console.log(`harvest-background : début ${date}`);
  try {
    const purged = await purgePending(48);
    if (purged) console.log(`abonnements non confirmés supprimés : ${purged}`);
  } catch (e) { console.error("purge des abonnements en échec", e); }
  try {
    const kv = storage();
    const pending = await kv.getJSON<{ date: string }>("state", "email-pending");
    if (pending?.date) {
      const file = await getPublished(pending.date);
      if (file && env.resendKey) {
        const subs = await listConfirmed();
        const mails = subs.map((s) => { const unsub = `${env.siteUrl}/api/unsubscribe?token=${encodeURIComponent(s.unsubToken)}`; return { to: s.email, ...renderDailyEmail(file, s.lang, unsub), headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }; });
        const r = await sendMails(mails);
        console.log(`nouvel essai d'envoi ${pending.date} : ${r.sent} envoyés, ${r.failed} en échec`);
        if (!r.failed) await kv.delete("state", "email-pending");
      }
    }
  } catch (e) { console.error("nouvel essai d'envoi en échec", e); }
  try {
    // Une fonction d'arrière-plan Netlify est coupée à 15 minutes ; on part de l'entrée du gestionnaire,
    // ce qui laisse au pipeline la mesure exacte du temps qu'il lui reste.
    const result = await runPipeline({ date, maxGdeltCorroboration: 45, maxLlmCalls: 150, deadlineAt: startedAt + 15 * 60_000 });
    console.log(`harvest-background : fin ${date} — ${result.candidates?.candidates.length ?? 0} candidates, alertes : ${result.report.alerts.join(" | ") || "aucune"}`);
  } catch (e) {
    console.error("harvest-background : erreur", e);
    await storage().setJSON("reports", date, { date, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), dryRun: false, stages: [], rejected: [], alerts: [`Erreur fatale du pipeline : ${(e as Error).message}`], stats: null, candidates: [] });
  }
  return new Response("", { status: 202 });
};
