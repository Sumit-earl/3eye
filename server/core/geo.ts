// Coarse country resolution from trusted edge/CDN headers only (Cloudflare, Vercel, etc.).
// The browser is never asked for its own precise location. Absent → null.
// Shared by the public /ingest endpoint and the app-proxy /apps/threeye/ingest route so both
// derive region identically. Uses only the web-standard Request, so it stays platform-neutral.
export function regionFromRequest(request: Request): string | null {
  const candidates = [
    request.headers.get("cf-ipcountry"),
    request.headers.get("x-vercel-ip-country"),
    request.headers.get("x-country-code"),
  ];
  for (const c of candidates) {
    if (c && /^[a-zA-Z]{2}$/.test(c.trim())) return c.trim().toUpperCase();
  }
  return null;
}
