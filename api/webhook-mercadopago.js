// Webhook de Mercado Pago — se ejecuta automáticamente cada vez que cambia
// el estado de un pago. Cuando un pago queda aprobado, marca el pedido
// correspondiente como pagado en Supabase, sin que nadie tenga que hacer
// nada manualmente.
//
// Seguridad: no confiamos en los datos que manda la notificación. Con el
// id de pago que llega, volvemos a consultar el pago REAL a la API de
// Mercado Pago (con nuestro Access Token) y usamos esa respuesta como
// única fuente de verdad.
//
// Usa el Service Role Key de Supabase (no la anon key) porque necesita
// permiso para actualizar el pedido sin que haya un usuario logueado.
// Esa clave también se guarda como variable de entorno en Vercel, nunca
// en el código.

export default async function handler(req, res) {
  try {
    // Mercado Pago manda el id del pago de dos formas posibles según la
    // configuración: querystring (?data.id=...&type=payment) o body (IPN vieja).
    const paymentId =
      req.query["data.id"] ||
      req.query.id ||
      (req.body && req.body.data && req.body.data.id) ||
      null;

    const topic = req.query.type || req.query.topic || (req.body && req.body.type);

    // Solo nos interesan las notificaciones de pagos.
    if (topic && topic !== "payment") {
      return res.status(200).json({ ok: true, ignorado: topic });
    }
    if (!paymentId) {
      return res.status(200).json({ ok: true, ignorado: "sin id de pago" });
    }

    const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    const SUPABASE_URL = process.env.SUPABASE_URL || "https://stkfdzqwcnzievrmivaj.supabase.co";
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!ACCESS_TOKEN || !SERVICE_KEY) {
      console.error("Faltan variables de entorno MP_ACCESS_TOKEN / SUPABASE_SERVICE_KEY");
      return res.status(200).json({ ok: false, error: "config incompleta" });
    }

    // Consultamos el pago real a Mercado Pago (fuente de verdad).
    const mpResp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: "Bearer " + ACCESS_TOKEN }
    });
    if (!mpResp.ok) {
      return res.status(200).json({ ok: false, error: "no se pudo consultar el pago" });
    }
    const pago = await mpResp.json();
    const pedidoId = pago.external_reference;
    const status = pago.status; // approved | pending | rejected | ...

    if (!pedidoId) {
      return res.status(200).json({ ok: true, ignorado: "pago sin external_reference" });
    }

    if (status === "approved") {
      await fetch(`${SUPABASE_URL}/rest/v1/pedidos_distribuidora?id=eq.${pedidoId}`, {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: "Bearer " + SERVICE_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          pagado: true,
          mp_payment_id: String(pago.id),
          estado_pago: "Mercado Pago"
        })
      });
    }

    return res.status(200).json({ ok: true, pedidoId, status });
  } catch (e) {
    console.error("Error en webhook Mercado Pago:", e);
    // Siempre respondemos 200 para que Mercado Pago no reintente en loop.
    return res.status(200).json({ ok: false, error: e.message });
  }
}
