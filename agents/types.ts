/** Types partagés par les cinq agents. Tout ce qui est stocké dans `candidates` et `published` est décrit ici. */

export type Category = "Santé" | "Science" | "Nature" | "Océans" | "Société" | "Culture";
export const CATEGORIES: Category[] = ["Santé", "Science", "Nature", "Océans", "Société", "Culture"];

export type Level = "confirme" | "bien_corrobore" | "insuffisant";

export type Via = "rss" | "gdelt" | "social";
export type FeedKind = "institution" | "media" | "solutions" | "agency" | "factcheck";

/** Un article tel que collecté : rien de plus que ce que SOURCES.md autorise. */
export interface RawArticle {
  url: string;
  title: string;
  summary: string | null;
  domain: string;
  lang: string | null;
  country: string | null;
  publishedAt: string | null;
  image: string | null;
  via: Via;
  feedName?: string;
  feedKind?: FeedKind;
  tone?: number | null;
  /** Pour le repérage social : réseau d'origine (jamais une source). */
  spottedOn?: "bluesky" | "mastodon" | "reddit";
}

export interface SourceRef {
  titre: string;
  url: string;
  media: string;
  pays: string | null;
  langue: string | null;
  date: string | null;
  proprietaire: string;
  via: Via;
}

export interface FactCheckHit {
  texte: string;
  verdict: string;
  verificateur: string;
  url: string;
  langue: string | null;
  date: string | null;
  dementi: boolean;
}

export interface Evidence {
  niveau: Level;
  redactions_independantes: number;
  pays: number;
  sources: SourceRef[];
  source_primaire: { type: string; nom: string; url: string } | null;
  factcheck: { interroge: boolean; resultats: FactCheckHit[]; dementi: boolean };
  calcule_le: string;
  details: {
    proprietaires: string[];
    pays_liste: string[];
    agregateurs_ecartes: number;
    reprises_agence: number;
    requete_recoupement: string | null;
    gdelt_interroge: boolean;
    plafonne_sans_factcheck: boolean;
  };
}

export interface Cluster {
  id: string;
  lead: RawArticle;
  members: RawArticle[];
  strong: string[];
  evidence?: Evidence;
  qualification?: Qualification;
}

export interface Qualification {
  universelle: boolean;
  bonne_nouvelle: boolean;
  categorie: Category | null;
  raison_courte: string;
  exclusions_declenchees: string[];
  doute: boolean;
  pays_cites: string[];
  modele: string;
  evalue_le: string;
  erreur?: string;
}

export interface LocalizedText {
  title: string;
  summary: string | null;
  /** true si produit par traduction automatique (DeepL), false si c'est le texte d'origine. */
  machine: boolean;
}

/** Une nouvelle telle que proposée à la validation puis publiée. */
export interface Story {
  id: string;
  category: Category;
  original: { title: string; summary: string | null; lang: string | null; url: string };
  fr: LocalizedText | null;
  en: LocalizedText | null;
  translation: { provider: "deepl" | null; note: string | null };
  media: { name: string; domain: string; country: string | null };
  publishedAt: string | null;
  image: { url: string; source: "og" | "rss" } | null;
  imageStatus: "ok" | "absent" | "robots" | "non_verifie";
  places: string[];
  evidence: Evidence;
  qualification: Qualification;
  fingerprint: string[];
  corrections?: Array<{ date: string; texte: string }>;
}

export interface RunStats {
  analysees: number;
  pays: number;
  langues: number;
  flux_ok: number;
  flux_echec: number;
  gdelt_ok: boolean;
  clusters: number;
  corroborees: number;
  qualifiees: number;
}

export interface CandidatesFile {
  date: string;
  generatedAt: string;
  stats: RunStats;
  alerts: string[];
  candidates: Story[];
}

export interface PublishedFile {
  date: string;
  publishedAt: string;
  stats: RunStats;
  stories: Story[];
}

export interface RecentTopic { date: string; id: string; title: string; fingerprint: string[] }

export interface Rejection { stage: string; title: string; url: string | null; reason: string }
export interface StageLog { name: string; in: number; out: number; notes: string[]; ms: number }

export interface Report {
  date: string;
  startedAt: string;
  finishedAt: string | null;
  dryRun: boolean;
  stages: StageLog[];
  rejected: Rejection[];
  alerts: string[];
  stats: RunStats | null;
  candidates: Array<{ id: string; title: string; niveau: Level; categorie: Category; media: string }>;
}
