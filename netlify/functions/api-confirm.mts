import type { Config } from "@netlify/functions";
import { redirect } from "../../lib/functions.ts";
import { confirm } from "../../lib/subscribers.ts";

/** GET /api/confirm?token= — valide l'abonnement puis renvoie vers la page d'abonnement. */
export default async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const sub = token ? await confirm(token) : null;
  if (!sub) return redirect("/abonnement?etat=invalide");
  return redirect(`/abonnement?etat=confirme&lang=${sub.lang}`);
};

export const config: Config = { path: "/api/confirm" };
