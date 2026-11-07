import { esc } from "../format.js";

const ROWS = [
  ["Partitioned by client", "Each client's data is held in its own namespace. Access is tied to a client credential, and a request can only reach that client's own data."],
  ["Excluded from general training", "Client data is never used to train or tune models shared across clients. Shared models learn only from public or licensed sources."],
  ["Results reach the browser, not the method", "Analysis runs on the server. This application receives results only."],
  ["Access is recorded", "Reads and writes are logged without recording the data itself."],
  ["Deletion on request", "A client can remove its data from the service at any time."],
  ["Public data is collected under review", "A source is used only after its terms and licensing have been reviewed, and collected text is treated as untrusted input."],
];

export const security = {
  title: "Data protection",
  async render(main) {
    main.innerHTML = `<div class="wrap page">
      <header><div><h1>Data protection</h1></div></header>
      <div class="statement">
        <p>Data you provide is partitioned from general model training and is protected. It is used only to assess your portfolio.</p>
      </div>
      <div class="rows">${ROWS.map(([a, b]) => `<div><h3>${esc(a)}</h3><p>${esc(b)}</p></div>`).join("")}</div>
      <div class="notice block" role="note">This beta shows synthetic sample data only. Ask for a description of the controls that apply to your deployment before sending real data.</div>
    </div>`;
  },
};
