// Asistente de pedidos (chat) de la página de pedidos de comercios/mayoristas.
// Usa la API de Anthropic (ANTHROPIC_API_KEY en Vercel). No guarda pedidos:
// solo conversa y, cuando el cliente confirma, devuelve el pedido armado y la
// página lo carga en el carrito y abre el resumen de siempre (ahí se confirma).
// Controles de gasto: tope mensual (CHAT_TOPE_USD, por defecto 10), tabla chat_uso.

const MODELO = process.env.CHAT_MODELO || "claude-haiku-4-5-20251001";
const TOPE = Number(process.env.CHAT_TOPE_USD || 10);
const MAX_MSGS = 24;
const PRECIO_IN = 1 / 1e6, PRECIO_OUT = 5 / 1e6; // USD por token (estimado, Haiku)
const SB = () => ({ url: "https://stkfdzqwcnzievrmivaj.supabase.co", key: process.env.SUPABASE_SERVICE_ROLE_KEY });
const H = () => ({ apikey: SB().key, Authorization: "Bearer " + SB().key, "Content-Type": "application/json" });
const NOMBRES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const cache = { cat: {}, dias: null };
const ips = new Map();

async function catalogo(lista) {
  const negocio = lista === 2 ? "mayorista" : "comercio";
  const c = cache.cat[negocio];
  if (c && Date.now() - c.t < 300000) return c.d;
  const r = await fetch(`${SB().url}/rest/v1/productos_catalogo?negocio=eq.${negocio}&activo=eq.true&select=nombre,precio,categoria&order=categoria.asc,nombre.asc`, { headers: H() });
  const d = r.ok ? await r.json() : [];
  cache.cat[negocio] = { t: Date.now(), d };
  return d;
}

async function cerrados() {
  if (cache.dias && Date.now() - cache.dias.t < 120000) return cache.dias.d;
  let d = {};
  try {
    const r = await fetch(`${SB().url}/rest/v1/dias_sin_entrega?select=fecha,motivo`, { headers: H() });
    if (r.ok) (await r.json()).forEach((x) => { d[x.fecha] = x.motivo || ""; });
  } catch {}
  cache.dias = { t: Date.now(), d };
  return d;
}

// Hora de Argentina (UTC-3 todo el año)
function ahoraAR() { return new Date(Date.now() - 3 * 3600000); }
function iso(d) { return d.toISOString().slice(0, 10); }
async function opcionesEntrega() {
  const cer = await cerrados(), ar = ahoraAR(), out = [];
  const base = Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate());
  for (let k = 1; k <= 35; k++) {
    const d = new Date(base + k * 86400000);
    if (![3, 5].includes(d.getUTCDay())) continue;
    const f = iso(d);
    if (cer[f] !== undefined) continue;
    const corte = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1, 23, 0, 0);
    if (ar.getTime() >= corte) continue;
    out.push({ iso: f, texto: `${NOMBRES[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}` });
  }
  return out;
}

