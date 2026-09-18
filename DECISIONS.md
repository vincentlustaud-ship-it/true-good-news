# Décisions prises en cours de route

Ce journal consigne les arbitrages que les documents du cahier des charges ne couvraient pas (règle 1 de
`CLAUDE.md`). Chaque entrée : la question, la décision, pourquoi.

## 2026-09-18 — Refonte True Good News

### Architecture et exécution

- **Fonction planifiée + fonction d'arrière-plan.** Une fonction planifiée Netlify n'a que quelques secondes ; le
  pipeline en prend plusieurs minutes (GDELT à une requête / 5 s, appels LLM). `daily-harvest` (cron `0 4 * * *`)
  se contente d'appeler `harvest-background` (suffixe `-background`, 15 minutes) avec un jeton interne signé par
  `SESSION_SECRET`. Même mécanisme pour `daily-email-background`. Les fonctions d'arrière-plan refusent tout appel
  sans ce jeton (elles sont joignables publiquement). Netlify répond toujours `202` à l'appel d'une fonction
  d'arrière-plan, avant même son exécution : le refus est donc interne (la fonction s'arrête sans rien faire) et ne se
  lit pas dans le code HTTP. Vérifié sous `netlify dev` : sans jeton, le pipeline ne démarre pas.
- **Recoupement en deux passes.** L'ordre documenté (recoupement → qualification) est respecté, mais le recoupement
  GDELT coûte 5 s par cluster : on ne peut pas l'appliquer aux ~4 000 clusters du matin. Passe 1 : preuves locales
  (sources directes déjà collectées) pour tous. Passe 2 : requête GDELT ciblée + fact-check pour les seuls clusters
  retenus par la charte (budget 45 requêtes ≈ 4 minutes). Les candidates finales portent donc toujours des preuves
  calculées après la passe GDELT.
- **Édition avant traduction.** Le document liste « traduction » avant « édition ». Traduire les ~30 à 40 qualifiées
  chaque jour dépasserait le quota DeepL gratuit (500 000 caractères / mois) ; l'agent d'édition sélectionne donc les
  10 candidates, puis seules celles-là sont traduites et enrichies (Open Graph). Le rapport garde les deux étapes
  distinctes.
- **Priorité de qualification.** Le budget d'appels LLM (150 par défaut) est alloué aux clusters déjà multi-sources,
  puis aux flux institutionnels et de journalisme de solutions, puis au reste par taille. Aucun mot-clé ne décide :
  c'est uniquement un ordre de passage.
- **Stockage local = système de fichiers.** Hors Netlify (`npm run harvest`, tests), le stockage écrit dans `.data/`
  (ignoré par git) avec la même interface que Netlify Blobs. `TGN_STORAGE=fs` force ce mode, y compris sous
  `netlify dev`.
- **Identifiant de publication** = empreinte stable (FNV-1a) de l'URL de l'article de tête : rejouable, sans base.

### Qualification (LLM)

- **Modèle par défaut : `claude-opus-5`** (variable `QUALIFY_MODEL`). Sortie contrainte par schéma
  (structured outputs + Zod), effort « medium », system prompt mis en cache. Sur cette génération de modèles la
  température n'est plus un paramètre : la « température basse » demandée par la charte est obtenue par le schéma
  strict et la règle du doute.
- **Refus ou sortie illisible du modèle ⇒ `doute: true`** ⇒ écartée. Aucun repli sur un autre modèle : dans ce
  projet, un doute n'a pas besoin d'être résolu, il écarte.
- **`pays_cites`.** Le schéma demande en plus les codes ISO des pays explicitement nommés dans le texte comme lieu de
  l'événement (jamais déduits). C'est ce qui alimente la ligne « Tchad · Éthiopie · Soudan du Sud » des maquettes,
  sans invention : absent du texte ⇒ absent de la page.
- **`raison_courte`** n'est affichée que dans l'espace de validation (privé), à côté de « Charte respectée ». Le site
  public ne montre aucun texte produit par le modèle.

### Collecte

- **Flux vérifiés un par un** le 18 septembre 2026 (`scripts/check-feeds.ts`) : 264 URL candidates, 181 répondent,
  170 retenues après exclusion des flux qui n'ont rien publié depuis plus de 60 jours (dont, à regret, le flux
  d'actualités de l'OMS, muet depuis février). Les autres restent joignables par GDELT et sont reconnues comme
  sources primaires par leur domaine.
