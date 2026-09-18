# Charte éditoriale — la bonne nouvelle universelle

C'est le document le plus important du projet. Il est appliqué par l'agent de qualification
(`agents/qualify.ts`) et il est publié tel quel sur le site, page « Charte éditoriale ».

## La règle unique

> Une nouvelle n'est publiable que si **une personne de n'importe quel pays, de n'importe quelle
> culture, religion ou opinion politique peut la recevoir comme une bonne nouvelle.**

Si la nouvelle est bonne *pour un camp*, elle n'est pas pour nous — même si ce camp a raison.

## Le test des trois questions

Appliqué à chaque candidate, dans cet ordre. Une seule réponse « non » = écartée.

1. **Quelqu'un « de l'autre bord » pourrait-il s'en réjouir aussi ?**
2. **Le bénéfice est-il concret, mesuré, et déjà advenu ?** (pas une promesse, une annonce, une
   intention, un objectif, un financement voté)
3. **La nouvelle tient-elle sans prendre parti** pour un pays, un camp, une entreprise, une
   personnalité ou une croyance ?

## Admissible

- Recul ou éradication d'une maladie ; traitement, vaccin, opération qui soigne réellement
- Découverte ou avancée scientifique vérifiée, avec effet concret
- Sauvetage, secours, disparu retrouvé, catastrophe évitée
- Espèce qui se rétablit, milieu naturel qui se régénère, pollution mesurément en baisse
- Accès nouvellement obtenu à l'eau potable, l'électricité, l'école, les soins, le logement
- Réconciliation entre communautés, retour de personnes déplacées, restitution d'un patrimoine
- Reconstruction achevée, infrastructure qui fonctionne et change la vie de gens identifiables
- Exploit humain, sauvetage animalier, solidarité collective à effet mesurable

## Exclu systématiquement

- **Politique** : résultats électoraux, victoire ou défaite d'un parti, d'un dirigeant, d'un
  gouvernement ; nomination ; sondage
- **Société clivante** : lois et décisions qui portent sur les mœurs, les droits contestés, la
  famille, la fin de vie, la religion — y compris largement approuvées
- **Militaire et diplomatique** : gain de terrain, sanction, traité présenté comme la victoire d'un
  camp sur un autre (un cessez-le-feu **effectif et respecté** peut passer s'il est présenté sans
  vainqueur ni vaincu)
- **Religieux** : fait présenté comme positif pour une confession
- **Économique partisan** : succès d'une entreprise ou d'un pays au détriment d'un autre, cours de
  bourse, valorisation, levée de fonds, classement
- **Bonne nouvelle relative** : « moins pire qu'avant » sans amélioration réelle ; chiffre en baisse
  qui reste catastrophique
- **Célébrité et promotion** : divertissement, sortie de produit, record commercial, contenu
  sponsorisé
- **Tout ce qui se lit comme la défaite de quelqu'un**

## Le ton, lui aussi, est sans parti pris

Pas d'état d'esprit imposé. Le résumé reste **factuel et sobre** :

- Pas de leçon, pas de morale, pas d'injonction à l'optimisme (« comme quoi tout n'est pas perdu »,
  « une leçon pour nous tous », « il suffisait d'y croire »)
- Pas de superlatif non sourcé (« historique », « révolutionnaire », « incroyable ») sauf si le mot
  vient de la source et lui est attribué
- Pas de point d'exclamation, pas d'emoji
- On écrit ce qui s'est passé, pour qui, où, et vérifié par qui. Le lecteur décide seul de ce qu'il
  en ressent.

## En cas de doute

**Le doute écarte.** Il y a chaque jour beaucoup plus de candidates que de places. Rien ne justifie
de publier une nouvelle ambiguë : on prend la suivante.

## Consigne à l'agent de qualification

Sortie JSON stricte, température basse, aucune invention :

```json
{
  "universelle": true,
  "bonne_nouvelle": true,
  "categorie": "Santé | Science | Nature | Océans | Société | Culture",
  "raison_courte": "une phrase factuelle",
  "exclusions_declenchees": [],
  "doute": false
}
```

Règles dures du prompt :
- Ne juge que sur le texte fourni. Si l'information nécessaire n'y est pas, réponds `doute: true`.
- N'ajoute aucun fait, chiffre, date ou contexte qui ne soit pas dans le texte fourni.
- `doute: true` ⇒ la candidate est écartée, sans exception.
