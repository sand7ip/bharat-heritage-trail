(function () {
  "use strict";

  var overlay = document.getElementById("share-overlay");
  var modal = document.getElementById("share-modal");
  var canvas = document.getElementById("share-canvas");
  var closeBtn = document.getElementById("share-close");
  var downloadBtn = document.getElementById("share-download");
  var nativeShareBtn = document.getElementById("share-native");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var INK = "#1f1e1d";
  var MUTED = "#6b6862";
  var BG = "#f0eee6";
  var ACCENT = "#c15f3c";
  var SUCCESS = "#4b7355";
  var BORDER = "#ddd8cc";

  // Same india-outline.geojson used nowhere else visually now, but kept
  // vendored for exactly this: the one place the brief asks for real
  // design attention. Projected with a plain equirectangular fit -- the
  // outline is a background reference, not a navigational map, so this
  // doesn't need Mercator.
  function outlineBounds() {
    var coords = BHT.INDIA_OUTLINE.features[0].geometry.coordinates[0];
    var lats = coords.map(function (c) { return c[1]; });
    var lngs = coords.map(function (c) { return c[0]; });
    return {
      minLat: Math.min.apply(null, lats),
      maxLat: Math.max.apply(null, lats),
      minLng: Math.min.apply(null, lngs),
      maxLng: Math.max.apply(null, lngs),
      coords: coords,
    };
  }

  function makeProjector(bounds, box) {
    var latSpan = bounds.maxLat - bounds.minLat;
    var lngSpan = bounds.maxLng - bounds.minLng;
    var scale = Math.min(box.w / lngSpan, box.h / latSpan);
    var drawW = lngSpan * scale;
    var drawH = latSpan * scale;
    var offsetX = box.x + (box.w - drawW) / 2;
    var offsetY = box.y + (box.h - drawH) / 2;
    return function (lat, lng) {
      var x = offsetX + (lng - bounds.minLng) * scale;
      var y = offsetY + (bounds.maxLat - lat) * scale;
      return [x, y];
    };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStamp(cx, cy, r) {
    ctx.save();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 10, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    var ticks = 32;
    for (var i = 0; i < ticks; i++) {
      var a = (i / ticks) * Math.PI * 2;
      var x1 = cx + Math.cos(a) * (r + 4);
      var y1 = cy + Math.sin(a) * (r + 4);
      var x2 = cx + Math.cos(a) * (r + 12);
      var y2 = cy + Math.sin(a) * (r + 12);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // simple spire mark, matches the favicon
    ctx.fillStyle = ACCENT;
    var s = r * 0.62;
    var tiers = [
      [0.55, 0.08],
      [0.4, 0.08],
      [0.26, 0.08],
    ];
    var y = cy + s * 0.42;
    for (var t = 0; t < tiers.length; t++) {
      var w = s * tiers[t][0];
      var h = s * tiers[t][1];
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      ctx.lineTo(cx, y - h);
      ctx.closePath();
      ctx.fill();
      y -= h * 0.85;
    }
    ctx.restore();
  }

  function render() {
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRect(28, 28, W - 56, H - 56, 4);
    ctx.stroke();

    // Header: stamp + wordmark
    drawStamp(110, 130, 48);
    ctx.fillStyle = INK;
    ctx.font = "700 30px Georgia, serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Bharat Heritage Trail", 178, 122);
    ctx.fillStyle = MUTED;
    ctx.font = "20px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText("My heritage passport", 178, 152);

    // India outline with dots for visited sites
    var bounds = outlineBounds();
    var mapBox = { x: 90, y: 220, w: W - 180, h: 560 };
    var project = makeProjector(bounds, mapBox);

    ctx.beginPath();
    bounds.coords.forEach(function (c, i) {
      var p = project(c[1], c[0]);
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    ctx.fillStyle = "#faf9f5";
    ctx.fill();
    ctx.strokeStyle = BORDER;
    ctx.lineWidth = 2;
    ctx.stroke();

    var visitedSites = BHT.SITES.filter(function (s) { return BHT.isVisited(s.id); });
    visitedSites.forEach(function (s) {
      var p = project(s.lat, s.lng);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 7, 0, Math.PI * 2);
      ctx.fillStyle = SUCCESS;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = BG;
      ctx.stroke();
    });

    // Stats
    var counts = BHT.counts();
    var statsY = 850;
    ctx.textBaseline = "alphabetic";

    ctx.font = "700 64px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.fillText(String(counts.unescoDone), 90, statsY);
    var w1 = ctx.measureText(String(counts.unescoDone)).width;
    ctx.font = "400 30px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText("/" + counts.unescoTotal + " UNESCO", 90 + w1 + 8, statsY);

    ctx.font = "700 64px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = ACCENT;
    ctx.fillText(String(counts.pilgrimDone), 90, statsY + 74);
    var w2 = ctx.measureText(String(counts.pilgrimDone)).width;
    ctx.font = "400 30px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.fillText("/" + counts.pilgrimTotal + " Jyotirlinga & Dham", 90 + w2 + 8, statsY + 74);

    // Domain, small, corner
    ctx.font = "400 22px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillStyle = MUTED;
    ctx.textAlign = "right";
    ctx.fillText("bharatheritagetrail.com", W - 60, H - 56);
    ctx.textAlign = "left";
  }

  function toBlob() {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) { resolve(blob); }, "image/png");
    });
  }

  downloadBtn.addEventListener("click", async function () {
    var blob = await toBlob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "bharat-heritage-trail.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  });

  if (nativeShareBtn) {
    nativeShareBtn.addEventListener("click", async function () {
      var blob = await toBlob();
      var file = new File([blob], "bharat-heritage-trail.png", { type: "image/png" });
      try {
        await navigator.share({
          files: [file],
          title: "Bharat Heritage Trail",
          text: "My heritage passport so far.",
        });
      } catch (e) {
        /* user cancelled share sheet -- no-op */
      }
    });
  }

  function open() {
    render();
    overlay.hidden = false;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (nativeShareBtn) {
      var canShareFiles =
        navigator.canShare &&
        (function () {
          try {
            return navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });
          } catch (e) {
            return false;
          }
        })();
      nativeShareBtn.hidden = !canShareFiles;
    }
  }

  function close() {
    overlay.hidden = true;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", close);
  BHT.onVisitedChange(function () {
    if (!modal.hidden) render();
  });

  var openBtn = document.getElementById("share-open");
  if (openBtn) openBtn.addEventListener("click", open);

  window.BHT_SHARE = { open: open, close: close };
})();
