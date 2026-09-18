/**
 * Espace de validation (Admin.html) : 10 candidates, tu en choisis 5, tu publies.
 * Rien n'est publié tant que la sélection n'est pas confirmée ici. Route noindex, jamais liée depuis le site.
 */
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { CandidatesFile, PublishedFile, Report, Story } from "../../agents/types.ts";
import { api, ApiError } from "../lib/api.ts";
import { useLang } from "../lib/lang.tsx";
import { categoryLabel, countryName, formatLongDate, levelLabel, translatedFromLabel, untranslatedLabel } from "../../shared/format.ts";
import { Badge, EvidenceList, StoryImage } from "../components/Story.tsx";
import { Check, Lock, Shield } from "../components/Icons.tsx";
import "../admin.css";

type Data = { date: string; today: string; candidates: CandidatesFile | null; report: Report | null; published: PublishedFile | null; candidateDates: string[]; publishedDates: string[] };

function useNoIndex() {
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    document.title = "Validation — True Good News";
    document.body.classList.add("admin");
    return () => { m.remove(); document.body.classList.remove("admin"); };
  }, []);
}

function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const id = useId();
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { await api.admin.login(pw); onDone(); }
    catch (e2) { setErr(e2 instanceof ApiError ? e2.message : "erreur"); }
    finally { setBusy(false); }
  }
  return (
    <form className="admin-login" onSubmit={submit}>
      <span className="admin-bar__tag" style={{ color: "var(--accent)" }}><Lock />Espace de validation — privé</span>
      <h1>Connexion</h1>
      <label htmlFor={id}>Mot de passe<input id={id} type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required /></label>
      {err && <p className="admin-alert">{err}</p>}
      <div><button type="submit" className="btn" disabled={busy}>Entrer</button></div>
    </form>
  );
}

function Candidate({ story, selected, discarded, onToggle, onDiscard }: { story: Story; selected: boolean; discarded: boolean; onToggle: () => void; onDiscard: () => void }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  const evId = useId();
  const ev = story.evidence;
  const q = story.qualification;
  const title = story.fr?.title ?? story.original.title;
  const isTranslated = !!story.fr?.machine;
  const tr = translatedFromLabel(story, "fr") ?? untranslatedLabel(story, "fr");
  return (
    <div className={`cand${selected ? " cand--selected" : ""}${discarded ? " cand--discarded" : ""}`}>
      <input type="checkbox" id={id} checked={selected} disabled={discarded} onChange={onToggle} aria-label={`Retenir : ${title}`} />
      <label htmlFor={id} className="cand__box" aria-hidden="true">{selected && <Check size={15} stroke="#fff" />}</label>
      <StoryImage story={story} />
      <div className="cand__body">
        <div className="cand__row">
          <span className="chip">{categoryLabel(story.category, lang)}</span>
          <Badge story={story} />
          <span>{ev.redactions_independantes} rédactions indépendantes · {ev.pays} pays · {ev.factcheck.interroge ? (ev.factcheck.dementi ? "DÉMENTI" : "aucun démenti") : "fact-check non interrogé"}</span>
          <button type="button" className="evidence__toggle" style={{ fontSize: 12 }} aria-expanded={open} aria-controls={evId} onClick={() => setOpen((o) => !o)}>{open ? "Masquer les sources" : "Voir les sources"}</button>
        </div>
        <h3 className="cand__title"><label htmlFor={id} style={{ cursor: "pointer" }}>{title}</label></h3>
        <div className="cand__row">
          {isTranslated && <span className="cand__orig">« {story.original.title} »</span>}
          {isTranslated && <span>·</span>}
          {tr && <span className="translated" style={{ color: "var(--accent)", fontWeight: 700 }}>{tr}</span>}
          {tr && <span>·</span>}
          <span>{story.media.name}{story.media.country ? ` (${countryName(story.media.country, "fr")})` : ""}</span>
          <span>·</span>
          <a href={story.original.url} target="_blank" rel="noopener noreferrer">Article original</a>
        </div>
        <div className="cand__charte">
          <Check size={13} stroke="var(--ok-tx)" />
          <span><strong>Charte respectée</strong> — {q.raison_courte || "universelle, sans enjeu politique, religieux ni moral"}{q.pays_cites.length ? ` · pays cités : ${q.pays_cites.map((c) => countryName(c, "fr")).join(", ")}` : ""}</span>
        </div>
        {story.translation.note && <p className="cand__row">{story.translation.note}</p>}
        {open && <EvidenceList story={story} id={evId} />}
      </div>
      <button type="button" className="cand__discard" onClick={onDiscard}>{discarded ? "Reprendre" : "Écarter"}</button>
    </div>
  );
}

