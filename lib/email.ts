/**
 * Email quotidien et email de confirmation (double opt-in). Envoi via Resend (REST), sans SDK.
 * Aucun pixel, aucun lien tracé : les liens pointent directement vers les articles.
 * Gabarit conforme à design/preview/Email.html, en tableaux pour les clients mail.
 */
import { env, USER_AGENT } from "./env.ts";
import type { PublishedFile, Story } from "../agents/types.ts";
import { localize, countryName, translatedFromLabel, levelLabel, categoryLabel, formatLongDate, type UiLang } from "../shared/format.ts";

export interface Mail { to: string; subject: string; html: string; text: string; headers?: Record<string, string> }

export async function sendMails(mails: Mail[]): Promise<{ sent: number; failed: number; error: string | null }> {
  const key = env.resendKey;
  if (!key) return { sent: 0, failed: mails.length, error: "RESEND_API_KEY absente" };
  let sent = 0, failed = 0, error: string | null = null;
  for (let i = 0; i < mails.length; i += 100) {
    const batch = mails.slice(i, i + 100).map((m) => ({ from: env.emailFrom, to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers ?? {} }));
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "User-Agent": USER_AGENT },
        body: JSON.stringify(batch),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) { failed += batch.length; error = `Resend ${res.status}`; continue; }
      sent += batch.length;
    } catch (e) {
      failed += batch.length; error = (e as Error).message;
    }
  }
  return { sent, failed, error };
}

