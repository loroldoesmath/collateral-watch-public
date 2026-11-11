import { loadAssessment } from "../api.js";
import { changeBar } from "../charts.js";
import { esc, money, pct, ratio, signedPct } from "../format.js";

let selected = null;

// plain-language takeaway for the scenario's headline numbers. written dynamically so it stays
// correct for every scenario, including the common case where refinancing comes up short even
// though no loan is impaired or short of coverage today.
function takeaway(m) {
  const sentences = [];
  if (m.loans_impaired === 0 && m.loans_dscr_below_1 === 0) {
    sentences.push("No loan would be worth less than it owes or fall short of covering its mortgage payment under this scenario.");
  } else {
    const bits = [];
    if (m.loans_impaired > 0) bits.push(`${m.loans_impaired} loan${m.loans_impaired === 1 ? "" : "s"} would be worth less than ${m.loans_impaired === 1 ? "it owes" : "they owe"}`);
    if (m.loans_dscr_below_1 > 0) bits.push(`${m.loans_dscr_below_1} ${m.loans_dscr_below_1 === 1 ? "would" : "would"} fall short of covering ${m.loans_dscr_below_1 === 1 ? "its" : "their"} mortgage payment${m.loans_dscr_below_1 === 1 ? "" : "s"}`);
    sentences.push(`${bits.join(" and ")} under this scenario.`);
  }
  if (m.refi_shortfall_total > 0) {
    const caveat = m.loans_impaired === 0 && m.loans_dscr_below_1 === 0 ? " even though none of them are under-collateralized or short of coverage today" : "";
    sentences.push(`Refinancing is judged separately, at the scenario's higher rate: ${money(m.refi_shortfall_total)} of loans maturing soon would not qualify for a new loan big enough to pay off what they owe, so those owners would need to pay down debt, add equity or sell rather than simply refinance${caveat}.`);
  } else {
    sentences.push("No loan would come up short when refinancing at maturity under this scenario.");
  }
  if (m.estimated_loss > 0) {
    sentences.push(`If the impaired loans had to be sold quickly rather than held, owners would realize about ${money(m.estimated_loss)} less than the appraised value.`);
  }
  return sentences.join(" ");
}

function chips(a) {
  const c = [];
  if (a.d_rf_bps) c.push(`Rates ${a.d_rf_bps > 0 ? "+" : "\u2212"}${Math.abs(a.d_rf_bps)} bp`);
  if (a.d_credit_bps) c.push(`Credit spreads +${a.d_credit_bps} bp`);
  if (a.rent_shock) c.push(`Rents ${signedPct(a.rent_shock, 0)}`);
  if (a.occupancy_shock_pts) c.push(`Occupancy ${a.occupancy_shock_pts} pts`);
  if (a.opex_shock) c.push(`Operating expenses ${signedPct(a.opex_shock, 0)}`);
  c.push(`Cap rates ${a.cap_rate_shift_bps >= 0 ? "+" : "\u2212"}${Math.abs(a.cap_rate_shift_bps).toFixed(0)} bp`);
  c.push(`Refinance rate ${pct(a.refinance_rate, 2)}`);
  return c;
}

export const stress = {
  title: "Stress tests",
  needsData: true,
  async render(main) {
    const d = await loadAssessment();
    selected = selected && d.scenarios.some((s) => s.id === selected) ? selected : d.scenarios[0].id;
    const byId = Object.fromEntries(d.assets.map((a) => [a.id, a]));
    const draw = () => {
      const s = d.scenarios.find((x) => x.id === selected);
      const rows = Object.entries(s.assets).sort((a, b) => a[1].value_change - b[1].value_change);
      const m = s.summary;
      main.innerHTML = `<div class="wrap page">
        <header><div><h1>Stress tests</h1><p>Apply rate, credit, rent and occupancy shocks across the portfolio to see where coverage, collateral value and refinancing give way.</p></div></header>
        <div class="notice" role="note">${esc(d.meta.data_notice)}</div>
        <div class="seg" role="group" aria-label="Scenario">${d.scenarios.map((x) => `<button type="button" data-id="${esc(x.id)}" aria-pressed="${x.id === selected}">${esc(x.name)}</button>`).join("")}</div>
        <p class="muted">${esc(s.description)}</p>
        <div class="chips">${chips(s.assumptions).map((c) => `<span class="chip num">${esc(c)}</span>`).join("")}</div>
        <div class="kpis">
          <div class="kpi"><div class="v num">${signedPct(m.avg_value_change)}</div><div class="k">Average collateral value change</div><div class="hint">Average move in appraised value across the portfolio under this scenario.</div></div>
          <div class="kpi"><div class="v num">${m.loans_impaired}</div><div class="k">Loans under-collateralized</div><div class="hint">Loans worth less than they owe (LTV over 100%) if sold today under this scenario &mdash; lenders call this impairment.</div></div>
          <div class="kpi"><div class="v num">${m.loans_dscr_below_1}</div><div class="k">Loans below 1.00x coverage</div><div class="hint">Loans whose rental income would no longer fully cover the mortgage payment.</div></div>
          <div class="kpi"><div class="v num">${money(m.refi_shortfall_total)}</div><div class="k">Refinancing shortfall</div><div class="hint">Gap, at maturity, between what a lender would lend at the scenario's rate and what's owed &mdash; a separate test from impairment or coverage today.</div></div>
          <div class="kpi"><div class="v num">${money(m.estimated_loss)}</div><div class="k">Estimated loss on forced sale</div><div class="hint">What owners of impaired loans would give up if those properties had to be sold quickly rather than held.</div></div>
        </div>
        <p class="plain">${takeaway(m)}</p>
        <div class="table-wrap"><table>
          <caption>Results by asset, largest value decline first</caption>
          <thead><tr><th>Asset</th><th class="r">Value change</th><th><span class="sr">Size of change</span></th><th class="r">LTV after</th><th class="r">DSCR after</th><th class="r">Refinancing shortfall</th><th class="r">Estimated loss</th><th>Result</th></tr></thead>
          <tbody>${rows.map(([id, r]) => { const a = byId[id]; return `<tr>
            <td>${esc(a.name)}<span class="sub">${esc(a.market)}</span></td>
            <td class="r num">${signedPct(r.value_change)}</td><td>${changeBar(r.value_change, r.impaired)}</td>
            <td class="r num ${r.impaired ? "bad" : ""}">${r.ltv == null ? "n/a" : pct(r.ltv, 0)}</td>
            <td class="r num ${r.dscr < 1 ? "bad" : ""}">${ratio(r.dscr)}</td>
            <td class="r num">${r.refi_gap > 0 ? money(r.refi_gap) : "None"}</td>
            <td class="r num">${r.realizable_loss > 0 ? money(r.realizable_loss) : "None"}</td>
            <td>${r.impaired ? '<span class="pill pill-red">Under-collateralized</span>' : r.dscr < 1 ? '<span class="pill pill-amber">Coverage below 1.00x</span>' : '<span class="muted">Covered</span>'}</td></tr>`; }).join("")}</tbody>
        </table></div>
        <p class="muted small block">Loans are treated as fixed rate. Refinancing is tested at maturity for loans maturing within 36 months. Forced-sale discounts widen as conditions worsen.</p>
      </div>`;
      main.querySelectorAll(".seg button").forEach((b) => { b.onclick = () => { selected = b.dataset.id; draw(); main.querySelector(`.seg button[data-id="${CSS.escape(selected)}"]`).focus(); }; });
    };
    draw();
  },
};
