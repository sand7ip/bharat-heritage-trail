// Verifies every URL in data/site-images.json returns HTTP 200.
// Run: node scripts/verify-site-images.mjs
import { readFileSync } from "node:fs";

const images = JSON.parse(readFileSync(new URL("../data/site-images.json", import.meta.url)));
const entries = Object.entries(images);
console.log(`Checking ${entries.length} image URLs...\n`);

let failCount = 0;
let idx = 0;
async function worker() {
  while (idx < entries.length) {
    const [id, url] = entries[idx++];
    try {
      const res = await fetch(url, { method: "GET", headers: { "User-Agent": "BharatHeritageTrail verify script" } });
      if (res.status !== 200) {
        failCount++;
        console.log(`FAIL  ${res.status}  ${id}  ${url}`);
      }
    } catch (e) {
      failCount++;
      console.log(`ERROR ${id}  ${url}  -- ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`\n${entries.length - failCount}/${entries.length} image URLs returned 200.`);
process.exit(failCount === 0 ? 0 : 1);
