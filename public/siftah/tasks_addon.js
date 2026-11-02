/* Siftah smart +Project naming + tasks (v1.5c) */
(function () {
  "use strict";

  function getProject() {
    if (typeof window.project !== "undefined" && window.project) return window.project;
    try { return project; } catch (e) { return null; }
  }

  function looksLikeFile(s) {
    if (!s) return false;
    s = String(s).trim().replace(/^[`'"*#_:\-\s]+|[`'"*#_:\-\s]+$/g, "");
    if (s.length < 3 || s.length > 120) return false;
    if (!/^[\w./\-]+$/.test(s)) return false;
    return /\.[a-z0-9]{1,12}$/i.test(s);
  }
  function cleanFile(s) {
    return String(s || "")
      .trim()
      .replace(/^[`'"*#:\-\s]+/, "")
      .replace(/[`'"*#:\-\s]+$/, "")
      .replace(/^\.\//, "")
      .replace(/^(?:File|Filename|Path|Name)\s*:\s*/i, "")
      .split("/")
      .pop();
  }
  function extractFromCode(code) {
    if (!code) return null;
    for (const line of String(code).split(/\n/).slice(0, 12)) {
      const t = line.trim();
      const patterns = [
        /^\/\/\s*([^\s]+?\.[a-z0-9]{1,12})\s*$/i,
        /^#\s*([^\s]+?\.[a-z0-9]{1,12})\s*$/i,
        /^\/\*\s*([^\s*]+?\.[a-z0-9]{1,12})\s*\*\//i,
        /^<!--\s*([^\s>]+?\.[a-z0-9]{1,12})\s*-->/i,
        /^(?:\/\/|#|--)\s*(?:file|filename|path)\s*[:=]\s*[`']?([^\s`']+)/i,
        /^(?:file|filename|path)\s*[:=]\s*[`']?([^\s`']+)/i,
        /^([a-zA-Z0-9_\-./]+\.[a-z0-9]{1,12})\s*$/i
      ];
      for (const re of patterns) {
        const m = t.match(re);
        if (m && looksLikeFile(m[1])) return cleanFile(m[1]);
      }
    }
    return null;
  }
  function extractFromText(text) {
    if (!text) return null;
    const patterns = [
      /(?:file|filename|path)\s*[:=]\s*[`'*]*([\w./\-]+\.[a-z0-9]{1,12})/i,
      /(?:create|write|save|update|edit|here(?:'s| is)|following is|below is)\s+(?:the\s+)?(?:file\s+)?[`'*]*([\w./\-]+\.[a-z0-9]{1,12})/i,
      /[`']([\w./\-]+\.[a-z0-9]{1,12})[`']/,
      /\*\*([^*\s/]+\.[a-z0-9]{1,12})\*\*/,
      /(?:^|\n)\s*#{1,6}\s*[`']?([\w./\-]+\.[a-z0-9]{1,12})[`']?\s*(?:\n|$)/,
      /\b((?:index|main|app|script|style|styles|server|client|config|package|readme|utils|helper|component)[\w\-]*\.[a-z0-9]{1,12})\b/i,
      /\b([\w\-]+\.(?:html?|css|jsx?|tsx?|py|json|md|vue|svelte|php|go|rs|java|rb|sql|sh|yml|yaml|toml))\b/i
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && looksLikeFile(m[1])) return cleanFile(m[1]);
    }
    return null;
  }
  function extractNearBlock(btn) {
    try {
      const block = btn.closest(".code-block");
      if (!block) return null;
      const langEl = block.querySelector(".lang, .code-header span");
      if (langEl) {
        const lab = cleanFile(langEl.textContent || "");
        if (looksLikeFile(lab)) return lab;
      }
      const bubble = btn.closest(".bubble");
      if (bubble) {
        let node = block.previousElementSibling || block.previousSibling;
        const bits = [];
        let hops = 0;
        while (node && hops < 10) {
          const t = (node.textContent || "").trim();
          if (t) bits.unshift(t);
          node = node.previousElementSibling || node.previousSibling;
          hops++;
        }
        const found = extractFromText(bits.join("\n"));
        if (found) return found;
        return extractFromText(bubble.textContent || "");
      }
    } catch (e) {}
    return null;
  }
  function defaultGuess(lang) {
    const proj = getProject() || { files: {}, folders: {} };
    const used = new Set([
      ...Object.keys(proj.files || {}),
      ...Object.values(proj.folders || {}).flatMap(function (f) { return Object.keys(f.files || {}); })
    ]);
    if (typeof guessFilename === "function") return guessFilename(lang || "txt", used);
    const map = { javascript: "js", js: "js", python: "py", py: "py", html: "html", css: "css", typescript: "ts", ts: "ts", json: "json", md: "md", bash: "sh", shell: "sh" };
    const l = (lang || "txt").toLowerCase();
    const ext = map[l] || (l.match(/^[a-z0-9]+$/) ? l : "txt");
    const base = { html: "index", css: "styles", js: "script", javascript: "script", py: "main", python: "main", ts: "index", json: "data", md: "README" }[l] || "file";
    let name = base + "." + ext, i = 2;
    while (used.has(name)) { name = base + i + "." + ext; i++; }
    return name;
  }
  function resolveName(btn, pre) {
    var path = (btn.getAttribute("data-path") || "").trim();
    if (looksLikeFile(path)) return cleanFile(path);
    var n = extractNearBlock(btn);
    if (n) return n;
    n = extractFromCode(pre ? pre.textContent : "");
    if (n) return n;
    var lang = btn.getAttribute("data-lang") || "txt";
    if (looksLikeFile(lang)) return cleanFile(lang);
    var guess = defaultGuess(lang);
    var entered = window.prompt("Filename for this code:", guess);
    if (entered === null) return null;
    var cleaned = cleanFile(entered).replace(/[^\w.\-]+/g, "");
    return cleaned || guess;
  }

  document.addEventListener(
    "click",
    function (e) {
      var btn = e.target && e.target.closest && e.target.closest("button.add-btn, .add-btn");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var id = btn.getAttribute("data-add");
      var pre = id ? document.getElementById(id) : null;
      if (!pre) {
        pre = btn.closest(".code-block") && btn.closest(".code-block").querySelector("pre");
      }
      if (!pre) return;
      var path = resolveName(btn, pre);
      if (!path) return;
      var block = btn.closest(".code-block");
      if (block) {
        var langEl = block.querySelector(".lang");
        if (langEl) langEl.textContent = path;
        btn.setAttribute("data-path", path);
      }
      if (typeof putFile === "function") {
        putFile(path, pre.textContent || "", true);
      } else {
        console.error("putFile missing");
        return;
      }
      btn.textContent = "Added · " + path;
      setTimeout(function () { btn.textContent = "+ Project"; }, 1500);
      if (typeof showToast === "function") showToast("Added " + path);
    },
    true
  );

  function listTasks() {
    var p = getProject();
    if (!p || !p.folders) return [];
    return Object.keys(p.folders).sort();
  }
  window.renderTaskSelect = function () {
    var sel = document.getElementById("taskSelect");
    if (!sel) return;
    var p = getProject();
    var tasks = listTasks();
    var cur = (p && p.activeTask) || "";
    var html = '<option value="">— root (no task) —</option>';
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i];
      html += '<option value="' + escapeHtml(t) + '"' + (t === cur ? " selected" : "") + ">" + escapeHtml(t) + "</option>";
    }
    sel.innerHTML = html;
  };
  window.setActiveTask = function (name) {
    var p = getProject();
    if (!p) return;
    p.activeTask = name || "";
    if (typeof saveProject === "function") saveProject();
    if (typeof renderFilesTree === "function") renderFilesTree();
    renderTaskSelect();
  };
  window.createTask = function (name) {
    var clean = String(name || "").trim().replace(/[^\w\- .]/g, "").replace(/\s+/g, "-").slice(0, 40);
    if (!clean) return null;
    if (typeof ensureFolder === "function") ensureFolder(clean);
    var p = getProject();
    if (p) p.activeTask = clean;
    if (typeof saveProject === "function") saveProject();
    if (typeof renderFilesTree === "function") renderFilesTree();
    renderTaskSelect();
    if (typeof showToast === "function") showToast('Task "' + clean + '" active');
    return clean;
  };
  function assembleBucket(filename) {
    var ext = (filename.split(".").pop() || "").toLowerCase();
    if (["html", "htm", "svg"].indexOf(ext) >= 0) return "public";
    if (["css", "scss", "sass", "less"].indexOf(ext) >= 0) return "styles";
    if (["js", "jsx", "ts", "tsx", "mjs", "cjs", "vue", "svelte", "py", "pyw"].indexOf(ext) >= 0) return "src";
    if (["json", "yml", "yaml", "toml", "env", "ini"].indexOf(ext) >= 0) return "config";
    if (["md", "txt", "rst"].indexOf(ext) >= 0) return "docs";
    if (ext === "sql") return "db";
    if (["sh", "bash", "ps1", "bat"].indexOf(ext) >= 0) return "scripts";
    return "other";
  }
  window.autoAssemble = function () {
    var p = getProject();
    if (!p || !p.activeTask) {
      if (typeof showToast === "function") showToast("Select or create a Task first");
      return;
    }
    var task = p.activeTask;
    if (typeof ensureFolder === "function") ensureFolder(task);
    var files = Object.assign({}, (p.folders[task] && p.folders[task].files) || {});
    var keys = Object.keys(files);
    if (!keys.length) {
      if (typeof showToast === "function") showToast("No files in this task yet");
      return;
    }
    var moved = 0;
    for (var i = 0; i < keys.length; i++) {
      var name = keys[i];
      var content = files[name];
      var bucket = assembleBucket(name);
      var baseName = name;
      var pref = name.match(/^(public|styles|src|config|docs|db|scripts|other)__(.+)$/);
      if (pref) baseName = pref[2];
      var destFolder = ensureFolder(task + "__" + bucket);
      var destName = baseName;
      if (p.folders[destFolder].files[destName] != null && p.folders[destFolder].files[destName] !== content) {
        var dot = destName.lastIndexOf(".");
        var b = dot >= 0 ? destName.slice(0, dot) : destName;
        var e = dot >= 0 ? destName.slice(dot) : "";
        var n = 2, candidate = b + n + e;
        while (p.folders[destFolder].files[candidate] != null) { n++; candidate = b + n + e; }
        destName = candidate;
      }
      p.folders[destFolder].files[destName] = content;
      delete p.folders[task].files[name];
      moved++;
    }
    if (typeof saveProject === "function") saveProject();
    if (typeof renderFilesTree === "function") renderFilesTree();
    if (typeof showToast === "function") showToast("Assembled " + moved + " file(s)");
  };

  function patchPutFile() {
    if (typeof putFile !== "function" || putFile.__siftahPatched) return;
    var _put = putFile;
    window.putFile = function (path, content, flash) {
      path = String(path || "").replace(/^\/+/, "").replace(/\\/g, "/");
      var p = getProject();
      var parts = path.split("/").filter(Boolean);
      if (p && p.activeTask && parts.length === 1) {
        path = p.activeTask + "/" + parts[0];
      }
      return _put.call(this, path, content, flash);
    };
    window.putFile.__siftahPatched = true;
  }

  window.openMenu = function () {
    var o = document.getElementById("menuOverlay");
    if (o) o.classList.add("show");
  };
  window.closeMenu = function () {
    var o = document.getElementById("menuOverlay");
    if (o) o.classList.remove("show");
  };

  function wire() {
    patchPutFile();
    var menuBtn = document.getElementById("menuBtn");
    if (menuBtn) menuBtn.onclick = openMenu;
    var menuClose = document.getElementById("menuClose");
    if (menuClose) menuClose.onclick = closeMenu;
    var overlay = document.getElementById("menuOverlay");
    if (overlay) overlay.addEventListener("click", function (e) { if (e.target === overlay) closeMenu(); });
    var ms = document.getElementById("menuSettings");
    if (ms) ms.onclick = function () { closeMenu(); if (typeof openSettings === "function") openSettings(); };
    var mf = document.getElementById("menuForum");
    if (mf) mf.onclick = function () { if (typeof showToast === "function") showToast("Siftah Forum — coming soon"); };
    var m3 = document.getElementById("menu3d");
    if (m3) m3.onclick = function () { if (typeof showToast === "function") showToast("3D Blueprints — coming soon"); };
    var btnNewTask = document.getElementById("btnNewTask");
    if (btnNewTask) btnNewTask.onclick = function () {
      var name = prompt("Task name (software / project):");
      if (name) createTask(name);
    };
    var taskSelect = document.getElementById("taskSelect");
    if (taskSelect) taskSelect.onchange = function (e) { setActiveTask(e.target.value); };
    var btnAssemble = document.getElementById("btnAutoAssemble");
    if (btnAssemble) btnAssemble.onclick = autoAssemble;
    renderTaskSelect();
  }

  function boot() {
    patchPutFile();
    wire();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 30); });
  else setTimeout(boot, 30);
})();
