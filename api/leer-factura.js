// Lee una factura / remito / nota de crédito de un proveedor (foto o PDF) con IA
// y devuelve los datos para precargar el formulario de admin/facturas.html.
// Solo usuarios logueados del panel. No guarda nada: la persona revisa y confirma.
import { usuarioDelToken } from "../lib/admin-auth.js";

const MODELO = process.env.LEER_FACTURA_MODELO || "claude-sonnet-5-5";
const MAX_BASE64 = 4_200_000; // ~3,1 MB de archivo: el límite de Vercel para el cuerpo es 4,5 MB
const TIPOS_OK = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const TIPOS_COMPROBANTE = [
  "Factura A", "Factura B", "Factura C",
  "Nota de Crédito A", "Nota de Crédito B", "Nota de Crédito C",
  "Nota de Débito A", "Nota de Débito B", "Nota de Débito C",
  "Remito", "Compromiso de pago",
];

const tool = {
  name: "cargar_factura",
  description: "Devuelve los datos leídos del comprobante de un proveedor. Usá null en lo que no se lea con certeza; nunca inventes.",
  input_schema: {
    type: "object",
    properties: {
      proveedor: { type: ["string", "null"], description: "Razón social o nombre del EMISOR del comprobante (quien vende), no del cliente." },
      proveedor_existente: { type: ["string", "null"], description: "Si coincide con alguno de la lista de proveedores conocidos, copialo exactamente como figura en la lista; si no, null." },
      cuit: { type: ["string", "null"], description: "CUIT del emisor, solo 11 dígitos." },
      tipo_comprobante: { type: ["string", "null"], enum: [...TIPOS_COMPROBANTE, null], description: "Remito si es un remito; 'Compromiso de pago' si es un presupuesto/documento no fiscal de venta." },
      fecha: { type: ["string", "null"], description: "Fecha de emisión AAAA-MM-DD." },
      vencimiento: { type: ["string", "null"], description: "Vencimiento de pago AAAA-MM-DD (NO el vencimiento del CAE)." },
      punto_venta: { type: ["string", "null"], description: "Punto de venta, solo dígitos." },
      numero: { type: ["string", "null"], description: "Número de comprobante, solo dígitos." },
      precios_incluyen_iva: { type: "boolean", description: "true si los precios unitarios impresos ya incluyen IVA (Factura B, C, tickets, remitos con IVA incluido). false si son netos y el IVA se suma aparte (Factura A)." },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            descripcion: { type: "string" },
            producto_existente: { type: ["string", "null"], description: "Si equivale claramente a un producto de la lista conocida, copialo exacto; si no, null." },
            cantidad: { type: "number" },
            precio_unitario: { type: ["number", "null"], description: "Precio unitario impreso, antes de bonificación." },
            bonif_pct: { type: ["number", "null"], description: "Bonificación / descuento % de la línea, 0 si no hay." },
            iva_pct: { type: ["number", "null"], description: "Alícuota de IVA de la línea (21, 10.5, 27, 0)." },
            es_servicio: { type: "boolean" },
          },
          required: ["descripcion", "cantidad"],
        },
      },
      percepcion_iva: { type: ["number", "null"] },
      percepcion_iibb: { type: ["number", "null"] },
      otros_impuestos: { type: ["number", "null"] },
      otros_impuestos_concepto: { type: ["string", "null"] },
      total: { type: ["number", "null"], description: "Importe total impreso del comprobante." },
      advertencias: { type: "array", items: { type: "string" }, description: "Dudas o partes ilegibles que la persona debe revisar." },
    },
    required: ["items", "precios_incluyen_iva", "advertencias"],
  },
};

function sistema(proveedores, productos) {
  return `Leés comprobantes de compra de una distribuidora de panificados de Argentina (facturas A/B/C, notas de crédito y débito, remitos, presupuestos) y los pasás a datos estructurados llamando a la herramienta cargar_factura.

Reglas:
- El proveedor es quien EMITE el comprobante. El cliente (Petits Cadeaux / Distribuidora Petits Cadeaux) no es el proveedor.
- Fechas en formato AAAA-MM-DD (en Argentina se escribe día/mes/año). Si la fecha no se lee, null.
- Importes como números con punto decimal, sin símbolo ni separador de miles ("1.234,50" es 1234.5).
- Un ítem por cada línea de la tabla de productos. No agregues líneas de totales, IVA ni percepciones como ítems.
- Factura A: los precios suelen ser netos y el IVA va aparte, precios_incluyen_iva=false. Facturas B, C, tickets y remitos: precios finales, precios_incluyen_iva=true. Si no es evidente, elegí lo que haga que cuadre el total y avisalo en advertencias.
- Percepciones de IVA e IIBB y otros impuestos van en sus campos, nunca como ítems.
- Si es una nota de crédito, cargá los montos en positivo.
- Lo que no se lee con certeza va como null y lo anotás en advertencias. No inventes datos.
- Verificá mentalmente que la suma de ítems con IVA y percepciones se parezca al total; si no cuadra, avisalo en advertencias.
- Todo en español rioplatense, breve.

Proveedores ya cargados (usá el nombre exacto si coincide): ${JSON.stringify(proveedores).slice(0, 3000)}
Productos conocidos (usá el nombre exacto si coincide claramente): ${JSON.stringify(productos).slice(0, 6000)}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  try {
    const u = await usuarioDelToken(req);
    if (!u) return res.status(401).json({ ok: false, error: "Sesión inválida o vencida. Volvé a ingresar." });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ ok: false, error: "Falta la clave de la IA en Vercel (ANTHROPIC_API_KEY)." });

    const { archivo, tipo, proveedores = [], productos = [] } = req.body || {};
    if (!archivo || !TIPOS_OK.includes(tipo)) return res.status(200).json({ ok: false, error: "Subí una foto (JPG o PNG) o un PDF." });
    if (archivo.length > MAX_BASE64) return res.status(200).json({ ok: false, error: "El archivo es muy pesado. Sacale una foto más liviana o achicá el PDF." });

    const bloque = tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: tipo, data: archivo } }
      : { type: "image", source: { type: "base64", media_type: tipo, data: archivo } };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 4000,
        system: sistema(proveedores, productos),
        tools: [tool],
        tool_choice: { type: "auto" }, // este modelo no admite forzar la herramienta; el prompt le exige usarla
        messages: [{ role: "user", content: [bloque, { type: "text", text: "Leé este comprobante y cargalo llamando a la herramienta cargar_factura. Respondé solo con esa llamada." }] }],
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error((d.error && d.error.message) || "error de la IA");
    const uso = d.content && d.content.find((b) => b.type === "tool_use");
    if (!uso) return res.status(200).json({ ok: false, error: "No pude leer el comprobante. Probá con una foto más nítida." });
    return res.status(200).json({ ok: true, datos: uso.input, modelo: MODELO });
  } catch (e) {
    console.error("leer-factura:", e);
    return res.status(200).json({ ok: false, error: "No se pudo leer: " + (e.message || "error") });
  }
}
