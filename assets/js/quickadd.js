(function () {
  "use strict";

  // Sorted-to-top per the brief; ids not in our 60 (e.g. Siddhivinayak --
  // neither UNESCO nor Jyotirlinga/Char Dham) are simply skipped.
  var POPULAR_IDS = [
    "taj-mahal",
    "qutb-minar",
    "red-fort",
    "ajanta-caves",
    "ellora-caves",
    "hampi-monuments",
    "khajuraho-monuments",
    "konark-sun-temple",
    "fatehpur-sikri",
    "mahabalipuram-monuments",
    "somnath-temple",
    "kashi-vishwanath-temple",
    "mahakaleshwar-temple",
  ].filter(function (id) { return !!BHT.siteById(id); });

  var overlay = document.getElementById("quickadd-overlay");
  var modal = document.getElementById("quickadd-modal");
  var body = document.getElementById("quickadd-body");
  var countEl = document.getElementById("quickadd-count");
  var doneBtn = document.getElementById("quickadd-done");
  var openBtn = document.getElementById("quickadd-open");
  var closeBtn = document.getElementById("quickadd-close");

  function esc(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function itemRow(site) {
    var visited = BHT.isVisited(site.id);
    return (
      '<button type="button" class="qa-item" data-id="' +
      site.id +
      '" aria-pressed="' +
      (visited ? "true" : "false") +
      '"><span class="qa-dot"></span><span class="qa-name">' +
      esc(site.name) +
      "</span></button>"
    );
  }

  function render() {
    var byId = {};
    BHT.SITES.forEach(function (s) { byId[s.id] = s; });

    var html = "";
    html += '<div class="qa-section"><h3 class="qa-section-heading">Popular</h3><div class="qa-grid">';
    POPULAR_IDS.forEach(function (id) { html += itemRow(byId[id]); });
    html += "</div></div>";

    var rest = BHT.SITES.filter(function (s) { return POPULAR_IDS.indexOf(s.id) === -1; });
    var byState = {};
    rest.forEach(function (s) {
      if (!byState[s.state]) byState[s.state] = [];
      byState[s.state].push(s);
    });
    var states = Object.keys(byState).sort();
    states.forEach(function (state) {
      html += '<div class="qa-section"><h3 class="qa-section-heading">' + esc(state) + '</h3><div class="qa-grid">';
      byState[state]
        .sort(function (a, b) { return a.name.localeCompare(b.name); })
        .forEach(function (s) { html += itemRow(s); });
      html += "</div></div>";
    });

    body.innerHTML = html;
    updateCount();
  }

  function updateCount() {
    var visitedCount = BHT.SITES.filter(function (s) { return BHT.isVisited(s.id); }).length;
    countEl.textContent = visitedCount;
  }

  function open() {
    render();
    overlay.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    try { localStorage.setItem("bht:quickadd-seen", "1"); } catch (e) {}
  }

  function close() {
    overlay.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  body.addEventListener("click", function (e) {
    var item = e.target.closest(".qa-item");
    if (!item) return;
    var id = item.getAttribute("data-id");
    BHT.toggleVisited(id);
    item.setAttribute("aria-pressed", BHT.isVisited(id) ? "true" : "false");
    updateCount();
  });

  doneBtn.addEventListener("click", function () {
    close();
    if (window.BHT_SHARE) window.BHT_SHARE.open();
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  if (openBtn) openBtn.addEventListener("click", open);

  BHT.onVisitedChange(function () {
    if (!modal.hidden) {
      document.querySelectorAll(".qa-item").forEach(function (item) {
        item.setAttribute("aria-pressed", BHT.isVisited(item.getAttribute("data-id")) ? "true" : "false");
      });
      updateCount();
    }
  });

  var seenBefore = false;
  try { seenBefore = localStorage.getItem("bht:quickadd-seen") === "1"; } catch (e) {}
  var hasAnyVisited = BHT.SITES.some(function (s) { return BHT.isVisited(s.id); });
  if (!seenBefore && !hasAnyVisited) {
    open();
  }

  window.BHT_QUICKADD = { open: open, close: close };
})();
