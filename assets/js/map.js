(function () {
  "use strict";

  var mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  var INDIA_BOUNDS = L.latLngBounds([6, 66], [37.5, 99]);

  var map = L.map(mapEl, {
    center: INDIA_BOUNDS.getCenter(),
    zoom: 5,
    minZoom: 4,
    maxBounds: INDIA_BOUNDS.pad(0.2),
    maxBoundsViscosity: 0.8,
  });

  // Esri's "Light Gray Canvas" base layer: real Mercator-projected map tiles
  // (unlike a raw vector outline, this can't look distorted), no API key,
  // and -- unlike plain OSM -- no city names, no state borders, no road
  // network. Only sparse country-level labels remain.
  L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    {
      attribution: "Tiles &copy; Esri",
      maxZoom: 16,
    }
  ).addTo(map);

  var hasFitBounds = false;

  function makeIcon(site) {
    var cls = "map-marker" + (BHT.isVisited(site.id) ? " map-marker--visited" : "");
    return L.divIcon({
      className: "",
      html: '<span class="' + cls + '"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }

  var markers = {};
  BHT.SITES.forEach(function (site) {
    var marker = L.marker([site.lat, site.lng], { icon: makeIcon(site) }).addTo(map);
    marker.bindTooltip(site.name, { direction: "top", offset: [0, -6] });
    marker.on("click", function () {
      BHT.openDetail(site.id);
    });
    markers[site.id] = marker;
  });

  BHT.onVisitedChange(function (id) {
    var site = BHT.siteById(id);
    var marker = markers[id];
    if (site && marker) marker.setIcon(makeIcon(site));
  });

  function setFilter(filter) {
    BHT.SITES.forEach(function (site) {
      var marker = markers[site.id];
      var collections = site.collections;
      var show =
        filter === "all" ||
        (filter === "unesco" && collections.indexOf("unesco") !== -1) ||
        (filter === "pilgrimage" && (collections.indexOf("jyotirlinga") !== -1 || collections.indexOf("chardham") !== -1));
      var onMap = map.hasLayer(marker);
      if (show && !onMap) marker.addTo(map);
      if (!show && onMap) map.removeLayer(marker);
    });
  }

  function invalidateSize() {
    setTimeout(function () {
      map.invalidateSize();
      if (!hasFitBounds) {
        hasFitBounds = true;
        map.fitBounds(INDIA_BOUNDS, { padding: [8, 8] });
      }
    }, 0);
  }

  window.BHT_MAP = {
    invalidateSize: invalidateSize,
    setFilter: setFilter,
    _map: map,
  };

  // Map is the default view now (not hidden behind a toggle click), so it
  // already has real dimensions at construction time -- but call this once
  // anyway to be robust against any pre-layout sizing quirks.
  invalidateSize();
})();
