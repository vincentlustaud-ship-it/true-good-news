// Page « Confidentialité » : ce qu'on stocke (rien pour les lecteurs, l'email pour les abonnés), sans jargon.
export const CONFIDENTIALITE_MD = {
  fr: `# Confidentialité

## Pour les lecteurs : rien

Aucun compte, aucun commentaire, aucun like, aucun bouton de partage, aucune publicité, aucun contenu sponsorisé, aucun outil de mesure d'audience, aucun pixel, aucun traceur, aucun cookie. Les polices de caractères sont hébergées par nous : votre navigateur ne contacte aucun service tiers en ouvrant ce site.

Le seul chiffre que nous comptons est un **compteur d'affichages** par nouvelle, incrémenté côté serveur, sans adresse IP, sans cookie, sans empreinte de navigateur, sans session. Nous ne savons donc pas distinguer deux visites d'une même personne : c'est un compteur d'affichages, et il est présenté comme tel. Pour éviter qu'un script ne le gonfle, une limitation de débit par adresse existe en mémoire seulement, jamais écrite, jamais associée au compteur.

Vos préférences (langue choisie) restent dans votre navigateur et ne nous sont jamais transmises.

Les images des articles sont chargées en lien direct depuis le site de l'éditeur, sans lui transmettre la page d'où vous venez.

## Pour les abonnés à l'email : votre adresse, et rien d'autre

C'est la seule donnée personnelle du projet, et elle découle de l'email quotidien.

Stocké : **votre adresse email, la langue choisie, la date de confirmation et un jeton de désabonnement.** Jamais de nom, jamais d'adresse IP, jamais d'ouverture ni de clic tracés.

- **Double confirmation** : l'inscription envoie un email de confirmation ; sans clic sous 48 heures, l'adresse est supprimée.
- **Désabonnement en un clic**, sans confirmation, sans connexion, sans question : un lien en clair dans chaque email, et l'en-tête standard qui permet à votre messagerie de le faire pour vous.
- Le désabonnement **supprime** l'enregistrement. Pas de liste de suppression, pas d'archivage.
- Aucun pixel de suivi dans l'email. Aucun lien de redirection tracé : les liens pointent directement vers les articles.
- Aucune revente, aucun partage, aucun usage autre que l'envoi quotidien.

L'envoi est confié à un prestataire d'email transactionnel (Resend), qui ne reçoit que l'adresse et le contenu du message.

## Hébergement

Le site et ses fonctions sont hébergés chez Netlify. Comme tout hébergeur, Netlify tient des journaux techniques de connexion pour faire fonctionner le service ; nous n'y ajoutons rien et ne les exploitons pas.

## Contact

Une question, une correction, une demande de suppression : [${"contact@truegoodnewstoday.com"}](mailto:contact@truegoodnewstoday.com). Pas de formulaire, donc rien à stocker.
`,
  en: `# Privacy

## For readers: nothing

No account, no comments, no likes, no share buttons, no ads, no sponsored content, no audience measurement, no pixel, no tracker, no cookie. Fonts are hosted by us: your browser contacts no third-party service when opening this site.

The only number we count is a **display counter** per story, incremented server-side, with no IP address, no cookie, no browser fingerprint, no session. We therefore cannot tell two visits by the same person apart: it is a display counter, and it is presented as such. To keep scripts from inflating it, a per-address rate limit exists in memory only, never written down, never linked to the counter.

Your preferences (chosen language) stay in your browser and are never sent to us.

Article images are loaded as direct links from the publisher's site, without telling the publisher which page you came from.

## For email subscribers: your address, and nothing else

It is the only personal data in the project, and it follows from the daily email.

Stored: **your email address, the chosen language, the confirmation date and an unsubscribe token.** Never a name, never an IP address, never tracked opens or clicks.

- **Double confirmation**: signing up sends a confirmation email; without a click within 48 hours, the address is deleted.
- **One-click unsubscribe**, with no confirmation, no login, no questions: a plain link in every email, plus the standard header that lets your mail client do it for you.
- Unsubscribing **deletes** the record. No suppression list, no archive.
- No tracking pixel in the email. No tracked redirect links: links point directly to the articles.
- No resale, no sharing, no use other than the daily send.

Sending is handled by a transactional email provider (Resend), which receives only the address and the message content.

## Hosting

The site and its functions are hosted by Netlify. Like any host, Netlify keeps technical connection logs to run the service; we add nothing to them and do not use them.

## Contact

A question, a correction, a deletion request: [contact@truegoodnewstoday.com](mailto:contact@truegoodnewstoday.com). No form, so nothing to store.
`,
};
