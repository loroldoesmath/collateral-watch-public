import { NeedKey, hasKey, isSample, setKey } from "./api.js";
import { esc } from "./format.js";
import { consoleView } from "./views/console.js";
import { dataView } from "./views/data.js";
import { home } from "./views/home.js";
import { security } from "./views/security.js";
import { signals } from "./views/signals.js";
import { stress } from "./views/stress.js";

const routes = { "": home, console: consoleView, stress, signals, data: dataView, security };
const main = document.getElementById("main");

function keyForm() {
  main.innerHTML = `<div class="wrap page"><header><div><h1>Connect your account</h1><p>Enter the access key issued for your organization. It is kept only for this browser session.</p></div></header>
    <div class="drop"><label for="key">Access key</label><input type="password" id="key" autocomplete="off" spellcheck="false"><button class="btn btn-primary" id="go" type="button">Connect</button></div></div>`;
  const go = () => { const v = main.querySelector("#key").value; if (v.trim()) { setKey(v); route(); } };
  main.querySelector("#go").onclick = go;
  main.querySelector("#key").onkeydown = (e) => { if (e.key === "Enter") go(); };
}

async function route() {
  const name = location.hash.replace(/^#\/?/, "").split("?")[0];
  const view = routes[name] || routes[""];
  document.querySelectorAll("header.site nav a").forEach((a) => {
    if (a.dataset.route === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  document.title = view === home ? "Collateral Watch" : `${view.title} | Collateral Watch`;
  main.innerHTML = `<div class="wrap"><p class="status" role="status">Loading</p></div>`;
  try {
    await view.render(main);
  } catch (e) {
    if (e instanceof NeedKey) return keyForm();
    main.innerHTML = `<div class="wrap page"><div class="error" role="alert"><strong>This page could not load.</strong><br>${esc(e.message)}</div></div>`;
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", route);
route();
