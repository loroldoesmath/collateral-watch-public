import { loadAssessment } from "../api.js";
import { esc, pct, shortDate, signedPct } from "../format.js";

const SOURCES = [
  ["News and local announcements", "Employer news, supply deliveries, concessions", "Reads headlines and articles as language to score local conditions"],
  ["Moving and migration demand", "Relative demand for moving between markets", "Used as an indicator of in-migration and household formation"],
  ["Travel activity", "Air travel volumes and fares", "Used as an indicator of business and population movement"],
];

export const signals = {
  title: "Signals",
  needsData: true,
  async render(main) {
    const d = await loadAssessment();
    const anomalies = d.assets.flatMap((a) => a.anomalies.map((x) => ({ ...x, asset: a }))).sort((p, q) => q.date.localeCompare(p.date));
    const byMarket = new Map();
    for (const a of d.assets) {
      const m = byMarket.get(a.market) || { market: a.market, assets: 0, trailing: [], nowcast: a.rent_growth_nowcast, docs: a.signals };
      m.assets += 1;
      m.trailing.push(a.rent_growth_yoy);
      byMarket.set(a.market, m);
    }
    const markets = [...byMarket.values()].sort((a, b) => (a.nowcast ?? 0) - (b.nowcast ?? 0));
    main.innerHTML = `<div class="wrap page">
      <header><div><h1>Signals</h1><p>Unusual movements in occupancy and value, and what public data says about the markets behind your loans.</p></div></header>
      <div class="notice" role="note">${esc(d.meta.data_notice)} Public-data sources are not connected in the sample.</div>

      <section class="block" aria-labelledby="an"><h2 id="an">Anomalies</h2>
        <p class="muted small">Recent changes in occupancy or valuation that are both statistically unusual and large enough to matter.</p>
        <div class="table-wrap"><table>
          <caption>${anomalies.length} anomalies in the most recent months</caption>
          <thead><tr><th>Asset</th><th>Metric</th><th>Month</th><th class="r">Observed</th><th class="r">Expected</th><th class="r">Deviation</th></tr></thead>
          <tbody>${anomalies.map((x) => `<tr><td>${esc(x.asset.name)}<span class="sub">${esc(x.asset.market)}</span></td>
            <td>${x.metric === "occupancy" ? "Occupancy" : "Valuation index"}</td><td>${esc(shortDate(x.date))}</td>
            <td class="r num ${x.direction === "down" ? "bad" : ""}">${x.metric === "occupancy" ? pct(x.observed, 1) : x.observed.toFixed(1)}</td>
            <td class="r num">${x.metric === "occupancy" ? pct(x.expected, 1) : x.expected.toFixed(1)}</td>
            <td class="r num">${x.z.toFixed(1)} robust deviations</td></tr>`).join("") || `<tr><td colspan="6" class="muted">No anomalies in the most recent months.</td></tr>`}</tbody>
        </table></div>
      </section>

      <section class="block" aria-labelledby="mk"><h2 id="mk">Markets</h2>
        <p class="muted small">Rent growth nowcast against trailing growth, with the most influential headlines. Lowest nowcast first.</p>
        <div class="table-wrap"><table>
          <caption>${markets.length} markets</caption>
          <thead><tr><th>Market</th><th class="r">Loans</th><th class="r">Trailing rent growth</th><th class="r">Nowcast</th><th>Headlines</th></tr></thead>
          <tbody>${markets.map((m) => { const t = m.trailing.reduce((s, v) => s + v, 0) / m.trailing.length; return `<tr>
            <td>${esc(m.market)}</td><td class="r num">${m.assets}</td><td class="r num">${signedPct(t)}</td>
            <td class="r num ${m.nowcast != null && m.nowcast < t - 0.02 ? "bad" : ""}">${m.nowcast == null ? "n/a" : signedPct(m.nowcast)}</td>
            <td class="wrap-ok">${m.docs.map((s) => `${esc(s.headline)} <span class="muted small">(${s.sentiment.toFixed(2)})</span>`).join("<br>") || '<span class="muted">None</span>'}</td></tr>`; }).join("")}</tbody>
        </table></div>
      </section>

      <section class="block" aria-labelledby="src"><h2 id="src">Public-data sources</h2>
        <p class="muted small">Each source is used only after its terms and licensing have been reviewed. Collected text is treated as untrusted input.</p>
        <div class="table-wrap"><table>
          <caption>Source categories</caption>
          <thead><tr><th>Source</th><th>Covers</th><th>Use</th><th>Status</th></tr></thead>
          <tbody>${SOURCES.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="wrap-ok">${esc(b)}</td><td class="wrap-ok">${esc(c)}</td><td><span class="pill pill-amber">Not connected in sample</span></td></tr>`).join("")}</tbody>
        </table></div>
      </section>
    </div>`;
  },
};
