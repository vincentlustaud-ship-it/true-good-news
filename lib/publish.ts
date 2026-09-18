/** Lecture / écriture des journées publiées et de l'état associé (dates publiées, sujets récents). */
import { storage } from "./storage.ts";
import { addDays } from "./dates.ts";
import type { PublishedFile, RecentTopic, Story } from "../agents/types.ts";

export async function publishedDates(): Promise<string[]> {
  return (await storage().getJSON<string[]>("state", "published-dates")) ?? [];
}

export async function getPublished(date: string): Promise<PublishedFile | null> {
  return storage().getJSON<PublishedFile>("published", date);
}

export async function writePublished(file: PublishedFile): Promise<void> {
  const kv = storage();
  await kv.setJSON("published", file.date, file);
  const dates = new Set(await publishedDates());
  dates.add(file.date);
  await kv.setJSON("state", "published-dates", [...dates].sort());
  // Anti-répétition : empreintes des sujets publiés, conservées 30 jours (l'agent d'édition regarde 14 jours).
  const recent = (await kv.getJSON<RecentTopic[]>("state", "recent-topics")) ?? [];
  const floor = addDays(file.date, -30);
  const kept = recent.filter((r) => r.date >= floor && r.date !== file.date);
  for (const s of file.stories) kept.push({ date: file.date, id: s.id, title: s.en?.title ?? s.original.title, fingerprint: s.fingerprint });
  await kv.setJSON("state", "recent-topics", kept);
}

export function neighbours(dates: string[], date: string): { prev: string | null; next: string | null; latest: string | null } {
  const sorted = [...dates].sort();
  const prev = [...sorted].reverse().find((d) => d < date) ?? null;
  const next = sorted.find((d) => d > date) ?? null;
  return { prev, next, latest: sorted[sorted.length - 1] ?? null };
}

export async function viewsFor(stories: Story[]): Promise<Record<string, number>> {
  const kv = storage();
  const out: Record<string, number> = {};
  await Promise.all(stories.map(async (s) => { out[s.id] = (await kv.getJSON<number>("views", s.id)) ?? 0; }));
  return out;
}
