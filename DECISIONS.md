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
- **Couverture thématique du repérage GDELT élargie : 13 → 21 requêtes.** Les requêtes ne couvraient que la santé et
  l'environnement ; tout le reste de la liste « Admissible » de `CHARTE-EDITORIALE.md` était mécaniquement hors
  d'atteinte. Ajout de la découverte scientifique à effet concret, de l'accès nouvellement obtenu (eau, électricité,
  école, soins, logement), de la réconciliation et du retour de personnes déplacées, de la restitution de patrimoine
  et de la reconstruction achevée. Douze langues couvertes.
  Les thèmes **exclus** par la charte (politique, militaire et diplomatique, économie partisane) sont délibérément
  absents : les repérer reviendrait à dépenser des requêtes GDELT et du budget d'appels LLM sur des candidates qui
  seraient écartées à l'étape de qualification.
  Coût mesuré : l'espacement poli passe de 302 s à 343 s (+42 s). Le cycle par requête vaut `max(5,2 s, temps de
  réponse)` — le temps de réponse est absorbé par l'espacement tant qu'il reste sous 5,2 s, vérifié en simulation
  (0 s → 5,2 s/requête ; 3 s → 5,9 s ; 8 s → 8,6 s). Conséquence sur la marge : voir la note ci-dessous.
- **Marge de durée d'une fonction d'arrière-plan : rétablie par la concurrence de qualification, portée de 4 à 8.**
  Avec 21 + 45 requêtes GDELT, le cumul « qualification lente (10 s/appel) + budget d'attente 429 entièrement
  consommé » atteignait 917 s, soit 17 s de trop. Quatre pistes étaient possibles ; c'est la concurrence qui a été
  retenue, parce qu'elle est la seule **sans contrepartie** : elle ne retire aucune requête de repérage, ne dégrade
  pas la qualité de recoupement (`maxGdeltCorroboration` reste à 45) et ne réduit pas la résilience aux 429 (le budget
  d'attente reste à 180 s). Le pire cas retombe à 730 s, soit 2,8 minutes de marge ; le cas médian à 673 s.
  La liste de requêtes n'a pas été tronquée.
  **Vérification côté limites Anthropic** (documentation consultée le 18 septembre 2026, Claude Opus 5, palier Start,
  le plus bas des paliers standards : 1 000 requêtes/min, 2 000 000 jetons d'entrée/min, 400 000 jetons de sortie/min).
  Charge maximale du pipeline à concurrence 8 : 160 requêtes/min soit 16 %, 163 840 jetons de sortie/min soit 41 %
  dans l'hypothèse pessimiste où chaque appel sature `max_tokens`, et environ 1 % des jetons d'entrée — le prompt
  système (1 386 jetons, la charte) est mis en cache et les lectures de cache ne comptent pas dans la limite d'entrée.
  Deux réserves subsistent, toutes deux absorbées par le SDK (`maxRetries: 3`, en-tête `retry-after` respecté) :
  une organisation neuve peut démarrer sur le palier « Evaluation », sous les limites publiées ; et une rafale
  quotidienne partant de zéro peut déclencher les limites d'accélération. À revoir à la première exécution réelle,
  qui donnera la latence vraie des appels.
- **Limitation de débit GDELT : 4 tentatives, attente croissante, budget global.** Une seule nouvelle tentative après
  8 s ne suffisait pas quand GDELT reste limité plus longtemps : la requête abandonnait en silence. Désormais 4
  tentatives au plus, avec 8 s, 20 s puis 40 s d'attente. Ces attentes sont prises sur un **budget partagé de
  3 minutes pour toute l'exécution** : le pipeline dépense déjà ~5 minutes en espacement poli (58 requêtes au plus, une
  toutes les 5,2 s) et une fonction d'arrière-plan Netlify est coupée à 15 minutes ; sans plafond, une journée où
  GDELT limite tout ferait dépasser la limite. Budget épuisé ⇒ abandon immédiat, alerte dans le rapport `/admin`.
  Le délai par tentative passe de 25 s à 20 s pour la même raison. Seul le traitement du 429 (et de la réponse en
  clair « Please limit requests », que GDELT sert avec un code 200) change : délai dépassé, réponse non-ok ou corps
  non-JSON rendent toujours `null` sans nouvelle tentative.
- **Budget d'attente GDELT : forfait remplacé par un calcul de date limite.** Le forfait de 3 minutes décrit
  ci-dessus était une constante posée à la main : le code ignorait l'heure de démarrage, l'heure de coupure, les
  étapes restantes et le nombre de requêtes encore à faire. Il avait été dimensionné quand la qualification tournait à
  concurrence 4 ; le passage à 8 a divisé ce poste par deux sans que le forfait soit revu. Résultat observé sur une
  exécution réelle : 603 s au total, deux alertes « budget épuisé », et environ 5 minutes de marge inutilisées.
  Désormais le pipeline annonce l'instant de coupure (`deadlineAt`, l'entrée du gestionnaire plus 15 minutes) et,
  à chaque requête, ce que le travail restant réclame encore (`setGdeltReserve`). Une reprise n'est accordée que si
  elle tient dans `date limite − maintenant − travail restant − marge de sécurité`, la marge étant fixée à **75 s** et
  jamais entamée. Le budget suit donc l'exécution : une qualification plus rapide que prévu rend immédiatement du
  temps aux reprises. Mesuré : 285 s disponibles au début de la collecte et 245 s à l'entrée du recoupement, contre
  180 s forfaitaires en toute circonstance auparavant.
  Les estimations de travail restant sont **volontairement hautes** (10 s par appel de qualification, 5,2 s par
  requête GDELT restante, 45 s pour l'édition, la traduction et l'écriture) : les sous-estimer ferait dépasser la
  limite, les surestimer ne coûte que des reprises refusées.
  Hors fonction d'arrière-plan (`npm run harvest`, tests), aucune date limite n'est fixée et le pool de 3 minutes
  subsiste comme simple garde-fou contre un emballement. La logique de reprise elle-même — 4 tentatives, 8 s, 20 s,
  40 s, délai de 20 s par tentative — n'a pas changé.
- **Flux RSS surdimensionnés : troncature silencieuse corrigée.** Prensa Libre publie un flux de 4,03 Mo, au-delà du
  plafond de 3 Mo du lecteur. `fetchText` coupait le corps et rendait le fragment tel quel ; le parseur échouait sur un
  XML sectionné en plein élément et la journée entière du flux était perdue (« XML illisible »). Le plafond passe à
  6 Mo et, surtout, une troncature n'est plus fatale : le document est recoupé au dernier élément complet puis refermé.
  Les flux étant antéchronologiques, on conserve les plus récents, c'est-à-dire ce qui nous intéresse. Vérifié :
  Prensa Libre passe de 0 à 99 éléments, et les 170 flux lisent.
- **Échecs de flux journalisés.** Comme pour GDELT, `readFeed` rendait « pas de réponse » sans dire pourquoi. Chaque
  échec émet désormais une ligne `[flux]` sur `console.error` avec le statut HTTP, le type et le message de l'erreur
  (chaîne `cause` dépliée), la durée, la taille, le content-type et l'URL finale après redirection. C'est ce qui
  permettra de distinguer un flux réellement mort d'un blocage propre à l'hébergeur.
- **Bluesky : la recherche de posts n'est plus ouverte.** `SOURCES.md` range Bluesky parmi les API « ouvertes et
  gratuites ». Vérifié le 18 septembre 2026, ce n'est plus vrai pour la recherche :
  `app.bsky.actor.getProfile` répond 200 sur l'hôte public, mais `app.bsky.feed.searchPosts` renvoie 403, et la même
  requête sur `bsky.social` répond `AuthMissing`. Ce n'était donc ni une panne réseau ni un User-Agent refusé.
  On passe par un mot de passe d'application, gratuit, exactement comme Reddit : `BLUESKY_IDENTIFIER` et
  `BLUESKY_APP_PASSWORD`. Sans identifiants, Bluesky est ignoré et consigné comme tel, jamais présenté comme une
  panne. **À arbitrer par le porteur du projet** : faut-il amender `SOURCES.md`, qui affirme que ces API sont ouvertes ?
- **Reddit** n'est interrogé qu'avec des identifiants d'application (`REDDIT_CLIENT_ID/SECRET`), conformément à sa
  politique ; sans identifiants, il est ignoré et consigné.
- **Fenêtre de collecte** : 24 h avant 04:00 UTC, avec 12 h de tolérance en amont (fuseaux et dates RSS approximatives).
  Un article sans date est gardé.
- **Écritures sans espaces (chinois, japonais, coréen, thaï)** : découpage en bigrammes de caractères pour le
  recoupement lexical ; les marques combinantes (devanagari, arabe) sont conservées dans les jetons.

### Qualification — budget d'appels

- **Budget porté de 150 à 300 appels par exécution.** Avec 150, environ 3 842 des ~4 000 clusters recoupés chaque
  matin n'étaient jamais soumis au modèle, ce qui bornait mécaniquement le nombre de candidates possibles. Décision du
  porteur du projet.
- **Valeur unique de référence.** Le chiffre était dupliqué à trois endroits — le défaut de `qualify.ts`, le défaut
  utilisé par `pipeline.ts` pour appeler la qualification, et celui utilisé par ce même fichier pour *estimer* le temps
  de qualification restant — et il était en plus **fixé explicitement** par `harvest-background.mts`. Changer le seul
  défaut du pipeline n'aurait donc rien changé en production, et aurait laissé l'estimation de réserve croire à 150
  appels tout en en lançant 300, soit 190 s de travail non réservées sous la coupure. Le budget vit désormais dans une
  seule constante exportée, `DEFAULT_MAX_LLM_CALLS` (`agents/qualify.ts`), dont dérivent l'exécution et l'estimation ;
  la fonction d'arrière-plan ne fixe plus la valeur.
- **Effet sur le budget d'attente GDELT.** La formule de réserve est générique (`ceil(appels / 8) × 10 s`) : elle est
  passée d'elle-même de 190 s à 380 s. Conséquence assumée, le temps laissé aux reprises GDELT pendant la collecte
  tombe de 228 s à 38 s, soit environ deux reprises. C'est l'arbitrage voulu : la qualification passe avant la
  résilience aux limitations de GDELT.
- **Marge d'erreur réduite, à surveiller.** Le temps disponible pour la qualification est de 418 s sur 38 vagues de
  8 appels, soit un **seuil de rupture à 11,0 s par appel** — contre 22,0 s avec 150 appels. L'estimation pessimiste
  retenue dans le code est de 10 s. Au-delà de 11 s de latence moyenne, l'exécution dépasserait les 15 minutes. La
  première exécution réelle avec clé donnera la latence vraie ; si elle dépasse 9 s, il faudra soit remonter la
  concurrence, soit redescendre le budget d'appels.

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
