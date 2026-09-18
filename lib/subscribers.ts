/**
 * Abonnés : la seule donnée personnelle du projet. Stocké : email, langue, date de confirmation,
 * jetons de confirmation / désabonnement. Rien d'autre (SECURITE-CONFIDENTIALITE.md).
 */
import { createHash, randomBytes } from "node:crypto";
import { storage } from "./storage.ts";

export interface Subscriber { email: string; lang: "fr" | "en"; createdAt: string; confirmedAt: string | null; confirmToken: string | null; unsubToken: string }
interface TokenRef { hash: string; kind: "confirm" | "unsub" }

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
export function validEmail(email: string): boolean {
  return /^[^\s@]{1,64}@[^\s@]{1,255}\.[a-z]{2,24}$/i.test(email.trim());
}
function token(): string { return randomBytes(24).toString("base64url"); }

/** Crée (ou renouvelle) une inscription en attente. Retourne null si l'adresse est déjà confirmée. */
export async function createPending(email: string, lang: "fr" | "en"): Promise<Subscriber | null> {
  const kv = storage();
  const h = hashEmail(email);
  const existing = await kv.getJSON<Subscriber>("subscribers", h);
  if (existing?.confirmedAt) return null;
  if (existing?.confirmToken) await kv.delete("tokens", existing.confirmToken);
  const sub: Subscriber = { email: email.trim(), lang, createdAt: new Date().toISOString(), confirmedAt: null, confirmToken: token(), unsubToken: existing?.unsubToken ?? token() };
  await kv.setJSON("subscribers", h, sub);
  await kv.setJSON("tokens", sub.confirmToken!, { hash: h, kind: "confirm" } satisfies TokenRef);
  await kv.setJSON("tokens", sub.unsubToken, { hash: h, kind: "unsub" } satisfies TokenRef);
  return sub;
}

export async function confirm(tok: string): Promise<Subscriber | null> {
  const kv = storage();
  const ref = await kv.getJSON<TokenRef>("tokens", tok);
  if (!ref || ref.kind !== "confirm") return null;
  const sub = await kv.getJSON<Subscriber>("subscribers", ref.hash);
  if (!sub) return null;
  sub.confirmedAt = sub.confirmedAt ?? new Date().toISOString();
  sub.confirmToken = null;
  await kv.setJSON("subscribers", ref.hash, sub);
  await kv.delete("tokens", tok);
  return sub;
}

/** Désabonnement : suppression pure et simple de l'enregistrement. */
export async function unsubscribe(tok: string): Promise<boolean> {
  const kv = storage();
  const ref = await kv.getJSON<TokenRef>("tokens", tok);
  if (!ref) return false;
  const sub = await kv.getJSON<Subscriber>("subscribers", ref.hash);
  if (sub?.confirmToken) await kv.delete("tokens", sub.confirmToken);
  if (sub?.unsubToken) await kv.delete("tokens", sub.unsubToken);
  await kv.delete("subscribers", ref.hash);
  await kv.delete("tokens", tok);
  return true;
}

export async function listConfirmed(): Promise<Subscriber[]> {
  const kv = storage();
  const keys = await kv.list("subscribers");
  const out: Subscriber[] = [];
  for (const k of keys) {
    const s = await kv.getJSON<Subscriber>("subscribers", k);
    if (s?.confirmedAt) out.push(s);
  }
  return out;
}

/** Sans clic de confirmation sous 48 h, l'adresse est supprimée. */
export async function purgePending(maxAgeHours = 48): Promise<number> {
  const kv = storage();
  const keys = await kv.list("subscribers");
  let n = 0;
  const limit = Date.now() - maxAgeHours * 3600_000;
  for (const k of keys) {
    const s = await kv.getJSON<Subscriber>("subscribers", k);
    if (!s || s.confirmedAt) continue;
    if (Date.parse(s.createdAt) < limit) {
      if (s.confirmToken) await kv.delete("tokens", s.confirmToken);
      await kv.delete("tokens", s.unsubToken);
      await kv.delete("subscribers", k);
      n++;
    }
  }
  return n;
}
