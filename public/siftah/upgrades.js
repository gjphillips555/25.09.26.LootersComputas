/* Siftah upgrades v1.9 — stream, regen, chips, shortcuts, empty-retry */
(function () {
  "use strict";

  function toast(m) {
    if (typeof showToast === "function") showToast(m);
  }

  function injectCSS() {
    if (document.getElementById("upgCSS")) return;
    var s = document.createElement("style");
    s.id = "upgCSS";
    s.textContent =
      ".msg-toolbar{display:flex;gap:4px;margin-top:6px;opacity:0;transition:opacity .15s}" +
      ".message:hover .msg-toolbar,.message:focus-within .msg-toolbar{opacity:1}" +
      ".msg-toolbar button{background:transparent;border:1px solid var(--border,#2a2e38);color:var(--muted,#8b909a);" +
      "border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer}" +
      ".msg-toolbar button:hover{border-color:var(--red,#e11d2e);color:var(--text,#eee)}" +
      ".prompt-chips{display:flex;gap:6px;flex-wrap:wrap;padding:6px 10px 0;max-width:100%}" +
      ".prompt-chips button{background:#12151c;border:1px solid var(--border,#2a2e38);color:var(--muted,#8b909a);" +
      "border-radius:999px;padding:4px 10px;font-size:11px;cursor:pointer;white-space:nowrap}" +
      ".prompt-chips button:hover{border-color:var(--red,#e11d2e);color:var(--text,#eee)}" +
      ".composer-meta{font-size:10px;color:var(--muted,#8b909a);padding:2px 12px 0;text-align:right}" +
      ".bubble.streaming::after{content:\"▌\";animation:blink 1s step-end infinite;margin-left:2px;color:var(--red,#e11d2e)}" +
      "@keyframes blink{50%{opacity:0}}" +
      "@media (max-width:700px){.msg-toolbar{opacity:.85}}";
    document.head.appendChild(s);
  }

  function getHistory() {
    try {
      if (window.siftahHistory && Array.isArray(window.siftahHistory)) return window.siftahHistory;
      if (typeof history !== "undefined" && Array.isArray(history)) return history;
    } catch (e) {}
    return [];
  }

  function approxTokens(text) {
    return Math.max(1, Math.ceil((text || "").length / 4));
  }

  function wireComposerMeta() {
    var input = document.getElementById("input");
    if (!input || document.getElementById("composerMeta")) return;
    var meta = document.createElement("div");
    meta.id = "composerMeta";
    meta.className = "composer-meta";
    meta.textContent = "0 tok";
    var wrap = document.querySelector(".composer-wrap");
    if (wrap) wrap.appendChild(meta);
    function upd() {
      meta.textContent = approxTokens(input.value) + " tok \u00b7 Enter send \u00b7 Shift+Enter newline \u00b7 \u2318/Ctrl+Enter send";
    }
    input.addEventListener("input", upd);
    upd();
  }

  function wireChips() {
    return;
  }

  function attachToolbar(wrap, role, content) {
    if (!wrap || wrap.querySelector(".msg-toolbar")) return;
    var bar = document.createElement("div");
    bar.className = "msg-toolbar";
    var copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = function () {
      navigator.clipboard.writeText(content || "").then(
        function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy"; }, 1000);
        },
        function () { toast("Copy failed"); }
      );
    };
    bar.appendChild(copyBtn);
    if (role === "assistant") {
      var regen = document.createElement("button");
      regen.type = "button";
      regen.textContent = "Regen";
      regen.title = "Regenerate last reply";
      regen.onclick = function () { regenerateLast(); };
      bar.appendChild(regen);
      var cont = document.createElement("button");
      cont.type = "button";
      cont.textContent = "Continue";
      cont.title = "Ask model to continue";
      cont.onclick = function () {
        var input = document.getElementById("input");
        if (input) {
          input.value = "Continue from where you left off. Complete any unfinished code.";
          if (typeof sendMessage === "function") sendMessage();
        }
      };
      bar.appendChild(cont);
    }
    if (role === "user") {
      var edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.onclick = function () {
        var input = document.getElementById("input");
        if (input) {
          input.value = content || "";
          input.focus();
          if (typeof resizeInput === "function") resizeInput();
          toast("Edit then send");
        }
      };
      bar.appendChild(edit);
    }
    var bubbleWrap = wrap.querySelector(".bubble-wrap") || wrap;
    bubbleWrap.appendChild(bar);
  }

  function patchAddMessage() {
    if (typeof addMessage !== "function" || addMessage.__upg) return;
    var orig = addMessage;
    window.addMessage = function (role, content, save, isError) {
      var before = document.querySelectorAll(".message").length;
      var r = orig.apply(this, arguments);
      try {
        var nodes = document.querySelectorAll(".message");
        var last = nodes[nodes.length - 1];
        if (last && nodes.length > before) attachToolbar(last, role, content);
      } catch (e) {}
      return r;
    };
    window.addMessage.__upg = true;
  }

  function regenerateLast() {
    var hist = getHistory();
    if (!hist.length) {
      toast("Nothing to regenerate");
      return;
    }
    while (hist.length && hist[hist.length - 1].role === "assistant") hist.pop();
    var lastUser = null;
    for (var i = hist.length - 1; i >= 0; i--) {
      if (hist[i].role === "user") {
        lastUser = hist[i].content;
        break;
      }
    }
    if (!lastUser) {
      toast("No user message to regenerate");
      return;
    }
    if (hist.length && hist[hist.length - 1].role === "user") hist.pop();
    var nodes = document.querySelectorAll(".message.assistant");
    if (nodes.length) nodes[nodes.length - 1].remove();
    var input = document.getElementById("input");
    if (input) input.value = lastUser;
    toast("Regenerating\u2026");
    if (typeof sendMessage === "function") sendMessage();
  }

  function parseSSEChunk(buffer) {
    var lines = buffer.split("\n");
    var leftover = "";
    var text = "";
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (i === lines.length - 1 && !buffer.endsWith("\n")) {
        leftover = line;
        break;
      }
      line = line.trim();
      if (!line || line.indexOf("data:") !== 0) continue;
      var payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        var j = JSON.parse(payload);
        var delta = j.choices && j.choices[0] && (j.choices[0].delta || j.choices[0].message);
        if (delta && delta.content) text += delta.content;
        else if (j.choices && j.choices[0] && j.choices[0].text) text += j.choices[0].text;
      } catch (e) {}
    }
    return { text: text, leftover: leftover };
  }

  function enableStreaming() {
    if (typeof sendMessage !== "function") return;
    if (sendMessage.__streamUpg) return;
    var prev = sendMessage;
    window.sendMessage = async function () {
      var input = document.getElementById("input");
      var sendBtn = document.getElementById("send");
      var text = input && input.value.trim();
      if (!text || (sendBtn && sendBtn.disabled)) return;

      var local = window.siftahEnh && window.siftahEnh.isLocal && window.siftahEnh.isLocal();
      var s = typeof loadSettings === "function" ? loadSettings() : {};
      if (!local && !s.token) {
        return prev.apply(this, arguments);
      }

      var _fetch = window.fetch;
      var streamedAnswer = "";
      var streamOk = false;
      var bubbleEl = null;

      window.fetch = function (url, opts) {
        opts = opts || {};
        try {
          var body = JSON.parse(opts.body || "{}");
          body.stream = true;
          opts.body = JSON.stringify(body);
        } catch (e) {}
        return _fetch.call(this, url, opts).then(async function (res) {
          var ct = (res.headers.get("content-type") || "").toLowerCase();
          if (!res.ok || (!ct.includes("text/event-stream") && !ct.includes("stream"))) {
            var txt = await res.text();
            return new Response(txt, { status: res.status, headers: { "Content-Type": "application/json" } });
          }
          streamOk = true;
          var reader = res.body.getReader();
          var dec = new TextDecoder();
          var buf = "";
          var typing = document.querySelector(".message.assistant .bubble .typing");
          if (typing) {
            bubbleEl = typing.closest(".bubble");
            if (bubbleEl) {
              bubbleEl.classList.add("streaming");
              bubbleEl.innerHTML = "";
            }
          }
          while (true) {
            var chunk = await reader.read();
            if (chunk.done) break;
            buf += dec.decode(chunk.value, { stream: true });
            var parsed = parseSSEChunk(buf);
            buf = parsed.leftover;
            if (parsed.text) {
              streamedAnswer += parsed.text;
              if (bubbleEl && typeof formatRich === "function") {
                bubbleEl.innerHTML = formatRich(streamedAnswer);
              } else if (bubbleEl) {
                bubbleEl.textContent = streamedAnswer;
              }
              var chat = document.getElementById("chat");
              if (chat) chat.scrollTop = chat.scrollHeight;
            }
          }
          var fake = JSON.stringify({
            choices: [{ message: { role: "assistant", content: streamedAnswer } }]
          });
          return new Response(fake, { status: 200, headers: { "Content-Type": "application/json" } });
        });
      };

      try {
        await prev.apply(this, arguments);
        if (streamOk && bubbleEl) {
          bubbleEl.classList.remove("streaming");
          var nodes = document.querySelectorAll(".message.assistant");
          if (nodes.length) attachToolbar(nodes[nodes.length - 1], "assistant", streamedAnswer);
          if (streamedAnswer && typeof autoAddFromReply === "function") {
            try { autoAddFromReply(streamedAnswer); } catch (e) {}
          }
        }
        if (streamOk && !streamedAnswer) {
          toast("Empty stream \u2014 retrying once\u2026");
          window.fetch = _fetch;
          if (input) input.value = text;
          await prev.apply(this, arguments);
        }
      } finally {
        window.fetch = _fetch;
      }
    };
    window.sendMessage.__streamUpg = true;
    if (prev.__enh) window.sendMessage.__enh = true;
  }

  function wireShortcuts() {
    if (document.__siftahShortcuts) return;
    document.__siftahShortcuts = true;
    document.addEventListener("keydown", function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        if (typeof sendMessage === "function") sendMessage();
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        var input = document.getElementById("input");
        if (input) input.focus();
      }
      if (e.key === "Escape") {
        var ov = document.getElementById("overlay");
        if (ov && ov.classList.contains("open") && typeof closeSettings === "function") closeSettings();
        var menu = document.getElementById("menuOverlay");
        if (menu && menu.classList.contains("open")) menu.classList.remove("open");
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        regenerateLast();
      }
    });
  }

  function boot() {
    injectCSS();
    wireChips();
    wireComposerMeta();
    patchAddMessage();
    wireShortcuts();
    setTimeout(enableStreaming, 300);
    setTimeout(enableStreaming, 800);
    setTimeout(patchAddMessage, 500);
    document.querySelectorAll(".message").forEach(function (el) {
      var role = el.classList.contains("user") ? "user" : "assistant";
      var bubble = el.querySelector(".bubble");
      attachToolbar(el, role, bubble ? bubble.innerText : "");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 200); });
  } else {
    setTimeout(boot, 200);
  }

  window.siftahUpgrades = { regenerateLast: regenerateLast };
})();
