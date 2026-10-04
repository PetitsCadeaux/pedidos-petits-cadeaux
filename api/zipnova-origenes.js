// Diagnóstico: lista los orígenes (depósitos/puntos de retiro) configurados
// en la cuenta de Zipnova, para conseguir el origin_id que hay que guardar
// en Vercel como ZIPNOVA_ORIGIN_ID (lo exige /shipments al crear un envío).
// Se usa visitando: https://pedidos-petits-cadeaux.vercel.app/api/zipnova-origenes
import { obtenerOrigenes } from "../lib/zipnova.js";

export default async function handler(req, res) {
  try {
    const origenes = await obtenerOrigenes();
    return res.status(200).json({ ok: true, origenes });
  } catch (e) {
    console.error("Error consultando orígenes de Zipnova:", e);
    return res.status(200).json({
      ok: false,
      error: e.message || "Error desconocido",
      detalle: e.data || null,
      nota: "Si dice 'route not found' o 404, buscá los orígenes dentro del panel de Zipnova (Configuración > Orígenes o Depósitos) o pedíselos al soporte."
    });
  }
}
