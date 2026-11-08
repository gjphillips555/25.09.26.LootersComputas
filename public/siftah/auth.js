/* Siftah access — shares the Looters Computas account and server-enforced guest trial. */
(function () {
  "use strict";
  var API = "/api/siftah/chat";
  var $ = function (id) { return document.getElementById(id); };

  function post(body) {
    return fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  function ensureStatusBar() {
    var existing = $("siftahTrialStatus");
    if (existing) return existing;
    var bar = document.createElement("div");
    bar.id = "siftahTrialStatus";
    bar.style.cssText = "padding:7px 12px;background:#111318;border-bottom:1px solid rgba(255,255,255,.08);color:#aeb4c0;font-size:11px;line-height:1.4";
    var modelBar = document.querySelector(".model-bar");
    if (modelBar && modelBar.parentNode) modelBar.parentNode.insertBefore(bar, modelBar.nextSibling);
    return bar;
  }

  function formatCooldown(value) {
    var ms = Date.parse(value || "");
    if (!Number.isFinite(ms)) return "5 hours";
    var left = Math.max(0, ms - Date.now());
    var hours = Math.floor(left / 3600000);
    var minutes = Math.ceil((left % 3600000) / 60000);
    return hours ? hours + "h " + minutes + "m" : minutes + "m";
  }

  function updateIdentity(data) {
    var signedIn = data && data.mode === "account";
    var out = $("menuSignedOut");
    var inside = $("menuSignedIn");
    if (out) out.style.display = signedIn ? "none" : "block";
    if (inside) inside.style.display = signedIn ? "block" : "none";
    if (signedIn) {
      var user = data.user || {};
      var displayName = user.name || "Member";
      var roleLabel = user.role === "admin" ? "Admin" : "Member";
      if ($("menuDisplayName")) $("menuDisplayName").textContent = displayName;
      if ($("menuEmail")) $("menuEmail").textContent = user.email || "Shared marketplace and Siftah login";
      if ($("userChip")) $("userChip").style.display = "flex";
      if ($("userName")) $("userName").textContent = roleLabel;
      var avatarEl = $("userAvatar");
      if (avatarEl) {
        if (user.image) {
          avatarEl.src = user.image;
          avatarEl.style.display = "block";
        } else {
          avatarEl.style.display = "none";
        }
      }
      var menuAvatar = $("menuAvatar");
      if (menuAvatar) {
        if (user.image) {
          menuAvatar.src = user.image;
          menuAvatar.style.display = "block";
        } else {
          menuAvatar.style.display = "none";
        }
      }
    } else if ($("userChip")) {
      $("userChip").style.display = "none";
    }
  }

  function updateStatus(data) {
    updateIdentity(data);
    var usage = data && data.usage || {};
    var isAdmin = Boolean(data && data.isAdmin);
    var mode = data && data.mode;
    var balance = Number(usage.creditsBalance || 0);
    var text;
    if (isAdmin) {
      text = "Administrator access · unlimited";
    } else if (mode === "guest") {
      var used = Number(usage.superSaiyanUsed || 0) + Number(usage.siftahUsed || 0);
      var cooldown = usage.cooldownUntil;
      if (cooldown && Date.parse(cooldown) > Date.now()) {
        text = "Guest trial used · resets in " + formatCooldown(cooldown);
      } else {
        text = "Guest trial · " + Math.max(0, (Number.isFinite(Number(data.trialLimit)) ? Number(data.trialLimit) : 10) - used) + " replies remaining · five-hour reset";
      }
    } else if (mode === "account") {
      text = balance > 0
        ? balance + " Credits available · 2 per response"
        : "Signed in · purchase Credits to continue using Siftah";
    } else {
      text = "Sign in or continue as a guest to use Siftah";
    }
    var bar = ensureStatusBar();
    if (bar) bar.textContent = text;
  }

  async function refresh() {
    try {
      var response = await post({ action: "status" });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) {
        var bar = ensureStatusBar();
        if (bar) bar.textContent = data.error || "Siftah access status is unavailable.";
        return null;
      }
      updateStatus(data);
      if (window.siftahSuperSaiyan) void window.siftahSuperSaiyan.refreshStatus();
      return data;
    } catch (error) {
      var bar = ensureStatusBar();
      if (bar) bar.textContent = "Siftah access status is temporarily unavailable.";
      return null;
    }
  }

  async function startGuest() {
    var response = await post({ action: "guest" });
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error || "Guest access is unavailable.");
    return refresh();
  }

  function wire() {
    var guest = $("btnContinueGuest");
    if (guest && !guest.__siftahAccess) {
      guest.__siftahAccess = true;
      guest.addEventListener("click", function () {
        startGuest().then(function () {
          if (typeof closeMenu === "function") closeMenu();
        }).catch(function (error) {
          if (typeof showToast === "function") showToast(error.message || "Guest access unavailable.");
        });
      });
    }
    var signOut = $("btnSignOut");
    if (signOut && !signOut.__siftahAccess) {
      signOut.__siftahAccess = true;
      signOut.addEventListener("click", async function () {
        signOut.disabled = true;
        try {
          var response = await fetch("/api/auth/sign-out", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
          });
          if (!response.ok) throw new Error("Sign-out rejected");
          // Clear any local guest state and force a hard reload so the cookie is gone
          try { localStorage.removeItem("siftah_guest"); } catch (e) {}
          window.location.replace("/siftah/");
        } catch (error) {
          signOut.disabled = false;
          if (typeof showToast === "function") showToast("Sign out failed. Please try again.");
        }
      });
    }
  }

  wire();
  var ready = startGuest().catch(function () { return refresh(); });
  window.siftahAccess = { ready: ready, refresh: refresh, startGuest: startGuest };
})();
