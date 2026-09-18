# Sources — collecte mondiale et limites légales

## Colonne vertébrale : GDELT

[GDELT](https://www.gdeltproject.org/) est un projet de recherche ouvert qui indexe la presse
mondiale en continu, dans ~65 langues, avec traduction automatique, regroupement par événement et
score de tonalité. C'est ce qui rend « tous les pays » réaliste sans construire un crawler.

- API : `https://api.gdeltproject.org/api/v2/doc/doc?query=...&mode=artlist&format=json&timespan=24h`
- Gratuite, sans clé. Rester poli : ~1 requête / 5 s, User-Agent identifiable.
- Utiliser `tone>3` pour pré-filtrer le positif, croisé avec des thèmes (santé, environnement,
  science, développement) et des requêtes par langue.
- GDELT sert aussi au **recoupement** : les articles d'un même événement arrivent groupés.

⚠️ La tonalité GDELT est un signal de repérage, jamais un critère de publication. Un article au ton
positif peut parler d'une victoire militaire : c'est la charte éditoriale qui tranche, pas le score.

## Flux RSS / Atom directs

Une liste de départ à maintenir dans `data/feeds.json`, organisée par continent et par langue.
Vérifier que chaque flux existe et répond **avant** de l'ajouter — ne jamais inscrire une URL
supposée.

Trois familles à couvrir :

1. **Agences et institutions** (sources primaires fréquentes) : ONU et ses agences, OMS, UICN,
   agences spatiales, universités, revues scientifiques à flux ouvert.
2. **Médias généralistes de référence, tous continents et toutes langues** — sans sélection par
   ligne éditoriale. L'objectif est la couverture géographique, pas la conformité éditoriale.
3. **Journalisme de solutions** (utile pour le repérage) : Positive News, Good News Network, Reasons
   to be Cheerful, The Optimist Daily, et leurs équivalents francophones — Positivr, We Demain,
   Sparknews, la rubrique « bonnes nouvelles » de franceinfo. À vérifier flux par flux.

Les sources francophones natives sont prioritaires : elles évitent un aller-retour de traduction.

## Réseaux sociaux — repérage uniquement

Autorisés parce que leurs API sont ouvertes et gratuites :

- **Bluesky** (AT Protocol, API publique)
- **Mastodon** (API publique des instances)
- **Reddit** (API gratuite avec identifiants d'application)

Non accessibles : **X, Facebook, Instagram, TikTok, YouTube commentaires**. Leurs API sont fermées ou
payantes et le scraping viole leurs CGU. Ce n'est pas un choix éditorial de notre part, c'est une
limite d'accès — et elle doit être écrite telle quelle sur la page « Comment nous vérifions », pour
ne pas laisser croire à une sélection.

**Règle absolue** : une information repérée sur un réseau social n'est jamais publiée sur cette base.
Elle doit être corroborée par des rédactions selon `FIABILITE.md`, comme n'importe quelle autre.

## Ce qu'on récupère d'un article — et rien de plus

| Récupéré | Jamais |
|---|---|
| Titre | Texte intégral |
| Résumé court (description RSS ou `og:description`) | Article recopié ou reformulé longuement |
| `og:image` **en lien direct** (hotlink) | Image téléchargée et réhébergée |
| URL, date, média, pays, langue | Contenu derrière un paywall |

C'est le modèle des agrégateurs de presse légaux (Google News, Apple News) : on annonce et on
renvoie, on ne remplace pas.

## Règles de collecte

- Lire et respecter le `robots.txt` **avant** tout fetch d'une page (y compris pour les métadonnées
  Open Graph). Interdit ⇒ pas d'image, l'article reste publiable avec son seul lien.
- User-Agent explicite : `TrueGoodNews/1.0 (+https://truegoodnewstoday.com/robots)`.
- Un seul fetch par URL, mis en cache. Jamais de crawl de site.
- Timeout court, échec silencieux : une source qui ne répond pas ne bloque pas le pipeline.
- Ne jamais contourner un paywall, un mur de connexion ou une protection anti-bot. Si c'est fermé,
  c'est fermé.

## Attribution obligatoire, sur chaque nouvelle

Nom du média · pays · langue d'origine · mention « Traduit du [langue] » quand c'est le cas · date de
publication · lien vers l'article original. Sans exception, y compris dans l'email quotidien.
