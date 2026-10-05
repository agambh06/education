import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Download updates automatically, but let users finish forms before reloading.
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["app-icon.svg", "favicon.ico", "apple-touch-icon-180x180.png"],
      manifest: {
        name: "סקולי | ניהול בית ספר",
        short_name: "סקולי",
        description: "מערכת לניהול בית ספר ולמידה משפחתית",
        lang: "he",
        dir: "rtl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#6670dc",
        background_color: "#f6f8fc",
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        clientsClaim: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api(?:\/|\?|$)/, /\/[^/?]+\.[^/]+(?:\?|$)/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
