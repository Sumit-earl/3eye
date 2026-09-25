// Side-effect module: load .env into process.env for local development.
//
// The Shopify CLI normally injects these vars when you run `shopify app dev`. Since we
// build code-first with `remix vite:dev` (no Shopify account yet), we load .env ourselves
// using Node's built-in loader (Node 20.12+). In production, real environment variables
// are provided by the host and no .env file is present — the try/catch makes that a no-op.
//
// Import this FIRST in any module that reads process.env at import time (e.g. the Prisma
// client singleton), so values are present before clients are constructed.
try {
  const load = (process as unknown as { loadEnvFile?: (path?: string) => void })
    .loadEnvFile;
  if (typeof load === "function") load.call(process);
} catch {
  // .env not present (e.g. production) — rely on the real environment.
}

export {};
