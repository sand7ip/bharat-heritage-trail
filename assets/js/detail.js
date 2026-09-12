(function () {
  "use strict";

  var overlay = document.getElementById("detail-overlay");
  var panel = document.getElementById("detail-panel");
  var body = document.getElementById("detail-body");
  var closeBtn = document.getElementById("detail-close");
  var currentId = null;

  function esc(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function metaLine(s) {
    var parts = [s.state, s.category];
    if (s.year) parts.push(String(s.year));
    return parts.join(" · ");
  }

  function render(site) {
    var visited = BHT.isVisited(site.id);
    var distance = BHT.distanceToSite(site);

    var html = "";
    if (site.image) {
      html +=
        '<img class="detail-image" src="' +
        esc(site.image) +
        '" alt="' +
        esc(site.name) +
        '" loading="lazy" onerror="this.remove()">';
    }
    html += '<h2 class="detail-name">' + esc(site.name) + "</h2>";
    html += '<p class="detail-meta">' + esc(metaLine(site)) + "</p>";
    html += '<p class="detail-blurb">' + esc(site.blurb) + "</p>";

    if (distance !== null) {
      html += '<p class="detail-distance">' + esc(BHT.formatKm(distance)) + " from " + esc(BHT.getBaseCity().name) + "</p>";
    } else {
      html += '<p class="detail-distance detail-distance-empty">Set a base city to see distance</p>';
    }

    html += '<dl class="detail-travel">';
    html += "<dt>Nearest railway</dt><dd>" + esc(site.nearestRail.name) + " · " + site.nearestRail.km + " km</dd>";
    html += "<dt>Nearest airport</dt><dd>" + esc(site.nearestAirport.name) + " · " + site.nearestAirport.km + " km</dd>";
    html += "<dt>Best months</dt><dd>" + esc(site.bestMonths) + "</dd>";
    html += "</dl>";

    html += '<p class="detail-links">';
    html += '<a href="' + esc(site.wikiUrl) + '" target="_blank" rel="noopener">Wikipedia</a>';
    if (site.unescoUrl) html += ' <a href="' + esc(site.unescoUrl) + '" target="_blank" rel="noopener">UNESCO</a>';
    html += "</p>";

    html +=
      '<button type="button" class="detail-visited-toggle" data-id="' +
      site.id +
      '" aria-pressed="' +
      (visited ? "true" : "false") +
      '">' +
      (visited ? "Visited — undo" : "Mark visited") +
      "</button>";

    if (site.nearby && site.nearby.length) {
      html += '<div class="detail-nearby"><h3>Also nearby</h3><ul>';
      site.nearby.forEach(function (nearId) {
        var nearSite = BHT.siteById(nearId);
        if (!nearSite) return;
        var nearVisited = BHT.isVisited(nearId);
        html +=
          '<li><button type="button" class="detail-nearby-link" data-id="' +
          nearId +
          '">' +
          (nearVisited ? "✓ " : "") +
          esc(nearSite.name) +
          "</button></li>";
      });
      html += "</ul></div>";
    }

    body.innerHTML = html;
  }

  function open(id) {
    var site = BHT.siteById(id);
    if (!site) return;
    currentId = id;
    render(site);
    overlay.hidden = false;
    panel.hidden = false;
    closeBtn.focus();
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.hidden = true;
    panel.hidden = true;
    currentId = null;
    document.body.style.overflow = "";
  }

  overlay.addEventListener("click", close);
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) close();
  });

  body.addEventListener("click", function (e) {
    var toggle = e.target.closest(".detail-visited-toggle");
    if (toggle) {
      BHT.toggleVisited(toggle.getAttribute("data-id"));
      return;
    }
    var nearbyLink = e.target.closest(".detail-nearby-link");
    if (nearbyLink) {
      open(nearbyLink.getAttribute("data-id"));
    }
  });

  BHT.onVisitedChange(function (id) {
    if (currentId === id) render(BHT.siteById(id));
  });
  BHT.onBaseCityChange(function () {
    if (currentId) render(BHT.siteById(currentId));
  });

  BHT.openDetail = open;
  BHT.closeDetail = close;
})();
