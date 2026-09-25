import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider as AppBridgeProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { AppProvider as PolarisProvider, Badge, InlineStack, Text } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { isMockShopify, MOCK_SHOP_DOMAIN } from "../lib/env.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // In mock mode we run with no Shopify credentials, so skip the embedded admin auth.
  if (!isMockShopify) {
    await authenticate.admin(request);
  }
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    mock: isMockShopify,
    mockDomain: MOCK_SHOP_DOMAIN,
  };
};

function MockChrome({ mockDomain }: { mockDomain: string }) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        borderBottom: "1px solid #e1e3e5",
        background: "#fff",
        padding: "10px 20px",
      }}
    >
      <InlineStack gap="400" align="center" blockAlign="center" wrap={false}>
        <Text as="span" variant="headingMd" fontWeight="bold">
          3eye
        </Text>
        <Text as="span" variant="bodySm" tone="subdued">
          Environment Revenue Intelligence
        </Text>
        <nav style={{ display: "flex", gap: 16, marginLeft: 12 }}>
          <Link to="/app" style={{ color: "#303030", textDecoration: "none" }}>
            Revenue Leaks
          </Link>
          <Link to="/storefront" style={{ color: "#303030", textDecoration: "none" }}>
            Mock Storefront
          </Link>
        </nav>
        <div style={{ marginLeft: "auto" }}>
          <InlineStack gap="200" align="center" blockAlign="center">
            <Badge tone="warning">MOCK MODE</Badge>
            <Text as="span" variant="bodySm" tone="subdued">
              {mockDomain}
            </Text>
          </InlineStack>
        </div>
      </InlineStack>
    </div>
  );
}

export default function App() {
  const { apiKey, mock, mockDomain } = useLoaderData<typeof loader>();

  if (mock) {
    return (
      <PolarisProvider i18n={enTranslations}>
        <MockChrome mockDomain={mockDomain} />
        <Outlet />
      </PolarisProvider>
    );
  }

  return (
    <AppBridgeProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Revenue Leaks
        </Link>
      </NavMenu>
      <PolarisProvider i18n={enTranslations}>
        <Outlet />
      </PolarisProvider>
    </AppBridgeProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
