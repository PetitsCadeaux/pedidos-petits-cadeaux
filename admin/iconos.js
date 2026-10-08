// Reemplaza los emojis de las pantallas del admin por íconos simples de línea (mismo color que el texto).
// Funciona sobre todo el texto de la página, incluso el que se arma después con JavaScript.
(function(){
 const P={
  ok:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  no:'<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  print:'<path d="M6 9V3h12v6"/><path d="M6 18H4v-7h16v7h-2"/><path d="M7 14h10v7H7z"/>',
  receipt:'<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  down:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
  factory:'<path d="M3 21V9l6 4V9l6 4V5h4v16z"/>',
  store:'<path d="M4 9l1-5h14l1 5"/><path d="M4 9h16v11H4z"/><path d="M10 20v-6h4v6"/>',
  file:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  filetext:'<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  cart:'<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M3 4h3l2.5 11h9.5l2-8H7"/>',
  box:'<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  pencil:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  pin:'<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  gift:'<rect x="3" y="8" width="18" height="4"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8s-1-4-4-4a2 2 0 000 4M12 8s1-4 4-4a2 2 0 010 4"/>',
  truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  ban:'<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  card:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  brief:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/>',
  coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4"/>',
  bank:'<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
  book:'<path d="M5 4h12a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M5 18a2 2 0 012-2h12"/>',
  clip:'<path d="M20 11l-8 8a5 5 0 01-7-7l8-8a3.5 3.5 0 015 5l-8 8a2 2 0 01-3-3l7-7"/>',
  spark:'<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
 };
 const M={"✅":"ok","❌":"no","⚠":"warn","🖨":"print","🧾":"receipt","⬇":"down","📅":"cal","🔍":"search","🔎":"search","🏭":"factory","🏪":"store",
  "📄":"file","📜":"filetext","🛒":"cart","📦":"box","📝":"pencil","✏":"pencil","✍":"pencil","📍":"pin","➕":"plus","🎁":"gift","🚚":"truck","⛔":"ban",
  "🏷":"tag","⏳":"clock","📞":"phone","💳":"card","💬":"chat","💼":"brief","💰":"coin","🏦":"bank","📒":"book","📎":"clip","✨":"spark",
  "👁":"eye","🙈":"eyeoff","🗑":"trash","🕵":"eye"};
 const RE=/(?:[\u{1F300}-\u{1FAFF}✅❌⚠⛔⬇⏳✍✏➕✨])️?/gu;
 const css=document.createElement("style");
 css.textContent='.ic{display:inline-block;width:1.1em;height:1.1em;vertical-align:-.17em;margin-right:.3em;flex:none}'
  +'.ic svg{width:100%;height:100%;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}';
 document.head.appendChild(css);
 const key=e=>e.replace(/️/g,"");
 const svg=n=>'<span class="ic"><svg viewBox="0 0 24 24">'+P[n]+'</svg></span>';
 const limpiar=t=>t.replace(RE,"").replace(/^\s+/,"");
 function nodo(t){
  const txt=t.nodeValue;
  if(!RE.test(txt)){RE.lastIndex=0;return}
  RE.lastIndex=0;
  const padre=t.parentNode;
  if(!padre)return;
  const tag=padre.nodeName;
  if(tag==="SCRIPT"||tag==="STYLE"||tag==="TEXTAREA"||tag==="TITLE"||(padre.closest&&padre.closest(".ic")))return;
  if(tag==="OPTION"||tag==="BUTTON"&&false){t.nodeValue=limpiar(txt);return}
  const html=txt.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(RE,m=>{const n=M[key(m)];return n?svg(n):""});
  const tmp=document.createElement("span");tmp.innerHTML=html;
  const frag=document.createDocumentFragment();
  while(tmp.firstChild)frag.appendChild(tmp.firstChild);
  padre.replaceChild(frag,t);
 }
 function atributos(el){
  ["placeholder","title","aria-label"].forEach(a=>{
   const v=el.getAttribute&&el.getAttribute(a);
   if(v&&RE.test(v)){el.setAttribute(a,limpiar(v))}
   RE.lastIndex=0;
  });
 }
 function recorrer(raiz){
  if(raiz.nodeType===3){nodo(raiz);return}
  if(raiz.nodeType!==1)return;
  if(raiz.classList&&raiz.classList.contains("ic"))return;
  atributos(raiz);
  const w=document.createTreeWalker(raiz,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT,null);
  const lista=[];let n;
  while((n=w.nextNode())){if(n.nodeType===3)lista.push(n);else atributos(n)}
  lista.forEach(nodo);
 }
 function iniciar(){
  recorrer(document.body);
  new MutationObserver(ms=>{
   ms.forEach(m=>{
    if(m.type==="characterData"){nodo(m.target);return}
    m.addedNodes.forEach(n=>recorrer(n));
   });
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
 }
 if(document.body)iniciar();else document.addEventListener("DOMContentLoaded",iniciar);
})();
