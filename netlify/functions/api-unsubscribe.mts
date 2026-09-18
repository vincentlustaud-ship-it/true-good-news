import type { Config } from "@netlify/functions";
import { redirect } from "../../lib/functions.ts";
import { unsubscribe } from "../../lib/subscribers.ts";

/** GET ou POST /api/unsubscribe?token= — désabonne en un clic, sans confirmation (RFC 8058 pour le POST). */
export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") return new Response("Méthode non autorisée", { status: 405 });
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const ok = token ? await unsubscribe(token) : false;
  if (req.method === "POST") return new Response(ok ? "Désabonné." : "Lien inconnu.", { status: ok ? 200 : 404, headers: { "Cache-Control": "no-store" } });
  return redirect(ok ? "/abonnement?etat=desabonne" : "/abonnement?etat=invalide");
};

export const config: Config = { path: "/api/unsubscribe" };
