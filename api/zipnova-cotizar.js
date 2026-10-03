// Cotiza un envío para un pedido ya guardado en Supabase (por su id),
// usando la dirección estructurada que cargó el cliente en la tienda.
// Devuelve las opciones de transportista/precio para que el panel admin
// elija cuál usar.
import { cotizarEnvio } from "../lib/zipnova.js";

const ACCOUNT_ID = process.env.ZIPNOVA_ACCOUNT_ID;
const ORIGIN_ID = process.env.ZIPNOVA_ORIGIN_ID;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    if (!ACCOUNT_ID || !ORIGIN_ID) {
      return res.status(200).json({
        ok: false,
        error: "Faltan configurar ZIPNOVA_ACCOUNT_ID / ZIPNOVA_ORIGIN_ID en Vercel"
      });
    }

    const { nombre, telefono, calle, altura, pisoDepto, localidad, provincia, codigoPostal, dni } = req.body || {};
    if (!calle || !altura || !localidad || !provincia || !codigoPostal) {
      return res.status(200).json({ ok: false, error: "Falta la dirección completa del destinatario" });
    }

    const resultado = await cotizarEnvio({
      accountId: ACCOUNT_ID,
      originId: ORIGIN_ID,
      destino: {
        name: nombre || "Cliente",
        document: dni || undefined,
        phone: telefono || undefined,
        street: calle,
        street_number: altura,
        street_extras: pisoDepto || undefined,
        city: localidad,
        state: provincia,
        zipcode: codigoPostal
      },
      paquete: {
        weight: 1000,
        height: 15,
        width: 20,
        length: 20,
        description_1: "Pedido Distribuidora Petits Cadeaux"
      }
    });

    return res.status(200).json({ ok: true, opciones: resultado });
  } catch (e) {
    console.error("Error cotizando envío en Zipnova:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido", detalle: e.data || null });
  }
}
