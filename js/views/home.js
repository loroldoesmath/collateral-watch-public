import { loadSample } from "../api.js";
import { fanChart } from "../charts.js";
import { esc, money, pct } from "../format.js";

export const home = {
  title: "Collateral risk, anticipated",
  async render(main) {
    const d = await loadSample();
    const a = d.assets.find((x) => x.risk.flags.some((f) => f.code === "OCCUPANCY_ANOMALY")) || d.assets[0];
    const flagged = d.portfolio.red_count + d.portfolio.amber_count;
    const minThr = Math.min(...d.assets.map((x) => x.risk.loss_thresholds.value_decline_to_impairment));
    main.innerHTML = `
    <div class="wrap">
      <section class="hero" aria-labelledby="h1">
        <h1 id="h1">Anticipate collateral risk <span class="accent">before it reaches your portfolio.</span></h1>
        <div class="side">
          <p class="lede">With your data, the platform identifies assets showing early signs of decline, estimates loss thresholds, and runs additional stress scenarios so you can anticipate material movement. It also detects anomalous occupancy and abrupt moves in asset value through real-time natural language analysis of public data.</p>
          <a class="btn btn-primary" href="#/console">Open the sample console</a>
        </div>
      </section>

      <figure class="figure">
        <header>
          <h3>Twelve-month value outlook for a sample asset</h3>
          <div class="legend" aria-hidden="true">
            <span><i class="l-fan"></i>Simulated paths</span><span><i class="l-med"></i>Median path</span><span><i class="l-thr"></i>Loss threshold</span>
          </div>
        </header>
        ${fanChart({ thresholdDecline: a.risk.loss_thresholds.value_decline_to_impairment, maturityMonths: a.months_to_maturity })}
        <figcaption>Illustrative paths for the sample asset ${esc(a.name)}. The threshold is the value decline at which the collateral no longer covers the loan.</figcaption>
      </figure>

      <section class="section" aria-labelledby="what">
        <div class="section-grid">
          <div>
            <h2 id="what">A lender's view of collateral risk</h2>
            <p class="lede">Built for loans secured by multifamily property, where leverage, refinancing and local conditions matter as much as price.</p>
          </div>
          <div class="capabilities">
            <div><h3>Early-warning flags</h3><p>Assets showing early signs of decline are flagged from coverage, leverage, refinancing, occupancy and market signals.</p></div>
            <div><h3>Loss thresholds</h3><p>For each loan, the movement in value, income and cap rates it can absorb before the lender is exposed.</p></div>
            <div><h3>Stress scenarios</h3><p>Rate, credit, rent and occupancy shocks applied across the portfolio, with refinancing shortfalls and estimated losses.</p></div>
            <div><h3>Anomaly detection</h3><p>Occupancy and valuation moves outside an asset's normal range are surfaced for review.</p></div>
            <div><h3>Public-data signals</h3><p>News and market activity are read as language and turned into signals about rents, demand and local conditions.</p></div>
            <div><h3>Comparable-asset learning</h3><p>Markets and property types are modeled together, so assets with short histories draw on comparable ones.</p></div>
          </div>
        </div>
      </section>

      <section aria-labelledby="sample">
        <h2 id="sample">In the sample portfolio</h2>
        <div class="readouts">
          <div class="readout featured">
            <span class="big num">${flagged} of ${d.portfolio.asset_count}</span>
            <p>assets are flagged. ${d.portfolio.red_count} carry red flags; the rest are on watch for coverage, leverage or upcoming maturities.</p>
            <a href="#/console">Review flagged assets</a>
          </div>
          <div class="readout">
            <span class="big num">${pct(minThr, 0)}</span>
            <p>is the smallest value decline that would leave a sample loan under-collateralized.</p>
            <a href="#/stress">Run stress scenarios</a>
          </div>
          <div class="readout">
            <span class="big num">${money(d.portfolio.maturing_24m_balance)}</span>
            <p>of sample loans mature within 24 months and face refinancing at today's rates.</p>
            <a href="#/signals">See market signals</a>
          </div>
        </div>
      </section>

      <section class="section" aria-labelledby="protect">
        <div class="section-grid">
          <h2 id="protect">Your data stays yours</h2>
          <div class="statement">
            <p>Any data you provide is partitioned from general model training and is protected. It is used only to assess your portfolio.</p>
            <p><a href="#/security">How data is handled</a></p>
          </div>
        </div>
      </section>
    </div>`;
  },
};
