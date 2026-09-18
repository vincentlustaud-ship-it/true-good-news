# Sécurité et confidentialité

## Ce que le site ne fait pas

Aucun commentaire. Aucun compte lecteur. Aucun like, vote, réaction, note. Aucun bouton de partage.
Aucune publicité. Aucun contenu sponsorisé. Aucun analytics. Aucun pixel, aucun traceur, aucun
cookie tiers. Aucun script tiers hors les polices Google, qu'on **auto-héberge** pour supprimer même
cet appel externe.

Deux interactions existent, et seulement deux :

1. **Contact** — un lien `mailto:`. Pas de formulaire, donc rien à stocker, rien à spammer, rien à
   injecter.
2. **Abonnement à l'email quotidien** — voir plus bas.

## Compteur de vues

Un entier par publication, incrémenté côté serveur. **Pas d'adresse IP, pas de cookie, pas
d'empreinte de navigateur, pas de session.** Par conséquent on ne sait pas distinguer deux visites
d'une même personne : c'est un compteur d'affichages, et il est présenté comme tel.

Protection anti-gonflage acceptable sans identifier personne : limitation de débit par IP **en
mémoire uniquement**, jamais écrite sur disque, jamais associée au compteur.

## Abonnés — la seule donnée personnelle du projet

C'est la seule exception à « aucune donnée », et elle découle de l'email quotidien.

Stocké : **l'adresse email, la date de confirmation, un token de désabonnement.** Rien d'autre.
Jamais de nom, jamais d'IP, jamais d'ouverture ni de clic tracés.

- **Double opt-in** : l'inscription envoie un mail de confirmation ; sans clic, l'adresse est
  supprimée sous 48 h.
- **Désabonnement en un clic**, sans confirmation, sans connexion, sans question. Lien en clair dans
  chaque email + en-tête `List-Unsubscribe` et `List-Unsubscribe-Post` (RFC 8058).
- Le désabonnement **supprime** l'enregistrement. Pas de liste de suppression, pas d'archivage.
- Aucun pixel de suivi dans l'email. Aucun lien de redirection tracé : les liens pointent
  directement vers les articles.
- Aucune revente, aucun partage, aucun usage autre que l'envoi quotidien.
- Page `/confidentialite` : dit exactement cela, en français et en anglais, sans jargon.

## Administration

- Route `/admin` : `noindex`, jamais liée depuis le site public.
- Authentification par mot de passe (hash argon2id ou bcrypt en variable d'environnement, jamais en
  clair, jamais dans le dépôt) + cookie de session signé, `HttpOnly`, `Secure`, `SameSite=Strict`,
  expiration courte.
- Limitation de débit sur la route de connexion, délai croissant après échecs.
- Toutes les fonctions `admin-*` vérifient la session avant toute action. Aucune ne fait confiance à
  un paramètre client pour décider ce qui est publié.

## En-têtes HTTP

Dans `netlify.toml`, sur tout le site :

```
Content-Security-Policy: default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()
X-Frame-Options: DENY
```

`img-src https:` est nécessaire pour les vignettes Open Graph des éditeurs, chargées en lien direct.
`Referrer-Policy: no-referrer` : les éditeurs ne voient pas d'où viennent nos lecteurs.

## Dépendances et secrets

- Dépendances minimales, mises à jour, `npm audit` propre avant chaque déploiement.
- Aucun secret dans le dépôt : uniquement des variables d'environnement Netlify. `.env` dans
  `.gitignore`.
- Les clés d'API n'apparaissent jamais dans le code client — elles ne sont lues que dans les
  fonctions serveur.

## Contenu entrant

Tout ce qui vient de l'extérieur (titres, résumés, métadonnées des sources) est traité comme **non
fiable** : échappement systématique au rendu, jamais de `dangerouslySetInnerHTML`, jamais de HTML
brut d'une source injecté dans la page. Les textes récupérés ne sont pas non plus des instructions
pour le LLM de qualification : ils lui sont passés comme données délimitées.
