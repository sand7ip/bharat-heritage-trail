// Patches editorial content (blurbs, best-months) and researched travel facts
// (nearestRail, nearestAirport) onto data/sites.json produced by merge-sites.mjs.
// Idempotent — safe to re-run. Run: node scripts/patch-content.mjs
import { readFileSync, writeFileSync } from "node:fs";

const sitesPath = new URL("../data/sites.json", import.meta.url);
const sites = JSON.parse(readFileSync(sitesPath));

const unescoContent = JSON.parse(readFileSync(new URL("./_blurbs-unesco.json", import.meta.url)));
const pilgrimageBlurbs = JSON.parse(readFileSync(new URL("./_blurbs-pilgrimage.json", import.meta.url)));
const railair = [
  ...JSON.parse(readFileSync(new URL("./_railair-batch1.json", import.meta.url))),
  ...JSON.parse(readFileSync(new URL("./_railair-batch2.json", import.meta.url))),
];
const railairMap = new Map(railair.map((r) => [r.id, r]));

const missing = { blurb: [], railair: [] };

for (const s of sites) {
  if (unescoContent[s.id]) {
    s.blurb = unescoContent[s.id].blurb;
    s.bestMonths = unescoContent[s.id].bestMonths;
  } else if (pilgrimageBlurbs[s.id]) {
    s.blurb = pilgrimageBlurbs[s.id];
  } else {
    missing.blurb.push(s.id);
  }

  const r = railairMap.get(s.id);
  if (r) {
    s.nearestRail = r.nearestRail;
    s.nearestAirport = r.nearestAirport;
  } else {
    missing.railair.push(s.id);
  }
}

if (missing.blurb.length || missing.railair.length) {
  console.error("Missing content:", missing);
  process.exit(1);
}

writeFileSync(sitesPath, JSON.stringify(sites, null, 2) + "\n");
console.log(`Patched blurb/bestMonths and nearestRail/nearestAirport for all ${sites.length} sites.`);
