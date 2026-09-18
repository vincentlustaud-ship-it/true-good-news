# Design — True Good News

Les maquettes validées sont dans `design/preview/` : ouvre-les dans un navigateur avant d'écrire une
ligne de CSS. Elles font foi pour la mise en page, l'espacement et la hiérarchie.

| Fichier | Écran |
|---|---|
| `Main.html` | La page du matin, desktop 1280 |
| `Mobile.html` | La page du matin, mobile 390 — **l'usage principal** |
| `Archive.html` | Archive avec sélecteur de date |
| `Email.html` | L'email quotidien, 600 |
| `Admin.html` | Validation 10 → 5, privé |

## Intention

Chaleureux sans être mièvre. Éditorial, pas « feel-good ». Le lecteur ouvre ça au réveil sur son
téléphone : la page doit être calme, lisible, et se terminer — pas un fil infini.

Pas de dégradé décoratif, pas de coin coloré, pas d'emoji, pas d'illustration générique. La photo de
l'éditeur et la typographie portent tout.

## Couleurs

```
--ground     #FBF7F0   fond, ivoire chaud
--surface    #FFFFFF   cartes
--ink        #1C1815   texte principal
--muted      #6A6157   texte secondaire (contraste vérifié sur --ground)
--line       #E8DFD2   filets et bordures
--accent     #B45309   liens, boutons, mention de traduction
--accent-hi  #8A3E07   accent survolé
--accent-sfc #FDF0E3   fond d'information
--ok-bg      #DCFCE7   badge « Confirmé »
--ok-tx      #14532D
--mid-bg     #FEF3C7   badge « Bien corroboré »
--mid-tx     #78350F
--admin-bg   #F4F2ED   fond de l'espace de validation
```

Mode sombre à produire sur la même logique (fond chaud sombre, pas gris bleu), en conservant les
ratios de contraste. Les deux thèmes doivent passer 4.5:1 sur le texte courant.

## Typographie

- **Fraunces** — titres, chiffres, nom du site. Graisses 400 / 600. `letter-spacing: -0.015em` sur
  les grands titres.
- **Karla** — texte courant, interface. Graisses 400 / 500 / 700.

À **auto-héberger** (woff2 dans `public/fonts/`, `@font-face`, `font-display: swap`) : aucun appel à
Google Fonts en production, conformément à `SECURITE-CONFIDENTIALITE.md`.

Échelle utilisée dans les maquettes : titre héros 33px desktop / 24px mobile · titre de carte 21px /
19px · texte 15px / 13px · métadonnées 12-13px · puces de catégorie 11px majuscules,
`letter-spacing: 0.09em`.

## Composants

- **Puce de catégorie** — contour fin, majuscules espacées, gris. Jamais de couleur pleine : la
  couleur est réservée à la corroboration.
- **Badge de corroboration** — vert « Confirmé », ambre « Bien corroboré », toujours avec l'icône
  de validation. C'est le seul élément coloré fort de la page : il doit se voir.
- **Bloc de preuves** — encadré clair sous le résumé : badge + « 9 rédactions indépendantes · 6 pays ·
  aucun démenti de fact-check » + lien « Voir les preuves ». Présent sur **chaque** nouvelle, sans
  exception, y compris dans l'email.
- **Ligne source** — globe + média (pays) · *Traduit du [langue]* en accent · date · compteur de vues
  à droite. Sur mobile, empilée sur deux lignes (voir `Mobile.html`).
- **Image** — vignette Open Graph de l'éditeur en lien direct, avec la légende qui le dit. Si
  l'image est absente ou interdite par `robots.txt`, la carte se rend sans image, proprement.
- **Icônes** — SVG inline, trait 1.6, jamais d'emoji, jamais de librairie d'icônes.

## Accessibilité

Vrais `<button>`, `<a href>`, `<input>` + `<label>` — y compris dans les écrans d'administration.
Cibles tactiles ≥ 44px. `aria-label` sur les boutons sans texte. Contraste vérifié, pas estimé.
Langue du document synchronisée avec la langue choisie (`<html lang>`).

## Vérification visuelle

`npm run shots` doit produire les captures en 1280 et 390 pour chaque page. Regarde-les avant de
considérer une page finie — c'est comme ça que les quatre défauts des premières maquettes ont été
trouvés (image du héros qui ne remplissait pas la carte, ligne source coupée sur mobile, charte
répétée dix fois côté admin, lien de lecture absent dans l'email).
