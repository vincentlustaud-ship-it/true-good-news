/** Carte de nouvelle : héros, carte de grille, ligne d'archive. Bloc de preuves sur chaque variante, sans exception. */
import { useId, useState } from "react";
import type { Story } from "../../agents/types.ts";
import { localize, categoryLabel, levelLabel, countryName, languageName, translatedFromLabel, untranslatedLabel, relativeTime, formatDayMonth, formatLongDate, type UiLang } from "../../shared/format.ts";
import { useLang } from "../lib/lang.tsx";
import { Check, Eye, External, Globe } from "./Icons.tsx";

export function Badge({ story }: { story: Story }) {
  const { lang } = useLang();
  const ok = story.evidence.niveau === "confirme";
  return <span className={`badge ${ok ? "badge--ok" : "badge--mid"}`}><Check size={13} />{levelLabel(story.evidence.niveau, lang)}</span>;
}

export function Places({ story }: { story: Story }) {
  const { lang } = useLang();
  if (!story.places.length) return null;
  return <span className="places">{story.places.map((c) => countryName(c, lang)).join(" · ")}</span>;
}

function translateUrl(url: string, lang: UiLang): string {
  return `https://translate.google.com/translate?sl=auto&tl=${lang}&u=${encodeURIComponent(url)}`;
}

export function EvidenceList({ story, id }: { story: Story; id: string }) {
  const { lang, t } = useLang();
  const ev = story.evidence;
  return (
    <div className="evidence-list" id={id}>
      <p className="evidence-list__head">{t.evidenceHead(ev.redactions_independantes, ev.pays)}</p>
      {ev.source_primaire && (
        <p className="evidence-list__primary"><strong>{t.primarySource}</strong> · {ev.source_primaire.nom} · <a href={ev.source_primaire.url} target="_blank" rel="noopener noreferrer">{ev.source_primaire.url.replace(/^https?:\/\//, "").slice(0, 60)}</a></p>
      )}
      <ol>
        {ev.sources.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.titre}</a>{" "}
            <span>— {s.media}{s.pays ? ` (${countryName(s.pays, lang)})` : ""}{s.langue ? ` · ${languageName(s.langue, lang)}` : ""}{s.date ? ` · ${formatDayMonth(s.date, lang)}` : ""}</span>
          </li>
        ))}
      </ol>
      <p className="evidence-list__fc">
        {ev.factcheck.interroge ? t.fcQueried(ev.factcheck.resultats.length) : t.fcNotQueried}
        {ev.factcheck.resultats.length > 0 && (
          <> {ev.factcheck.resultats.map((r) => <span key={r.url}> · <a href={r.url} target="_blank" rel="noopener noreferrer">{r.verificateur}</a> : {r.verdict}</span>)}</>
        )}
        {" "}· {t.computedOn} {formatLongDate(ev.calcule_le.slice(0, 10), lang)}.
      </p>
    </div>
  );
}

