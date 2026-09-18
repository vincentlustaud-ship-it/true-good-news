/** En-tête, navigation, pied de page : conformes à Main.html / Mobile.html. */
import { Link, NavLink } from "react-router";
import { useLang } from "../lib/lang.tsx";
import { Logo, Shield } from "./Icons.tsx";
import { CONTACT_EMAIL } from "../config.ts";

export function Header() {
  const { lang, t, setLang } = useLang();
  return (
    <header className="site-header">
      <div className="site-header__row">
        <Link to="/" className="brand" aria-label={t.siteName}>
          <Logo size={28} />
          <span className="brand__name">{t.siteName}</span>
        </Link>
        <span className="grow" />
        <nav className="nav" aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"}>
          <NavLink to="/" end className="nav__link">{t.navToday}</NavLink>
          <NavLink to="/archive" className="nav__link">{t.navArchive}</NavLink>
          <NavLink to="/verification" className="nav__link">{t.navVerification}</NavLink>
          <span className="lang-toggle" role="group" aria-label={lang === "fr" ? "Langue" : "Language"}>
            <button type="button" aria-pressed={lang === "fr"} onClick={() => setLang("fr")} lang="fr">FR</button>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en">EN</button>
          </span>
          <Link to="/abonnement" className="btn">{t.subscribeCta}</Link>
        </nav>
      </div>
      <div className="rule" />
      <nav className="mobile-nav" aria-label={lang === "fr" ? "Navigation" : "Navigation"}>
        <NavLink to="/" end>{t.navToday}</NavLink>
        <NavLink to="/archive">{t.navArchive}</NavLink>
        <NavLink to="/verification">{t.navVerification}</NavLink>
      </nav>
    </header>
  );
}

export function Footer() {
  const { t } = useLang();
  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <span className="pill-ok"><Shield size={14} />{t.noAds}</span>
        <span className="site-footer__note">{t.noAi}</span>
      </div>
      <div className="site-footer__row site-footer__links">
        <Link to="/verification">{t.navVerification}</Link>
        <span className="site-footer__sep">|</span>
        <Link to="/charte">{t.navCharte}</Link>
        <span className="site-footer__sep">|</span>
        <Link to="/confidentialite">{t.navPrivacy}</Link>
        <span className="site-footer__sep">|</span>
        <a href={`mailto:${CONTACT_EMAIL}`}>{t.navContact}</a>
        <span className="grow" />
        <span className="site-footer__small">{t.humanPick}</span>
      </div>
    </footer>
  );
}

export function MobileSubscribe() {
  const { t } = useLang();
  return (
    <div className="subscribe-cta">
      <Link to="/abonnement" className="btn">{t.subscribeCtaLong}</Link>
      <p>{t.subscribeNote}</p>
    </div>
  );
}
