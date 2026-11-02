/* Siftah image history + UI polish v2.1 */
(function () {
  "use strict";

  function toast(m) {
    if (typeof showToast === "function") showToast(m);
  }
  function items() {
    if (window.siftahVault) {
      var v = window.siftahVault.list();
      if (v.length) return v;
    }
    return window.siftahModes ? window.siftahModes.loadGallery() : [];
  }
  function saveItems(list) {
    if (window.siftahModes) window.siftahModes.saveGallery(list);
  }
  function rel(iso) {
    try {
      var d = Date.now() - new Date(iso).getTime();
      if (d < 60000) return "just now";
      if (d < 3600000) return Math.floor(d / 60000) + "m ago";
      if (d < 86400000) return Math.floor(d / 3600000) + "h ago";
      return Math.floor(d / 86400000) + "d ago";
    } catch (e) {
      return "";
    }
  }

  function injectCSS() {
    if (document.getElementById("histCSS")) return;
    var s = document.createElement("style");
    s.id = "histCSS";
    s.textContent =
      ".studio-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 0}" +
      ".studio-head h2{margin:0;font-size:15px;font-weight:700}" +
      ".studio-head .count{font-size:11px;color:var(--muted,#8b909a);border:1px solid var(--border,#2a2e38);border-radius:999px;padding:3px 10px;background:#12151c}" +
      ".history-label{font-size:11px;color:var(--muted,#8b909a);font-weight:600;margin:8px 0 4px}" +
      ".history-strip{display:flex;gap:8px;overflow-x:auto;padding:4px 0 8px}" +
      ".history-chip{flex:0 0 auto;width:72px;border-radius:8px;overflow:hidden;border:2px solid transparent;background:#12151c;cursor:pointer}" +
      ".history-chip:hover{border-color:var(--red,#e11d2e)}" +
      ".history-chip img{width:72px;height:72px;object-fit:cover;display:block}" +
      ".history-chip .t{font-size:9px;color:var(--muted,#8b909a);padding:2px 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".style-chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}" +
      ".style-chips button{border:1px solid var(--border,#2a2e38);background:#12151c;color:var(--muted,#8b909a);border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer}" +
      ".style-chips button:hover{border-color:var(--red,#e11d2e);color:#fff}" +
      ".gallery-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}" +
      ".gallery-toolbar input{flex:1;min-width:120px;background:#12151c;border:1px solid var(--border,#2a2e38);color:var(--text,#eee);border-radius:8px;padding:8px;font-size:12px}" +
      ".gallery-filters{display:flex;gap:4px;flex-wrap:wrap}" +
      ".gallery-filters button{border:1px solid var(--border,#2a2e38);background:#12151c;color:var(--muted,#8b909a);border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer}" +
      ".gallery-filters button.on{background:rgba(225,29,46,.2);border-color:var(--red,#e11d2e);color:#fff}" +
      ".gallery-card{position:relative}" +
      ".gallery-card .fav{position:absolute;top:6px;right:6px;width:28px;height:28px;border:none;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;cursor:pointer}" +
      ".gallery-card .fav.on{color:#f5c542}" +
      ".gallery-card .time{font-size:9px;color:var(--muted,#8b909a);padding:0 8px 4px}";
    document.head.appendChild(s);
  }

  function enhanceStudio() {
    var studio = document.getElementById("imageStudio");
    if (!studio || studio.getAttribute("data-hist") === "1") return;
    studio.setAttribute("data-hist", "1");
    injectCSS();

    if (!document.getElementById("studioHead")) {
      var head = document.createElement("div");
      head.id = "studioHead";
      head.className = "studio-head";
      head.innerHTML = "<h2>Image / Video</h2><span class=\"count\" id=\"studioGalleryCount\">0</span>";
      studio.insertBefore(head, studio.firstChild);
    }

    studio.querySelectorAll(".studio-tabs button").forEach(function (b) {
      if ((b.textContent || "").indexOf("Gallery") !== -1) b.textContent = "History";
    });

    var paneCreate = document.getElementById("paneCreate");
    if (paneCreate && !document.getElementById("createStyleChips")) {
      var prompt = document.getElementById("studioCreatePrompt");
      if (prompt) {
        var chips = document.createElement("div");
        chips.id = "createStyleChips";
        chips.className = "style-chips";
        [
          ["Cinematic", ", cinematic lighting, film still"],
          ["Anime", ", anime style, vibrant"],
          ["Photo", ", photorealistic, detailed"],
          ["Oil", ", oil painting, textured"],
          ["Cyber", ", cyberpunk neon night"],
          ["Minimal", ", minimal soft background"]
        ].forEach(function (p) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = p[0];
          btn.onclick = function () {
            var v = prompt.value.trim();
            prompt.value = (v || "a scene") + p[1];
            prompt.focus();
          };
          chips.appendChild(btn);
        });
        prompt.parentNode.insertBefore(chips, prompt.nextSibling);
      }
      var lab = document.createElement("div");
      lab.className = "history-label";
      lab.textContent = "Recent history";
      var strip = document.createElement("div");
      strip.id = "createHistoryStrip";
      strip.className = "history-strip";
      paneCreate.appendChild(lab);
      paneCreate.appendChild(strip);
    }

    var paneEdit = document.getElementById("paneEdit");
    if (paneEdit && !document.getElementById("editHistoryStrip")) {
      var lab2 = document.createElement("div");
      lab2.className = "history-label";
      lab2.textContent = "Pick from history";
      var strip2 = document.createElement("div");
      strip2.id = "editHistoryStrip";
      strip2.className = "history-strip";
      paneEdit.appendChild(lab2);
      paneEdit.appendChild(strip2);
    }

    var paneGal = document.getElementById("paneGallery");
    if (paneGal && !document.getElementById("gallerySearch")) {
      var tb = document.createElement("div");
      tb.className = "gallery-toolbar";
      tb.innerHTML =
        '<input type="search" id="gallerySearch" placeholder="Search prompts\u2026">' +
        '<div class="gallery-filters">' +
        '<button type="button" data-f="all" class="on">All</button>' +
        '<button type="button" data-f="t2i">Created</button>' +
        '<button type="button" data-f="i2i">Edited</button>' +
        '<button type="button" data-f="fav">\u2605 Fav</button></div>';
      var grid = document.getElementById("galleryGrid");
      if (grid) paneGal.insertBefore(tb, grid);
      else paneGal.insertBefore(tb, paneGal.firstChild);

      window.__galFilter = "all";
      window.__galQuery = "";
      document.getElementById("gallerySearch").oninput = function (e) {
        window.__galQuery = (e.target.value || "").toLowerCase();
        renderAll();
      };
      tb.querySelectorAll(".gallery-filters button").forEach(function (b) {
        b.onclick = function () {
          window.__galFilter = b.getAttribute("data-f");
          tb.querySelectorAll("button").forEach(function (x) {
            x.classList.toggle("on", x === b);
          });
          renderAll();
        };
      });
    }

    studio.querySelectorAll(".studio-tabs button").forEach(function (btn) {
      var prev = btn.onclick;
      btn.onclick = function (e) {
        if (prev) prev.call(this, e);
        setTimeout(renderAll, 50);
      };
    });

    if (window.siftahModes && !window.siftahModes.__histPatch) {
      window.siftahModes.addToGallery = function (dataUrl, prompt, kind) {
        if (window.siftahVault && dataUrl) {
          fetch(dataUrl).then(function (r) { return r.blob(); }).then(function (b) {
            return window.siftahVault.add(b, {
              kind: kind || "t2i",
              prompt: prompt || "",
              name: "siftah-" + Date.now() + ".png",
              mime: b.type || "image/png"
            });
          }).catch(function () {});
          return;
        }
        var list = window.siftahModes.loadGallery();
        list.unshift({
          id: "g" + Date.now(),
          prompt: prompt || "",
          dataUrl: dataUrl,
          kind: kind || "t2i",
          fav: false,
          created: new Date().toISOString()
        });
        if (list.length > 60) list = list.slice(0, 60);
        window.siftahModes.saveGallery(list);
        if (window.siftahModesStudio && window.siftahModesStudio.renderGallery) {
          try { window.siftahModesStudio.renderGallery(); } catch (e) {}
        }
        renderAll();
      };
      window.siftahModes.__histPatch = true;
    }

    renderAll();
  }

  function renderStrips() {
    renderStrip("createHistoryStrip", "create");
    renderStrip("editHistoryStrip", "edit");
    var c = document.getElementById("studioGalleryCount");
    if (c) {
      var n = items().length;
      c.textContent = n + " saved";
    }
  }

  function loadIntoEdit(item) {
    var src = (window.siftahVault && item.id) ? window.siftahVault.get(item.id) : fetch(item.dataUrl).then(function (r) { return r.blob(); });
    Promise.resolve(src).then(function (b) {
      if (!b) return;
      var thumb = document.getElementById("studioEditThumb");
      var url = URL.createObjectURL(b);
      if (thumb) {
        thumb.src = url;
        thumb.style.display = "block";
      }
      try {
        var dt = new DataTransfer();
        dt.items.add(new File([b], "history.png", { type: b.type || "image/png" }));
        var inp = document.getElementById("studioEditFile");
        if (inp) {
          inp.files = dt.files;
          inp.dispatchEvent(new Event("change"));
        }
      } catch (err) {}
      toast("Loaded into Edit");
      document.querySelectorAll(".studio-tabs button").forEach(function (btn) {
        if ((btn.getAttribute("data-pane") || "") === "edit") btn.click();
      });
    });
  }

  function renderStrip(id, mode) {
    var host = document.getElementById(id);
    if (!host) return;
    var list = items().filter(function (item) {
      var k = item.kind || "";
      return k !== "video" && k !== "file" && (item.dataUrl || item.thumb);
    }).slice(0, 24);
    if (!list.length) {
      host.innerHTML = '<div class="t" style="padding:6px">No history yet</div>';
      return;
    }
    host.innerHTML = "";
    list.forEach(function (item) {
      var chip = document.createElement("div");
      chip.className = "history-chip";
      chip.title = (item.prompt || "") + " \u00b7 " + rel(item.created);
      chip.innerHTML = '<img src="' + item.dataUrl + '" alt=""><div class="t">' + rel(item.created) + "</div>";
      chip.onclick = function () {
        if (mode === "edit") loadIntoEdit(item);
        else {
          var ta = document.getElementById("studioCreatePrompt");
          if (ta && item.prompt) ta.value = item.prompt;
          var prev = document.getElementById("studioCreatePreview");
          if (prev) prev.innerHTML = '<img src="' + item.dataUrl + '" alt="">';
          var act = document.getElementById("studioCreateActions");
          if (act) act.style.display = "flex";
          toast("Loaded from history");
        }
      };
      host.appendChild(chip);
    });
  }

  function enhanceGalleryCards() {
    if (!window.siftahModesStudio || window.siftahModesStudio.__histGal) return;
    var orig = window.siftahModesStudio.renderGallery;
    if (typeof orig !== "function") return;
    window.siftahModesStudio.renderGallery = function () {
      orig.apply(this, arguments);
      if (window.siftahVault) return;
      var grid = document.getElementById("galleryGrid");
      if (!grid) return;
      var f = window.__galFilter || "all";
      var q = window.__galQuery || "";
      var list = items();
      if (f !== "all" || q) {
        var filtered = list.filter(function (item) {
          if (f === "t2i" && item.kind !== "t2i") return false;
          if (f === "i2i" && item.kind !== "i2i") return false;
          if (f === "fav" && !item.fav) return false;
          if (q) {
            var hay = ((item.prompt || "") + " " + (item.kind || "")).toLowerCase();
            if (hay.indexOf(q) === -1) return false;
          }
          return true;
        });
        if (!filtered.length) {
          grid.innerHTML = '<div class="gallery-empty">No matching images in history.</div>';
          return;
        }
        grid.innerHTML = "";
        filtered.forEach(function (item) {
          var card = document.createElement("div");
          card.className = "gallery-card";
          card.innerHTML =
            '<button type="button" class="fav' + (item.fav ? " on" : "") + '">' + (item.fav ? "\u2605" : "\u2606") + "</button>" +
            '<img src="' + item.dataUrl + '" alt="">' +
            '<div class="meta">' + (item.prompt || item.kind || "image") + "</div>" +
            '<div class="time">' + rel(item.created) + "</div>" +
            '<div class="g-actions">' +
            '<button type="button" data-a="view">View</button>' +
            '<button type="button" data-a="edit">Edit</button>' +
            '<button type="button" data-a="dl">Save</button>' +
            '<button type="button" data-a="del">Del</button></div>';
          card.querySelector(".fav").onclick = function (e) {
            e.stopPropagation();
            var next = items().map(function (x) {
              if (x.id === item.id) x.fav = !x.fav;
              return x;
            });
            saveItems(next);
            renderAll();
          };
          card.querySelector('[data-a="view"]').onclick = function () {
            var lb = document.getElementById("siftahLightbox");
            var img = document.getElementById("lbImg");
            if (img) img.src = item.dataUrl;
            if (lb) lb.classList.add("on");
          };
          card.querySelector('[data-a="edit"]').onclick = function () { loadIntoEdit(item); };
          card.querySelector('[data-a="dl"]').onclick = function () {
            var a = document.createElement("a");
            a.href = item.dataUrl;
            a.download = "siftah-" + item.id + ".png";
            a.click();
          };
          card.querySelector('[data-a="del"]').onclick = function () {
            saveItems(items().filter(function (x) { return x.id !== item.id; }));
            renderAll();
          };
          grid.appendChild(card);
        });
      } else {
        var cards = grid.querySelectorAll(".gallery-card");
        list.forEach(function (item, i) {
          var card = cards[i];
          if (!card) return;
          if (!card.querySelector(".fav")) {
            var fav = document.createElement("button");
            fav.type = "button";
            fav.className = "fav" + (item.fav ? " on" : "");
            fav.textContent = item.fav ? "\u2605" : "\u2606";
            fav.onclick = function (e) {
              e.stopPropagation();
              var next = items().map(function (x) {
                if (x.id === item.id) x.fav = !x.fav;
                return x;
              });
              saveItems(next);
              renderAll();
            };
            card.insertBefore(fav, card.firstChild);
          }
          if (!card.querySelector(".time")) {
            var t = document.createElement("div");
            t.className = "time";
            t.textContent = rel(item.created);
            var meta = card.querySelector(".meta");
            if (meta) meta.after(t);
            else card.appendChild(t);
          }
        });
      }
    };
    window.siftahModesStudio.__histGal = true;
  }

  function renderAll() {
    enhanceStudio();
    enhanceGalleryCards();
    renderStrips();
    if (window.siftahModesStudio && window.siftahModesStudio.renderGallery) {
      try { window.siftahModesStudio.renderGallery(); } catch (e) {}
    }
  }

  function boot() {
    injectCSS();
    if (document.body.classList.contains("mode-images")) renderAll();
    var obs = new MutationObserver(function () {
      if (document.body.classList.contains("mode-images")) setTimeout(renderAll, 100);
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    setTimeout(renderAll, 600);
    setTimeout(renderAll, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 250); });
  else setTimeout(boot, 250);
})();
