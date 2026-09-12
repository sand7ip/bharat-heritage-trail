(function () {
  "use strict";

  var overlay = document.getElementById("share-overlay");
  var modal = document.getElementById("share-modal");
  var canvas = document.getElementById("share-canvas");
  var closeBtn = document.getElementById("share-close");
  var downloadBtn = document.getElementById("share-download");
  var whatsappBtn = document.getElementById("share-whatsapp");
  var facebookBtn = document.getElementById("share-facebook");
  var instagramBtn = document.getElementById("share-instagram");
  var noteEl = document.getElementById("share-note");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var SITE_URL = "https://YOUR-DOMAIN-HERE.example/";

  // The one master logo (assets/img/logo.png) drawn everywhere the brand
  // mark appears -- same file the favicon/apple-touch-icon/og-image are
  // generated from, so there's only ever one visual source of truth.
  var logoImg = new Image();
  var logoLoaded = false;
  logoImg.onload = function () {
    logoLoaded = true;
    if (!modal.hidden) render();
  };
  logoImg.src = "assets/img/logo.png";

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

  // Exactly the favicon/topbar mark: solid accent badge, inset cream ring,
  // cream tiered-spire silhouette. Same composition and proportions
  // everywhere the brand mark appears (favicon, apple-touch-icon,
  // og-image, topbar, this card) -- no separate "stamp with rays" variant.
  function render() {
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    roundRect(28, 28, W - 56, H - 56, 4);
    ctx.stroke();

    // Header: logo + wordmark
    if (logoLoaded) ctx.drawImage(logoImg, 62, 82, 96, 96);
    ctx.fillStyle = INK;
    ctx.font = "700 30px Georgia, serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Bharat Heritage Trail", 178, 122);
    ctx.fillStyle = MUTED;
    ctx.font = "20px -apple-system, Helvetica, Arial, sans-serif";
    ctx.fillText("My heritage passport", 178, 152);

    // India outline with dots for visited sites -- as large as the header
    // and stats block leave room for, filling nearly the whole card
    var bounds = outlineBounds();
    var mapBox = { x: 60, y: 205, w: W - 120, h: 615 };
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
      ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
      ctx.fillStyle = SUCCESS;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = BG;
      ctx.stroke();
    });

    // Stats -- UNESCO, Jyotirlinga and Char Dham each shown separately
    var counts = BHT.counts();
    var statsY = 862;
    var rowGap = 62;
    ctx.textBaseline = "alphabetic";

    var rows = [
      [counts.unescoDone, counts.unescoTotal, "UNESCO"],
      [counts.jyotirlingaDone, counts.jyotirlingaTotal, "Jyotirlinga"],
      [counts.chardhamDone, counts.chardhamTotal, "Char Dham"],
    ];
    rows.forEach(function (row, i) {
      var y = statsY + i * rowGap;
      ctx.font = "700 46px -apple-system, Helvetica, Arial, sans-serif";
      ctx.fillStyle = ACCENT;
      ctx.fillText(String(row[0]), 90, y);
      var w = ctx.measureText(String(row[0])).width;
      ctx.font = "400 24px -apple-system, Helvetica, Arial, sans-serif";
      ctx.fillStyle = MUTED;
      ctx.fillText("/" + row[1] + " " + row[2], 90 + w + 8, y);
    });

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

  function downloadImage() {
    return toBlob().then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "bharat-heritage-trail.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });
  }

  function shareText() {
    var c = BHT.counts();
    var total = c.unescoDone + c.pilgrimDone;
    return (
      "I've marked " + total + " of 60 heritage & pilgrimage sites in India on Bharat Heritage Trail! " + SITE_URL
    );
  }

  function canShareFiles() {
    if (!navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [new File([], "x.png", { type: "image/png" })] });
    } catch (e) {
      return false;
    }
  }

  function showNote(text) {
    noteEl.textContent = text;
    noteEl.hidden = false;
  }

  downloadBtn.addEventListener("click", downloadImage);

  // WhatsApp and Facebook have no web API that accepts an arbitrary image
  // file -- WhatsApp's web intent only pre-fills text, and Facebook's
  // sharer only reads a URL's own og:image. Both open honestly as link
  // shares; Instagram has no web intent at all, so it goes through the
  // native share sheet (which does carry the actual image) where supported,
  // and otherwise falls back to a plain download with instructions.
  whatsappBtn.addEventListener("click", function () {
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText()), "_blank", "noopener");
  });

  facebookBtn.addEventListener("click", function () {
    window.open(
      "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(SITE_URL),
      "_blank",
      "noopener"
    );
    showNote("Facebook shares your link. Save the image above first if you want to attach it to the post.");
  });

  instagramBtn.addEventListener("click", async function () {
    if (canShareFiles()) {
      var blob = await toBlob();
      var file = new File([blob], "bharat-heritage-trail.png", { type: "image/png" });
      try {
        await navigator.share({ files: [file], title: "Bharat Heritage Trail", text: "My heritage passport so far." });
      } catch (e) {
        /* user cancelled the share sheet -- no-op */
      }
    } else {
      await downloadImage();
      showNote("Image saved — open Instagram and share it from your gallery.");
    }
  });

  function open() {
    render();
    noteEl.hidden = true;
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
  BHT.onVisitedChange(function () {
    if (!modal.hidden) render();
  });

  var openBtn = document.getElementById("share-open");
  if (openBtn) openBtn.addEventListener("click", open);

  window.BHT_SHARE = { open: open, close: close };
})();
