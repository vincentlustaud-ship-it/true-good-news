# Bonnes Nouvelles

PWA qui affiche uniquement de vraies bonnes nouvelles, sélectionnées chaque jour dans des médias reconnus de journalisme positif / de solutions, à l'échelle mondiale. Interface disponible en français, anglais, russe, chinois et hindi.

## Comment ça marche

- **Pas de génération IA du contenu.** La fonction serverless `netlify/functions/news.mts` récupère en direct les flux RSS de médias spécialisés :
  - [Positive News](https://www.positive.news/)
  - [Good News Network](https://www.goodnewsnetwork.org/)
  - [Reasons to be Cheerful](https://reasonstobecheerful.world/)
  - [The Optimist Daily](https://www.optimistdaily.com/)
- Le filtrage "bonnes nouvelles" vient du choix des sources elles-mêmes (chaque article a déjà été sélectionné comme bonne nouvelle par une vraie rédaction), pas d'un classement automatique sur de l'actualité générale.
- Les articles des dernières 24h sont affichés en priorité (fenêtre élargie à 48h/72h si besoin pour ne pas laisser l'appli vide un jour calme).
- L'interface (titres, boutons, labels) est traduite en 5 langues. Le contenu des articles reste dans sa langue d'origine, avec un lien "Traduire" (Google Translate) — une vraie traduction automatique du contenu nécessiterait une clé API dédiée (DeepL/Google Cloud Translation) à ajouter plus tard si besoin.

## Développement

```bash
npm install
npm run dev        # Vite seul, sans les fonctions serverless
netlify dev -f netlify/functions   # avec l'API /api/news en local
```

## Déploiement

Même workflow que les autres projets (Netlify) :

```bash
netlify init      # une fois, pour lier le site
netlify deploy --prod
```

Le build (`npm run build`) génère les icônes PWA puis compile avec Vite. `netlify.toml` pointe déjà vers `netlify/functions` et `dist/`.

## Limites connues

- Sources en anglais uniquement pour l'instant : on pourrait ajouter des flux dans d'autres langues (russe, chinois, hindi) si des médias positifs équivalents sont identifiés.
- Traduction du contenu = lien externe, pas de traduction intégrée dans l'appli.
