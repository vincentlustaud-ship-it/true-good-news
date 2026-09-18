# True Good News

Cinq bonnes nouvelles vérifiées chaque matin, venues de n'importe quel pays, en français et en anglais, avec leurs
preuves de corroboration et le lien vers l'article d'origine. Choisies à la main parmi dix candidates que le
système a vérifiées seul pendant la nuit. **Rien ne se publie tout seul.**

Le cahier des charges est à la racine du dépôt : `BRIEF.md`, `CHARTE-EDITORIALE.md`, `FIABILITE.md`, `SOURCES.md`,
`ARCHITECTURE.md`, `SECURITE-CONFIDENTIALITE.md`, `DESIGN.md`. Les arbitrages pris en cours de route sont dans
`DECISIONS.md`.

## Pile

Vite + React 19 + TypeScript, PWA (`vite-plugin-pwa`), Netlify (fonctions v2, Blobs, fonction planifiée).
Aucune base de données, aucun conteneur, aucun script tiers côté client (polices auto-hébergées).

```
agents/     les cinq agents + orchestration (pipeline.ts) + rapport
lib/        stockage, HTTP poli (robots.txt, cache), GDELT, RSS, Open Graph, fact-check, DeepL, auth, email, abonnés
data/       flux vérifiés, propriétaires de médias, agrégateurs, agences, domaines primaires, requêtes GDELT
netlify/functions/   API publique, espace de validation, cron, envoi d'email
shared/     formatage commun site + fonctions (libellés, dates, pays, langues)
src/        le site (pages publiques, archive, transparence, abonnement, /admin)
scripts/    harvest (CLI), shots (captures), check-feeds, hash-password, build-fixtures
fixtures/   données de maquette pour le développement et les captures — jamais servies en production
```

## Commandes

```
npm install
npm run dev                      # site seul, API simulée sur les fixtures (TGN_MOCK=1)
npm run dev:netlify              # site + fonctions Netlify (TGN_STORAGE=fs pour écrire dans .data/)
npm run build                    # tsc -b (site + serveur) puis vite build
npm run harvest -- --dry-run     # pipeline complet sans écrire, rapport lisible en sortie
npm run harvest -- --date=2026-09-17         # rejoue une journée
npm run harvest -- --dry-run --save-raw      # enregistre la collecte brute dans .data/raw/<date>.json
npm run harvest -- --dry-run --replay        # rejoue depuis .data/raw/<date>.json (hors ligne)
npm run shots                    # captures 1280 + 390 de chaque page, email à 600, dans shots/
npm run check-feeds              # vérifie que chaque flux de data/feeds.json répond encore
npm run hash-password -- 'mot de passe'      # produit ADMIN_PASSWORD_HASH
```

Options utiles de `harvest` : `--skip-social`, `--skip-gdelt`, `--limit-feeds=N`, `--gdelt-queries=N`,
`--gdelt-max=N` (requêtes de recoupement), `--llm-max=N`, `--json`. `--skip-qualify` n'existe qu'avec `--dry-run`
pour tester les étapes suivantes sans clé : rien ne peut alors être proposé ni publié.

## L'architecture des agents

Tout s'exécute dans `harvest-background` (fonction d'arrière-plan, 15 minutes), déclenchée par le cron
`daily-harvest` à 04:00 UTC (06:00 Paris) ou à la main depuis `/admin`.

