// Lógica de cobranza de clientes compartida entre "Cuenta corriente" y "Hoy"
// (así los dos muestran siempre los mismos números y el mismo texto de WhatsApp).
window.Cobr=(function(){
 const r2=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",minimumFractionDigits:0,maximumFractionDigits:2}).format(n||0);
 const fecha=iso=>new Date(iso).toLocaleDateString("es-AR",{day:"2-digit",month:"2-digit",year:"2-digit"});
 const pedidoCobrado=o=>["Efectivo","Transferencia","Mercado Pago"].includes(o.cobro)||(o.estado_pago==="Mercado Pago"&&!!o.pagado);
 // Lo que falta cobrar de un pedido (0 si ya figura cobrado)
 const faltaCobrar=o=>{
  if(o.total==null||pedidoCobrado(o))return 0;
  return Math.max(0,r2(o.total-(Number(o.cobrado_monto)||0)));
 };
 // Pedidos del cliente con algo por cobrar, del más antiguo al más nuevo
 const pedidosPorCobrar=c=>c.pedidos.filter(o=>faltaCobrar(o)>0.005).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)||a.id-b.id);
 function waNumero(t){
  let d=String(t||"").replace(/\D/g,"").replace(/^0+/,"");
  if(!d)return"";
  if(d.startsWith("54")){if(!d.startsWith("549")&&d.length===12)d="549"+d.slice(2);return d}
  if(d.length===10)return"549"+d;
  return d;
 }
 // Texto de WhatsApp con TODO lo adeudado. c = {comercios, pedidos, saldos, saldo}
 function textoRecordatorio(c){
  const pend=pedidosPorCobrar(c);
  const nombre=(c.comercios[0]||"").trim();
  const varios=c.comercios.length>1;
  const lineas=pend.map(o=>"• "+fecha(o.created_at)+(varios?" "+(o.comercio||""):"")+" – "+money(faltaCobrar(o))).join("\n");
  const saldoAnt=(c.saldos||[]).reduce((s,x)=>s+(x.monto||0),0);
  return "Hola"+(nombre?" "+nombre:"")+", ¿cómo estás?\n"
   +"Te escribimos de Petits Cadeaux para pasarte el detalle de tu cuenta:\n\n"+(lineas?lineas+"\n":"")
   +(saldoAnt>0.005?"• Saldo anterior – "+money(saldoAnt)+"\n":"")
   +"\n*Total pendiente: "+money(c.saldo)+"*\n\n"
   +"Cuando puedas, ¿nos avisás cuándo te queda cómodo abonarlo? Si ya pagaste, enviános el comprobante así registramos el pago correctamente.\n"
   +"¡Muchas gracias por tu compra y por elegirnos!";
 }
 async function copiarTexto(t){
  try{await navigator.clipboard.writeText(t);return true}catch(e){
   const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();
   let ok=false;try{ok=document.execCommand("copy")}catch(e){}ta.remove();return ok;
  }
 }
 // Abre WhatsApp con el texto; si es larguísimo para el link, lo copia para pegarlo en el chat.
 function abrirWA(num,msg){
  const url="https://wa.me/"+num+"?text="+encodeURIComponent(msg);
  if(url.length>7000){
   copiarTexto(msg).then(()=>{alert("El detalle es largo: lo copié. Pegalo en el chat de WhatsApp (se abre ahora).");window.open("https://wa.me/"+num,"_blank")});
   return;
  }
  window.open(url,"_blank");
 }
 return {r2,money,pedidoCobrado,faltaCobrar,pedidosPorCobrar,waNumero,textoRecordatorio,copiarTexto,abrirWA};
})();
