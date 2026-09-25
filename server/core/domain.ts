// Shared shop-domain normalization.
//
// Both the telemetry ingest path and the order webhook path resolve a Shop by its
// myshopify domain from an untrusted, variably-formatted string (a beacon may include a
// scheme/path; a webhook gives a bare host). Keeping one implementation here means the two
// services can never drift on how a domain is matched — a real risk when a new platform
// adapter is added later.
export function normalizeDomain(raw: string): string {
  let d = (raw ?? "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/^\/\//, "");
  d = d.split("/")[0].split("?")[0];
  return d.slice(0, 255);
}
