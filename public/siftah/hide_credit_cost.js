/* Hide per-reply credit cost wording outside Terms (client-side safety net). */
(function () {
  "use strict";
  function clean(text) {
    if (!text) return text;
    return String(text)
      .replace(/\s*[·•]\s*2\s*Credits?\s*per\s*(response|reply)/gi, "")
      .replace(/\s*2\s*Credits?\s*\/\s*reply/gi, "")
      .replace(/\s*·\s*2\s*per\s*response/gi, "")
      .replace(/\s*Credits available · 2 per response/gi, " Credits available")
      .replace(/This account needs 2 Credits for each (image or video request|response)\.\s*/gi, "")
      .trim();
  }
  function scrubNode(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var next = clean(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType === 1) {
      if (node.childNodes) Array.prototype.forEach.call(node.childNodes, scrubNode);
    }
  }
  function scrub() {
    var meta = document.querySelector(".model-meta");
    if (meta) meta.textContent = clean(meta.textContent);
    var ss = document.getElementById("ssCredits");
    if (ss) ss.textContent = clean(ss.textContent);
    var menu = document.getElementById("menuSuperSaiyan");
    if (menu) scrubNode(menu);
  }
  var _fetch = window.fetch;
  if (_fetch && !window.__siftahHideCreditCostFetch) {
    window.__siftahHideCreditCostFetch = true;
    window.fetch = function () {
      return _fetch.apply(this, arguments).then(function (res) {
        try {
          var clone = res.clone();
          var ct = (clone.headers && clone.headers.get && clone.headers.get("content-type")) || "";
          if (ct.indexOf("application/json") !== -1) {
            clone.json().then(function (data) {
              if (data && typeof data.error === "string" && /2\s*Credits/i.test(data.error)) {
                var newMsg = "ERROR: Insufficient credits top up to continue, it is really quite cheap, check it out!\nAdd Credits through PayPal to continue.";
                data.error = data.error
                  .replace(/This account needs 2 Credits for each image or video request\.\s*/i, newMsg)
                  .replace(/This account needs 2 Credits for each response\.\s*/i, newMsg);
              }
            }).catch(function () {});
          }
        } catch (e) {}
        return res;
      });
    };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(scrub, 400); setTimeout(scrub, 1200); });
  else { setTimeout(scrub, 400); setTimeout(scrub, 1200); }
  setInterval(scrub, 2500);
})();
