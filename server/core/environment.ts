import type {
  BrowserFamily,
  ConnectionQuality,
  ConnectionType,
  DeviceClass,
  OsFamily,
} from "@prisma/client";

// Environment bucketing (PRD 7.2, 7.3, PR-12).
//
// Everything here maps an untrusted client signal to a COARSE, fixed enum. We never store
// raw user-agent strings, exact screen pixels, precise bandwidth, or anything that could
// single out a device. The bucket set is deliberately small so no combination becomes a
// fingerprint. The client sends its best guess; the server normalizes + clamps it to these
// allowed values (defense in depth against a tampered beacon).

const DEVICE_VALUES: DeviceClass[] = ["MOBILE", "TABLET", "DESKTOP", "UNKNOWN"];
const BROWSER_VALUES: BrowserFamily[] = [
  "CHROME",
  "SAFARI",
  "FIREFOX",
  "EDGE",
  "SAMSUNG",
  "OPERA",
  "OTHER",
  "UNKNOWN",
];
const OS_VALUES: OsFamily[] = [
  "IOS",
  "ANDROID",
  "WINDOWS",
  "MACOS",
  "LINUX",
  "CHROMEOS",
  "OTHER",
  "UNKNOWN",
];
const CONN_TYPE_VALUES: ConnectionType[] = [
  "CELLULAR",
  "WIFI",
  "ETHERNET",
  "UNKNOWN",
];
const CONN_QUALITY_VALUES: ConnectionQuality[] = [
  "SLOW_2G",
  "G2",
  "G3",
  "G4",
  "UNKNOWN",
];

function normalize<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const up = value.trim().toUpperCase() as T;
  return allowed.includes(up) ? up : fallback;
}

export const toDeviceClass = (v: unknown): DeviceClass =>
  normalize(v, DEVICE_VALUES, "UNKNOWN");
export const toBrowserFamily = (v: unknown): BrowserFamily =>
  normalize(v, BROWSER_VALUES, "UNKNOWN");
export const toOsFamily = (v: unknown): OsFamily =>
  normalize(v, OS_VALUES, "UNKNOWN");
export const toConnectionType = (v: unknown): ConnectionType =>
  normalize(v, CONN_TYPE_VALUES, "UNKNOWN");
export const toConnectionQuality = (v: unknown): ConnectionQuality =>
  normalize(v, CONN_QUALITY_VALUES, "UNKNOWN");

// Coarse screen bucket — a range, never exact pixels.
export type ScreenBucket = "small" | "medium" | "large";
export function toScreenBucket(widthPx: unknown): ScreenBucket | null {
  const w = typeof widthPx === "number" ? widthPx : Number(widthPx);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (w < 600) return "small";
  if (w < 1024) return "medium";
  return "large";
}

// Derive a coarse connection-quality bucket from Network Information API signals.
// effectiveType is the primary signal; downlink/rtt only ever downgrade, never upgrade,
// so a flaky-but-4g connection is reported honestly as worse. Unsupported (e.g. iOS
// Safari) → UNKNOWN, never guessed (PRD 7.2 "variable by browser").
export function deriveConnectionQuality(input: {
  effectiveType?: string | null;
  downlink?: number | null; // Mbps
  rtt?: number | null; // ms
}): ConnectionQuality {
  const et = (input.effectiveType || "").toLowerCase();
  let base: ConnectionQuality;
  switch (et) {
    case "4g":
      base = "G4";
      break;
    case "3g":
      base = "G3";
      break;
    case "2g":
      base = "G2";
      break;
    case "slow-2g":
      base = "SLOW_2G";
      break;
    default:
      return "UNKNOWN";
  }
  const order: ConnectionQuality[] = ["SLOW_2G", "G2", "G3", "G4"];
  let idx = order.indexOf(base);
  const downlink = Number(input.downlink);
  const rtt = Number(input.rtt);
  if (Number.isFinite(downlink) && downlink > 0 && downlink < 0.7) idx = Math.min(idx, 1);
  if (Number.isFinite(rtt) && rtt > 300) idx = Math.max(0, idx - 1);
  return order[Math.max(0, idx)];
}

// Server-side coarse UA classifier — a FALLBACK only, for beacons that could not compute
// their own buckets. The UA is used transiently to derive coarse enums and is never stored.
export function classifyUserAgent(ua: string): {
  deviceClass: DeviceClass;
  browserFamily: BrowserFamily;
  osFamily: OsFamily;
} {
  const s = ua || "";

  let deviceClass: DeviceClass = "DESKTOP";
  if (/tablet|ipad|playbook|silk/i.test(s)) deviceClass = "TABLET";
  else if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(s))
    deviceClass = "MOBILE";

  let browserFamily: BrowserFamily = "OTHER";
  if (/edg\//i.test(s)) browserFamily = "EDGE";
  else if (/opr\/|opera/i.test(s)) browserFamily = "OPERA";
  else if (/samsungbrowser/i.test(s)) browserFamily = "SAMSUNG";
  else if (/firefox\/|fxios\//i.test(s)) browserFamily = "FIREFOX";
  else if (/chrome\/|crios\//i.test(s)) browserFamily = "CHROME";
  else if (/safari\//i.test(s)) browserFamily = "SAFARI";

  let osFamily: OsFamily = "OTHER";
  if (/iphone|ipad|ipod|ios/i.test(s)) osFamily = "IOS";
  else if (/android/i.test(s)) osFamily = "ANDROID";
  else if (/windows nt|win64|win32/i.test(s)) osFamily = "WINDOWS";
  else if (/mac os x|macintosh/i.test(s)) osFamily = "MACOS";
  else if (/cros/i.test(s)) osFamily = "CHROMEOS";
  else if (/linux/i.test(s)) osFamily = "LINUX";

  return { deviceClass, browserFamily, osFamily };
}
