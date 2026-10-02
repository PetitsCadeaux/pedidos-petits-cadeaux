// Emite una Nota de Crédito C contra ARCA (WSFE), asociada a una Factura C
// ya emitida, y guarda el resultado en el propio pedido. Se llama desde el
// botón "Nota de Crédito" del panel de comprobantes, una vez que el pedido
// ya tiene una factura con CAE.
//
// Usa SUPABASE_SERVICE_ROLE_KEY (nunca expuesta al navegador) para leer y
// actualizar el pedido directamente, sin depender de la sesión del usuario.
import { solicitarNotaCredito } from "../lib/arca.js";

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

async function guardarNotaCredito(id, datos) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/pedidos_distribuidora?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({
      nc_cae: datos.cae,
      nc_cae_vencimiento: formatearFecha(datos.caeVencimiento),
      nc_tipo: datos.cbteTipo,
      nc_pto_vta: datos.ptoVta,
      nc_nro: datos.nro,
      nc_motivo: datos.motivo || null,
      nc_facturada_en: datos.facturadoEn
    })
  });
  if (!r.ok) throw new Error("La nota de crédito se autorizó pero no se pudo guardar en el pedido: " + (await r.text()));
}

function formatearFecha(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return yyyymmdd.slice(0, 4) + "-" + yyyymmdd.slice(4, 6) + "-" + yyyymmdd.slice(6, 8);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const { pedido_id, motivo } = req.body || {};
    if (!pedido_id) return res.status(200).json({ ok: false, error: "Falta pedido_id" });

    const pedido = await obtenerPedido(pedido_id);
    if (!pedido) return res.status(200).json({ ok: false, error: "No se encontró el pedido" });

    if (!pedido.factura_cae) {
      return res.status(200).json({ ok: false, error: "Este pedido todavía no tiene una Factura emitida, no se puede hacer una Nota de Crédito" });
    }

    // Idempotencia: si ya tiene una Nota de Crédito, no volvemos a pedir otra.
    if (pedido.nc_cae) {
      return res.status(200).json({
        ok: true,
        ya_emitida: true,
        cae: pedido.nc_cae,
        cae_vencimiento: pedido.nc_cae_vencimiento,
        nro: pedido.nc_nro,
        pto_vta: pedido.nc_pto_vta,
        facturado_en: pedido.nc_facturada_en,
        motivo: pedido.nc_motivo
      });
    }

    const motivoTexto = motivo ? String(motivo).trim() : null;
    const resultado = await solicitarNotaCredito({
      total: Number(pedido.total),
      cuitCliente: pedido.factura_cuit_cliente || null,
      cbteAsocPtoVta: pedido.factura_pto_vta,
      cbteAsocNro: pedido.factura_nro
    });
    const facturadoEn = new Date().toISOString();

    await guardarNotaCredito(pedido_id, { ...resultado, motivo: motivoTexto, facturadoEn });

    return res.status(200).json({
      ok: true,
      ya_emitida: false,
      cae: resultado.cae,
      cae_vencimiento: formatearFecha(resultado.caeVencimiento),
      nro: resultado.nro,
      pto_vta: resultado.ptoVta,
      facturado_en: facturadoEn,
      motivo: motivoTexto,
      observaciones: resultado.observaciones
    });
  } catch (e) {
    console.error("Error emitiendo Nota de Crédito con ARCA:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
