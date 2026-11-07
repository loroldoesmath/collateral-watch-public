import { REQUIRED, checkPositions, parseCSV } from "../csv.js";
import { esc } from "../format.js";

const AREAS = [
  ["Fundamentals", "Rent, occupancy and income, and the rent outlook for each market", "avg_rent, occupancy, noi, appraised_value, rent_growth_yoy, units"],
  ["Rates and credit", "How rate and spread changes pass through to cap rates and refinancing. Market inputs are maintained by the platform", "Optional: your own refinance assumptions"],
  ["Leverage and debt structure", "Loan to value, coverage, maturity wall and refinancing risk", "balance, coupon, amort_years, interest_only, maturity"],
  ["Income versus price", "Whether value moves come from income or from cap rates", "noi and valuation history by month"],
  ["Illiquidity", "Time to sell and forced-sale discounts that widen under stress", "market_tier, units"],
  ["Comparable assets", "Pools short histories with similar properties and markets", "market, property_type"],
];

export const dataView = {
  title: "Your data",
  async render(main) {
    main.innerHTML = `<div class="wrap page">
      <header><div><h1>Your data</h1><p>The platform works from loan and property records you already hold. Provide what you have; missing fields limit what can be assessed.</p></div></header>
      <div class="table-wrap"><table>
        <caption>What each area of the assessment uses</caption>
        <thead><tr><th>Area</th><th>What it informs</th><th>Fields</th></tr></thead>
        <tbody>${AREAS.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td class="wrap-ok">${esc(b)}</td><td class="wrap-ok num">${esc(c)}</td></tr>`).join("")}</tbody>
      </table></div>

      <section class="block" aria-labelledby="chk"><h2 id="chk">Check a file before you send it</h2>
        <p class="muted small">The check runs in your browser. Nothing is uploaded from this page.</p>
        <div class="drop" id="drop">
          <p>Drop a CSV file here, or choose one.</p>
          <input type="file" id="file" accept=".csv,text/csv" aria-label="Choose a CSV file of positions">
          <a href="templates/positions-template.csv" download>Download a template</a>
        </div>
        <div id="result" role="status" aria-live="polite"></div>
        <p class="muted small block">Required columns: <span class="num">${REQUIRED.map(esc).join(", ")}</span>. Use decimals for rates and occupancy (0.94, not 94%).</p>
      </section>
    </div>`;
    const result = main.querySelector("#result");
    const drop = main.querySelector("#drop");
    const handle = async (file) => {
      if (!file) return;
      if (file.size > 2_000_000) { result.innerHTML = `<div class="error">That file is larger than 2 MB. Split it or remove history columns and try again.</div>`; return; }
      const { problems, header, body } = checkPositions(parseCSV(await file.text()));
      result.innerHTML = `<div class="block"><p>${esc(file.name)}: ${body.length} rows checked in your browser.</p>
        ${problems.length ? `<div class="error"><strong>${problems.length} issue${problems.length === 1 ? "" : "s"} to fix</strong><ul>${problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : `<p class="muted">No problems found. The file has every required column and passes basic checks.</p>`}
        ${body.length ? `<div class="table-wrap block"><table><caption>First rows</caption><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${body.slice(0, 5).map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}</div>`;
    };
    main.querySelector("#file").onchange = (e) => handle(e.target.files[0]);
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); handle(e.dataTransfer.files[0]); };
  },
};
