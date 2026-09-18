import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * API simulée pour `npm run dev` et `npm run shots` (TGN_MOCK=1) : sert les fixtures de `fixtures/`
 * à la place des fonctions Netlify. Jamais utilisée en production (Netlify exécute `vite build`).
 */
function mockApi(): Plugin {
  const dir = path.resolve("fixtures");
  const read = (name: string) => (existsSync(path.join(dir, name)) ? JSON.parse(readFileSync(path.join(dir, name), "utf8")) : null);
  const publishedDates = () => readdirSync(dir).filter((f) => /^published-\d{4}-\d{2}-\d{2}\.json$/.test(f)).map((f) => f.slice(10, 20)).sort();
  return {
    name: "tgn-mock-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/")) return next();
        const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
          res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
          res.end(JSON.stringify(body));
        };
        const dates = publishedDates();
        const latest = dates[dates.length - 1] ?? null;
        if (url.pathname === "/api/news") {
          const date = url.searchParams.get("date") ?? latest;
          const file = date ? read(`published-${date}.json`) : null;
          const prev = [...dates].reverse().find((d) => d < (date ?? "")) ?? null;
          const next = dates.find((d) => d > (date ?? "")) ?? null;
          if (!file) return send(date && url.searchParams.get("date") ? 404 : 200, { date, latest, prev, next, stats: null, stories: [], views: {} });
          const views: Record<string, number> = {};
          file.stories.forEach((s: { id: string }, i: number) => { views[s.id] = [1248, 874, 1002, 765, 611][i] ?? 300; });
          return send(200, { ...file, latest, prev, next, views });
        }
        if (url.pathname === "/api/view") return send(200, { ok: true });
        if (url.pathname === "/api/subscribe") return send(200, { ok: true });
        if (url.pathname === "/api/admin/login") return send(200, { ok: true }, { "Set-Cookie": "tgn_admin=mock; Path=/; SameSite=Strict" });
        if (url.pathname === "/api/admin/logout") return send(200, { ok: true }, { "Set-Cookie": "tgn_admin=; Path=/; Max-Age=0" });
        const authed = /tgn_admin=/.test(req.headers.cookie ?? "");
        if (url.pathname.startsWith("/api/admin/") && !authed) return send(401, { error: "non authentifié" });
        if (url.pathname === "/api/admin/candidates") {
          const date = url.searchParams.get("date") ?? "2026-09-18";
          return send(200, { date, today: "2026-09-18", candidates: read(`candidates-${date}.json`), report: read(`report-${date}.json`), published: url.searchParams.get("published") === "1" ? read(`published-${date}.json`) : null, candidateDates: ["2026-09-17", "2026-09-18"], publishedDates: dates, reportDates: ["2026-09-17", "2026-09-18"] });
        }
        if (url.pathname === "/api/admin/publish") return send(200, { ok: true, date: "2026-09-18", published: 5, email: { ok: true, status: 202, skipped: false } });
        if (url.pathname === "/api/admin/run") return send(202, { ok: true, date: "2026-09-18" });
        if (url.pathname === "/api/admin/correction") return send(200, { ok: true, corrections: [{ date: "2026-09-18", texte: "(simulation)" }] });
        return send(404, { error: "inconnu" });
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.TGN_MOCK ? [mockApi()] : []),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png", "fonts/*.woff2", "robots.txt"],
      manifest: {
        name: "True Good News",
        short_name: "True Good News",
        description: "5 bonnes nouvelles vérifiées chaque matin, du monde entier, avec leurs preuves.",
        lang: "fr",
        start_url: "/",
        display: "standalone",
        background_color: "#FBF7F0",
        theme_color: "#FBF7F0",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/\.netlify\//, /^\/admin/],
        runtimeCaching: [
          {
            urlPattern: /\/api\/news/,
            handler: "NetworkFirst",
            options: { cacheName: "news-api", expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
