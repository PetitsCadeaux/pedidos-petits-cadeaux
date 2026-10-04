// Manda un mail a Nadia avisando que entró un pedido nuevo (tienda,
// regaleria, o lista de precios mayorista/comercio). No bloquea el pedido
// si falla: se llama después de guardarlo en Supabase, y los storefronts
// ignoran el error si este envío no funciona.
//
// Usa Resend (https://resend.com) — plan gratis hasta 3000 mails/mes. La
// API key se guarda en Vercel como variable de entorno RESEND_API_KEY,
// nunca en el código. Como todavía no hay un dominio propio verificado en
// Resend, se manda desde su dirección de pruebas (onboarding@resend.dev),
// que solo puede mandar a la casilla con la que se creó la cuenta de
// Resend — por eso este mail es para avisar A NADIA, no un comprobante
// para el cliente (eso necesita un dominio propio, ver sql/notas).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "nadia.tarifa@gmail.com";

  if (!RESEND_API_KEY) {
    return res.status(200).json({ ok: false, error: "Falta configurar RESEND_API_KEY en Vercel" });
  }

  try {
    const { tienda, comercio, whatsapp, domicilio, productos, total, canal, observaciones } = req.body || {};

    const money = (n) => n == null ? "A confirmar" : "$" + Math.round(n).toLocaleString("es-AR");

    const lineas = (Array.isArray(productos) ? productos : [])
      .map((p) => `<li>${p.cantidad} × ${escapeHtml(p.producto)}${p.cambio ? " (CAMBIO)" : " — " + money(p.cantidad * (p.precio_unitario || 0))}</li>`)
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;color:#392541">
        <h2 style="color:#542477;margin:0 0 6px">🛒 Nuevo pedido — ${escapeHtml(tienda || "Distribuidora Petits Cadeaux")}</h2>
        <p style="margin:4px 0"><strong>${escapeHtml(comercio || "Sin nombre")}</strong>${canal ? " · " + escapeHtml(canal) : ""}</p>
        ${whatsapp ? `<p style="margin:4px 0">📱 ${escapeHtml(whatsapp)}</p>` : ""}
        ${domicilio ? `<p style="margin:4px 0">📍 ${escapeHtml(domicilio)}</p>` : ""}
        <ul style="margin:10px 0;padding-left:20px">${lineas || "<li>Sin productos</li>"}</ul>
        <p style="font-weight:800;font-size:16px">Total: ${money(total)}</p>
        ${observaciones ? `<p style="margin:10px 0">📝 ${escapeHtml(observaciones)}</p>` : ""}
        <p style="margin-top:16px"><a href="https://pedidos-petits-cadeaux.vercel.app/admin/admin.html" style="color:#542477">Ver en el panel admin →</a></p>
      </div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Pedidos Petits Cadeaux <onboarding@resend.dev>",
        to: NOTIFY_EMAIL,
        subject: `🛒 Nuevo pedido de ${comercio || "un cliente"}`,
        html
      })
    });
    const data = await r.json();
    if (!r.ok) {
      return res.status(200).json({ ok: false, error: data.message || "Resend rechazó el envío", detalle: data });
    }
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
