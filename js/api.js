// data access. with no apiBase configured, the app reads the bundled synthetic sample.
// with an apiBase, it calls the server with a bearer key held only for this browser session.
// the browser never receives algorithm code or parameters, only results.

const cfg = window.CW_CONFIG || { apiBase: "" };
let cache = null;
let sampleCache = null;

export class NeedKey extends Error {}

export const isSample = () => !cfg.apiBase;
export const hasKey = () => !!sessionStorage.getItem("cw_key");
export function setKey(key) {
  sessionStorage.setItem("cw_key", key.trim());
  cache = null;
}
export function clearKey() {
  sessionStorage.removeItem("cw_key");
  cache = null;
}

export async function loadSample() {
  if (sampleCache) return sampleCache;
  const res = await fetch("sample-data/assessment.json");
  if (!res.ok) throw new Error(`Could not load the sample data (${res.status}).`);
  sampleCache = await res.json();
  return sampleCache;
}

export async function loadAssessment() {
  if (cache) return cache;
  if (!cfg.apiBase) return (cache = await loadSample());
  const key = sessionStorage.getItem("cw_key");
  if (!key) throw new NeedKey();
  const res = await fetch(`${cfg.apiBase}/v1/assessment`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
    credentials: "omit",
  });
  if (res.status === 401) { clearKey(); throw new NeedKey(); }
  if (res.status === 404) throw new Error("No portfolio has been uploaded for this account yet.");
  if (!res.ok) throw new Error(`The service returned an error (${res.status}).`);
  return (cache = await res.json());
}
