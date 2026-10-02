// Emite la Factura C (CAE) de un pedido contra ARCA (WSFE) y guarda el
// resultado en el propio pedido. Se llama desde el botón "Facturar" del
// panel de comprobantes.
//
// Usa SUPABASE_SERVICE_ROLE_KEY (nunca expuesta al navegador) para leer y
// actualizar el pedido directamente, sin depender de la sesión del usuario.
import { solicitarCAE } from "../lib/arca.js";

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en Vercel");
  return { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
}

async function obtenerPedido(id) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/pedidos_distribuidora?id=eq." + encodeURIComponent(id) + "&select=*", {
    headers: supabaseHeaders()
  });
  const rows = await r.json();
  if (!r.ok) throw new Error("Error al buscar el pedido: " + JSON.stringify(rows));
  return Array.isArray(rows) ? rows[0] : null;
}

async function guardarFactura(id, datos) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/pedidos_distribuidora?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({
      factura_cae: datos.cae,
      factura_cae_vencimiento: formatearFecha(datos.caeVencimiento),
      factura_tipo: datos.cbteTipo,
      factura_pto_vta: datos.ptoVta,
      factura_nro: datos.nro,
      factura_cuit_cliente: datos.cuitCliente || null,
      factura_cliente_razon_social: datos.razonSocial || null,
      factura_cliente_domicilio: datos.domicilioFiscal || null,
      factura_cliente_condicion_iva: datos.condicionIva || null,
      facturado_en: datos.facturadoEn
    })
  });
  if (!r.ok) throw new Error("La factura se autorizó pero no se pudo guardar en el pedido: " + (await r.text()));
}

function formatearFecha(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return yyyymmdd.slice(0, 4) + "-" + yyyymmdd.slice(4, 6) + "-" + yyyymmdd.slice(6, 8);
}

function limpiarCuit(cuit) {
  if (!cuit) return null;
  const digits = String(cuit).replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const { pedido_id, cuit_cliente, razon_social, domicilio_fiscal, condicion_iva } = req.body || {};
    if (!pedido_id) return res.status(200).json({ ok: false, error: "Falta pedido_id" });

    const pedido = await obtenerPedido(pedido_id);
    if (!pedido) return res.status(200).json({ ok: false, error: "No se encontró el pedido" });

    // Idempotencia: si ya tiene CAE, no volvemos a facturar (evitaría
    // generar un comprobante duplicado y desperdiciar un número).
    if (pedido.factura_cae) {
      return res.status(200).json({
        ok: true,
        ya_facturado: true,
        cae: pedido.factura_cae,
        cae_vencimiento: pedido.factura_cae_vencimiento,
        nro: pedido.factura_nro,
        pto_vta: pedido.factura_pto_vta,
        facturado_en: pedido.facturado_en,
        razon_social: pedido.factura_cliente_razon_social,
        domicilio_fiscal: pedido.factura_cliente_domicilio,
        cuit_cliente: pedido.factura_cuit_cliente,
        condicion_iva: pedido.factura_cliente_condicion_iva
      });
    }

    if (pedido.total == null) {
      return res.status(200).json({ ok: false, error: "El pedido no tiene un total definido, no se puede facturar" });
    }

    const cuitCliente = limpiarCuit(cuit_cliente);
    const razonSocial = razon_social ? String(razon_social).trim() : null;
    const domicilioFiscal = domicilio_fiscal ? String(domicilio_fiscal).trim() : null;
    const condicionIva = condicion_iva ? String(condicion_iva).trim() : null;
    const resultado = await solicitarCAE({ total: Number(pedido.total), cuitCliente });
    const facturadoEn = new Date().toISOString();

    await guardarFactura(pedido_id, { ...resultado, cuitCliente, razonSocial, domicilioFiscal, condicionIva, facturadoEn });

    return res.status(200).json({
      ok: true,
      ya_facturado: false,
      cae: resultado.cae,
      cae_vencimiento: formatearFecha(resultado.caeVencimiento),
      nro: resultado.nro,
      pto_vta: resultado.ptoVta,
      facturado_en: facturadoEn,
      razon_social: razonSocial,
      domicilio_fiscal: domicilioFiscal,
      cuit_cliente: cuitCliente,
      condicion_iva: condicionIva,
      observaciones: resultado.observaciones
    });
  } catch (e) {
    console.error("Error facturando con ARCA:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
