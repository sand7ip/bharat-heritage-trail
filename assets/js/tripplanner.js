(function () {
  "use strict";

  var overlay = document.getElementById("tripplanner-overlay");
  var modal = document.getElementById("tripplanner-modal");
  var closeBtn = document.getElementById("tripplanner-close");
  var openBtn = document.getElementById("tripplanner-open");
  var noBaseEl = document.getElementById("tripplanner-noBaseCity");
  var formEl = document.getElementById("tripplanner-form");
  var resultsEl = document.getElementById("tripplanner-results");
  var daysGroup = document.getElementById("tp-days");
  var modeGroup = document.getElementById("tp-mode");
  if (!modal) return;

  // Human-readable name + a real arrival gateway (lat/lng matching the
  // corresponding entry in data/cities.json) for each cluster id used in
  // data/sites.json. Distance-from-base is measured to this point.
  var CLUSTER_META = {
    "agra-braj": { name: "Agra & the Braj Belt", hub: "Agra", lat: 27.18, lng: 78.01 },
    "andhra-pilgrimage": { name: "Srisailam", hub: "Hyderabad", lat: 17.39, lng: 78.49 },
    "assam-northeast": { name: "Assam Wildlife Trail", hub: "Guwahati", lat: 26.14, lng: 91.74 },
    "aurangabad-deccan": { name: "Ajanta & Ellora", hub: "Aurangabad", lat: 19.88, lng: 75.34 },
    "bengal-heritage": { name: "Bengal Heritage Trail", hub: "Kolkata", lat: 22.57, lng: 88.36 },
    "bihar-buddhist-circuit": { name: "Bihar Buddhist Circuit", hub: "Gaya", lat: 24.8, lng: 85.0 },
    "chandigarh-modern": { name: "Chandigarh", hub: "Chandigarh", lat: 30.73, lng: 76.78 },
    "chardham-himalaya": { name: "Garhwal Char Dham", hub: "Dehradun", lat: 30.32, lng: 78.03 },
    "darjeeling-sikkim-himalaya": { name: "Darjeeling & Sikkim Himalaya", hub: "Siliguri", lat: 26.73, lng: 88.4 },
    "delhi-ncr": { name: "Delhi", hub: "Delhi", lat: 28.61, lng: 77.21 },
    goa: { name: "Goa", hub: "Panaji", lat: 15.49, lng: 73.83 },
    "gujarat-heritage": { name: "Gujarat Heritage Trail", hub: "Ahmedabad", lat: 23.02, lng: 72.57 },
    "himalaya-natural": { name: "Himalayan Wilderness", hub: "Dehradun", lat: 30.32, lng: 78.03 },
    "jharkhand-pilgrimage": { name: "Deoghar", hub: "Deoghar", lat: 24.48, lng: 86.7 },
    "karnataka-heritage": { name: "Karnataka Heritage Trail", hub: "Hubli", lat: 15.36, lng: 75.12 },
    "madhya-pradesh-heritage": { name: "Madhya Pradesh Heritage Trail", hub: "Bhopal", lat: 23.26, lng: 77.41 },
    "malwa-pilgrimage": { name: "Ujjain & Omkareshwar", hub: "Indore", lat: 22.72, lng: 75.86 },
    "mumbai-heritage": { name: "Mumbai Heritage Trail", hub: "Mumbai", lat: 19.08, lng: 72.88 },
    "nashik-sahyadri-trail": { name: "Nashik & the Sahyadri Trail", hub: "Nashik", lat: 20.0, lng: 73.79 },
    "odisha-coast": { name: "Odisha Coast", hub: "Bhubaneswar", lat: 20.3, lng: 85.82 },
    "rajasthan-forts": { name: "Rajasthan Forts & Jaipur", hub: "Jaipur", lat: 26.91, lng: 75.79 },
    "saurashtra-pilgrimage": { name: "Saurashtra Pilgrimage Coast", hub: "Rajkot", lat: 22.3, lng: 70.8 },
    "tamil-nadu-temple-trail": { name: "Tamil Nadu Temple Trail", hub: "Chennai", lat: 13.08, lng: 80.27 },
    "telangana-heritage": { name: "Ramappa Temple", hub: "Hyderabad", lat: 17.39, lng: 78.49 },
    "varanasi-buddhist-circuit": { name: "Varanasi & Sarnath", hub: "Varanasi", lat: 25.32, lng: 82.97 },
    "western-ghats-natural": { name: "Western Ghats", hub: "Kochi", lat: 9.93, lng: 76.27 },
  };

  var MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

  function parseRanges(str) {
    return (str || "")
      .split(",")
      .map(function (s) { return s.trim(); })
      .map(function (part) {
        var m = part.match(/([A-Za-z]{3})[–-]([A-Za-z]{3})/);
        return m ? [MONTHS[m[1]], MONTHS[m[2]]] : null;
      })
      .filter(Boolean);
  }

  function isInSeason(bestMonths, monthIdx) {
    return parseRanges(bestMonths).some(function (r) {
      return r[0] <= r[1] ? monthIdx >= r[0] && monthIdx <= r[1] : monthIdx >= r[0] || monthIdx <= r[1];
    });
  }

  // Deterministic, no API: a flat average speed per mode, with a fixed
  // hub-transfer overhead for flights (not worth it below ~350km).
  function travelTimeHours(km, mode) {
    if (mode === "air") return km < 350 ? km / 55 : 3 + km / 700;
    if (mode === "rail") return km / 50;
    return km / 55;
  }

  function maxHoursForDays(days) {
    return { "2": 6, "3": 10, "5": 16, "7": 30 }[days] || 16;
  }

  function nearestNeighborRoute(base, sites) {
    var remaining = sites.slice();
    var route = [];
    var lat = base.lat, lng = base.lng;
    while (remaining.length) {
      var bestIdx = 0, bestDist = Infinity;
      remaining.forEach(function (s, i) {
        var d = BHT.haversineKm(lat, lng, s.lat, s.lng);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      var next = remaining.splice(bestIdx, 1)[0];
      route.push(next);
      lat = next.lat;
      lng = next.lng;
    }
    return route;
  }

  function planTrip(days, mode) {
    var base = BHT.getBaseCity();
    if (!base) return null;
    var monthIdx = new Date().getMonth();
    var maxHours = maxHoursForDays(days);

    var byCluster = {};
    BHT.SITES.forEach(function (s) {
      (byCluster[s.cluster] = byCluster[s.cluster] || []).push(s);
    });

    var candidates = Object.keys(byCluster)
      .map(function (slug) {
        var sites = byCluster[slug];
        var meta = CLUSTER_META[slug];
        if (!meta) return null;
        var unvisited = sites.filter(function (s) { return !BHT.isVisited(s.id); });
        if (!unvisited.length) return null;

        var distKm = BHT.haversineKm(base.lat, base.lng, meta.lat, meta.lng);
        var hours = travelTimeHours(distKm, mode);
        var reachable = hours <= maxHours;
        var seasonScore = unvisited.filter(function (s) { return isInSeason(s.bestMonths, monthIdx); }).length / unvisited.length;
        var score = unvisited.length * 3 + seasonScore * 4 - hours * (reachable ? 0.3 : 1.4);

        return { slug: slug, meta: meta, unvisited: unvisited, distKm: distKm, hours: hours, reachable: reachable, seasonScore: seasonScore, score: score };
      })
      .filter(Boolean);

    candidates.sort(function (a, b) { return b.score - a.score; });
    var top3 = candidates.slice(0, 3);
    top3.forEach(function (c) { c.route = nearestNeighborRoute(base, c.unvisited); });

    return { top3: top3, allVisited: BHT.SITES.every(function (s) { return BHT.isVisited(s.id); }) };
  }

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var MODE_LABEL = { road: "road", rail: "train", air: "flight" };

  function renderCard(c, mode) {
    var base = BHT.getBaseCity();
    var html = "";
    html += '<div class="tp-card">';
    html += '<h3 class="tp-card-title">' + esc(c.meta.name) + "</h3>";
    html +=
      '<p class="tp-card-meta">≈ ' +
      Math.round(c.hours * 10) / 10 +
      "h by " +
      MODE_LABEL[mode] +
      " from " +
      esc(base.name) +
      " to " +
      esc(c.meta.hub) +
      (c.reachable ? "" : " — a stretch for this many days") +
      "</p>";
    if (c.seasonScore < 0.5) {
      html += '<p class="tp-card-season">Outside the best months for some of these sites — check before you book.</p>';
    }
    html += '<p class="tp-card-sub">' + c.unvisited.length + " site" + (c.unvisited.length === 1 ? "" : "s") + " you haven't seen, in order:</p>";
    html += '<ol class="tp-route">';
    c.route.forEach(function (s) {
      html += "<li>" + esc(s.name) + '<span class="tp-route-state"> — ' + esc(s.state) + "</span></li>";
    });
    html += "</ol>";
    html += "</div>";
    return html;
  }

  function render() {
    var base = BHT.getBaseCity();
    if (!base) {
      noBaseEl.hidden = false;
      formEl.hidden = true;
      resultsEl.innerHTML = "";
      return;
    }
    noBaseEl.hidden = true;
    formEl.hidden = false;

    var days = daysGroup.querySelector('[aria-selected="true"]').getAttribute("data-days");
    var mode = modeGroup.querySelector('[aria-selected="true"]').getAttribute("data-mode");
    var plan = planTrip(days, mode);

    if (!plan) {
      resultsEl.innerHTML = "";
      return;
    }
    if (plan.allVisited) {
      resultsEl.innerHTML = '<p class="tp-empty">You’ve marked every site on the trail. There’s nothing left to plan — time to start over somewhere new, or just enjoy having finished.</p>';
      return;
    }
    resultsEl.innerHTML = plan.top3.map(function (c) { return renderCard(c, mode); }).join("");
  }

  function selectSegment(group, attr) {
    group.querySelectorAll(".segmented-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        group.querySelectorAll(".segmented-btn").forEach(function (b) { b.setAttribute("aria-selected", "false"); });
        btn.setAttribute("aria-selected", "true");
        render();
      });
    });
  }
  selectSegment(daysGroup);
  selectSegment(modeGroup);

  function open() {
    render();
    overlay.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function close() {
    overlay.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  if (openBtn) openBtn.addEventListener("click", open);
  BHT.onVisitedChange(function () { if (!modal.hidden) render(); });
  BHT.onBaseCityChange(function () { if (!modal.hidden) render(); });

  window.BHT_TRIPPLANNER = { open: open, close: close };
})();
