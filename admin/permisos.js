// Permisos del panel: pregunta a /api/admin-usuarios qué puede hacer quien está logueado.
// - Oculta elementos con data-perm="..." si no tiene ese permiso (data-perm="usuarios" = solo administración general).
// - Bloquea páginas enteras según su nombre de archivo.
// Si el servidor no responde, NO bloquea (el control real está en el servidor para facturar y crear envíos).
(function(){
 const PAGINAS={
  "admin.html":"pedidos","pedido-imprimir.html":"pedidos","pedido-manual.html":"pedido_manual","hoja-ruta.html":"pedidos",
  "productos.html":"productos","cuenta.html":"clientes","estado-cuenta.html":"clientes",
  "facturas-emitidas.html":"facturacion","libro-iva-compras.html":"facturacion","monotributo.html":"facturacion",
  "facturas.html":"proveedor","cuenta-proveedor.html":"proveedor","costos.html":"proveedor",
  "reporte.html":"reportes","dashboard.html":"reportes","stock.html":"reportes","visitas.html":"reportes",
  "auditoria.html":"auditoria","usuarios.html":"usuarios"
 };
 function sesion(){try{return JSON.parse(localStorage.getItem("admin_session")||"null")}catch(e){return null}}
 const estado={cargado:false,rol:"admin",permisos:null,email:null,nombre:null};
 function puede(p){
  if(!estado.cargado)return true;
  if(p==="usuarios")return estado.rol==="admin";
  if(estado.rol==="admin")return true;
  return (estado.permisos||[]).indexOf(p)>=0;
 }
 function aplicar(){
  document.querySelectorAll("[data-perm]").forEach(function(el){
   if(!puede(el.getAttribute("data-perm")))el.style.display="none";
  });
  document.querySelectorAll(".admin-menu-cat").forEach(function(cat){
   const links=cat.querySelectorAll(".admin-menu-drop a");
   if(links.length&&Array.prototype.every.call(links,function(a){return a.style.display==="none"}))cat.style.display="none";
  });
  const pagina=location.pathname.split("/").pop()||"admin.html";
  const need=PAGINAS[pagina];
  if(need&&!puede(need)&&sesion()){
   document.body.innerHTML='<div style="max-width:420px;margin:80px auto;padding:24px;text-align:center;font-family:Poppins,Arial,sans-serif;color:#392541">'
    +'<div style="font-size:42px">🔒</div><h2>No tenés permiso para esta sección</h2>'
    +'<p style="color:#76657d">Pedile acceso a la administración general.</p>'
    +'<a href="admin.html" style="color:#865a8e;font-weight:700">← Volver al panel</a></div>';
  }
 }
 async function cargar(){
  const s=sesion();
  if(!s){return}
  try{
   const c=JSON.parse(sessionStorage.getItem("perm_cache")||"null");
   if(c&&c.email===s.email&&Date.now()-c.t<300000){Object.assign(estado,c.d,{cargado:true});return}
  }catch(e){}
  try{
   const r=await fetch("/api/admin-usuarios",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+s.access_token},body:JSON.stringify({accion:"me"})});
   const d=await r.json();
   if(d&&d.ok){
    const datos={rol:d.rol,permisos:d.permisos,email:d.email,nombre:d.nombre};
    Object.assign(estado,datos,{cargado:true});
    try{sessionStorage.setItem("perm_cache",JSON.stringify({email:s.email,t:Date.now(),d:datos}))}catch(e){}
   }
  }catch(e){}
 }
 const lista=[];
 window.Perm={
  can:puede,
  info:estado,
  limpiarCache(){try{sessionStorage.removeItem("perm_cache")}catch(e){}},
  recargar(){this.limpiarCache();return cargar().then(aplicar)},
  ready:null
 };
 window.Perm.ready=cargar().then(aplicar);
 document.addEventListener("DOMContentLoaded",aplicar);
})();
