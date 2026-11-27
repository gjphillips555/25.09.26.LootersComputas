/* PinDrop improve v3 — drag pins via pointer + keep tip on geo point */
(function () {
  "use strict";
  if (window.__pindropImprove3) return;
  window.__pindropImprove3 = true;

  var STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
  var STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
  var QUICK_TYPES = [
    { id: "radar", emoji: "🚨", label: "Speed radar", color: "#e3121b" },
    { id: "tool", emoji: "🔧", label: "Tool", color: "#ff8a00" },
    { id: "gear", emoji: "🧰", label: "Gear pickup", color: "#1f9fd6" },
    { id: "hazard", emoji: "⚠️", label: "Hazard", color: "#ffd400" },
    { id: "meet", emoji: "📍", label: "Meet here", color: "#1aa34a" },
    { id: "park", emoji: "🅿️", label: "Parking", color: "#8b2be2" }
  ];
  var LS_PINS = "pindrop.pins.v1";

  function $(id) { return document.getElementById(id); }
  function loadPins() {
    try {
      var p = JSON.parse(localStorage.getItem(LS_PINS) || "[]");
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }
  function savePins(pins) {
    try { localStorage.setItem(LS_PINS, JSON.stringify(pins)); } catch (e) {}
    var c = $("pinCount");
    if (c) { c.textContent = String(pins.length); c.toggleAttribute("data-zero", !pins.length); }
  }

  function whenReady(fn) {
    if (window.__pindrop && window.__pindrop.map) return fn();
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (window.__pindrop && window.__pindrop.map) { clearInterval(t); fn(); }
      else if (n > 120) clearInterval(t);
    }, 80);
  }

  function getMarkerRoot(el) {
    // MapLibre wraps custom elements; the positioned node is the parent with transform
    var n = el;
    while (n && n.parentElement && n.parentElement !== map.getContainer()) {
      if (n.parentElement.classList && n.parentElement.classList.contains("maplibregl-marker"))
        return n.parentElement;
      // In recent MapLibre, the element itself is the marker root
      if (n.classList && n.classList.contains("maplibregl-marker")) return n;
      n = n.parentElement;
    }
    return el;
  }

  var map;

  function enableDragOnMarker(el) {
    if (el.dataset.dragBound) return;
    el.dataset.dragBound = "1";
    el.style.cursor = "grab";

    // Wrap visual parts so filters don't affect anchor
    if (!el.querySelector(".pin-body")) {
      var bub = el.querySelector(".bub");
      var tip = el.querySelector(".tip");
      var dot = el.querySelector(".dot");
      if (bub || tip) {
        var body = document.createElement("div");
        body.className = "pin-body";
        if (bub) body.appendChild(bub);
        if (tip) body.appendChild(tip);
        if (dot) body.appendChild(dot);
        el.appendChild(body);
      }
    }

    var dragging = false;
    var moved = false;
    var pid = null;

    function onDown(ev) {
      if (ev.button != null && ev.button !== 0) return;
      pid = el.dataset.id;
      if (!pid) return;
      dragging = true;
      moved = false;
      el.classList.add("dragging");
      el.classList.add("show");
      el.style.cursor = "grabbing";
      try { map.dragPan.disable(); } catch (e) {}
      ev.preventDefault();
      ev.stopPropagation();
    }
    function onMove(ev) {
      if (!dragging) return;
      moved = true;
      var pt = ev.touches && ev.touches[0]
        ? [ev.touches[0].clientX, ev.touches[0].clientY]
        : [ev.clientX, ev.clientY];
      var rect = map.getCanvas().getBoundingClientRect();
      var x = pt[0] - rect.left;
      var y = pt[1] - rect.top;
      var ll = map.unproject([x, y]);
      // Position the maplibre marker wrapper if present
      var root = el.classList.contains("maplibregl-marker") ? el : (el.closest && el.closest(".maplibregl-marker")) || el;
      // Prefer updating via MapLibre if the element is managed — set style transform through unproject+project
      var pixel = map.project(ll);
      // Marker anchor bottom: left = x, top = y - height
      var h = el.offsetHeight || 56;
      var w = el.offsetWidth || 44;
      if (root && root.style) {
        root.style.transform = "translate(" + (pixel.x - w / 2) + "px, " + (pixel.y - h) + "px)";
      }
      el._dragLngLat = { lng: ll.lng, lat: ll.lat };
      ev.preventDefault();
    }
    function onUp(ev) {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("dragging");
      el.style.cursor = "grab";
      try { map.dragPan.enable(); } catch (e) {}
      if (moved && el._dragLngLat && pid) {
        var pins = loadPins();
        var found = false;
        for (var i = 0; i < pins.length; i++) {
          if (pins[i].id === pid) {
            pins[i].lat = +el._dragLngLat.lat.toFixed(6);
            pins[i].lng = +el._dragLngLat.lng.toFixed(6);
            pins[i].updated = Date.now();
            found = true;
            break;
          }
        }
        if (found) {
          savePins(pins);
          // Sync core app pin list if exposed
          try {
            var core = window.__pindrop.pins();
            if (Array.isArray(core)) {
              for (var j = 0; j < core.length; j++) {
                if (core[j].id === pid) {
                  core[j].lat = pins.find(function (p) { return p.id === pid; }).lat;
                  core[j].lng = pins.find(function (p) { return p.id === pid; }).lng;
                  core[j].updated = Date.now();
                  break;
                }
              }
            }
          } catch (e) {}
          var toast = $("toast");
          if (toast) {
            toast.textContent = "Pin moved";
            toast.hidden = false;
            setTimeout(function () { toast.hidden = true; }, 2000);
          }
        }
      }
      // Suppress click after drag
      if (moved) {
        el.dataset.skipClick = "1";
        setTimeout(function () { delete el.dataset.skipClick; }, 300);
      }
    }

    el.addEventListener("mousedown", onDown);
    el.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);

    el.addEventListener("click", function (ev) {
      if (el.dataset.skipClick) {
        ev.stopPropagation();
        ev.preventDefault();
      }
    }, true);
  }

  function bindAll() {
    document.querySelectorAll(".pd-marker").forEach(enableDragOnMarker);
  }

  whenReady(function () {
    map = window.__pindrop.map;
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("pindrop.prefs.v1") || "{}") || {}; } catch (e) {}

    bindAll();
    // Observe new pins
    var mapEl = document.getElementById("map");
    if (mapEl) {
      new MutationObserver(function () { bindAll(); }).observe(mapEl, { childList: true, subtree: true });
    }

    // Dark map
    var btnDark = $("btnDark");
    if (btnDark) {
      if (prefs.darkMap) {
        btnDark.setAttribute("aria-pressed", "true");
        if (mapEl) mapEl.classList.add("pd-dark");
        try { map.setStyle(STYLE_DARK); } catch (e) {}
      }
      btnDark.addEventListener("click", function () {
        prefs.darkMap = !prefs.darkMap;
        try { localStorage.setItem("pindrop.prefs.v1", JSON.stringify(prefs)); } catch (e) {}
        try { map.setStyle(prefs.darkMap ? STYLE_DARK : STYLE_LIGHT); } catch (e) {}
        if (mapEl) mapEl.classList.toggle("pd-dark", !!prefs.darkMap);
        btnDark.setAttribute("aria-pressed", String(!!prefs.darkMap));
      });
    }

    // Quick types
    var g = $("quickTypes");
    if (g && !g.dataset.ready) {
      g.dataset.ready = "1";
      QUICK_TYPES.forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = "<span>" + t.emoji + "</span> " + t.label;
        b.addEventListener("click", function () {
          var label = $("fLabel");
          if (label && (!label.value || QUICK_TYPES.some(function (x) { return x.label === label.value; }))) {
            label.value = t.label;
            label.dispatchEvent(new Event("input", { bubbles: true }));
          }
          var grid = $("emojiGrid");
          if (grid) Array.prototype.forEach.call(grid.querySelectorAll("button"), function (btn) {
            if (btn.textContent === t.emoji) btn.click();
          });
          var row = $("colorRow");
          if (row) Array.prototype.forEach.call(row.querySelectorAll("button"), function (btn) {
            if ((btn.dataset.color || "").toLowerCase() === t.color.toLowerCase()) btn.click();
          });
          Array.prototype.forEach.call(g.querySelectorAll("button"), function (btn) {
            btn.setAttribute("aria-selected", btn === b ? "true" : "false");
          });
        });
        g.appendChild(b);
      });
    }

    // List filters
    var listFilter = "active";
    function applyListFilters() {
      var ul = $("pinList");
      if (!ul) return;
      var q = (($("listSearch") || {}).value || "").toLowerCase();
      ul.querySelectorAll("li:not(.empty)").forEach(function (li) {
        var done = li.classList.contains("done");
        var text = (li.textContent || "").toLowerCase();
        var show = true;
        if (listFilter === "active" && done) show = false;
        if (listFilter === "collected" && !done) show = false;
        if (q && text.indexOf(q) < 0) show = false;
        li.style.display = show ? "" : "none";
      });
      document.querySelectorAll(".pd-filter").forEach(function (btn) {
        var on = btn.getAttribute("data-filter") === listFilter;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    }
    document.querySelectorAll(".pd-filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        listFilter = btn.getAttribute("data-filter") || "active";
        applyListFilters();
      });
    });
    var listEl = $("list");
    if (listEl) {
      new MutationObserver(function () {
        if (!listEl.hidden) setTimeout(applyListFilters, 40);
      }).observe(listEl, { attributes: true, attributeFilter: ["hidden"] });
    }
  });
})();
