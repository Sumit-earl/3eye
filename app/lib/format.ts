// Client-safe formatting helpers (no server/node imports — safe to bundle for the browser).

export function formatMoney(cents: number, currency = "USD", decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(cents / 100);
}

// Conversion rate stored as integer basis points (201 → "2.01%").
export function formatCvrBp(bp: number | null): string {
  if (bp == null) return "—";
  return `${(bp / 100).toFixed(2)}%`;
}

export function formatPercent(ratio: number | null, digits = 0): string {
  if (ratio == null) return "—";
  return `${(ratio * 100).toFixed(digits)}%`;
}

// Latency in ms → compact human string (3679 → "3.7s", 820 → "820ms").
export function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// "3h ago", "2d ago", "just now" — for "last computed" stamps.
export function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "never";
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}
