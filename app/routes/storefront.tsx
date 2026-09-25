import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";

import { isMockShopify, MOCK_SHOP_DOMAIN } from "../lib/env.server";
import { findMockShop } from "../../server/core/mock";
import { handleIngest } from "../../server/ingest/handleIngest";
import { handleOrder } from "../../server/orders/handleOrder";
import { mapShopifyOrder } from "../../server/orders/shopify/mapOrder";
import { deriveConnectionQuality } from "../../server/core/environment";

// ---------------------------------------------------------------------------
// /storefront — a LOCAL-ONLY simulator that stands in for a merchant's shop so we can
// exercise the real capture path end to end with no Shopify account:
//   browser → public/threeye.js snippet → sendBeacon → POST /ingest → Postgres.
// It can also bulk-generate traffic through the SAME handleIngest core the real beacon uses,
// so you can cross the k-anonymity threshold and watch a live leak emerge on the dashboard.
// ---------------------------------------------------------------------------

const UAS: Record<string, string> = {
  mobile:
    "Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
  tablet:
    "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
  desktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

const NET_PRESETS: Record<string, { downlink: number; rtt: number }> = {
  "2g": { downlink: 0.4, rtt: 450 },
  "3g": { downlink: 1.5, rtt: 150 },
  "4g": { downlink: 10, rtt: 50 },
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function token(len = 16) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  return {
    mock: isMockShopify,
    shop: MOCK_SHOP_DOMAIN,
    ingest: "/ingest",
    params: {
      device: url.searchParams.get("device") || "desktop",
      net: url.searchParams.get("net") || "4g",
      consent: url.searchParams.get("consent") || "granted",
      slow: url.searchParams.get("slow") || "0",
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (!isMockShopify) return { ok: false as const, error: "Simulator is mock-mode only." };
  const shop = await findMockShop();
  if (!shop) return { ok: false as const, error: "Mock shop not seeded." };

  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  const device = String(form.get("device") || "desktop");
  const net = String(form.get("net") || "4g");
  const slow = String(form.get("slow") || "0") === "4000";
  const count = Math.min(500, Math.max(1, Number(form.get("count") || 150) || 150));

  if (intent === "simulate") {
    const ua = UAS[device] ?? UAS.desktop;
    const preset = NET_PRESETS[net] ?? NET_PRESETS["4g"];
    const bcRate = net === "2g" ? 0.09 : net === "3g" ? 0.13 : 0.18;
    const atcRate = 0.35;
    let stored = 0;
    for (let i = 0; i < count; i++) {
      const lcp = slow ? rand(5500, 8000) : rand(1200, 2600);
      const events: unknown[] = [
        { type: "pageview", pageKind: "home", lcpMs: Math.round(lcp), ttfbMs: Math.round(rand(200, slow ? 1600 : 600)) },
      ];
      if (Math.random() < atcRate)
        events.push({ type: "add_to_cart", pageKind: "product", inpMs: Math.round(rand(80, 400)) });
      if (Math.random() < bcRate)
        events.push({ type: "begin_checkout", pageKind: "checkout", lcpMs: Math.round(lcp * 1.05) });
      const res = await handleIngest(
        {
          shop: MOCK_SHOP_DOMAIN,
          visitId: token(16),
          consent: "granted",
          env: {
            deviceClass: device,
            network: { effectiveType: net, downlink: preset.downlink, rtt: preset.rtt },
            screenWidth: device === "mobile" ? 390 : device === "tablet" ? 820 : 1440,
            secureContext: true,
          },
          events,
        },
        { userAgent: ua, regionCountry: null },
      );
      if (res.status === "ok") stored += res.eventsStored;
    }
    return {
      ok: true as const,
      message: `Simulated ${count} visits (${device} · ${net}${slow ? " · slow" : ""}) → ${stored} events ingested. Now open Revenue Leaks and hit Recompute.`,
      quality: deriveConnectionQuality({ effectiveType: net, downlink: preset.downlink, rtt: preset.rtt }),
    };
  }

  if (intent === "orders") {
    const ua = UAS[device] ?? UAS.desktop;
    const preset = NET_PRESETS[net] ?? NET_PRESETS["4g"];
    const orderCount = Math.min(500, Math.max(1, Number(form.get("count") || 40) || 40));
    let created = 0;
    let attributed = 0;
    for (let i = 0; i < orderCount; i++) {
      const checkoutToken = token(16);
      const lcp = slow ? rand(5500, 8000) : rand(1200, 2600);
      // 1) A visit that reaches checkout and hands off the cart token (capture side).
      await handleIngest(
        {
          shop: MOCK_SHOP_DOMAIN,
          visitId: token(16),
          checkoutToken,
          consent: "granted",
          env: {
            deviceClass: device,
            network: { effectiveType: net, downlink: preset.downlink, rtt: preset.rtt },
            screenWidth: device === "mobile" ? 390 : device === "tablet" ? 820 : 1440,
            secureContext: true,
          },
          events: [
            { type: "pageview", pageKind: "home", lcpMs: Math.round(lcp), ttfbMs: Math.round(rand(200, 600)) },
            { type: "begin_checkout", pageKind: "checkout" },
          ],
        },
        { userAgent: ua, regionCountry: null },
      );
      // 2) The matching order, through the REAL Shopify mapper + orders core (webhook side).
      const dto = mapShopifyOrder(
        {
          admin_graphql_api_id: `gid://shopify/Order/9${Date.now()}${i}`,
          id: 9000000000 + i,
          order_number: 2000 + i,
          presentment_currency: "USD",
          current_total_price: (40 + Math.random() * 80).toFixed(2),
          current_subtotal_price: (35 + Math.random() * 70).toFixed(2),
          checkout_token: checkoutToken,
          processed_at: new Date().toISOString(),
          financial_status: "paid",
          test: false,
        },
        MOCK_SHOP_DOMAIN,
      );
      const res = await handleOrder(dto);
      if (res.status === "created" || res.status === "updated") {
        created++;
        if (res.attributed) attributed++;
      }
    }
    return {
      ok: true as const,
      message: `Emitted ${created} orders through the real orders/create pipeline — ${attributed} joined to a visit via checkout token. Open Revenue Leaks and hit Recompute.`,
      quality: deriveConnectionQuality({ effectiveType: net, downlink: preset.downlink, rtt: preset.rtt }),
    };
  }

  return { ok: false as const, error: "Unknown intent." };
};

type BeaconLog = { id: number; url: string; text: string; at: number };

export default function Storefront() {
  const { mock, shop, ingest, params } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [logs, setLogs] = useState<BeaconLog[]>([]);
  const [heroVisible, setHeroVisible] = useState(params.slow === "0");
  const [cart, setCart] = useState(0);
  const [forgetMsg, setForgetMsg] = useState<string | null>(null);
  const logId = useRef(0);

  // Slow-page simulation: delay the hero (the LCP candidate) so real Web Vitals inflate.
  useEffect(() => {
    if (params.slow === "0") return;
    const t = setTimeout(() => setHeroVisible(true), Number(params.slow));
    return () => clearTimeout(t);
  }, [params.slow]);

  // Instrument sendBeacon + fetch BEFORE loading the snippet, then inject the snippet so we
  // can watch exactly what a real storefront would ship to /ingest.
  useEffect(() => {
    if (!mock) return;
    const addLog = (url: string, text: string) =>
      setLogs((prev) => [{ id: logId.current++, url, text, at: Date.now() }, ...prev].slice(0, 12));

    const origBeacon = navigator.sendBeacon?.bind(navigator);
    if (origBeacon) {
      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
        try {
          if (data instanceof Blob) void data.text().then((t) => addLog(String(url), t));
          else if (typeof data === "string") addLog(String(url), data);
        } catch {
          /* ignore */
        }
        return origBeacon(url as string, data);
      };
    }
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (u.includes("/ingest") && typeof init?.body === "string") addLog(u, init.body);
      return origFetch(input as RequestInfo, init);
    };

    const s = document.createElement("script");
    s.src = "/threeye.js";
    s.defer = true;
    s.dataset.shop = shop;
    s.dataset.ingest = ingest;
    s.dataset.consent = params.consent;
    if (params.device !== "desktop") s.dataset.simDevice = params.device;
    if (params.net !== "4g") s.dataset.simNet = params.net;
    document.body.appendChild(s);

    return () => {
      navigator.sendBeacon = origBeacon!;
      window.fetch = origFetch;
      s.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mock) {
    return (
      <div style={wrap}>
        <h1 style={{ fontSize: 22 }}>Storefront simulator</h1>
        <p>Available only when MOCK_SHOPIFY=true.</p>
      </div>
    );
  }

  const applyVisit = (next: Record<string, string>) => {
    try {
      sessionStorage.removeItem("__threeye_vid");
    } catch {
      /* ignore */
    }
    const q = new URLSearchParams({ ...params, ...next });
    window.location.href = `/storefront?${q.toString()}`;
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f6f6f7", fontFamily: "system-ui, sans-serif" }}>
      {/* Simulated storefront */}
      <div style={{ flex: 1, padding: 24 }}>
        <div style={bar}>
          <strong>🛍️ Acme Outfitters</strong>
          <span style={{ color: "#666" }}>(simulated storefront — not a real shop)</span>
          <span style={{ marginLeft: "auto" }}>Cart: {cart}</span>
        </div>

        {/* LCP hero — delayed when simulating a slow page */}
        <div style={{ minHeight: 220 }}>
          {heroVisible ? (
            <div style={hero}>
              <h1 style={{ margin: 0, fontSize: 34, color: "#fff" }}>Winter Gear, Delivered</h1>
              <p style={{ color: "#e6e6e6" }}>Free shipping over $75 · 30-day returns</p>
            </div>
          ) : (
            <div style={{ ...hero, background: "#e1e3e5", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#8a8a8a" }}>Loading hero image… (simulating slow LCP)</span>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginTop: 20 }}>
          {["Alpine Jacket", "Trail Boots", "Thermal Kit", "Summit Pack"].map((p) => (
            <div key={p} style={product}>
              <div style={{ height: 90, background: "#dfe3e8", borderRadius: 6 }} />
              <div style={{ fontWeight: 600, marginTop: 8 }}>{p}</div>
              <div style={{ color: "#666" }}>$89.00</div>
              <button
                data-add-to-cart
                onClick={() => setCart((c) => c + 1)}
                style={{ ...btn, marginTop: 8, width: "100%" }}
              >
                Add to cart
              </button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <button data-begin-checkout style={{ ...btn, ...btnPrimary }}>
            Checkout →
          </button>
          <span style={{ color: "#666", marginLeft: 12, fontSize: 13 }}>
            (fires a begin_checkout beacon, then would redirect to hosted checkout)
          </span>
        </div>
      </div>

      {/* Control + instrumentation panel */}
      <div style={{ width: 380, borderLeft: "1px solid #ddd", background: "#fff", padding: 16, overflowY: "auto" }}>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Capture simulator</h2>
        <p style={{ color: "#666", fontSize: 13, marginTop: 0 }}>
          Device/network/page-speed apply to <em>live</em> snippet capture. Changing them starts a
          new visit.
        </p>

        <div style={row}>
          <label>Device</label>
          <select value={params.device} onChange={(e) => applyVisit({ device: e.target.value })} style={sel}>
            <option value="desktop">desktop</option>
            <option value="mobile">mobile</option>
            <option value="tablet">tablet</option>
          </select>
        </div>
        <div style={row}>
          <label>Network</label>
          <select value={params.net} onChange={(e) => applyVisit({ net: e.target.value })} style={sel}>
            <option value="4g">4g / fast</option>
            <option value="3g">3g / medium</option>
            <option value="2g">2g / slow</option>
          </select>
        </div>
        <div style={row}>
          <label>Page speed</label>
          <select value={params.slow} onChange={(e) => applyVisit({ slow: e.target.value })} style={sel}>
            <option value="0">fast (~1.5s LCP)</option>
            <option value="4000">slow (~4s LCP)</option>
          </select>
        </div>
        <div style={row}>
          <label>Consent</label>
          <select value={params.consent} onChange={(e) => applyVisit({ consent: e.target.value })} style={sel}>
            <option value="granted">granted</option>
            <option value="not_required">not_required</option>
            <option value="pending">pending (banner)</option>
            <option value="denied">denied (no capture)</option>
          </select>
        </div>

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />

        <Form method="post">
          <input type="hidden" name="intent" value="simulate" />
          <input type="hidden" name="device" value={params.device} />
          <input type="hidden" name="net" value={params.net} />
          <input type="hidden" name="slow" value={params.slow} />
          <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Bulk-generate traffic</h3>
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
            Pushes visits through the real ingestion core so a segment can cross k=50 and surface
            as a leak.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input name="count" defaultValue={150} style={{ ...sel, width: 80 }} />
            <button type="submit" style={{ ...btn, ...btnPrimary }}>
              Simulate visits
            </button>
          </div>
        </Form>

        <Form method="post" style={{ marginTop: 16 }}>
          <input type="hidden" name="intent" value="orders" />
          <input type="hidden" name="device" value={params.device} />
          <input type="hidden" name="net" value={params.net} />
          <input type="hidden" name="slow" value={params.slow} />
          <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Emit orders (revenue join)</h3>
          <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
            Runs a checkout visit through capture, then a matching order through the real
            <code> orders/create</code> pipeline — proving the order→visit attribution join.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input name="count" defaultValue={40} style={{ ...sel, width: 80 }} />
            <button type="submit" style={{ ...btn, ...btnPrimary }}>
              Emit orders
            </button>
          </div>
        </Form>

        {actionData?.ok && (
          <div style={{ marginTop: 12, padding: 10, background: "#eaf5ea", borderRadius: 6, fontSize: 13 }}>
            ✅ {actionData.message}
          </div>
        )}
        {actionData && !actionData.ok && (
          <div style={{ marginTop: 12, padding: 10, background: "#fdeaea", borderRadius: 6, fontSize: 13 }}>
            ⚠️ {actionData.error}
          </div>
        )}

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />

        <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>Privacy</h3>
        <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>
          Exercises the real delete-my-data path: drops the local visit id and beacons{" "}
          <code>/privacy/erase</code>, which erases this visit server-side.
        </p>
        <button
          type="button"
          style={btn}
          onClick={() => {
            const api = (window as unknown as { ThreeEye?: { forget?: () => void } }).ThreeEye;
            if (api?.forget) {
              api.forget();
              setForgetMsg("Forget request sent — visit erased server-side, local visit id dropped.");
            } else {
              setForgetMsg("Snippet not loaded yet (or consent denied before init).");
            }
          }}
        >
          Forget my visit
        </button>
        {forgetMsg && (
          <div style={{ marginTop: 8, padding: 10, background: "#eef2ff", borderRadius: 6, fontSize: 12 }}>
            🧹 {forgetMsg}
          </div>
        )}

        <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #eee" }} />

        <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>
          Beacon log <span style={{ color: "#999", fontWeight: 400 }}>({logs.length})</span>
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.length === 0 && (
            <span style={{ color: "#999", fontSize: 12 }}>
              Interact with the store or hide the tab to flush a beacon…
            </span>
          )}
          {logs.map((l) => (
            <pre key={l.id} style={logPre}>
              <span style={{ color: "#0a7" }}>{l.url}</span>
              {"\n"}
              {pretty(l.text)}
            </pre>
          ))}
        </div>
      </div>
    </div>
  );
}

function pretty(text: string) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

const wrap = { padding: 24, fontFamily: "system-ui, sans-serif" } as const;
const bar = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: "10px 14px",
  background: "#fff",
  borderRadius: 8,
  border: "1px solid #e1e3e5",
} as const;
const hero = {
  marginTop: 16,
  height: 200,
  borderRadius: 12,
  background: "linear-gradient(120deg,#2b6cb0,#1a365d)",
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
  padding: 24,
};
const product = {
  background: "#fff",
  border: "1px solid #e1e3e5",
  borderRadius: 8,
  padding: 12,
} as const;
const btn = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #c9c9c9",
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
} as const;
const btnPrimary = { background: "#2b6cb0", color: "#fff", border: "1px solid #2b6cb0" } as const;
const row = { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } as const;
const sel = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #c9c9c9",
  fontSize: 13,
  marginLeft: "auto",
} as const;
const logPre = {
  margin: 0,
  padding: 8,
  background: "#0b1021",
  color: "#cdd6f4",
  borderRadius: 6,
  fontSize: 11,
  lineHeight: 1.4,
  maxHeight: 180,
  overflow: "auto",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
};
