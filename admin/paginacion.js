// Paginación compartida: 20 filas por página (Pag.PER). Uso:
//   const pagina = Pag.page("clave", listaCompleta, elementoDeLaLista, funcionQueDibujaDeNuevo);
// devuelve solo las filas de la página actual y dibuja los botones "Anterior / Siguiente" debajo de la lista.
// Cuando cambia un filtro o la búsqueda, llamar Pag.reset("clave") antes de volver a dibujar.
(function(){
 const css=document.createElement("style");
 css.textContent='.pag-bar{display:flex;justify-content:center;align-items:center;gap:14px;padding:16px 0 4px;flex-wrap:wrap}'
  +'.pag-bar button{padding:9px 16px;border:1px solid #ddcde4;border-radius:13px;background:#fff;color:#654273;font:700 13px Inter,Arial,sans-serif;cursor:pointer}'
  +'.pag-bar button:disabled{opacity:.45;cursor:default}'
  +'.pag-bar span{font:500 13px Inter,Arial,sans-serif;color:#76657d}'
  +'@media print{.pag-bar{display:none}}';
 document.head.appendChild(css);
 const st={},cb={},PER=20;
 function bar(key,el){
  let b=el.nextElementSibling;
  if(!b||!b.classList||!b.classList.contains("pag-bar")||b.dataset.k!==key){
   b=document.createElement("div");b.className="pag-bar";b.dataset.k=key;
   el.parentNode.insertBefore(b,el.nextSibling);
  }
  return b;
 }
 window.Pag={
  PER:PER,
  reset(key){st[key]=1},
  page(key,arr,el,rerender,per){
   per=per||PER;
   cb[key]=rerender;
   const tp=Math.max(1,Math.ceil(arr.length/per));
   let p=st[key]||1;if(p>tp)p=tp;if(p<1)p=1;st[key]=p;
   const b=bar(key,el);
   if(tp<=1){b.innerHTML="";}
   else{
    b.innerHTML='<button type="button" '+(p<=1?"disabled":"")+' onclick="Pag.go(\''+key+'\','+(p-1)+')">‹ Anterior</button>'
     +'<span>Página '+p+' de '+tp+' · '+arr.length+' registros</span>'
     +'<button type="button" '+(p>=tp?"disabled":"")+' onclick="Pag.go(\''+key+'\','+(p+1)+')">Siguiente ›</button>';
   }
   return arr.slice((p-1)*per,p*per);
  },
  go(key,n){
   st[key]=n;
   if(cb[key])cb[key]();
   const b=document.querySelector('.pag-bar[data-k="'+key+'"]');
   const prev=b&&b.previousElementSibling;
   if(prev)prev.scrollIntoView({behavior:"smooth",block:"start"});
  }
 };
})();
