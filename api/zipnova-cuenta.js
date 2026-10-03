// Diagnóstico: intenta traer los datos de la organización desde Zipnova.
// OJO: esta ruta (/organizations/my) pertenece al producto "Rutas" de
// Zipnova, no al de "Envíos" (el que usamos para cotizar/crear envíos),
// así que puede devolver 404 aunque las credenciales estén bien. Si pasa
// eso, el account_id hay que pedirlo directo al soporte de Zipnova (chat
// dentro de la app) o buscarlo en Configuración > Mi cuenta.
// Se usa visitando: https://pedidos-petits-cadeaux.vercel.app/api/zipnova-cuenta
import { obtenerCuenta } from "../lib/zipnova.js";

export default async function handler(req, res) {
  try {
    const cuenta = await obtenerCuenta();
    return res.status(200).json({ ok: true, cuenta });
  } catch (e) {
    console.error("Error consultando cuenta de Zipnova:", e);
    return res.status(200).json({
      ok: false,
      error: e.message || "Error desconocido",
      detalle: e.data || null,
      nota: "Si dice 'route not found', esta ruta no aplica al producto de Envíos. Pedile el account_id al soporte de Zipnova o buscalo en Configuración > Mi cuenta dentro de la app."
    });
  }
}
