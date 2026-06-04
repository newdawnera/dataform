import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mode === "test" ? null : cloudflare(),
  ].filter(Boolean),
}));
