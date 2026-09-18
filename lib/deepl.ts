/** DeepL : traduction FR/EN. Sans clé ou en échec : null, et l'appelant dégrade proprement. */
import { env, USER_AGENT } from "./env.ts";

export type Target = "fr" | "en";

export interface DeeplResult { texts: string[]; detected: string | null }

export async function deeplTranslate(texts: string[], target: Target, source?: string | null): Promise<DeeplResult | null> {
  const key = env.deeplKey;
  if (!key) return null;
  const base = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const body: Record<string, unknown> = { text: texts, target_lang: target === "fr" ? "FR" : "EN-GB", preserve_formatting: true };
  if (source && /^[a-z]{2}$/i.test(source)) body.source_lang = source.toUpperCase();
  try {
    const res = await fetch(`${base}/v2/translate`, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${key}`, "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { translations?: Array<{ text: string; detected_source_language?: string }> };
    const tr = j.translations ?? [];
    if (tr.length !== texts.length) return null;
    return { texts: tr.map((t) => t.text), detected: tr[0]?.detected_source_language?.toLowerCase() ?? null };
  } catch {
    return null;
  }
}
