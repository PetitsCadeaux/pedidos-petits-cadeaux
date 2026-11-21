/* Asistente de pedidos (chat) para index.html. Habla con /api/chat-pedidos.
   Cuando arma un pedido, lo carga en el carrito y abre el resumen de siempre para que el cliente confirme. */
(function(){
  var AVATAR="icon-192.png",MARCA="🤖 Pedido por chat · revisar";
  var msgs=[],abierto=false,ocupado=false,iniciado=false,enviados=0;
  var css=document.createElement("style");
  css.textContent=
  "#chFab{position:fixed;right:14px;bottom:88px;width:60px;height:60px;border-radius:50%;background:#fff;border:2px solid #a66ac7;box-shadow:0 8px 24px rgba(84,36,119,.35);padding:0;cursor:pointer;z-index:800;display:flex;align-items:center;justify-content:center}"+
  
  "#chHint{position:fixed;right:82px;bottom:104px;background:#542477;color:#fff;font:600 12.5px Poppins,Inter,Arial,sans-serif;padding:8px 12px;border-radius:12px 12px 2px 12px;z-index:800;box-shadow:0 6px 18px rgba(84,36,119,.3);max-width:200px}"+
  "#chPanel{position:fixed;right:0;bottom:0;width:min(400px,100%);height:min(640px,88vh);background:#faf5fb;border-radius:22px 22px 0 0;box-shadow:0 -10px 50px rgba(40,20,60,.35);z-index:1000;display:none;flex-direction:column;font-family:Poppins,Inter,Arial,sans-serif;overflow:hidden}"+
  "#chPanel.open{display:flex}"+
  "#chHd{background:linear-gradient(135deg,#6d3a97,#9c61c5);color:#fff;padding:12px 14px;display:flex;gap:10px;align-items:center}"+
  "#chHd .chAv{width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none}"+
  "#chHd b{font-size:15px}#chHd small{display:block;opacity:.85;font-size:11px}"+
  "#chX{margin-left:auto;background:transparent;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:4px 8px}"+
  "#chLog{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;font-size:14px}"+
  ".chm{max-width:84%;padding:9px 12px;border-radius:15px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}"+
  ".chb{background:#fff;border:1px solid #eaddea;color:#392541;border-bottom-left-radius:4px;align-self:flex-start}"+
  ".chu{background:linear-gradient(135deg,#995ac2,#71369e);color:#fff;border-bottom-right-radius:4px;align-self:flex-end}"+
  ".chq{display:flex;gap:6px;flex-wrap:wrap}"+
  ".chq button{background:#fff;border:1px solid #ddcde4;color:#654273;font:700 13px Poppins,Inter,Arial,sans-serif;padding:8px 12px;border-radius:99px;cursor:pointer}"+
  "#chIn{border-top:1px solid #eaddea;padding:10px;display:flex;gap:8px;background:#fff}"+
  "#chTxt{flex:1;border:1px solid #ddcfe1;border-radius:99px;padding:10px 14px;font:500 14px Poppins,Inter,Arial,sans-serif;min-width:0}"+
  "#chSend{width:42px;height:42px;border-radius:50%;border:0;background:#71369e;color:#fff;font-size:18px;cursor:pointer}"+
  "#chSend:disabled{opacity:.5}";
  document.head.appendChild(css);

  function $c(id){return document.getElementById(id)}
  function esc(t){return String(t).replace(/[&<>]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}
  function bot(t){var d=document.createElement("div");d.className="chm chb";d.textContent=String(t).replace(/\*\*?([^*]+)\*\*?/g,"$1");$c("chLog").appendChild(d);bajar();return d}
  function yo(t){var d=document.createElement("div");d.className="chm chu";d.textContent=t;$c("chLog").appendChild(d);bajar()}
  function bajar(){var l=$c("chLog");l.scrollTop=l.scrollHeight}
  function opciones(arr){
    quitarOpc();
    if(!arr||!arr.length)return;
    var d=document.createElement("div");d.className="chq";d.id="chOpc";
    arr.forEach(function(o){var b=document.createElement("button");b.type="button";b.textContent=o.t||o;b.onclick=function(){o.f?o.f():enviar(o)};d.appendChild(b)});
    $c("chLog").appendChild(d);bajar();
  }
  function quitarOpc(){var o=$c("chOpc");if(o)o.remove()}
  function wa(){window.open("https://wa.me/"+DESTINO_WHATSAPP,"_blank")}

  function armar(){
    var fab=document.createElement("button");fab.id="chFab";fab.type="button";fab.setAttribute("aria-label","Asistente de pedidos");
    fab.innerHTML=window.mascotaSVG(54);fab.onclick=abrir;document.body.appendChild(fab);
    var hint=document.createElement("div");hint.id="chHint";hint.textContent="¿Te ayudo con tu pedido?";hint.onclick=abrir;document.body.appendChild(hint);
    setTimeout(function(){var h=$c("chHint");if(h)h.remove()},9000);
    var p=document.createElement("div");p.id="chPanel";
    p.innerHTML='<div id="chHd"><span class="chAv">'+window.mascotaSVG(36)+'</span><div><b>Asistente Petits</b><small>Te ayudo a armar tu pedido</small></div><button id="chX" type="button" aria-label="Cerrar">×</button></div>'+
     '<div id="chLog"></div><form id="chIn"><input id="chTxt" placeholder="Escribí tu mensaje…" autocomplete="off" maxlength="400"><button id="chSend" type="submit" aria-label="Enviar">➤</button></form>';
    document.body.appendChild(p);
    $c("chX").onclick=cerrar;
    $c("chIn").onsubmit=function(e){e.preventDefault();var t=$c("chTxt").value.trim();if(t){$c("chTxt").value="";enviar(t)}};
  }
  function abrir(){
    var h=$c("chHint");if(h)h.remove();
    $c("chPanel").classList.add("open");$c("chFab").style.display="none";abierto=true;
    if(!msgs.length&&!$c("chLog").children.length){
      var n=($("shop").value||"").trim();
      bot("¡Hola"+(n?" "+n:"")+"! 👋 Soy el asistente de Petits Cadeaux. ¿Qué necesitás hoy?");
      opciones(["Quiero hacer un pedido","¿Qué precios tienen?","¿Cuándo entregan?",{t:"Hablar con Nadia",f:wa}]);
    }
    setTimeout(function(){$c("chTxt").focus()},50);
  }
  function cerrar(){$c("chPanel").classList.remove("open");$c("chFab").style.display="flex";abierto=false}

  async function enviar(texto){
    if(ocupado)return;
    if(enviados>=20){bot("Llegamos al máximo de mensajes de esta charla. Para seguir, escribile a Nadia por WhatsApp.");opciones([{t:"Abrir WhatsApp",f:wa}]);return}
    quitarOpc();yo(texto);msgs.push({role:"user",content:texto});enviados++;
    ocupado=true;$c("chSend").disabled=true;
    var esp=bot("…");
    try{
      var r=await fetch("/api/chat-pedidos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:msgs,lista:listaActiva,cliente:{comercio:($("shop").value||"").trim()}})});
      var d=await r.json();
      esp.remove();
      if(!d.ok){
        bot(d.apagado||d.limite?"Por ahora no puedo atender por acá. Escribile a Nadia por WhatsApp y te ayuda enseguida.":"No pude responder ahora. Probá de nuevo en un momento o escribile a Nadia por WhatsApp."+(d.diag?"\n("+d.diag+")":""));
        opciones([{t:"Abrir WhatsApp",f:wa}]);
      }else{
        msgs.push({role:"assistant",content:d.texto+(d.accion?" [armé el pedido en el carrito]":"")});
        bot(d.texto);
        if(d.accion)aplicar(d.accion);else opciones(d.opciones);
      }
    }catch(e){esp.remove();bot("Se cortó la conexión. Probá de nuevo.")}
    ocupado=false;$c("chSend").disabled=false;
  }

  function aplicar(a){
    selectedQty=Array(PRODUCTS.length).fill(0);
    var faltan=[];
    a.items.forEach(function(it){
      var i=PRODUCTS.findIndex(function(p){return p[0].toLowerCase()===it.producto.toLowerCase()});
      if(i<0)faltan.push(it.producto);else selectedQty[i]=Math.min(999,it.cantidad);
    });
    render();
    if(faltan.length){bot("No encontré en la lista: "+faltan.join(", ")+". Decime cómo seguimos.");return}
    renderOpcionesEntrega();
    if(!OPCIONES_ENTREGA.some(function(o){return o.iso===a.fecha_iso})){bot("Esa fecha ya no está disponible. Elegí otra y lo armo de nuevo.");return}
    $("delivery").value=a.fecha_iso;fechaConfirmada=a.fecha_iso;
    var prev=($("notes").value||"").replace(/^🤖[^\n]*\n?/,"").trim();
    $("notes").value=MARCA+(a.nota?"\n"+a.nota:"")+(prev?"\n"+prev:"");
    var falta=!$("shop").value.trim()||!$("phone").value.trim()||!$("address").value.trim()||!$("paymentMethod").value;
    cerrar();
    if(falta){
      mostrarDatos(true);
      show("Armé tu pedido. Completá tus datos y tocá «Revisar y enviar pedido».",true);
      $("shop").scrollIntoView({behavior:"smooth",block:"center"});
    }else enviar_pedido();
  }
  function enviar_pedido(){window.enviar()}

  window.chatInit=function(){if(iniciado)return;
    try{if(/[?&]chat=1/.test(location.search))localStorage.setItem('chat_activo','1');if(/[?&]chat=0/.test(location.search))localStorage.removeItem('chat_activo');if(localStorage.getItem('chat_activo')!=='1')return}catch(e){return}
    iniciado=true;armar()};
  var ac=document.getElementById("appContent");
  if(ac&&getComputedStyle(ac).display!=="none")window.chatInit();
})();
