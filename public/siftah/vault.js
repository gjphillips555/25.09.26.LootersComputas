/* On-device gallery. Free. Nothing is uploaded.
   Kept for 30 days: green while fresh, orange after 15 days, red wash in the last 24 hours. */
(function () {
  "use strict";
  var DB = "siftah_vault";
  var STORE = "files";
  var KEEP = 30 * 24 * 60 * 60 * 1000;
  var FRESH = 15 * 24 * 60 * 60 * 1000;
  var WARN = 24 * 60 * 60 * 1000;
  var dbp = null;
  var cache = [];
  var listeners = [];

  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("no idb")); return; }
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function getAll() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        r.onsuccess = function () { resolve(r.result || []); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function write(puts, dels) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, "readwrite");
        var store = t.objectStore(STORE);
        (dels || []).forEach(function (id) { store.delete(id); });
        (puts || []).forEach(function (rec) { store.put(rec); });
        t.oncomplete = function () { resolve(); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error("aborted")); };
      });
    });
  }

  function tone(item, now) {
    now = now || Date.now();
    var left = (item.deleteAt || 0) - now;
    var age = now - (item.created || now);
    if (left <= WARN) return "red";
    if (age >= FRESH || left <= FRESH) return "orange";
    return "green";
  }

  function badge(item, now) {
    now = now || Date.now();
    var left = Math.max(0, (item.deleteAt || 0) - now);
    var t = tone(item, now);
    if (t === "red") {
      var m = Math.max(1, Math.ceil(left / 60000));
      return m >= 60 ? "Deleting soon · " + Math.ceil(m / 60) + "h left" : "Deleting soon · " + m + "m left";
    }
    if (t === "orange") {
      var h = Math.max(1, Math.ceil(left / 3600000));
      return item.tight ? "Storage tight · " + h + "h left" : "Deletes in " + h + "h";
    }
    return "Just made";
  }

  function metaOf(rec) {
    return {
      id: rec.id,
      name: rec.name,
      kind: rec.kind,
      mime: rec.mime,
      prompt: rec.prompt || "",
      created: rec.created,
      deleteAt: rec.deleteAt,
      fav: !!rec.fav,
      size: rec.size || 0,
      thumb: rec.thumb || "",
      dataUrl: rec.thumb || "",
      tight: !!rec.tight
    };
  }

  function notify() {
    listeners.forEach(function (fn) { try { fn(cache); } catch (e) {} });
  }

  function softQuota() {
    var fallback = 180 * 1024 * 1024;
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(fallback);
    return navigator.storage.estimate().then(function (est) {
      if (!est || !est.quota) return fallback;
      return Math.min(est.quota * 0.4, 400 * 1024 * 1024);
    }).catch(function () { return fallback; });
  }

  function refresh() {
    return Promise.all([getAll(), softQuota()]).then(function (pair) {
      var all = pair[0];
      var quota = pair[1];
      var now = Date.now();
      var doomed = [];
      var alive = [];
      all.forEach(function (rec) {
        if (!rec || !rec.deleteAt || rec.deleteAt <= now) doomed.push(rec.id);
        else alive.push(rec);
      });
      var used = 0;
      alive.forEach(function (r) { used += r.size || (r.blob && r.blob.size) || 0; });
      var dirty = [];
      var oldest = alive.slice().sort(function (a, b) { return a.created - b.created; });
      var hard = quota * 1.2;
      oldest.forEach(function (rec) {
        if (used <= quota) return;
        var soon = now + WARN;
        if (rec.deleteAt > soon) {
          rec.deleteAt = soon;
          rec.tight = true;
          dirty.push(rec);
        }
        if (used > hard) {
          doomed.push(rec.id);
          used -= rec.size || 0;
        }
      });
      var puts = dirty.filter(function (rec) { return doomed.indexOf(rec.id) === -1; });
      var job = (doomed.length || puts.length) ? write(puts, doomed) : Promise.resolve();
      return job.then(function () {
        alive = alive.filter(function (r) { return doomed.indexOf(r.id) === -1; });
        alive.sort(function (a, b) { return b.created - a.created; });
        cache = alive.map(metaOf);
        notify();
        return cache;
      });
    }).catch(function () { return cache; });
  }

  function thumbFromBlob(blob, kind) {
    return new Promise(function (resolve) {
      var done = false;
      function finish(v) { if (done) return; done = true; resolve(v || ""); }
      var type = (blob && blob.type) || "";
      var isImg = kind === "image" || kind === "t2i" || kind === "i2i" || type.indexOf("image/") === 0;
      var isVid = kind === "video" || type.indexOf("video/") === 0;
      if (isImg) {
        var img = new Image();
        var url = URL.createObjectURL(blob);
        img.onload = function () {
          try {
            var c = document.createElement("canvas");
            var max = 240;
            var r = Math.min(max / img.width, max / img.height, 1);
            c.width = Math.max(1, Math.round(img.width * r));
            c.height = Math.max(1, Math.round(img.height * r));
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            finish(c.toDataURL("image/jpeg", 0.72));
          } catch (e) { finish(""); }
          URL.revokeObjectURL(url);
        };
        img.onerror = function () { URL.revokeObjectURL(url); finish(""); };
        img.src = url;
        setTimeout(function () { finish(""); }, 4000);
        return;
      }
      if (isVid) {
        var v = document.createElement("video");
        var u2 = URL.createObjectURL(blob);
        v.muted = true;
        v.preload = "auto";
        v.playsInline = true;
        v.onloadeddata = function () {
          try { v.currentTime = Math.min(0.25, (v.duration || 1) / 3); } catch (e) {}
        };
        v.onseeked = function () {
          try {
            var c = document.createElement("canvas");
            c.width = 240;
            c.height = 136;
            c.getContext("2d").drawImage(v, 0, 0, 240, 136);
            finish(c.toDataURL("image/jpeg", 0.72));
          } catch (e) { finish(""); }
          URL.revokeObjectURL(u2);
        };
        v.onerror = function () { URL.revokeObjectURL(u2); finish(""); };
        v.src = u2;
        setTimeout(function () { finish(""); }, 4000);
        return;
      }
      finish("");
    });
  }

  function add(blob, meta) {
    meta = meta || {};
    var now = Date.now();
    var created = meta.created || now;
    var kind = meta.kind || ((blob.type || "").indexOf("video/") === 0 ? "video" : (blob.type || "").indexOf("image/") === 0 ? "image" : "file");
    return thumbFromBlob(blob, kind).then(function (thumb) {
      var rec = {
        id: meta.id || ("v" + now.toString(36) + Math.random().toString(36).slice(2, 7)),
        name: meta.name || ("siftah-" + now),
        kind: kind,
        mime: blob.type || meta.mime || "application/octet-stream",
        prompt: meta.prompt || "",
        created: created,
        deleteAt: meta.deleteAt || (created + KEEP),
        fav: !!meta.fav,
        size: blob.size || 0,
        thumb: thumb,
        tight: false,
        blob: blob
      };
      return write([rec], []).then(function () { return refresh().then(function () { return metaOf(rec); }); });
    });
  }

  function get(id) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var r = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
        r.onsuccess = function () { resolve(r.result ? r.result.blob : null); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }

  function mutate(id, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, "readwrite");
        var store = t.objectStore(STORE);
        var r = store.get(id);
        r.onsuccess = function () {
          if (!r.result) { resolve(null); return; }
          var rec = r.result;
          fn(rec);
          store.put(rec);
        };
        t.oncomplete = function () { resolve(true); };
        t.onerror = function () { reject(t.error); };
      });
    }).then(function () { return refresh(); });
  }

  function remove(id) { return write([], [id]).then(refresh); }
  function setFav(id, fav) { return mutate(id, function (rec) { rec.fav = !!fav; }); }
  function clear() {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).clear();
        t.oncomplete = function () { resolve(); };
        t.onerror = function () { reject(t.error); };
      });
    }).then(refresh);
  }

  function extOf(name, mime) {
    if (name && name.indexOf(".") !== -1) return name;
    if ((mime || "").indexOf("png") !== -1) return name + ".png";
    if ((mime || "").indexOf("jpeg") !== -1) return name + ".jpg";
    if ((mime || "").indexOf("webp") !== -1) return name + ".webp";
    if ((mime || "").indexOf("mp4") !== -1) return name + ".mp4";
    if ((mime || "").indexOf("webm") !== -1) return name + ".webm";
    return name;
  }

  function migrate() {
    var flag = "siftah_vault_migrated";
    try { if (localStorage.getItem(flag) === "1") return Promise.resolve(); } catch (e) {}
    var raw = [];
    try { raw = JSON.parse(localStorage.getItem("siftah_gallery_v1") || "[]"); } catch (e) { raw = []; }
    if (!raw.length) {
      try { localStorage.setItem(flag, "1"); } catch (e) {}
      return Promise.resolve();
    }
    var chain = Promise.resolve();
    raw.forEach(function (item) {
      if (!item || !item.dataUrl) return;
      chain = chain.then(function () {
        return fetch(item.dataUrl).then(function (r) { return r.blob(); }).then(function (blob) {
          var created = Date.parse(item.created) || Date.now();
          return add(blob, {
            id: item.id,
            kind: item.kind || "t2i",
            prompt: item.prompt || "",
            name: "siftah-" + (item.id || Date.now()) + ".png",
            created: created,
            deleteAt: created + KEEP,
            fav: !!item.fav,
            mime: blob.type || "image/png"
          });
        }).catch(function () {});
      });
    });
    return chain.then(function () {
      try {
        localStorage.setItem(flag, "1");
        localStorage.setItem("siftah_gallery_v1", "[]");
      } catch (e) {}
    });
  }

  window.siftahVault = {
    KEEP: KEEP,
    add: add,
    list: function () { return cache.slice(); },
    get: get,
    remove: remove,
    setFav: setFav,
    clear: clear,
    refresh: refresh,
    tone: tone,
    badge: badge,
    extOf: extOf,
    onChange: function (fn) { listeners.push(fn); }
  };

  function boot() {
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
    migrate().then(refresh).catch(function () { return refresh(); });
    setInterval(function () { refresh(); }, 60000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
