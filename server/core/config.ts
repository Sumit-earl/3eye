import "../env";
import { z } from "zod";

// Single, validated source of truth for environment config. Fails fast at boot if a
// required var is missing/malformed rather than misbehaving at request time.

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  APP_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // While true, the app runs on a seeded mock shop with no Shopify credentials.
  MOCK_SHOPIFY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SHOPIFY_API_KEY: z.string().default(""),
  SHOPIFY_API_SECRET: z.string().default(""),
  SCOPES: z.string().default("read_orders"),
  SHOPIFY_APP_URL: z.string().default("http://localhost:3000"),

  // Privacy / hashing. INGEST_SALT must be a secret in production and rotated by ops.
  INGEST_SALT: z.string().min(8).default("dev-only-insecure-salt-change-me"),
  SESSION_HASH_TTL_HOURS: z.coerce.number().int().positive().default(24),

  // Shared secret for internal cron endpoints (e.g. retention prune). When empty, those
  // endpoints only respond in mock mode — so a real deploy never has an unauthenticated cron.
  CRON_SECRET: z.string().default(""),

  // AI conversation (paid feature). "mock" needs no key and returns deterministic text.
  AI_PROVIDER: z.enum(["mock", "openai", "anthropic"]).default("mock"),
  AI_API_KEY: z.string().default(""),
  AI_MODEL: z.string().default("mock-1"),

  // Insight-engine defaults (see PLANS/v1 open decisions — all runtime-configurable).
  K_ANONYMITY_MIN: z.coerce.number().int().positive().default(50),
  DEFAULT_CURRENCY: z.string().length(3).default("USD"),
});

export type AppConfig = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Surface the exact problem instead of a confusing downstream error.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const config: AppConfig = parsed.data;

export const isMockShopify = config.MOCK_SHOPIFY;
export const isProduction = config.NODE_ENV === "production";
