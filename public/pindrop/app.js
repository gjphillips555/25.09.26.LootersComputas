/* Siftah PinDrop — offline-first emoji map pins.
 * Map: MapLibre GL + OpenFreeMap vector tiles (offline downloads allowed by
 * OpenFreeMap ToS: ≤3,000 tiles / ≤50 MB per user-started download, ≤4 parallel).
 * Pins: localStorage on this device. Sharing: URL hash links + JSON/GeoJSON files. */
(function () {
  "use strict";

  // ---------- constants ----------
  var STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
  var TILEJSON_URL = "https://tiles.openfreemap.org/planet";
  var MAP_CACHE = "pindrop-map-v1";
  var LS_PINS = "pindrop.pins.v1";
  var LS_VIEW = "pindrop.view.v1";
  var LS_PREFS = "pindrop.prefs.v1";
  var NZ_BOUNDS = [[166.0, -47.6], [178.9, -34.1]];
  var NZ_OVERVIEW = { w: 165.8, s: -47.8, e: 179.0, n: -33.8, minz: 0, maxz: 8 };
  var MAX_TILES = 3000;
  var PARALLEL = 4;
  var FONTS = ["Noto Sans Regular", "Noto Sans Bold", "Noto Sans Italic"];
  var GLYPH_RANGES = ["0-255", "256-511", "8192-8447"];
  var EMOJIS = ["📌","📍","🔧","🔨","🪛","🧰","⚙️","🔩","📡","🚨","🚓","📷","🚗","🚚","🛻","🏍️","⚠️","🚧","⛔","📦","🎁","🔑","🗝️","🔋","💡","🔌","📱","💻","🪜","⛏️","🧱","🪵","🛢️","🏠","🏗️","🅿️","⛽","🚻","🐶","❗","❓","✅","❌","⭐","🎯","☕"];
  var COLORS = ["#000000","#e3121b","#1f9fd6","#1aa34a","#ff8a00","#8b2be2","#ffd400","#ffffff"];
  var ATTRIB = '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

  var $ = function (id) { return document.getElementById(id); };
  var hoverCapable = window.matchMedia && window.matchMedia("(hover: hover)").matches;
  var map, tileTemplate = null, markers = {}, meMarker = null, lastFix = null;
  var pins = loadPins();
  var prefs = loadJSON(LS_PREFS, {});
  var editingId = null, dropMode = null, deferredPrompt = null, pendingImport = null;

  // ---------- helpers ----------
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { toast("Storage full — export your pins"); } }
  function loadPins() { var p = loadJSON(LS_PINS, []); return Array.isArray(p) ? p.filter(validPin) : []; }
  function savePins() { saveJSON(LS_PINS, pins); var c = $("pinCount"); c.textContent = String(pins.length); c.toggleAttribute("data-zero", !pins.length); }
  function savePrefs() { saveJSON(LS_PREFS, prefs); }
  function validPin(p) { return p && typeof p.lat === "number" && typeof p.lng === "number" && isFinite(p.lat) && isFinite(p.lng); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function getPin(id) { for (var i = 0; i < pins.length; i++) if (pins[i].id === id) return pins[i]; return null; }
  var toastTimer;
  function toast(msg, ms) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2600); }
  function fmtTime(ts) { try { return new Date(ts).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return new Date(ts).toISOString(); } }
  function distKm(a, b) { var R = 6371, d2r = Math.PI / 180, dLat = (b.lat - a.lat) * d2r, dLng = (b.lng - a.lng) * d2r; var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * d2r) * Math.cos(b.lat * d2r) * Math.sin(dLng / 2) * Math.sin(dLng / 2); return 2 * R * Math.asin(Math.sqrt(h)); }
  function fmtDist(km) { return km < 1 ? Math.round(km * 1000) + " m" : (km < 10 ? km.toFixed(1) : Math.round(km)) + " km"; }
  function isLight(hex) { var h = (hex || "#000").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.72; }
  function firstGrapheme(s) { s = (s || "").trim(); if (!s) return ""; try { if (window.Intl && Intl.Segmenter) { var it = new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s)[Symbol.iterator]().next(); return it.value ? it.value.segment : s; } } catch (e) {} return Array.from(s).slice(0, 2).join(""); }
  function download(name, text, type) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function standalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true; }
  function isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); }

  // ---------- map resource cache (Cache API, main thread) ----------
  function cacheKey(url) {
    var u = new URL(url).href;
    // OpenFreeMap tile URLs carry a weekly build id; key by z/x/y so saved areas survive updates.
    return u.replace(/\/planet\/[^/]+\/(\d+\/\d+\/\d+\.pbf)$/, "/planet/_/$1");
  }
  function openCache() { return window.caches ? caches.open(MAP_CACHE) : Promise.resolve(null); }
  function fetchCached(url, opts) {
    opts = opts || {};
    var key = cacheKey(url);
    return openCache().then(function (cache) {
      var fromNet = function () {
        return fetch(url, { signal: opts.signal, mode: "cors", credentials: "omit" }).then(function (res) {
          if (res.status === 204 || res.status === 404) return new Response(new ArrayBuffer(0), { status: 200 });
          if (!res.ok) throw new Error("HTTP " + res.status);
          if (cache) cache.put(key, res.clone()).catch(function () {});
          return res;
        });
      };
      if (!cache) return fromNet();
      if (opts.networkFirst) {
        return fromNet().catch(function (err) { return cache.match(key).then(function (hit) { if (hit) return hit; throw err; }); });
      }
      return cache.match(key).then(function (hit) { return hit || fromNet(); });
    });
  }
  function hasCached(url) { return openCache().then(function (c) { return c ? c.match(cacheKey(url)).then(function (r) { return !!r; }) : false; }); }
  function toPdc(url) { return url.replace(/^https:\/\//, "pdc://"); }

  function registerProtocol() {
    maplibregl.addProtocol("pdc", function (params, abortController) {
      var real = "https://" + params.url.slice("pdc://".length);
      return fetchCached(real, { signal: abortController && abortController.signal }).then(function (res) {
        if (params.type === "json") return res.json().then(function (d) { return { data: d }; });
        if (params.type === "string") return res.text().then(function (d) { return { data: d }; });
        return res.arrayBuffer().then(function (d) { return { data: d }; });
      });
    });
  }

  function loadStyle() {
    return Promise.all([
      fetchCached(STYLE_URL, { networkFirst: true }).then(function (r) { return r.json(); }),
      fetchCached(TILEJSON_URL, { networkFirst: true }).then(function (r) { return r.json(); }),
    ]).then(function (res) {
      var style = res[0], tj = res[1];
      tileTemplate = tj.tiles[0];
      style.sources.openmaptiles = { type: "vector", tiles: tj.tiles.map(toPdc), minzoom: tj.minzoom || 0, maxzoom: tj.maxzoom || 14, bounds: tj.bounds, attribution: ATTRIB };
      Object.keys(style.sources).forEach(function (k) {
        var s = style.sources[k];
        if (s.tiles) s.tiles = s.tiles.map(toPdc);
      });
      if (typeof style.sprite === "string") style.sprite = toPdc(style.sprite);
      if (style.glyphs) style.glyphs = toPdc(style.glyphs);
      return style;
    });
  }

  // ---------- tile maths / offline download ----------
  function lon2x(lon, z) { return Math.floor(((lon + 180) / 360) * Math.pow(2, z)); }
  function lat2y(lat, z) { var r = (lat * Math.PI) / 180; return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z)); }
  function tilesFor(b, minz, maxz) {
    var out = [];
    for (var z = minz; z <= maxz; z++) {
      var n = Math.pow(2, z) - 1;
      var x0 = Math.max(0, lon2x(b.w, z)), x1 = Math.min(n, lon2x(b.e, z));
      var y0 = Math.max(0, lat2y(b.n, z)), y1 = Math.min(n, lat2y(b.s, z));
      for (var x = x0; x <= x1; x++) for (var y = y0; y <= y1; y++) out.push([z, x, y]);
    }
    return out;
  }
  function countFor(b, minz, maxz) { var c = 0; for (var z = minz; z <= maxz; z++) { var n = Math.pow(2, z) - 1; c += (Math.min(n, lon2x(b.e, z)) - Math.max(0, lon2x(b.w, z)) + 1) * (Math.min(n, lat2y(b.s, z)) - Math.max(0, lat2y(b.n, z)) + 1); } return c; }
  function planArea(b) {
    var maxz = 14;
    while (maxz > 0 && countFor(b, 0, maxz) > MAX_TILES) maxz--;
    return { b: b, minz: 0, maxz: maxz, count: countFor(b, 0, maxz) };
  }
  function supportUrls(style) {
    var urls = [STYLE_URL, TILEJSON_URL];
    var sprite = "https://tiles.openfreemap.org/sprites/ofm_f384/ofm";
    if (map && map.getStyle()) { var sp = map.getStyle().sprite; if (typeof sp === "string") sprite = sp.replace(/^pdc:\/\//, "https://"); }
    ["", "@2x"].forEach(function (r) { urls.push(sprite + r + ".json", sprite + r + ".png"); });
    FONTS.forEach(function (f) { GLYPH_RANGES.forEach(function (r) { urls.push("https://tiles.openfreemap.org/fonts/" + encodeURIComponent(f).replace(/%20/g, " ") + "/" + r + ".pbf"); }); });
    return urls;
  }
  function rasterUrls(b) {
    // Natural Earth shaded relief used by the style up to z6.
    return tilesFor(b, 0, Math.min(6, 6)).map(function (t) { return "https://tiles.openfreemap.org/natural_earth/ne2sr/" + t[0] + "/" + t[1] + "/" + t[2] + ".png"; });
  }
  var downloading = false;
  function downloadArea(plan, onProgress) {
    if (!tileTemplate) return Promise.reject(new Error("Map not ready"));
    if (downloading) return Promise.reject(new Error("A download is already running"));
    downloading = true;
    var urls = supportUrls().concat(
      tilesFor(plan.b, plan.minz, plan.maxz).map(function (t) { return tileTemplate.replace("{z}", t[0]).replace("{x}", t[1]).replace("{y}", t[2]); }),
      rasterUrls(plan.b)
    );
    var i = 0, done = 0, failed = 0, bytes = 0, total = urls.length;
    function worker() {
      if (i >= total) return Promise.resolve();
      var url = urls[i++];
      return hasCached(url).then(function (hit) {
        if (hit) return;
        return fetchCached(url).then(function (r) { return r.clone().arrayBuffer().then(function (b) { bytes += b.byteLength; }); });
      }).catch(function () { failed++; }).then(function () { done++; onProgress && onProgress(done, total, bytes); return worker(); });
    }
    var ws = []; for (var k = 0; k < PARALLEL; k++) ws.push(worker());
    return Promise.all(ws).then(function () { downloading = false; return { total: total, failed: failed, bytes: bytes }; }, function (e) { downloading = false; throw e; });
  }
  function mapCacheStats() {
    return openCache().then(function (c) { return c ? c.keys().then(function (k) { return k.length; }) : 0; }).then(function (n) {
      if (!navigator.storage || !navigator.storage.estimate) return { n: n };
      return navigator.storage.estimate().then(function (e) { return { n: n, usage: e.usage, quota: e.quota }; });
    });
  }

  // ---------- markers ----------
  function markerEl(p) {
    var el = document.createElement("div");
    el.className = "pd-marker";
    el.innerHTML = '<div class="pd-label"><span class="le"></span><span class="lt"></span></div><div class="bub"></div><div class="tip"></div><div class="dot"></div>';
    paintMarker(el, p);
    el.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (dropMode) return;
      var cur = getPin(el.dataset.id); if (!cur) return;
      if (hoverCapable || el.classList.contains("show")) { openEditor(cur.id); }
      else { clearShown(); el.classList.add("show"); }
    });
    return el;
  }
  function paintMarker(el, p) {
    el.dataset.id = p.id;
    el.querySelector(".bub").textContent = p.emoji || "📌";
    el.querySelector(".le").textContent = p.emoji || "📌";
    var lt = el.querySelector(".lt"); lt.textContent = p.label || "Pin"; lt.style.color = p.color || "#000";
    var lab = el.querySelector(".pd-label"); var light = isLight(p.color);
    lab.style.background = light ? "rgba(21,21,23,.95)" : "rgba(255,255,255,.96)";
    el.classList.toggle("collected", !!p.collected);
    el.title = (p.emoji || "📌") + " " + (p.label || "Pin");
    el.setAttribute("aria-label", el.title);
  }
  function clearShown() { var s = document.querySelectorAll(".pd-marker.show"); for (var i = 0; i < s.length; i++) s[i].classList.remove("show"); }
  function renderMarker(p) {
    var m = markers[p.id];
    if (m) { m.setLngLat([p.lng, p.lat]); paintMarker(m.getElement(), p); return; }
    m = new maplibregl.Marker({ element: markerEl(p), anchor: "bottom" }).setLngLat([p.lng, p.lat]).addTo(map);
    markers[p.id] = m;
  }
  function removeMarker(id) { if (markers[id]) { markers[id].remove(); delete markers[id]; } }
  function renderAll() { Object.keys(markers).forEach(function (id) { if (!getPin(id)) removeMarker(id); }); pins.forEach(renderMarker); savePins(); }

  // ---------- pins ----------
  function addPin(lngLat, extra) {
    var now = Date.now();
    var p = Object.assign({ id: uid(), lat: +lngLat.lat.toFixed(6), lng: +lngLat.lng.toFixed(6), emoji: prefs.lastEmoji || "📌", label: "", color: prefs.lastColor || "#000000", note: "", collected: false, created: now, updated: now }, extra || {});
    pins.push(p); savePins(); renderMarker(p);
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
    return p;
  }
  function updatePin(id, patch) { var p = getPin(id); if (!p) return; Object.assign(p, patch, { updated: Date.now() }); savePins(); renderMarker(p); return p; }
  function deletePin(id) { pins = pins.filter(function (p) { return p.id !== id; }); removeMarker(id); savePins(); }

  // ---------- editor ----------
  function buildEditorControls() {
    var grid = $("emojiGrid");
    EMOJIS.forEach(function (e) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = e; b.setAttribute("role", "option"); b.setAttribute("aria-label", "Pin emoji " + e);
      b.addEventListener("click", function () { setEmoji(e); }); grid.appendChild(b);
    });
    var row = $("colorRow");
    COLORS.forEach(function (c) {
      var b = document.createElement("button"); b.type = "button"; b.style.background = c; b.dataset.color = c; b.setAttribute("aria-label", "Text colour " + c);
      b.addEventListener("click", function () { setColor(c); }); row.appendChild(b);
    });
    var custom = document.createElement("input"); custom.type = "color"; custom.id = "fColor"; custom.title = "Custom colour"; custom.setAttribute("aria-label", "Custom text colour");
    custom.addEventListener("input", function () { setColor(custom.value); }); row.appendChild(custom);
    $("btnUseCustom").addEventListener("click", function () { var g = firstGrapheme($("fEmojiCustom").value); if (g) setEmoji(g); else toast("Type or paste an emoji first"); });
    $("fEmojiCustom").addEventListener("keydown", function (e) { if (e.key === "Enter") $("btnUseCustom").click(); });
    $("fLabel").addEventListener("input", function () { if (editingId) { updatePin(editingId, { label: $("fLabel").value }); syncPreview(); } });
    $("fNote").addEventListener("input", function () { if (editingId) updatePin(editingId, { note: $("fNote").value }); });
    $("fCollected").addEventListener("change", function () { if (editingId) updatePin(editingId, { collected: $("fCollected").checked }); });
  }
  function setEmoji(e) { if (!editingId) return; prefs.lastEmoji = e; savePrefs(); updatePin(editingId, { emoji: e }); syncPreview(); }
  function setColor(c) { if (!editingId) return; prefs.lastColor = c; savePrefs(); updatePin(editingId, { color: c }); syncPreview(); }
  function syncPreview() {
    var p = getPin(editingId); if (!p) return;
    $("pvEmoji").textContent = p.emoji || "📌";
    var pv = $("pvLabel"); pv.textContent = p.label || "Label preview"; pv.style.color = p.color || "#000";
    $("editor").querySelector(".pd-preview").style.background = isLight(p.color) ? "#151517" : "#f3f6f8";
    var bs = $("emojiGrid").children; for (var i = 0; i < bs.length; i++) bs[i].setAttribute("aria-selected", String(bs[i].textContent === p.emoji));
    var cs = $("colorRow").querySelectorAll("button"); for (var j = 0; j < cs.length; j++) cs[j].setAttribute("aria-pressed", String(cs[j].dataset.color.toLowerCase() === (p.color || "").toLowerCase()));
    $("fColor").value = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#000000";
    var meta = "📍 " + p.lat.toFixed(5) + ", " + p.lng.toFixed(5) + " · Dropped " + fmtTime(p.created);
    if (p.updated && p.updated - p.created > 60000) meta += " · Edited " + fmtTime(p.updated);
    if (lastFix) meta += " · " + fmtDist(distKm(lastFix, p)) + " away";
    $("fMeta").textContent = meta;
    $("btnNav").href = "https://www.google.com/maps/dir/?api=1&destination=" + p.lat + "," + p.lng;
    var el = markers[p.id] && markers[p.id].getElement(); clearShown(); if (el) { el.classList.add("show"); }
  }
  function openEditor(id, isNew) {
    var p = getPin(id); if (!p) return;
    closeSheets();
    editingId = id;
    $("editorTitle").textContent = isNew ? "Pin dropped 📌" : "Edit pin";
    $("fLabel").value = p.label || ""; $("fNote").value = p.note || ""; $("fCollected").checked = !!p.collected; $("fEmojiCustom").value = "";
    syncPreview();
    Object.keys(markers).forEach(function (k) { markers[k].getElement().classList.toggle("selected", k === id); });
    $("editor").hidden = false;
    if (isNew && hoverCapable) setTimeout(function () { $("fLabel").focus(); }, 50);
  }
  function closeEditor() {
    if (!editingId) { $("editor").hidden = true; return; }
    var p = getPin(editingId);
    if (p && !p.label) updatePin(editingId, { label: "" });
    Object.keys(markers).forEach(function (k) { markers[k].getElement().classList.remove("selected"); });
    editingId = null; $("editor").hidden = true;
  }
  function closeSheets() { closeEditor(); $("list").hidden = true; }

  // ---------- drop mode (crosshair) ----------
  function armDrop(mode, id) {
    closeSheets();
    dropMode = { mode: mode, id: id };
    $("crosshair").hidden = false; $("btnCancelDrop").hidden = false;
    $("btnDrop").classList.add("armed");
    $("dropText").textContent = mode === "move" ? "Move here" : "Drop here";
    showHint(mode === "move" ? "Pan the map so the crosshair is on the new spot" : "Pan so the crosshair is on the spot — or tap the map");
    if (mode === "move") { var p = getPin(id); if (p) { map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16) }); markers[id] && markers[id].getElement().classList.add("moving"); } }
  }
  function disarm() {
    if (dropMode && dropMode.mode === "move" && markers[dropMode.id]) markers[dropMode.id].getElement().classList.remove("moving");
    dropMode = null; $("crosshair").hidden = true; $("btnCancelDrop").hidden = true; $("btnDrop").classList.remove("armed"); $("dropText").textContent = "Drop pin";
    showHint(hoverCapable ? "Right-click the map to drop a pin" : "Long-press the map to drop a pin");
  }
  function commitDrop(lngLat) {
    var dm = dropMode; disarm();
    if (dm && dm.mode === "move") {
      updatePin(dm.id, { lat: +lngLat.lat.toFixed(6), lng: +lngLat.lng.toFixed(6) });
      toast("Pin moved"); openEditor(dm.id);
    } else {
      var p = addPin(lngLat); openEditor(p.id, true);
    }
  }
  var hintTimer;
  function showHint(t) { var h = $("hint"); h.textContent = t; h.style.opacity = 1; clearTimeout(hintTimer); hintTimer = setTimeout(function () { h.style.opacity = 0; }, 6000); }

  // ---------- geolocation ----------
  function locate(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error("Location isn't available on this device")); return; }
      $("btnLocate").classList.add("busy");
      navigator.geolocation.getCurrentPosition(function (pos) {
        $("btnLocate").classList.remove("busy");
        lastFix = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy };
        if (!meMarker) { var el = document.createElement("div"); el.className = "pd-me"; el.title = "You are here"; meMarker = new maplibregl.Marker({ element: el }).setLngLat([lastFix.lng, lastFix.lat]).addTo(map); }
        else meMarker.setLngLat([lastFix.lng, lastFix.lat]);
        if (opts.fly !== false) map.flyTo({ center: [lastFix.lng, lastFix.lat], zoom: opts.zoom || Math.max(map.getZoom(), 13), speed: 1.6 });
        resolve(lastFix);
      }, function (err) {
        $("btnLocate").classList.remove("busy");
        reject(new Error(err.code === 1 ? "Location permission is off — allow it in your browser settings" : "Couldn't get your location"));
      }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 });
    });
  }

  // ---------- list ----------
  function renderList() {
    var q = ($("listSearch").value || "").toLowerCase();
    var ul = $("pinList"); ul.innerHTML = "";
    var arr = pins.slice().sort(function (a, b) { return (b.updated || b.created) - (a.updated || a.created); })
      .filter(function (p) { return !q || ((p.label || "") + " " + (p.note || "") + " " + (p.emoji || "")).toLowerCase().indexOf(q) >= 0; });
    $("listCount").textContent = "(" + pins.length + ")";
    if (!arr.length) { var li = document.createElement("li"); li.className = "empty"; li.textContent = pins.length ? "No pins match" : "No pins yet — long-press the map or tap Drop pin"; ul.appendChild(li); return; }
    arr.forEach(function (p) {
      var li = document.createElement("li"); if (p.collected) li.className = "done";
      var e = document.createElement("span"); e.className = "e"; e.textContent = p.emoji || "📌";
      var t = document.createElement("span"); t.className = "t";
      var b = document.createElement("b"); b.textContent = p.label || "Pin"; b.style.color = isLight(p.color) ? "#000" : p.color;
      var s = document.createElement("small"); s.textContent = fmtTime(p.created) + (lastFix ? " · " + fmtDist(distKm(lastFix, p)) : "") + (p.collected ? " · collected ✓" : "");
      t.appendChild(b); t.appendChild(s);
      var go = document.createElement("span"); go.className = "go"; go.textContent = "View";
      li.appendChild(e); li.appendChild(t); li.appendChild(go);
      li.addEventListener("click", function () { $("list").hidden = true; map.flyTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16) }); setTimeout(function () { openEditor(p.id); }, 400); });
      ul.appendChild(li);
    });
  }
  function fitAll() {
    if (!pins.length) { map.fitBounds(NZ_BOUNDS, { padding: 20 }); return; }
    var b = new maplibregl.LngLatBounds(); pins.forEach(function (p) { b.extend([p.lng, p.lat]); });
    map.fitBounds(b, { padding: 80, maxZoom: 16 });
  }

  // ---------- share / import / export ----------
  function b64urlEncode(str) { var bytes = new TextEncoder().encode(str), bin = ""; for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function b64urlDecode(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var bin = atob(s), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
  function packPins(list) { return b64urlEncode(JSON.stringify({ v: 1, p: list.map(function (p) { return [+p.lat.toFixed(6), +p.lng.toFixed(6), p.emoji || "📌", p.label || "", p.color || "#000000", p.note || "", p.collected ? 1 : 0, p.id, p.created]; }) })); }
  function unpackPins(s) {
    var d = JSON.parse(b64urlDecode(s)); if (!d || !Array.isArray(d.p)) throw new Error("bad link");
    return d.p.map(function (a) { return { lat: +a[0], lng: +a[1], emoji: String(a[2] || "📌").slice(0, 16), label: String(a[3] || "").slice(0, 60), color: /^#[0-9a-f]{3,8}$/i.test(a[4]) ? a[4] : "#000000", note: String(a[5] || "").slice(0, 500), collected: !!a[6], id: String(a[7] || uid()).slice(0, 40), created: +a[8] || Date.now(), updated: Date.now() }; }).filter(validPin);
  }
  function shareUrl(list) { return location.origin + "/pindrop/#p=" + packPins(list); }
  function sharePins(list, title) {
    if (!list.length) { toast("No pins to share yet"); return; }
    var url = shareUrl(list);
    var text = list.length === 1 ? (list[0].emoji || "📌") + " " + (list[0].label || "Pin") + " — open in Siftah PinDrop" : list.length + " pins from Siftah PinDrop";
    if (navigator.share) { navigator.share({ title: title || "Siftah PinDrop", text: text, url: url }).catch(function () {}); return; }
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { toast("Share link copied — send it to your crew"); }, function () { window.prompt("Copy this link:", url); });
  }
  function toGeoJSON(list) {
    return { type: "FeatureCollection", features: list.map(function (p) { return { type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { id: p.id, emoji: p.emoji, label: p.label, color: p.color, note: p.note, collected: !!p.collected, created: new Date(p.created).toISOString(), updated: new Date(p.updated || p.created).toISOString() } }; }) };
  }
  function parseImportFile(text) {
    var d = JSON.parse(text), out = [];
    if (d && d.type === "FeatureCollection" && Array.isArray(d.features)) {
      d.features.forEach(function (f) { if (!f.geometry || f.geometry.type !== "Point") return; var pr = f.properties || {}; out.push({ id: String(pr.id || uid()), lng: +f.geometry.coordinates[0], lat: +f.geometry.coordinates[1], emoji: pr.emoji || "📌", label: String(pr.label || pr.name || pr.title || "").slice(0, 60), color: pr.color || "#000000", note: String(pr.note || pr.description || "").slice(0, 500), collected: !!pr.collected, created: Date.parse(pr.created) || Date.now(), updated: Date.now() }); });
    } else {
      var arr = Array.isArray(d) ? d : (d && Array.isArray(d.pins) ? d.pins : []);
      arr.forEach(function (p) { if (validPin(p)) out.push(Object.assign({ id: uid(), emoji: "📌", label: "", color: "#000000", note: "", collected: false, created: Date.now() }, p, { updated: Date.now() })); });
    }
    return out.filter(validPin);
  }
  function offerImport(list, source) {
    if (!list.length) { toast("No pins found to import"); return; }
    pendingImport = list;
    $("importText").textContent = list.length + (list.length === 1 ? " pin" : " pins") + " " + source + ". Add to your map? Pins you already have are updated, not duplicated.";
    var ul = $("importList"); ul.innerHTML = "";
    list.slice(0, 30).forEach(function (p) { var li = document.createElement("li"); li.style.cursor = "default"; var e = document.createElement("span"); e.className = "e"; e.textContent = p.emoji; var t = document.createElement("span"); t.className = "t"; var b = document.createElement("b"); b.textContent = p.label || "Pin"; t.appendChild(b); li.appendChild(e); li.appendChild(t); ul.appendChild(li); });
    $("importDlg").hidden = false;
  }
  function doImport() {
    var list = pendingImport || []; pendingImport = null; $("importDlg").hidden = true;
    var added = 0, updated = 0;
    list.forEach(function (p) { var ex = getPin(p.id); if (ex) { Object.assign(ex, p); updated++; } else { pins.push(p); added++; } });
    renderAll();
    if (list.length) { var b = new maplibregl.LngLatBounds(); list.forEach(function (p) { b.extend([p.lng, p.lat]); }); map.fitBounds(b, { padding: 80, maxZoom: 16 }); }
    toast("Imported " + added + " new" + (updated ? ", updated " + updated : "") + " 📌");
  }
  function checkHashImport() {
    var m = /[#&]p=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return;
    try { offerImport(unpackPins(m[1]), "shared with you"); } catch (e) { toast("That share link looks broken"); }
    history.replaceState(null, "", location.pathname + location.search);
  }

  // ---------- offline dialog ----------
  function viewBounds() { var b = map.getBounds(); return { w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() }; }
  var currentPlan = null;
  function openOfflineDlg() {
    closeSheets();
    currentPlan = planArea(viewBounds());
    var full = currentPlan.maxz >= 14;
    $("offlineText").textContent = "Saves the map you can see now (" + currentPlan.count + " tiles, zoom 0–" + currentPlan.maxz + ") so it works with no signal." + (full ? " Includes full street detail." : " Zoom in further to save full street detail for a smaller area.");
    $("offlineDlg").querySelector(".pd-progress").hidden = true; $("offlineBar").style.width = "0";
    $("btnOfflineGo").disabled = !navigator.onLine;
    if (!navigator.onLine) $("offlineText").textContent = "You're offline. Connect to save this area.";
    refreshStats(); $("offlineDlg").hidden = false;
  }
  function refreshStats() { mapCacheStats().then(function (s) { $("offlineStats").textContent = "Saved on this device: " + s.n + " map files" + (s.usage ? " · " + (s.usage / 1048576).toFixed(1) + " MB used" : ""); }); }
  function runDownload(plan, label) {
    var prog = $("offlineDlg").querySelector(".pd-progress");
    prog.hidden = false; $("btnOfflineGo").disabled = true; $("btnOffline").classList.add("busy");
    return downloadArea(plan, function (d, t) { $("offlineBar").style.width = Math.round((d / t) * 100) + "%"; $("offlineText").textContent = "Saving " + label + "… " + d + " / " + t; })
      .then(function (r) {
        $("offlineText").textContent = (r.failed ? "Saved with " + r.failed + " missing files (check signal and try again)." : "Saved! This area now works offline ✅");
        toast(label.charAt(0).toUpperCase() + label.slice(1) + " saved for offline ✅"); refreshStats();
      }, function (e) { $("offlineText").textContent = e.message; })
      .then(function () { $("btnOfflineGo").disabled = false; $("btnOffline").classList.remove("busy"); });
  }
  function saveNZOverview() {
    if (!navigator.onLine || prefs.nzSaved) return;
    var plan = { b: NZ_OVERVIEW, minz: NZ_OVERVIEW.minz, maxz: NZ_OVERVIEW.maxz, count: countFor(NZ_OVERVIEW, NZ_OVERVIEW.minz, NZ_OVERVIEW.maxz) };
    $("btnOffline").classList.add("busy");
    downloadArea(plan, null).then(function (r) { if (!r.failed) { prefs.nzSaved = Date.now(); savePrefs(); } toast("NZ overview map saved for offline ✅"); }, function () {}).then(function () { $("btnOffline").classList.remove("busy"); });
  }

  // ---------- install ----------
  function showInstall(force) {
    if (standalone()) return;
    if (!force && prefs.installDismissed && Date.now() - prefs.installDismissed < 3 * 864e5) return;
    if (!$("welcome").hidden) return;
    if (deferredPrompt) {
      $("installText").textContent = "Add the PinDrop button to your home screen or desktop. It opens straight to the map — even with no signal.";
      $("btnInstall").textContent = "Install"; $("installCard").hidden = false;
    } else if (isIOS()) {
      $("installText").innerHTML = "On iPhone/iPad: tap <b>Share</b> <span aria-hidden=\"true\">⬆️</span> then <b>Add to Home Screen</b> to get the PinDrop button. It works offline.";
      $("btnInstall").textContent = "Got it"; $("installCard").hidden = false;
    } else if (force) {
      $("installText").textContent = "Use your browser menu → \"Install app\" or \"Add to Home screen\" to add the PinDrop button.";
      $("btnInstall").textContent = "OK"; $("installCard").hidden = false;
    }
  }
  function updateInstallChip() { $("btnInstallTop").hidden = standalone() || !(deferredPrompt || isIOS()); }

  // ---------- network badge ----------
  function updateNet() { var on = navigator.onLine; var b = $("netBadge"); b.textContent = on ? "Online" : "Offline"; b.classList.toggle("off", !on); }

  // ---------- wire up ----------
  function wireUI() {
    buildEditorControls();
    document.querySelectorAll("[data-close]").forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.close === "editor") closeEditor(); else $(b.dataset.close).hidden = true; }); });
    $("btnSave").addEventListener("click", function () { var p = getPin(editingId); closeEditor(); if (p) toast((p.emoji || "📌") + " Saved on this device"); });
    $("btnDelete").addEventListener("click", function () { var p = getPin(editingId); if (!p) return; if (!confirm("Delete \"" + (p.label || "Pin") + "\"?")) return; var id = editingId; closeEditor(); deletePin(id); toast("Pin deleted"); });
    $("btnMove").addEventListener("click", function () { var id = editingId; if (id) armDrop("move", id); });
    $("btnSharePin").addEventListener("click", function () { var p = getPin(editingId); if (p) sharePins([p], (p.emoji || "📌") + " " + (p.label || "Pin")); });
    $("btnDrop").addEventListener("click", function () { if (dropMode) commitDrop(map.getCenter()); else armDrop("new"); });
    $("btnCancelDrop").addEventListener("click", function () { var dm = dropMode; disarm(); if (dm && dm.mode === "move") openEditor(dm.id); });
    $("btnLocate").addEventListener("click", function () { locate().catch(function (e) { toast(e.message, 4000); }); });
    $("btnDropMe").addEventListener("click", function () { locate({ zoom: Math.max(map.getZoom(), 17) }).then(function (f) { var p = addPin({ lat: f.lat, lng: f.lng }); openEditor(p.id, true); toast("Dropped at your location (±" + Math.round(f.acc) + " m)"); }).catch(function (e) { toast(e.message, 4000); }); });
    $("btnOffline").addEventListener("click", openOfflineDlg);
    $("btnOfflineGo").addEventListener("click", function () { if (currentPlan) runDownload(currentPlan, "this area"); });
    $("btnOfflineClose").addEventListener("click", function () { $("offlineDlg").hidden = true; });
    $("btnLabels").addEventListener("click", function () { prefs.labels = !prefs.labels; savePrefs(); applyLabels(); });
    $("btnList").addEventListener("click", function () { var open = $("list").hidden; closeSheets(); if (open) { renderList(); $("list").hidden = false; } });
    $("listSearch").addEventListener("input", renderList);
    $("btnShareAll").addEventListener("click", function () { var q = ($("listSearch").value || "").toLowerCase(); var list = pins.filter(function (p) { return !q || ((p.label || "") + " " + (p.note || "") + (p.emoji || "")).toLowerCase().indexOf(q) >= 0; }); sharePins(list); });
    $("btnExportJson").addEventListener("click", function () { download("pindrop-pins-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify({ app: "Siftah PinDrop", version: 1, exported: new Date().toISOString(), pins: pins }, null, 2), "application/json"); });
    $("btnExportGeo").addEventListener("click", function () { download("pindrop-pins-" + new Date().toISOString().slice(0, 10) + ".geojson", JSON.stringify(toGeoJSON(pins), null, 2), "application/geo+json"); });
    $("fileImport").addEventListener("change", function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; f.text().then(function (t) { try { offerImport(parseImportFile(t), "in " + f.name); } catch (err) { toast("Couldn't read that file"); } }); e.target.value = ""; });
    $("btnFitAll").addEventListener("click", function () { $("list").hidden = true; fitAll(); });
    $("btnImportGo").addEventListener("click", doImport);
    $("btnImportCancel").addEventListener("click", function () { pendingImport = null; $("importDlg").hidden = true; });
    $("btnWelcome").addEventListener("click", function () {
      prefs.welcomed = Date.now(); savePrefs(); $("welcome").hidden = true;
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
      saveNZOverview();
      locate({ zoom: 12 }).catch(function () {}).then(function () { setTimeout(function () { showInstall(); }, 1200); });
    });
    $("btnInstall").addEventListener("click", function () {
      $("installCard").hidden = true;
      if (!deferredPrompt) { prefs.installDismissed = Date.now(); savePrefs(); return; }
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (c) { if (c.outcome !== "accepted") { prefs.installDismissed = Date.now(); savePrefs(); } deferredPrompt = null; updateInstallChip(); });
    });
    $("btnInstallLater").addEventListener("click", function () { prefs.installDismissed = Date.now(); savePrefs(); $("installCard").hidden = true; });
    $("btnInstallTop").addEventListener("click", function () { showInstall(true); });
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; updateInstallChip(); if (prefs.welcomed) setTimeout(function () { showInstall(); }, 1500); });
    window.addEventListener("appinstalled", function () { deferredPrompt = null; $("installCard").hidden = true; updateInstallChip(); toast("PinDrop installed — look for the penguin pin on your home screen 🐧📌", 4000); });
    window.addEventListener("online", updateNet); window.addEventListener("offline", updateNet); updateNet();
    window.addEventListener("hashchange", checkHashImport);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (dropMode) disarm(); else closeSheets(); } });
    updateInstallChip();
  }
  function applyLabels() { $("map").classList.toggle("labels-on", !!prefs.labels); $("btnLabels").setAttribute("aria-pressed", String(!!prefs.labels)); }

  function wireMap() {
    var lastDrop = 0, lastDropPt = null;
    function dropAt(lngLat) {
      // A touch long-press can also raise a contextmenu event: ignore a second drop at the same spot within 900 ms.
      var pt = map.project(lngLat);
      if (Date.now() - lastDrop < 900 && lastDropPt && Math.abs(pt.x - lastDropPt.x) < 40 && Math.abs(pt.y - lastDropPt.y) < 40) return;
      lastDrop = Date.now(); lastDropPt = pt; if (dropMode) { commitDrop(lngLat); return; } var p = addPin(lngLat); openEditor(p.id, true); }
    map.on("click", function (e) {
      if (dropMode) { commitDrop(dropMode.mode === "move" ? map.getCenter() : e.lngLat); return; }
      clearShown(); if (!$("editor").hidden) closeEditor();
    });
    map.on("contextmenu", function (e) { e.preventDefault && e.preventDefault(); dropAt(e.lngLat); });
    var pressTimer = null, pressPt = null;
    function cancelPress() { clearTimeout(pressTimer); pressTimer = null; }
    map.on("touchstart", function (e) {
      if (!e.originalEvent.touches || e.originalEvent.touches.length !== 1) { cancelPress(); return; }
      pressPt = e.point; var ll = e.lngLat; cancelPress();
      pressTimer = setTimeout(function () { pressTimer = null; dropAt(ll); }, 550);
    });
    map.on("touchmove", function (e) { if (pressPt && e.point && (Math.abs(e.point.x - pressPt.x) > 10 || Math.abs(e.point.y - pressPt.y) > 10)) cancelPress(); });
    map.on("touchend", cancelPress); map.on("touchcancel", cancelPress); map.on("dragstart", cancelPress); map.on("zoomstart", cancelPress);
    map.on("moveend", function () { var c = map.getCenter(); saveJSON(LS_VIEW, { lng: +c.lng.toFixed(5), lat: +c.lat.toFixed(5), z: +map.getZoom().toFixed(2) }); });
  }

  function handleAction() {
    var a = new URLSearchParams(location.search).get("action");
    if (a === "list") { renderList(); $("list").hidden = false; }
    if (a === "drop-here") { locate({ zoom: 17 }).then(function (f) { var p = addPin({ lat: f.lat, lng: f.lng }); openEditor(p.id, true); }).catch(function (e) { toast(e.message, 4000); }); }
  }

  function start() {
    if (!window.maplibregl) { document.getElementById("map").innerHTML = '<p style="padding:24px;color:#000;font-weight:700">The map library couldn\'t load. Connect to the internet once and reopen PinDrop.</p>'; return; }
    wireUI(); applyLabels(); savePins();
    registerProtocol();
    var view = loadJSON(LS_VIEW, null);
    loadStyle().then(function (style) {
      var opts = { container: "map", style: style, attributionControl: { compact: true }, maxPitch: 0, dragRotate: false, pitchWithRotate: false, touchPitch: false };
      if (view) { opts.center = [view.lng, view.lat]; opts.zoom = view.z; } else { opts.bounds = NZ_BOUNDS; opts.fitBoundsOptions = { padding: 10 }; }
      map = new maplibregl.Map(opts);
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
      wireMap();
      map.on("load", function () {
        renderAll();
        window.__pindrop = { map: map, pins: function () { return pins; } };
        checkHashImport(); handleAction();
        if (!prefs.welcomed) { $("welcome").hidden = false; }
        else {
          showHint(hoverCapable ? "Right-click the map to drop a pin" : "Long-press the map to drop a pin");
          var askGeo = function () { locate({ fly: !view, zoom: 12 }).catch(function () {}); };
          if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: "geolocation" }).then(function (s) { if (s.state !== "denied") askGeo(); }, askGeo); else askGeo();
          if (navigator.onLine && !prefs.nzSaved) saveNZOverview();
        }
      });
    }).catch(function () {
      document.getElementById("map").innerHTML = '<div style="padding:24px;color:#151517;font-weight:700;max-width:420px">📡 The map hasn\'t been saved on this device yet. Connect to the internet and open PinDrop once — after that it works offline.</div>';
    });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("/pindrop/sw.js", { scope: "/pindrop/" }).catch(function () {}); });
    }
  }
  start();
})();
