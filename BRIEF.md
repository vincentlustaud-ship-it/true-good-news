# True Good News — brief produit

## Ce qu'on construit

Un site (PWA) qui publie **5 bonnes nouvelles vérifiées chaque matin**, venues de n'importe quel pays
du monde, traduites en français et en anglais, avec leurs preuves de corroboration et le lien vers
l'article d'origine. Consultable par date dans une archive permanente. Envoyé par email à ceux qui
s'abonnent.

Les 5 publiées sont choisies **à la main, tous les jours**, parmi 10 candidates que le système a
vérifiées seul pendant la nuit. Rien ne se publie tout seul.

## Ce qui distingue ce projet d'un agrégateur de plus

1. **La corroboration est visible.** Chaque nouvelle affiche combien de rédactions indépendantes,
   dans combien de pays, la rapportent, et ce que disent les fact-checkeurs. Pas un score opaque :
   les preuves, cliquables.
2. **Aucune source n'est exclue a priori.** Ni par son nom, ni par sa ligne éditoriale, ni par son
   pays. C'est l'information qui est évaluée, pas le média.
3. **L'universalité est un critère, pas une intention.** Une nouvelle qui réjouit un camp et pas
   l'autre n'est pas publiée. Voir `CHARTE-EDITORIALE.md` — c'est le cœur du projet.
4. **Un humain valide chaque jour.** C'est le garde-fou assumé face aux limites de l'automatisation.
5. **Zéro captation.** Pas de pub, pas de traceur, pas de cookie, pas de commentaire, pas de like,
   pas de partage. Un compteur de vues anonyme, un lien de contact, un abonnement email qu'on quitte
   en un clic.

## Périmètre de la v1

Livré :

- Page du jour (5 nouvelles, une mise en avant), FR et EN, contenu **réellement traduit**
- Archive par date, avec les preuves conservées telles quelles
- Pipeline quotidien automatique en 5 agents (collecte → recoupement → charte → traduction → édition)
- Espace de validation privé : 10 candidates, tu en choisis 5, tu publies
- Email quotidien avec double opt-in et désabonnement en un clic
- Pages de transparence : comment on vérifie (limites comprises), charte éditoriale, confidentialité
- PWA installable, mobile d'abord

Hors périmètre v1 : application native, autres langues que FR/EN pour le contenu, recherche plein
texte dans l'archive, notifications push.

## Décisions déjà prises — ne pas rouvrir

| Sujet | Décision | Pourquoi |
|---|---|---|
| Nom | **True Good News** | retenu par le porteur du projet |
| Indice de fiabilité | **niveaux + preuves affichées**, jamais de pourcentage | un « 94 % de fiabilité » est une fausse précision : personne ne peut calculer la probabilité qu'un fait soit vrai |
| Qualification éditoriale | **LLM sous charte stricte** | les mots-clés ne savent pas écarter le politique déguisé en bonne nouvelle |
| Publication | **jamais automatique** | 10 proposées, 5 choisies, tous les jours |
| Nombre | **5 publiées sur 10 proposées** | |
| Plateforme | **PWA**, pas de natif | gratuit, multiplateforme, installable, pas de validation de store |
| Hébergement | **Netlify** + Blobs + scheduled functions | déjà en place, pas de base à administrer |
| Réseaux sociaux | Bluesky, Mastodon, Reddit — **repérage seulement** | X/Meta/TikTok : API fermées ou payantes, scraping interdit par leurs CGU |
| Images | vignette Open Graph **en lien direct** | republier texte intégral ou réhéberger les images n'est pas légal |

## Ce que le système ne saura pas faire — à assumer publiquement

- Il ne détecte pas une erreur reprise par toute la presse mondiale.
- Il favorise les sujets internationaux : une bonne nouvelle locale a peu de sources, donc un niveau
  de corroboration faible.
- Il dépend de sources accessibles : les pays où la presse est peu présente en ligne sont
  sous-représentés, et les réseaux sociaux fermés nous sont inaccessibles.
- « Universelle » reste un jugement humain à la marge. C'est pour ça que la validation quotidienne
  existe.

Ces limites vont sur la page publique « Comment nous vérifions ». Les cacher reviendrait à faire
exactement ce que le projet prétend combattre.

## Critère de réussite

Un matin type : le pipeline a tourné seul, 10 candidates sont prêtes avec leurs preuves, la
validation prend moins de cinq minutes, les 5 partent en ligne et par email, et chaque nouvelle
publiée peut être vérifiée par n'importe quel lecteur en trois clics.
