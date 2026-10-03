// Cotiza un envío para un pedido ya guardado en Supabase (por su id),
// usando la dirección estructurada que cargó el cliente en la tienda.
// Devuelve las opciones de transportista/precio para que el panel admin
// elija cuál usar.
import { cotizarEnvio } from "../lib/zipnova.js";

const ACCOUNT_ID = process.env.ZIPNOVA_ACCOUNT_ID;
// El origen es opcional: si no se configura ZIPNOVA_ORIGIN_ID, Zipnova usa
// el depósito configurado por defecto en la cuenta.
const ORIGIN_ID = process.env.ZIPNOVA_ORIGIN_ID || undefined;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    if (!ACCOUNT_ID) {
      return res.status(200).json({
        ok: false,
        error: "Falta configurar ZIPNOVA_ACCOUNT_ID en Vercel"
      });
    }

    const { nombre, telefono, calle, altura, pisoDepto, localidad, provincia, codigoPostal, dni, valorDeclarado } = req.body || {};
    if (!calle || !altura || !localidad || !provincia || !codigoPostal) {
      return res.status(200).json({ ok: false, error: "Falta la dirección completa del destinatario" });
    }

    const resultado = await cotizarEnvio({
      accountId: ACCOUNT_ID,
      originId: ORIGIN_ID,
      declaredValue: valorDeclarado || 1,
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
        description_1: "Pedido Distribuidora Petits Cadeaux",
        classification_id: 1
      }
    });

    return res.status(200).json({ ok: true, opciones: normalizarOpciones(resultado) });
  } catch (e) {
    console.error("Error cotizando envío en Zipnova:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido", detalle: e.data || null });
  }
}

// La API de Zipnova devuelve las opciones en resultado.results, como un
// objeto (no una lista) con una clave por tipo de servicio, por ejemplo:
// { standard_delivery: { selectable, carrier:{id,name}, service_type:{code},
//   logistic_type, amounts:{price, price_incl_tax} }, ... }
// Acá se convierte a una lista simple [{carrier_id, carrier_name,
// service_type, logistic_type, price, estimated_days}] para que tienda.html
// y admin.html la puedan recorrer directamente.
function normalizarOpciones(resultado) {
  if (Array.isArray(resultado)) return resultado;
  const results = resultado && typeof resultado === "object" ? resultado.results : null;
  if (!results || typeof results !== "object") return [];
  return Object.values(results)
    .filter((op) => op && op.selectable !== false && op.amounts)
    .map((op) => ({
      carrier_id: op.carrier?.id,
      carrier_name: op.carrier?.name,
      service_type: op.service_type?.code,
      logistic_type: op.logistic_type,
      price: op.amounts?.price_incl_tax ?? op.amounts?.price,
      estimated_days: op.delivery_time?.max
    }))
    .filter((op) => op.carrier_id && op.price != null)
    .sort((a, b) => a.price - b.price);
}
