// Copie CHARTE-EDITORIALE.md dans un module TypeScript pour l'agent de qualification
// (les fonctions Netlify ne peuvent pas lire un .md à l'exécution) et pour la page /charte.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const src = new URL("../CHARTE-EDITORIALE.md", import.meta.url);
const dst = new URL("../agents/charte.generated.ts", import.meta.url);
const dstFront = new URL("../src/content/charte.fr.generated.ts", import.meta.url);

if (!existsSync(src)) {
  console.error("CHARTE-EDITORIALE.md introuvable à la racine du dépôt.");
  process.exit(1);
}
const md = readFileSync(src, "utf8");
const body = `// Généré par scripts/embed-charte.mjs à partir de CHARTE-EDITORIALE.md — ne pas éditer à la main.\nexport const CHARTE_MD = ${JSON.stringify(md)};\n`;
for (const target of [dst, dstFront]) {
  const prev = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (prev !== body) writeFileSync(target, body);
}
console.log("Charte éditoriale intégrée (" + md.length + " caractères).");
