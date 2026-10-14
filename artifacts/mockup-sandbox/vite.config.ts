import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";

// Vercel does not provide PORT during a static Vite build. Keep a safe local
// default for development, while still honoring an explicitly configured port.
const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

function normalizeBasePath(value: string | undefined, fallback: string): string {
  if (!value?.trim()) return fallback;
  const segment = value.trim().replace(/^\/+|\/+$/g, "");
  return segment ? `/${segment}/` : "/";
}

// This app is mounted at /mockups on the shared Vercel Services domain.
// Locally it remains available at / unless BASE_PATH is explicitly set.
const basePath = normalizeBasePath(
  process.env.BASE_PATH,
  process.env.VERCEL ? "/mockups/" : "/",
);

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
