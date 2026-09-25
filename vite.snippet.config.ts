import { defineConfig } from "vite";

// Separate build for the storefront capture snippet (bundled to public/threeye.js so it can
// be served as a single static asset and dropped into a theme). Kept apart from the main
// Remix vite.config.ts so the snippet bundle never pulls in the Remix plugin or app code.
export default defineConfig({
  define: { "process.env.NODE_ENV": '"production"' },
  publicDir: false, // outDir IS public/ — don't let Vite copy it into itself
  build: {
    target: "es2019",
    outDir: "public",
    emptyOutDir: false, // preserve favicon.ico and any other static assets
    minify: "esbuild",
    sourcemap: false,
    lib: {
      entry: "snippet/threeye.ts",
      name: "ThreeEye",
      formats: ["iife"],
      fileName: () => "threeye.js",
    },
    rollupOptions: {
      output: {
        // Single self-contained IIFE — no code splitting for a snippet.
        inlineDynamicImports: true,
      },
    },
  },
});
