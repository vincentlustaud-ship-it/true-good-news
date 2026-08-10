import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Bonnes Nouvelles",
        short_name: "BonnesNouvelles",
        description: "De vraies bonnes nouvelles du monde, chaque jour, en 5 langues.",
        start_url: "/",
        display: "standalone",
        background_color: "#fffaf0",
        theme_color: "#e8a33d",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/api\/news/,
            handler: "NetworkFirst",
            options: {
              cacheName: "news-api",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 6 },
            },
          },
        ],
      },
    }),
  ],
});
