// Shared data + state for the ledger list, map, city picker and detail panel.
// Everything else attaches to window.BHT rather than re-parsing the JSON
// islands or re-implementing the visited/base-city stores.
(function () {
  "use strict";

  var SITES = JSON.parse(document.getElementById("sites-data").textContent);
  var CITIES = JSON.parse(document.getElementById("cities-data").textContent);
  var INDIA_OUTLINE = JSON.parse(document.getElementById("india-outline-data").textContent);
  var SITES_BY_ID = {};
  SITES.forEach(function (s) { SITES_BY_ID[s.id] = s; });

  var VISITED_KEY = "bht:visited";
  var BASE_CITY_KEY = "bht:baseCity";

  function safeGet(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* private mode / storage unavailable -- app still works this session */
    }
  }

  var visited = safeGet(VISITED_KEY) || {};
  var baseCity = safeGet(BASE_CITY_KEY) || null;
  var visitedListeners = [];
  var baseCityListeners = [];

  function haversineKm(lat1, lng1, lat2, lng2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLng = ((lng2 - lng1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  window.BHT = {
    SITES: SITES,
    CITIES: CITIES,
    INDIA_OUTLINE: INDIA_OUTLINE,
    siteById: function (id) { return SITES_BY_ID[id]; },

    isVisited: function (id) { return !!visited[id]; },
    toggleVisited: function (id) {
      if (visited[id]) delete visited[id];
      else visited[id] = true;
      safeSet(VISITED_KEY, visited);
      visitedListeners.forEach(function (cb) { cb(id, !!visited[id]); });
    },
    onVisitedChange: function (cb) { visitedListeners.push(cb); },
    counts: function () {
      var unescoTotal = 0, unescoDone = 0, pilgrimTotal = 0, pilgrimDone = 0;
      SITES.forEach(function (s) {
        var isVisited = !!visited[s.id];
        if (s.collections.indexOf("unesco") !== -1) {
          unescoTotal++;
          if (isVisited) unescoDone++;
        }
        if (s.collections.indexOf("jyotirlinga") !== -1 || s.collections.indexOf("chardham") !== -1) {
          pilgrimTotal++;
          if (isVisited) pilgrimDone++;
        }
      });
      return { unescoTotal: unescoTotal, unescoDone: unescoDone, pilgrimTotal: pilgrimTotal, pilgrimDone: pilgrimDone };
    },

    getBaseCity: function () { return baseCity; },
    setBaseCity: function (city) {
      baseCity = city;
      safeSet(BASE_CITY_KEY, baseCity);
      baseCityListeners.forEach(function (cb) { cb(baseCity); });
    },
    clearBaseCity: function () {
      baseCity = null;
      try { localStorage.removeItem(BASE_CITY_KEY); } catch (e) {}
      baseCityListeners.forEach(function (cb) { cb(null); });
    },
    onBaseCityChange: function (cb) { baseCityListeners.push(cb); },

    haversineKm: haversineKm,
    distanceToSite: function (site) {
      if (!baseCity) return null;
      return haversineKm(baseCity.lat, baseCity.lng, site.lat, site.lng);
    },
    formatKm: function (km) {
      return "\u2248 " + Math.round(km).toLocaleString("en-IN") + " km aerial";
    },

    cssEscape: function (str) {
      return window.CSS && CSS.escape ? CSS.escape(str) : String(str).replace(/["\\]/g, "\\$&");
    },
  };
})();
