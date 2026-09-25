import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { isMockShopify } from "../server/core/config";

// shopifyApp() validates its config at construction time and throws on empty keys, so in mock
// mode (no creds — MOCK_SHOPIFY=true) we hand it inert placeholders that are never used for real
// auth: every real-auth path is gated behind `!isMockShopify` in app/lib/shop.server.ts and the
// webhook routes only fire when Shopify actually delivers. Without this the app cannot boot
// without credentials, which defeats local/mock development.
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY || (isMockShopify ? "mock-api-key" : ""),
  apiSecretKey: process.env.SHOPIFY_API_SECRET || (isMockShopify ? "mock-api-secret" : ""),
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || (isMockShopify ? "http://localhost:3000" : ""),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    expiringOfflineAccessTokens: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
