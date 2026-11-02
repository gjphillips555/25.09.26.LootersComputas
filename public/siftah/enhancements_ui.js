/* Siftah enhancements UI v1.8 */
(function () {
  "use strict";
  function E() { return window.siftahEnh; }
  function injectCSS() {
    if (document.getElementById("enhCSS")) return;
    var s = document.createElement("style");
    s.id = "enhCSS";
    s.textContent =
      ".model-pick{display:flex;align-items:center;gap:6px;flex-wrap:wrap;max-width:100%}" +
      ".model-pick select{max-width:min(280px,70vw);background:#12151c;color:var(--text);border:1px solid var(--border);border-radius:8px;padding:4px 8px;font-size:11px}" +
      ".model-pick .model-blurb{font-size:10px;color:var(--muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".ablit-toggle,.source-toggle{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:999px;overflow:hidden;font-size:10px;font-weight:600}" +
      ".ablit-toggle button,.source-toggle button{border:none;background:transparent;color:var(--muted);padding:4px 9px;cursor:pointer;font-size:10px;font-weight:600}" +
      ".ablit-toggle button.on{background:rgba(225,29,46,0.25);color:#fff}" +
      ".ablit-toggle button#btnFull.on{background:rgba(80,140,255,0.25);color:#fff}" +
      ".source-toggle button.on{background:rgba(225,29,46,0.22);color:#fff}" +
      ".source-toggle button#btnLocal.on{background:rgba(46,180,100,0.28);color:#fff}" +
      ".composer-tools{display:flex;gap:6px;padding:0 10px 6px;align-items:center}" +
      ".composer-tools button{background:#12151c;border:1px solid var(--border);color:var(--text);border-radius:8px;padding:4px 10px;font-size:11px;cursor:pointer}" +
      ".composer-tools button:hover{border-color:var(--red);color:var(--red)}" +
      ".composer-tools button#stopGen{display:none;border-color:var(--red);color:var(--red)}" +
      ".composer-tools button#stopGen.show{display:inline-flex}" +
      ".local-settings{margin-top:8px;padding:10px;border:1px solid var(--border);border-radius:10px;background:#0c0e12}" +
      ".local-settings label{display:block;font-size:11px;color:var(--muted);margin:6px 0 3px}" +
      ".local-settings input{width:100%;box-sizing:border-box;background:#12151c;border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px;font-size:12px}" +
      ".sheet-body:not(.show-advanced) .siftah-advanced{display:none}" +
      ".sheet-body:not(.show-advanced) #model,.sheet-body:not(.show-advanced) #model+.hint{display:none}";
    document.head.appendChild(s);
  }
  function renderModelBar() {
    var enh = E(); if (!enh) return;
    var bar = document.querySelector(".model-bar .model-info"); if (!bar) return;
    var host = document.getElementById("modelPickHost");
    if (!host) { host = document.createElement("div"); host.id = "modelPickHost"; host.className = "model-pick"; bar.parentNode.insertBefore(host, bar.nextSibling); }
    var local = enh.isLocal(), ablit = enh.isAbliterated(), p = enh.activePreset();
    host.innerHTML =
      '<div class="source-toggle" title="Cloud = Hugging Face \u00b7 Local = Ollama / LM Studio">' +
      '<button type="button" id="btnCloud"' + (!local ? ' class="on"' : "") + ">Cloud</button>" +
      '<button type="button" id="btnLocal"' + (local ? ' class="on"' : "") + ">Local</button></div>" +
      (local
        ? '<span class="model-blurb" id="modelBlurb"></span>'
        : '<select id="modelPreset"></select><div class="ablit-toggle">' +
          '<button type="button" id="btnAblit"' + (ablit ? ' class="on"' : "") + ">Uncensored</button>" +
          '<button type="button" id="btnFull"' + (!ablit ? ' class="on"' : "") + ">Full</button></div>" +
          '<span class="model-blurb" id="modelBlurb"></span>');
    if (local) host.querySelector("#modelBlurb").textContent = "Local \u00b7 " + enh.localModel();
    else {
      var sel = host.querySelector("#modelPreset");
      enh.PRESETS.forEach(function (pr) {
        var o = document.createElement("option"); o.value = pr.id;
        o.textContent = pr.short + (pr.id === "coder" ? " \u2605" : "");
        if (pr.id === p.id) o.selected = true; sel.appendChild(o);
      });
      host.querySelector("#modelBlurb").textContent = ablit ? p.blurbAblit : p.blurbFull;
      sel.onchange = function () {
        enh.setPresetId(sel.value);
        var pr = enh.PRESETS.find(function (x) { return x.id === sel.value; }) || enh.PRESETS[0];
        enh.setModel(enh.modelForPreset(pr), true);
        enh.toast(pr.short + " \u00b7 " + (enh.isAbliterated() ? "Uncensored" : "Full"));
      };
      host.querySelector("#btnAblit").onclick = function () { enh.setAbliterated(true); enh.toast("Uncensored"); };
      host.querySelector("#btnFull").onclick = function () { enh.setAbliterated(false); enh.toast("Full (standard)"); };
    }
    host.querySelector("#btnCloud").onclick = function () { enh.setSource("cloud"); enh.toast("Cloud \u00b7 Hugging Face"); };
    host.querySelector("#btnLocal").onclick = function () { enh.setSource("local"); enh.toast("Local \u00b7 " + enh.localBase()); };
    var inp = document.getElementById("model"); if (inp) inp.value = enh.currentModel();
  }
  function wireSettings() {
    var enh = E(); if (!enh) return;
    var field = document.getElementById("model"); if (!field || field.__presets) return;
    field.__presets = true;
    var wrap = document.createElement("div"); wrap.id = "enhSettingsWrap"; wrap.style.marginBottom = "8px";
    wrap.innerHTML =
      '<label style="font-size:12px;color:var(--muted)">Source</label>' +
      '<div class="source-toggle" style="margin:6px 0 10px"><button type="button" id="setBtnCloud">Cloud</button><button type="button" id="setBtnLocal">Local</button></div>' +
      '<div id="cloudSettingsBlock"><label style="font-size:12px;color:var(--muted)">Quick pick</label>' +
      '<select id="settingsModelPreset" style="width:100%;margin-top:4px;background:#0c0e12;color:var(--text);border:1px solid var(--border);border-radius:8px;padding:8px"></select>' +
      '<div style="margin-top:8px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--muted)">Weights</span>' +
      '<div class="ablit-toggle"><button type="button" id="setBtnAblit">Uncensored</button><button type="button" id="setBtnFull">Full</button></div></div></div>' +
      '<div class="local-settings" id="localSettingsBlock" style="display:none">' +
      "<label>Local API base (OpenAI-compatible)</label><input id=\"localBaseInput\" placeholder=\"http://127.0.0.1:11434/v1\" />" +
      "<label>Local model name</label><input id=\"localModelInput\" placeholder=\"llama3.2 or qwen2.5-coder\" />" +
      "<label>Local API key (optional)</label><input id=\"localKeyInput\" type=\"password\" placeholder=\"Usually empty for Ollama\" />" +
      '<div style="margin-top:6px;font-size:11px;color:var(--muted)">Ollama: OLLAMA_ORIGINS=* then ollama serve. LM Studio: enable CORS. Needs /v1/chat/completions.</div></div>';
    field.parentNode.insertBefore(wrap, field);
    var sel = wrap.querySelector("#settingsModelPreset");
    enh.PRESETS.forEach(function (pr) { var o = document.createElement("option"); o.value = pr.id; o.textContent = pr.label; sel.appendChild(o); });
    sel.value = enh.activePresetId();
    function fillLocal() {
      wrap.querySelector("#localBaseInput").value = enh.localBase();
      wrap.querySelector("#localModelInput").value = enh.localModel();
      wrap.querySelector("#localKeyInput").value = enh.localKey();
    }
    function sync() {
      var local = enh.isLocal();
      wrap.querySelector("#setBtnCloud").className = !local ? "on" : "";
      wrap.querySelector("#setBtnLocal").className = local ? "on" : "";
      wrap.querySelector("#cloudSettingsBlock").style.display = local ? "none" : "block";
      wrap.querySelector("#localSettingsBlock").style.display = local ? "block" : "none";
      field.value = enh.currentModel();
      var a = enh.isAbliterated();
      wrap.querySelector("#setBtnAblit").className = a ? "on" : "";
      wrap.querySelector("#setBtnFull").className = !a ? "on" : "";
      fillLocal();
    }
    function saveLocal() {
      try {
        localStorage.setItem(enh.LOCAL_BASE_KEY, wrap.querySelector("#localBaseInput").value.trim() || enh.DEFAULT_LOCAL_BASE);
        localStorage.setItem(enh.LOCAL_MODEL_KEY, wrap.querySelector("#localModelInput").value.trim() || enh.DEFAULT_LOCAL_MODEL);
        localStorage.setItem(enh.LOCAL_KEY_KEY, wrap.querySelector("#localKeyInput").value.trim());
      } catch (e) {}
      renderModelBar();
    }
    ["localBaseInput","localModelInput","localKeyInput"].forEach(function (id) {
      wrap.querySelector("#"+id).addEventListener("change", saveLocal);
      wrap.querySelector("#"+id).addEventListener("blur", saveLocal);
    });
    wrap.querySelector("#setBtnCloud").onclick = function () { enh.setSource("cloud"); sync(); enh.toast("Cloud mode"); };
    wrap.querySelector("#setBtnLocal").onclick = function () { enh.setSource("local"); sync(); enh.toast("Local mode \u2014 set API base below"); };
    sel.onchange = function () {
      enh.setPresetId(sel.value);
      var pr = enh.PRESETS.find(function (x) { return x.id === sel.value; }) || enh.PRESETS[0];
      enh.setModel(enh.modelForPreset(pr), true); sync();
    };
    wrap.querySelector("#setBtnAblit").onclick = function () { enh.setAbliterated(true); sync(); };
    wrap.querySelector("#setBtnFull").onclick = function () { enh.setAbliterated(false); sync(); };
    sync();
  }
  function ensureTools() {
    var enh = E(); if (!enh) return;
    var wrap = document.querySelector(".composer-wrap");
    if (!wrap || document.getElementById("composerTools")) return;
    var tools = document.createElement("div"); tools.id = "composerTools"; tools.className = "composer-tools";
    tools.innerHTML = '<button type="button" id="stopGen">Stop</button><button type="button" id="exportChat">Export</button><button type="button" id="newChatQuick">+ Chat</button>';
    var composer = wrap.querySelector(".composer");
    if (composer) wrap.insertBefore(tools, composer); else wrap.appendChild(tools);
    document.getElementById("stopGen").onclick = function () {
      var c = enh.getAbort && enh.getAbort(); if (c) { c.abort(); enh.setAbort(null); enh.toast("Stopped"); }
      enh.setGenerating(false);
    };
    document.getElementById("exportChat").onclick = enh.exportChat;
    document.getElementById("newChatQuick").onclick = function () {
      if (window.siftahTabs && window.siftahTabs.newTab) window.siftahTabs.newTab(); else enh.toast("Tabs not loaded");
    };
  }
  function patchOpenSettings() {
    if (typeof openSettings !== "function" || openSettings.__enh) return;
    var _o = openSettings;
    window.openSettings = function () {
      var r = _o.apply(this, arguments); wireSettings();
      var m = document.getElementById("model"); var enh = E(); if (m && enh) m.value = enh.currentModel();
      return r;
    };
    window.openSettings.__enh = true;
  }
  function wireAdvanced() {
    var btn = document.getElementById("toggleAdvanced");
    var body = document.querySelector(".sheet-body");
    if (!btn || !body || btn.__wired) return;
    btn.__wired = true;
    btn.onclick = function () {
      body.classList.toggle("show-advanced");
      btn.textContent = body.classList.contains("show-advanced") ? "Hide advanced" : "Advanced";
    };
    var flux = document.getElementById("fluxToken");
    if (flux && !flux.__wired) {
      flux.__wired = true;
      try { flux.value = localStorage.getItem("siftah_flux_token") || ""; } catch (e) {}
      function saveFlux() {
        try { localStorage.setItem("siftah_flux_token", flux.value.trim()); } catch (e) {}
        var studio = document.getElementById("studioFluxToken");
        if (studio && studio.value !== flux.value) studio.value = flux.value;
      }
      flux.addEventListener("change", saveFlux);
      flux.addEventListener("blur", saveFlux);
    }
    var horde = document.getElementById("hordeToken");
    if (horde && !horde.__wired) {
      horde.__wired = true;
      try { horde.value = localStorage.getItem("siftah_horde_key") || ""; } catch (e) {}
      function saveHorde() {
        try { localStorage.setItem("siftah_horde_key", horde.value.trim()); } catch (e) {}
      }
      horde.addEventListener("input", saveHorde);
      horde.addEventListener("change", saveHorde);
      horde.addEventListener("blur", saveHorde);
    }
  }
  function boot() {
    if (!E()) { setTimeout(boot, 50); return; }
    injectCSS();
    try {
      var saved = localStorage.getItem("siftah_model");
      if (saved) {
        var hit = E().PRESETS.find(function (p) { return p.abliterated === saved || p.full === saved; });
        if (hit) E().setPresetId(hit.id);
      }
    } catch (e) {}
    E().currentModel();
    renderModelBar();
    ensureTools();
    wireAdvanced();
    patchOpenSettings();
    E().patchSend();
    setTimeout(function () { E().patchSend(); renderModelBar(); }, 400);
  }
  window.siftahEnhUI = { render: renderModelBar };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 150); });
  else setTimeout(boot, 150);
})();
