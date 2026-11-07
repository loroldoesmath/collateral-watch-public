import { loadAssessment } from "../api.js";
import { lineChart, maturityWall } from "../charts.js";
import { BINDING, bps, esc, maturityText, money, monthYear, pct, pill, ratio, signedPct, LEVEL } from "../format.js";

const state = { market: "all", type: "all", flaggedOnly: false, selected: null };

function kpis(p) {
  const k = [
    [p.asset_count, "Assets"], [money(p.total_balance), "Loan balance"], [pct(p.wtd_ltv, 0), "Weighted LTV"],
    [ratio(p.wtd_dscr), "Weighted DSCR"], [`${p.red_count} red, ${p.amber_count} watch`, "Flagged assets"],
    [money(p.maturing_24m_balance), "Maturing within 24 months"],
  ];
  return `<div class="kpis">${k.map(([v, l]) => `<div class="kpi"><div class="v num">${esc(v)}</div><div class="k">${esc(l)}</div></div>`).join("")}</div>`;
}

function detail(a) {
  const r = a.risk, t = r.loss_thresholds, rf = r.refinance, lq = r.liquidity;
  const nc = a.rent_growth_nowcast;
  return `<section class="detail" id="detail" aria-labelledby="dt">
    <header>
      <div><h2 id="dt">${esc(a.name)}</h2><p class="muted">${esc(a.market)}, ${esc(a.property_type.toLowerCase())}, ${esc(a.units)} units</p></div>
      <div>${pill(r.level)}</div>
    </header>
    <div class="detail-grid">
      <div>
        <h3>Position</h3>
        <dl class="facts num">
          <dt>Appraised value</dt><dd>${money(a.value)}</dd>
          <dt>Loan balance</dt><dd>${money(a.balance)}</dd>
          <dt>Loan to value</dt><dd>${pct(a.ltv, 1)}</dd>
          <dt>Debt service coverage</dt><dd class="${a.dscr < 1.2 ? "warn" : ""}">${ratio(a.dscr)}</dd>
          <dt>Debt yield</dt><dd>${pct(a.debt_yield, 1)}</dd>
          <dt>Coupon</dt><dd>${pct(a.coupon, 2)}</dd>
          <dt>Maturity</dt><dd>${esc(monthYear(a.maturity))} (${esc(maturityText(a.months_to_maturity))})</dd>
        </dl>
        <h3>Fundamentals</h3>
        <dl class="facts num">
          <dt>Occupancy</dt><dd>${pct(a.occupancy, 1)}</dd>
          <dt>Net operating income</dt><dd>${money(a.noi)}</dd>
          <dt>Cap rate</dt><dd>${pct(a.cap_rate, 2)}</dd>
          <dt>Rent growth, trailing</dt><dd>${signedPct(a.rent_growth_yoy)}</dd>
          <dt>Rent growth, nowcast</dt><dd>${nc == null ? "n/a" : signedPct(nc)}</dd>
          <dt>Income return</dt><dd>${pct(a.income_return, 1)}</dd>
          <dt>Valuation change, 12 months</dt><dd>${signedPct(a.appreciation_12m)}</dd>
        </dl>
      </div>
      <div>
        <h3>Loss thresholds</h3>
        <dl class="facts num">
          <dt>Value decline to impairment</dt><dd>${pct(t.value_decline_to_impairment, 1)}</dd>
          <dt>NOI decline to 1.00x coverage</dt><dd>${pct(t.noi_decline_to_dscr_1x, 1)}</dd>
          <dt>Cap-rate widening to impairment</dt><dd>${bps(t.cap_rate_expansion_bps_to_impairment)}</dd>
        </dl>
        <p class="plain">${t.value_decline_to_impairment > 0 ? `Collateral value can fall ${pct(t.value_decline_to_impairment, 0)} before it no longer covers the loan.` : "Collateral value already does not cover the loan."} ${t.noi_decline_to_dscr_1x > 0 ? `Income can fall ${pct(t.noi_decline_to_dscr_1x, 0)} before debt service is no longer covered.` : "Income already does not cover debt service."}</p>
        <h3>Twelve-month outlook</h3>
        <dl class="facts num">
          <dt>Chance value falls below the loan</dt><dd class="${r.p_impairment_12m >= 0.04 ? "warn" : ""}">${pct(r.p_impairment_12m, 1)}</dd>
          <dt>Chance of a 10% decline</dt><dd>${pct(r.p_decline_10pct_12m, 1)}</dd>
          <dt>5% worst-case value change</dt><dd>${signedPct(r.var95_value_change_12m)}</dd>
        </dl>
        <h3>Refinancing at maturity</h3>
        <dl class="facts num">
          <dt>Estimated maximum new loan</dt><dd>${money(rf.max_proceeds)}</dd>
          <dt>Shortfall</dt><dd class="${rf.gap > 0 ? "bad" : ""}">${rf.gap > 0 ? money(rf.gap) : "None"}</dd>
          <dt>Binding test</dt><dd>${esc(BINDING[rf.binding_constraint] || rf.binding_constraint)}</dd>
        </dl>
        <h3>Illiquidity</h3>
        <dl class="facts num">
          <dt>Estimated time to sell</dt><dd>${lq.time_to_sell_months.toFixed(1)} months</dd>
          <dt>Forced-sale discount</dt><dd>${pct(lq.haircut_base, 1)} base, ${pct(lq.haircut_stressed, 1)} stressed</dd>
          <dt>LTV on stressed sale value</dt><dd class="${lq.realizable_ltv_stressed > 1 ? "warn" : ""}">${pct(lq.realizable_ltv_stressed, 0)}</dd>
        </dl>
      </div>
      <div>
        <h3>Why it is ${r.level === "green" ? "clear" : "flagged"}</h3>
        ${r.flags.length ? `<ul class="flag-list">${r.flags.map((f) => `<li class="${esc(f.severity)}"><strong>${esc(f.label)}</strong><span>${esc(f.detail)}</span></li>`).join("")}</ul>` : `<p class="muted">No flags. Coverage, leverage, maturity and occupancy are within watch levels.</p>`}
        ${a.signals.length ? `<h3>Public-data signals</h3><ul class="flag-list">${a.signals.map((s) => `<li class="${s.sentiment <= -0.25 ? "red" : ""}"><strong>${esc(s.headline)}</strong><span>${esc(s.source)}, sentiment ${s.sentiment.toFixed(2)}</span></li>`).join("")}</ul>` : ""}
      </div>
    </div>
    <div class="charts">
      ${lineChart({ values: a.series.value_index, dates: a.series.dates, label: "Valuation index, rebased to 100", fmt: (v) => v.toFixed(1), anomalies: a.anomalies.filter((x) => x.metric === "value_index") })}
      ${lineChart({ values: a.series.occupancy, dates: a.series.dates, label: "Occupancy", fmt: (v) => pct(v, 1), anomalies: a.anomalies.filter((x) => x.metric === "occupancy") })}
    </div>
  </section>`;
}

