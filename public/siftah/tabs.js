/* Siftah conversation tabs — isolated chats (Chrome-style) */
(function () {
  "use strict";

  var STORAGE_KEY = "siftah_tabs_v1";
  var MAX_TABS = 12;

  function uid() {
    return "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function loadStore() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.tabs) && data.tabs.length) return data;
      }
    } catch (e) {}
    var hist = [];
    try {
      hist = JSON.parse(localStorage.getItem("siftah_history") || "[]") || [];
    } catch (e2) {}
    var id = uid();
    return {
      activeId: id,
      tabs: [{ id: id, title: "Chat 1", history: hist, created: Date.now() }]
    };
  }

  function saveStore(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      try {
        data.tabs.forEach(function (t) {
          if (t.id !== data.activeId && t.history && t.history.length > 20) {
            t.history = t.history.slice(-20);
          }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e2) {}
    }
  }

  var store = loadStore();

  function getActive() {
    return store.tabs.find(function (t) { return t.id === store.activeId; }) || store.tabs[0];
  }

  function histArr() {
    if (window.siftahHistory && Array.isArray(window.siftahHistory)) return window.siftahHistory;
    try {
      if (typeof history !== "undefined" && Array.isArray(history)) {
        window.siftahHistory = history;
        return history;
      }
    } catch (e) {}
    return null;
  }

  function syncHistoryFromGlobal() {
    var tab = getActive();
    if (!tab) return;
    var h = histArr();
    if (h) tab.history = h.slice();
  }

  function applyHistoryToGlobal(hist) {
    var h = histArr();
    if (!h) {
      console.warn("tabs: siftahHistory not ready");
      return;
    }
    h.length = 0;
    (hist || []).forEach(function (m) { h.push(m); });
  }

  function titleFromHistory(hist) {
    if (!hist || !hist.length) return null;
    for (var i = 0; i < hist.length; i++) {
      if (hist[i].role === "user" && hist[i].content) {
        var t = String(hist[i].content).replace(/\s+/g, " ").trim();
        if (t.length > 28) t = t.slice(0, 26) + "…";
        return t || null;
      }
    }
    return null;
  }

  function ensureUI() {
    if (document.getElementById("chatTabs")) return;
    var chatCol = document.querySelector(".chat-col");
    var modelBar = document.querySelector(".model-bar");
    if (!chatCol) return;

    var bar = document.createElement("div");
    bar.id = "chatTabs";
    bar.className = "chat-tabs";
    bar.innerHTML =
      '<div class="chat-tabs-scroll" id="chatTabsScroll"></div>' +
      '<button type="button" class="chat-tab-new" id="chatTabNew" title="New chat">+</button>';

    if (modelBar && modelBar.parentNode) {
      modelBar.parentNode.insertBefore(bar, modelBar.nextSibling);
    } else {
      var header = chatCol.querySelector("header");
      if (header && header.nextSibling) chatCol.insertBefore(bar, header.nextSibling);
      else chatCol.insertBefore(bar, chatCol.firstChild);
    }

    document.getElementById("chatTabNew").onclick = function () {
      newTab();
    };

    injectCSS();
    renderTabs();
  }

  function injectCSS() {
    if (document.getElementById("chatTabsCSS")) return;
    var s = document.createElement("style");
    s.id = "chatTabsCSS";
    s.textContent =
      ".chat-tabs{display:flex;align-items:stretch;gap:0;background:#0c0e12;border-bottom:1px solid var(--border);min-height:36px;flex-shrink:0}" +
      ".chat-tabs-scroll{display:flex;align-items:stretch;overflow-x:auto;flex:1;min-width:0;scrollbar-width:thin}" +
      ".chat-tabs-scroll::-webkit-scrollbar{height:4px}" +
      ".chat-tab{display:flex;align-items:center;gap:4px;max-width:220px;min-width:112px;padding:0 5px;border:none;border-right:1px solid var(--border);background:transparent;color:var(--muted);font-size:12px;font-weight:500;position:relative;height:40px;flex-shrink:0}" +
      ".chat-tab.active{background:var(--panel2);color:var(--text)}" +
      ".chat-tab.active::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--red)}" +
      ".chat-tab .tab-open{flex:1;min-width:0;height:100%;border:0;background:transparent;color:inherit;padding:0 5px;text-align:left;font:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".chat-tab .tab-rename,.chat-tab .tab-close{width:26px;height:26px;border-radius:7px;border:1px solid transparent;background:rgba(255,255,255,.045);color:#e6e9ef;font-size:13px;line-height:1;cursor:pointer;flex-shrink:0;display:grid;place-items:center;padding:0;opacity:1}" +
      ".chat-tab .tab-rename:hover{background:rgba(80,140,255,.16);border-color:rgba(80,140,255,.35);color:#fff}" +
      ".chat-tab .tab-close{background:rgba(225,29,46,.13);border-color:rgba(225,29,46,.28);color:#fff;font-size:18px;font-weight:700}" +
      ".chat-tab .tab-close:hover{background:rgba(225,29,46,.34);border-color:#ff6472;color:#fff}" +
      ".chat-tab-new{width:36px;border:none;border-left:1px solid var(--border);background:transparent;color:var(--text);font-size:18px;cursor:pointer;flex-shrink:0}" +
      ".chat-tab-new:hover{background:rgba(225,29,46,0.12);color:var(--red)}";
    document.head.appendChild(s);
  }

  function renderTabs() {
    var scroll = document.getElementById("chatTabsScroll");
    if (!scroll) return;
    scroll.innerHTML = "";
    store.tabs.forEach(function (tab) {
      var item = document.createElement("div");
      item.className = "chat-tab" + (tab.id === store.activeId ? " active" : "");
      item.title = tab.title;
      item.innerHTML =
        '<button type="button" class="tab-open" aria-label="Open conversation"></button>' +
        '<button type="button" class="tab-rename" title="Rename chat" aria-label="Rename conversation">✎</button>' +
        '<button type="button" class="tab-close" title="Close conversation" aria-label="Close conversation">×</button>';
      var openBtn = item.querySelector(".tab-open");
      openBtn.textContent = tab.title;
      openBtn.setAttribute("aria-current", tab.id === store.activeId ? "page" : "false");
      openBtn.onclick = function () { switchTab(tab.id); };
      openBtn.ondblclick = function (e) { e.preventDefault(); renameTab(tab.id); };
      var pressTimer = null;
      openBtn.addEventListener("touchstart", function () {
        pressTimer = setTimeout(function () { renameTab(tab.id); }, 600);
      }, { passive: true });
      openBtn.addEventListener("touchend", function () { clearTimeout(pressTimer); });
      openBtn.addEventListener("touchmove", function () { clearTimeout(pressTimer); });
      item.querySelector(".tab-rename").onclick = function (e) {
        e.stopPropagation();
        renameTab(tab.id);
      };
      item.querySelector(".tab-close").onclick = function (e) {
        e.stopPropagation();
        closeTab(tab.id);
      };
      scroll.appendChild(item);
    });
  }

  function switchTab(id) {
    if (id === store.activeId) return;
    syncHistoryFromGlobal();
    var auto = titleFromHistory(getActive().history);
    if (auto && !getActive().userNamed && /^Chat \d+$/.test(getActive().title)) getActive().title = auto;

    store.activeId = id;
    var tab = getActive();
    applyHistoryToGlobal(tab.history || []);
    if (typeof renderHistory === "function") renderHistory();
    saveStore(store);
    renderTabs();
  }

  function newTab() {
    if (store.tabs.length >= MAX_TABS) {
      if (typeof showToast === "function") showToast("Max " + MAX_TABS + " chats");
      return;
    }
    syncHistoryFromGlobal();
    var n = store.tabs.length + 1;
    var tab = { id: uid(), title: "Chat " + n, history: [], created: Date.now() };
    store.tabs.push(tab);
    store.activeId = tab.id;
    applyHistoryToGlobal([]);
    if (typeof renderHistory === "function") renderHistory();
    saveStore(store);
    renderTabs();
    if (typeof showToast === "function") showToast("New chat — isolated from others");
  }

  function closeTab(id) {
    if (store.tabs.length > 1) syncHistoryFromGlobal();
    if (store.tabs.length <= 1) {
      if (!confirm("Clear this chat?")) return;
      var only = store.tabs[0];
      only.history = [];
      only.title = "Chat 1";
      only.userNamed = false;
      store.activeId = only.id;
      applyHistoryToGlobal([]);
      if (typeof renderHistory === "function") renderHistory();
      saveStore(store);
      renderTabs();
      return;
    }
    var idx = store.tabs.findIndex(function (t) { return t.id === id; });
    if (idx < 0) return;
    store.tabs.splice(idx, 1);
    if (store.activeId === id) {
      var next = store.tabs[Math.max(0, idx - 1)];
      store.activeId = next.id;
      applyHistoryToGlobal(next.history || []);
      if (typeof renderHistory === "function") renderHistory();
    }
    saveStore(store);
    renderTabs();
  }

  function renameTab(id) {
    var tab = store.tabs.find(function (t) { return t.id === id; });
    if (!tab) return;
    var next = prompt("Rename this chat:", tab.title);
    if (next == null) return;
    next = String(next).replace(/\s+/g, " ").trim().slice(0, 48);
    if (!next) {
      if (typeof showToast === "function") showToast("Name can't be empty");
      return;
    }
    tab.title = next;
    tab.userNamed = true;
    saveStore(store);
    renderTabs();
    if (typeof showToast === "function") showToast('Renamed to "' + next + '"');
  }

  function patchHistoryOps() {
    if (typeof saveHistory === "function" && !saveHistory.__tabs) {
      var _save = saveHistory;
      window.saveHistory = function () {
        var r = _save.apply(this, arguments);
        syncHistoryFromGlobal();
        var tab = getActive();
        if (tab) {
          var auto = titleFromHistory(tab.history);
          if (auto && !tab.userNamed && /^Chat \d+$/.test(tab.title)) tab.title = auto;
        }
        saveStore(store);
        renderTabs();
        return r;
      };
      window.saveHistory.__tabs = true;
    }

    var clearBtn = document.getElementById("clearBtn");
    if (clearBtn && !clearBtn.__tabs) {
      clearBtn.__tabs = true;
      clearBtn.onclick = function () {
        if (!confirm("Clear this chat tab?")) return;
        applyHistoryToGlobal([]);
        var tab = getActive();
        if (tab) tab.history = [];
        if (typeof saveHistory === "function") saveHistory();
        if (typeof renderHistory === "function") renderHistory();
        saveStore(store);
        renderTabs();
        if (typeof closeSettings === "function") closeSettings();
        if (typeof showToast === "function") showToast("Chat cleared");
      };
    }
  }

  function hydrate() {
    var tab = getActive();
    if (!tab) return;
    applyHistoryToGlobal(tab.history || []);
    if (typeof renderHistory === "function") renderHistory();
  }

  function boot() {
    ensureUI();
    hydrate();
    patchHistoryOps();
    setTimeout(patchHistoryOps, 300);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 60); });
  else setTimeout(boot, 60);

  window.siftahTabs = {
    newTab: newTab,
    switchTab: switchTab,
    closeTab: closeTab,
    renameTab: renameTab,
    getStore: function () { return store; }
  };
})();
