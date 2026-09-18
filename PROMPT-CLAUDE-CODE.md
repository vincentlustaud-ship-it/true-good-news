# Le prompt à coller dans Claude Code

À coller une fois le contenu de ce dossier copié à la racine du dépôt `BonnesNouvelles`.

---

Refonte complète du projet en **True Good News**. Tout le cahier des charges est déjà écrit à la
racine du dépôt : lis d'abord `CLAUDE.md`, qui indexe les sept documents, puis `BRIEF.md`,
`CHARTE-EDITORIALE.md`, `FIABILITE.md`, `SOURCES.md`, `ARCHITECTURE.md`,
`SECURITE-CONFIDENTIALITE.md` et `DESIGN.md`. Les maquettes validées sont dans `design/preview/` —
ouvre-les, elles font foi pour la mise en page.

Travaille en autonomie du début à la fin, sans me demander de validation intermédiaire. Quand un
arbitrage n'est pas couvert par les documents, tranche toi-même, applique, et consigne la décision
dans un `DECISIONS.md` que tu tiens à jour.

La base existante (PWA Vite + React + TypeScript, fonction Netlify qui agrégeait 4 flux RSS
anglophones) est à **refondre**, pas à étendre : garde la configuration Vite / PWA / Netlify qui
fonctionne, jette la logique métier.

Trois points sur lesquels je ne transige pas, parce qu'ils sont l'intérêt même du projet :

1. **Rien n'est publié automatiquement.** Le pipeline produit 10 candidates vérifiées ; j'en choisis
   5 chaque matin dans l'espace de validation ; seules celles-là deviennent publiques.
2. **Aucune invention.** Aucun résumé, chiffre ou fait qui ne vienne du texte réellement récupéré à
   la source. Donnée manquante = donnée absente.
3. **Vérification visuelle.** Avant de déclarer une page terminée, génère les captures en 1280 et
   390px, regarde-les, corrige. Ne me présente rien que tu n'aies pas vu rendu.

Ordre de marche suggéré, à adapter si tu vois mieux : le socle et le stockage, puis le pipeline des
cinq agents testable en `--dry-run`, puis l'espace de validation, puis le site public et l'archive,
puis l'email, puis les pages de transparence.

Quand c'est prêt : `npm run build` doit passer, le projet doit être déployable sur Netlify en
l'état, et le `README.md` doit documenter l'architecture des agents, les variables d'environnement,
la méthode de corroboration, le fonctionnement de la validation quotidienne et les limites connues.
