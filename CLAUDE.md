# True Good News — règles de travail pour Claude Code

Ce dépôt est travaillé **en autonomie**. Les documents ci-dessous font foi ; en cas de doute, c'est
le document qui tranche, pas l'improvisation.

| Fichier | Ce qu'il fixe |
|---|---|
| `BRIEF.md` | Le produit, le périmètre, ce qui est livré |
| `CHARTE-EDITORIALE.md` | Ce qu'est une bonne nouvelle **universelle** — le filtre le plus important |
| `FIABILITE.md` | La méthode de corroboration et les niveaux affichés |
| `SOURCES.md` | Où l'on collecte, et les limites légales de la collecte |
| `ARCHITECTURE.md` | Les agents, le stockage, les fonctions, les variables d'environnement |
| `SECURITE-CONFIDENTIALITE.md` | Ce qu'on ne collecte pas, et comment le site est verrouillé |
| `DESIGN.md` | Tokens, typographie, composants, et les maquettes de référence |
| `design/preview/*.html` | Les 5 écrans validés, ouvrables dans un navigateur |

## Règles de travail

1. **Autonomie.** Avance sans demander de validation intermédiaire. Quand un arbitrage n'est pas
   couvert par les documents, tranche, applique, et note la décision dans `DECISIONS.md` (à créer).
2. **Rien d'inventé.** Aucun résumé, chiffre ou fait qui ne vienne pas du texte réellement récupéré
   à la source. Si la donnée manque, elle est absente — jamais comblée.
3. **Vérification visuelle obligatoire.** Avant de déclarer une page terminée, génère une capture
   (Playwright, Chromium déjà présent) en 1280px et en 390px, **regarde-la**, corrige, recommence.
   Ne présente jamais une mise en page que tu n'as pas vue rendue.
4. **Dégradation propre.** Chaque service externe (traduction, fact-check, LLM, email) doit avoir un
   comportement défini quand sa clé est absente ou que l'appel échoue. Le site ne tombe jamais.
5. **Légalité avant fonctionnalité.** Si une source impose une limite (robots.txt, CGU, API payante),
   on s'arrête et on le documente. Aucun contournement, jamais, même techniquement facile.
6. **Tests.** Le pipeline doit être exécutable à la main hors cron (`npm run harvest -- --dry-run`)
   et produire un rapport lisible de ce qu'il aurait retenu et pourquoi.
7. **Commits.** Petits, en français, un sujet par commit.

## État de départ

Le dépôt contient une PWA Vite + React + TypeScript qui agrégeait 4 flux RSS anglophones sans
curation, sans archive et sans traduction. **Cette base est à refondre**, pas à étendre : garde la
config Vite/PWA/Netlify qui marche, jette la logique métier (`netlify/functions/news.mts`,
`src/App.tsx`).