| # | Agent | Fichier | Entrée → sortie |
|---|---|---|---|
| 1 | Collecte | `agents/harvest.ts` | 170 flux RSS/Atom vérifiés + 13 requêtes GDELT (une toutes les 5 s) + repérage Bluesky / Mastodon / Reddit → articles bruts dédupliqués (titre, résumé court de l'éditeur, URL, date, média, pays, langue, image en lien) |
| 2 | Recoupement | `agents/corroborate.ts` | regroupement par événement (jetons + termes forts), comptage des rédactions **par propriétaire** (`data/ownership.json`), reprises d'agence, agrégateurs exclus, pays, source primaire, fact-check → niveau |
| 3 | Qualification | `agents/qualify.ts` | LLM sous `CHARTE-EDITORIALE.md`, sortie JSON contrainte, texte passé comme donnée délimitée, doute ⇒ écartée |
| 4 | Traduction | `agents/translate.ts` | DeepL FR/EN du titre et du résumé, métadonnées Open Graph si `robots.txt` l'autorise |
| 5 | Édition | `agents/edit.ts` | 10 candidates : max 2 par catégorie, 2 par pays, 1 par média ; tri niveau > pays > fraîcheur ; anti-répétition 14 jours |

Le recoupement se fait en deux passes (preuves locales pour tous, puis GDELT ciblé + fact-check pour les seules
qualifiées) et l'édition précède la traduction (voir `DECISIONS.md`). Chaque agent journalise ce qu'il écarte et
pourquoi ; le rapport est écrit dans `reports/<date>` et consultable en bas de `/admin`.

Sortie : `candidates/<date>` (privé). Jamais `published`.

## La validation quotidienne

1. `/admin` (route `noindex`, jamais liée) : mot de passe, cookie de session signé (8 h).
2. La journée du jour s'affiche : le résumé de la collecte, les 10 candidates avec badge, compte de rédactions et de
   pays, sources cliquables, titre d'origine, mention de traduction, justification de charte.
3. Cocher 5 candidates ; « Publier la sélection » s'active à 5 exactement, puis demande une confirmation.
4. Le serveur vérifie que les 5 identifiants appartiennent aux candidates de cette journée (il ne fait confiance à
   aucun paramètre client), écrit `published/<date>`, met à jour la liste des dates publiées et les empreintes
   anti-répétition, puis déclenche `daily-email-background`.
5. Une journée déjà publiée ne se remplace qu'avec une seconde confirmation explicite ; l'email n'est pas renvoyé.
6. Après coup, un bandeau de correction daté peut être ajouté sur une nouvelle publiée ; rien n'est effacé.

Les candidates non retenues restent dans `candidates/<date>` pour la traçabilité.

## La méthode de corroboration

Aucune source n'est exclue a priori. Pas de pourcentage : on compte les preuves et on les montre.

| Niveau | Conditions cumulatives |
|---|---|
| **Confirmé** | ≥ 5 rédactions indépendantes · ≥ 3 pays · aucun démenti · une source primaire (institution, étude, DOI, communiqué) · fact-check interrogé |
| **Bien corroboré** | ≥ 3 rédactions indépendantes · ≥ 2 pays · aucun démenti |
| **Insuffisant** | en dessous : jamais proposé |

- Rédaction indépendante = un **propriétaire** (`data/ownership.json`, enrichi par les flux) ; une dépêche d'agence
  reprise (titre quasi identique + mention de l'agence) compte pour l'agence ; les agrégateurs et les réseaux sociaux
  ne comptent jamais.
- Fact-check : Google Fact Check Tools, dans la langue d'origine et en anglais ; verdict faux / trompeur / altéré /
  fabriqué sur une affirmation liée ⇒ rejet, lien conservé. Sans clé, aucune candidate ne dépasse « Bien corroboré ».
- L'objet `evidence` est archivé tel quel avec chaque nouvelle publiée : sources (primaire en premier), pays,
  propriétaires, requête de recoupement, résultats du fact-check, date de calcul.

## Variables d'environnement

Sur Netlify : *Site settings → Environment variables*. En local : `.env` (jamais commité, modèle dans `.env.example`).

| Variable | Rôle | Absente |
|---|---|---|
| `ANTHROPIC_API_KEY` | qualification éditoriale (obligatoire) | pipeline arrêté avant toute proposition, alerte dans `/admin` |
| `QUALIFY_MODEL` | modèle (défaut `claude-opus-5`) | |
| `DEEPL_API_KEY` | traduction FR/EN (clé `…:fx` = API gratuite) | contenu en langue d'origine, mention « Non traduit », lien de traduction externe |
| `GOOGLE_FACTCHECK_API_KEY` | fact-check | niveau plafonné à « Bien corroboré » |
| `RESEND_API_KEY`, `EMAIL_FROM` | email quotidien et confirmation | publication maintenue, envoi mis en attente et retenté au cycle suivant ; abonnement indisponible (503) |
| `ADMIN_PASSWORD_HASH` | hash bcrypt (`npm run hash-password`) | `/admin` inaccessible |
| `SESSION_SECRET` | signature du cookie de session et des appels internes cron → arrière-plan | idem |
| `SITE_URL` | base des liens de confirmation et de désabonnement | `URL` de Netlify |
| `CONTACT_EMAIL` | adresse de contact | `contact@truegoodnewstoday.com` |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | repérage Reddit | Reddit ignoré |
| `TGN_STORAGE=fs`, `TGN_DATA_DIR` | forcer le stockage fichier (`.data/`) hors Netlify | |

GDELT, Bluesky et Mastodon n'ont pas de clé. Les clés ne sont lues que dans les fonctions serveur.

## Déploiement

```
netlify init          # une fois
netlify deploy --prod
```

`netlify.toml` fixe le build (`npm run build` → `dist/`), le bundler esbuild des fonctions, le cron, les routes
`/api/*`, la réécriture SPA et les en-têtes de sécurité (CSP sans script tiers, HSTS, `no-referrer`, `X-Robots-Tag`
sur `/admin`). Les stores Netlify Blobs (`candidates`, `published`, `views`, `subscribers`, `tokens`, `state`,
`reports`) sont créés à la première écriture.

Premier matin : vérifier dans `/admin` le rapport (« Rapport du pipeline ») — en particulier les notes GDELT et
réseaux sociaux — puis publier.

## Ce que le site ne fait pas

Aucun compte, commentaire, like, partage, publicité, analytics, pixel, cookie. Un compteur d'affichages par
nouvelle, sans IP ni cookie. La seule donnée personnelle est l'adresse des abonnés (double opt-in, désabonnement en
un clic qui supprime l'enregistrement, en-têtes `List-Unsubscribe` / `List-Unsubscribe-Post`).

## Limites connues

- La méthode ne détecte ni une erreur reprise par toute la presse, ni un fait vrai mal interprété. Elle favorise
  les sujets internationaux ; les pays peu présents en ligne sont sous-représentés. C'est écrit sur `/verification`.
- Le recoupement est lexical : les reprises dans une autre langue ne sont retrouvées que par GDELT quand les noms
  propres et les chiffres coïncident.
- X, Facebook, Instagram, TikTok sont inaccessibles (API fermées, scraping interdit). Bluesky et Mastodon sont
  interrogés sans clé ; Reddit seulement avec des identifiants d'application. Depuis la machine de développement,
  GDELT a répondu par sa limite de débit et la recherche Bluesky par un 403 : les deux dégradent proprement et sont à
  surveiller dans le rapport après le premier déploiement.
- Le compteur de vues n'est pas atomique (deux incréments simultanés peuvent en perdre un) : c'est un compteur
  d'affichages, présenté comme tel.
- La limitation de débit (connexion admin, vues, abonnement) est en mémoire : elle repart de zéro à chaque démarrage
  à froid d'une fonction.
- Le modèle de qualification reste un jugement : un humain valide chaque publication, tous les jours.
- « Aucun démenti » n'est pas une preuve de vérité, et l'interface ne le formule jamais ainsi.
