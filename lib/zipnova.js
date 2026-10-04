// Integración con la API de Zipnova Envíos (https://docs.zipnova.com)
// Permite cotizar envíos, crearlos y consultar su estado, usando Correo
// Argentino, Andreani y demás transportistas conectados en la cuenta de
// Zipnova de Distribuidora Petits Cadeaux.
//
// Credenciales: ZIPNOVA_API_KEY y ZIPNOVA_API_SECRET (variables de entorno
// en Vercel, nunca hardcodeadas). Se autentica con HTTP Basic Auth
// (key:secret en base64).

const BASE_URL = "https://api.zipnova.com.ar/v2";

function authHeader() {
  const key = process.env.ZIPNOVA_API_KEY;
  const secret = process.env.ZIPNOVA_API_SECRET;
  if (!key || !secret) {
    throw new Error("Faltan las variables de entorno ZIPNOVA_API_KEY / ZIPNOVA_API_SECRET");
  }
  const token = Buffer.from(`${key}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

async function zipnovaFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Zipnova respondió ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Trae los datos de la organización. OJO: esta ruta pertenece al producto
// "Rutas" de Zipnova (gestión de flotas), no al de "Envíos" que es el que
// usamos acá — puede devolver 404 con las credenciales de Envíos. Se deja
// solo como intento de diagnóstico, no es indispensable para el resto.
export async function obtenerCuenta() {
  return zipnovaFetch("/organizations/my");
}

// Trae los orígenes (depósitos/puntos de retiro) configurados en la cuenta,
// para conseguir el origin_id que exige /shipments al crear un envío.
export async function obtenerOrigenes() {
  return zipnovaFetch("/origins");
}

// Cotiza un envío. destino: {name, phone, street, street_number, city, state, zipcode, street_extras}
// paquete: {weight, height, width, length, description_1}
// originId: si no se pasa, Zipnova usa el depósito configurado por defecto de la cuenta.
export async function cotizarEnvio({ accountId, originId, destino, paquete, declaredValue }) {
  return zipnovaFetch("/shipments/quote", {
    method: "POST",
    body: {
      account_id: accountId,
      source: "petits-cadeaux-web",
      origin_id: originId || undefined,
      declared_value: declaredValue || 0,
      destination: destino,
      packages: [paquete]
    }
  });
}

// Crea el envío a partir de una cotización elegida (carrier_id, service_type, logistic_type).
export async function crearEnvio({
  accountId,
  originId,
  externalId,
  carrierId,
  serviceType,
  logisticType,
  destino,
  paquete,
  declaredValue
}) {
  return zipnovaFetch("/shipments", {
    method: "POST",
    body: {
      account_id: accountId,
      origin_id: originId || undefined,
      external_id: externalId,
      carrier_id: carrierId,
      service_type: serviceType,
      logistic_type: logisticType,
      declared_value: declaredValue || 0,
      destination: destino,
      packages: [paquete],
      process_immediately: 1
    }
  });
}

// Consulta el estado/tracking de un envío ya creado.
export async function consultarEnvio(shipmentId) {
  return zipnovaFetch(`/shipments/${shipmentId}/tracking`);
}