async function uso(delta) {
  const mes = ahoraAR().toISOString().slice(0, 7);
  let fila = null;
  try { const g = await fetch(`${SB().url}/rest/v1/chat_uso?mes=eq.${mes}&select=*`, { headers: H() }); fila = g.ok ? (await g.json())[0] : null; } catch {}
  if (!delta) return { mes, costo: Number(fila?.costo_usd || 0), fila };
  const nuevo = { mes, costo_usd: Number(fila?.costo_usd || 0) + delta.costo, mensajes: Number(fila?.mensajes || 0) + 1, pedidos: Number(fila?.pedidos || 0) + (delta.pedido ? 1 : 0), actualizado: new Date().toISOString() };
  try { await fetch(`${SB().url}/rest/v1/chat_uso`, { method: "POST", headers: { ...H(), Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(nuevo) }); } catch {}
  return { mes, costo: nuevo.costo_usd };
}

const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const money = (n) => (n == null ? "a confirmar" : "$" + Math.round(n).toLocaleString("es-AR"));

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ ok: false, apagado: true, error: "sin clave" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0] || "x";
  const h = ips.get(ip) || [];
  const recientes = h.filter((t) => Date.now() - t < 3600000);
  if (recientes.length >= 40) return res.status(200).json({ ok: false, limite: true });
  recientes.push(Date.now()); ips.set(ip, recientes);

  try {
    const { messages, lista, cliente } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ ok: false });
    if (messages.length > MAX_MSGS) return res.status(200).json({ ok: false, limite: true });
    const hist = messages.slice(-MAX_MSGS).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content || "").slice(0, 1500) }));
    if (hist[hist.length - 1].role !== "user") return res.status(400).json({ ok: false });

    const u = await uso();
    if (u.costo >= TOPE) return res.status(200).json({ ok: false, apagado: true });

    const [cat, fechas] = await Promise.all([catalogo(Number(lista) === 2 ? 2 : 1), opcionesEntrega()]);
    const lineas = cat.map((p) => `- ${p.nombre} | ${p.categoria} | ${p.precio == null ? "precio a confirmar" : money(p.precio) + (Number(lista) === 2 ? " por caja" : " por unidad")}`).join("\n");
    const sistema = `Sos el asistente de pedidos de Distribuidora Petits Cadeaux (Argentina). Hablás en español rioplatense, cálido y amable (como una persona atenta de la distribuidora), breve (máximo 3 oraciones) y sin tecnicismos. Nunca uses markdown: nada de asteriscos, negritas, listas con guiones ni títulos; solo texto simple y, si querés, algún emoji suave. Atendés a comercios que compran por mayor.

Tu trabajo: ayudar a armar el pedido, dar precios del catálogo y explicar días de entrega. No inventes productos ni precios: usá SOLO este catálogo (cada línea: nombre | categoría | precio):
${lineas}

Entregas: solo miércoles y viernes. Los pedidos se toman hasta las 23 hs del día anterior. Fechas de entrega disponibles ahora (elegí solo entre estas, la primera es la próxima entrega):
${fechas.map((f) => `- ${f.texto} (${f.iso})`).join("\n") || "- (ninguna disponible: pedile que escriba por WhatsApp)"}
Si piden otro día (por ejemplo sábado) o una fecha lejana, explicá que entregamos miércoles y viernes, mencioná la próxima entrega y ofrecé las opciones.

Reglas:
- No tenemos productos sin TACC / aptos celíacos: si preguntan, decí que hoy no tenemos.
- No hables de facturación, deudas, pagos ni stock exacto: derivá a Nadia por WhatsApp.
- Si no sabés algo o piden algo fuera de esto, decí que le avisás a Nadia y que escriba por WhatsApp.
- Cuando tengas productos con cantidades y la fecha de entrega elegida, resumí en una línea y llamá a la herramienta armar_pedido. Antes de llamarla confirmá con el cliente las cantidades y la fecha si hay dudas. Nunca digas que el pedido ya fue enviado: la persona lo confirma en la pantalla de resumen.
- Cuando le pidas elegir entre fechas o productos, ofrecé siempre las opciones como respuestas rápidas. Al final de tu mensaje, podés ofrecer hasta 4 respuestas rápidas con este formato exacto en la última línea: [[opciones: Uno | Dos | Tres]]
${cliente && cliente.comercio ? `El cliente se llama "${String(cliente.comercio).slice(0, 80)}".` : ""}`;

    const tools = [{
      name: "armar_pedido",
      description: "Arma el pedido en el carrito de la página para que el cliente lo revise y confirme. Usar solo con productos del catálogo, cantidades enteras y una fecha de entrega disponible.",
      input_schema: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object", properties: { producto: { type: "string", description: "Nombre exacto del catálogo" }, cantidad: { type: "integer", minimum: 1, maximum: 999 } }, required: ["producto", "cantidad"] } },
          fecha_iso: { type: "string", description: "Fecha de entrega AAAA-MM-DD, una de las disponibles" },
          nota: { type: "string", description: "Aclaración del cliente, opcional" },
        },
        required: ["items", "fecha_iso"],
      },
    }];

    let msgs = [...hist], costo = 0, accion = null, texto = "";
    for (let ronda = 0; ronda < 3; ronda++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELO, max_tokens: 500, system: sistema, tools, messages: msgs }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error((d.error && d.error.message) || "error del modelo");
      costo += (d.usage?.input_tokens || 0) * PRECIO_IN + (d.usage?.output_tokens || 0) * PRECIO_OUT;
      const partes = d.content || [];
      texto = partes.filter((p) => p.type === "text").map((p) => p.text).join("\n").trim();
      const tu = partes.find((p) => p.type === "tool_use");
      if (!tu) break;
      // validar el pedido contra el catálogo real y las fechas
      const errores = [], items = [];
      for (const it of tu.input.items || []) {
        const prod = cat.find((p) => norm(p.nombre) === norm(it.producto));
        const q = parseInt(it.cantidad, 10);
        if (!prod) errores.push(`"${it.producto}" no está en el catálogo`);
        else if (!(q >= 1 && q <= 999)) errores.push(`cantidad inválida para ${prod.nombre}`);
        else items.push({ producto: prod.nombre, cantidad: q });
      }
      if (!items.length && !errores.length) errores.push("no hay productos");
      if (!fechas.some((f) => f.iso === tu.input.fecha_iso)) errores.push("esa fecha no está disponible");
      if (!errores.length) { accion = { tipo: "armar_pedido", items, fecha_iso: tu.input.fecha_iso, nota: String(tu.input.nota || "").slice(0, 200) }; break; }
      msgs = [...msgs, { role: "assistant", content: partes }, { role: "user", content: [{ type: "tool_result", tool_use_id: tu.id, is_error: true, content: "No se pudo armar: " + errores.join("; ") + ". Corregí con el cliente o con el catálogo." }] }];
    }
    await uso({ costo, pedido: !!accion });

    let opciones = [];
    const m = texto.match(/\[\[opciones:\s*([^\]]+)\]\]/i);
    if (m) { opciones = m[1].split("|").map((x) => x.trim()).filter(Boolean).slice(0, 4); texto = texto.replace(m[0], "").trim(); }
    texto = texto.replace(/\*\*?([^*]+)\*\*?/g, "$1").replace(/^\s*[-•]\s+/gm, "• ").trim();
    if (!texto) texto = accion ? "Listo, te armé el pedido. Revisalo y confirmalo." : "¿Me repetís lo que necesitás?";
    return res.status(200).json({ ok: true, texto, opciones, accion });
  } catch (e) {
    console.error("chat-pedidos:", e);
    return res.status(200).json({ ok: false, error: "No pude responder ahora.", diag: String((e && e.message) || e).slice(0, 160) });
  }
}
