// Validates the final data/sites.json against the brief's non-negotiables.
// Run: node scripts/verify-data.mjs
import { readFileSync } from "node:fs";

const sites = JSON.parse(readFileSync(new URL("../data/sites.json", import.meta.url)));
const cities = JSON.parse(readFileSync(new URL("../data/cities.json", import.meta.url)));

let failures = 0;
function check(label, pass) {
  console.log(`${pass ? "OK  " : "FAIL"}  ${label}`);
  if (!pass) failures++;
}

check("Total unique sites = 60", sites.length === 60);

const unescoSites = sites.filter((s) => s.collections.includes("unesco"));
check("UNESCO sites = 45", unescoSites.length === 45);

const jyoOrDham = sites.filter(
  (s) => s.collections.includes("jyotirlinga") || s.collections.includes("chardham")
);
check("Unique Jyotirlinga+CharDham sites = 15", jyoOrDham.length === 15);
check(
  "Jyotirlinga tagged = 12",
  sites.filter((s) => s.collections.includes("jyotirlinga")).length === 12
);
check(
  "Char Dham tagged = 4",
  sites.filter((s) => s.collections.includes("chardham")).length === 4
);

const rameswaram = sites.find((s) => s.id === "rameswaram");
check(
  "Rameswaram is a single record tagged with both collections",
  !!rameswaram &&
    rameswaram.collections.includes("jyotirlinga") &&
    rameswaram.collections.includes("chardham")
);

const ids = sites.map((s) => s.id);
check("No duplicate ids", new Set(ids).size === ids.length);

check(
  "Every site has non-empty blurb, bestMonths, nearestRail, nearestAirport",
  sites.every(
    (s) =>
      s.blurb && s.blurb.length > 0 &&
      s.bestMonths && s.bestMonths.length > 0 &&
      s.nearestRail && s.nearestRail.name && typeof s.nearestRail.km === "number" &&
      s.nearestAirport && s.nearestAirport.name && typeof s.nearestAirport.km === "number"
  )
);

check(
  "Every site has an image URL",
  sites.every((s) => typeof s.image === "string" && /^https:\/\//.test(s.image))
);

check(
  "Every UNESCO site has a numeric unescoId + unescoUrl; every non-UNESCO site has both null",
  sites.every((s) =>
    s.collections.includes("unesco")
      ? typeof s.unescoId === "number" && !!s.unescoUrl
      : s.unescoId === null && s.unescoUrl === null
  )
);

check(
  "Every site has a wikiUrl",
  sites.every((s) => !!s.wikiUrl)
);

check(
  "Every site has lat/lng inside India's bounding box (roughly 6-36 N, 68-98 E)",
  sites.every((s) => s.lat >= 6 && s.lat <= 36 && s.lng >= 68 && s.lng <= 98)
);

check(
  "nearby cross-references are symmetric (if A lists B, B lists A)",
  sites.every((s) => s.nearby.every((otherId) => {
    const other = sites.find((x) => x.id === otherId);
    return other && other.nearby.includes(s.id);
  }))
);

const ellora = sites.find((s) => s.id === "ellora-caves");
const grishneshwar = sites.find((s) => s.id === "grishneshwar-temple");
check(
  "Ellora Caves <-> Grishneshwar Temple nearby cross-reference present",
  !!ellora && !!grishneshwar &&
    ellora.nearby.includes("grishneshwar-temple") &&
    grishneshwar.nearby.includes("ellora-caves")
);

check("~200 cities loaded", cities.length >= 180 && cities.length <= 220);
check(
  "Every city has name/state/lat/lng",
  cities.every((c) => c.name && c.state && typeof c.lat === "number" && typeof c.lng === "number")
);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
