/* Siftah name-fix: unique filenames, no silent overwrite, better +Project names */
(function () {
  "use strict";

  function getProject() {
    if (typeof window.project !== "undefined" && window.project) return window.project;
    try { return project; } catch (e) { return null; }
  }

  function allUsedNames() {
    var p = getProject() || { files: {}, folders: {} };
    var used = new Set(Object.keys(p.files || {}));
    Object.keys(p.folders || {}).forEach(function (f) {
      Object.keys((p.folders[f] && p.folders[f].files) || {}).forEach(function (n) {
        used.add(n);
        used.add(f + "/" + n);
      });
    });
    return used;
  }

  function uniquePath(path) {
    path = String(path || "").replace(/^\/+/, "").replace(/\\/g, "/");
    var parts = path.split("/").filter(Boolean);
    if (!parts.length) return path;
    var folder = parts.length > 1 ? parts[0] : "";
    var name = parts.length > 1 ? parts.slice(1).join("_") : parts[0];
    var p = getProject();
    function exists(f, n) {
      if (!p) return false;
      if (f) return !!(p.folders[f] && p.folders[f].files && p.folders[f].files[n] != null);
      return !!(p.files && p.files[n] != null);
    }
    if (!exists(folder, name)) return folder ? folder + "/" + name : name;
    var dot = name.lastIndexOf(".");
    var base = dot >= 0 ? name.slice(0, dot) : name;
    var ext = dot >= 0 ? name.slice(dot) : "";
    var i = 1, candidate = base + i + ext;
    while (exists(folder, candidate)) {
      i++;
      candidate = base + i + ext;
    }
    return folder ? folder + "/" + candidate : candidate;
  }

  function patchPutFile() {
    if (typeof putFile !== "function") return;
    if (putFile.__siftahUnique) return;
    var _put = putFile;
    window.putFile = function (path, content, flash) {
      path = String(path || "").replace(/^\/+/, "").replace(/\\/g, "/");
      var p = getProject();
      var parts = path.split("/").filter(Boolean);
      if (p && p.activeTask && parts.length === 1) {
        path = p.activeTask + "/" + parts[0];
      }
      var unique = uniquePath(path);
      if (unique !== path && typeof showToast === "function") {
        setTimeout(function () { showToast("Saved as " + unique + " (name taken)"); }, 50);
      }
      return _put.call(this, unique, content, flash);
    };
    window.putFile.__siftahUnique = true;
    window.putFile.__siftahPatched = true;
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
    for (const line of String(code).split(/\n/).slice(0, 15)) {
      const t = line.trim();
      const patterns = [
        /^\/\/\s*([^\s]+?\.[a-z0-9]{1,12})\s*$/i,
        /^#\s*([^\s]+?\.[a-z0-9]{1,12})\s*$/i,
        /^\/\*\s*([^\s*]+?\.[a-z0-9]{1,12})\s*\*\//i,
        /^<!--\s*([^\s>]+?\.[a-z0-9]{1,12})\s*-->/i,
        /^(?:\/\/|#|--)\s*(?:file|filename|path)\s*[:=]\s*[`']?([^\s`']+)/i,
        /^(?:file|filename|path)\s*[:=]\s*[`']?([^\s`']+)/i
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
        while (node && hops < 12) {
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
    const used = allUsedNames();
    if (typeof guessFilename === "function") return guessFilename(lang || "txt", used);
    const map = { javascript: "js", js: "js", python: "py", py: "py", html: "html", css: "css", typescript: "ts", ts: "ts", json: "json", md: "md" };
    const l = (lang || "txt").toLowerCase();
    const ext = map[l] || "txt";
    const base = { html: "index", css: "styles", js: "script", javascript: "script", py: "main", python: "main" }[l] || "file";
    let name = base + "." + ext, i = 2;
    while (used.has(name)) { name = base + i + "." + ext; i++; }
    return name;
  }

  function resolveName(btn, pre) {
    var detected = null;
    var path = (btn.getAttribute("data-path") || "").trim();
    if (looksLikeFile(path)) detected = cleanFile(path);
    if (!detected) detected = extractNearBlock(btn);
    if (!detected) detected = extractFromCode(pre ? pre.textContent : "");
    var lang = btn.getAttribute("data-lang") || "txt";
    if (!detected && looksLikeFile(lang)) detected = cleanFile(lang);
    var guess = detected || defaultGuess(lang);
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
      patchPutFile();
      var id = btn.getAttribute("data-add");
      var pre = id ? document.getElementById(id) : null;
      if (!pre) {
        var block0 = btn.closest(".code-block");
        pre = block0 && block0.querySelector("pre");
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
      if (typeof putFile === "function") putFile(path, pre.textContent || "", true);
      btn.textContent = "Added · " + path;
      setTimeout(function () { btn.textContent = "+ Project"; }, 1600);
    },
    true
  );

  function boot() { patchPutFile(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 20); });
  else setTimeout(boot, 20);
})();