function ReportView({ report }: { report: Report }) {
  const byStage = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    for (const r of report.rejected) { const s = m.get(r.stage) ?? new Map(); s.set(r.reason, (s.get(r.reason) ?? 0) + 1); m.set(r.stage, s); }
    return m;
  }, [report]);
  return (
    <details className="admin-section">
      <summary>Rapport du pipeline — {report.stages.length} étapes, {report.rejected.length} écartées{report.alerts.length ? `, ${report.alerts.length} alerte(s)` : ""}</summary>
      {report.alerts.length > 0 && report.alerts.map((a, i) => <p key={i} className="admin-alert">{a}</p>)}
      <table>
        <thead><tr><th>Étape</th><th>Entrée</th><th>Sortie</th><th>Durée</th><th>Notes</th></tr></thead>
        <tbody>
          {report.stages.map((s) => <tr key={s.name}><td>{s.name}</td><td>{s.in}</td><td>{s.out}</td><td>{(s.ms / 1000).toFixed(1)} s</td><td className="muted">{s.notes.join(" · ")}</td></tr>)}
        </tbody>
      </table>
      {[...byStage.entries()].map(([stage, reasons]) => (
        <details key={stage}>
          <summary style={{ fontSize: 13 }}>{stage} : {[...reasons.values()].reduce((a, b) => a + b, 0)} écartées</summary>
          <table>
            <tbody>
              {[...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => <tr key={reason}><td>{n}</td><td className="muted">{reason}</td></tr>)}
            </tbody>
          </table>
          <table>
            <tbody>
              {report.rejected.filter((r) => r.stage === stage && !/^(hors fenetre|doublon|agregateur)/.test(r.reason)).slice(0, 40).map((r, i) => (
                <tr key={i}><td>{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a> : r.title}</td><td className="muted">{r.reason}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </details>
  );
}

function PublishedView({ published, date, onUpdated }: { published: PublishedFile; date: string; onUpdated: (p: PublishedFile) => void }) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function addCorrection(id: string) {
    const texte = (texts[id] ?? "").trim();
    if (!texte) return;
    setBusy(id);
    try {
      const r = await api.admin.correction(date, id, texte);
      onUpdated({ ...published, stories: published.stories.map((s) => (s.id === id ? { ...s, corrections: r.corrections } : s)) });
      setTexts((t) => ({ ...t, [id]: "" }));
    } finally { setBusy(null); }
  }
  return (
    <details className="admin-section" open>
      <summary>Publié le {formatLongDate(date, "fr")} à {new Date(published.publishedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} — {published.stories.length} nouvelles en ligne</summary>
      <p className="muted" style={{ fontSize: 13 }}>Une nouvelle démentie après coup ne s'efface pas : on ajoute un bandeau de correction daté, et les deux états sont conservés.</p>
      <div className="pub-list">
        {published.stories.map((s) => (
          <div className="pub-item" key={s.id}>
            <h3>{s.fr?.title ?? s.original.title}</h3>
            <p className="muted" style={{ fontSize: 12 }}>{levelLabel(s.evidence.niveau, "fr")} · {s.evidence.redactions_independantes} rédactions · {s.evidence.pays} pays · {s.media.name}</p>
            {(s.corrections ?? []).map((c, i) => <p key={i} className="correction"><strong>Correction du {formatLongDate(c.date, "fr")} :</strong> {c.texte}</p>)}
            <form className="corr-form" onSubmit={(e) => { e.preventDefault(); void addCorrection(s.id); }}>
              <label htmlFor={`corr-${s.id}`} style={{ fontSize: 12, fontWeight: 700 }}>Ajouter une correction datée</label>
              <textarea id={`corr-${s.id}`} value={texts[s.id] ?? ""} onChange={(e) => setTexts((t) => ({ ...t, [s.id]: e.target.value }))} maxLength={1000} />
              <div><button type="submit" className="btn btn--ghost" disabled={busy === s.id || !(texts[s.id] ?? "").trim()}>Publier la correction</button></div>
            </form>
          </div>
        ))}
      </div>
    </details>
  );
}

export default function Admin() {
  useNoIndex();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [discarded, setDiscarded] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  async function load(d: string | null) {
    setError(null);
    try {
      const r = await api.admin.candidates(d);
      setData(r); setAuthed(true); setSelected(new Set()); setDiscarded(new Set()); setConfirming(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuthed(false);
      else setError(e instanceof Error ? e.message : "erreur");
    }
  }
  useEffect(() => { void load(date); }, [date]);

  if (authed === false) return <div className="admin-page"><Login onDone={() => void load(date)} /></div>;
  if (!data) return <div className="admin-page"><p className="empty">{error ?? "Chargement…"}</p></div>;

  const cands = data.candidates?.candidates ?? [];
  const stats = data.candidates?.stats;
  const count = selected.size;
  const canPublish = count === 5 && !publishing;

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < 5) n.add(id); return n; });
    setConfirming(false);
  }
  function discard(id: string) {
    setDiscarded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
  }
  async function publish(replace: boolean) {
    setPublishing(true); setMessage(null);
    try {
      const r = await api.admin.publish(data!.date, [...selected], replace);
      setMessage({ kind: "ok", text: `Sélection publiée (${data!.date}). ${r.email.skipped ? "Email non renvoyé (remplacement)." : r.email.ok ? "Envoi de l'email aux abonnés lancé." : "Envoi de l'email en attente : il sera retenté au prochain cycle."}` });
      await load(data!.date);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setMessage({ kind: "warn", text: "Cette journée est déjà publiée. Confirmer à nouveau pour la remplacer par cette sélection." });
      else setMessage({ kind: "warn", text: e instanceof Error ? e.message : "erreur" });
    } finally { setPublishing(false); setConfirming(false); }
  }
  async function rerun() {
    setMessage(null);
    try { await api.admin.run(data!.date); setMessage({ kind: "ok", text: "Pipeline relancé en arrière-plan : les candidates apparaîtront dans quelques minutes (recharger la page)." }); }
    catch (e) { setMessage({ kind: "warn", text: e instanceof Error ? e.message : "erreur" }); }
  }
  const alreadyPublished = !!data.published;
  const dates = [...new Set([...data.candidateDates, ...data.publishedDates, data.today])].sort().reverse();

  return (
    <div className="admin-page">
      <div className="admin-bar">
        <span className="admin-bar__tag"><Lock />Espace de validation — privé</span>
        <span className="admin-bar__date">{formatLongDate(data.date, "fr")}</span>
        <span className="grow" />
        <span className="admin-bar__count">{count} / 5 sélectionnées</span>
        {confirming ? (
          <>
            <button type="button" className="btn" disabled={!canPublish} onClick={() => void publish(alreadyPublished)}>{alreadyPublished ? "Confirmer le remplacement" : "Confirmer la publication"}</button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>Annuler</button>
          </>
        ) : (
          <button type="button" className="btn" disabled={!canPublish} onClick={() => setConfirming(true)}>Publier la sélection</button>
        )}
      </div>

      <div className="admin-tools">
        <label htmlFor="admin-date">Journée</label>
        <select id="admin-date" value={data.date} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => <option key={d} value={d}>{d}{data.publishedDates.includes(d) ? " · publiée" : data.candidateDates.includes(d) ? " · candidates" : ""}</option>)}
        </select>
        <span className="grow" />
        <button type="button" onClick={() => void rerun()}>Relancer le pipeline</button>
        <span className="site-footer__sep">|</span>
        <button type="button" onClick={() => api.admin.logout().then(() => setAuthed(false))}>Quitter</button>
      </div>
      {message && <p className={`admin-alert${message.kind === "ok" ? " admin-alert--ok" : ""}`}>{message.text}</p>}
      {alreadyPublished && !message && <p className="admin-alert admin-alert--ok">Cette journée est déjà publiée. Une nouvelle publication la remplacerait.</p>}

      {data.candidates ? (
        <div className="admin-info">
          <span>
            <strong>{stats!.analysees.toLocaleString("fr-FR")} articles analysés ce matin dans {stats!.pays} pays et {stats!.langues} langues.</strong>{" "}
            {cands.length} passent le seuil de corroboration et la charte d'universalité — une bonne nouvelle qui vaut pour n'importe qui, n'importe où, sans enjeu politique, religieux ni moral. Rien n'est publié tant que tu n'as pas choisi les 5.
          </span>
        </div>
      ) : (
        <div className="admin-info"><span>Aucune candidate pour cette journée. {data.report ? "Le pipeline a tourné mais n'a rien proposé : voir le rapport ci-dessous." : "Le pipeline n'a pas encore tourné : « Relancer le pipeline » le déclenche à la main."}</span></div>
      )}
      {data.candidates?.alerts.map((a, i) => <p key={i} className="admin-alert">{a}</p>)}

      {cands.length > 0 && (
        <div className="cands">
          {cands.map((s) => <Candidate key={s.id} story={s} selected={selected.has(s.id)} discarded={discarded.has(s.id)} onToggle={() => toggle(s.id)} onDiscard={() => discard(s.id)} />)}
        </div>
      )}

      <div className="admin-note"><Shield size={14} /><span>Les candidates écartées restent archivées en interne pour la traçabilité, mais ne sont jamais publiées.</span></div>

      {data.published && <PublishedView published={data.published} date={data.date} onUpdated={(p) => setData({ ...data, published: p })} />}
      {data.report && <ReportView report={data.report} />}
    </div>
  );
}