export const consoleView = {
  title: "Portfolio console",
  needsData: true,
  async render(main) {
    const d = await loadAssessment();
    const markets = [...new Set(d.assets.map((a) => a.market))].sort();
    const types = [...new Set(d.assets.map((a) => a.property_type))].sort();
    const asofYear = Number(d.meta.asof.slice(0, 4));

    const draw = () => {
      const rows = d.assets.filter((a) => (state.market === "all" || a.market === state.market)
        && (state.type === "all" || a.property_type === state.type)
        && (!state.flaggedOnly || a.risk.level !== "green"));
      const sel = d.assets.find((a) => a.id === state.selected);
      main.innerHTML = `<div class="wrap page">
        <header><div><h1>Portfolio console</h1><p>Assets ranked by risk. Select an asset to see its loss thresholds, refinancing position and the signals behind each flag.</p></div></header>
        <div class="notice" role="note">${esc(d.meta.data_notice)} Calibration status: ${esc(d.meta.calibration.status)}.</div>
        ${kpis(d.portfolio)}
        <div class="filters">
          <label>Market <select id="f-market"><option value="all">All markets</option>${markets.map((m) => `<option ${m === state.market ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
          <label>Property type <select id="f-type"><option value="all">All types</option>${types.map((m) => `<option ${m === state.type ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
          <label class="check"><input type="checkbox" id="f-flag" ${state.flaggedOnly ? "checked" : ""}> Flagged assets only</label>
        </div>
        <div class="table-wrap"><table>
          <caption>${rows.length} of ${d.assets.length} assets, highest risk first</caption>
          <thead><tr><th>Asset</th><th class="r">Loan balance</th><th class="r">LTV</th><th class="r">DSCR</th><th class="r">Occupancy</th><th class="r">Time to maturity</th><th class="r">Chance of impairment, 12 months</th><th>Status</th></tr></thead>
          <tbody>${rows.map((a) => `<tr data-id="${esc(a.id)}" tabindex="0" aria-selected="${a.id === state.selected}">
            <td>${esc(a.name)}<span class="sub">${esc(a.market)}, ${esc(a.property_type.toLowerCase())}</span></td>
            <td class="r num">${money(a.balance)}</td><td class="r num">${pct(a.ltv, 0)}</td>
            <td class="r num ${a.dscr < 1 ? "bad" : a.dscr < 1.2 ? "warn" : ""}">${ratio(a.dscr)}</td>
            <td class="r num">${pct(a.occupancy, 1)}</td>
            <td class="r num ${a.months_to_maturity <= 12 ? "warn" : ""}">${esc(maturityText(a.months_to_maturity))}</td>
            <td class="r num">${pct(a.risk.p_impairment_12m, 1)}</td><td>${pill(a.risk.level)}</td></tr>`).join("") || `<tr><td colspan="8" class="muted">No assets match these filters. Clear a filter to see more.</td></tr>`}</tbody>
        </table></div>
        ${sel ? detail(sel) : ""}
        <section class="block" aria-labelledby="mw"><h2 id="mw">Maturity wall</h2>
          <p class="muted small">Loan balance by maturity year. Years inside the next 24 months are shown in tan.</p>
          <div>${maturityWall(d.portfolio.maturity_wall, asofYear, money)}</div></section>
      </div>`;
      main.querySelector("#f-market").onchange = (e) => { state.market = e.target.value; draw(); };
      main.querySelector("#f-type").onchange = (e) => { state.type = e.target.value; draw(); };
      main.querySelector("#f-flag").onchange = (e) => { state.flaggedOnly = e.target.checked; draw(); };
      main.querySelectorAll("tbody tr[data-id]").forEach((tr) => {
        const pick = () => { state.selected = tr.dataset.id; draw(); const el = main.querySelector("#detail"); if (el) el.scrollIntoView({ block: "nearest" }); const again = main.querySelector(`tr[data-id="${CSS.escape(state.selected)}"]`); if (again) again.focus({ preventScroll: true }); };
        tr.onclick = pick;
        tr.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } };
      });
    };
    draw();
  },
};
