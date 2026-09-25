import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

// ---------------------------------------------------------------------------
// 3eye capture snippet — the ONLY thing that runs on a merchant's storefront.
//
// Hard privacy rules baked in here (PRD §7, PR-04/09/12):
//   • No persistent cookie / no cross-visit identity. The visit id lives in sessionStorage
//     and dies with the tab. The server HMACs it and never stores the raw value.
//   • We send only COARSE, bucketable signals. No user-agent string, no exact fingerprint,
//     no precise location, no keystrokes, no element text. Browser/OS/device are derived
//     server-side from the request UA header — the client never reports them.
//   • Consent-gated. If consent is "denied" we capture nothing; if "pending" we buffer and
//     wait for the merchant's banner to resolve it via window.ThreeEye.consent(...).
//   • Fire-and-forget beacons (sendBeacon) that survive navigation and never block the page.
// ---------------------------------------------------------------------------

type ConsentStatus = "granted" | "denied" | "not_required";
type PageKind = "home" | "product" | "collection" | "cart" | "checkout" | "other";
type FunnelType = "pageview" | "add_to_cart" | "begin_checkout" | "checkout_handoff";

interface BeaconEvent {
  type: FunnelType;
  pageKind: PageKind;
  at: number;
  lcpMs?: number;
  inpMs?: number;
  fcpMs?: number;
  ttfbMs?: number;
  clsScore?: number;
}

interface ThreeEyeConfig {
  shop: string;
  ingest: string;
  erase: string;
  consent: ConsentStatus | "pending";
  // Dev-only simulation overrides (ignored in production embeds — merchants never set these).
  // They let the local Mock Storefront emit visits across device/network segments.
  sim?: { device?: string; net?: string };
}

interface ThreeEyeApi {
  consent(status: ConsentStatus): void;
  track(type: FunnelType, pageKind?: PageKind): void;
  // Self-service delete-my-data: erases this visit server-side and drops the local visit id.
  forget(): void;
  readonly version: string;
}

declare global {
  interface Window {
    ThreeEye?: ThreeEyeApi;
  }
}

const VERSION = "1";
const VID_KEY = "__threeye_vid";
const FLUSH_INTERVAL_MS = 8000;

// --- config from our own <script> tag --------------------------------------
function readConfig(): ThreeEyeConfig | null {
  const el =
    (document.currentScript as HTMLScriptElement | null) ||
    (Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]")).find((s) =>
      /threeye/i.test(s.src || ""),
    ) ??
      null);
  const shop = el?.dataset.shop;
  if (!shop) return null; // misconfigured embed → do nothing rather than send garbage
  const simDevice = el?.dataset.simDevice;
  const simNet = el?.dataset.simNet;
  return {
    shop,
    ingest: el?.dataset.ingest || `${location.origin}/ingest`,
    erase: el?.dataset.erase || `${location.origin}/privacy/erase`,
    consent: (el?.dataset.consent as ThreeEyeConfig["consent"]) || "not_required",
    sim: simDevice || simNet ? { device: simDevice, net: simNet } : undefined,
  };
}

const cfg = readConfig();

