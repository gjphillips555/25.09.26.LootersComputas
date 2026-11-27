/* PinDrop improvements overlay — loads after app.js */
(function () {
  "use strict";
  if (!window.__pindropImprove) window.__pindropImprove = true;
  else return;

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

  function $(id) { return document.getElementById(id); }

  function whenReady(fn) {
    if (window.__pindrop && window.__pindrop.map) return fn();
    var n = 0;
    var t = setInterval(function () {
      n++;
      if (window.__pindrop && window.__pindrop.map) { clearInterval(t); fn(); }
      else if (n > 80) clearInterval(t);
    }, 100);
  }

  whenReady(function () {
    var map = window.__pindrop.map;
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("pindrop.prefs.v1") || "{}") || {}; } catch (e) {}

    var btnDark = $("btnDark");
    if (btnDark) {
      if (prefs.darkMap) {
        btnDark.setAttribute("aria-pressed", "true");
        var mapEl = document.getElementById("map");
        if (mapEl) mapEl.classList.add("pd-dark");
        try { map.setStyle(STYLE_DARK); } catch (e) {}
      }
      btnDark.addEventListener("click", function () {
        prefs.darkMap = !prefs.darkMap;
        try { localStorage.setItem("pindrop.prefs.v1", JSON.stringify(prefs)); } catch (e) {}
        var url = prefs.darkMap ? STYLE_DARK : STYLE_LIGHT;
        try { map.setStyle(url); } catch (e) {}
        var mapEl = document.getElementById("map");
        if (mapEl) mapEl.classList.toggle("pd-dark", !!prefs.darkMap);
        btnDark.setAttribute("aria-pressed", String(!!prefs.darkMap));
      });
    }

    var g = $("quickTypes");
    if (g && !g.dataset.ready) {
      g.dataset.ready = "1";
      QUICK_TYPES.forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button";
        b.innerHTML = "<span>" + t.emoji + "</span> " + t.label;
        b.addEventListener("click", function () {
          var label = $("fLabel");
          var emoji = $("fEmojiCustom");
          if (label && (!label.value || QUICK_TYPES.some(function (x) { return x.label === label.value; }))) {
            label.value = t.label;
            label.dispatchEvent(new Event("input", { bubbles: true }));
          }
          if (emoji) emoji.value = t.emoji;
          var grid = $("emojiGrid");
          if (grid) {
            Array.prototype.forEach.call(grid.querySelectorAll("button"), function (btn) {
              if (btn.textContent === t.emoji) btn.click();
            });
          }
          var row = $("colorRow");
          if (row) {
            Array.prototype.forEach.call(row.querySelectorAll("button"), function (btn) {
              if ((btn.dataset.color || "").toLowerCase() === t.color.toLowerCase()) btn.click();
            });
          }
          Array.prototype.forEach.call(g.querySelectorAll("button"), function (btn) {
            btn.setAttribute("aria-selected", btn === b ? "true" : "false");
          });
        });
        g.appendChild(b);
      });
    }

    var listFilter = "active";
    function applyListFilters() {
      var ul = $("pinList");
      if (!ul) return;
      var items = ul.querySelectorAll("li:not(.empty)");
      var q = (($("listSearch") || {}).value || "").toLowerCase();
      items.forEach(function (li) {
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
    var sortBtn = $("btnSort");
    if (sortBtn) {
      sortBtn.addEventListener("click", function () {
        var on = !sortBtn.classList.contains("is-on");
        sortBtn.classList.toggle("is-on", on);
        sortBtn.textContent = on ? "Sort: nearest" : "Sort: recent";
      });
    }
    var listEl = $("list");
    if (listEl) {
      var obs = new MutationObserver(function () {
        if (!listEl.hidden) setTimeout(applyListFilters, 40);
      });
      obs.observe(listEl, { attributes: true, attributeFilter: ["hidden"] });
    }
  });
})();
