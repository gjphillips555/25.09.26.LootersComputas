/* Siftah file actions v2: file+folder select, select-all, 3-dot menu */
(function () {
  "use strict";
  var selected = new Set();
  var highlights = {};
  try { highlights = JSON.parse(localStorage.getItem("siftah_highlights") || "{}") || {}; } catch (e) { highlights = {}; }
  function saveHl() { localStorage.setItem("siftah_highlights", JSON.stringify(highlights)); }

  function fileKey(folder, name) { return "file\0" + (folder || "") + "\0" + name; }
  function folderKey(folder) { return "f\0" + folder; }
  function parseKey(k) {
    if (k.indexOf("f\0") === 0) return { type: "folder", folder: k.slice(2), name: "" };
    var rest = k.slice(5);
    var i = rest.indexOf("\0");
    return { type: "file", folder: rest.slice(0, i), name: rest.slice(i + 1) };
  }
  function hlKey(folder, name) { return (folder || "") + "\0" + name; }

  function getProject() {
    if (typeof window.project !== "undefined" && window.project) return window.project;
    try { return project; } catch (e) { return null; }
  }

  function ensureMenu() {
    var m = document.getElementById("fileCtxMenu");
    if (m) return m;
    m = document.createElement("div");
    m.id = "fileCtxMenu";
    m.className = "file-ctx-menu";
    m.innerHTML =
      '<div class="ctx-label" id="ctxTargetLabel">File</div>' +
      '<button type="button" data-act="rename">✏️ Rename</button>' +
      '<button type="button" data-act="clone">📄 Quick clone</button>' +
      '<button type="button" data-act="copy">📋 Copy contents</button>' +
      '<button type="button" data-act="move">📁 Move to…</button>' +
      '<div class="sep"></div>' +
      '<div class="ctx-label">Highlight</div>' +
      '<div class="hl-swatches">' +
      '<button type="button" data-hl="red" title="Red"></button>' +
      '<button type="button" data-hl="orange" title="Orange"></button>' +
      '<button type="button" data-hl="yellow" title="Yellow"></button>' +
      '<button type="button" data-hl="green" title="Green"></button>' +
      '<button type="button" data-hl="blue" title="Blue"></button>' +
      '<button type="button" data-hl="purple" title="Purple"></button>' +
      '<button type="button" data-hl="" title="None"></button>' +
      "</div>" +
      '<div class="sep"></div>' +
      '<button type="button" class="danger" data-act="delete">🗑 Delete</button>';
    document.body.appendChild(m);
    m.addEventListener("click", onMenuClick);
    document.addEventListener("click", function (e) {
      if (!m.classList.contains("show")) return;
      if (m.contains(e.target)) return;
      if (e.target.closest && e.target.closest(".more-btn")) return;
      hideMenu();
    });
    return m;
  }
  var menuTargets = [];
  function hideMenu() {
    var m = document.getElementById("fileCtxMenu");
    if (m) m.classList.remove("show");
    menuTargets = [];
  }
  function showMenu(x, y, targets) {
    var m = ensureMenu();
    menuTargets = targets.slice();
    var label = document.getElementById("ctxTargetLabel");
    if (label) {
      if (targets.length > 1) label.textContent = targets.length + " items selected";
      else if (targets[0].type === "folder") label.textContent = "📁 " + targets[0].folder;
      else label.textContent = targets[0].name;
    }
    m.classList.add("show");
    var pad = 8;
    var w = m.offsetWidth || 180;
    var h = m.offsetHeight || 280;
    var left = Math.min(x, window.innerWidth - w - pad);
    var top = Math.min(y, window.innerHeight - h - pad);
    m.style.left = Math.max(pad, left) + "px";
    m.style.top = Math.max(pad, top) + "px";
  }

  function getContent(folder, name) {
    if (typeof getFileContent === "function") return getFileContent(folder, name);
    var p = getProject();
    if (!p) return null;
    return folder ? (p.folders[folder] && p.folders[folder].files[name]) : p.files[name];
  }
  function uniqueCloneName(folder, name) {
    var dot = name.lastIndexOf(".");
    var base = dot >= 0 ? name.slice(0, dot) : name;
    var ext = dot >= 0 ? name.slice(dot) : "";
    var i = 1, candidate = base + i + ext;
    while (getContent(folder, candidate) != null) {
      i++;
      candidate = base + i + ext;
    }
    return candidate;
  }

  function onMenuClick(e) {
    var hl = e.target.closest("[data-hl]");
    if (hl) {
      var color = hl.getAttribute("data-hl");
      menuTargets.forEach(function (t) {
        if (t.type !== "file") return;
        var k = hlKey(t.folder, t.name);
        if (color) highlights[k] = color;
        else delete highlights[k];
      });
      saveHl();
      hideMenu();
      if (typeof renderFilesTree === "function") renderFilesTree();
      if (typeof showToast === "function") showToast(color ? "Highlighted" : "Highlight cleared");
      return;
    }
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var act = btn.getAttribute("data-act");
    var targets = menuTargets.slice();
    hideMenu();
    if (!targets.length) return;

    if (act === "rename") {
      var filesOnly = targets.filter(function (t) { return t.type === "file"; });
      var foldersOnly = targets.filter(function (t) { return t.type === "folder"; });
      if (filesOnly.length === 1 && foldersOnly.length === 0) {
        var t = filesOnly[0];
        var next = prompt("Rename file:", t.name);
        if (!next || !next.trim()) return;
        next = next.trim().replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-");
        if (!next || next === t.name) return;
        if (getContent(t.folder, next) != null) {
          if (typeof showToast === "function") showToast("Name already exists");
          return;
        }
        var content = getContent(t.folder, t.name);
        if (content == null) return;
        if (typeof putFile === "function") {
          var path = t.folder ? t.folder + "/" + next : next;
          if (typeof deleteFile === "function") deleteFile(t.folder, t.name);
          putFile(path, content, true);
          var ok = hlKey(t.folder, t.name);
          if (highlights[ok]) {
            highlights[hlKey(t.folder, next)] = highlights[ok];
            delete highlights[ok];
            saveHl();
          }
          selected.delete(fileKey(t.folder, t.name));
        }
      } else if (foldersOnly.length === 1 && filesOnly.length === 0) {
        var f = foldersOnly[0].folder;
        var nf = prompt("Rename folder:", f);
        if (!nf || !nf.trim()) return;
        nf = nf.trim().replace(/[^\w\- .]/g, "").replace(/\s+/g, "-").slice(0, 40);
        if (!nf || nf === f) return;
        var p = getProject();
        if (!p || !p.folders[f]) return;
        if (p.folders[nf]) {
          if (typeof showToast === "function") showToast("Folder already exists");
          return;
        }
        p.folders[nf] = p.folders[f];
        delete p.folders[f];
        selected.delete(folderKey(f));
        if (typeof saveProject === "function") saveProject();
        if (typeof renderFilesTree === "function") renderFilesTree();
        if (typeof showToast === "function") showToast("Renamed folder");
      } else {
        if (typeof showToast === "function") showToast("Rename one item at a time");
      }
      return;
    }

    if (act === "clone") {
      targets.forEach(function (t) {
        if (t.type !== "file") return;
        var content = getContent(t.folder, t.name);
        if (content == null) return;
        var neu = uniqueCloneName(t.folder, t.name);
        var path = t.folder ? t.folder + "/" + neu : neu;
        if (typeof putFile === "function") putFile(path, content, true);
      });
      if (typeof showToast === "function") showToast("Cloned file(s)");
      return;
    }

    if (act === "copy") {
      var texts = targets.filter(function (t) { return t.type === "file"; }).map(function (t) {
        var c = getContent(t.folder, t.name);
        return c == null ? "" : c;
      }).filter(Boolean);
      if (!texts.length) {
        if (typeof showToast === "function") showToast("No file contents to copy");
        return;
      }
      var blob = texts.join("\n\n/* ---- */\n\n");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(blob).then(
          function () { if (typeof showToast === "function") showToast("Copied"); },
          function () { if (typeof showToast === "function") showToast("Copy failed"); }
        );
      }
      return;
    }

    if (act === "move") {
      var p = getProject() || {};
      var folders = Object.keys(p.folders || {}).sort();
      var dest = prompt(
        "Move files to folder (empty = root).\nExisting: " + (folders.join(", ") || "(none)"),
        ""
      );
      if (dest === null) return;
      dest = String(dest).trim().replace(/[^\w\- .]/g, "").slice(0, 40);
      targets.forEach(function (t) {
        if (t.type !== "file") return;
        if ((t.folder || "") === dest) return;
        if (typeof moveFile === "function") moveFile(t.folder || "", t.name, dest);
        var ok = hlKey(t.folder, t.name);
        if (highlights[ok]) {
          highlights[hlKey(dest, t.name)] = highlights[ok];
          delete highlights[ok];
        }
        selected.delete(fileKey(t.folder, t.name));
      });
      saveHl();
      if (typeof renderFilesTree === "function") renderFilesTree();
      updateSelBar();
      if (typeof showToast === "function") showToast("Moved");
      return;
    }

    if (act === "delete") {
      var nFiles = targets.filter(function (t) { return t.type === "file"; }).length;
      var nFolders = targets.filter(function (t) { return t.type === "folder"; }).length;
      var msg = "Delete " + nFiles + " file(s)";
      if (nFolders) msg += " and " + nFolders + " folder(s)";
      msg += "?";
      if (!confirm(msg)) return;
      targets.forEach(function (t) {
        if (t.type === "file") {
          if (typeof deleteFile === "function") deleteFile(t.folder || "", t.name);
          delete highlights[hlKey(t.folder, t.name)];
          selected.delete(fileKey(t.folder, t.name));
        } else if (t.type === "folder") {
          if (typeof deleteFolder === "function") deleteFolder(t.folder);
          else {
            var p = getProject();
            if (p && p.folders[t.folder]) {
              delete p.folders[t.folder];
              if (typeof saveProject === "function") saveProject();
            }
          }
          selected.delete(folderKey(t.folder));
        }
      });
      saveHl();
      if (typeof renderFilesTree === "function") renderFilesTree();
      updateSelBar();
      if (typeof showToast === "function") showToast("Deleted");
      return;
    }
  }

  function updateSelBar() {
    var bar = document.getElementById("selBar");
    if (!bar) {
      var tree = document.getElementById("filesTree");
      if (!tree || !tree.parentNode) return;
      bar = document.createElement("div");
      bar.id = "selBar";
      bar.className = "sel-bar";
      bar.innerHTML =
        '<button type="button" class="sel-circle" id="selAllCircle" title="Select all"></button>' +
        '<span class="count" id="selCount">0</span> selected' +
        '<button type="button" id="selAllBtn">Select all</button>' +
        '<button type="button" id="selClear">Clear</button>' +
        '<button type="button" id="selMenu">⋯ Actions</button>';
      tree.parentNode.insertBefore(bar, tree);
      document.getElementById("selClear").onclick = function () {
        selected.clear();
        if (typeof renderFilesTree === "function") renderFilesTree();
        updateSelBar();
      };
      document.getElementById("selMenu").onclick = function (e) {
        if (!selected.size) return;
        var list = [];
        selected.forEach(function (k) { list.push(parseKey(k)); });
        showMenu(e.clientX, e.clientY, list);
      };
      document.getElementById("selAllBtn").onclick = selectAll;
      document.getElementById("selAllCircle").onclick = function () {
        if (allSelected()) {
          selected.clear();
        } else {
          selectAll();
          return;
        }
        if (typeof renderFilesTree === "function") renderFilesTree();
        updateSelBar();
      };
    }
    var n = selected.size;
    var p = getProject();
    var hasItems = p && (Object.keys(p.files || {}).length || Object.keys(p.folders || {}).length);
    bar.classList.toggle("show", !!hasItems);
    var c = document.getElementById("selCount");
    if (c) c.textContent = String(n);
    var circle = document.getElementById("selAllCircle");
    if (circle) circle.classList.toggle("checked", allSelected() && n > 0);
  }

  function allSelected() {
    var p = getProject();
    if (!p) return false;
    var keys = [];
    Object.keys(p.folders || {}).forEach(function (f) {
      keys.push(folderKey(f));
      Object.keys((p.folders[f] && p.folders[f].files) || {}).forEach(function (n) {
        keys.push(fileKey(f, n));
      });
    });
    Object.keys(p.files || {}).forEach(function (n) {
      keys.push(fileKey("", n));
    });
    if (!keys.length) return false;
    return keys.every(function (k) { return selected.has(k); });
  }

  function selectAll() {
    var p = getProject();
    if (!p) return;
    selected.clear();
    Object.keys(p.folders || {}).forEach(function (f) {
      selected.add(folderKey(f));
      Object.keys((p.folders[f] && p.folders[f].files) || {}).forEach(function (n) {
        selected.add(fileKey(f, n));
      });
    });
    Object.keys(p.files || {}).forEach(function (n) {
      selected.add(fileKey("", n));
    });
    if (typeof renderFilesTree === "function") renderFilesTree();
    updateSelBar();
  }

  function enhancedFileRowHtml(folder, name, flash) {
    var path = folder ? folder + "/" + name : name;
    var k = fileKey(folder, name);
    var hl = highlights[hlKey(folder, name)] || "";
    var isSel = selected.has(k);
    var classes = "tree-file" + (flash ? " flash" : "") + (isSel ? " selected" : "") + (hl ? " hl-" + hl : "");
    return (
      '<div class="' + classes + '" data-folder="' + escapeHtml(folder) + '" data-name="' + escapeHtml(name) + '">' +
      '<div class="tree-file-row" draggable="true" data-drag-folder="' + escapeHtml(folder) + '" data-drag-name="' + escapeHtml(name) + '">' +
      '<button type="button" class="sel-circle' + (isSel ? " checked" : "") + '" title="Select" data-sel-file="1" data-sel-folder="' + escapeHtml(folder) + '" data-sel-name="' + escapeHtml(name) + '"></button>' +
      '<span class="name" data-preview-folder="' + escapeHtml(folder) + '" data-preview-name="' + escapeHtml(name) + '" title="' + escapeHtml(path) + '">📄 ' + escapeHtml(name) + "</span>" +
      '<div class="tree-actions">' +
      '<button type="button" title="Download" data-dl-folder="' + escapeHtml(folder) + '" data-dl-name="' + escapeHtml(name) + '">⬇</button>' +
      '<button type="button" class="more-btn" title="More" data-more-file="1" data-more-folder="' + escapeHtml(folder) + '" data-more-name="' + escapeHtml(name) + '">⋯</button>' +
      '<button type="button" class="danger" title="Delete" data-del-file-folder="' + escapeHtml(folder) + '" data-del-file-name="' + escapeHtml(name) + '">🗑</button>' +
      "</div></div></div>"
    );
  }

  function enhancedFolderRow(folder, open, childrenHtml) {
    var k = folderKey(folder);
    var isSel = selected.has(k);
    return (
      '<div class="tree-folder' + (isSel ? " selected" : "") + '" data-folder="' + escapeHtml(folder) + '">' +
      '<div class="tree-folder-row" data-drop-folder="' + escapeHtml(folder) + '">' +
      '<button type="button" class="sel-circle' + (isSel ? " checked" : "") + '" title="Select folder" data-sel-folder-only="1" data-sel-folder="' + escapeHtml(folder) + '"></button>' +
      '<span class="chev" data-toggle-folder="' + escapeHtml(folder) + '">' + (open ? "▼" : "▶") + "</span>" +
      '<span class="name" data-toggle-folder="' + escapeHtml(folder) + '">📁 ' + escapeHtml(folder) + "</span>" +
      '<div class="tree-actions">' +
      '<button type="button" title="Download folder ZIP" data-zip-folder="' + escapeHtml(folder) + '">⬇</button>' +
      '<button type="button" class="more-btn" title="More" data-more-folder-only="1" data-more-folder="' + escapeHtml(folder) + '">⋯</button>' +
      '<button type="button" class="danger" title="Delete folder" data-del-folder="' + escapeHtml(folder) + '">🗑</button>' +
      "</div></div>" +
      '<div class="tree-children ' + (open ? "" : "hidden") + '" data-children="' + escapeHtml(folder) + '">' +
      childrenHtml +
      "</div></div>"
    );
  }

  function patchRender() {
    if (typeof window.fileRowHtml === "function") {
      window.fileRowHtml = enhancedFileRowHtml;
      window.fileRowHtml.__siftahEnhanced = true;
    }
    if (typeof renderFilesTree === "function" && !renderFilesTree.__siftahEnhanced2) {
      window.renderFilesTree = function (flashPath) {
        var p = getProject();
        var tree = document.getElementById("filesTree");
        if (!p || !tree) return;
        var folderNames = Object.keys(p.folders || {}).sort();
        var rootFiles = Object.keys(p.files || {}).sort();
        if (!folderNames.length && !rootFiles.length) {
          tree.innerHTML =
            '<div class="files-empty">No project files yet.<br><br>When Siftah writes code, use <strong>+ Project</strong> on a code block, or turn on auto-add in Settings.</div>';
          if (typeof updateFilesBadge === "function") updateFilesBadge();
          updateSelBar();
          return;
        }
        var collapsedFolders = window.collapsedFolders || {};
        var html = '<div class="tree-folder-row" data-drop-folder="" style="opacity:.6;font-size:11px;margin-bottom:4px">📂 root</div>';
        for (var fi = 0; fi < folderNames.length; fi++) {
          var folder = folderNames[fi];
          var open = !collapsedFolders[folder];
          var children = "";
          var names = Object.keys((p.folders[folder] && p.folders[folder].files) || {}).sort();
          for (var ni = 0; ni < names.length; ni++) {
            var name = names[ni];
            var fp = folder + "/" + name;
            var flash = flashPath && (flashPath === fp || flashPath.endsWith("/" + name));
            children += enhancedFileRowHtml(folder, name, flash);
          }
          html += enhancedFolderRow(folder, open, children);
        }
        for (var ri = 0; ri < rootFiles.length; ri++) {
          html += enhancedFileRowHtml("", rootFiles[ri], flashPath === rootFiles[ri]);
        }
        tree.innerHTML = html;
        if (typeof updateFilesBadge === "function") updateFilesBadge();
        if (typeof wireTreeEvents === "function") wireTreeEvents();
        bindExtraTreeEvents();
        updateSelBar();
      };
      window.renderFilesTree.__siftahEnhanced2 = true;
    }
  }

  function bindExtraTreeEvents() {
    var tree = document.getElementById("filesTree");
    if (!tree) return;

    tree.querySelectorAll("[data-sel-file]").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        e.preventDefault();
        var f = el.getAttribute("data-sel-folder") || "";
        var n = el.getAttribute("data-sel-name");
        var k = fileKey(f, n);
        if (selected.has(k)) selected.delete(k);
        else selected.add(k);
        if (typeof renderFilesTree === "function") renderFilesTree();
        else updateSelBar();
      };
    });

    tree.querySelectorAll("[data-sel-folder-only]").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        e.preventDefault();
        var f = el.getAttribute("data-sel-folder") || "";
        var k = folderKey(f);
        if (selected.has(k)) selected.delete(k);
        else selected.add(k);
        if (typeof renderFilesTree === "function") renderFilesTree();
        else updateSelBar();
      };
    });

    tree.querySelectorAll("[data-more-file]").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        var f = el.getAttribute("data-more-folder") || "";
        var n = el.getAttribute("data-more-name");
        var k = fileKey(f, n);
        var targets;
        if (selected.size && selected.has(k)) {
          targets = [];
          selected.forEach(function (sk) { targets.push(parseKey(sk)); });
        } else {
          targets = [{ type: "file", folder: f, name: n }];
        }
        showMenu(e.clientX, e.clientY, targets);
      };
    });

    tree.querySelectorAll("[data-more-folder-only]").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        var f = el.getAttribute("data-more-folder") || "";
        var k = folderKey(f);
        var targets;
        if (selected.size && selected.has(k)) {
          targets = [];
          selected.forEach(function (sk) { targets.push(parseKey(sk)); });
        } else {
          targets = [{ type: "folder", folder: f, name: "" }];
        }
        showMenu(e.clientX, e.clientY, targets);
      };
    });
  }

  function boot() {
    patchRender();
    ensureMenu();
    if (typeof renderFilesTree === "function") renderFilesTree();
    updateSelBar();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 80); });
  else setTimeout(boot, 80);
})();
