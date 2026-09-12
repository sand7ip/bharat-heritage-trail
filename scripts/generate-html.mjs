// Renders the static ledger markup (grouped by state) and embeds the full
// SITES array as a JSON island, injecting both into index.html between
// marker comments. This is what makes "content ships in the HTML" true --
// curl the served page and every site name/blurb is already there.
// Run: node scripts/generate-html.mjs
import { readFileSync, writeFileSync } from "node:fs";

const sites = JSON.parse(readFileSync(new URL("../data/sites.json", import.meta.url)));
const cities = JSON.parse(readFileSync(new URL("../data/cities.json", import.meta.url)));
const indexPath = new URL("../index.html", import.meta.url);
let html = readFileSync(indexPath, "utf8");

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function metaLine(s) {
  const parts = [s.state, s.category];
  if (s.year) parts.push(String(s.year));
  return parts.join(" · ");
}

const byState = new Map();
for (const s of sites) {
  if (!byState.has(s.state)) byState.set(s.state, []);
  byState.get(s.state).push(s);
}
const states = [...byState.keys()].sort((a, b) => a.localeCompare(b));

let out = "";
for (const state of states) {
  const group = byState.get(state).sort((a, b) => a.name.localeCompare(b.name));
  out += `    <div class="state-group" data-state="${esc(state)}">\n`;
  out += `      <h2 class="state-group-heading">${esc(state)} <span class="state-count" data-state-count="${esc(state)}">0/${group.length}</span></h2>\n`;
  out += `      <ul class="site-list">\n`;
  for (const s of group) {
    const collectionsAttr = s.collections.join(" ");
    out += `        <li class="site-row" data-id="${s.id}" data-collections="${collectionsAttr}">\n`;
    out += `          <button class="visited-toggle" type="button" aria-pressed="false" aria-label="Mark ${esc(s.name)} as visited" data-id="${s.id}"></button>\n`;
    out += `          <div class="site-info">\n`;
    out += `            <h3 class="site-name">${esc(s.name)}</h3>\n`;
    out += `            <p class="site-meta">${esc(metaLine(s))}</p>\n`;
    out += `            <p class="site-blurb">${esc(s.blurb)}</p>\n`;
    out += `            <p class="site-links">`;
    out += `<a href="${esc(s.wikiUrl)}" target="_blank" rel="noopener">Wikipedia</a>`;
    if (s.unescoUrl) out += ` <a href="${esc(s.unescoUrl)}" target="_blank" rel="noopener">UNESCO</a>`;
    out += `</p>\n`;
    out += `          </div>\n`;
    out += `        </li>\n`;
  }
  out += `      </ul>\n`;
  out += `    </div>\n`;
}

html = html.replace(
  /<!-- SITES_START -->[\s\S]*<!-- SITES_END -->/,
  `<!-- SITES_START -->\n${out}<!-- SITES_END -->`
);

const jsonPayload = JSON.stringify(sites).replace(/</g, "\\u003c");
html = html.replace(
  /(<script type="application\/json" id="sites-data">\n)[\s\S]*?(\n<\/script>)/,
  `$1${jsonPayload}$2`
);

const citiesPayload = JSON.stringify(cities).replace(/</g, "\\u003c");
html = html.replace(
  /(<script type="application\/json" id="cities-data">\n)[\s\S]*?(\n<\/script>)/,
  `$1${citiesPayload}$2`
);

writeFileSync(indexPath, html);
console.log(`Rendered ${sites.length} sites across ${states.length} states into index.html`);
