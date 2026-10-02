// Integración con ARCA (ex-AFIP) — WSAA (autenticación) + WSFE (facturación
// electrónica) para emitir Factura C y Nota de Crédito C con CAE real.
//
// Credenciales: el certificado y la clave privada NUNCA están en el código.
// Se leen de variables de entorno de Vercel, en base64 (porque son archivos
// de varias líneas y así se pegan sin problemas de formato):
//   ARCA_CERT_B64   -> FacturacionWeb.crt codificado en base64
//   ARCA_KEY_B64     -> FacturacionWeb.key codificado en base64 (SECRETO)
//   ARCA_CUIT        -> CUIT del emisor (sin guiones), ej: 27311658714
//   SUPABASE_SERVICE_ROLE_KEY -> clave "service_role" de Supabase (Project
//                                Settings → API). NUNCA va en el frontend.
//
// Punto de venta queda fijo acá porque hoy Nadia es monotributista y emite
// Factura C (y Nota de Crédito C) por el punto de venta Web Services (N° 2)
// que dimos de alta en ARCA. Si en el futuro pasa a Responsable Inscripto
// esto cambia (pasaría a Factura A/B) y hay que actualizar PTO_VTA y la
// lógica de IVA de este archivo.
const PTO_VTA = 2;
const CBTE_TIPO_FACTURA = 11; // 11 = Factura C
const CBTE_TIPO_NOTA_CREDITO = 13; // 13 = Nota de Crédito C

const WSAA_URL = "https://wsaa.afip.gov.ar/ws/services/LoginCms";
const WSFE_URL = "https://servicios1.afip.gov.ar/wsfev1/service.asmx";

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";

import forge from "node-forge";
import { XMLParser } from "fast-xml-parser";
import { Agent } from "undici";

const xmlParser = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true });

// Los servidores de ARCA (wsaa.afip.gov.ar / servicios1.afip.gov.ar) todavía
// negocian TLS con una configuración vieja (DH de muy pocos bits) que las
// versiones nuevas de Node/OpenSSL rechazan por default ("dh key too small").
// No es algo que podamos arreglar nosotros del lado de ARCA, así que para
// estas dos conexiones puntuales le bajamos el nivel de seguridad TLS a
// Node. No afecta al resto del sitio, solo a estas llamadas específicas.
const arcaAgent = new Agent({ connect: { ciphers: "DEFAULT:@SECLEVEL=0" } });

// Wrapper de fetch que agrega contexto legible al error (qué llamada era) y
// la causa real de bajo nivel (ENOTFOUND, certificado, timeout, etc.), que
// Node esconde atrás de un genérico "fetch failed".
async function fetchConContexto(contexto, url, opts) {
  try {
    return await fetch(url, opts);
  } catch (e) {
    const causa = e?.cause ? " — causa: " + (e.cause.code || e.cause.message || JSON.stringify(e.cause)) : "";
    throw new Error("Falló la conexión (" + contexto + ") a " + url + ": " + e.message + causa);
  }
}

function pem(b64, label) {
  const raw = Buffer.from(b64, "base64").toString("utf8");
  if (!raw.includes("BEGIN")) throw new Error("La variable de entorno " + label + " no contiene un PEM válido (¿está bien copiada en base64?)");
  return raw;
}

function getCertYKey() {
  const certB64 = process.env.ARCA_CERT_B64;
  const keyB64 = process.env.ARCA_KEY_B64;
  if (!certB64 || !keyB64) {
    throw new Error("Faltan las variables de entorno ARCA_CERT_B64 / ARCA_KEY_B64 en Vercel");
  }
  return { certPem: pem(certB64, "ARCA_CERT_B64"), keyPem: pem(keyB64, "ARCA_KEY_B64") };
}

function getCuit() {
  const cuit = process.env.ARCA_CUIT;
  if (!cuit) throw new Error("Falta la variable de entorno ARCA_CUIT en Vercel");
  return cuit;
}

