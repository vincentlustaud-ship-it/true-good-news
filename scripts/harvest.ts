/**
 * npm run harvest -- [--dry-run] [--date=YYYY-MM-DD] [--skip-social] [--skip-gdelt] [--limit-feeds=N]
 *                    [--gdelt-max=N] [--llm-max=N] [--save-raw] [--replay] [--skip-qualify] [--json]
 *
 * --dry-run       exécute tout, n'écrit rien, imprime un rapport lisible
 * --date=         rejoue une journée (fenêtre de 24 h avant 04:00 UTC ce jour-là)
 * --save-raw      enregistre la collecte brute dans .data/raw/<date>.json
 * --replay        réutilise .data/raw/<date>.json au lieu de collecter (hors ligne)
 * --skip-qualify  (dry-run seulement) saute la charte pour tester les étapes suivantes
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { runPipeline } from "../agents/pipeline.ts";
import { Reporter } from "../agents/report.ts";
import { parisDate, isIsoDate } from "../lib/dates.ts";
import { storageBackend } from "../lib/storage.ts";
import type { RawArticle } from "../agents/types.ts";

// .env local (jamais commité)
try {
  const envTxt = await readFile(path.resolve(".env"), "utf8");
  for (const line of envTxt.split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1]! in process.env)) process.env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
} catch { /* pas de .env */ }

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const m = /^--([a-z-]+)(?:=(.*))?$/.exec(a);
  if (m) args.set(m[1]!, m[2] ?? "true");
}
const flag = (k: string) => args.get(k) === "true";
const num = (k: string) => (args.has(k) ? Number(args.get(k)) : undefined);

const date = args.get("date") ?? parisDate();
if (!isIsoDate(date)) { console.error(`Date invalide : ${date}`); process.exit(2); }
const dryRun = flag("dry-run");
const rawFile = path.resolve(".data", "raw", `${date}.json`);

let rawArticles: RawArticle[] | undefined;
if (flag("replay")) {
  rawArticles = JSON.parse(await readFile(rawFile, "utf8")) as RawArticle[];
  console.error(`Rejeu de ${rawArticles.length} articles depuis ${rawFile}`);
}

console.error(`True Good News — pipeline ${date}${dryRun ? " (dry-run)" : ""} · stockage : ${storageBackend()}`);
const t0 = Date.now();
const result = await runPipeline({
  date, dryRun, rawArticles,
  skipSocial: flag("skip-social"), skipGdelt: flag("skip-gdelt"),
  limitFeeds: num("limit-feeds"), gdeltQueries: num("gdelt-queries"),
  maxGdeltCorroboration: num("gdelt-max"), maxLlmCalls: num("llm-max"),
  skipQualify: flag("skip-qualify"),
  onRaw: flag("save-raw") ? async (a) => { await mkdir(path.dirname(rawFile), { recursive: true }); await writeFile(rawFile, JSON.stringify(a, null, 1)); console.error(`Collecte brute enregistrée : ${rawFile} (${a.length} articles)`); } : undefined,
});

if (flag("json")) console.log(JSON.stringify({ report: result.report, candidates: result.candidates }, null, 2));
else {
  console.log(Reporter.toText(result.report));
  if (result.candidates) {
    console.log("");
    console.log("Détail des candidates :");
    for (const s of result.candidates.candidates) {
      const ev = s.evidence;
      console.log(`- ${s.fr?.title ?? s.original.title}`);
      console.log(`    ${s.media.name} (${s.media.country ?? "?"}) · ${s.original.lang ?? "?"} · ${ev.niveau} · ${ev.redactions_independantes} rédactions · ${ev.pays} pays · primaire : ${ev.source_primaire?.nom ?? "aucune"} · fact-check : ${ev.factcheck.interroge ? (ev.factcheck.dementi ? "DÉMENTI" : "aucun démenti") : "non interrogé"}`);
      console.log(`    image : ${s.imageStatus} · traduction : ${s.translation.provider ?? "aucune"} · ${s.original.url}`);
    }
  }
  console.log("");
  console.log(`${result.written ? "Écrit dans le stockage." : "Rien n'a été écrit (dry-run)."} Durée : ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
