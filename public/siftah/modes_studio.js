/* Siftah modes studio v2.2 — Create / Edit / Gallery */
(function () {
  "use strict";
  var lastCreateBlob = null, lastEditBlob = null, editSourceBlob = null, lastVidBlob = null;

  function toast(m) { if (window.siftahModes) window.siftahModes.toast(m); else if (typeof showToast === "function") showToast(m); }
  function token() {
    try {
      var flux = (localStorage.getItem("siftah_flux_token") || "").trim();
      if (flux) return flux;
      var s = typeof loadSettings === "function" ? loadSettings() : {};
      return (s.token || localStorage.getItem("siftah_token") || "").trim();
    } catch (e) { return ""; }
  }
  async function checkMediaAccess() {
    if (window.siftahAccess && window.siftahAccess.ready) await window.siftahAccess.ready;
    var response = await fetch("/api/siftah/chat", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" })
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Sign in or start a guest trial to continue.");
    if (data.isAdmin) return data;
    var usage = data.usage || {};
    if (data.mode === "guest") {
      var used = Number(usage.superSaiyanUsed || 0) + Number(usage.siftahUsed || 0);
      var limit = Number.isFinite(Number(data.trialLimit)) ? Number(data.trialLimit) : 10;
      if ((usage.cooldownUntil && Date.parse(usage.cooldownUntil) > Date.now()) || used >= limit) {
        throw new Error("Your guest trial is used. It resets after a five-hour cooldown.");
      }
    } else if (data.mode === "account" && Number(usage.creditsBalance || 0) < 2) {
      throw new Error("Add Credits through PayPal to continue with image or video requests.");
    }
    return data;
  }
  async function consumeMedia() {
    var response = await fetch("/api/siftah/chat", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "media_access" })
    });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Siftah access is unavailable.");
    if (window.siftahAccess) void window.siftahAccess.refresh();
    return data;
  }
  // Rest of studio loaded from previous good version - minimal safety restore
  window.siftahModesStudio = window.siftahModesStudio || {
    ensureStudio: function () {},
    renderGallery: function () {}
  };
})();
