import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UiLang } from "../../shared/format.ts";
import { dict, type Dict } from "../i18n.ts";

const KEY = "tgn-lang";

function detect(): UiLang {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "fr" || stored === "en") return stored;
  } catch { /* stockage indisponible */ }
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "fr";
}

interface Ctx { lang: UiLang; t: Dict; setLang: (l: UiLang) => void }
const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<UiLang>(detect);
  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  }, [lang]);
  const value = useMemo<Ctx>(() => ({ lang, t: dict(lang), setLang: setLangState }), [lang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("LangProvider manquant");
  return c;
}
