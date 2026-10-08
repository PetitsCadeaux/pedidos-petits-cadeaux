// Diagnóstico: busca en la API de Zipnova dónde está la lista de orígenes /
// depósitos (el "address_book_id" que se usa como origin_id al crear envíos).
// La documentación pública no indica la ruta, así que probamos varias.
// Se usa visitando: https://pedidos-petits-cadeaux.vercel.app/api/zipnova-origenes
const BASE_URL = "https://api.zipnova.com.ar/v2";

async function probar(ruta) {
  const key = process.env.ZIPNOVA_API_KEY;
  const secret = process.env.ZIPNOVA_API_SECRET;
  if (!key || !secret) return { ruta, error: "Faltan ZIPNOVA_API_KEY / ZIPNOVA_API_SECRET" };
  try {
    const r = await fetch(BASE_URL + ruta, {
      headers: { Authorization: "Basic " + Buffer.from(`${key}:${secret}`).toString("base64"), Accept: "application/json" },
    });
    const t = await r.text();
    let d; try { d = JSON.parse(t); } catch { d = t.slice(0, 300); }
    return { ruta, status: r.status, respuesta: r.ok ? d : (d && d.message) || d };
  } catch (e) {
    return { ruta, error: e.message };
  }
}

export default async function handler(req, res) {
  const account = process.env.ZIPNOVA_ACCOUNT_ID;
  const rutas = [
    "/origins", "/addresses", "/address-book", "/address_book", "/address-books", "/addressbook",
    "/warehouses", "/depots", "/accounts", "/me", "/users/me", "/organizations/my",
  ];
  if (account) rutas.push(`/accounts/${account}`, `/accounts/${account}/origins`, `/accounts/${account}/addresses`, `/accounts/${account}/address-book`);
  const resultados = await Promise.all(rutas.map(probar));
  const buenas = resultados.filter((x) => x.status && x.status < 400);
  return res.status(200).json({
    ok: buenas.length > 0,
    encontradas: buenas,
    todas: resultados.map((x) => ({ ruta: x.ruta, status: x.status || null, error: x.error || null })),
    nota: "Si ninguna sirve, el origin_id está en el panel de Zipnova (Configuración → Direcciones/Depósitos) o hay que pedirlo al soporte.",
  });
}