// --- per-visit id (sessionStorage only; never a persistent cookie) -----------
function randomToken(len = 16): string {
  const bytes = new Uint8Array(len);
  (globalThis.crypto || (window as any).msCrypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function makeVisitId(): string {
  try {
    const existing = sessionStorage.getItem(VID_KEY);
    if (existing && existing.length >= 8) return existing.slice(0, 128);
    const id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "")
        : randomToken(16);
    sessionStorage.setItem(VID_KEY, id);
    return id.slice(0, 128);
  } catch {
    // Private mode / storage disabled → ephemeral per-page id (still >= 8 chars).
    return randomToken(16);
  }
}

// --- coarse environment (live signals only; UA-derived fields left to server) -
function collectEnv(sim?: { device?: string; net?: string }) {
  const nav = navigator as any;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  const touch = "ontouchstart" in window || (nav.maxTouchPoints ?? 0) > 0;
  let w = screen.width || window.innerWidth || 0;
  // Coarse guess; the server may refine device class from the UA. Never exact.
  let deviceClass = !touch ? "desktop" : w < 600 ? "mobile" : w < 1024 ? "tablet" : "desktop";
  let connectionType: string | undefined = conn?.type || undefined;
  let network = conn
    ? {
        effectiveType: conn.effectiveType ?? null,
        downlink: typeof conn.downlink === "number" ? conn.downlink : null,
        rtt: typeof conn.rtt === "number" ? conn.rtt : null,
      }
    : undefined;

  // Dev-only simulation so the Mock Storefront can emit varied segments from one browser.
  if (sim?.device) {
    deviceClass = sim.device;
    w = sim.device === "mobile" ? 390 : sim.device === "tablet" ? 820 : 1440;
  }
  if (sim?.net) {
    const presets: Record<string, { downlink: number; rtt: number }> = {
      "slow-2g": { downlink: 0.1, rtt: 2000 },
      "2g": { downlink: 0.4, rtt: 450 },
      "3g": { downlink: 1.5, rtt: 150 },
      "4g": { downlink: 10, rtt: 50 },
    };
    const p = presets[sim.net] ?? presets["4g"];
    network = { effectiveType: sim.net, downlink: p.downlink, rtt: p.rtt };
    connectionType = "cellular";
  }

  return {
    deviceClass,
    connectionType,
    network,
    screenWidth: w > 0 ? Math.round(w) : undefined,
    secureContext: window.isSecureContext === true,
  };
}

// --- checkout token (best-effort revenue attribution) ----------------------
// If the theme exposes the cart token (Shopify's Ajax API sets window.Shopify.cart.token on
// many themes), we attach it at handoff so the server can join a later orders/create webhook
// back to this visit. The raw token is HMAC'd + discarded server-side, never stored. Absent on
// most hosted-checkout flows — attribution is opportunistic by design (PRD PR-11).
function readCheckoutToken(): string | undefined {
  try {
    const t = (window as any).Shopify?.cart?.token;
    return typeof t === "string" && t.length >= 8 ? t.slice(0, 128) : undefined;
  } catch {
    return undefined;
  }
}

// --- page kind (coarse, from Shopify body classes + path) --------------------
function detectPageKind(): PageKind {
  const path = location.pathname.toLowerCase();
  const body = document.body?.className || "";
  if (/^\/\d+\/checkout/.test(path) || /^\/checkout/.test(path)) return "checkout";
  if (/template-product/.test(body) || /^\/products\//.test(path)) return "product";
  if (/template-collection|template-list-collections/.test(body) || /^\/collections\//.test(path))
    return "collection";
  if (/template-cart/.test(body) || /^\/cart/.test(path)) return "cart";
  if (path === "/" || path === "") return "home";
  return "other";
}

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------
if (cfg) {
  const shop = cfg.shop;
  const ingest = cfg.ingest;
  const erase = cfg.erase;
  const vid = makeVisitId();
  const env = collectEnv(cfg.sim);

  let consent: ConsentStatus | "pending" = cfg.consent;
  let stopped = consent === "denied";

  const queue: BeaconEvent[] = []; // discrete funnel events, flushed promptly
  let pageview: BeaconEvent | null = null; // held until page hide so vitals are final
  let pageviewSent = false;

  function send(events: BeaconEvent[]) {
    if (stopped || events.length === 0) return;
    const checkoutToken = readCheckoutToken();
    const payload = JSON.stringify({
      v: Number(VERSION),
      shop,
      visitId: vid,
      consent,
      env,
      ...(checkoutToken ? { checkoutToken } : {}),
      events,
    });
    try {
      if (navigator.sendBeacon) {
        // text/plain keeps this a "simple" request → no CORS preflight from the storefront.
        const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
        if (navigator.sendBeacon(ingest, blob)) return;
      }
    } catch {
      /* fall through to fetch */
    }
    try {
      void fetch(ingest, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      });
    } catch {
      /* best effort — never throw on a storefront */
    }
  }

  // Flush discrete events only (keeps the pageview held for final vitals).
  function flushQueue() {
    if (queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    send(batch);
  }

  // Flush everything including the pageview (page is going away).
  function flushAll() {
    const batch = queue.splice(0, queue.length);
    if (pageview && !pageviewSent) {
      batch.push(pageview);
      pageviewSent = true;
      pageview = null;
    }
    send(batch);
  }

  function pushEvent(type: FunnelType, pageKind: PageKind) {
    queue.push({ type, pageKind, at: Date.now() });
  }

  function setVital(key: "lcpMs" | "inpMs" | "fcpMs" | "ttfbMs" | "clsScore", value: number) {
    if (!pageview || pageviewSent) return;
    pageview[key] = key === "clsScore" ? Math.round(value * 1000) / 1000 : Math.round(value);
  }

  // --- Web Vitals → attached to this page's pageview event -------------------
  try {
    onLCP((m) => setVital("lcpMs", m.value));
    onFCP((m) => setVital("fcpMs", m.value));
    onTTFB((m) => setVital("ttfbMs", m.value));
    onINP((m) => setVital("inpMs", m.value));
    onCLS((m) => setVital("clsScore", m.value));
  } catch {
    /* older browser without the needed APIs — vitals simply stay absent */
  }

  // --- funnel: add-to-cart (best effort, DOM-level) --------------------------
  const ATC_SELECTOR =
    'a[href*="/cart/add"], form[action*="/cart/add"] [type=submit], [data-add-to-cart], button[name=add]';
  document.addEventListener(
    "click",
    (e) => {
      const t = (e.target as Element | null)?.closest?.(ATC_SELECTOR);
      if (t) {
        pushEvent("add_to_cart", detectPageKind());
        flushQueue();
      }
    },
    { capture: true, passive: true },
  );

  // --- funnel: begin checkout (user is leaving → flush everything now) -------
  const CHECKOUT_SELECTOR =
    'a[href*="/checkout"], button[name=checkout], [data-begin-checkout], form[action*="/checkout"] [type=submit]';
  document.addEventListener(
    "click",
    (e) => {
      const t = (e.target as Element | null)?.closest?.(CHECKOUT_SELECTOR);
      if (t) {
        pushEvent("begin_checkout", detectPageKind());
        flushAll();
      }
    },
    { capture: true, passive: true },
  );

  // --- flush triggers --------------------------------------------------------
  setInterval(flushQueue, FLUSH_INTERVAL_MS);

  // visibilitychange fires before pagehide; defer a tick so web-vitals' own hidden
  // handlers have written final CLS/INP into the pageview before we send it.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") setTimeout(flushAll, 0);
  });
  window.addEventListener("pagehide", flushAll);

  // --- public API for the merchant's consent banner + manual events ----------
  const api: ThreeEyeApi = {
    version: VERSION,
    consent(status: ConsentStatus) {
      if (status === "denied") {
        consent = "denied";
        stopped = true;
        queue.length = 0;
        pageview = null;
        return;
      }
      consent = status;
      // Resuming from "pending": start capturing now.
      if (pageview === null && !pageviewSent) startPageview();
      flushQueue();
    },
    track(type: FunnelType, pageKind?: PageKind) {
      if (stopped) return;
      pushEvent(type, pageKind ?? detectPageKind());
      flushQueue();
    },
    forget() {
      // Erase this visit server-side (possession of the raw id is the proof), then drop it
      // locally and stop capturing. Works even if consent was previously denied.
      try {
        sessionStorage.removeItem(VID_KEY);
      } catch {
        /* ignore */
      }
      stopped = true;
      queue.length = 0;
      pageview = null;
      const payload = JSON.stringify({ shop, visitId: vid });
      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
          if (navigator.sendBeacon(erase, blob)) return;
        }
      } catch {
        /* fall through to fetch */
      }
      try {
        void fetch(erase, {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "text/plain;charset=UTF-8" },
          keepalive: true,
          mode: "cors",
          credentials: "omit",
        });
      } catch {
        /* best effort — never throw on a storefront */
      }
    },
  };
  window.ThreeEye = api;

  // --- initial pageview (held until hide) ------------------------------------
  function startPageview() {
    if (pageview || pageviewSent) return;
    pageview = { type: "pageview", pageKind: detectPageKind(), at: Date.now() };
  }

  if (!stopped) {
    if (consent !== "pending") {
      startPageview();
      // Send an early pageview only if the user lingers without ever hiding the tab,
      // so long-lived sessions still contribute (vitals may be partial in that case).
      setTimeout(() => {
        if (pageview && !pageviewSent) flushAll();
      }, 30000);
    }
    // If consent is "pending", we wait for api.consent(...) before the first pageview.
  }
}

export {};
