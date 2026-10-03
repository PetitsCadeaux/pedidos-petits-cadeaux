// Función serverless de Vercel — genera el link de pago de Mercado Pago.
// El Access Token NUNCA está acá en el código: se lee de una variable de
// entorno configurada en Vercel (Project Settings → Environment Variables),
// así que no queda expuesto en GitHub ni en el navegador del cliente.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { items, payer, external_reference } = req.body || {};

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Faltan productos en el pedido" });
  }

  const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
  if (!ACCESS_TOKEN) {
    return res.status(500).json({ error: "Falta configurar MP_ACCESS_TOKEN en Vercel" });
  }

  const SITE_URL = "https://pedidos-petits-cadeaux.vercel.app";

  try {
    const mpResp = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + ACCESS_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: items.map(it => ({
          title: it.title,
          quantity: it.quantity,
          unit_price: it.unit_price,
          currency_id: "ARS"
        })),
        payer: payer || {},
        external_reference: external_reference || null,
        notification_url: SITE_URL + "/api/webhook-mercadopago",
        back_urls: {
          success: SITE_URL + "/tienda.html?pago=exito",
          failure: SITE_URL + "/tienda.html?pago=fallo",
          pending: SITE_URL + "/tienda.html?pago=pendiente"
        },
        auto_return: "approved"
      })
    });

    const data = await mpResp.json();

    if (!mpResp.ok) {
      return res.status(mpResp.status).json({
        error: data.message || "Mercado Pago rechazó la solicitud",
        detail: data
      });
    }

    return res.status(200).json({ init_point: data.init_point, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Error desconocido" });
  }
}
