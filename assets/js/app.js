(function () {
  "use strict";

  var SITES = JSON.parse(document.getElementById("sites-data").textContent);
  var STORAGE_KEY = "bht:visited";

  function loadVisited() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function saveVisited(visited) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(visited));
    } catch (e) {
      /* localStorage unavailable (private mode etc.) -- app still works, just doesn't persist */
    }
  }

  var visited = loadVisited();

  function updateCounts() {
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
    var uEl = document.querySelector('[data-count="unesco"]');
    var pEl = document.querySelector('[data-count="pilgrimage"]');
    if (uEl) uEl.textContent = unescoDone;
    if (pEl) pEl.textContent = pilgrimDone;

    var stateCounts = {};
    SITES.forEach(function (s) {
      if (!stateCounts[s.state]) stateCounts[s.state] = { total: 0, done: 0 };
      stateCounts[s.state].total++;
      if (visited[s.id]) stateCounts[s.state].done++;
    });
    Object.keys(stateCounts).forEach(function (state) {
      var el = document.querySelector('[data-state-count="' + cssEscape(state) + '"]');
      if (el) el.textContent = stateCounts[state].done + "/" + stateCounts[state].total;
    });
  }

  function cssEscape(str) {
    return window.CSS && CSS.escape ? CSS.escape(str) : str.replace(/["\\]/g, "\\$&");
  }

  function applyVisitedState() {
    document.querySelectorAll(".visited-toggle").forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      btn.setAttribute("aria-pressed", visited[id] ? "true" : "false");
    });
  }

  function toggleVisited(id) {
    visited[id] = !visited[id];
    if (!visited[id]) delete visited[id];
    saveVisited(visited);
    applyVisitedState();
    updateCounts();
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".visited-toggle");
    if (btn) toggleVisited(btn.getAttribute("data-id"));
  });

  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
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
    });
  });

  applyVisitedState();
  updateCounts();
})();
