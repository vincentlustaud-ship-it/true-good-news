import type { Config, Context } from "@netlify/functions";
import { json, error, readJson, clientIp } from "../../lib/functions.ts";
import { adminConfigured, verifyPassword, createSessionValue, sessionSetCookie, loginBlockedFor, loginFailed, loginSucceeded } from "../../lib/auth.ts";

/** POST /api/admin/login {password} — cookie de session signé ; délai croissant après échecs. */
export default async (req: Request, context: Context) => {
  if (req.method !== "POST") return error(405, "POST uniquement");
  if (!adminConfigured()) return error(503, "administration non configurée (ADMIN_PASSWORD_HASH / SESSION_SECRET)");
  const ip = clientIp(req, context);
  const wait = loginBlockedFor(ip);
  if (wait > 0) return json({ error: "réessayez plus tard", retryAfterMs: wait }, { status: 429, headers: { "Retry-After": String(Math.ceil(wait / 1000)) } });
  const body = await readJson<{ password?: unknown }>(req);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!(await verifyPassword(password))) { loginFailed(ip); return error(401, "mot de passe incorrect"); }
  loginSucceeded(ip);
  return json({ ok: true }, { headers: { "Set-Cookie": sessionSetCookie(req, createSessionValue()) } });
};

export const config: Config = { path: "/api/admin/login" };
