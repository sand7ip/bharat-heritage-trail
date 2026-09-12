// Fetches a representative thumbnail image URL for each site from the
// Wikipedia page already verified for that site (wikiUrl), via the
// MediaWiki pageimages API. Writes data/site-images.json: {id: imageUrl}.
// These are hotlinked to Wikipedia's own CDN (upload.wikimedia.org),
// standard/permitted practice, not vendored -- avoids storing 60 binary
// files and licensing bookkeeping for a single thumbnail-sized preview.
// Run: node scripts/fetch-site-images.mjs
import { readFileSync, writeFileSync } from "node:fs";

const sites = JSON.parse(readFileSync(new URL("../data/sites.json", import.meta.url)));

function titleFromWikiUrl(url) {
  const m = url.match(/\/wiki\/(.+)$/);
  return decodeURIComponent(m[1]);
}

async function fetchBatch(titles) {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&piprop=thumbnail&pithumbsize=500&format=json&redirects=1&titles=" +
    titles.map(encodeURIComponent).join("|");
  const res = await fetch(url, { headers: { "User-Agent": "BharatHeritageTrail data build script" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for batch`);
  const data = await res.json();
  const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];

  // Chase requested title -> (normalized) -> (redirected) -> final page title
  const chain = new Map(titles.map((t) => [t, t]));
  (data.query.normalized || []).forEach((n) => {
    for (const [orig, cur] of chain) if (cur === n.from) chain.set(orig, n.to);
  });
  (data.query.redirects || []).forEach((r) => {
    for (const [orig, cur] of chain) if (cur === r.from) chain.set(orig, r.to);
  });

  const thumbByFinalTitle = {};
  for (const p of pages) {
    if (p.thumbnail && p.thumbnail.source) thumbByFinalTitle[p.title] = p.thumbnail.source;
  }

  const byOriginalTitle = {};
  for (const [orig, final] of chain) {
    if (thumbByFinalTitle[final]) byOriginalTitle[orig] = thumbByFinalTitle[final];
  }
  return byOriginalTitle;
}

const titleToId = new Map();
for (const s of sites) {
  titleToId.set(titleFromWikiUrl(s.wikiUrl), s.id);
}
const titles = [...titleToId.keys()];

const result = {};
const BATCH = 40;
for (let i = 0; i < titles.length; i += BATCH) {
  const batch = titles.slice(i, i + BATCH);
  const byTitle = await fetchBatch(batch);
  for (const origTitle of batch) {
    if (byTitle[origTitle]) result[titleToId.get(origTitle)] = byTitle[origTitle];
  }
  console.log(`Batch ${i / BATCH + 1}: got ${Object.keys(byTitle).length}/${batch.length} images`);
}

const missing = sites.filter((s) => !result[s.id]);
console.log(`\nTotal: ${Object.keys(result).length}/${sites.length} sites have an image.`);
if (missing.length) {
  console.log("Missing images for:", missing.map((s) => `${s.id} (${s.name})`).join(", "));
}

writeFileSync(new URL("../data/site-images.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log("Wrote data/site-images.json");
