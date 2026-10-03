// Recibe las notificaciones de Zipnova cuando cambia el estado de un envío
// (despachado, en camino, entregado, etc.) y actualiza el pedido
// correspondiente en Supabase, para no tener que cargar el estado a mano.
//
// Esta URL se configura en Zipnova: Integraciones > API & Webhooks >
// Crear Webhook → https://pedidos-petits-cadeaux.vercel.app/api/zipnova-webhook
//
// Como la documentación pública no detalla el formato exacto del payload,
// este endpoint es tolerante: prueba varios nombres de campo posibles y,
// si no reconoce el evento, igual responde 200 (para que Zipnova no
// reintente indefinidamente) y deja el payload en los logs de Vercel para
// poder ajustar el mapeo con un caso real.

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";

// Traduce los estados de Zipnova a los que ya usa el panel admin.
const MAPA_ESTADOS = {
  pending: "Pendiente",
  created: "Pendiente",
  ready_to_pickup: "Pendiente",
  picked_up: "Despachado",
  in_transit: "Despachado",
  out_for_delivery: "Despachado",
  delivered: "Entregado",
  returned: "Pendiente",
  cancelled: "Pendiente"
};

async function actualizarPedidoPorShipment(shipmentId, campos) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/pedidos_distribuidora?zipnova_shipment_id=eq.${encodeURIComponent(shipmentId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(campos)
    }
  );
  const data = await r.json().catch(() => null);
  return { ok: r.ok, data };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const body = req.body || {};
    console.log("Webhook de Zipnova recibido:", JSON.stringify(body).slice(0, 2000));

    const shipmentId =
      body.shipment_id || body.id || body?.data?.shipment_id || body?.data?.id || body?.shipment?.id || null;
    const estadoCrudo = body.status || body.event || body?.data?.status || body?.data?.event || null;
    const trackingUrl = body.tracking_url || body?.data?.tracking_url || null;

    if (!shipmentId) {
      console.warn("Webhook de Zipnova sin shipment_id reconocible, ignorado.");
      return res.status(200).json({ ok: true, ignorado: true });
    }

    const estado = MAPA_ESTADOS[String(estadoCrudo).toLowerCase()] || null;
    const campos = {};
    if (estado) campos.estado_envio = estado;
    if (trackingUrl) campos.zipnova_tracking_url = trackingUrl;

    if (Object.keys(campos).length === 0) {
      return res.status(200).json({ ok: true, ignorado: true, motivo: "estado no reconocido: " + estadoCrudo });
    }

    const resultado = await actualizarPedidoPorShipment(shipmentId, campos);
    return res.status(200).json({ ok: true, actualizado: resultado.ok });
  } catch (e) {
    console.error("Error procesando webhook de Zipnova:", e);
    // Igual devolvemos 200: si devolvemos error, Zipnova reintenta sin parar.
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
