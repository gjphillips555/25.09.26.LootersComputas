/* Siftah mode model bindings v2.2 */
(function () {
  "use strict";
  // Knowledge (unrestricted): huihui-ai/Huihui-Qwen3-14B-abliterated-v2:featherless-ai
  // Coding: Qwen/Qwen3-Coder-30B-A3B-Instruct
  // Images: black-forest-labs/FLUX.1-dev (best on HF Inference Providers)

  function setCreateDefault() {
    var sel = document.getElementById("studioCreateModel");
    if (sel && !sel.getAttribute("data-bound")) {
      sel.value = "black-forest-labs/FLUX.1-dev";
      sel.setAttribute("data-bound", "1");
    }
  }

  function boot() {
    setCreateDefault();
    setTimeout(setCreateDefault, 500);
    setTimeout(setCreateDefault, 1500);
    var obs = new MutationObserver(function () {
      if (document.body.classList.contains("mode-images")) setCreateDefault();
    });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 300); });
  else setTimeout(boot, 300);
})();
