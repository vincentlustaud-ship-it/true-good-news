import { useEffect } from "react";
import { useLang } from "../lib/lang.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { CHARTE_MD } from "../content/charte.fr.generated.ts";
import { CHARTE_EN_MD } from "../content/charte.en.ts";
import { VERIFICATION_MD } from "../content/verification.ts";
import { CONFIDENTIALITE_MD } from "../content/confidentialite.ts";

function TextPage({ fr, en, title }: { fr: string; en: string; title: { fr: string; en: string } }) {
  const { lang, t } = useLang();
  useEffect(() => { document.title = `${title[lang]} — ${t.siteName}`; }, [lang, t, title]);
  return (
    <div className="prose">
      <Markdown source={lang === "fr" ? fr : en} />
    </div>
  );
}

export function Charte() {
  const { lang } = useLang();
  return (
    <div className="prose">
      {lang === "en" && <p className="notice">The charter is written and applied in French. This English version is a translation provided for readers; the French text prevails.</p>}
      <TextPage fr={CHARTE_MD} en={CHARTE_EN_MD} title={{ fr: "Charte éditoriale", en: "Editorial charter" }} />
    </div>
  );
}
export function Verification() { return <TextPage fr={VERIFICATION_MD.fr} en={VERIFICATION_MD.en} title={{ fr: "Comment nous vérifions", en: "How we verify" }} />; }
export function Confidentialite() { return <TextPage fr={CONFIDENTIALITE_MD.fr} en={CONFIDENTIALITE_MD.en} title={{ fr: "Confidentialité", en: "Privacy" }} />; }
