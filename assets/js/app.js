(function () {
  "use strict";

  function updateCounts() {
    var c = BHT.counts();
    var uEl = document.querySelector('[data-count="unesco"]');
    var pEl = document.querySelector('[data-count="pilgrimage"]');
    if (uEl) uEl.textContent = c.unescoDone;
    if (pEl) pEl.textContent = c.pilgrimDone;

    var stateCounts = {};
    BHT.SITES.forEach(function (s) {
      if (!stateCounts[s.state]) stateCounts[s.state] = { total: 0, done: 0 };
      stateCounts[s.state].total++;
      if (BHT.isVisited(s.id)) stateCounts[s.state].done++;
    });
    Object.keys(stateCounts).forEach(function (state) {
      var el = document.querySelector('[data-state-count="' + BHT.cssEscape(state) + '"]');
      if (el) el.textContent = stateCounts[state].done + "/" + stateCounts[state].total;
    });
  }

  function applyVisitedState() {
    document.querySelectorAll(".visited-toggle").forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      btn.setAttribute("aria-pressed", BHT.isVisited(id) ? "true" : "false");
    });
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".visited-toggle");
    if (btn) {
      e.stopPropagation();
      BHT.toggleVisited(btn.getAttribute("data-id"));
      return;
    }
    var row = e.target.closest(".site-row");
    if (row) {
      BHT.openDetail(row.getAttribute("data-id"));
    }
  });

  BHT.onVisitedChange(function () {
    applyVisitedState();
    updateCounts();
  });

  var filterTabs = document.querySelectorAll('.tabs[aria-label="Filter by collection"] .tab');
  filterTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      filterTabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
      tab.setAttribute("aria-selected", "true");
      var filter = tab.getAttribute("data-filter");
      document.querySelectorAll(".site-row").forEach(function (row) {
        var collections = row.getAttribute("data-collections").split(" ");
        var show =
          filter === "all" ||
          (filter === "unesco" && collections.indexOf("unesco") !== -1) ||
          (filter === "pilgrimage" && (collections.indexOf("jyotirlinga") !== -1 || collections.indexOf("chardham") !== -1));
        row.style.display = show ? "" : "none";
      });
      document.querySelectorAll(".state-group").forEach(function (group) {
        var anyVisible = group.querySelectorAll('.site-row:not([style*="display: none"])').length > 0;
        group.style.display = anyVisible ? "" : "none";
      });
      if (window.BHT_MAP) window.BHT_MAP.setFilter(filter);
    });
  });

  var viewTabs = document.querySelectorAll(".view-toggle .tab-view");
  var ledger = document.getElementById("ledger");
  var mapSection = document.getElementById("map-section");
  viewTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      viewTabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
      tab.setAttribute("aria-selected", "true");
      var view = tab.getAttribute("data-view");
      if (view === "map") {
        ledger.hidden = true;
        mapSection.hidden = false;
        if (window.BHT_MAP) window.BHT_MAP.invalidateSize();
      } else {
        ledger.hidden = false;
        mapSection.hidden = true;
      }
    });
  });

  applyVisitedState();
  updateCounts();
})();
