/**
 * Formatage partagé entre le site (navigateur) et les fonctions (Node) : libellés, dates, pays, langues.
 * Aucune dépendance Node ni DOM : uniquement Intl.
 */
import type { Category, Level, Story } from "../agents/types.ts";

export type UiLang = "fr" | "en";
export const LOCALE: Record<UiLang, string> = { fr: "fr-FR", en: "en-GB" };

export function localize(s: Story, lang: UiLang): { title: string; summary: string | null; isOriginal: boolean } {
  const loc = lang === "fr" ? s.fr : s.en;
  if (loc) return { title: loc.title, summary: loc.summary, isOriginal: !loc.machine };
  return { title: s.original.title, summary: s.original.summary, isOriginal: true };
}

export function categoryLabel(c: Category, lang: UiLang): string {
  if (lang === "fr") return c;
  return ({ "Santé": "Health", "Science": "Science", "Nature": "Nature", "Océans": "Oceans", "Société": "Society", "Culture": "Culture" } as Record<Category, string>)[c] ?? c;
}

export function levelLabel(l: Level, lang: UiLang): string {
  if (l === "confirme") return lang === "fr" ? "Confirmé" : "Confirmed";
  if (l === "bien_corrobore") return lang === "fr" ? "Bien corroboré" : "Well corroborated";
  return lang === "fr" ? "Insuffisant" : "Insufficient";
}

const regionNames: Partial<Record<UiLang, Intl.DisplayNames>> = {};
export function countryName(code: string, lang: UiLang): string {
  try {
    regionNames[lang] ??= new Intl.DisplayNames([LOCALE[lang]], { type: "region" });
    return regionNames[lang]!.of(code.toUpperCase()) ?? code;
  } catch { return code; }
}

const langNames: Partial<Record<UiLang, Intl.DisplayNames>> = {};
export function languageName(code: string, lang: UiLang): string {
  try {
    langNames[lang] ??= new Intl.DisplayNames([LOCALE[lang]], { type: "language" });
    return langNames[lang]!.of(code) ?? code;
  } catch { return code; }
}

/** « Traduit de l'anglais » / « Translated from Portuguese » ; null si le texte affiché est l'original. */
export function translatedFromLabel(s: Story, lang: UiLang): string | null {
  const loc = lang === "fr" ? s.fr : s.en;
  if (!loc || !loc.machine || !s.original.lang) return null;
  const name = languageName(s.original.lang, lang);
  if (lang === "en") return `Translated from ${name}`;
  const vowel = /^[aeiouyàâäéèêëîïôöùûüh]/i.test(name);
  return vowel ? `Traduit de l'${name}` : `Traduit du ${name}`;
}

/** Mention quand le texte est resté dans sa langue d'origine faute de traduction. */
export function untranslatedLabel(s: Story, lang: UiLang): string | null {
  const loc = lang === "fr" ? s.fr : s.en;
  if (loc) return null;
  const name = s.original.lang ? languageName(s.original.lang, lang) : null;
  if (lang === "fr") return name ? `Non traduit (${name})` : "Non traduit";
  return name ? `Untranslated (${name})` : "Untranslated";
}

export function formatLongDate(iso: string, lang: UiLang, withYear = true): string {
  const d = new Date(iso + "T12:00:00Z");
  const s = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function formatShortDate(iso: string, lang: UiLang): string {
  const d = new Date(iso + "T12:00:00Z");
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}
export function formatDayMonth(iso: string, lang: UiLang): string {
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  return new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** « il y a 6 h » / « 6 h ago », ou la date courte au-delà de 36 h. */
export function relativeTime(iso: string | null, lang: UiLang, now: number = Date.now()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diffH = Math.round((now - t) / 3_600_000);
  if (diffH < 1) return lang === "fr" ? "à l'instant" : "just now";
  if (diffH <= 36) return lang === "fr" ? `il y a ${diffH} h` : `${diffH} h ago`;
  return formatDayMonth(iso, lang);
}

export function formatViews(n: number, lang: UiLang): string {
  const num = new Intl.NumberFormat(LOCALE[lang]).format(n);
  return lang === "fr" ? `${num} vue${n > 1 ? "s" : ""}` : `${num} view${n === 1 ? "" : "s"}`;
}
