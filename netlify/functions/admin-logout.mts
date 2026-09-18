import type { Config } from "@netlify/functions";
import { json } from "../../lib/functions.ts";
import { sessionClearCookie } from "../../lib/auth.ts";

export default async (req: Request) => json({ ok: true }, { headers: { "Set-Cookie": sessionClearCookie(req) } });

export const config: Config = { path: "/api/admin/logout" };
