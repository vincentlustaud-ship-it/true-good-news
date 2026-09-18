/**
 * Fabrique les fixtures de `fixtures/` (données d'exemple pour `npm run dev` et `npm run shots`).
 * Ce sont des DONNÉES DE MAQUETTE, reprises des maquettes validées de design/preview/ : elles ne sont jamais
 * servies en production et ne prétendent pas être des nouvelles vérifiées.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import type { CandidatesFile, PublishedFile, Report, Story, Category, Level } from "../agents/types.ts";

interface Def { fr: string; en: string; orig: string; lang: string; cat: Category; level: Level; n: number; p: number; media: string; domain: string; country: string; places: string[]; summaryFr: string; summaryEn: string; primary?: string; hoursAgo: number; image?: boolean }

const NOW = Date.parse("2026-09-18T06:00:00Z");
let seq = 0;
function story(d: Def, date: string): Story {
  seq++;
  const id = (0x1000000000000000n + BigInt(seq) * 0x9e3779b97f4a7c15n).toString(16).slice(-16).padStart(16, "0");
  const publishedAt = new Date(NOW - d.hoursAgo * 3600_000).toISOString();
  const url = `https://${d.domain}/exemple/${seq}`;
  const countries = ["US", "GB", "FR", "DE", "ES", "BR", "IN", "JP", "KE", "AU", "CA", "CH"].slice(0, d.p);
  const sources = Array.from({ length: d.n }, (_, i) => ({
    titre: i === 0 ? d.orig : `${d.orig} (reprise ${i + 1})`, url: i === 0 ? url : `https://media-${i}.example/${seq}/${i}`,
    media: i === 0 ? d.media : `Média ${i + 1}`, pays: countries[i % countries.length]!, langue: i === 0 ? d.lang : ["en", "fr", "es", "de", "pt"][i % 5]!,
    date: new Date(NOW - (d.hoursAgo + i) * 3600_000).toISOString(), proprietaire: i === 0 ? d.media.toLowerCase().replace(/\s+/g, "-") : `media-${i}`, via: (i === 0 ? "rss" : "gdelt") as "rss" | "gdelt",
  }));
  const machine = d.lang !== "fr";
  return {
    id, category: d.cat,
    original: { title: d.orig, summary: d.lang === "fr" ? d.summaryFr : d.lang === "en" ? d.summaryEn : d.summaryEn, lang: d.lang, url },
    fr: { title: d.fr, summary: d.summaryFr, machine },
    en: { title: d.en, summary: d.summaryEn, machine: d.lang !== "en" },
    translation: { provider: machine ? "deepl" : null, note: null },
    media: { name: d.media, domain: d.domain, country: d.country },
    publishedAt,
    image: d.image === false ? null : { url: `https://picsum.photos/seed/tgn${seq}/900/600`, source: "og" },
    imageStatus: d.image === false ? "absent" : "ok",
    places: d.places,
    evidence: {
      niveau: d.level, redactions_independantes: d.n, pays: d.p, sources,
      source_primaire: d.primary ? { type: "institution", nom: d.primary, url } : null,
      factcheck: { interroge: true, resultats: [], dementi: false },
      calcule_le: `${date}T04:03:00Z`,
      details: { proprietaires: sources.map((s) => s.proprietaire), pays_liste: countries, agregateurs_ecartes: 1, reprises_agence: 0, requete_recoupement: null, gdelt_interroge: true, plafonne_sans_factcheck: false },
    },
    qualification: { universelle: true, bonne_nouvelle: true, categorie: d.cat, raison_courte: "Bénéfice concret et mesuré, décrit dans le texte, sans parti pris.", exclusions_declenchees: [], doute: false, pays_cites: d.places, modele: "fixture", evalue_le: `${date}T04:02:00Z` },
    fingerprint: d.en.toLowerCase().split(/\W+/).filter((w) => w.length > 3).sort(),
  };
}

const D18: Def[] = [
  { fr: "Le ver de Guinée n'a plus infecté qu'une poignée de personnes cette année", en: "Guinea worm cases reach historic low", orig: "Guinea worm cases reach historic low", lang: "en", cat: "Santé", level: "confirme", n: 9, p: 6, media: "The Carter Center", domain: "cartercenter.org", country: "US", places: ["TD", "ET", "SS"], summaryFr: "Le parasite touchait 3,5 millions de personnes par an dans les années 1980. La campagne d'éradication menée avec les communautés locales le ramène aujourd'hui à quelques cas humains recensés dans le monde.", summaryEn: "The parasite affected 3.5 million people a year in the 1980s. The eradication campaign led with local communities has brought it down to a handful of human cases recorded worldwide.", primary: "The Carter Center", hoursAgo: 6 },
  { fr: "Les gorilles de montagne dépassent le millier d'individus", en: "Mountain gorilla numbers pass 1,000", orig: "Mountain gorilla numbers pass 1,000", lang: "en", cat: "Nature", level: "confirme", n: 7, p: 5, media: "UICN", domain: "iucn.org", country: "CH", places: ["RW", "UG", "CD"], summaryFr: "Seule espèce de grand singe dont la population augmente, portée par la protection des habitats et les patrouilles anti-braconnage.", summaryEn: "The only great ape species whose population is growing, driven by habitat protection and anti-poaching patrols.", primary: "UICN", hoursAgo: 9 },
  { fr: "La couche d'ozone est en voie de résorption complète", en: "Ozone layer on track to recover", orig: "Ozone layer on track to recover", lang: "en", cat: "Science", level: "confirme", n: 12, p: 8, media: "PNUE", domain: "unep.org", country: "KE", places: [], summaryFr: "Les experts mandatés par l'ONU confirment que le trou antarctique devrait se refermer d'ici le milieu du siècle si les engagements tiennent.", summaryEn: "UN-mandated experts confirm the Antarctic hole should close by mid-century if commitments hold.", primary: "PNUE", hoursAgo: 11 },
  { fr: "Le vaccin antipaludique R21 déployé dans de nouveaux pays", en: "R21 malaria vaccine rollout expands", orig: "R21 malaria vaccine rollout expands", lang: "en", cat: "Santé", level: "confirme", n: 10, p: 7, media: "OMS", domain: "who.int", country: "CH", places: [], summaryFr: "Après la recommandation de l'OMS, les premières campagnes de vaccination de masse ciblent les enfants des zones les plus exposées.", summaryEn: "Following the WHO recommendation, the first mass vaccination campaigns target children in the most exposed areas.", primary: "Organisation mondiale de la santé", hoursAgo: 13, image: false },
  { fr: "Les baleines bleues sont de retour autour de la Géorgie du Sud", en: "Blue whales return to South Georgia", orig: "Blue whales return to South Georgia", lang: "en", cat: "Océans", level: "bien_corrobore", n: 4, p: 3, media: "British Antarctic Survey", domain: "bas.ac.uk", country: "GB", places: ["GS"], summaryFr: "Quasiment disparues de la zone après la chasse industrielle, elles y sont à nouveau observées régulièrement par les campagnes scientifiques.", summaryEn: "Almost gone from the area after industrial whaling, they are once again regularly observed by scientific surveys.", hoursAgo: 15 },
  { fr: "Une ville portugaise rend ses transports gratuits pour tous ses habitants", en: "Portuguese city makes public transport free for all residents", orig: "Cidade portuguesa torna transportes gratuitos", lang: "pt", cat: "Société", level: "bien_corrobore", n: 5, p: 2, media: "Público", domain: "publico.pt", country: "PT", places: ["PT"], summaryFr: "La gratuité totale s'applique depuis ce mois-ci à l'ensemble du réseau municipal, après un an d'expérimentation.", summaryEn: "Full free fares apply from this month to the whole municipal network, after a year of trial.", hoursAgo: 17 },
  { fr: "Une équipe japonaise restaure la mobilité après une lésion médullaire", en: "Japanese team restores mobility after spinal cord injury", orig: "脊髄損傷の患者が歩行を回復", lang: "ja", cat: "Science", level: "confirme", n: 8, p: 6, media: "NHK", domain: "nhk.or.jp", country: "JP", places: ["JP"], summaryFr: "Deux patients sur quatre ont retrouvé une marche assistée après une greffe de cellules souches reprogrammées, selon l'essai clinique publié.", summaryEn: "Two out of four patients regained assisted walking after a transplant of reprogrammed stem cells, according to the published clinical trial.", primary: "Université de Keio", hoursAgo: 19 },
  { fr: "La forêt atlantique brésilienne regagne du terrain pour la première fois", en: "Brazil's Atlantic Forest grows back for the first time", orig: "Mata Atlântica volta a crescer", lang: "pt", cat: "Nature", level: "bien_corrobore", n: 6, p: 4, media: "Folha de S.Paulo", domain: "folha.uol.com.br", country: "BR", places: ["BR"], summaryFr: "Le suivi satellitaire annuel enregistre un gain net de couvert forestier, une première depuis le début des mesures.", summaryEn: "Annual satellite monitoring records a net gain in forest cover, a first since measurements began.", hoursAgo: 21 },
  { fr: "Un programme de cataracte rend la vue à des milliers de personnes âgées", en: "Cataract programme restores sight to thousands of elderly people", orig: "मोतियाबिंद कार्यक्रम से हज़ारों को दृष्टि", lang: "hi", cat: "Santé", level: "bien_corrobore", n: 4, p: 3, media: "The Hindu", domain: "thehindu.com", country: "IN", places: ["IN"], summaryFr: "Les opérations gratuites menées dans les districts ruraux ont rendu la vue à plus de dix mille patients depuis janvier, selon le bilan publié.", summaryEn: "Free operations in rural districts have restored sight to more than ten thousand patients since January, according to the published tally.", hoursAgo: 23 },
  { fr: "Un réseau de bibliothèques mobiles dessert les zones rurales isolées", en: "Mobile library network reaches isolated rural areas", orig: "Мобильные библиотеки добрались до сёл", lang: "ru", cat: "Culture", level: "bien_corrobore", n: 3, p: 3, media: "Agence locale", domain: "example-kz.org", country: "KZ", places: ["KZ"], summaryFr: "Douze véhicules aménagés desservent désormais chaque semaine des villages sans bibliothèque, avec des prêts gratuits.", summaryEn: "Twelve fitted vehicles now serve villages without a library every week, with free loans.", hoursAgo: 25, image: false },
];

const D17: Def[] = [
  { fr: "Le Népal a doublé sa population de tigres sauvages", en: "Nepal doubled its wild tiger population", orig: "नेपालमा बाघको संख्या दोब्बर", lang: "ne", cat: "Nature", level: "confirme", n: 8, p: 6, media: "WWF Népal", domain: "wwfnepal.org", country: "NP", places: ["NP"], summaryFr: "Le recensement national compte 355 tigres, contre 121 en 2009, résultat de la protection des corridors et de la lutte contre le braconnage.", summaryEn: "The national census counts 355 tigers, up from 121 in 2009, the result of corridor protection and anti-poaching efforts.", primary: "WWF", hoursAgo: 30 },
  { fr: "L'Égypte franchit une étape décisive contre l'hépatite C", en: "Egypt reaches a decisive milestone against hepatitis C", orig: "Egypt reaches a decisive milestone against hepatitis C", lang: "en", cat: "Santé", level: "confirme", n: 11, p: 7, media: "OMS", domain: "who.int", country: "CH", places: ["EG"], summaryFr: "Le pays est le premier à atteindre le statut « en voie d'élimination » après avoir dépisté et traité des dizaines de millions de personnes.", summaryEn: "The country is the first to reach 'on the path to elimination' status after screening and treating tens of millions of people.", primary: "Organisation mondiale de la santé", hoursAgo: 32 },
  { fr: "Le condor de Californie revole au-dessus des forêts du nord-ouest", en: "California condor flies again over the northwest forests", orig: "California condor flies again over the northwest forests", lang: "en", cat: "Nature", level: "confirme", n: 6, p: 4, media: "Yurok Tribe", domain: "yuroktribe.org", country: "US", places: ["US"], summaryFr: "Les premiers oiseaux relâchés il y a trois ans ont niché avec succès, une première dans la région depuis plus d'un siècle.", summaryEn: "The first birds released three years ago have nested successfully, a first in the region in over a century.", hoursAgo: 34, image: false },
  { fr: "Une greffe de cornée artificielle rend la vue à des patients aveugles", en: "Artificial cornea transplant restores sight to blind patients", orig: "Artificial cornea transplant restores sight to blind patients", lang: "en", cat: "Science", level: "bien_corrobore", n: 4, p: 3, media: "The Lancet", domain: "thelancet.com", country: "GB", places: [], summaryFr: "Les vingt patients de l'essai ont recouvré une acuité visuelle mesurable un an après l'implantation, sans rejet.", summaryEn: "All twenty trial patients regained measurable visual acuity one year after implantation, with no rejection.", hoursAgo: 36 },
  { fr: "Un village isolé de l'Himalaya est raccordé à l'eau potable", en: "An isolated Himalayan village is connected to drinking water", orig: "An isolated Himalayan village is connected to drinking water", lang: "en", cat: "Société", level: "bien_corrobore", n: 3, p: 3, media: "The Hindu", domain: "thehindu.com", country: "IN", places: ["IN"], summaryFr: "Après deux ans de travaux, 600 habitants disposent d'un point d'eau permanent à moins de cent mètres de chez eux.", summaryEn: "After two years of work, 600 residents have a permanent water point less than a hundred metres from home.", hoursAgo: 38 },
];

function stats(analysed: number) { return { analysees: analysed, pays: 41, langues: 19, flux_ok: 168, flux_echec: 2, gdelt_ok: true, clusters: 180, corroborees: 24, qualifiees: 31 }; }

mkdirSync("fixtures", { recursive: true });
const c18 = D18.map((d) => story(d, "2026-09-18"));
const candidates: CandidatesFile = { date: "2026-09-18", generatedAt: "2026-09-18T04:06:00Z", stats: stats(214), alerts: [], candidates: c18 };
const published18: PublishedFile = { date: "2026-09-18", publishedAt: "2026-09-18T06:41:00Z", stats: stats(214), stories: c18.slice(0, 5) };
const s17 = D17.map((d) => story(d, "2026-09-17"));
s17[1]!.corrections = [{ date: "2026-09-18", texte: "Le communiqué initial parlait d'« élimination » ; l'OMS précise qu'il s'agit du statut « en voie d'élimination ». Le titre a été conservé tel que publié." }];
const published17: PublishedFile = { date: "2026-09-17", publishedAt: "2026-09-17T06:38:00Z", stats: stats(198), stories: s17 };
const report: Report = {
  date: "2026-09-18", startedAt: "2026-09-18T04:00:02Z", finishedAt: "2026-09-18T04:06:00Z", dryRun: false,
  stages: [
    { name: "collecte:rss", in: 170, out: 2260, notes: ["flux en échec : Prensa Libre (XML illisible)", "flux en échec : Positivr (pas de réponse)"], ms: 14800 },
    { name: "collecte:gdelt", in: 13, out: 2440, notes: [], ms: 70400 },
    { name: "collecte:social", in: 0, out: 37, notes: ["Reddit : ignoré (REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET absents)"], ms: 3600 },
    { name: "collecte:dedup", in: 4737, out: 214, notes: ["2 liens d'agrégateurs écartés"], ms: 40 },
    { name: "recoupement:clusters", in: 214, out: 180, notes: [], ms: 120 },
    { name: "recoupement:local", in: 180, out: 22, notes: [], ms: 300 },
    { name: "qualification", in: 180, out: 31, notes: ["modèle : claude-opus-5"], ms: 96000 },
    { name: "recoupement:gdelt", in: 31, out: 24, notes: ["31 requêtes GDELT de recoupement (0 sans réponse), 19 clusters renforcés"], ms: 165000 },
    { name: "edition", in: 31, out: 10, notes: ["24 éligibles, 10 retenues, 14 écartées pour diversité"], ms: 20 },
    { name: "traduction", in: 10, out: 10, notes: ["10 pages Open Graph lues, 0 refusées par robots.txt, 8 nouvelles traduites"], ms: 8200 },
  ],
  rejected: [
    { stage: "qualification", title: "Le parti au pouvoir remporte les élections municipales", url: "https://example.org/1", reason: "non universelle : Politique" },
    { stage: "qualification", title: "La bourse de Tokyo bat un record historique", url: "https://example.org/2", reason: "non universelle : Économique partisan" },
    { stage: "qualification", title: "Un plan de 2 milliards annoncé pour les hôpitaux", url: "https://example.org/3", reason: "benefice non concret ou non advenu" },
    { stage: "edition", title: "Un nouveau parc national inauguré au Chili", url: "https://example.org/4", reason: "corroboration insuffisante (2 redactions, 1 pays)" },
    { stage: "edition", title: "Une nouvelle campagne contre la polio au Pakistan", url: "https://example.org/5", reason: "diversite : deja 2 en Santé" },
  ],
  alerts: [], stats: stats(214),
  candidates: c18.map((s) => ({ id: s.id, title: s.fr!.title, niveau: s.evidence.niveau, categorie: s.category, media: s.media.name })),
};
const banner = { _fixture: "Données de maquette (design/preview), jamais servies en production." };
writeFileSync("fixtures/candidates-2026-09-18.json", JSON.stringify({ ...banner, ...candidates }, null, 2));
writeFileSync("fixtures/published-2026-09-18.json", JSON.stringify({ ...banner, ...published18 }, null, 2));
writeFileSync("fixtures/published-2026-09-17.json", JSON.stringify({ ...banner, ...published17 }, null, 2));
writeFileSync("fixtures/report-2026-09-18.json", JSON.stringify({ ...banner, ...report }, null, 2));
console.log("fixtures écrites");
