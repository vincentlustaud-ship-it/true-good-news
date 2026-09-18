/** npm run check-feeds — vérifie que chaque flux de data/feeds.json répond et publie encore (SOURCES.md : ne jamais inscrire une URL supposée). */
import feeds from "../data/feeds.json" with { type: "json" };
import { readFeed, type FeedDef } from "../lib/rss.ts";
import { mapLimit } from "../lib/http.ts";

const list = feeds as FeedDef[];
const results = await mapLimit(list, 12, async (f) => {
  const r = await readFeed(f);
  const dates = r.items.map((i) => (i.publishedAt ? Date.parse(i.publishedAt) : NaN)).filter((t) => !Number.isNaN(t));
  const newest = dates.length ? new Date(Math.max(...dates)).toISOString().slice(0, 10) : null;
  return { f, r, newest };
});
let ko = 0, stale = 0;
for (const { f, r, newest } of results) {
  const age = newest ? Math.round((Date.now() - Date.parse(newest)) / 864e5) : null;
  const status = r.error ? `KO (${r.error})` : age !== null && age > 60 ? `STALE (${age} j)` : `ok (${r.items.length} items, dernier ${newest ?? "sans date"})`;
  if (r.error) ko++; else if (age !== null && age > 60) stale++;
  console.log(`${status.padEnd(40)} ${f.name} — ${f.url}`);
}
console.log(`\n${list.length} flux : ${list.length - ko - stale} ok, ${stale} périmés, ${ko} en échec`);
