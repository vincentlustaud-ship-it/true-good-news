import { triggerBackground } from "../../lib/functions.ts";
import { parisDate } from "../../lib/dates.ts";

/**
 * Cron (netlify.toml : 0 4 * * *, soit 06:00 Paris). Une fonction planifiée n'a que quelques secondes :
 * elle délègue le pipeline à harvest-background (15 minutes).
 */
export default async () => {
  const date = parisDate();
  const r = await triggerBackground("harvest-background", "harvest", { date });
  console.log(`daily-harvest ${date} → harvest-background : ${r.ok ? "déclenché" : "échec " + r.status}`);
  return new Response(r.ok ? "ok" : "échec", { status: r.ok ? 200 : 502 });
};
