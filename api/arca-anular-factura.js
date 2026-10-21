// Anula una Factura C: emite la Nota de Crédito C asociada en ARCA (por el total de la factura),
// guarda la factura anulada en el historial (facturas_anuladas) y devuelve el pedido a "Pedido"
// para poder editarlo y volver a facturarlo.
//
// Es idempotente: si la nota de crédito ya se emitió (por ejemplo, si falló el último paso),
// no se emite otra; solo se completa el archivado.
//
// Usa SUPABASE_SERVICE_ROLE_KEY (nunca expuesta al navegador).
import { solicitarNotaCredito } from "../lib/arca.js";
import { requierePermiso } from "../lib/admin-auth.js";

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
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

function formatearFecha(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return null;
  return yyyymmdd.slice(0, 4) + "-" + yyyymmdd.slice(4, 6) + "-" + yyyymmdd.slice(6, 8);
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
  if (!r.ok) throw new Error("La nota de crédito se autorizó en ARCA pero no se pudo guardar en el pedido: " + (await r.text()));
}

function estaCobrado(p) {
  return ["Efectivo", "Transferencia", "Mercado Pago"].includes(p.cobro) || (p.estado_pago === "Mercado Pago" && !!p.pagado);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const usuario = await requierePermiso(req, res, "facturar");
    if (!usuario) return;
    const { pedido_id, motivo } = req.body || {};
    if (!pedido_id) return res.status(200).json({ ok: false, error: "Falta pedido_id" });
    const motivoTexto = motivo ? String(motivo).trim() : "";
    if (!motivoTexto) return res.status(200).json({ ok: false, error: "Escribí el motivo de la anulación" });

    const pedido = await obtenerPedido(pedido_id);
    if (!pedido) return res.status(200).json({ ok: false, error: "No se encontró el pedido" });
    if (!pedido.factura_cae) {
      return res.status(200).json({ ok: false, error: "Este pedido no tiene una factura emitida para anular" });
    }
    // Se controla ANTES de emitir la nota de crédito, que en ARCA no se puede deshacer.
    if (estaCobrado(pedido)) {
      return res.status(200).json({ ok: false, error: "El pedido figura como cobrado: primero anulá el cobro (en Facturación o en Cuenta corriente) y después la factura." });
    }

    let nc;
    let yaEmitida = false;
    if (pedido.nc_cae) {
      // La nota de crédito ya existe (se emitió antes, a mano o en un intento anterior): solo se completa el archivado.
      yaEmitida = true;
      nc = { cae: pedido.nc_cae, nro: pedido.nc_nro, pto_vta: pedido.nc_pto_vta };
    } else {
      const total = Number(pedido.factura_total != null ? pedido.factura_total : pedido.total);
      if (!(total > 0)) return res.status(200).json({ ok: false, error: "No se pudo determinar el importe de la factura" });
      const resultado = await solicitarNotaCredito({
        total,
        cuitCliente: pedido.factura_cuit_cliente || null,
        cbteAsocPtoVta: pedido.factura_pto_vta,
        cbteAsocNro: pedido.factura_nro
      });
      const facturadoEn = new Date().toISOString();
      await guardarNotaCredito(pedido_id, { ...resultado, motivo: motivoTexto, facturadoEn });
      nc = { cae: resultado.cae, nro: resultado.nro, pto_vta: resultado.ptoVta };
    }

    // Archivar la factura anulada y devolver el pedido a "Pedido".
    const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/archivar_factura_anulada", {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ p_pedido: Number(pedido_id), p_motivo: motivoTexto, p_usuario: usuario.email || null })
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      const m = (d && (d.message || d.hint)) || "error " + r.status;
      const falta = /function|schema cache|does not exist|permission/i.test(m) ? " ¿Corriste sql-anular-factura.sql en Supabase?" : "";
      return res.status(200).json({
        ok: false,
        nc_emitida: true,
        nc,
        error: "La nota de crédito " + String(nc.pto_vta || 0).padStart(4, "0") + "-" + String(nc.nro || 0).padStart(8, "0") +
          " ya está emitida en ARCA, pero no se pudo devolver el pedido a Pedido: " + m + "." + falta + " Cuando lo resuelvas, volvé a tocar «Anular factura»: no se emite otra nota de crédito."
      });
    }

    return res.status(200).json({
      ok: true,
      ya_emitida: yaEmitida,
      nc,
      factura: { pto_vta: pedido.factura_pto_vta, nro: pedido.factura_nro, cae: pedido.factura_cae, facturado_en: pedido.facturado_en, tipo: pedido.factura_tipo },
      con_remito: !!pedido.remito_nro
    });
  } catch (e) {
    console.error("Error anulando factura con ARCA:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
