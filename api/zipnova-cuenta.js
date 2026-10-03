// Diagnóstico: muestra el account_id y las direcciones de origen (orígenes)
// configuradas en la cuenta de Zipnova, para poder usarlos al crear envíos.
// Se usa una sola vez para obtener esos datos, visitando esta URL en el navegador:
// https://pedidos-petits-cadeaux.vercel.app/api/zipnova-cuenta
import { obtenerCuenta, listarOrigenes } from "../lib/zipnova.js";

export default async function handler(req, res) {
  try {
    const [cuenta, origenes] = await Promise.all([obtenerCuenta(), listarOrigenes()]);
    return res.status(200).json({ ok: true, cuenta, origenes });
  } catch (e) {
    console.error("Error consultando cuenta de Zipnova:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido", detalle: e.data || null });
  }
}
