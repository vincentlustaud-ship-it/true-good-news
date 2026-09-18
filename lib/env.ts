/** Accès centralisé aux variables d'environnement, sans jamais les exposer côté client. */
export const env = {
  get anthropicKey() { return process.env.ANTHROPIC_API_KEY?.trim() || null; },
  get qualifyModel() { return process.env.QUALIFY_MODEL?.trim() || "claude-opus-5"; },
  get deeplKey() { return process.env.DEEPL_API_KEY?.trim() || null; },
  get factcheckKey() { return process.env.GOOGLE_FACTCHECK_API_KEY?.trim() || null; },
  get resendKey() { return process.env.RESEND_API_KEY?.trim() || null; },
  get emailFrom() { return process.env.EMAIL_FROM?.trim() || "True Good News <bonjour@truegoodnewstoday.com>"; },
  get adminPasswordHash() { return process.env.ADMIN_PASSWORD_HASH?.trim() || null; },
  get sessionSecret() { return process.env.SESSION_SECRET?.trim() || null; },
  get siteUrl() { return (process.env.SITE_URL?.trim() || process.env.URL?.trim() || "http://localhost:8888").replace(/\/+$/, ""); },
  get contactEmail() { return process.env.CONTACT_EMAIL?.trim() || "contact@truegoodnewstoday.com"; },
  get blueskyIdentifier() { return process.env.BLUESKY_IDENTIFIER?.trim() || null; },
  get blueskyAppPassword() { return process.env.BLUESKY_APP_PASSWORD?.trim() || null; },
  get redditClientId() { return process.env.REDDIT_CLIENT_ID?.trim() || null; },
  get redditClientSecret() { return process.env.REDDIT_CLIENT_SECRET?.trim() || null; },
};

export const USER_AGENT = "TrueGoodNews/1.0 (+https://truegoodnewstoday.com/robots)";
