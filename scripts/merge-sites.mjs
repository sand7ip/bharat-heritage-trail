// One-time build script: merges the two verified raw research sets into a single
// SITES array (data/sites.json), assigns ids, models the collections overlap,
// and computes `nearby` cross-references geographically (haversine, 25km threshold).
// Run: node scripts/merge-sites.mjs
import { readFileSync, writeFileSync } from "node:fs";

const unesco = JSON.parse(readFileSync(new URL("./_raw-unesco.json", import.meta.url)));
const pilgrimage = JSON.parse(readFileSync(new URL("./_raw-pilgrimage.json", import.meta.url)));

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// Manual short ids (auto-slug produces overly long ids for some UNESCO names)
const idOverrides = {
  "ajanta-caves": "ajanta-caves",
  "ellora-caves": "ellora-caves",
  "agra-fort": "agra-fort",
  "taj-mahal": "taj-mahal",
  "sun-temple-konark": "konark-sun-temple",
  "group-of-monuments-at-mahabalipuram": "mahabalipuram-monuments",
  "kaziranga-national-park": "kaziranga-national-park",
  "manas-wildlife-sanctuary": "manas-wildlife-sanctuary",
  "keoladeo-national-park": "keoladeo-national-park",
  "churches-and-convents-of-goa": "goa-churches-convents",
  "khajuraho-group-of-monuments": "khajuraho-monuments",
  "group-of-monuments-at-hampi": "hampi-monuments",
  "fatehpur-sikri": "fatehpur-sikri",
  "group-of-monuments-at-pattadakal": "pattadakal-monuments",
  "elephanta-caves": "elephanta-caves",
  "great-living-chola-temples": "chola-temples",
  "sundarbans-national-park": "sundarbans-national-park",
  "nanda-devi-and-valley-of-flowers-national-parks": "nanda-devi-valley-of-flowers",
  "buddhist-monuments-at-sanchi": "sanchi-buddhist-monuments",
  "humayuns-tomb-delhi": "humayuns-tomb",
  "qutb-minar-and-its-monuments-delhi": "qutb-minar",
  "mountain-railways-of-india": "mountain-railways-india",
  "mahabodhi-temple-complex-at-bodh-gaya": "mahabodhi-temple-bodhgaya",
  "rock-shelters-of-bhimbetka": "bhimbetka-rock-shelters",
  "chhatrapati-shivaji-terminus-formerly-victoria-terminus": "chhatrapati-shivaji-terminus",
  "champaner-pavagadh-archaeological-park": "champaner-pavagadh",
  "red-fort-complex": "red-fort",
  "the-jantar-mantar-jaipur": "jantar-mantar-jaipur",
  "western-ghats": "western-ghats",
  "hill-forts-of-rajasthan": "hill-forts-rajasthan",
  "rani-ki-vav-at-patan-gujarat": "rani-ki-vav",
  "great-himalayan-national-park-conservation-area": "great-himalayan-national-park",
  "archaeological-site-of-nalanda-mahavihara-at-nalanda-bihar": "nalanda-mahavihara",
  "khangchendzonga-national-park": "khangchendzonga-national-park",
  "the-architectural-work-of-le-corbusier": "le-corbusier-chandigarh",
  "historic-city-of-ahmadabad": "historic-city-ahmadabad",
  "victorian-gothic-and-art-deco-ensembles-of-mumbai": "victorian-gothic-artdeco-mumbai",
  "jaipur-city-rajasthan": "jaipur-city",
  "kakatiya-rudreshwara-temple-telangana": "ramappa-temple",
  "dholavira-a-harappan-city": "dholavira",
  "santiniketan": "santiniketan",
  "sacred-ensembles-of-the-hoysalas": "hoysala-temples",
  "moidams-the-mound-burial-system-of-the-ahom-dynasty": "moidams-ahom",
  "maratha-military-landscapes-of-india": "maratha-military-landscapes",
  "ancient-buddhist-site-of-sarnath": "sarnath",
  "trimbakeshwar-shiva-temple": "trimbakeshwar-temple",
};

