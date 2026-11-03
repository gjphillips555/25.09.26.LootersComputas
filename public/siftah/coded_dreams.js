/* Dexter Coded Dreams — saved coding projects and multi-reply assembly. */
(function () {
  "use strict";
  var KEY = "siftah_coded_dreams_v1";
  var store = load();
  var activeId = store.activeId || "";
  var panelOpen = false;
  var dropdownOpen = false;
  var lastReply = "";
  var completionMarker = "CODED_DREAM_COMPLETE";

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (v && Array.isArray(v.dreams)) return v;
    } catch (e) {}
    return { activeId: "", dreams: [], counter: 0 };
  }
  function save() {
    store.activeId = activeId;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast("Coded Dreams storage is full."); }
    render();
  }
  function toast(s) {
    if (typeof window.showToast === "function") window.showToast(s);
  }
  function id() { return "cd" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function active() { return store.dreams.find(function (d) { return d.id === activeId; }) || null; }
  function isDexter() {
    return !!(window.siftahModes && window.siftahModes.getMode && window.siftahModes.getMode() === "coding");
  }
  function describe(text) {
    var s = String(text || "").replace(/\s+/g, " ").trim();
    return s.length > 110 ? s.slice(0, 107) + "…" : s;
  }
  function makeDream(prompt) {
    store.counter = Number(store.counter || 0) + 1;
    var d = {
      id: id(),
      name: "Coded Dream " + store.counter,
      description: describe(prompt) || "A coding idea in progress",
      prompt: String(prompt || ""),
      files: {},
      parts: [],
      guide: "",
      complete: false,
      created: Date.now(),
      updated: Date.now()
    };
    store.dreams.unshift(d);
    activeId = d.id;
    save();
    return d;
  }
  function ensureDream(prompt) {
    var d = active();
    if (!d) d = makeDream(prompt);
    return d;
  }
  function parseFiles(reply) {
    var out = [];
    var re = /```([^\n`]*)\n([\s\S]*?)```/g, m;
    while ((m = re.exec(String(reply || "")))) {
      var meta = (m[1] || "").trim();
      var tokens = meta.split(/[\s,;]+/).filter(Boolean);
      var path = "";
      var lang = "text";
      tokens.forEach(function (t) {
        if (/^[\w./-]+\.[a-z0-9]{1,12}$/i.test(t)) path = t;
        else if (!lang || lang === "text") lang = t.toLowerCase() || "text";
      });
      if (!path) {
        var ext = ({javascript:"js",js:"js",typescript:"ts",tsx:"tsx",jsx:"jsx",html:"html",css:"css",json:"json",python:"py",py:"py",bash:"sh",sql:"sql",markdown:"md"}[lang] || lang || "txt");
        path = "file-" + (out.length + 1) + "." + ext;
      }
      out.push({ path: path.replace(/^\.\//, ""), lang: lang, code: m[2].replace(/\n+$/, "") });
    }
    return out;
  }
  function mergeReply(reply) {
    var d = active();
    if (!d || !isDexter()) return;
    var files = parseFiles(reply);
    files.forEach(function (f) {
      d.files[f.path] = f.code;
    });
    if (files.length) {
      d.parts.push({ at: Date.now(), files: files.map(function (f) { return f.path; }) });
      d.updated = Date.now();
    }
    if (String(reply).indexOf(completionMarker) !== -1) {
      d.complete = true;
      d.guide = String(reply).replace(completionMarker, "").replace(/```[\\s\\S]*?```/g, "").trim();
      assemble(d);
    }
    save();
  }
  function injectCSS() {
    if (document.getElementById("codedDreamCSS")) return;
    var s = document.createElement("style");
    s.id = "codedDreamCSS";
    s.textContent =
      "#codedDreamPanel{position:absolute;z-index:30;right:0;top:0;bottom:0;width:min(360px,92vw);background:#0d0f14;border-left:1px solid var(--border);box-shadow:-12px 0 32px rgba(0,0,0,.45);display:flex;flex-direction:column;transform:translateX(105%);transition:transform .22s ease;color:var(--text)}" +
      "#codedDreamPanel.open{transform:translateX(0)}" +
      ".cd-head{display:flex;align-items:center;justify-content:space-between;padding:13px;border-bottom:1px solid var(--border)}.cd-head strong{font-size:14px}" +
      ".cd-head button,.cd-action,.cd-select-btn{border:1px solid var(--border);background:#171a22;color:#f0f2f5;border-radius:8px;padding:7px 10px;cursor:pointer}" +
      ".cd-select-wrap{padding:10px;border-bottom:1px solid var(--border);position:relative}.cd-select-list{display:none;position:absolute;top:48px;left:10px;right:10px;z-index:3;background:#171a22;border:1px solid var(--border);border-radius:10px;max-height:45vh;overflow:auto;padding:5px}.cd-select-list.open{display:block}" +
      ".cd-option{display:block;width:100%;text-align:left;border:0;background:transparent;color:#f0f2f5;padding:9px;border-radius:7px;cursor:pointer}.cd-option:hover{background:rgba(225,29,46,.14)}.cd-option small{display:block;color:#929aa8;margin-top:3px;line-height:1.35}" +
      ".cd-current{padding:12px;overflow:auto;flex:1}.cd-name{font-size:16px;font-weight:800;margin-bottom:6px}.cd-desc{font-size:12px;color:#aab1bd;line-height:1.45;margin-bottom:12px}.cd-row{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.cd-files{font-size:12px;color:#c5cbd5;line-height:1.8}.cd-files code{color:#ffb4b8}.cd-empty{color:#929aa8;font-size:12px;line-height:1.5;padding:16px 4px}.cd-delete{border:0!important;background:rgba(225,29,46,.16)!important;color:#ff8791!important;font-weight:800;padding:5px 8px!important}" +
      ".cd-code-window{margin-top:12px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:#090b0f}.cd-code-window pre{max-height:45vh;overflow:auto;padding:12px;font:12px/1.55 ui-monospace,monospace;white-space:pre; color:#e7eaf0}.cd-guide{white-space:pre-wrap;color:#c4cbd5;font-size:12px;line-height:1.55;margin-top:12px}" +
      ".cd-message-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.cd-message-actions button{border:1px solid #3b3033;background:#211519;color:#fff;border-radius:8px;padding:7px 10px;font-size:11px;font-weight:700;cursor:pointer}.cd-message-actions button.primary{background:#a71927;border-color:#c32636}" +
      "#codedDreamToggle{font-size:15px;white-space:nowrap}.cd-rename{border:0;background:transparent;color:#ff8b96;text-decoration:underline;cursor:pointer;font-size:11px;margin-left:7px}" +
      "@media(min-width:801px){#codedDreamPanel{position:relative;flex:0 0 0;width:0;border:0;box-shadow:none}#codedDreamPanel.open{flex-basis:min(360px,32vw);width:min(360px,32vw);border-left:1px solid var(--border)}}";
    document.head.appendChild(s);
  }
  function buildUI() {
    if (document.getElementById("codedDreamPanel")) return;
    injectCSS();
    var headerActions = document.querySelector("header > div:last-child");
    if (headerActions) {
      var toggle = document.createElement("button");
      toggle.type = "button"; toggle.id = "codedDreamToggle"; toggle.className = "files-toggle";
      toggle.title = "Coded Dreams"; toggle.setAttribute("aria-label", "Coded Dreams"); toggle.textContent = "💭";
      toggle.onclick = function () { panelOpen = !panelOpen; panel().classList.toggle("open", panelOpen); };
      headerActions.insertBefore(toggle, headerActions.firstChild);
    }
    var p = document.createElement("aside");
    p.id = "codedDreamPanel";
    p.innerHTML =
      '<div class="cd-head"><strong>💭 Coded Dreams</strong><button type="button" id="cdClose" aria-label="Close">✕</button></div>' +
      '<div class="cd-select-wrap"><button type="button" class="cd-select-btn" id="cdSelect">☰ Choose a Coded Dream</button><div class="cd-select-list" id="cdSelectList"></div></div>' +
      '<div class="cd-current" id="cdCurrent"></div>';
    document.querySelector(".main-row").appendChild(p);
    document.getElementById("cdClose").onclick = function () { panelOpen = false; p.classList.remove("open"); };
    document.getElementById("cdSelect").onclick = function () { dropdownOpen = !dropdownOpen; document.getElementById("cdSelectList").classList.toggle("open", dropdownOpen); };
    render();
  }
  function panel() { return document.getElementById("codedDreamPanel"); }
  function render() {
    var p = panel(); if (!p) return;
    var list = document.getElementById("cdSelectList");
    if (list) {
      list.innerHTML = "";
      if (!store.dreams.length) list.innerHTML = '<div class="cd-empty">Your coding ideas will appear here. Choose Dexter and describe your first idea to start a Coded Dream.</div>';
      store.dreams.forEach(function (d) {
        var row = document.createElement("div"); row.className = "cd-option-row";
        var b = document.createElement("button"); b.type = "button"; b.className = "cd-option";
        b.innerHTML = '<span>' + esc(d.name) + '</span><small>' + esc(d.description) + '</small>';
        b.onclick = function () { activeId = d.id; dropdownOpen = false; list.classList.remove("open"); save(); };
        var x = document.createElement("button"); x.type = "button"; x.className = "cd-option-x"; x.textContent = "X"; x.title = "Delete " + d.name;
        x.onclick = function (event) { event.stopPropagation(); store.dreams = store.dreams.filter(function (item) { return item.id !== d.id; }); if (activeId === d.id) activeId = store.dreams[0] ? store.dreams[0].id : ""; save(); };
        row.append(b, x); list.appendChild(row);
      });
    }
    var host = document.getElementById("cdCurrent"); if (!host) return;
    var d = active();
    if (!d) { host.innerHTML = '<div class="cd-empty">No Coded Dream selected yet. Switch to Dexter and send a coding idea.</div>'; return; }
    var paths = Object.keys(d.files || {});
    var code = paths.map(function (path) { return "/* " + path + " */\n" + d.files[path]; }).join("\n\n");
    host.innerHTML =
      '<div class="cd-name">' + esc(d.name) + '<button type="button" class="cd-rename" id="cdRename">Rename</button><button type="button" class="cd-delete" id="cdDelete">X</button></div>' +
      '<div class="cd-desc">' + esc(d.description) + '</div>' +
      '<div class="cd-row"><button type="button" class="cd-action" id="cdContinue">Continue</button><button type="button" class="cd-action" id="cdAssemble">Assemble code</button></div>' +
      '<div class="cd-files">' + (paths.length ? paths.map(function (x) { return '• <code>' + esc(x) + '</code>'; }).join("<br>") : "No code files captured yet.") + '</div>' +
      (d.assembled ? '<div class="cd-code-window"><div class="cd-head"><strong>Finished code</strong><button type="button" id="cdCopy">Copy all</button></div><pre>' + esc(d.assembled) + '</pre></div>' : '') +
      (d.guide ? '<div class="cd-guide"><strong>How to use it</strong>\n' + esc(d.guide) + '</div>' : '');
    document.getElementById("cdRename").onclick = function () { var n = prompt("Name this Coded Dream:", d.name); if (n && n.trim()) { d.name = n.trim().slice(0, 60); save(); } };
    document.getElementById("cdDelete").onclick = function () { if (!confirm('Delete "' + d.name + '" and its saved code?')) return; store.dreams = store.dreams.filter(function (x) { return x.id !== d.id; }); activeId = store.dreams[0] ? store.dreams[0].id : ""; save(); };
    document.getElementById("cdContinue").onclick = continueDream;
    document.getElementById("cdAssemble").onclick = function () { assemble(d); save(); };
    var cp = document.getElementById("cdCopy"); if (cp) cp.onclick = function () { navigator.clipboard.writeText(d.assembled || "").then(function () { toast("Finished code copied"); }).catch(function () { toast("Copy failed"); }); };
  }
  function assemble(d) {
    var paths = Object.keys(d.files || {});
    if (!paths.length) { toast("No code has been captured yet."); return; }
    d.assembled = paths.map(function (path) { return "/* ==================== " + path + " ==================== */\n" + d.files[path]; }).join("\n\n");
    if (!d.guide) d.guide = "1. Create a new folder for this project.\n2. Create each file using the filename shown above its section.\n3. Paste that section into the matching file and save it.\n4. Install any dependencies listed in package.json.\n5. Follow the run instructions supplied by Dexter.\n6. Start the app and test each main feature.";
    d.updated = Date.now();
    renderFinalOutput(d);
    toast("Assembled " + paths.length + " file(s) into one code window.");
    render();
  }
  function renderFinalOutput(d) {
    var messages = document.getElementById("messages");
    if (!messages || !d || !d.assembled) return;
    var outputId = "cdFinalOutput-" + d.id;
    var old = document.getElementById(outputId);
    if (old) old.remove();
    var wrap = document.createElement("div");
    wrap.id = outputId;
    wrap.className = "message assistant";
    var av = document.createElement("div"); av.className = "avatar"; av.textContent = "♛";
    var bw = document.createElement("div"); bw.className = "bubble-wrap";
    var bubble = document.createElement("div"); bubble.className = "bubble";
    var heading = document.createElement("strong"); heading.textContent = d.name + " — finished code";
    var note = document.createElement("p"); note.textContent = "All captured files are combined below. Each section starts with its filename.";
    var actions = document.createElement("div"); actions.className = "cd-message-actions";
    var copy = document.createElement("button"); copy.type = "button"; copy.textContent = "Copy complete code";
    copy.onclick = function () { navigator.clipboard.writeText(d.assembled).then(function () { toast("Complete code copied"); }).catch(function () { toast("Copy failed"); }); };
    var download = document.createElement("button"); download.type = "button"; download.textContent = "Download combined code";
    download.onclick = function () { var blob = new Blob([d.assembled], {type:"text/plain;charset=utf-8"}); var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href=url; a.download=d.name.toLowerCase().replace(/[^a-z0-9]+/g,"-") + "-complete-code.txt"; a.click(); setTimeout(function(){URL.revokeObjectURL(url);},1500); };
    actions.append(copy, download);
    var pre = document.createElement("pre"); pre.textContent = d.assembled;
    pre.style.cssText = "max-height:65vh;overflow:auto;white-space:pre;padding:12px;background:#090b0f;border:1px solid var(--border);border-radius:9px;font:12px/1.55 ui-monospace,monospace";
    var guide = document.createElement("div"); guide.className = "cd-guide"; guide.textContent = "How to assemble and run it\\n" + (d.guide || "1. Create a project folder.\\n2. Create each file using its filename heading.\\n3. Paste the matching code into each file and save.\\n4. Install dependencies and run the project using the instructions above.");
    bubble.append(heading, note, actions, pre, guide);
    bw.appendChild(bubble); wrap.append(av, bw); messages.appendChild(wrap);
    var chat = document.getElementById("chat"); if (chat) chat.scrollTop = chat.scrollHeight;
  }
  function sendPrompt(prompt) {
    var input = document.getElementById("input"), send = document.getElementById("send");
    if (!input || !send) return;
    input.value = prompt;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    send.click();
  }
  function continueDream() {
    var d = active(); if (!d) return;
    var summary = Object.keys(d.files || {}).map(function (p) { return "\nFILE " + p + "\n" + d.files[p]; }).join("\n");
    sendPrompt("Continue the Coded Dream named '" + d.name + "'. Continue from the exact point reached. Do not repeat completed files or sections. Finish any remaining sections, preserve all earlier decisions, and ensure the files work together. Here is the code already captured:\n" + summary + "\nWhen the entire program or web app is genuinely complete, provide the final full file set with filenames, a concise explanation, and easy numbered setup/assembly steps. End that final response with the exact marker " + completionMarker + ". If more work remains, do not use the marker.");
  }
  function attachActions() {
    var bubbles = document.querySelectorAll(".message.assistant .bubble");
    bubbles.forEach(function (bubble) {
      if (bubble.querySelector(".cd-message-actions") || !bubble.querySelector(".code-block")) return;
      var actions = document.createElement("div"); actions.className = "cd-message-actions";
      var cont = document.createElement("button"); cont.type = "button"; cont.textContent = "Continue Coded Dream";
      cont.onclick = function () { continueDream(); };
      var finish = document.createElement("button"); finish.type = "button"; finish.className = "primary"; finish.textContent = "Assemble finished code";
      finish.onclick = function () { var d = active(); if (d) { assemble(d); save(); panelOpen = true; panel().classList.add("open"); } };
      actions.append(cont, finish); bubble.appendChild(actions);
    });
  }
  function capture(reply) {
    if (!reply || !isDexter()) return;
    var d = ensureDream(lastUserPrompt || "Coding project");
    mergeReply(reply);
    setTimeout(attachActions, 350);
  }
  var lastUserPrompt = "";
  function patchFetch() {
    if (window.__codedDreamFetchPatch) return;
    window.__codedDreamFetchPatch = true;
    var original = window.fetch;
    window.fetch = function (url, opts) {
      opts = opts || {};
      var isDexterRequest = false;
      try {
        if (typeof url === "string" && url.indexOf("/api/siftah/chat") !== -1 && opts.body) {
          var body = JSON.parse(opts.body);
          if (body.action === "chat" && body.persona === "dexter") {
            isDexterRequest = true;
            var msgs = body.messages || [];
            lastUserPrompt = msgs.length ? String(msgs[msgs.length - 1].content || "") : "Coding project";
            if (msgs.length && msgs[msgs.length - 1].role === "user" && lastUserPrompt.indexOf("Continue the Coded Dream") === -1) {
              msgs[msgs.length - 1].content += "\\n\\nCoded Dream instructions: treat this as a named, ongoing software project. Put the exact filename in every code fence. If the complete program will not fit in this reply, provide a coherent useful part and wait for the user to press Continue. On each continuation, carry on from the existing files without losing earlier work. When every required file and feature is complete, provide the complete file set, a plain-English description, and simple numbered setup/assembly steps. End only the genuinely finished final reply with the exact marker " + completionMarker + ".";
            }
            opts = Object.assign({}, opts, { body: JSON.stringify(body) });
          }
        }
      } catch (e) {}
      var result = original.call(this, url, opts);
      if (isDexterRequest) {
        result.then(function (response) {
          response.clone().json().then(function (data) {
            if (data && data.reply) { lastReply = data.reply; capture(data.reply); }
          }).catch(function () {});
          if (typeof response.json === "function" && !response.__codedDreamJsonPatch) {
            var originalJson = response.json.bind(response);
            response.json = function () {
              return originalJson().then(function (data) {
                if (data && typeof data.reply === "string") data.reply = data.reply.replace(completionMarker, "").trim();
                return data;
              });
            };
            response.__codedDreamJsonPatch = true;
          }
        }).catch(function () {});
      }
      return result;
    };
  }
  function boot() {
    buildUI();
    patchFetch();
    var obs = new MutationObserver(function () { attachActions(); });
    var host = document.getElementById("messages");
    if (host) obs.observe(host, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 450); });
  else setTimeout(boot, 450);
  window.siftahCodedDreams = { list: function () { return store.dreams.slice(); }, active: active, assemble: function () { var d = active(); if (d) { assemble(d); save(); } } };
})();