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
    <p class="lede">Using your portfolio data, the platform flags assets at risk, estimates how much value each loan can lose before it is under-collateralized, and runs stress tests to show what could happen next. It also watches public news and market data for early signs of trouble.</p>
    <a class="btn btn-primary" href="#/console">Open the sample console</a>
    </div>
    </section>
    <figure class="figure" aria-labelledby="outlook">
    <header>
    <h2 id="outlook" class="figure-title">Twelve-month value outlook for a sample asset</h2>
    <div class="legend">
    <span><i class="l-fan" aria-hidden="true"></i>Simulated paths</span><span><i class="l-med" aria-hidden="true"></i>Median path</span><span><i class="l-thr" aria-hidden="true"></i>Loss threshold</span>
    </div>
    </header>
    ${fanChart({ thresholdDecline: a.risk.loss_thresholds.value_decline_to_impairment, maturityMonths: a.months_to_maturity })}
    <figcaption>Illustrative paths for the sample asset ${esc(a.name)}. The threshold is the value decline at which the collateral no longer covers the loan.</figcaption>
    </figure>
    <section class="section" aria-labelledby="what">
    <div class="section-grid">
    <div>
    <h2 id="what">A lender's view of collateral risk</h2>
    <p class="lede">Built for multifamily loans, where leverage, refinancing and local conditions matter as much as price.</p>
    </div>
    <div class="capabilities">
    <div><h3>Early-warning flags</h3><p>Assets are flagged as soon as coverage, leverage, occupancy or refinancing risk starts to build.</p></div>
    <div><h3>Loss thresholds</h3><p>Shows how much value, income or cap rate a loan can lose before the lender is exposed.</p></div>
    <div><h3>Stress scenarios</h3><p>Runs rate, credit, rent and occupancy shocks across the portfolio to estimate losses.</p></div>
    <div><h3>Anomaly detection</h3><p>Flags occupancy or value changes that fall outside an asset's normal range.</p></div>
    <div><h3>Public-data signals</h3><p>Turns local news and market activity into signals about rents, demand and conditions.</p></div>
    <div><h3>Comparable-asset learning</h3><p>Uses similar markets and property types to support assets with short track records.</p></div>
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
    <p>is the smallest drop in value that would leave a sample loan under-collateralized.</p>
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
    <p>Your data is kept separate from general model training and protected. We use it only to assess your portfolio.</p>
    <p><a href="#/security">How data is handled</a></p>
    </div>
    </div>
    </section>
    </div>`;
  },
};
