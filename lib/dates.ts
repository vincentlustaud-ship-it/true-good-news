/** Toutes les « journées » du projet sont des dates civiles de Paris (YYYY-MM-DD). */
const PARIS = "Europe/Paris";

export function parisDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PARIS, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + "T00:00:00Z"));
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Fenêtre de collecte pour une journée : 24 h avant 04:00 UTC ce jour-là (heure du cron). */
export function harvestWindow(dateIso: string): { start: Date; end: Date } {
  const end = new Date(dateIso + "T04:00:00Z");
  const start = new Date(end.getTime() - 24 * 3600 * 1000);
  return { start, end };
}

export function toGdeltStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15).replace("T", "") + "";
}

/** GDELT `seendate` : 20260918T040000Z */
export function fromGdeltDate(s: string | undefined): string | null {
  if (!s) return null;
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

export function parseDateLoose(v: unknown): string | null {
  if (!v) return null;
  const s = typeof v === "object" && v !== null && "#text" in (v as Record<string, unknown>) ? String((v as Record<string, unknown>)["#text"]) : String(v);
  const t = Date.parse(s.trim());
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString();
}
