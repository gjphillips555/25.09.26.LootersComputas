/* Siftah Google / Firebase auth */
(function () {
  "use strict";

  var FB_KEY = "siftah_firebase_config";
  var USER_KEY = "siftah_user";
  var FB_VERSION = "10.14.1";
  var app = null;
  var auth = null;
  var currentUser = null;
  var loading = false;

  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
    else console.log("[siftah-auth]", msg);
  }

  function parseConfig(raw) {
    if (!raw || !String(raw).trim()) return null;
    var text = String(raw).trim();
    var brace = text.indexOf("{");
    var end = text.lastIndexOf("}");
    if (brace >= 0 && end > brace) text = text.slice(brace, end + 1);
    text = text.replace(/,\s*([}\]])/g, "$1");
    var cfg;
    try {
      cfg = JSON.parse(text);
    } catch (e) {
      try {
        cfg = JSON.parse(
          text
            .replace(/(['"])?([a-zA-Z0-9_]+)\1\s*:/g, '"$2":')
            .replace(/'/g, '"')
        );
      } catch (e2) {
        return null;
      }
    }
    if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.authDomain) return null;
    return {
      apiKey: String(cfg.apiKey).trim(),
      authDomain: String(cfg.authDomain).trim(),
      projectId: String(cfg.projectId).trim(),
      storageBucket: cfg.storageBucket ? String(cfg.storageBucket).trim() : undefined,
      messagingSenderId: cfg.messagingSenderId ? String(cfg.messagingSenderId).trim() : undefined,
      appId: cfg.appId ? String(cfg.appId).trim() : undefined,
      measurementId: cfg.measurementId ? String(cfg.measurementId).trim() : undefined
    };
  }

  function loadConfig() {
    try {
      var raw = localStorage.getItem(FB_KEY);
      if (!raw) return null;
      return parseConfig(raw);
    } catch (e) {
      return null;
    }
  }

  function saveConfig(cfg) {
    if (!cfg) {
      localStorage.removeItem(FB_KEY);
      return;
    }
    localStorage.setItem(FB_KEY, JSON.stringify(cfg));
  }

  function saveConfigFromTextarea() {
    var el = document.getElementById("firebaseConfig");
    if (!el) return loadConfig();
    var raw = el.value.trim();
    if (!raw) {
      saveConfig(null);
      return null;
    }
    var cfg = parseConfig(raw);
    if (!cfg) {
      toast("Invalid Firebase config — need apiKey, authDomain, projectId");
      return loadConfig();
    }
    saveConfig(cfg);
    return cfg;
  }

  function fillTextarea() {
    var el = document.getElementById("firebaseConfig");
    if (!el) return;
    var cfg = loadConfig();
    if (cfg) el.value = JSON.stringify(cfg, null, 2);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureFirebase() {
    if (window.firebase && window.firebase.auth) return Promise.resolve();
    var base = "https://www.gstatic.com/firebasejs/" + FB_VERSION + "/";
    return loadScript(base + "firebase-app-compat.js").then(function () {
      return loadScript(base + "firebase-auth-compat.js");
    });
  }

  function initApp(cfg) {
    return ensureFirebase().then(function () {
      if (!window.firebase) throw new Error("Firebase SDK missing");
      try {
        if (firebase.apps && firebase.apps.length) {
          app = firebase.app();
        } else {
          app = firebase.initializeApp(cfg);
        }
      } catch (e) {
        try {
          app = firebase.app();
        } catch (e2) {
          throw e;
        }
      }
      auth = firebase.auth();
      try {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      } catch (e) {}
      return auth;
    });
  }

  function friendlyError(err) {
    var code = (err && err.code) || "";
    var msg = (err && err.message) || String(err || "Unknown error");
    if (code === "auth/popup-blocked")
      return "Popup blocked — allow popups for this site, or try again";
    if (code === "auth/popup-closed-by-user")
      return "Sign-in cancelled";
    if (code === "auth/unauthorized-domain")
      return "Domain not allowed — in Firebase Console → Authentication → Settings → Authorized domains, add: " + location.hostname;
    if (code === "auth/operation-not-allowed")
      return "Google sign-in is disabled — enable Google in Firebase → Authentication → Sign-in method";
    if (code === "auth/configuration-not-found" || code === "auth/invalid-api-key")
      return "Bad Firebase config — check apiKey / projectId";
    if (code === "auth/network-request-failed")
      return "Network error — check connection";
    if (code === "auth/internal-error")
      return "Auth internal error — confirm Google provider is enabled and domain is authorized";
    return msg.replace("Firebase: ", "").slice(0, 160);
  }

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  }

  function updateUI(user) {
    currentUser = user || null;
    try {
      if (user) localStorage.setItem(USER_KEY, JSON.stringify({
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "",
        photoURL: user.photoURL || ""
      }));
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}

    var signedOut = document.getElementById("menuSignedOut");
    var signedIn = document.getElementById("menuSignedIn");
    var chip = document.getElementById("userChip");
    var btn = document.getElementById("btnGoogleSignIn");

    if (user) {
      if (signedOut) signedOut.style.display = "none";
      if (signedIn) signedIn.style.display = "block";
      var nameEl = document.getElementById("menuDisplayName");
      var emailEl = document.getElementById("menuEmail");
      var av = document.getElementById("menuAvatar");
      if (nameEl) nameEl.textContent = user.displayName || "Signed in";
      if (emailEl) emailEl.textContent = user.email || user.uid;
      if (av) {
        if (user.photoURL) {
          av.src = user.photoURL;
          av.style.display = "";
        } else {
          av.removeAttribute("src");
          av.style.display = "none";
        }
      }
      if (chip) {
        chip.style.display = "flex";
        var un = document.getElementById("userName");
        var ua = document.getElementById("userAvatar");
        if (un) un.textContent = (user.displayName || user.email || "User").split(" ")[0];
        if (ua && user.photoURL) ua.src = user.photoURL;
      }
      if (btn) btn.disabled = false;
    } else {
      if (signedOut) signedOut.style.display = "block";
      if (signedIn) signedIn.style.display = "none";
      if (chip) chip.style.display = "none";
      if (btn) btn.disabled = false;
    }
  }

  function signIn() {
    if (loading) return;
    var cfg = saveConfigFromTextarea() || loadConfig();
    if (!cfg) {
      toast("Sign-in needs Firebase config in Settings — or just use as guest");
      return;
    }
    loading = true;
    var btn = document.getElementById("btnGoogleSignIn");
    if (btn) {
      btn.disabled = true;
      btn.dataset.label = btn.dataset.label || btn.innerHTML;
      btn.innerHTML = "Signing in…";
    }
    initApp(cfg)
      .then(function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        provider.addScope("profile");
        provider.addScope("email");
        return auth.signInWithPopup(provider).catch(function (err) {
          if (
            err.code === "auth/popup-blocked" ||
            err.code === "auth/operation-not-supported-in-this-environment" ||
            isMobile()
          ) {
            toast("Opening Google sign-in…");
            return auth.signInWithRedirect(provider);
          }
          throw err;
        });
      })
      .then(function (result) {
        if (result && result.user) {
          updateUI(result.user);
          toast("Signed in as " + (result.user.displayName || result.user.email || "user"));
          if (typeof closeMenu === "function") closeMenu();
        }
      })
      .catch(function (err) {
        console.warn("signIn error", err);
        toast(friendlyError(err));
      })
      .finally(function () {
        loading = false;
        if (btn) {
          btn.disabled = false;
          if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
        }
      });
  }

  function signOut() {
    if (!auth) {
      updateUI(null);
      toast("Signed out");
      return;
    }
    auth.signOut()
      .then(function () {
        updateUI(null);
        toast("Signed out");
        if (typeof closeMenu === "function") closeMenu();
      })
      .catch(function (err) {
        toast(friendlyError(err));
      });
  }

  function patchSettings() {
    if (typeof openSettings === "function" && !openSettings.__auth) {
      var _open = openSettings;
      window.openSettings = function () {
        var r = _open.apply(this, arguments);
        fillTextarea();
        return r;
      };
      window.openSettings.__auth = true;
    }
    if (typeof applySettingsFromUI === "function" && !applySettingsFromUI.__auth) {
      var _apply = applySettingsFromUI;
      window.applySettingsFromUI = function () {
        var r = _apply.apply(this, arguments);
        saveConfigFromTextarea();
        var cfg = loadConfig();
        if (cfg) {
          initApp(cfg).then(function () {
            return auth.getRedirectResult();
          }).catch(function () {});
        }
        return r;
      };
      window.applySettingsFromUI.__auth = true;
    }
  }

  function wireButtons() {
    var guestBtn = document.getElementById("btnContinueGuest");
    if (guestBtn && !guestBtn.__auth) {
      guestBtn.__auth = true;
      guestBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof closeMenu === "function") closeMenu();
        toast("Using as guest — no sign-in needed");
      });
    }
    var signInBtn = document.getElementById("btnGoogleSignIn");
    if (signInBtn && !signInBtn.__auth) {
      signInBtn.__auth = true;
      signInBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        signIn();
      });
    }
    var outBtn = document.getElementById("btnSignOut");
    if (outBtn && !outBtn.__auth) {
      outBtn.__auth = true;
      outBtn.addEventListener("click", function (e) {
        e.preventDefault();
        signOut();
      });
    }
  }

  function boot() {
    wireButtons();
    patchSettings();
    fillTextarea();

    var cfg = loadConfig();
    if (!cfg) {
      updateUI(null);
      return;
    }
    initApp(cfg)
      .then(function () {
        return auth.getRedirectResult().then(function (result) {
          if (result && result.user) {
            updateUI(result.user);
            toast("Signed in as " + (result.user.displayName || result.user.email || "user"));
          }
        }).catch(function (err) {
          if (err && err.code !== "auth/argument-error") {
            console.warn("redirect result", err);
            toast(friendlyError(err));
          }
        });
      })
      .then(function () {
        auth.onAuthStateChanged(function (user) {
          updateUI(user);
        });
      })
      .catch(function (err) {
        console.warn("auth boot", err);
        updateUI(null);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 120); });
  } else {
    setTimeout(boot, 120);
  }

  window.siftahAuth = {
    signIn: signIn,
    signOut: signOut,
    getUser: function () { return currentUser; },
    loadConfig: loadConfig,
    saveConfigFromTextarea: saveConfigFromTextarea
  };
})();
