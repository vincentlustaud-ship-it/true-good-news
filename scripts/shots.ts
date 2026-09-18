/**
 * npm run shots — captures 1280 et 390 de chaque page (API simulée sur les fixtures), plus l'email à 600.
 * Sortie : shots/<page>-<largeur>.png. À regarder avant de déclarer une page terminée (DESIGN.md).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import fixture from "../fixtures/published-2026-09-18.json" with { type: "json" };
import { renderDailyEmail } from "../lib/email.ts";
import type { PublishedFile } from "../agents/types.ts";

process.env.TGN_MOCK = "1";
const PORT = 5177;
const OUT = path.resolve("shots");
mkdirSync(OUT, { recursive: true });

const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const widths = [1280, 390];
const pages: Array<{ name: string; path: string; admin?: boolean; dark?: boolean; lang?: "fr" | "en" }> = [
  { name: "accueil", path: "/" },
  { name: "accueil-en", path: "/", lang: "en" },
  { name: "accueil-sombre", path: "/", dark: true },
  { name: "archive", path: "/archive/2026-09-17" },
  { name: "verification", path: "/verification" },
  { name: "charte", path: "/charte" },
  { name: "charte-en", path: "/charte", lang: "en" },
  { name: "confidentialite", path: "/confidentialite" },
  { name: "abonnement", path: "/abonnement?etat=confirme" },
  { name: "admin-connexion", path: "/admin" },
  { name: "admin", path: "/admin", admin: true },
  { name: "admin-publie", path: "/admin?published=1", admin: true },
];

const server = await createServer({ configFile: path.resolve("vite.config.ts"), server: { port: PORT, strictPort: true }, logLevel: "error" });
await server.listen();
const base = `http://localhost:${PORT}`;
const browser = await chromium.launch();
try {
  for (const p of pages) {
    if (only.length && !only.includes(p.name)) continue;
    for (const w of widths) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, colorScheme: p.dark ? "dark" : "light", locale: p.lang === "en" ? "en-GB" : "fr-FR" });
      if (p.admin) await ctx.addCookies([{ name: "tgn_admin", value: "mock", domain: "localhost", path: "/" }]);
      const page = await ctx.newPage();
      if (p.lang) await page.addInitScript((l) => { try { localStorage.setItem("tgn-lang", l); } catch { /* ignore */ } }, p.lang);
      // Admin : la page lit ?published=1 uniquement via l'API simulée ; on passe le paramètre à l'appel candidates.
      if (p.path.includes("published=1")) await page.route("**/api/admin/candidates*", (route) => route.continue({ url: route.request().url() + (route.request().url().includes("?") ? "&" : "?") + "published=1" }));
      await page.goto(base + p.path, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      // Ouvre le premier bloc de preuves pour vérifier son rendu.
      if (p.name === "accueil" && w === 1280) { const btn = page.locator(".evidence__toggle").first(); if (await btn.count()) await btn.click(); await page.waitForTimeout(150); }
      if (p.name === "admin") { const boxes = page.locator(".cand input[type=checkbox]"); const n = Math.min(3, await boxes.count()); for (let i = 0; i < n; i++) await boxes.nth(i).check({ force: true }); const src = page.locator(".cand .evidence__toggle").first(); if (await src.count()) await src.click(); await page.waitForTimeout(150); }
      const file = path.join(OUT, `${p.name}-${w}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log("→", path.relative(process.cwd(), file));
      await ctx.close();
    }
  }
  if (!only.length || only.includes("email")) {
    process.env.SITE_URL ??= "https://truegoodnewstoday.com";
    for (const lang of ["fr", "en"] as const) {
      const { html } = renderDailyEmail(fixture as unknown as PublishedFile, lang, "https://truegoodnewstoday.com/api/unsubscribe?token=exemple");
      const f = path.join(OUT, `email-${lang}.html`);
      writeFileSync(f, html);
      const ctx = await browser.newContext({ viewport: { width: 640, height: 900 } });
      const page = await ctx.newPage();
      await page.setContent(html, { waitUntil: "load" });
      await page.screenshot({ path: path.join(OUT, `email-${lang}-600.png`), fullPage: true });
      console.log("→", `shots/email-${lang}-600.png`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
