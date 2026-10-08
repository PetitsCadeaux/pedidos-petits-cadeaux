// Helper compartido de auditoría: registra "quién hizo qué" en la tabla
// auditoria_eventos (ver sql-auditoria.sql). Nunca bloquea la acción: si el
// registro falla, el panel sigue funcionando igual.
(function(){
 const URL_BASE="https://stkfdzqwcnzievrmivaj.supabase.co";
 const KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0a2ZkenF3Y256aWV2cm1pdmFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4ODM4MzIsImV4cCI6MjEwNDQ1OTgzMn0.rMlhM8TBZhtwroF3lOwRBB8LOyRplPgZQnsUWtjptsM";

 function sesion(){
  try{return JSON.parse(localStorage.getItem("admin_session")||"null")}catch(e){return null}
 }
 function headers(s){
  return {"apikey":KEY,"Authorization":"Bearer "+s.access_token,"Content-Type":"application/json","Prefer":"return=minimal"};
 }
 async function enviar(filas){
  const s=sesion();
  if(!s||!filas.length)return;
  try{
   await fetch(URL_BASE+"/rest/v1/auditoria_eventos",{method:"POST",headers:headers(s),body:JSON.stringify(filas),keepalive:true});
  }catch(e){}
 }

 window.Audit={
  // Un evento suelto sobre un pedido (pedidoId puede ser null).
  log(pedidoId,evento,detalle){
   return enviar([{pedido_id:pedidoId==null?null:Number(pedidoId),evento,detalle:detalle||null}]);
  },
  // Impresión: "Impreso" la primera vez, "Reimpreso" las siguientes.
  async logPrint(ids){
   const s=sesion();
   ids=(ids||[]).map(Number).filter(n=>!isNaN(n));
   if(!s||!ids.length)return;
   let yaImpresos=new Set();
   try{
    const r=await fetch(URL_BASE+"/rest/v1/auditoria_eventos?pedido_id=in.("+ids.join(",")+")&evento=in.(Impreso,Reimpreso)&select=pedido_id",{headers:headers(s)});
    if(r.ok)(await r.json()).forEach(x=>yaImpresos.add(Number(x.pedido_id)));
   }catch(e){}
   return enviar(ids.map(id=>({pedido_id:id,evento:yaImpresos.has(id)?"Reimpreso":"Impreso",detalle:null})));
  },
  // Trae el historial de un pedido (más nuevo primero).
  async historial(pedidoId){
   const s=sesion();
   if(!s)return [];
   const r=await fetch(URL_BASE+"/rest/v1/auditoria_eventos?pedido_id=eq."+Number(pedidoId)+"&select=*&order=creado_en.desc&limit=200",{headers:headers(s)});
   if(!r.ok)throw new Error("No se pudo leer el historial");
   return r.json();
  },
  // Resumen de impresiones por pedido: {pedido_id:{veces,ultimoPor,ultimaVez}}
  async resumenImpresiones(){
   const s=sesion();
   if(!s)return {};
   const r=await fetch(URL_BASE+"/rest/v1/auditoria_eventos?evento=in.(Impreso,Reimpreso)&select=pedido_id,usuario_email,creado_en&order=creado_en.desc&limit=5000",{headers:headers(s)});
   if(!r.ok)return {};
   const out={};
   (await r.json()).forEach(x=>{
    const k=x.pedido_id;
    if(!out[k])out[k]={veces:0,ultimoPor:x.usuario_email,ultimaVez:x.creado_en};
    out[k].veces++;
   });
   return out;
  },
  nombreCorto(email){return String(email||"").split("@")[0]}
 };
})();
