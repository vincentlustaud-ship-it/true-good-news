// Page « Comment nous vérifions » : méthode (FIABILITE.md), collecte (SOURCES.md) et limites (BRIEF.md), écrites noir sur blanc.
export const VERIFICATION_MD = {
  fr: `# Comment nous vérifions

Chaque matin, un pipeline automatique collecte la presse mondiale, regroupe les articles qui parlent du même événement, compte les rédactions indépendantes qui le rapportent, interroge les fact-checkeurs et applique la charte éditoriale. Il en sort 10 candidates avec leurs preuves. Un humain en choisit 5. Rien ne se publie tout seul.

## Aucune source n'est exclue a priori

Ni par son nom, ni par sa ligne éditoriale, ni par son pays. Ce qui est évalué, c'est **l'information**, pas le média qui la porte. Nos sources : le projet de recherche ouvert GDELT, qui indexe la presse mondiale en continu dans une soixantaine de langues, et une liste de flux directs (agences et institutions, médias généralistes de tous les continents, journalisme de solutions), tous vérifiés avant d'être ajoutés.

## Pourquoi pas de pourcentage

Un « 94 % de fiabilité » serait un chiffre arbitraire déguisé en mesure : personne ne peut calculer la probabilité qu'un fait soit vrai. Ce qu'on peut faire, honnêtement, c'est **compter les preuves et les montrer**. Chaque nouvelle affiche donc combien de rédactions indépendantes, dans combien de pays, la rapportent, et ce que disent les fact-checkeurs. Les sources sont cliquables.

## Les trois niveaux

| Niveau | Conditions cumulatives | Publiable |
|---|---|---|
| **Confirmé** | au moins 5 rédactions indépendantes · au moins 3 pays · aucun démenti · au moins une source primaire identifiable (institution, étude, communiqué officiel) | oui, prioritaire |
| **Bien corroboré** | au moins 3 rédactions indépendantes · au moins 2 pays · aucun démenti | oui |
| **Insuffisant** | en dessous | jamais proposé, jamais publié |

## Ce que « rédaction indépendante » veut dire

- Comptage **par propriétaire**, pas par titre : cinq journaux du même groupe de presse comptent pour un.
- Une reprise de dépêche d'agence sans travail propre compte pour l'agence, pas pour le média qui la republie.
- Un agrégateur (Google News, Yahoo, MSN, Flipboard…) ne compte jamais comme rédaction.
- Un réseau social ne compte **jamais** comme source : il sert seulement au repérage.

## Fact-check

Nous interrogeons l'API Google Fact Check Tools, qui agrège les fact-checkeurs certifiés IFCN dans le monde entier, dans la langue d'origine et en anglais. Un verdict correspondant de type faux, trompeur, altéré ou fabriqué écarte la candidate automatiquement. **« Aucun démenti » n'est pas une preuve de vérité** : c'est seulement l'absence de démenti connu, et nous ne le formulons jamais autrement. Quand le fact-check n'a pas pu être interrogé, aucune nouvelle ne peut dépasser « Bien corroboré ».

## Source primaire

Nous cherchons, dans le texte et les liens des articles corroborants, la trace de l'origine : DOI d'une étude, communiqué d'une institution (OMS, ONU, UICN, agence spatiale, ministère, université…), rapport. Quand elle est trouvée, elle est affichée en premier dans les preuves. C'est ce qui sépare « beaucoup de monde en parle » de « c'est établi ».

## La charte éditoriale

Une nouvelle n'est publiable que si une personne de n'importe quel pays, culture, religion ou opinion politique peut la recevoir comme une bonne nouvelle. Cette charte est appliquée par un modèle de langage sous consigne stricte, qui ne juge que le texte réellement récupéré et n'ajoute rien. Le doute écarte. [Lire la charte](/charte).

## Ce que nous récupérons d'un article, et rien de plus

Le titre, un résumé court (celui que l'éditeur publie lui-même), l'image officielle en lien direct, l'URL, la date, le média, le pays et la langue. Jamais le texte intégral, jamais une image réhébergée, jamais un contenu derrière un paywall. Nous lisons et respectons le robots.txt de chaque site avant tout accès. Quand une traduction est affichée, elle est automatique (DeepL) et signalée comme telle ; le lien renvoie toujours à l'original.

## Ce que cette méthode ne sait pas faire

À dire noir sur blanc :

- Elle ne détecte pas une erreur reprise en chœur par toute la presse mondiale.
- Elle ne détecte pas un fait vrai mais mal interprété.
- Elle favorise mécaniquement les sujets internationaux : une bonne nouvelle locale a peu de sources, donc un niveau de corroboration faible.
- Elle dépend de sources accessibles : les pays où la presse est peu présente en ligne sont sous-représentés.
- Les réseaux sociaux fermés (X, Facebook, Instagram, TikTok) nous sont inaccessibles : leurs API sont fermées ou payantes et le scraping viole leurs conditions. Ce n'est pas un choix éditorial, c'est une limite d'accès. Nous ne consultons que Bluesky, Mastodon et Reddit, et uniquement pour repérer des liens.
- « Universelle » reste un jugement humain à la marge.

C'est précisément pour cela qu'un humain valide chaque publication, tous les jours. Et si une nouvelle publiée est démentie après coup, nous ne l'effaçons pas : un bandeau de correction daté s'ajoute sur la page d'archive, et les deux états sont conservés. La transparence inclut nos erreurs.
`,
  en: `# How we verify

Every morning, an automated pipeline collects the world's press, groups the articles that cover the same event, counts the independent newsrooms reporting it, queries fact-checkers and applies the editorial charter. It produces 10 candidates with their evidence. A human picks 5. Nothing is published on its own.

## No source is excluded a priori

Neither by its name, nor by its editorial line, nor by its country. What is evaluated is **the information**, not the outlet carrying it. Our sources: the open research project GDELT, which indexes the world's press continuously in some sixty languages, and a list of direct feeds (agencies and institutions, general-interest media from every continent, solutions journalism), each verified before being added.

## Why no percentage

A "94% reliability" would be an arbitrary number disguised as a measurement: nobody can compute the probability that a fact is true. What we can honestly do is **count the evidence and show it**. Each story therefore displays how many independent newsrooms, in how many countries, report it, and what fact-checkers say. The sources are clickable.

## The three levels

| Level | Cumulative conditions | Publishable |
|---|---|---|
| **Confirmed** | at least 5 independent newsrooms · at least 3 countries · no denial · at least one identifiable primary source (institution, study, official statement) | yes, with priority |
| **Well corroborated** | at least 3 independent newsrooms · at least 2 countries · no denial | yes |
| **Insufficient** | below | never proposed, never published |

## What "independent newsroom" means

- Counted **by owner**, not by title: five newspapers from the same media group count as one.
- A wire-agency story republished without original work counts for the agency, not for the outlet republishing it.
- An aggregator (Google News, Yahoo, MSN, Flipboard…) never counts as a newsroom.
- A social network **never** counts as a source: it only serves to spot links.

## Fact-check

We query the Google Fact Check Tools API, which aggregates IFCN-certified fact-checkers worldwide, in the original language and in English. A matching verdict of the false, misleading, altered or fabricated kind automatically sets the candidate aside. **"No denial" is not proof of truth**: it is only the absence of a known denial, and we never phrase it otherwise. When the fact-check could not be queried, no story can exceed "Well corroborated".

## Primary source

We look, in the text and links of corroborating articles, for the trace of the origin: the DOI of a study, a statement from an institution (WHO, UN, IUCN, a space agency, a ministry, a university…), a report. When found, it is shown first among the evidence. This is what separates "many people are talking about it" from "it is established".

## The editorial charter

A story is publishable only if a person from any country, culture, religion or political opinion can receive it as good news. This charter is applied by a language model under strict instructions, which judges only the text actually retrieved and adds nothing. Doubt sets aside. [Read the charter](/charte).

## What we retrieve from an article, and nothing more

The headline, a short summary (the one the publisher itself provides), the official image as a direct link, the URL, the date, the outlet, the country and the language. Never the full text, never a re-hosted image, never content behind a paywall. We read and respect each site's robots.txt before any access. When a translation is displayed, it is automatic (DeepL) and labelled as such; the link always leads to the original.

## What this method cannot do

Stated plainly:

- It does not detect an error repeated in chorus by the entire world press.
- It does not detect a true fact that is misinterpreted.
- It mechanically favours international topics: a local good news story has few sources, hence a weak corroboration level.
- It depends on accessible sources: countries where the press has little online presence are under-represented.
- Closed social networks (X, Facebook, Instagram, TikTok) are inaccessible to us: their APIs are closed or paid and scraping violates their terms. This is not an editorial choice but an access limit. We only consult Bluesky, Mastodon and Reddit, and only to spot links.
- "Universal" remains, at the margin, a human judgement.

This is precisely why a human validates every publication, every day. And if a published story is denied afterwards, we do not delete it: a dated correction banner is added on the archive page, and both states are kept. Transparency includes our mistakes.
`,
};
