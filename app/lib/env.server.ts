// Server-only re-exports. The `.server` suffix guarantees Remix strips this (and its
// transitive import of server/core/config, which runs process.loadEnvFile) from the client
// bundle. Routes read these in loaders/actions only and pass plain values to components.
export { isMockShopify, config } from "../../server/core/config";
export { MOCK_SHOP_DOMAIN } from "../../server/core/mock";
