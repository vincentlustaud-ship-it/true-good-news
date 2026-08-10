import { useEffect, useMemo, useState } from "react";
import { DICTIONARY, LANG_LABELS, LANGS, LOCALE_TAGS, type Lang } from "./i18n";
import type { NewsItem, NewsResponse } from "./types";
import "./App.css";

const LANG_STORAGE_KEY = "bonnesnouvelles-lang";

function detectDefaultLang(): Lang {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && (LANGS as readonly string[]).includes(stored)) return stored as Lang;
  const browser = navigator.language.slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(browser) ? (browser as Lang) : "fr";
}

function translateUrl(link: string, lang: Lang): string {
  return `https://translate.google.com/translate?sl=auto&tl=${lang}&u=${encodeURIComponent(link)}`;
}

type LoadState = "loading" | "ready" | "error";

export default function App() {
  const [lang, setLang] = useState<Lang>(detectDefaultLang);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const t = DICTIONARY[lang];

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  async function loadNews() {
    setState("loading");
    try {
      const res = await fetch("/api/news");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: NewsResponse = await res.json();
      setItems(data.items);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    loadNews();
  }, []);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALE_TAGS[lang], {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [lang],
  );

  function formatTime(iso: string): string {
    return new Intl.DateTimeFormat(LOCALE_TAGS[lang], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-top">
          <h1>{t.appTitle}</h1>
          <select
            className="lang-select"
            aria-label={t.languageLabel}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
          >
            {LANGS.map((l) => (
              <option key={l} value={l}>
                {LANG_LABELS[l]}
              </option>
            ))}
          </select>
        </div>
        <p className="tagline">{t.tagline}</p>
        <div className="today-row">
          <span className="today-label">{todayLabel}</span>
          <button className="refresh-btn" onClick={loadNews}>
            {t.refreshLabel}
          </button>
        </div>
      </header>

      <main className="feed">
        {state === "loading" && <p className="status-msg">{t.loading}</p>}
        {state === "error" && <p className="status-msg error">{t.errorMsg}</p>}
        {state === "ready" && items.length === 0 && (
          <p className="status-msg">{t.emptyMsg}</p>
        )}
        {state === "ready" &&
          items.map((item) => (
            <article className="card" key={item.id}>
              <div className="card-meta">
                <span className="card-source">
                  {t.sourceLabel}: {item.source}
                </span>
                <time dateTime={item.publishedAt}>{formatTime(item.publishedAt)}</time>
              </div>
              <h2 className="card-title">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </h2>
              {item.summary && <p className="card-summary">{item.summary}</p>}
              <div className="card-links">
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {t.readArticle}
                </a>
                <a href={translateUrl(item.link, lang)} target="_blank" rel="noopener noreferrer">
                  {t.translateLink}
                </a>
              </div>
            </article>
          ))}
      </main>

      <footer className="footer">
        <p>{t.footerNote}</p>
      </footer>
    </div>
  );
}
