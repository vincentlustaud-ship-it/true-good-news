import { useEffect, useState } from "react";
import { api, type NewsResponse } from "../lib/api.ts";
import { useLang } from "../lib/lang.tsx";
import { formatLongDate } from "../../shared/format.ts";
import { HeroStory, StoryCard } from "../components/Story.tsx";
import { MobileSubscribe } from "../components/Chrome.tsx";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: NewsResponse };

export function useNews(date?: string | null): State {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    api.news(date).then((data) => { if (alive) setState({ status: "ready", data }); }).catch((e) => {
      if (!alive) return;
      if (e?.status === 404) setState({ status: "ready", data: { date: date ?? null, latest: null, prev: null, next: null, stats: null, stories: [], views: {} } });
      else setState({ status: "error" });
    });
    return () => { alive = false; };
  }, [date]);
  return state;
}

/** Un seul compteur d'affichages par sélection et par session de navigation (sessionStorage, local, sans cookie). */
export function useCountViews(data: NewsResponse | null) {
  useEffect(() => {
    if (!data?.date || !data.stories.length) return;
    const key = `tgn-viewed-${data.date}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    void api.view(data.stories.map((s) => s.id));
  }, [data]);
}

export default function Today() {
  const { lang, t } = useLang();
  const state = useNews(null);
  useCountViews(state.status === "ready" ? state.data : null);
  useEffect(() => { document.title = `${t.siteName} — ${t.tagline}`; }, [t]);

  if (state.status === "loading") return <p className="empty">{t.loading}</p>;
  if (state.status === "error") return <p className="empty">{t.loadError}</p>;
  const { data } = state;
  if (!data.date || !data.stories.length) return <p className="empty">{t.nothingYet}</p>;
  const [hero, ...rest] = data.stories;
  const n = data.stories.length;
  return (
    <>
      <div className="dateline">
        <span className="dateline__date">{formatLongDate(data.date, lang)}</span>
        <span className="grow" />
        <span className="dateline__note dateline__note--long">{data.stats?.analysees ? t.verifiedTodayLong(n, data.stats.analysees) : t.verifiedToday(n)}</span>
        <span className="dateline__note dateline__note--short">{t.verifiedToday(n)}</span>
      </div>
      <HeroStory story={hero!} views={data.views[hero!.id]} />
      {rest.length > 0 && (
        <div className="grid">
          {rest.map((s) => <StoryCard key={s.id} story={s} views={data.views[s.id]} />)}
        </div>
      )}
      <MobileSubscribe />
    </>
  );
}
