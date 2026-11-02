/* Siftah reorder v1 — ordered project lists + drag reorder */
(function () {
  "use strict";

  function P() {
    if (typeof window.project !== "undefined" && window.project) return window.project;
    try { return project; } catch (e) { return null; }
  }

  function ensureOrders(p) {
    if (!p) return;
    if (!Array.isArray(p.folderOrder)) p.folderOrder = Object.keys(p.folders || {}).sort();
    if (!Array.isArray(p.rootFileOrder)) p.rootFileOrder = Object.keys(p.files || {}).sort();
    Object.keys(p.folders || {}).forEach(function (f) {
      if (!p.folders[f]) return;
      if (!Array.isArray(p.folders[f].fileOrder))
        p.folders[f].fileOrder = Object.keys(p.folders[f].files || {}).sort();
    });
  }

  function ordered(orderArr, keys) {
    var live = {};
    keys.forEach(function (k) { live[k] = true; });
    var out = [];
    (orderArr || []).forEach(function (k) {
      if (live[k]) { out.push(k); delete live[k]; }
    });
    Object.keys(live).sort().forEach(function (k) { out.push(k); });
    return out;
  }

  function moveIn(arr, fromKey, toKey, after) {
    var from = arr.indexOf(fromKey);
    if (from < 0) return;
    arr.splice(from, 1);
    var to = arr.indexOf(toKey);
    if (to < 0) { arr.push(fromKey); return; }
    arr.splice(after ? to + 1 : to, 0, fromKey);
  }

  function save() {
    if (typeof saveProject === "function") saveProject();
  }

  function refresh() {
    if (typeof renderFilesTree === "function") renderFilesTree();
  }

  function patchPut() {
    if (typeof putFile !== "function" || putFile.__ord) return;
    var _put = putFile;
    window.putFile = function (path, content, flash) {
      var r = _put.apply(this, arguments);
      var p = P();
      if (!p) return r;
      ensureOrders(p);
      path = String(path || "").replace(/^\/+/, "").replace(/\\/g, "/");
      var parts = path.split("/").filter(Boolean);
      if (parts.length === 1) {
        if (p.rootFileOrder.indexOf(parts[0]) < 0) p.rootFileOrder.push(parts[0]);
      } else if (parts.length >= 2) {
        var folder = parts[0], fname = parts.slice(1).join("_");
        if (p.folderOrder.indexOf(folder) < 0) p.folderOrder.push(folder);
        if (p.folders[folder]) {
          if (!Array.isArray(p.folders[folder].fileOrder)) p.folders[folder].fileOrder = [];
          if (p.folders[folder].fileOrder.indexOf(fname) < 0) p.folders[folder].fileOrder.push(fname);
        }
      }
      save();
      return r;
    };
    window.putFile.__ord = true;
    window.putFile.__siftahUnique = _put.__siftahUnique;
    window.putFile.__siftahPatched = _put.__siftahPatched;
  }

  function patchRender() {
    if (typeof renderFilesTree !== "function" || renderFilesTree.__ord) return;
    window.renderFilesTree = function (flashPath) {
      var p = P();
      if (!p) return;
      ensureOrders(p);
      var folderNames = ordered(p.folderOrder, Object.keys(p.folders || {}));
      var rootNames = ordered(p.rootFileOrder, Object.keys(p.files || {}));
      orderedRender(flashPath, folderNames, rootNames);
      wireDnD();
    };
    window.renderFilesTree.__ord = true;
    window.renderFilesTree.__siftahEnhanced2 = true;
  }

  function esc(s) {
    return typeof escapeHtml === "function"
      ? escapeHtml(s)
      : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function orderedRender(flashPath, folderNames, rootNames) {
    var p = P();
    var tree = document.getElementById("filesTree");
    if (!p || !tree) return;
    var collapsedFolders = window.collapsedFolders || {};

    if (!folderNames.length && !rootNames.length) {
      tree.innerHTML =
        '<div class="files-empty">No project files yet.<br><br>When Siftah writes code, use <strong>+ Project</strong> on a code block, or turn on auto-add in Settings.</div>';
      if (typeof updateFilesBadge === "function") updateFilesBadge();
      return;
    }

    var fileRowFn = typeof window.fileRowHtml === "function" ? window.fileRowHtml : null;
    var html = '<div class="tree-folder-row" data-drop-folder="" style="opacity:.6;font-size:11px;margin-bottom:4px">📂 root <span style="opacity:.5">(drop files here)</span></div>';

    folderNames.forEach(function (folder) {
      var open = !collapsedFolders[folder];
      var names = ordered(
        (p.folders[folder] && p.folders[folder].fileOrder) || [],
        Object.keys((p.folders[folder] && p.folders[folder].files) || {})
      );
      var children = "";
      names.forEach(function (name) {
        var fp = folder + "/" + name;
        var flash = flashPath && (flashPath === fp || flashPath.endsWith("/" + name));
        if (fileRowFn) children += fileRowFn(folder, name, flash);
        else {
          children +=
            '<div class="tree-file' + (flash ? " flash" : "") + '" data-folder="' + esc(folder) + '" data-name="' + esc(name) + '">' +
            '<div class="tree-file-row" draggable="true" data-drag-folder="' + esc(folder) + '" data-drag-name="' + esc(name) + '">' +
            '<span class="name">📄 ' + esc(name) + "</span></div></div>";
        }
      });
      html +=
        '<div class="tree-folder" data-folder="' + esc(folder) + '">' +
        '<div class="tree-folder-row" draggable="true" data-drag-folder-item="' + esc(folder) + '" data-drop-folder="' + esc(folder) + '">' +
        '<button type="button" class="sel-circle" title="Select folder" data-sel-folder-only="1" data-sel-folder="' + esc(folder) + '"></button>' +
        '<span class="chev" data-toggle-folder="' + esc(folder) + '">' + (open ? "▼" : "▶") + "</span>" +
        '<span class="name" data-toggle-folder="' + esc(folder) + '">📁 ' + esc(folder) + "</span>" +
        '<div class="tree-actions">' +
        '<button type="button" title="Download folder ZIP" data-zip-folder="' + esc(folder) + '">⬇</button>' +
        '<button type="button" class="more-btn" title="More" data-more-folder-only="1" data-more-folder="' + esc(folder) + '">⋯</button>' +
        '<button type="button" class="danger" title="Delete folder" data-del-folder="' + esc(folder) + '">🗑</button>' +
        "</div></div>" +
        '<div class="tree-children ' + (open ? "" : "hidden") + '" data-children="' + esc(folder) + '">' +
        children +
        "</div></div>";
    });

    rootNames.forEach(function (name) {
      if (fileRowFn) html += fileRowFn("", name, flashPath === name);
      else {
        html +=
          '<div class="tree-file' + (flashPath === name ? " flash" : "") + '" data-folder="" data-name="' + esc(name) + '">' +
          '<div class="tree-file-row" draggable="true" data-drag-folder="" data-drag-name="' + esc(name) + '">' +
          '<span class="name">📄 ' + esc(name) + "</span></div></div>";
      }
    });

    tree.innerHTML = html;
    if (typeof updateFilesBadge === "function") updateFilesBadge();
    if (typeof wireTreeEvents === "function") wireTreeEvents();
    tree.dispatchEvent(new CustomEvent("siftah-tree-rendered", { bubbles: true }));
  }

  function clearMarks() {
    document.querySelectorAll(".drop-before,.drop-after,.drag-source").forEach(function (el) {
      el.classList.remove("drop-before", "drop-after", "drag-source");
    });
  }

  function wireDnD() {
    var tree = document.getElementById("filesTree");
    if (!tree || tree.__ordDnD) return;
    tree.__ordDnD = true;

    tree.addEventListener("dragstart", function (e) {
      if (e.target.closest && e.target.closest("button")) {
        e.preventDefault();
        return;
      }
      var fileRow = e.target.closest && e.target.closest("[data-drag-folder][data-drag-name]");
      var folderRow = e.target.closest && e.target.closest("[data-drag-folder-item]");
      if (fileRow) {
        var d = { kind: "file", folder: fileRow.getAttribute("data-drag-folder") || "", name: fileRow.getAttribute("data-drag-name") };
        e.dataTransfer.setData("text/siftah-reorder", JSON.stringify(d));
        e.dataTransfer.setData("text/siftah-file", JSON.stringify({ folder: d.folder, name: d.name }));
        e.dataTransfer.effectAllowed = "move";
        fileRow.classList.add("drag-source");
      } else if (folderRow) {
        e.dataTransfer.setData("text/siftah-reorder", JSON.stringify({ kind: "folder", folder: folderRow.getAttribute("data-drag-folder-item") }));
        e.dataTransfer.effectAllowed = "move";
        folderRow.classList.add("drag-source");
      }
    });

    tree.addEventListener("dragend", clearMarks);

    tree.addEventListener("dragover", function (e) {
      var ft = e.target.closest && e.target.closest(".tree-file");
      var fr = e.target.closest && e.target.closest(".tree-folder-row[data-drag-folder-item]");
      if (!ft && !fr) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      clearMarks();
      var el = ft || fr;
      var rect = el.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) el.classList.add("drop-before");
      else el.classList.add("drop-after");
    });

    tree.addEventListener("drop", function (e) {
      var raw = "";
      try { raw = e.dataTransfer.getData("text/siftah-reorder"); } catch (err) {}
      if (!raw) try { raw = e.dataTransfer.getData("text/siftah-file"); } catch (err2) {}
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (err3) { return; }

      var ft = e.target.closest && e.target.closest(".tree-file");
      var fr = e.target.closest && e.target.closest(".tree-folder-row[data-drag-folder-item]");
      if (!ft && !fr) return;
      e.preventDefault();
      e.stopPropagation();
      var after = !(ft || fr).classList.contains("drop-before");
      clearMarks();

      var p = P();
      if (!p) return;
      ensureOrders(p);

      if (data.kind === "folder") {
        if (!fr) return;
        var toF = fr.getAttribute("data-drag-folder-item");
        if (!toF || toF === data.folder) return;
        p.folderOrder = ordered(p.folderOrder, Object.keys(p.folders || {}));
        moveIn(p.folderOrder, data.folder, toF, after);
        save();
        refresh();
        if (typeof showToast === "function") showToast("Folder order updated");
        return;
      }

      var fromFolder = data.folder || "";
      var fromName = data.name;
      if (!fromName) return;

      if (ft) {
        var toFolder = ft.getAttribute("data-folder") || "";
        var toName = ft.getAttribute("data-name");
        if (fromFolder === toFolder && fromName === toName) return;

        if ((fromFolder || "") !== (toFolder || "")) {
          if (typeof moveFile === "function") moveFile(fromFolder, fromName, toFolder);
          ensureOrders(p);
          if (toFolder) {
            var fo = p.folders[toFolder];
            if (fo) {
              fo.fileOrder = ordered(fo.fileOrder, Object.keys(fo.files || {}));
              moveIn(fo.fileOrder, fromName, toName, after);
            }
          } else {
            p.rootFileOrder = ordered(p.rootFileOrder, Object.keys(p.files || {}));
            moveIn(p.rootFileOrder, fromName, toName, after);
          }
        } else {
          if (fromFolder) {
            var fobj = p.folders[fromFolder];
            if (!fobj) return;
            fobj.fileOrder = ordered(fobj.fileOrder, Object.keys(fobj.files || {}));
            moveIn(fobj.fileOrder, fromName, toName, after);
          } else {
            p.rootFileOrder = ordered(p.rootFileOrder, Object.keys(p.files || {}));
            moveIn(p.rootFileOrder, fromName, toName, after);
          }
        }
        save();
        refresh();
        if (typeof showToast === "function") showToast("File order updated");
        return;
      }

      if (fr && data.kind !== "folder") {
        var dest = fr.getAttribute("data-drag-folder-item") || "";
        if ((fromFolder || "") === dest) return;
        if (typeof moveFile === "function") {
          moveFile(fromFolder, fromName, dest);
          if (typeof showToast === "function") showToast("Moved into " + dest);
        }
      }
    });
  }

  var style = document.createElement("style");
  style.textContent =
    ".tree-file.drop-before>.tree-file-row,.tree-folder-row.drop-before{box-shadow:inset 0 2px 0 var(--red)}" +
    ".tree-file.drop-after>.tree-file-row,.tree-folder-row.drop-after{box-shadow:inset 0 -2px 0 var(--red)}" +
    ".drag-source{opacity:.4}" +
    ".tree-folder-row[draggable=true],.tree-file-row[draggable=true]{cursor:grab}" +
    ".tree-folder-row[draggable=true]:active,.tree-file-row[draggable=true]:active{cursor:grabbing}";
  document.head.appendChild(style);

  function boot() {
    patchPut();
    patchRender();
    if (typeof renderFilesTree === "function") renderFilesTree();
    wireDnD();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 150); });
  else setTimeout(boot, 150);
})();
