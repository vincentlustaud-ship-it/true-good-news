/** Propriétaires, agrégateurs, agences, sources primaires : tout ce qui sert à compter « une rédaction ». */
import ownership from "../data/ownership.json" with { type: "json" };
import aggregators from "../data/aggregators.json" with { type: "json" };
import agencies from "../data/agencies.json" with { type: "json" };
import primary from "../data/primary-domains.json" with { type: "json" };
import feeds from "../data/feeds.json" with { type: "json" };
import { domainOf, fold, jaccard, tokens } from "./text.ts";

const domainToOwner = new Map<string, string>();
for (const [owner, domains] of Object.entries(ownership as Record<string, string[] | string>)) {
  if (owner.startsWith("_") || !Array.isArray(domains)) continue;
  for (const d of domains) domainToOwner.set(d.toLowerCase(), owner);
}
for (const f of feeds as Array<{ url: string; owner: string }>) {
  const d = domainOf(f.url);
  if (d && !domainToOwner.has(d)) domainToOwner.set(d, f.owner);
}
const feedNameByDomain = new Map<string, string>();
const feedCountryByDomain = new Map<string, string>();
for (const f of feeds as Array<{ url: string; name: string; country: string }>) {
  const d = domainOf(f.url);
  if (d && !feedNameByDomain.has(d)) { feedNameByDomain.set(d, f.name.replace(/\s*\(.*\)$/, "")); feedCountryByDomain.set(d, f.country); }
}

const AGG = (aggregators as { domains: string[] }).domains.map((d) => d.toLowerCase());
const PRIMARY = (primary as { institutions: Array<{ domain: string; name: string; type: string }> }).institutions;
const TLDS = (primary as { tld_patterns: string[] }).tld_patterns;
const AGENCIES = (agencies as { agencies: Array<{ owner: string; names: string[] }> }).agencies;

function suffixMatch(domain: string, candidates: Iterable<string>): string | null {
  let best: string | null = null;
  for (const c of candidates) {
    if (domain === c || domain.endsWith("." + c)) if (!best || c.length > best.length) best = c;
  }
  return best;
}

/** Propriétaire d'un domaine : groupe connu, sinon le domaine enregistrable lui-même. */
export function ownerOf(domain: string): string {
  const m = suffixMatch(domain, domainToOwner.keys());
  if (m) return domainToOwner.get(m)!;
  return registrable(domain);
}

export function registrable(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  const second = parts[parts.length - 2]!;
  const tld = parts[parts.length - 1]!;
  const ccSld = new Set(["co", "com", "org", "net", "gov", "ac", "edu", "go", "or", "ne", "gob", "gouv", "press"]);
  if (tld.length === 2 && ccSld.has(second) && parts.length >= 3) return parts.slice(-3).join(".");
  return parts.slice(-2).join(".");
}

export function isAggregator(domain: string): boolean {
  return suffixMatch(domain, AGG) !== null;
}

export function primarySourceFor(domain: string): { type: string; nom: string } | null {
  const m = suffixMatch(domain, PRIMARY.map((p) => p.domain));
  if (m) { const p = PRIMARY.find((x) => x.domain === m)!; return { type: p.type, nom: p.name }; }
  for (const t of TLDS) if (domain.endsWith(t)) return { type: "institution", nom: domain };
  return null;
}

export const DOI_RE = /\b10\.\d{4,9}\/[^\s"'<>)]+/i;

/** Nom lisible d'un média à partir de son domaine (flux connu, sinon domaine). */
export function mediaNameFor(domain: string): string {
  const m = suffixMatch(domain, feedNameByDomain.keys());
  if (m) return feedNameByDomain.get(m)!;
  return domain;
}
export function mediaCountryFor(domain: string): string | null {
  const m = suffixMatch(domain, feedCountryByDomain.keys());
  return m ? feedCountryByDomain.get(m)! : null;
}

function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

/**
 * Reprise de dépêche : titre quasi identique à un autre article du cluster ET mention d'une
 * agence dans le texte, alors la source compte pour l'agence.
 */
export function agencyReprint(title: string, summary: string | null, otherTitles: string[]): string | null {
  const text = `${title} ${summary ?? ""}`;
  let agency: string | null = null;
  for (const a of AGENCIES) {
    const hit = a.names.some((n) =>
      n.length <= 3
        ? new RegExp(`(^|[\\s(\\[/—-])${escapeRe(n)}([\\s)\\]/:,.—-]|$)`).test(text)
        : fold(text).includes(fold(n)),
    );
    if (hit) { agency = a.owner; break; }
  }
  if (!agency) return null;
  const mine = tokens(title);
  const near = otherTitles.some((t) => jaccard(mine, tokens(t)) >= 0.7);
  return near ? agency : null;
}
