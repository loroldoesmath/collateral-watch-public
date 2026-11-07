// minimal csv parsing for the in-browser preview. nothing is uploaded.

export const REQUIRED = [
  "asset_id", "name", "market", "property_type", "units", "market_tier", "appraised_value", "noi",
  "occupancy", "avg_rent", "rent_growth_yoy", "balance", "coupon", "amort_years", "interest_only", "maturity",
];

export function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

export function checkPositions(rows) {
  const problems = [];
  if (rows.length < 2) return { problems: ["The file has no data rows."], header: [], body: [] };
  const header = rows[0].map((h) => h.trim());
  const body = rows.slice(1);
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) problems.push(`Missing columns: ${missing.join(", ")}.`);
  const col = (name) => header.indexOf(name);
  const num = (r, name) => Number(r[col(name)]);
  body.forEach((r, i) => {
    if (r.length !== header.length) problems.push(`Row ${i + 2} has ${r.length} fields; expected ${header.length}.`);
    for (const f of ["appraised_value", "noi", "balance", "units"]) {
      if (col(f) >= 0 && !(num(r, f) > 0)) problems.push(`Row ${i + 2}: ${f} must be a positive number.`);
    }
    if (col("occupancy") >= 0) {
      const o = num(r, "occupancy");
      if (!(o >= 0 && o <= 1)) problems.push(`Row ${i + 2}: occupancy must be a fraction between 0 and 1.`);
    }
  });
  const ids = body.map((r) => r[col("asset_id")]);
  if (col("asset_id") >= 0 && new Set(ids).size !== ids.length) problems.push("asset_id values must be unique.");
  return { problems: problems.slice(0, 12), header, body };
}
