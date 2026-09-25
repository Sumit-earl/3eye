// Test-time environment. server/core/config validates + throws at import time if DATABASE_URL
// is missing, so give it inert placeholder values BEFORE any test imports a module that pulls
// in config (e.g. server/core/hash). Real .env values, when present, win via `??=`.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/threeye_test";
process.env.INGEST_SALT ??= "vitest-only-insecure-salt";
process.env.MOCK_SHOPIFY ??= "true";
