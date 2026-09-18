/** Normalisation de texte pour le recoupement lexical. Aucune génération : que des transformations. */
import stop from "../data/stopwords.json" with { type: "json" };

const STOP = new Set((stop as { words: string[] }).words.map((w) => fold(w)));

export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function stripHtml(input: string | undefined | null): string {
  if (!input) return "";
  return decodeEntities(
    String(input)
      .replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

const ENT: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", hellip: "…",
  ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ucirc: "û", icirc: "î", acirc: "â",
  euml: "ë", iuml: "ï", uuml: "ü", ouml: "ö", auml: "ä", ntilde: "ñ", oacute: "ó", aacute: "á", iacute: "í", uacute: "ú", szlig: "ß",
};
export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeChar(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeChar(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
}
function safeChar(cp: number): string { try { return String.fromCodePoint(cp); } catch { return ""; } }

/** Jetons normalisés (sans mots vides, au moins 3 caractères sauf nombres). */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Thai}]/u;

export function tokens(s: string): string[] {
  const out: string[] = [];
  for (const raw of fold(s).split(/[^\p{L}\p{N}\p{M}]+/u)) {
    if (!raw) continue;
    if (STOP.has(raw)) continue;
    if (CJK.test(raw)) {
      // Écritures sans espaces : bigrammes de caractères, mots vides exclus.
      const chars = [...raw].filter((c) => !STOP.has(c));
      if (chars.length === 1) { out.push(chars[0]!); continue; }
      for (let i = 0; i + 1 < chars.length; i++) out.push(chars[i]! + chars[i + 1]!);
      continue;
    }
    if (raw.length < 3 && !/^\d+$/.test(raw)) continue;
    out.push(raw);
  }
  return out;
}

/**
 * « Termes forts » : noms propres (mots capitalisés hors début de phrase), nombres, sigles.
 * Ils survivent en partie aux changements de langue et servent aux requêtes de recoupement.
 */
export function strongTerms(title: string): string[] {
  const words = title.replace(/[«»"“”‘’'`]/g, " ").split(/\s+/).filter(Boolean);
  const out = new Set<string>();
  words.forEach((w, i) => {
    const clean = w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!clean) return;
    const isNumber = /^\d[\d.,]*$/.test(clean) && clean.length >= 2;
    const isAcronym = /^[A-Z][A-Z0-9-]{1,}$/.test(clean) && clean.length <= 8;
    const isProper = /^\p{Lu}/u.test(clean) && clean.length >= 3 && i > 0 && !STOP.has(fold(clean));
    if (isNumber || isAcronym || isProper) out.add(clean);
  });
  return [...out].slice(0, 6);
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a), B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export function sharedCount(a: Iterable<string>, b: Iterable<string>): number {
  const B = new Set(b);
  let n = 0;
  for (const x of new Set(a)) if (B.has(x)) n++;
  return n;
}

/** Empreinte stable d'un sujet (anti-répétition 14 jours) : jetons + termes forts triés. */
export function fingerprint(title: string): string[] {
  const t = new Set<string>(tokens(title));
  for (const s of strongTerms(title)) t.add(fold(s));
  return [...t].sort();
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(" ");
  return (i > max * 0.6 ? cut.slice(0, i) : cut).trimEnd() + "…";
}

export function domainOf(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, "").replace(/^amp\./, "").toLowerCase(); } catch { return null; }
}

export function stableId(...parts: string[]): string {
  // FNV-1a en deux moitiés : suffisant pour un identifiant de publication.
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = parts.join("|");
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
