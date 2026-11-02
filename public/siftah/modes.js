/* Siftah modes loader v2.2 */
(function(){
  function load(src, next){
    var s=document.createElement("script");
    s.src=src; s.onload=function(){ if(next) next(); };
    s.onerror=function(){ console.error("Failed", src); if(next) next(); };
    document.head.appendChild(s);
  }
  load("./modes_core.js", function(){
    load("./modes_studio.js", function(){
      load("./modes_history.js", function(){
        load("./modes_models.js");
      });
    });
  });
})();
