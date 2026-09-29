// Webhook de Mercado Pago — se ejecuta automáticamente cada vez que cambia
// el estado de un pago. Cuando un pago queda aprobado, marca el pedido
// correspondiente como pagado en Supabase y le manda un email de
// confirmación al cliente, sin que nadie tenga que hacer nada manualmente.
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
//
// El email se manda con la cuenta de Gmail configurada en las variables
// de entorno GMAIL_USER / GMAIL_APP_PASSWORD (una "contraseña de
// aplicación" generada en la cuenta de Google, no la contraseña normal).

import nodemailer from "nodemailer";

const money = n =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);

async function enviarEmailConfirmacion({ to, nombre, items, total, referencia }) {
  const GMAIL_USER = process.env.GMAIL_USER;
  const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !to) {
    console.log("Email no enviado: falta configuración o email de destino", { to, hayUser: !!GMAIL_USER, hayPass: !!GMAIL_APP_PASSWORD });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
  });

  const filas = (items || [])
    .map(
      it =>
        `<tr><td style="padding:5px 0;border-bottom:1px solid #eaddea">${it.title}${it.quantity > 1 ? " x" + it.quantity : ""}</td><td style="padding:5px 0;border-bottom:1px solid #eaddea;text-align:right;white-space:nowrap">${money(it.unit_price * it.quantity)}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#392541;max-width:480px;margin:0 auto">
      <h2 style="color:#542477;margin-bottom:4px">¡Gracias por tu compra${nombre ? ", " + nombre : ""}!</h2>
      <p style="color:#76657d;font-size:14px;margin-top:0">Tu pago fue aprobado y ya estamos preparando tu pedido.</p>
      <p style="font-size:12.5px;color:#a894ad">Referencia del pedido: ${referencia}</p>
      <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">
        ${filas || ""}
      </table>
      <p style="font-weight:bold;font-size:17px;color:#542477">Total: ${money(total)}</p>
      <p style="font-size:12.5px;color:#a894ad;margin-top:24px">Distribuidora Petits Cadeaux</p>
    </div>`;

  await transporter.sendMail({
    from: `"Distribuidora Petits Cadeaux" <${GMAIL_USER}>`,
    to,
    subject: "Confirmación de tu pedido — Petits Cadeaux",
    html
  });
}

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
    const referencia = pago.external_reference;
    const status = pago.status; // approved | pending | rejected | ...

    if (!referencia) {
      return res.status(200).json({ ok: true, ignorado: "pago sin external_reference" });
    }

    if (status === "approved") {
      await fetch(`${SUPABASE_URL}/rest/v1/pedidos_distribuidora?referencia_pago=eq.${encodeURIComponent(referencia)}`, {
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

      // Mandamos el email de confirmación. Si falla, no rompemos el webhook
      // (el pedido ya quedó marcado como pagado igual).
      try {
        const items =
          pago.additional_info && Array.isArray(pago.additional_info.items)
            ? pago.additional_info.items.map(it => ({
                title: it.title,
                quantity: Number(it.quantity) || 1,
                unit_price: Number(it.unit_price) || 0
              }))
            : [];
        await enviarEmailConfirmacion({
          to: pago.payer && pago.payer.email,
          nombre: (pago.payer && (pago.payer.first_name || pago.payer.name)) || "",
          items,
          total: pago.transaction_amount,
          referencia
        });
      } catch (emailErr) {
        console.error("Error enviando email de confirmación:", emailErr);
      }
    }

    return res.status(200).json({ ok: true, referencia, status });
  } catch (e) {
    console.error("Error en webhook Mercado Pago:", e);
    // Siempre respondemos 200 para que Mercado Pago no reintente en loop.
    return res.status(200).json({ ok: false, error: e.message });
  }
}
