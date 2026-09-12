(function () {
  "use strict";

  var mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  // No basemap tiles at all -- every free/keyless tile provider either bakes
  // in city labels and borders (plain OSM) or now gates its "no labels" style
  // behind an API key (CARTO). A single India outline plus the 60 site dots
  // is the actual brief here ("very simple... nothing else"), so that's all
  // this renders: one local vendored GeoJSON polygon, no network requests,
  // no other country's borders, no labels, no roads.
  var outlineLayer = L.geoJSON(BHT.INDIA_OUTLINE, {
    style: {
      color: "#ddd8cc",
      weight: 1.5,
      fillColor: "#faf9f5",
      fillOpacity: 1,
    },
  });
  var INDIA_BOUNDS = outlineLayer.getBounds();

  var map = L.map(mapEl, {
    center: INDIA_BOUNDS.getCenter(),
    zoom: 5,
    minZoom: 4,
    maxBounds: INDIA_BOUNDS.pad(0.25),
    maxBoundsViscosity: 0.8,
    attributionControl: false,
    zoomSnap: 0.25,
  });
  outlineLayer.addTo(map);

  // The map container starts `hidden` (list view is the default), so fitBounds
  // can't run correctly until the container has real, non-zero dimensions --
  // it's deferred to the first invalidateSize() call, on first reveal.
  var hasFitBounds = false;

  function markerColor(site) {
    return site.collections.indexOf("unesco") !== -1 ? "unesco" : "pilgrim";
  }

  function makeIcon(site) {
    var cls = "map-marker map-marker--" + markerColor(site) + (BHT.isVisited(site.id) ? " map-marker--visited" : "");
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

  window.BHT_MAP = {
    invalidateSize: function () {
      setTimeout(function () {
        map.invalidateSize();
        if (!hasFitBounds) {
          hasFitBounds = true;
          map.fitBounds(INDIA_BOUNDS, { padding: [8, 8] });
        }
      }, 0);
    },
    setFilter: setFilter,
    _map: map,
  };
})();
