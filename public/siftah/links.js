/* Open real web URLs from chat instead of in-app Not Found routes */
(function () {
  "use strict";

  var FILE_EXT = {
    js:1,mjs:1,cjs:1,ts:1,tsx:1,jsx:1,py:1,css:1,html:1,htm:1,json:1,md:1,txt:1,
    png:1,jpg:1,jpeg:1,gif:1,svg:1,webp:1,sh:1,bash:1,go:1,rs:1,c:1,h:1,cpp:1,
    java:1,xml:1,yml:1,yaml:1,toml:1,lock:1,map:1
  };

  var AMP = "&" + "amp;";
  var LT = "&" + "lt;";
  var GT = "&" + "gt;";
  var QUOT = "&" + "quot;";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, AMP)
      .replace(/</g, LT)
      .replace(/>/g, GT)
      .replace(/"/g, QUOT);
  }

  function normalizeUrl(raw) {
    if (!raw) return null;
    var href = String(raw).trim().split(AMP).join("&");
    if (/^(javascript|data|blob):/i.test(href)) return null;
    if (href.indexOf("<") !== -1) return null;
    if (href.indexOf("www.") === 0) href = "https://" + href;
    if (href.indexOf("//") === 0) href = "https:" + href;
    if (/^https?:\/\//i.test(href)) return href;
    var m = href.match(/^((?:[a-z0-9-]+\.)+[a-z]{2,})([\/?#].*)?$/i);
    if (!m) return null;
    var tld = m[1].split(".").pop().toLowerCase();
    if (FILE_EXT[tld]) return null;
    return "https://" + href;
  }

  function anchor(url, label) {
    var safe = String(url).split('"').join(QUOT);
    return '<a href="' + safe + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + "</a>";
  }

  function formatInlineFixed(text) {
    var codes = [];
    var links = [];
    var s = String(text == null ? "" : text);
    s = s.replace(/`([^`\n]+)`/g, function (_, c) {
      codes.push(c);
      return "\u0000C" + (codes.length - 1) + "\u0000";
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, url) {
      var n = normalizeUrl(url);
      if (!n) return "[" + label + "](" + url + ")";
      links.push({ label: label, url: n });
      return "\u0000L" + (links.length - 1) + "\u0000";
    });
    s = s.replace(/(https?:\/\/[^\s<>"'`]+|www\.[^\s<>"'`]+)/gi, function (raw) {
      var href = raw;
      var trail = "";
      var m = href.match(/[.,;:!?)]+$/);
      if (m) {
        trail = m[0];
        href = href.slice(0, -trail.length);
        raw = raw.slice(0, -trail.length);
      }
      var n = normalizeUrl(href);
      if (!n) return raw + trail;
      links.push({ label: raw, url: n });
      return "\u0000L" + (links.length - 1) + "\u0000" + trail;
    });
    s = escapeHtml(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\u0000C(\d+)\u0000/g, function (_, i) {
      return '<code class="inline">' + escapeHtml(codes[+i]) + "</code>";
    });
    s = s.replace(/\u0000L(\d+)\u0000/g, function (_, i) {
      var L = links[+i];
      return anchor(L.url, L.label);
    });
    return s;
  }

  function urlFromAnchor(a) {
    var href = a.getAttribute("href") || "";
    var fromHref = normalizeUrl(href);
    if (fromHref) return fromHref;
    var text = (a.textContent || "").trim().replace(/^\u2B07\s*(Download\s*[\u00B7\u2022]\s*)?/i, "");
    return normalizeUrl(text);
  }

  function onClick(e) {
    var a = e.target && e.target.closest ? e.target.closest("a") : null;
    if (!a) return;
    if (a.hasAttribute("download")) return;
    var url = urlFromAnchor(a);
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    var opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
  }

  function boot() {
    try { window.formatInline = formatInlineFixed; } catch (e) {}
    if (typeof addMessage === "function" && !addMessage.__links) {
      var orig = addMessage;
      window.addMessage = function (role, content, save, isError) {
        var bubble = orig.apply(this, arguments);
        if (role === "user" && bubble && !isError) bubble.innerHTML = formatInlineFixed(content);
        return bubble;
      };
      window.addMessage.__links = true;
    }
    document.addEventListener("click", onClick, true);
    if (typeof renderHistory === "function") {
      try { renderHistory(); } catch (err) {}
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }
})();
