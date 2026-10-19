import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    optimizeDeps: {
        exclude: ["pyodide"]
    },
    server: {
        fs: {
            allow: [".."]
        }
    },
    plugins: [
        VitePWA({
            // Prompt (via :upgrade) rather than reloading mid-edit
            registerType: "prompt",
            includeAssets: [
                "icons/favicon-32.png",
                "icons/apple-touch-icon.png"
            ],
            manifest: {
                id: "/",
                name: "Vim Scratchpad",
                short_name: "Scratchpad",
                description:
                    "A vim-backed scratchpad for quick notes, brain dumps and code snippets",
                start_url: "/",
                display: "standalone",
                theme_color: "#2e3440",
                background_color: "#2e3440",
                icons: [
                    {
                        src: "icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "icons/maskable-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            },
            workbox: {
                // Control the page as soon as the service worker first
                // installs, so Pyodide downloads on the first visit are cached
                // (updates still wait for :upgrade)
                clientsClaim: true,
                globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
                // Pyodide's runtime and packages come from versioned CDN URLs,
                // so cache them on first use for offline Python
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/pyodide\//,
                        handler: "CacheFirst",
                        options: {
                            cacheName: "pyodide",
                            cacheableResponse: { statuses: [0, 200] },
                            expiration: { maxEntries: 200 }
                        }
                    }
                ]
            }
        })
    ]
});
