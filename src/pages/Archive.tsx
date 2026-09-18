import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useLang } from "../lib/lang.tsx";
import { formatLongDate, formatShortDate } from "../../shared/format.ts";
import { StoryRow } from "../components/Story.tsx";
import { Calendar, ChevronLeft, ChevronRight } from "../components/Icons.tsx";
import { useNews, useCountViews } from "./Today.tsx";

export default function Archive() {
  const { lang, t } = useLang();
  const { date } = useParams();
  const navigate = useNavigate();
  const valid = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const state = useNews(valid);
  useCountViews(state.status === "ready" ? state.data : null);
  useEffect(() => { document.title = `${t.archiveTitle} — ${t.siteName}`; }, [t]);

  const data = state.status === "ready" ? state.data : null;
  const current = data?.date ?? valid;
  return (
    <>
      <div className="archive-head">
        <h1>{t.archiveTitle}</h1>
        <span className="grow" />
        <span className="archive-head__note">{t.archiveNote}</span>
      </div>
      {current && (
        <div className="datenav">
          {data?.prev ? (
            <Link to={`/archive/${data.prev}`} className="datenav__side" aria-label={t.prevDay}><ChevronLeft /><span className="datenav__label">{formatShortDate(data.prev, lang)}</span></Link>
          ) : <span className="datenav__side" aria-disabled="true"><ChevronLeft /><span className="datenav__label">{t.prevDay}</span></span>}
          <span className="grow" />
          <label className="datenav__pick">
            <Calendar stroke="currentColor" />
            <span className="datenav__long">{formatLongDate(current, lang)}</span>
            <span className="datenav__short">{formatShortDate(current, lang)} {current.slice(0, 4)}</span>
            <input type="date" aria-label={t.pickDate} value={current} max={data?.latest ?? undefined} onChange={(e) => { if (e.target.value) navigate(`/archive/${e.target.value}`); }} />
          </label>
          <span className="grow" />
          {data?.next ? (
            <Link to={`/archive/${data.next}`} className="datenav__side" aria-label={t.nextDay}><span className="datenav__label">{formatShortDate(data.next, lang)}</span><ChevronRight /></Link>
          ) : <span className="datenav__side" aria-disabled="true"><span className="datenav__label">{t.nextDay}</span><ChevronRight /></span>}
        </div>
      )}
      {state.status === "loading" && <p className="empty">{t.loading}</p>}
      {state.status === "error" && <p className="empty">{t.loadError}</p>}
      {data && !data.stories.length && <p className="empty">{valid ? t.nothingThatDay : t.nothingYet}</p>}
      {data && data.stories.length > 0 && (
        <>
          <p className="dateline__note">{t.verifiedOn(data.stories.length)}</p>
          <div className="rows">
            {data.stories.map((s) => <StoryRow key={s.id} story={s} views={data.views[s.id]} />)}
          </div>
        </>
      )}
    </>
  );
}
