// Busca Razón Social, Domicilio Fiscal y Condición frente al IVA de un CUIT
// en el Padrón de ARCA, para autocompletar el formulario de facturación.
// Se llama desde el botón "Buscar en ARCA" del modal de facturar.
import { consultarPadron } from "../lib/arca.js";

function limpiarCuit(cuit) {
  if (!cuit) return null;
  const digits = String(cuit).replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const cuit = limpiarCuit(req.query?.cuit);
    if (!cuit) return res.status(200).json({ ok: false, error: "El CUIT tiene que tener 11 dígitos" });

    const datos = await consultarPadron(cuit);
    return res.status(200).json({
      ok: true,
      razon_social: datos.razonSocial,
      domicilio_fiscal: datos.domicilioFiscal,
      condicion_iva: datos.condicionIva
    });
  } catch (e) {
    console.error("Error consultando Padrón de ARCA:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
