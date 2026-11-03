/* Siftah welcome, trial and Credits promotion overlays. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var LOGIN = "/login?callbackURL=%2Fsiftah%2F";
  var CREDIT_URL = "/siftah/credits.html?code=SIFTAH10";
  function addStyle() {
    if ($("siftahEngagementCSS")) return;
    var style = document.createElement("style");
    style.id = "siftahEngagementCSS";
    style.textContent =
      ".se-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px)}" +
      ".se-card{position:relative;width:min(570px,100%);background:linear-gradient(145deg,#17151d,#09090d 70%);border:1px solid #ff2938;border-radius:20px;box-shadow:0 0 0 1px #ff293866,0 0 42px #e11d2e55;color:#fff;overflow:hidden;padding:25px;text-align:center}" +
      ".se-close{position:absolute;right:12px;top:10px;width:36px;height:36px;border:1px solid #6a3038;border-radius:50%;background:#1a1115;color:#fff;font-size:23px;cursor:pointer;z-index:2}" +
      ".se-art{height:150px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;position:relative}.se-bot{font-size:98px;filter:drop-shadow(0 0 18px #e11d2e)}" +
      ".se-kicker{font-size:12px;letter-spacing:.18em;color:#ff7c85;font-weight:900;text-transform:uppercase}.se-title{font-size:clamp(27px,6vw,40px);line-height:1.06;margin:7px 0 10px;font-weight:950}.se-title span{color:#ff303e}.se-offer{font-size:clamp(24px,5vw,34px);font-weight:1000;color:#ffd84d;text-shadow:0 2px 14px #ff5a00}.se-code{display:inline-block;border:2px dashed #ffd84d;border-radius:9px;padding:8px 20px;margin:12px auto 15px;font-weight:950;letter-spacing:.1em;font-size:21px;color:#fff}.se-copy{color:#c8c4ce;max-width:440px;margin:8px auto 18px;line-height:1.5}.se-cta{display:block;width:100%;border:0;border-radius:11px;padding:14px 18px;background:linear-gradient(135deg,#ff303d,#a90011);color:#fff;font-size:16px;font-weight:900;cursor:pointer}.se-secondary{display:block;width:100%;margin-top:9px;padding:12px;border:1px solid #49434e;border-radius:11px;background:#17151d;color:#fff;font-weight:800;cursor:pointer}.se-small{font-size:11px;color:#9994a2;margin-top:12px}.se-links{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}.se-links a{color:#ff8c95;font-weight:800;text-decoration:none}.se-welcome .se-art{height:95px}.se-welcome .se-bot{font-size:64px}.se-card a.se-cta{text-decoration:none;box-sizing:border-box}";
    document.head.appendChild(style);
  }
  function remove(id) { var el = $(id); if (el) el.remove(); }
  function showOffer(afterClose) {
    remove("siftahOfferPopup");
    var overlay = document.createElement("div");
    overlay.id = "siftahOfferPopup";
    overlay.className = "se-overlay";
    overlay.innerHTML =
      '<section class="se-card" role="dialog" aria-modal="true" aria-labelledby="seOfferTitle">' +
        '<button class="se-close" id="seOfferClose" aria-label="Close offer">×</button>' +
        '<div class="se-art"><div class="se-bot" aria-hidden="true">🤖</div></div>' +
        '<div class="se-kicker">Looters Computas presents</div>' +
        '<h2 class="se-title" id="seOfferTitle"><span>Siftah Mobile</span><br>Power up your ideas</h2>' +
        '<div class="se-offer">GET 10% OFF CREDITS</div>' +
        '<div class="se-code">SIFTAH10</div>' +
        '<p class="se-copy">Top up your Credits and keep chatting, coding with Dexter, and creating with Da Vinci.</p>' +
        '<a class="se-cta" href="' + CREDIT_URL + '">Buy Credits with 10% off</a>' +
        '<div class="se-small">Enter code SIFTAH10 at checkout. Offer applies to eligible Siftah Credit packages.</div>' +
      '</section>';
    document.body.appendChild(overlay);
    $("seOfferClose").onclick = function () { remove("siftahOfferPopup"); if (afterClose) afterClose(); };
    overlay.addEventListener("click", function (e) { if (e.target === overlay) { remove("siftahOfferPopup"); if (afterClose) afterClose(); } });
  }
  function showWelcome() {
    if ($("siftahWelcomePopup")) return;
    var overlay = document.createElement("div");
    overlay.id = "siftahWelcomePopup";
    overlay.className = "se-overlay";
    overlay.innerHTML =
      '<section class="se-card se-welcome" role="dialog" aria-modal="true" aria-labelledby="seWelcomeTitle">' +
        '<button class="se-close" id="seWelcomeClose" aria-label="Close welcome">×</button>' +
        '<div class="se-art"><div class="se-bot" aria-hidden="true">🤖</div></div>' +
        '<div class="se-kicker">Welcome to the Looters community</div>' +
        '<h2 class="se-title" id="seWelcomeTitle">Sign in to unlock <span>everything</span></h2>' +
        '<p class="se-copy">Not yet a member? Sign up and enjoy all the features of Looters Computas, Siftah Message, Siftah Musik, Looters Arcade and much more across the Marketplace and Community.</p>' +
        '<a class="se-cta" href="' + LOGIN + '">Sign in / Sign up with Google or email</a>' +
        '<button class="se-secondary" id="seStartTrial" type="button">Start your free trial</button>' +
        '<div class="se-small">Use the same Looters account across the marketplace and Siftah. Email sign-up can use Proton Mail.</div>' +
      '</section>';
    document.body.appendChild(overlay);
    $("seWelcomeClose").onclick = function () { remove("siftahWelcomePopup"); };
    overlay.addEventListener("click", function (e) { if (e.target === overlay) remove("siftahWelcomePopup"); });
    $("seStartTrial").onclick = async function () {
      this.disabled = true; this.textContent = "Starting your trial…";
      try {
        if (window.siftahAccess && window.siftahAccess.startGuest) await window.siftahAccess.startGuest();
        if (window.siftahAccess && window.siftahAccess.refresh) await window.siftahAccess.refresh();
        remove("siftahWelcomePopup");
        if (typeof window.showToast === "function") window.showToast("Your Siftah guest trial is ready.");
      } catch (error) {
        this.disabled = false; this.textContent = "Start your free trial";
        if (typeof window.showToast === "function") window.showToast(error.message || "Guest trial could not start.");
      }
    };
  }
  function wireSettings() {
    var trial = $("btnStartTrial");
    if (trial && !trial.__seWired) {
      trial.__seWired = true;
      trial.addEventListener("click", async function () {
        trial.disabled = true;
        try {
          if (window.siftahAccess && window.siftahAccess.startGuest) await window.siftahAccess.startGuest();
          if (window.siftahAccess && window.siftahAccess.refresh) await window.siftahAccess.refresh();
          if (typeof window.showToast === "function") window.showToast("Your guest trial is ready.");
        } catch (e) {
          if (typeof window.showToast === "function") window.showToast(e.message || "Trial could not start.");
        } finally { trial.disabled = false; }
      });
    }
  }
  async function boot() {
    addStyle(); wireSettings();
    var state = null;
    try {
      if (window.siftahAccess && window.siftahAccess.ready) state = await window.siftahAccess.ready;
      else if (window.siftahAccess && window.siftahAccess.refresh) state = await window.siftahAccess.refresh();
    } catch (e) {}
    showOffer(function () { if (!state || state.mode !== "account") showWelcome(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 900); });
  else setTimeout(boot, 900);
})();