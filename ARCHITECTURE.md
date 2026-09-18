# Architecture

## Vue d'ensemble

```
06:00 Paris ─ cron Netlify
   │
   ├─ 1. COLLECTE      GDELT + flux RSS mondiaux + Bluesky/Mastodon/Reddit
   │                   → ~200-400 candidates brutes
   ├─ 2. RECOUPEMENT   clustering, rédactions indépendantes, pays, fact-check
   │                   → niveau Confirmé / Bien corroboré / Insuffisant
   ├─ 3. QUALIFICATION  LLM sous CHARTE-EDITORIALE.md (JSON strict)
   │                   → universelle ? vraie bonne nouvelle ? catégorie ?
   ├─ 4. TRADUCTION    DeepL FR+EN, langue d'origine, métadonnées Open Graph
   ├─ 5. ÉDITION       diversité pays/catégorie/média, anti-répétition 14 j
   │                   → 10 candidates
   │
   └─ écrit  candidates/YYYY-MM-DD.json   (privé, jamais servi publiquement)

   ⏸  VALIDATION HUMAINE  /admin — tu choisis 5 sur 10
   │
   └─ écrit  published/YYYY-MM-DD.json  →  site public + archive + email du lendemain
```

Rien ne devient public sans cette étape. C'est une règle d'architecture, pas une option de config.

## Pile technique

Ce qui existe déjà et qu'on garde : Vite, React 19, TypeScript, `vite-plugin-pwa`, Netlify
(fonctions + hébergement). Ce qu'on ajoute : Netlify Blobs (stockage), Netlify Scheduled Functions
(cron).

Pas de base de données externe, pas de backend à administrer, pas de conteneur.

## Stockage — Netlify Blobs

| Store | Clé | Contenu | Public |
|---|---|---|---|
| `candidates` | `YYYY-MM-DD` | les 10 candidates + preuves complètes | non |
| `published` | `YYYY-MM-DD` | les 5 retenues + preuves | oui, en lecture |
| `views` | `<id-publication>` | un entier | en écriture via API, agrégé |
| `subscribers` | `<hash-email>` | email, date de confirmation, token de désabonnement | non |
| `state` | `recent-topics` | empreintes des 14 derniers jours (anti-répétition) | non |

## Fonctions Netlify

| Fonction | Déclencheur | Rôle |
|---|---|---|
| `daily-harvest` | cron `0 4 * * *` (06:00 Paris) | pipeline agents 1→5, écrit `candidates` |
| `daily-email` | déclenchée à la validation | envoie les 5 retenues aux abonnés |
| `api-news` | GET `/api/news?date=` | sert `published` (défaut : aujourd'hui, sinon dernier jour publié) |
| `api-view` | POST `/api/view` | incrémente un compteur, sans IP ni cookie |
| `api-subscribe` | POST | double opt-in, envoie le mail de confirmation |
| `api-confirm` | GET `/api/confirm?token=` | valide l'abonnement |
| `api-unsubscribe` | GET `/api/unsubscribe?token=` | désabonne en un clic, sans confirmation |
| `admin-*` | authentifiées | liste des candidates, validation de la sélection |

Le cron s'écrit dans `netlify.toml` :

```toml
[functions."daily-harvest"]
  schedule = "0 4 * * *"
```

## Les agents

Chacun dans `agents/`, avec une entrée/sortie typée et testable isolément.

- `harvest.ts` — collecte. Voir `SOURCES.md`.
- `corroborate.ts` — recoupement + fact-check. Voir `FIABILITE.md`.
- `qualify.ts` — LLM sous charte. Voir `CHARTE-EDITORIALE.md`. Température basse, sortie JSON
  contrainte, aucune invention autorisée.
- `translate.ts` — DeepL FR/EN + détection de langue + Open Graph.
- `edit.ts` — sélection des 10 : max 2 par catégorie, max 2 par pays, max 1 par média ; tri par
  niveau, puis nombre de pays, puis fraîcheur ; exclusion des sujets déjà publiés sous 14 jours.

Chaque agent journalise ce qu'il a écarté et pourquoi. Le rapport est consultable depuis `/admin` :
c'est ce qui permet de régler le système sans le deviner.

## Dégradation propre — obligatoire

| Service | Clé absente ou appel en échec |
|---|---|
| DeepL | pas de traduction, contenu en langue d'origine + lien de traduction externe, mention explicite |
| LLM de qualification | pipeline arrêté avant publication, alerte dans `/admin` : **on ne publie pas sans charte appliquée** |
| Fact-check | la candidate ne peut pas dépasser « Bien corroboré », jamais « Confirmé » |
| Open Graph / image | carte sans image, lien seul |
| Email | la publication a quand même lieu, l'envoi est retenté au cycle suivant |
| GDELT | repli sur les flux RSS directs, avec avertissement dans le rapport |

## Variables d'environnement

```
ANTHROPIC_API_KEY          qualification éditoriale (obligatoire)
DEEPL_API_KEY              traduction FR/EN (optionnelle, dégradation propre)
GOOGLE_FACTCHECK_API_KEY   fact-check (optionnelle, plafonne le niveau)
RESEND_API_KEY             envoi de l'email quotidien (optionnelle)
ADMIN_PASSWORD_HASH        hash argon2/bcrypt, jamais le mot de passe en clair
SESSION_SECRET             signature du cookie de session admin
SITE_URL                   base des liens de confirmation et de désabonnement
```

## Front

- `/` — la sélection du jour : une nouvelle mise en avant + 4 cartes.
- `/archive` — sélecteur de date, navigation jour précédent / suivant, la sélection de ce jour-là
  avec ses preuves intactes.
- `/verification` — comment on vérifie, y compris ce que la méthode ne sait pas faire.
- `/charte` — la charte éditoriale publiée telle quelle.
- `/confidentialite` — ce qu'on stocke (rien pour les lecteurs, l'email pour les abonnés).
- `/admin` — authentifiée, hors index (`noindex`), non liée depuis le site public.

Langues : FR et EN pour l'interface **et** pour le contenu. Le sélecteur bascule les deux.

## Commandes attendues

```
npm run dev
npm run build
npm run harvest -- --dry-run     # pipeline complet sans écrire, rapport lisible en sortie
npm run harvest -- --date=...    # rejoue une journée
npm run shots                    # captures 1280 + 390 pour la vérification visuelle
```
