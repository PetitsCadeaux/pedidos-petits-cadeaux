// Barra de menú compartida del panel de administración.
// Se inserta al final del <header> de cada pantalla (poné <script src="menu.js"> justo después de </header>).
(function(){
 const I=p=>'<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
 const CATS=[
  {k:"pedidos",t:"Pedidos",i:I('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 12h6M9 16h6"/>'),l:[
   ["admin.html","Panel de pedidos","pedidos"],["pedido-manual.html","Cargar pedido manual","pedido_manual"],["hoja-ruta.html","Hoja de ruta","pedidos"]]},
  {k:"catalogo",t:"Catálogo",i:I('<path d="M3 8l9-5 9 5-9 5-9-5z"/><path d="M3 8v8l9 5 9-5V8"/>'),l:[
   ["productos.html","Productos (Tienda y Regalería)","productos"]]},
  {k:"clientes",t:"Clientes",i:I('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 5a3 3 0 010 6M18 14c2 .8 3.5 2.8 3.5 5"/>'),l:[
   ["cuenta.html","Cuenta corriente","clientes"]]},
  {k:"facturacion",t:"Facturación",i:I('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),l:[
   ["facturacion.html","Facturación y cobranza","facturacion"],["facturas-emitidas.html","Facturas emitidas","facturacion"],
   ["libro-iva-compras.html","Libro IVA Compras","facturacion"],["monotributo.html","Control Monotributo","facturacion"]]},
  {k:"proveedor",t:"Proveedor",i:I('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>'),l:[
   ["facturas.html","Facturas proveedor","proveedor"],["cuenta-proveedor.html","Cuenta proveedor","proveedor"],["costos.html","Costos y márgenes","proveedor"]]},
  {k:"reportes",t:"Reportes",i:I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),l:[
   ["reporte.html","Reporte para distribuidor","reportes"],["dashboard.html","Dashboard","reportes"],["stock.html","Stock","reportes"],
   ["visitas.html","Visitas","reportes"],["auditoria.html","Auditoría","auditoria"]]},
  {k:"config",t:"Configuración",right:true,i:I('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),l:[
   ["usuarios.html","Usuarios y permisos","usuarios"],
   ["sep","Integraciones"],
   ["https://app.zipnova.com.ar","Zipnova",null,1],["https://cabifylogistics.com/ar","Cabify Logistics",null,1],
   ["https://www.oca.com.ar","OCA",null,1],["https://www.mercadopago.com.ar","Mercado Pago",null,1]]}
 ];
 const CSS='.admin-menu{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin-top:10px;position:relative}'
 +'.admin-menu-cat{position:relative}'
 +'.admin-menu-btn{padding:11px 18px;border-radius:12px;border:1px solid #ead9e8;background:#fff;color:#542477;font:600 15px Inter,Arial,sans-serif;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:9px;letter-spacing:.1px;width:auto;margin:0}'
 +'.admin-menu-btn .mi{width:18px;height:18px;flex:none}'
 +'.admin-menu-btn .car{width:6px;height:6px;border-right:1.8px solid currentColor;border-bottom:1.8px solid currentColor;transform:rotate(45deg) translate(-2px,-2px);margin-left:2px}'
 +'.admin-menu-btn.open,.admin-menu-btn:hover{background:#f5e9f6}'
 +'.admin-menu-btn.actual{background:#542477;color:#fff;border-color:#542477}'
 +'.admin-menu-drop{display:none;position:absolute;top:calc(100% + 6px);left:0;background:#fff;border:1px solid #eaddea;border-radius:14px;box-shadow:0 14px 34px rgba(84,36,119,.18);padding:7px;min-width:240px;z-index:50;text-align:left}'
 +'.admin-menu-drop.right{left:auto;right:0}'
 +'.admin-menu-drop.open{display:block}'
 +'.admin-menu-drop a{display:block;padding:11px 14px;border-radius:9px;color:#392541;font:500 14.5px Inter,Arial,sans-serif;text-decoration:none;white-space:nowrap;margin:0}'
 +'.admin-menu-drop a:hover{background:#f8edf4;color:#542477}'
 +'.admin-menu-drop a.actual{background:#f4eaf9;color:#542477;font-weight:700}'
 +'.menu-sep{padding:8px 11px 3px;font:800 10px Inter,Arial,sans-serif;color:#76657d;text-transform:uppercase;letter-spacing:.5px;border-top:1px solid #eaddea;margin-top:5px}'
 +'@media print{.admin-menu{display:none}}';
 const esc=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;");
 function build(){
  const header=document.querySelector("header");
  if(!header||document.getElementById("adminMenu"))return;
  const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);
  const pagina=location.pathname.split("/").pop()||"admin.html";
  const nav=document.createElement("nav");nav.className="admin-menu";nav.id="adminMenu";
  nav.innerHTML=CATS.map(c=>{
   const actual=c.l.some(x=>x[0]===pagina);
   return '<div class="admin-menu-cat"><button type="button" class="admin-menu-btn'+(actual?" actual":"")+'" data-cat="'+c.k+'">'+c.i+'<span>'+c.t+'</span><i class="car"></i></button>'
    +'<div class="admin-menu-drop'+(c.right?" right":"")+'" data-drop="'+c.k+'">'
    +c.l.map(x=>x[0]==="sep"?'<div class="menu-sep">'+esc(x[1])+'</div>'
      :'<a href="'+x[0]+'"'+(x[3]?' target="_blank" rel="noopener"':"")+(x[2]?' data-perm="'+x[2]+'"':"")+(x[0]===pagina?' class="actual"':"")+'>'+esc(x[1])+'</a>').join("")
    +'</div></div>';
  }).join("");
  header.appendChild(nav);
  nav.querySelectorAll(".admin-menu-btn").forEach(btn=>btn.addEventListener("click",e=>{
   e.stopPropagation();
   const drop=nav.querySelector('.admin-menu-drop[data-drop="'+btn.dataset.cat+'"]');
   const abierto=drop.classList.contains("open");
   cerrar();
   if(!abierto){drop.classList.add("open");btn.classList.add("open")}
  }));
  document.addEventListener("click",cerrar);
  function cerrar(){nav.querySelectorAll(".open").forEach(x=>x.classList.remove("open"))}
  function permisos(){
   if(!window.Perm)return;
   nav.querySelectorAll("[data-perm]").forEach(a=>{if(!Perm.can(a.getAttribute("data-perm")))a.style.display="none"});
   nav.querySelectorAll(".admin-menu-cat").forEach(cat=>{
    const ls=cat.querySelectorAll(".admin-menu-drop a[data-perm]");
    const visibles=cat.querySelectorAll(".admin-menu-drop a:not([data-perm])").length+Array.prototype.filter.call(ls,a=>a.style.display!=="none").length;
    cat.style.display=visibles?"":"none";
   });
  }
  permisos();
  if(window.Perm&&Perm.ready)Perm.ready.then(permisos);
 }
 build();
})();