const clusterMap = {
  "humayuns-tomb": "delhi-ncr", "qutb-minar": "delhi-ncr", "red-fort": "delhi-ncr",
  "agra-fort": "agra-braj", "taj-mahal": "agra-braj", "fatehpur-sikri": "agra-braj", "keoladeo-national-park": "agra-braj",
  "sarnath": "varanasi-buddhist-circuit", "kashi-vishwanath-temple": "varanasi-buddhist-circuit",
  "mahabodhi-temple-bodhgaya": "bihar-buddhist-circuit", "nalanda-mahavihara": "bihar-buddhist-circuit",
  "ajanta-caves": "aurangabad-deccan", "ellora-caves": "aurangabad-deccan", "grishneshwar-temple": "aurangabad-deccan",
  "elephanta-caves": "mumbai-heritage", "chhatrapati-shivaji-terminus": "mumbai-heritage", "victorian-gothic-artdeco-mumbai": "mumbai-heritage",
  "trimbakeshwar-temple": "nashik-sahyadri-trail", "bhimashankar-temple": "nashik-sahyadri-trail", "maratha-military-landscapes": "nashik-sahyadri-trail",
  "hampi-monuments": "karnataka-heritage", "pattadakal-monuments": "karnataka-heritage", "hoysala-temples": "karnataka-heritage",
  "goa-churches-convents": "goa",
  "mahabalipuram-monuments": "tamil-nadu-temple-trail", "chola-temples": "tamil-nadu-temple-trail", "rameswaram": "tamil-nadu-temple-trail",
  "konark-sun-temple": "odisha-coast", "jagannath-temple-puri": "odisha-coast",
  "rani-ki-vav": "gujarat-heritage", "champaner-pavagadh": "gujarat-heritage", "historic-city-ahmadabad": "gujarat-heritage", "dholavira": "gujarat-heritage",
  "somnath-temple": "saurashtra-pilgrimage", "dwarkadhish-temple": "saurashtra-pilgrimage", "nageshwar-jyotirlinga": "saurashtra-pilgrimage",
  "jaipur-city": "rajasthan-forts", "jantar-mantar-jaipur": "rajasthan-forts", "hill-forts-rajasthan": "rajasthan-forts",
  "khajuraho-monuments": "madhya-pradesh-heritage", "sanchi-buddhist-monuments": "madhya-pradesh-heritage", "bhimbetka-rock-shelters": "madhya-pradesh-heritage",
  "mahakaleshwar-temple": "malwa-pilgrimage", "omkareshwar-temple": "malwa-pilgrimage",
  "kaziranga-national-park": "assam-northeast", "manas-wildlife-sanctuary": "assam-northeast", "moidams-ahom": "assam-northeast",
  "nanda-devi-valley-of-flowers": "himalaya-natural", "great-himalayan-national-park": "himalaya-natural",
  "kedarnath-temple": "chardham-himalaya", "badrinath-temple": "chardham-himalaya",
  "mountain-railways-india": "darjeeling-sikkim-himalaya", "khangchendzonga-national-park": "darjeeling-sikkim-himalaya",
  "sundarbans-national-park": "bengal-heritage", "santiniketan": "bengal-heritage",
  "ramappa-temple": "telangana-heritage",
  "mallikarjuna-temple": "andhra-pilgrimage",
  "baidyanath-temple": "jharkhand-pilgrimage",
  "le-corbusier-chandigarh": "chandigarh-modern",
  "western-ghats": "western-ghats-natural",
};

const sites = [];

for (const s of unesco) {
  const rawSlug = slug(s.name);
  const id = idOverrides[rawSlug] || rawSlug;
  sites.push({
    id, name: s.name.replace(/, Delhi$| Complex$| Complex, Telangana$/, "").trim(),
    state: s.state, lat: s.lat, lng: s.lng,
    collections: ["unesco"],
    unescoId: s.unescoId, unescoUrl: s.unescoUrl, wikiUrl: s.wikiUrl,
    year: s.year, category: s.category,
    blurb: "", bestMonths: "",
    nearestRail: null, nearestAirport: null,
    nearby: [], cluster: clusterMap[id] || "other",
    _note: s.note || undefined,
  });
}

for (const p of pilgrimage) {
  const rawSlug = p.name === "Ramanathaswamy Temple" ? "rameswaram" : slug(p.name);
  const id = idOverrides[rawSlug] || rawSlug;
  sites.push({
    id, name: p.name, state: p.state, lat: p.lat, lng: p.lng,
    collections: p.collections,
    unescoId: null, unescoUrl: null, wikiUrl: p.wikiUrl,
    year: null, category: "Pilgrimage",
    blurb: "", bestMonths: p.bestMonths,
    nearestRail: null, nearestAirport: null,
    nearby: [], cluster: clusterMap[id] || "other",
  });
}

// --- Verification: counts ---
const unescoCount = sites.filter((s) => s.collections.includes("unesco")).length;
const jyoCount = sites.filter((s) => s.collections.includes("jyotirlinga")).length;
const chardhamCount = sites.filter((s) => s.collections.includes("chardham")).length;
const pilgrimageUnique = sites.filter((s) => s.collections.includes("jyotirlinga") || s.collections.includes("chardham")).length;
const ids = sites.map((s) => s.id);
const dupeIds = ids.filter((id, i) => ids.indexOf(id) !== i);

console.log(`Total unique sites: ${sites.length} (expect 60)`);
console.log(`UNESCO: ${unescoCount} (expect 45)`);
console.log(`Jyotirlinga tagged: ${jyoCount} (expect 12)`);
console.log(`Char Dham tagged: ${chardhamCount} (expect 4)`);
console.log(`Unique Jyotirlinga+CharDham sites: ${pilgrimageUnique} (expect 15, since Rameswaram counts once)`);
console.log(`Duplicate ids: ${dupeIds.length ? dupeIds.join(", ") : "none"}`);
const rameswaram = sites.find((s) => s.id === "rameswaram");
console.log(`Rameswaram collections: ${JSON.stringify(rameswaram?.collections)}`);

// --- Compute `nearby` (haversine, <=25km, excluding self) ---
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const nearbyPairs = [];
for (let i = 0; i < sites.length; i++) {
  for (let j = i + 1; j < sites.length; j++) {
    const d = haversineKm(sites[i], sites[j]);
    if (d <= 25) {
      sites[i].nearby.push(sites[j].id);
      sites[j].nearby.push(sites[i].id);
      nearbyPairs.push(`${sites[i].id} <-> ${sites[j].id} (${d.toFixed(1)} km)`);
    }
  }
}
console.log(`\nNearby pairs found (<=25km):`);
nearbyPairs.forEach((p) => console.log("  " + p));

writeFileSync(
  new URL("../data/sites.json", import.meta.url),
  JSON.stringify(sites, null, 2) + "\n"
);
console.log(`\nWrote data/sites.json with ${sites.length} records.`);
