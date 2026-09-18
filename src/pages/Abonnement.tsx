import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { api, ApiError } from "../lib/api.ts";
import { useLang } from "../lib/lang.tsx";

export default function Abonnement() {
  const { lang, t } = useLang();
  const [params] = useSearchParams();
  const etat = params.get("etat");
  const [email, setEmail] = useState("");
  const [mailLang, setMailLang] = useState<"fr" | "en">(lang);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "unavailable" | "error">("idle");
  useEffect(() => { document.title = `${t.subscribeTitle} — ${t.siteName}`; }, [t]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try { await api.subscribe(email, mailLang); setStatus("sent"); }
    catch (err) { setStatus(err instanceof ApiError && err.status === 503 ? "unavailable" : "error"); }
  }

  return (
    <div className="prose">
      <h1>{t.subscribeTitle}</h1>
      <p className="lede">{t.subscribeIntro}</p>
      {etat === "confirme" && <p className="form__msg">{t.subscribeConfirmed}</p>}
      {etat === "desabonne" && <p className="form__msg">{t.subscribeUnsubscribed}</p>}
      {etat === "invalide" && <p className="form__msg form__msg--error">{t.subscribeInvalid}</p>}
      {status === "sent" ? <p className="form__msg">{t.subscribeSent}</p> : (
        <form className="form" onSubmit={submit}>
          <label htmlFor="email">{t.emailLabel}</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <span className="form__legend" id="lang-legend" style={{ fontSize: 13, fontWeight: 700 }}>{t.langLabel}</span>
          <div className="radios" role="radiogroup" aria-labelledby="lang-legend">
            <label><input type="radio" name="lang" value="fr" checked={mailLang === "fr"} onChange={() => setMailLang("fr")} /> Français</label>
            <label><input type="radio" name="lang" value="en" checked={mailLang === "en"} onChange={() => setMailLang("en")} /> English</label>
          </div>
          {status === "unavailable" && <p className="form__msg form__msg--error">{t.subscribeUnavailable}</p>}
          {status === "error" && <p className="form__msg form__msg--error">{t.subscribeError}</p>}
          <div><button type="submit" className="btn" disabled={status === "sending"}>{t.subscribeButton}</button></div>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{t.subscribeNote}</p>
        </form>
      )}
    </div>
  );
}
