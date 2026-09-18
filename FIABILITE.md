# Fiabilité — méthode de corroboration

## Principe

Aucune source n'est exclue a priori, ni par son nom, ni par sa ligne éditoriale, ni par son pays.
Ce qui est évalué, c'est **l'information**, pas le média qui la porte.

## Pourquoi pas de pourcentage

Un « 94 % de fiabilité » serait un chiffre arbitraire déguisé en mesure. Personne ne peut calculer
la probabilité qu'un fait soit vrai. Ce qu'on peut faire, honnêtement, c'est **compter les preuves
et les montrer**.

Le site affiche donc, pour chaque nouvelle :

> **Confirmé** — 9 rédactions indépendantes · 6 pays · aucun démenti de fact-check
> *(cliquer pour voir les 9 sources)*

## Les trois niveaux

| Niveau | Conditions cumulatives | Publiable |
|---|---|---|
| **Confirmé** | ≥ 5 rédactions indépendantes · ≥ 3 pays · aucun démenti · au moins une **source primaire** identifiable (institution, étude, communiqué officiel, organisme) | oui, prioritaire |
| **Bien corroboré** | ≥ 3 rédactions indépendantes · ≥ 2 pays · aucun démenti | oui |
| **Insuffisant** | en dessous | jamais proposé, jamais publié |

## Ce que « rédaction indépendante » veut dire

C'est le point qui fait toute la différence entre un vrai recoupement et une illusion de recoupement.

- Déduplication **par domaine** *et* **par propriétaire** : cinq titres du même groupe de presse
  comptent pour **un**. Maintenir `data/ownership.json` (groupe → domaines) et l'enrichir au fil de
  l'eau.
- Une reprise de dépêche d'agence sans travail propre compte pour **l'agence**, pas pour le média
  qui la republie. Détection : titre quasi identique + mention d'agence dans le texte.
- Un agrégateur (Google News, Yahoo, MSN, Flipboard…) ne compte jamais comme rédaction.
- Un réseau social ne compte **jamais** comme source corroborante — il ne sert qu'au repérage.

## Fact-check

Google Fact Check Tools API (`factchecktools.googleapis.com/v1alpha1/claims:search`), gratuite,
agrège les fact-checkeurs certifiés IFCN dans le monde entier.

- Requête sur les entités principales + mots-clés du titre, dans la langue d'origine **et** en
  anglais.
- Un verdict correspondant de type `False`, `Misleading`, `Altered`, `Fabricated` ⇒ **rejet
  automatique**, consigné dans le log avec le lien du fact-check.
- Aucun résultat ⇒ « aucun démenti », ce qui n'est pas une preuve de vérité et ne doit jamais être
  formulé comme telle dans l'interface.

## Source primaire

On cherche, dans le texte et les liens des articles corroborants, la trace de l'origine : DOI d'une
étude, communiqué d'une institution (OMS, ONU, UICN, agence spatiale, ministère de la santé,
université…), rapport téléchargeable. Quand elle est trouvée, elle est affichée en premier dans la
liste des preuves. C'est ce qui sépare « beaucoup de monde en parle » de « c'est établi ».

## Ce qui est stocké comme preuve

Pour chaque nouvelle publiée, l'objet `evidence` est archivé **tel quel** avec elle, pour toujours :

```json
{
  "niveau": "confirme",
  "redactions_independantes": 9,
  "pays": 6,
  "sources": [
    { "titre": "...", "url": "...", "media": "...", "pays": "TD", "langue": "fr", "date": "..." }
  ],
  "source_primaire": { "type": "institution", "nom": "...", "url": "..." },
  "factcheck": { "interroge": true, "resultats": [], "dementi": false },
  "calcule_le": "2026-09-18T04:03:00Z"
}
```

L'archive doit permettre, des mois plus tard, de rejouer le raisonnement. Si une nouvelle publiée est
démentie après coup, on ne l'efface pas : on ajoute un bandeau de correction daté sur la page
d'archive, et on garde les deux états. **La transparence inclut nos erreurs.**

## Ce que cette méthode ne fait pas

À écrire noir sur blanc sur la page « Comment nous vérifions » :

- Elle ne détecte pas une erreur reprise en chœur par toute la presse mondiale.
- Elle ne détecte pas un fait vrai mais mal interprété.
- Elle favorise mécaniquement les sujets internationaux au détriment des nouvelles locales, qui
  n'ont par nature que peu de sources.
- C'est précisément pour cela qu'un humain valide chaque publication, tous les jours.
