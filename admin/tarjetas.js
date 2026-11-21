/* En celular, las tablas anchas se muestran como tarjetas (una por fila) en vez de scroll horizontal. */
(function(){
  var mq=window.matchMedia("(max-width:700px)");
  function marcar(){
    document.querySelectorAll("table").forEach(function(t){
      if(t.dataset.tarj||t.classList.contains("no-tarj")||t.classList.contains("resumen-pago"))return;
      var ths=t.querySelectorAll("thead th");
      if(ths.length<4)return;
      var labels=[].map.call(ths,function(h){return h.textContent.trim()});
      t.querySelectorAll("tbody tr").forEach(function(tr){
        [].forEach.call(tr.children,function(td,i){if(labels[i]&&!td.hasAttribute("data-label"))td.setAttribute("data-label",labels[i])});
      });
      t.classList.add("tarj");t.dataset.tarj="1";
    });
  }
  var timer;
  new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(function(){
    document.querySelectorAll("table[data-tarj]").forEach(function(t){delete t.dataset.tarj});marcar();
  },30)}).observe(document.documentElement,{childList:true,subtree:true});
  marcar();
})();
