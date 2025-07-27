import { defineConfig } from "vite";

export default defineConfig({
    optimizeDeps: {
        exclude: ["pyodide"]
    },
    server: {
        fs: {
            allow: [".."]
        }
    }
});