// --- Firma CMS/PKCS7 del "Ticket de Requerimiento de Acceso" (TRA) ---
// Equivalente a `openssl smime -sign -nodetach -outform DER`, que es lo que
// pide WSAA. Usamos node-forge porque Node no trae esto de fábrica.
function firmarTRA(xmlTra, certPem, keyPem) {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xmlTra, "utf8");
  p7.addCertificate(certPem);
  p7.addSigner({
    key: keyPem,
    certificate: certPem,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() }
    ]
  });
  p7.sign({ detached: false });
  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function soapRequest(url, soapBody, soapAction) {
  const r = await fetchConContexto("llamar a " + url, url, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: soapAction || "" },
    body: soapBody,
    dispatcher: arcaAgent
  });
  const text = await r.text();
  if (!r.ok) throw new Error("HTTP " + r.status + " de " + url + ": " + text);
  if (text.includes("<faultstring>")) {
    const m = text.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
    throw new Error("ARCA rechazó la solicitud: " + (m ? m[1] : text));
  }
  return text;
}

// --- Login WSAA: pide un "Token de Acceso" (TA), válido ~12hs. Lo guardamos
// en Supabase para no pedir uno nuevo en cada factura (WSAA rechaza pedir un
// TA nuevo si el anterior todavía es válido). ---
async function obtenerTokenCacheado() {
  const r = await fetchConContexto("leer caché de token en Supabase", SUPABASE_URL + "/rest/v1/arca_wsaa_token?id=eq.1&select=*", {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
  const rows = await r.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (row && row.token && row.sign && row.expiration_time) {
    const vence = new Date(row.expiration_time).getTime();
    if (vence - Date.now() > 5 * 60000) {
      return { token: row.token, sign: row.sign };
    }
  }
  return null;
}

async function guardarTokenCache(token, sign, expirationTime) {
  await fetchConContexto("guardar caché de token en Supabase", SUPABASE_URL + "/rest/v1/arca_wsaa_token?id=eq.1", {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: "Bearer " + process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({ token, sign, expiration_time: expirationTime, updated_at: new Date().toISOString() })
  });
}

async function loginWSAA() {
  const cacheado = await obtenerTokenCacheado();
  if (cacheado) return cacheado;

  const { certPem, keyPem } = getCertYKey();
  const ahora = new Date();
  const gen = new Date(ahora.getTime() - 10 * 60000);
  const exp = new Date(ahora.getTime() + 10 * 60000);
  const tra = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${Math.floor(ahora.getTime() / 1000)}</uniqueId>
    <generationTime>${gen.toISOString()}</generationTime>
    <expirationTime>${exp.toISOString()}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  const cms = firmarTRA(tra, certPem, keyPem);
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const respTexto = await soapRequest(WSAA_URL, soapBody);
  const parsed = xmlParser.parse(respTexto);
  const loginCmsReturn = parsed?.Envelope?.Body?.loginCmsResponse?.loginCmsReturn;
  if (!loginCmsReturn) throw new Error("Respuesta de WSAA sin loginCmsReturn: " + respTexto);
  const cred = xmlParser.parse(loginCmsReturn);
  const token = cred?.loginTicketResponse?.credentials?.token;
  const sign = cred?.loginTicketResponse?.credentials?.sign;
  const expirationTime = cred?.loginTicketResponse?.header?.expirationTime;
  if (!token || !sign) throw new Error("WSAA no devolvió token/sign: " + loginCmsReturn);

  await guardarTokenCache(token, sign, expirationTime);
  return { token, sign };
}

// --- Consulta el último comprobante autorizado de un tipo (Factura C o Nota
// de Crédito C tienen numeración independiente) para saber qué número sigue ---
async function obtenerUltimoAutorizado(auth, cbteTipo) {
  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${getCuit()}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${PTO_VTA}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;
  const respTexto = await soapRequest(WSFE_URL, soapBody, "http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado");
  const parsed = xmlParser.parse(respTexto);
  const result = parsed?.Envelope?.Body?.FECompUltimoAutorizadoResponse?.FECompUltimoAutorizadoResult;
  if (!result) throw new Error("Respuesta de WSFE sin resultado: " + respTexto);
  return Number(result.CbteNro || 0);
}

function fechaYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return "" + y + m + day;
}

// --- Núcleo compartido: pide el CAE de un comprobante (Factura C o Nota de
// Crédito C) ante WSFE. ---
// datos: {
//   total, cuitCliente?, cbteTipo (11=Factura C, 13=Nota de Crédito C),
//   cbteAsoc?: { tipo, ptoVta, nro }  // obligatorio para Nota de Crédito
// }
async function solicitarComprobante(datos) {
  const cbteTipo = datos.cbteTipo || CBTE_TIPO_FACTURA;
  const auth = await loginWSAA();
  const ultimoNro = await obtenerUltimoAutorizado(auth, cbteTipo);
  const nro = ultimoNro + 1;

  const docTipo = datos.cuitCliente ? 80 : 99;
  const docNro = datos.cuitCliente ? datos.cuitCliente : 0;
  const total = Number(datos.total.toFixed(2));
  const fecha = fechaYYYYMMDD(new Date());

  const cbtesAsocXml = datos.cbteAsoc
    ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${datos.cbteAsoc.tipo}</ar:Tipo><ar:PtoVta>${datos.cbteAsoc.ptoVta}</ar:PtoVta><ar:Nro>${datos.cbteAsoc.nro}</ar:Nro></ar:CbteAsoc></ar:CbtesAsoc>`
    : "";

  const soapBody = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${auth.token}</ar:Token>
        <ar:Sign>${auth.sign}</ar:Sign>
        <ar:Cuit>${getCuit()}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${PTO_VTA}</ar:PtoVta>
          <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>1</ar:Concepto>
            <ar:DocTipo>${docTipo}</ar:DocTipo>
            <ar:DocNro>${docNro}</ar:DocNro>
            <ar:CbteDesde>${nro}</ar:CbteDesde>
            <ar:CbteHasta>${nro}</ar:CbteHasta>
            <ar:CbteFch>${fecha}</ar:CbteFch>
            <ar:ImpTotal>${total}</ar:ImpTotal>
            <ar:ImpTotConc>0</ar:ImpTotConc>
            <ar:ImpNeto>${total}</ar:ImpNeto>
            <ar:ImpOpEx>0</ar:ImpOpEx>
            <ar:ImpIVA>0</ar:ImpIVA>
            <ar:ImpTrib>0</ar:ImpTrib>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            ${cbtesAsocXml}
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

  const respTexto = await soapRequest(WSFE_URL, soapBody, "http://ar.gov.afip.dif.FEV1/FECAESolicitar");
  const parsed = xmlParser.parse(respTexto);
  const result = parsed?.Envelope?.Body?.FECAESolicitarResponse?.FECAESolicitarResult;
  if (!result) throw new Error("Respuesta de WSFE sin resultado: " + respTexto);

  const det = result?.FeDetResp?.FECAEDetResponse;
  const resultado = det?.Resultado;
  const cae = det?.CAE;
  const caeFchVto = det?.CAEFchVto;

  function juntarObservaciones(obj) {
    if (!obj) return [];
    const obs = obj.Obs || obj.Err;
    if (!obs) return [];
    const lista = Array.isArray(obs) ? obs : [obs];
    return lista.map(o => (o.Code ? "[" + o.Code + "] " : "") + (o.Msg || JSON.stringify(o)));
  }

  const observaciones = [
    ...juntarObservaciones(det?.Observaciones),
    ...juntarObservaciones(result?.Errors)
  ];

  if (resultado !== "A" || !cae) {
    throw new Error(
      "ARCA no autorizó el comprobante" + (observaciones.length ? ": " + observaciones.join(" | ") : " (sin detalle)")
    );
  }

  return {
    cae: String(cae),
    caeVencimiento: String(caeFchVto), // YYYYMMDD
    ptoVta: PTO_VTA,
    cbteTipo,
    nro,
    observaciones
  };
}

// datos: { total, cuitCliente? } — total en pesos (número), cuitCliente
// opcional (11 dígitos, sin guiones); si no viene, se factura a Consumidor
// Final.
export async function solicitarCAE(datos) {
  return solicitarComprobante({ ...datos, cbteTipo: CBTE_TIPO_FACTURA });
}

// datos: { total, cuitCliente?, cbteAsocPtoVta, cbteAsocNro } — emite una
// Nota de Crédito C asociada a la Factura C ya emitida (mismo cliente,
// mismo importe total que se quiere anular/corregir).
export async function solicitarNotaCredito(datos) {
  return solicitarComprobante({
    total: datos.total,
    cuitCliente: datos.cuitCliente,
    cbteTipo: CBTE_TIPO_NOTA_CREDITO,
    cbteAsoc: { tipo: CBTE_TIPO_FACTURA, ptoVta: datos.cbteAsocPtoVta, nro: datos.cbteAsocNro }
  });
}