- **GDELT et Bluesky non vérifiables depuis la machine de développement.** GDELT répond « limit requests to one
  every 5 seconds » à toute requête, même isolée (limitation par adresse IP partagée) ; la recherche publique
  Bluesky renvoie 403 quel que soit l'agent. Le code respecte l'espacement de 5 s et dégrade proprement (repli RSS,
  Mastodon seul) ; à surveiller dans le rapport `/admin` après le premier déploiement.
- **Limitation de débit GDELT : 4 tentatives, attente croissante, budget global.** Une seule nouvelle tentative après
  8 s ne suffisait pas quand GDELT reste limité plus longtemps : la requête abandonnait en silence. Désormais 4
  tentatives au plus, avec 8 s, 20 s puis 40 s d'attente. Ces attentes sont prises sur un **budget partagé de
  3 minutes pour toute l'exécution** : le pipeline dépense déjà ~5 minutes en espacement poli (58 requêtes au plus, une
  toutes les 5,2 s) et une fonction d'arrière-plan Netlify est coupée à 15 minutes ; sans plafond, une journée où
  GDELT limite tout ferait dépasser la limite. Budget épuisé ⇒ abandon immédiat, alerte dans le rapport `/admin`.
  Le délai par tentative passe de 25 s à 20 s pour la même raison. Seul le traitement du 429 (et de la réponse en
  clair « Please limit requests », que GDELT sert avec un code 200) change : délai dépassé, réponse non-ok ou corps
  non-JSON rendent toujours `null` sans nouvelle tentative.
- **Reddit** n'est interrogé qu'avec des identifiants d'application (`REDDIT_CLIENT_ID/SECRET`), conformément à sa
  politique ; sans identifiants, il est ignoré et consigné.
- **Fenêtre de collecte** : 24 h avant 04:00 UTC, avec 12 h de tolérance en amont (fuseaux et dates RSS approximatives).
  Un article sans date est gardé.
- **Écritures sans espaces (chinois, japonais, coréen, thaï)** : découpage en bigrammes de caractères pour le
  recoupement lexical ; les marques combinantes (devanagari, arabe) sont conservées dans les jetons.

### Site

- **Navigation mobile.** La maquette mobile ne montre que le logo et le sélecteur de langue ; une ligne de
  navigation discrète (Aujourd'hui · Archive · Comment nous vérifions) est ajoutée sous le filet, sinon l'archive
  n'est atteignable que par le pied de page.
- **Compteur de vues** : un seul incrément par sélection et par session de navigation (`sessionStorage`, local, sans
  cookie), pour ne pas gonfler le compteur au moindre rechargement.
- **Traduction absente** : le titre et le résumé restent dans leur langue, avec la mention « Non traduit (langue) »
  à la place de « Traduit du … », l'attribut `lang` correct sur la carte, et un lien de traduction externe.
- **Charte en anglais** : le texte français fait foi et est rendu tel quel depuis `CHARTE-EDITORIALE.md` ; la version
  anglaise est une traduction signalée comme telle en tête de page.
- **Corrections après publication** : bouton dans `/admin` sur une journée publiée ; le bandeau daté s'ajoute sur la
  carte (accueil et archive), le contenu d'origine reste.
- **Republication d'une journée** : refusée par défaut (409) ; l'espace de validation demande une seconde
  confirmation explicite pour remplacer, et l'email n'est pas renvoyé.

### Sécurité

- **Session admin** : HMAC-SHA256 sur un jeton horodaté, 8 heures, cookie `HttpOnly; Secure; SameSite=Strict`.
  Limitation de débit en mémoire (délai doublé à chaque échec, plafonné à 15 minutes), jamais persistée.
- **Jetons d'abonnement** : 24 octets aléatoires, indexés dans un store `tokens` séparé pour retrouver l'abonné sans
  parcourir la liste. Le désabonnement supprime l'enregistrement et ses jetons.
- **Images** : uniquement en `https:` (CSP `img-src https:`), `referrerpolicy="no-referrer"`.

### Vérification visuelle

- `npm run shots` lance Vite avec une API simulée sur des **fixtures de maquette** (`fixtures/`, reprises des
  maquettes validées, marquées `_fixture`). Elles ne sont jamais servies en production : Netlify construit avec
  `vite build`, sans le plugin de simulation.
