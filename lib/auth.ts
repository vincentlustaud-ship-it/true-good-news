/**
 * Administration (SECURITE-CONFIDENTIALITE.md) : mot de passe haché (bcrypt) en variable d'environnement,
 * cookie de session signé HMAC, HttpOnly, Secure, SameSite=Strict, expiration courte.
 * Limitation de débit en mémoire uniquement (jamais écrite, jamais associée à autre chose).
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "./env.ts";

export const SESSION_COOKIE = "tgn_admin";
const SESSION_TTL_S = 8 * 3600;

function hmac(data: string): string {
  const secret = env.sessionSecret;
  if (!secret) throw new Error("SESSION_SECRET manquante");
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export function adminConfigured(): boolean { return !!env.adminPasswordHash && !!env.sessionSecret; }

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = env.adminPasswordHash;
  if (!hash || !password) return false;
  try { return await bcrypt.compare(password, hash); } catch { return false; }
}

export function createSessionValue(): string {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S, n: randomBytes(8).toString("hex") })).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function sessionValid(value: string | null | undefined): boolean {
  if (!value || !env.sessionSecret) return false;
  const i = value.lastIndexOf(".");
  if (i < 0) return false;
  const payload = value.slice(0, i), sig = value.slice(i + 1);
  let expected: string;
  try { expected = hmac(payload); } catch { return false; }
  if (!safeEq(sig, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return typeof exp === "number" && exp > Date.now() / 1000;
  } catch { return false; }
}

export function parseCookies(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function isAdmin(req: Request): boolean {
  return sessionValid(parseCookies(req)[SESSION_COOKIE]);
}

function secureFlag(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return proto === "https" ? "; Secure" : "";
}

export function sessionSetCookie(req: Request, value: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_S}${secureFlag(req)}`;
}
export function sessionClearCookie(req: Request): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secureFlag(req)}`;
}

/* ---------- Limitation de débit en mémoire ---------- */
interface Bucket { fails: number; until: number; hits: number[] }
const buckets = new Map<string, Bucket>();
function bucket(key: string): Bucket {
  let b = buckets.get(key);
  if (!b) { b = { fails: 0, until: 0, hits: [] }; buckets.set(key, b); }
  if (buckets.size > 5000) buckets.clear();
  return b;
}
/** Connexion : délai croissant après échecs (2^n secondes, plafonné à 15 min). */
export function loginBlockedFor(ip: string): number {
  const b = bucket("login:" + ip);
  return Math.max(0, b.until - Date.now());
}
export function loginFailed(ip: string): void {
  const b = bucket("login:" + ip);
  b.fails++;
  b.until = Date.now() + Math.min(15 * 60_000, 2 ** b.fails * 1000);
}
export function loginSucceeded(ip: string): void { buckets.delete("login:" + ip); }

/** Fenêtre glissante générique : au plus `max` appels par `windowMs`. */
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const b = bucket(key);
  const now = Date.now();
  b.hits = b.hits.filter((t) => now - t < windowMs);
  if (b.hits.length >= max) return true;
  b.hits.push(now);
  return false;
}

/* ---------- Appels internes entre fonctions (cron → background) ---------- */
export function internalToken(purpose: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return hmac(`internal:${purpose}:${day}`);
}
export function verifyInternal(req: Request, purpose: string): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || !env.sessionSecret) return false;
  const day = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  return safeEq(token, hmac(`internal:${purpose}:${day}`)) || safeEq(token, hmac(`internal:${purpose}:${yesterday}`));
}
