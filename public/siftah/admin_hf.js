/* Siftah admin HF token controls — only shown when /api/siftah/chat reports isAdmin. */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var statusEl, section, input, saveBtn, clearBtn;
  var loaded = false;

  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
    else if (statusEl) statusEl.textContent = msg;
  }

  function setStatusText(text) {
    if (statusEl) statusEl.textContent = text;
  }

  async function isAdminUser() {
    try {
      var res = await fetch("/api/siftah/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      var data = await res.json().catch(function () { return {}; });
      return Boolean(data && data.isAdmin);
    } catch (e) {
      return false;
    }
  }

  async function loadTokenStatus() {
    try {
      var res = await fetch("/api/admin", { credentials: "same-origin", cache: "no-store" });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        setStatusText(data.error || "Could not load token status.");
        return;
      }
      var hf = data.hfToken || {};
      if (hf.configured) {
        setStatusText(
          "Active from " + (hf.source || "unknown") +
          (hf.hint ? " (" + hf.hint + ")" : "") +
          ". Paste a new token below to replace it."
        );
      } else {
        setStatusText("No token configured. Paste a Hugging Face token below, or set HUGGINGFACE_API_TOKEN in Vercel.");
      }
      if (clearBtn) clearBtn.disabled = hf.source !== "database";
    } catch (e) {
      setStatusText("Could not load token status.");
    }
  }

  async function saveToken() {
    var token = (input && input.value || "").trim();
    if (!token) {
      toast("Paste a Hugging Face token first.");
      return;
    }
    saveBtn.disabled = true;
    try {
      var res = await fetch("/api/admin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_hf_token", token: token }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (input) input.value = "";
      toast("HF token saved");
      await loadTokenStatus();
    } catch (e) {
      toast(e.message || "Save failed");
    } finally {
      saveBtn.disabled = false;
    }
  }

  async function clearToken() {
    if (!confirm("Clear the database HF token and fall back to env vars?")) return;
    clearBtn.disabled = true;
    try {
      var res = await fetch("/api/admin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_hf_token", clear: true }),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || "Clear failed");
      if (input) input.value = "";
      toast("DB token cleared");
      await loadTokenStatus();
    } catch (e) {
      toast(e.message || "Clear failed");
    } finally {
      clearBtn.disabled = false;
    }
  }

  async function maybeShow() {
    section = $("adminHfSection");
    statusEl = $("adminHfStatus");
    input = $("adminHfToken");
    saveBtn = $("adminHfSave");
    clearBtn = $("adminHfClear");
    if (!section) return;

    var admin = await isAdminUser();
    section.style.display = admin ? "block" : "none";
    if (!admin) return;

    if (!loaded) {
      loaded = true;
      if (saveBtn) saveBtn.addEventListener("click", function () { void saveToken(); });
      if (clearBtn) clearBtn.addEventListener("click", function () { void clearToken(); });
    }
    await loadTokenStatus();
  }

  function hookSettings() {
    var btn = $("settingsBtn");
    var menu = $("menuSettings");
    function openHook() {
      setTimeout(function () { void maybeShow(); }, 50);
    }
    if (btn) btn.addEventListener("click", openHook);
    if (menu) menu.addEventListener("click", openHook);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      hookSettings();
      setTimeout(function () { void maybeShow(); }, 800);
    });
  } else {
    hookSettings();
    setTimeout(function () { void maybeShow(); }, 800);
  }
})();
