/** Journal du pipeline : chaque agent y consigne ce qu'il a écarté et pourquoi. Consultable depuis /admin. */
import type { Report, Rejection, RunStats, StageLog, Level, Category } from "./types.ts";

export class Reporter {
  private report: Report;
  private current: { log: StageLog; t0: number } | null = null;

  constructor(date: string, dryRun: boolean) {
    this.report = { date, startedAt: new Date().toISOString(), finishedAt: null, dryRun, stages: [], rejected: [], alerts: [], stats: null, candidates: [] };
  }

  stage(name: string, input: number): void {
    this.endStage();
    this.current = { log: { name, in: input, out: 0, notes: [], ms: 0 }, t0: Date.now() };
    this.report.stages.push(this.current.log);
  }
  endStage(out?: number): void {
    if (!this.current) return;
    if (out !== undefined) this.current.log.out = out;
    this.current.log.ms = Date.now() - this.current.t0;
    this.current = null;
  }
  note(msg: string): void {
    if (this.current) this.current.log.notes.push(msg);
    else this.report.alerts.push(msg);
  }
  reject(stage: string, title: string, url: string | null, reason: string): void {
    this.report.rejected.push({ stage, title: title.slice(0, 160), url, reason });
  }
  alert(msg: string): void { this.report.alerts.push(msg); }
  setStats(stats: RunStats): void { this.report.stats = stats; }
  addCandidate(c: { id: string; title: string; niveau: Level; categorie: Category; media: string }): void { this.report.candidates.push(c); }
  finish(): Report {
    this.endStage();
    this.report.finishedAt = new Date().toISOString();
    return this.report;
  }
  get alerts(): string[] { return this.report.alerts; }
  get rejections(): Rejection[] { return this.report.rejected; }

  /** Rapport lisible pour `npm run harvest -- --dry-run`. */
  static toText(r: Report): string {
    const L: string[] = [];
    L.push(`=== True Good News — pipeline du ${r.date}${r.dryRun ? " (dry-run, rien n'est écrit)" : ""} ===`);
    L.push(`Début ${r.startedAt} · fin ${r.finishedAt ?? "?"}`);
    L.push("");
    L.push("Étapes :");
    for (const s of r.stages) {
      L.push(`  ${s.name.padEnd(14)} ${String(s.in).padStart(5)} → ${String(s.out).padStart(5)}   (${(s.ms / 1000).toFixed(1)} s)`);
      for (const n of s.notes) L.push(`      · ${n}`);
    }
    if (r.stats) {
      const s = r.stats;
      L.push("");
      L.push(`Analysées : ${s.analysees} articles · ${s.pays} pays · ${s.langues} langues · flux ${s.flux_ok} ok / ${s.flux_echec} en échec · GDELT ${s.gdelt_ok ? "ok" : "indisponible"}`);
      L.push(`Clusters : ${s.clusters} · corroborés : ${s.corroborees} · qualifiés : ${s.qualifiees}`);
    }
    if (r.alerts.length) {
      L.push("");
      L.push("Alertes :");
      for (const a of r.alerts) L.push(`  ! ${a}`);
    }
    L.push("");
    L.push(`Candidates proposées (${r.candidates.length}) :`);
    r.candidates.forEach((c, i) => L.push(`  ${String(i + 1).padStart(2)}. [${c.niveau === "confirme" ? "Confirmé" : "Bien corroboré"}] [${c.categorie}] ${c.title}  — ${c.media}`));
    const byStage = new Map<string, Rejection[]>();
    for (const rj of r.rejected) { const a = byStage.get(rj.stage) ?? []; a.push(rj); byStage.set(rj.stage, a); }
    L.push("");
    L.push(`Écartées (${r.rejected.length}) :`);
    for (const [stage, list] of byStage) {
      const reasons = new Map<string, number>();
      for (const rj of list) reasons.set(rj.reason, (reasons.get(rj.reason) ?? 0) + 1);
      L.push(`  ${stage} : ${list.length}`);
      for (const [reason, n] of [...reasons.entries()].sort((a, b) => b[1] - a[1])) L.push(`      ${String(n).padStart(4)}  ${reason}`);
      const samples = list.filter((x) => !/^(hors fenetre|doublon|agregateur)/.test(x.reason)).slice(0, 12);
      for (const rj of samples) L.push(`         - ${rj.title.slice(0, 90)}  [${rj.reason}]`);
    }
    return L.join("\n");
  }
}
