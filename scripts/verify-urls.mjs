// Verifies every wikiUrl / unescoUrl in data/sites.json returns HTTP 200.
// Run: node scripts/verify-urls.mjs
import { readFileSync } from "node:fs";

const sites = JSON.parse(readFileSync(new URL("../data/sites.json", import.meta.url)));

const urls = [];
for (const s of sites) {
  if (s.wikiUrl) urls.push({ id: s.id, field: "wikiUrl", url: s.wikiUrl });
  if (s.unescoUrl) urls.push({ id: s.id, field: "unescoUrl", url: s.unescoUrl });
}

console.log(`Checking ${urls.length} URLs...\n`);

let failCount = 0;
const CONCURRENCY = 8;
let idx = 0;

async function worker() {
  while (idx < urls.length) {
    const item = urls[idx++];
    try {
      const res = await fetch(item.url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (BharatHeritageTrail data verification script)" },
      });
      if (res.status !== 200) {
        failCount++;
        console.log(`FAIL  ${res.status}  ${item.id} (${item.field})  ${item.url}`);
      }
    } catch (e) {
      failCount++;
      console.log(`ERROR ${item.id} (${item.field})  ${item.url}  -- ${e.message}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`\n${urls.length - failCount}/${urls.length} URLs returned 200.`);
if (failCount > 0) {
  console.log(`${failCount} URL(s) FAILED — see above.`);
  process.exit(1);
} else {
  console.log("All URLs verified OK.");
}
