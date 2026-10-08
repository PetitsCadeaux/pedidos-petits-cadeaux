// Crea el envío en Zipnova para un pedido ya guardado en Supabase, usando
// la opción de transportista que se eligió en el panel admin (después de
// cotizar con /api/zipnova-cotizar), y guarda el resultado en el pedido
// (transportista, numero_seguimiento, estado_envio, zipnova_shipment_id).
import { crearEnvio } from "../lib/zipnova.js";
import { requierePermiso } from "../lib/admin-auth.js";

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";
const ACCOUNT_ID = process.env.ZIPNOVA_ACCOUNT_ID;
// El origen es opcional: si no se configura ZIPNOVA_ORIGIN_ID, no se manda
// el campo y Zipnova usa el depósito configurado por defecto en la cuenta
// (mandar la palabra "auto" como si fuera un id hace que Zipnova la rechace
// con "The selected origin id is invalid").
const ORIGIN_ID = process.env.ZIPNOVA_ORIGIN_ID || undefined;

async function traerPedido(pedidoId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos_distribuidora?id=eq.${encodeURIComponent(pedidoId)}&select=*`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    }
  );
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : null;
}

async function actualizarPedido(pedidoId, campos) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos_distribuidora?id=eq.${encodeURIComponent(pedidoId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify(campos)
    }
  );
  if (!r.ok) throw new Error("No se pudo actualizar el pedido en Supabase: " + (await r.text()));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    if (!(await requierePermiso(req, res, "envios"))) return;
    if (!ACCOUNT_ID) {
      return res.status(200).json({
        ok: false,
        error: "Falta configurar ZIPNOVA_ACCOUNT_ID en Vercel"
      });
    }

    const { pedidoId, carrierId, serviceType, logisticType } = req.body || {};
    if (!pedidoId || !carrierId || !serviceType) {
      return res.status(200).json({ ok: false, error: "Faltan pedidoId, carrierId o serviceType" });
    }

    const pedido = await traerPedido(pedidoId);
    if (!pedido) {
      return res.status(200).json({ ok: false, error: "No se encontró el pedido " + pedidoId });
    }
    if (!pedido.direccion_calle || !pedido.direccion_altura || !pedido.localidad || !pedido.codigo_postal) {
      return res.status(200).json({ ok: false, error: "El pedido no tiene la dirección completa cargada" });
    }

    const envio = await crearEnvio({
      accountId: ACCOUNT_ID,
      originId: ORIGIN_ID,
      externalId: String(pedido.id),
      carrierId,
      serviceType,
      logisticType,
      declaredValue: pedido.total || 1,
      destino: {
        name: pedido.comercio || "Cliente",
        document: pedido.dni || undefined,
        phone: pedido.whatsapp || undefined,
        street: pedido.direccion_calle,
        street_number: pedido.direccion_altura,
        street_extras: pedido.direccion_piso_depto || undefined,
        city: pedido.localidad,
        state: pedido.provincia,
        zipcode: pedido.codigo_postal
      },
      paquete: {
        weight: 1000,
        height: 15,
        width: 20,
        length: 20,
        description_1: "Pedido Distribuidora Petits Cadeaux",
        classification_id: 1
      }
    });

    const shipmentId = envio.id || envio.shipment_id || null;
    const tracking = envio.tracking_number || envio.external_tracking_id || null;
    const trackingUrl = envio.tracking_url || null;
    const nombreTransportista = envio.carrier_name || envio.carrier || "Zipnova";

    await actualizarPedido(pedido.id, {
      transportista: nombreTransportista,
      numero_seguimiento: tracking || shipmentId,
      estado_envio: "Despachado",
      zipnova_shipment_id: shipmentId ? String(shipmentId) : null,
      zipnova_carrier_id: String(carrierId),
      zipnova_tracking_url: trackingUrl
    });

    return res.status(200).json({ ok: true, envio });
  } catch (e) {
    console.error("Error creando envío en Zipnova:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido", detalle: e.data || null });
  }
}
