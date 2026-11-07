// formatting helpers. every string that comes from data goes through esc() before it reaches the dom.

const ENT = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ENT[c]);

const MINUS = "\u2212";
const sign = (n) => (n < 0 ? MINUS : "");

export function money(n) {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const a = Math.abs(n);
  const body = a >= 1e9 ? `$${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `$${(a / 1e6).toFixed(1)}M` : `$${Math.round(a / 1e3)}K`;
  return sign(n) + body;
}
export const pct = (n, d = 1) => (n == null || !Number.isFinite(n) ? "n/a" : `${sign(n)}${Math.abs(n * 100).toFixed(d)}%`);
export const signedPct = (n, d = 1) => (n == null || !Number.isFinite(n) ? "n/a" : `${n > 0 ? "+" : sign(n)}${Math.abs(n * 100).toFixed(d)}%`);
export const ratio = (n) => (n == null || !Number.isFinite(n) ? "n/a" : `${n.toFixed(2)}x`);
export const bps = (n) => `${Math.round(n)} bp`;

export function monthYear(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}
export function shortDate(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
export function maturityText(months) {
  if (months <= 0) return "Past due";
  return months === 1 ? "1 month" : `${months} months`;
}

export const LEVEL = { red: "Red flag", amber: "Watch", green: "Clear" };
export const pill = (level) => `<span class="pill pill-${esc(level)}">${LEVEL[level] ?? esc(level)}</span>`;
export const BINDING = { ltv: "loan-to-value", dscr: "debt service coverage", debt_yield: "debt yield" };
