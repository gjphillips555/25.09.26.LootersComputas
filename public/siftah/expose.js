/* expose shared state from app.js let-bindings */
(function(){
  try {
    if (typeof project !== "undefined") window.project = project;
  } catch(e) {}
  try {
    if (typeof history !== "undefined" && Array.isArray(history)) window.siftahHistory = history;
  } catch(e) {}
})();