export function EvidenceBlock({ story, compact }: { story: Story; compact?: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const id = useId();
  const ev = story.evidence;
  const short = `${t.newsrooms(ev.redactions_independantes)} · ${t.countries(ev.pays)}`;
  const long = `${t.newsroomsIndep(ev.redactions_independantes)} · ${t.countries(ev.pays)} · ${ev.factcheck.interroge ? t.noDenial : t.notQueried}`;
  return (
    <>
      <div className="evidence">
        <Badge story={story} />
        {compact ? <span className="evidence__text">{short}</span> : <><span className="evidence__text evidence__text--long">{long}</span><span className="evidence__text evidence__text--short">{short}</span></>}
        <button type="button" className="evidence__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
          {open ? t.hideEvidence : t.seeEvidence}
        </button>
      </div>
      {open && <EvidenceList story={story} id={id} />}
    </>
  );
}

export function SourceLine({ story, views, absoluteDate }: { story: Story; views?: number; absoluteDate?: boolean }) {
  const { lang, t } = useLang();
  const translated = translatedFromLabel(story, lang);
  const untranslated = untranslatedLabel(story, lang);
  const when = absoluteDate && story.publishedAt ? formatDayMonth(story.publishedAt, lang) : relativeTime(story.publishedAt, lang);
  return (
    <div className="sourceline">
      <span className="with-icon"><Globe size={13} /><strong>{story.media.name}</strong>{story.media.country ? <>&nbsp;({countryName(story.media.country, lang)})</> : null}</span>
      <span className="sourceline__second">
        <span className="sep">·</span>
        <span>
          {translated && <span className="translated">{translated}</span>}
          {untranslated && <span className="translated" title={t.untranslatedHint}>{untranslated}</span>}
          {(translated || untranslated) && when ? " · " : ""}
          {when}
        </span>
        <span className="grow" />
        {typeof views === "number" && <span className="with-icon"><Eye size={13} />{t.views(views)}</span>}
      </span>
    </div>
  );
}

export function StoryImage({ story, hero }: { story: Story; hero?: boolean }) {
  const { t } = useLang();
  const caption = story.imageStatus === "robots" ? t.imageRobots : story.image ? (hero ? t.imageCaptionHero : t.imageCaption) : t.imageAbsent;
  return (
    <div className="card-img">
      {story.image && <img src={story.image.url} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      {story.image ? <span className="card-img__credit">{t.imageCredit}</span> : <span className="card-img__caption">{caption}</span>}
    </div>
  );
}

export function Corrections({ story }: { story: Story }) {
  const { lang, t } = useLang();
  if (!story.corrections?.length) return null;
  return (
    <>
      {story.corrections.map((c, i) => (
        <p className="correction" key={i}><strong>{t.correction} {formatLongDate(c.date, lang)} :</strong> {c.texte}</p>
      ))}
    </>
  );
}

function TranslateHint({ story }: { story: Story }) {
  const { lang, t } = useLang();
  if (untranslatedLabel(story, lang) == null) return null;
  return <p className="places"><a href={translateUrl(story.original.url, lang)} target="_blank" rel="noopener noreferrer">{t.translateExternally}</a></p>;
}

export function HeroStory({ story, views }: { story: Story; views?: number }) {
  const { lang, t } = useLang();
  const loc = localize(story, lang);
  return (
    <article className="hero" lang={loc.isOriginal && story.original.lang ? story.original.lang : lang}>
      <StoryImage story={story} hero />
      <div className="hero__body">
        <div className="chiprow"><span className="chip">{categoryLabel(story.category, lang)}</span><Places story={story} /></div>
        <h2 className="hero__title"><a href={story.original.url} target="_blank" rel="noopener noreferrer">{loc.title}</a></h2>
        {loc.summary && <p className="hero__summary">{loc.summary}</p>}
        <Corrections story={story} />
        <TranslateHint story={story} />
        <span className="grow" />
        <EvidenceBlock story={story} />
        <SourceLine story={story} views={views} />
        <div><a className="readlink" href={story.original.url} target="_blank" rel="noopener noreferrer">{t.readOriginal}<External size={14} /></a></div>
      </div>
    </article>
  );
}

export function StoryCard({ story, views }: { story: Story; views?: number }) {
  const { lang, t } = useLang();
  const loc = localize(story, lang);
  return (
    <article className="card" lang={loc.isOriginal && story.original.lang ? story.original.lang : lang}>
      <StoryImage story={story} />
      <div className="card__body">
        <div className="chiprow"><span className="chip">{categoryLabel(story.category, lang)}</span><Places story={story} /></div>
        <h3 className="card__title"><a href={story.original.url} target="_blank" rel="noopener noreferrer">{loc.title}</a></h3>
        {loc.summary && <p className="card__summary">{loc.summary}</p>}
        <Corrections story={story} />
        <TranslateHint story={story} />
        <span className="grow" />
        <EvidenceBlock story={story} compact />
        <SourceLine story={story} views={views} />
        <div><a className="readlink" href={story.original.url} target="_blank" rel="noopener noreferrer">{t.readOriginal}<External size={14} /></a></div>
      </div>
    </article>
  );
}

export function StoryRow({ story, views }: { story: Story; views?: number }) {
  const { lang, t } = useLang();
  const loc = localize(story, lang);
  const [open, setOpen] = useState(false);
  const id = useId();
  const ev = story.evidence;
  return (
    <article className="row" lang={loc.isOriginal && story.original.lang ? story.original.lang : lang}>
      <StoryImage story={story} />
      <div className="row__body">
        <div className="chiprow">
          <span className="chip">{categoryLabel(story.category, lang)}</span>
          <Badge story={story} />
          <span className="row__meta">{t.newsrooms(ev.redactions_independantes)} · {t.countries(ev.pays)}</span>
          <button type="button" className="evidence__toggle" style={{ fontSize: 12 }} aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>{open ? t.hideEvidence : t.seeEvidence}</button>
        </div>
        <h3 className="row__title"><a href={story.original.url} target="_blank" rel="noopener noreferrer">{loc.title}</a></h3>
        <Corrections story={story} />
        <SourceLine story={story} views={views} absoluteDate />
        {open && <EvidenceList story={story} id={id} />}
      </div>
      <a className="row__read" href={story.original.url} target="_blank" rel="noopener noreferrer">{t.read}<External size={14} /></a>
    </article>
  );
}
