import { defineConfig } from "vitest/config";

// Unit tests for the platform-neutral core (server/*). These must run without a database or
// any Shopify/network access — pure bucketing, validation, hashing, and proxy-signature logic.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
