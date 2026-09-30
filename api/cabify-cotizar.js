// Cotización real de envío con Cabify Logistics (moto/auto, mismo día, dentro
// del área donde opera Cabify — CABA/GBA). Se llama desde tienda.html para
// mostrarle al cliente el costo real de envío antes de pagar, en vez de un
// monto fijo inventado.
//
// Credenciales: se leen de las variables de entorno de Vercel
// CABIFY_LOGISTICS_UUID / CABIFY_LOGISTICS_SECRET (nunca están en el código).
//
// Flujo (según la documentación oficial de Cabify Logistics API):
// 1) OAuth2 client_credentials -> access_token (se cachea en memoria mientras
//    la función esté "caliente" en Vercel, dura ~30 días)
// 2) Geocodificamos la dirección de origen (el depósito, siempre la misma) la
//    primera vez y la dejamos en caché
// 3) Consultamos qué "tipo de envío" (shipping type) hay disponible para esa
//    zona de origen
// 4) Pedimos la estimación de precio y tiempo para la dirección de destino
//    del cliente (a Cabify le mandamos la dirección tal cual, no hace falta
//    geocodificarla nosotros)
//
// Importante: esto SOLO cotiza (POST /v3/parcels/estimate). No crea ningún
// envío real ni genera ningún cargo — eso es un paso aparte (POST /parcels +
// POST /parcels/ship) que todavía no está conectado a propósito, hasta
// probar bien la cotización primero.

const AUTH_BASE = "https://cabify.com";
const LOGISTICS_BASE = "https://logistics.api.cabify.com";

const PICKUP_ADDR = "Calle 125 2349, Berazategui Oeste, Buenos Aires, Argentina";

// --- Caché en memoria (vive mientras la función siga "caliente") ---
let cachedToken = null; // { access_token, expires_at }
let cachedPickup = null; // { lat, lon }
let cachedShippingType = null; // string

async function getAccessToken() {
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token;
  }
  const clientId = process.env.CABIFY_LOGISTICS_UUID;
  const clientSecret = process.env.CABIFY_LOGISTICS_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan las variables de entorno CABIFY_LOGISTICS_UUID / CABIFY_LOGISTICS_SECRET");
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret
  });
  const r = await fetch(AUTH_BASE + "/auth/api/authorization", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error("No se pudo autenticar con Cabify (" + r.status + "): " + t);
  }
  const data = await r.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ? data.expires_in * 1000 : 3600000)
  };
  return cachedToken.access_token;
}

async function getPickupCoords() {
  if (cachedPickup) return cachedPickup;
  // Si se cargan estas dos variables de entorno, se usan directo y nos
  // ahorramos depender de un geocodificador externo.
  if (process.env.CABIFY_PICKUP_LAT && process.env.CABIFY_PICKUP_LON) {
    cachedPickup = {
      lat: Number(process.env.CABIFY_PICKUP_LAT),
      lon: Number(process.env.CABIFY_PICKUP_LON)
    };
    return cachedPickup;
  }
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
    encodeURIComponent(PICKUP_ADDR);
  const r = await fetch(url, {
    headers: { "User-Agent": "PetitsCadeauxTienda/1.0" }
  });
  if (!r.ok) throw new Error("No se pudo geocodificar la dirección de origen");
  const data = await r.json();
  if (!data || !data.length) {
    throw new Error("No se encontraron coordenadas para la dirección de origen (" + PICKUP_ADDR + ")");
  }
  cachedPickup = { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  return cachedPickup;
}

async function getShippingTypeId(token, lat, lon) {
  if (cachedShippingType) return cachedShippingType;
  const url = LOGISTICS_BASE + "/v1/shipping_types/available?location=" + lat + "," + lon;
  const r = await fetch(url, { headers: { Authorization: "Bearer " + token } });
  if (!r.ok) {
    const t = await r.text();
    throw new Error("No se pudieron consultar los tipos de envío (" + r.status + "): " + t);
  }
  const data = await r.json();
  const tipos = data.available_shipping_types || [];
  if (!tipos.length) throw new Error("Cabify no tiene cobertura para la dirección de origen");
  // Preferimos "same_day" (entrega el mismo día); si no hay, el primero que haya.
  const elegido = tipos.find(t => t.modality === "same_day") || tipos[0];
  cachedShippingType = elegido.id;
  return cachedShippingType;
}

async function estimar(token, shippingTypeId, pickup, direccionDestino) {
  const r = await fetch(LOGISTICS_BASE + "/v3/parcels/estimate", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      shipping_type_id: shippingTypeId,
      parcels: [
        {
          pickup_location: { lat: pickup.lat, lon: pickup.lon },
          dropoff_location: { address: direccionDestino },
          weight: { value: 3000, unit: "g" },
          dimensions: { length: 30, width: 30, height: 20, unit: "cm" }
        }
      ]
    })
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error("Cabify no pudo calcular el envío (" + r.status + "): " + t);
  }
  const data = await r.json();
  const entrega = data.deliveries && data.deliveries[0];
  if (!entrega || !entrega.estimation) throw new Error("Respuesta de Cabify sin estimación");
  return entrega.estimation;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método no permitido" });
  }
  try {
    const { direccion } = req.body || {};
    if (!direccion || !String(direccion).trim()) {
      return res.status(200).json({ ok: false, error: "Falta la dirección de destino" });
    }
    const token = await getAccessToken();
    const pickup = await getPickupCoords();
    const shippingTypeId = await getShippingTypeId(token, pickup.lat, pickup.lon);
    const estimacion = await estimar(token, shippingTypeId, pickup, String(direccion).trim());

    return res.status(200).json({
      ok: true,
      precio: Math.round(estimacion.price.amount / 100),
      moneda: estimacion.price.currency,
      eta_entrega: estimacion.eta_to_delivery || null
    });
  } catch (e) {
    // Siempre devolvemos 200 con ok:false para que el frontend pueda
    // decidir tranquilamente caer al costo fijo si Cabify falla, sin
    // tener que lidiar con códigos de error HTTP.
    console.error("Error cotizando con Cabify:", e);
    return res.status(200).json({ ok: false, error: e.message || "Error desconocido" });
  }
}