/* ---------------- Gabarits ---------------- */
const C = { ground: "#FBF7F0", ink: "#1C1815", muted: "#6A6157", line: "#E8DFD2", accent: "#B45309", okBg: "#DCFCE7", okTx: "#14532D", midBg: "#FEF3C7", midTx: "#78350F" };
const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Karla', 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const LOGO = `<svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden="true" style="vertical-align:middle"><path d="M6 23h20" stroke="${C.accent}" stroke-width="2" stroke-linecap="round"/><path d="M10 23a6 6 0 0112 0" fill="${C.accent}"/><path d="M16 6v3M8 9.5l2 2M24 9.5l-2 2M3 17h3M26 17h3" stroke="${C.accent}" stroke-width="2" stroke-linecap="round"/></svg>`;
const CHECK = (color: string) => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M20 6L9 17l-5-5"/></svg>`;
const EXT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${C.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-2px"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/></svg>`;

const T = {
  fr: {
    subject: (n: number) => `Vos ${n} bonnes nouvelles du matin`,
    h1: (n: number) => `Vos ${n} bonnes nouvelles du matin`,
    sub: "Vérifiées par recoupement, choisies à la main, sans aucun parti pris.",
    read: "Lire l'article original",
    newsrooms: (n: number) => `${n} rédaction${n > 1 ? "s" : ""}`,
    countries: (n: number) => `${n} pays`,
    footer: (host: string) => `Vous recevez cet email parce que vous vous êtes inscrit·e sur ${host}. Nous ne stockons que votre adresse email et la date d'inscription : rien d'autre, aucun traceur dans cet email.`,
    unsub: "Se désabonner en un clic",
    write: "Nous écrire",
    confirmSubject: "Confirmez votre abonnement à True Good News",
    confirmH1: "Encore un clic",
    confirmBody: "Pour recevoir chaque matin les 5 bonnes nouvelles vérifiées, confirmez votre adresse. Sans confirmation sous 48 heures, elle est supprimée.",
    confirmCta: "Confirmer mon abonnement",
    confirmIgnore: "Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.",
  },
  en: {
    subject: (n: number) => `Your ${n} good news this morning`,
    h1: (n: number) => `Your ${n} good news this morning`,
    sub: "Cross-checked, hand-picked, without taking sides.",
    read: "Read the original article",
    newsrooms: (n: number) => `${n} newsroom${n > 1 ? "s" : ""}`,
    countries: (n: number) => `${n} countr${n > 1 ? "ies" : "y"}`,
    footer: (host: string) => `You receive this email because you signed up on ${host}. We only store your email address and the sign-up date: nothing else, and no tracker in this email.`,
    unsub: "Unsubscribe in one click",
    write: "Write to us",
    confirmSubject: "Confirm your True Good News subscription",
    confirmH1: "One more click",
    confirmBody: "To receive the 5 verified good news every morning, please confirm your address. Without confirmation within 48 hours, it is deleted.",
    confirmCta: "Confirm my subscription",
    confirmIgnore: "If you did not request this, simply ignore this email.",
  },
} as const;

function badge(s: Story, lang: UiLang): string {
  const ok = s.evidence.niveau === "confirme";
  const bg = ok ? C.okBg : C.midBg, tx = ok ? C.okTx : C.midTx;
  return `<span style="display:inline-block;padding:4px 10px;border-radius:99px;background:${bg};color:${tx};font-size:12px;font-weight:700;white-space:nowrap;font-family:${SANS}">${CHECK(tx)} ${esc(levelLabel(s.evidence.niveau, lang))}</span>`;
}
function chip(text: string): string {
  return `<span style="display:inline-block;padding:3px 9px;border:1px solid ${C.line};border-radius:99px;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:${C.muted};font-family:${SANS}">${esc(text)}</span>`;
}

function storyBlock(s: Story, lang: UiLang, last: boolean): string {
  const loc = localize(s, lang);
  const t = T[lang];
  const parts = [t.newsrooms(s.evidence.redactions_independantes), t.countries(s.evidence.pays), esc(s.media.name) + (s.media.country ? ` (${esc(countryName(s.media.country, lang))})` : "")];
  const tr = translatedFromLabel(s, lang);
  if (tr) parts.push(`<span style="color:${C.accent};font-weight:700">${esc(tr)}</span>`);
  return `<tr><td style="padding:0 0 18px 0;${last ? "" : `border-bottom:1px solid ${C.line};`}${last ? "" : "margin-bottom:18px;"}">
  <div style="padding-top:${last ? 0 : 0}px">
    <div style="margin:0 0 8px 0">${chip(categoryLabel(s.category, lang))}&nbsp; ${badge(s, lang)}</div>
    <h3 style="margin:0 0 7px 0;font-family:${SERIF};font-size:18px;line-height:1.25;font-weight:600"><a href="${esc(s.original.url)}" style="color:${C.ink};text-decoration:none">${esc(loc.title)}</a></h3>
    ${loc.summary ? `<p style="margin:0 0 7px 0;font-family:${SANS};font-size:13px;line-height:1.55;color:${C.muted}">${esc(loc.summary)}</p>` : ""}
    <p style="margin:0 0 7px 0;font-family:${SANS};font-size:12px;color:${C.muted}">${parts.join(" &middot; ")}</p>
    <p style="margin:2px 0 0 0"><a href="${esc(s.original.url)}" style="font-family:${SANS};font-size:13px;font-weight:700;color:${C.accent};text-decoration:none">${t.read} ${EXT}</a></p>
  </div>
</td></tr>${last ? "" : `<tr><td style="height:18px;line-height:18px;font-size:0">&nbsp;</td></tr>`}`;
}

function shell(lang: UiLang, dateLabel: string, inner: string, footer: string): string {
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>True Good News</title></head>
<body style="margin:0;padding:0;background:${C.ground};color:${C.ink};font-family:${SANS};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.ground}"><tr><td align="center" style="padding:30px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%">
<tr><td style="padding:0 14px 16px 14px;border-bottom:1px solid ${C.line}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td style="font-family:${SERIF};font-size:19px;font-weight:600;color:${C.ink}">${LOGO}&nbsp; True Good News</td>
    <td align="right" style="font-family:${SANS};font-size:12px;color:${C.muted}">${esc(dateLabel)}</td>
  </tr></table>
</td></tr>
<tr><td style="padding:20px 14px 0 14px">${inner}</td></tr>
<tr><td style="padding:16px 14px 0 14px;border-top:1px solid ${C.line}">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderDailyEmail(file: PublishedFile, lang: UiLang, unsubUrl: string): { subject: string; html: string; text: string } {
  const t = T[lang];
  const host = env.siteUrl.replace(/^https?:\/\//, "");
  const n = file.stories.length;
  const rows = file.stories.map((s, i) => storyBlock(s, lang, i === n - 1)).join("");
  const inner = `<h1 style="margin:0 0 5px 0;font-family:${SERIF};font-size:25px;line-height:1.2;font-weight:600;letter-spacing:-0.015em;color:${C.ink}">${esc(t.h1(n))}</h1>
<p style="margin:0 0 20px 0;font-family:${SANS};font-size:13px;color:${C.muted}">${esc(t.sub)}</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows}</table>`;
  const footer = `<p style="margin:0 0 9px 0;font-family:${SANS};font-size:11px;line-height:1.55;color:${C.muted}">${esc(t.footer(host))}</p>
<p style="margin:0;font-family:${SANS};font-size:12px"><a href="${esc(unsubUrl)}" style="color:${C.accent};font-weight:700;text-decoration:none">${t.unsub}</a> &nbsp;<span style="color:${C.line}">|</span>&nbsp; <a href="mailto:${esc(env.contactEmail)}" style="color:${C.accent};font-weight:500;text-decoration:none">${t.write}</a></p>`;
  const html = shell(lang, formatLongDate(file.date, lang), inner, footer);
  const text = [
    `True Good News — ${formatLongDate(file.date, lang)}`, t.h1(n), t.sub, "",
    ...file.stories.flatMap((s) => {
      const loc = localize(s, lang);
      const tr = translatedFromLabel(s, lang);
      return [`* ${loc.title}`, loc.summary ?? "", `  ${levelLabel(s.evidence.niveau, lang)} · ${t.newsrooms(s.evidence.redactions_independantes)} · ${t.countries(s.evidence.pays)} · ${s.media.name}${s.media.country ? ` (${countryName(s.media.country, lang)})` : ""}${tr ? ` · ${tr}` : ""}`, `  ${s.original.url}`, ""];
    }),
    t.footer(host), `${t.unsub} : ${unsubUrl}`, `${t.write} : ${env.contactEmail}`,
  ].join("\n");
  return { subject: t.subject(n), html, text };
}

export function renderConfirmEmail(lang: UiLang, confirmUrl: string): { subject: string; html: string; text: string } {
  const t = T[lang];
  const inner = `<h1 style="margin:0 0 10px 0;font-family:${SERIF};font-size:25px;line-height:1.2;font-weight:600;letter-spacing:-0.015em;color:${C.ink}">${esc(t.confirmH1)}</h1>
<p style="margin:0 0 18px 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${C.muted}">${esc(t.confirmBody)}</p>
<p style="margin:0 0 20px 0"><a href="${esc(confirmUrl)}" style="display:inline-block;padding:12px 20px;border-radius:99px;background:${C.accent};color:#ffffff;font-family:${SANS};font-size:14px;font-weight:700;text-decoration:none">${esc(t.confirmCta)}</a></p>
<p style="margin:0 0 20px 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted}">${esc(t.confirmIgnore)}</p>`;
  const footer = `<p style="margin:0;font-family:${SANS};font-size:12px"><a href="mailto:${esc(env.contactEmail)}" style="color:${C.accent};font-weight:500;text-decoration:none">${t.write}</a></p>`;
  const html = shell(lang, "", inner, footer);
  const text = [t.confirmH1, t.confirmBody, confirmUrl, "", t.confirmIgnore].join("\n");
  return { subject: t.confirmSubject, html, text };
}
