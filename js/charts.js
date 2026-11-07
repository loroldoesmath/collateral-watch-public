// small svg chart builders. no dependencies, no inline styles (the content security policy forbids them).

import { esc } from "./format.js";

function rng(seed) {
  // mulberry32: deterministic, so the illustration is stable between loads
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r) {
  return Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
}

// illustrative fan of simulated value paths against a loss threshold. not model output.
export function fanChart({ thresholdDecline, maturityMonths }) {
  const W = 1000, H = 330, L = 52, R = 24, T = 16, B = 34;
  const months = 12, paths = 70, sigma = 0.036;
  const r = rng(7);
  const all = [];
  for (let p = 0; p < paths; p++) {
    let v = 100;
    const path = [v];
    for (let m = 1; m <= months; m++) {
      v *= Math.exp(sigma * gauss(r) - 0.5 * sigma * sigma);
      path.push(v);
    }
    all.push(path);
  }
  const lo = 55, hi = 125;
  const x = (m) => L + (m / months) * (W - L - R);
  const y = (v) => T + (1 - (Math.min(Math.max(v, lo), hi) - lo) / (hi - lo)) * (H - T - B);
  const q = (m, p) => {
    const col = all.map((a) => a[m]).sort((a, b) => a - b);
    return col[Math.min(col.length - 1, Math.floor(p * col.length))];
  };
  const line = (arr) => arr.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const med = Array.from({ length: months + 1 }, (_, m) => q(m, 0.5));
  const up = Array.from({ length: months + 1 }, (_, m) => q(m, 0.95));
  const dn = Array.from({ length: months + 1 }, (_, m) => q(m, 0.05));
  const band = `${line(up)}${dn.map((v, i) => `L${x(months - i).toFixed(1)} ${y(dn[months - i]).toFixed(1)}`).join("")}Z`;
  const thr = 100 * (1 - thresholdDecline);
  const grid = [60, 80, 100, 120].map((v) => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 10}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("");
  const ticks = [0, 3, 6, 9, 12].map((m) => `<text class="ax" x="${x(m)}" y="${H - 10}" text-anchor="middle">${m === 0 ? "Today" : `+${m} mo`}</text>`).join("");
  const mat = maturityMonths > 0 && maturityMonths <= months
    ? `<line class="grid-line" x1="${x(maturityMonths)}" x2="${x(maturityMonths)}" y1="${T}" y2="${H - B}" stroke-dasharray="2 4"/><text class="ax" x="${x(maturityMonths) + 6}" y="${T + 12}">Maturity</text>` : "";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustrative simulated value paths over twelve months against the loss threshold">
    ${grid}
    <rect class="fan-loss" x="${L}" y="${y(thr)}" width="${W - L - R}" height="${H - B - y(thr)}"/>
    <path class="fan-band" d="${band}"/>
    ${all.map((p) => `<path class="fan-path" d="${line(p)}"/>`).join("")}
    ${mat}
    <line class="fan-thr" x1="${L}" x2="${W - R}" y1="${y(thr)}" y2="${y(thr)}"/>
    <text class="fan-label" x="${W - R}" y="${y(thr) - 8}" text-anchor="end">Loss threshold: value falls ${(thresholdDecline * 100).toFixed(0)}% to the loan balance</text>
    <path class="fan-median" pathLength="1" d="${line(med)}"/>
    ${ticks}
  </svg>`;
}

// line chart with optional anomaly markers. dates are iso strings.
export function lineChart({ values, dates, label, fmt, anomalies = [] }) {
  const W = 440, H = 150, L = 8, R = 8, T = 12, B = 22;
  if (!values || values.length < 2) return `<p class="muted small">No history supplied.</p>`;
  const min = Math.min(...values), max = Math.max(...values);
  const pad = (max - min || 1) * 0.12;
  const lo = min - pad, hi = max + pad;
  const x = (i) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const d = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  const marks = anomalies
    .map((a) => dates.indexOf(a.date))
    .filter((i) => i >= 0)
    .map((i) => `<circle class="spark-anom" cx="${x(i)}" cy="${y(values[i])}" r="4.5"/>`).join("");
  const last = values.length - 1;
  return `<figure><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
    <line class="grid-line" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>
    <path class="spark" d="${d}"/>${marks}
    <circle class="spark-dot" cx="${x(last)}" cy="${y(values[last])}" r="3.5"/>
    <text class="ax" x="${L}" y="${H - 6}">${esc(dates[0].slice(0, 7))}</text>
    <text class="ax" x="${W - R}" y="${H - 6}" text-anchor="end">${esc(dates[last].slice(0, 7))}</text>
    <text class="ax" x="${W - R}" y="${T}" text-anchor="end">${esc(fmt(values[last]))}</text>
  </svg><figcaption class="muted small">${esc(label)}</figcaption></figure>`;
}

// horizontal bar for signed changes; width is capped at +/- cap.
export function changeBar(value, impaired, cap = 0.6) {
  const w = Math.min(Math.abs(value) / cap, 1) * 110;
  return `<svg viewBox="0 0 110 10" width="110" height="10" aria-hidden="true"><rect class="${impaired ? "bar-bad" : "bar-neg"}" x="${110 - w}" y="0" width="${w}" height="10"/></svg>`;
}

// maturity wall: balance by maturity year; years inside the next 24 months are tan.
export function maturityWall(wall, asofYear, fmt) {
  const W = 620, H = 190, L = 8, R = 8, T = 22, B = 30;
  const max = Math.max(...wall.map((w) => w.balance));
  const bw = (W - L - R) / wall.length;
  const bars = wall.map((w, i) => {
    const h = (w.balance / max) * (H - T - B);
    const soon = w.year <= asofYear + 1;
    return `<rect class="bar-wall${soon ? " soon" : ""}" x="${L + i * bw + 10}" y="${H - B - h}" width="${bw - 20}" height="${h}"/>
      <text class="ax" x="${L + i * bw + bw / 2}" y="${H - 10}" text-anchor="middle">${esc(w.year)}</text>
      <text class="ax" x="${L + i * bw + bw / 2}" y="${H - B - h - 6}" text-anchor="middle">${esc(fmt(w.balance))}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Loan balance by maturity year">${bars}</svg>`;
}
