/* Super Saiyan Premium — paid persona for the existing Siftah Mobile app */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var PACKAGES = [
    { id: "starter", label: "40 Credits · NZ$4.99" },
    { id: "standard", label: "100 Credits · NZ$9.99" },
    { id: "premium", label: "200 Credits · NZ$19.99" }
  ];
  var signedIn = false;
  var balance = 0;
  var busy = false;
  var captureStarted = false;

  function toast(message) {
    if (typeof window.showToast === "function") window.showToast(message);
    else console.log("[Super Saiyan]", message);
  }

  function injectBar() {
    if ($("superSaiyanBar")) return;
    var bar = document.createElement("section");
    bar.id = "superSaiyanBar";
    bar.innerHTML =
      '<div><strong>⚡ Super Saiyan Premium</strong> <span id="ssCredits">Checking Looters Credits…</span></div>' +
      '<div class="ss-actions">' +
        '<a id="ssLogin" href="/login?callbackURL=%2Fsiftah" style="display:none">Sign in to Looters</a>' +
        '<button type="button" id="ssBuyToggle">Buy Credits</button>' +
      '</div>' +
      '<div class="ss-buy-menu" id="ssBuyMenu">' +
        PACKAGES.map(function (pack) {
          return '<button type="button" data-ss-package="' + pack.id + '">' + pack.label + '</button>';
        }).join("") +
      '</div>';
    var tabs = $("modeTabs");
    if (tabs && tabs.parentNode) tabs.parentNode.insertBefore(bar, tabs.nextSibling);
    else {
      var modelBar = document.querySelector(".model-bar");
      if (modelBar && modelBar.parentNode) modelBar.parentNode.insertBefore(bar, modelBar.nextSibling);
    }

    $("ssBuyToggle").onclick = function () {
      $("ssBuyMenu").classList.toggle("open");
    };
    $("ssBuyMenu").querySelectorAll("[data-ss-package]").forEach(function (button) {
      button.addEventListener("click", function () {
        buyCredits(button.getAttribute("data-ss-package"));
      });
    });
  }

  function showStatus(message, needsLogin) {
    var el = $("ssCredits");
    if (el) el.textContent = message;
    var login = $("ssLogin");
    if (login) login.style.display = needsLogin ? "inline-flex" : "none";
    var buy = $("ssBuyToggle");
    if (buy) buy.style.display = needsLogin ? "none" : "inline-flex";
  }

  async function refreshStatus() {
    injectBar();
    try {
      var response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" })
      });
      var data = await response.json().catch(function () { return {}; });
      if (response.status === 401) {
        signedIn = false;
        balance = 0;
        showStatus("Sign in to your Looters account to unlock paid access.", true);
        return;
      }
      if (!response.ok) throw new Error(data.error || "Could not load Credits.");
      signedIn = data.mode === "account";
      balance = Number(data.usage && data.usage.creditsBalance || 0);
      showStatus(balance + " Credits available · 2 per response", !signedIn);
    } catch (error) {
      showStatus(error && error.message ? error.message : "Credits status unavailable.", true);
    }
  }

  async function buyCredits(packageId) {
    if (!packageId || busy) return;
    busy = true;
    toast("Opening secure PayPal checkout…");
    try {
      var response = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: packageId })
      });
      var data = await response.json().catch(function () { return {}; });
      if (response.status === 401) {
        window.location.assign("/login?callbackURL=%2Fsiftah");
        return;
      }
      if (!response.ok || !data.approvalUrl) throw new Error(data.error || "Could not start PayPal checkout.");
      window.location.assign(data.approvalUrl);
    } catch (error) {
      toast(error && error.message ? error.message : "PayPal checkout failed.");
    } finally {
      busy = false;
    }
  }

  async function capturePayPalReturn() {
    var params = new URLSearchParams(window.location.search);
    var result = params.get("paypal");
    if (result === "cancelled") {
      if (captureStarted) return;
      captureStarted = true;
      window.history.replaceState(null, "", "/siftah/?mode=super-saiyan");
      toast("PayPal checkout cancelled.");
      if (window.siftahModes) window.siftahModes.setMode("super-saiyan");
      return;
    }
    if (result !== "success" || captureStarted) return;
    captureStarted = true;
    var orderId = params.get("token");
    if (!orderId) {
      toast("PayPal returned without an order ID.");
      return;
    }
    toast("Confirming your PayPal payment…");
    try {
      var response = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderId })
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || "Payment capture failed.");
      toast("Credits added to your Looters account.");
      await refreshStatus();
    } catch (error) {
      toast(error && error.message ? error.message : "Could not confirm PayPal payment.");
    } finally {
      window.history.replaceState(null, "", "/siftah/?mode=super-saiyan");
      if (window.siftahModes) window.siftahModes.setMode("super-saiyan");
    }
  }

  async function send(text) {
    var input = $("input");
    var sendButton = $("send");
    var value = String(text || "").trim();
    if (!value || !sendButton || sendButton.disabled) return;
    if (busy) return;

    busy = true;
    window.lastUserMessage = value;
    if (typeof window.addMessage === "function") window.addMessage("user", value);
    if (input) {
      input.value = "";
      if (typeof window.resizeInput === "function") window.resizeInput();
    }
    sendButton.disabled = true;

    var messages = $("messages");
    var typing = document.createElement("div");
    typing.className = "message assistant";
    var avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = "⚡";
    var wrap = document.createElement("div");
    wrap.className = "bubble-wrap";
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.innerHTML = '<span class="typing"><i class="dot"></i><i class="dot"></i><i class="dot"></i></span>';
    wrap.appendChild(bubble);
    typing.append(avatar, wrap);
    messages.appendChild(typing);
    $("chat").scrollTop = $("chat").scrollHeight;

    try {
      var historyItems = Array.isArray(window.siftahHistory) ? window.siftahHistory : [];
      var history = historyItems.slice(-12).map(function (item) {
        return { role: item.role, content: item.content };
      });
      var response = await fetch("/api/siftah/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", persona: "super-saiyan", messages: history })
      });
      var data = await response.json().catch(function () { return {}; });
      if (response.status === 401) {
        showStatus("Sign in to your Looters account to unlock paid access.", true);
        throw new Error("Sign in to Looters to use Super Saiyan Premium.");
      }
      if (!response.ok) {
        if (data.usage && typeof data.usage.creditsBalance === "number") {
          balance = data.usage.creditsBalance;
          showStatus(balance + " Credits available · 2 per response", false);
        }
        throw new Error(data.error || "Super Saiyan could not complete that request.");
      }
      if (!data.reply) throw new Error("The model returned an empty response.");
      typing.remove();
      if (typeof window.addMessage === "function") window.addMessage("assistant", data.reply);
      if (typeof window.autoAddFromReply === "function") window.autoAddFromReply(data.reply);
      if (data.usage && typeof data.usage.creditsBalance === "number") {
        balance = data.usage.creditsBalance;
        showStatus(balance + " Credits available · 2 per response", false);
      } else {
        await refreshStatus();
      }
    } catch (error) {
      typing.remove();
      if (typeof window.addMessage === "function") {
        window.addMessage("assistant", "Error: " + (error && error.message ? error.message : "Super Saiyan request failed."), true, true);
      }
    } finally {
      busy = false;
      sendButton.disabled = false;
      if (input) input.focus();
      refreshStatus();
    }
  }

  function onModeChange(mode) {
    if (mode === "super-saiyan") refreshStatus();
  }

  function boot() {
    injectBar();
    var params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "super-saiyan" && window.siftahModes) {
      window.siftahModes.setMode("super-saiyan");
    }
    capturePayPalReturn();
    if (window.siftahModes && window.siftahModes.getMode() === "super-saiyan") refreshStatus();
  }

  window.siftahSuperSaiyan = {
    send: send,
    refreshStatus: refreshStatus,
    onModeChange: onModeChange,
    buyCredits: buyCredits
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 300); });
  } else {
    setTimeout(boot, 300);
  }
  setTimeout(boot, 900);
})();
