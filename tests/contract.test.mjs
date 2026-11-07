// checks the bundled sample against the api contract. a small validator that supports
// type, required, properties, items, additionalProperties and enum.
import { readFileSync } from "node:fs";

const schema = JSON.parse(readFileSync(new URL("../schemas/assessment.schema.json", import.meta.url)));
const sample = JSON.parse(readFileSync(new URL("../sample-data/assessment.json", import.meta.url)));
const errors = [];

function typeOf(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (Number.isInteger(v)) return "integer";
  return typeof v;
}
function check(v, s, path) {
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    const t = typeOf(v);
    const ok = types.includes(t) || (t === "integer" && types.includes("number"));
    if (!ok) { errors.push(`${path}: expected ${types.join("|")}, got ${t}`); return; }
  }
  if (s.enum && !s.enum.includes(v)) errors.push(`${path}: ${JSON.stringify(v)} not in enum`);
  if (s.required) for (const k of s.required) if (!(k in v)) errors.push(`${path}: missing ${k}`);
  if (s.properties && v && typeof v === "object") for (const [k, sub] of Object.entries(s.properties)) if (k in v) check(v[k], sub, `${path}.${k}`);
  if (s.additionalProperties && v && typeof v === "object") for (const [k, x] of Object.entries(v)) if (!(s.properties && k in s.properties)) check(x, s.additionalProperties, `${path}.${k}`);
  if (s.items && Array.isArray(v)) v.forEach((x, i) => check(x, s.items, `${path}[${i}]`));
}
check(sample, schema, "$");

// the notice must keep the data labeled as synthetic
if (!/illustrative|synthetic/i.test(sample.meta.data_notice)) errors.push("sample data notice must say the data is illustrative");

if (errors.length) { console.error(errors.slice(0, 20).join("\n")); process.exit(1); }
console.log(`contract ok: ${sample.assets.length} assets, ${sample.scenarios.length} scenarios`);
