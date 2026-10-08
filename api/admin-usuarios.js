// Gestión de usuarios y permisos del panel admin.
// Acciones (POST {accion, ...}): me | listar | crear | actualizar | clave
import { usuarioDelToken, listarUsuarios, sbHeaders } from "../lib/admin-auth.js";

const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";
// Quien no tiene email propio ingresa con "usuario"; internamente se guarda como usuario@dominio.
const DOMINIO_USUARIOS = "usuarios.petitscadeaux.com.ar";
const PERMISOS_VALIDOS = ["pedidos", "pedido_manual", "facturar", "envios", "productos", "clientes", "facturacion", "proveedor", "reportes", "auditoria"];

async function authAdmin(path, method, body) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/admin" + path, { method, headers: sbHeaders(), body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.msg || d.message || d.error_description || "Error de Supabase Auth");
  return d;
}
async function guardarFila(email, cambios, esNueva) {
  const url = SUPABASE_URL + "/rest/v1/usuarios_admin" + (esNueva ? "" : "?email=eq." + encodeURIComponent(email));
  const r = await fetch(url, { method: esNueva ? "POST" : "PATCH", headers: sbHeaders({ Prefer: "return=representation" }), body: JSON.stringify(cambios) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || "No se pudo guardar");
  return d[0];
}
const limpiarPermisos = (p) => (Array.isArray(p) ? p.filter((x) => PERMISOS_VALIDOS.includes(x)) : []);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Método no permitido" });
  try {
    const u = await usuarioDelToken(req);
    if (!u) return res.status(401).json({ ok: false, error: "Sesión inválida o vencida." });
    const { accion } = req.body || {};
    let { tabla, filas } = await listarUsuarios();

    if (!tabla) {
      // Todavía no se corrió sql-usuarios.sql: el panel sigue funcionando como antes.
      if (accion === "me") return res.status(200).json({ ok: true, configurado: false, email: u.email, rol: "admin", permisos: PERMISOS_VALIDOS });
      return res.status(200).json({ ok: false, error: "Primero corré sql-usuarios.sql en Supabase." });
    }

    // Primer ingreso: si no hay ningún administrador, quien entra queda como administración general.
    if (!filas.some((f) => f.rol === "admin" && f.activo)) {
      await guardarFila(u.email, { email: u.email, user_id: u.id, nombre: u.email.split("@")[0], rol: "admin", permisos: [], activo: true, creado_por: "primer ingreso" }, true).catch(async () => {
        await guardarFila(u.email, { rol: "admin", activo: true }, false);
      });
      ({ filas } = await listarUsuarios());
    }

    const yo = filas.find((f) => String(f.email).toLowerCase() === u.email);
    if (accion === "me") {
      if (!yo || !yo.activo) return res.status(200).json({ ok: true, configurado: true, email: u.email, rol: "ninguno", permisos: [] });
      return res.status(200).json({ ok: true, configurado: true, email: u.email, nombre: yo.nombre, rol: yo.rol, permisos: yo.rol === "admin" ? PERMISOS_VALIDOS : yo.permisos || [] });
    }

    if (!yo || !yo.activo || yo.rol !== "admin") return res.status(403).json({ ok: false, error: "Solo la administración general puede gestionar usuarios." });
    const b = req.body;

    if (accion === "listar") return res.status(200).json({ ok: true, usuarios: filas, permisosValidos: PERMISOS_VALIDOS });

    if (accion === "crear") {
      const usuario = String(b.usuario || "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) return res.status(200).json({ ok: false, error: "El usuario debe tener 3 a 30 letras minúsculas, números, punto, guion o guion bajo (sin espacios ni @)." });
      const contacto = String(b.email_contacto || "").trim().toLowerCase();
      if (contacto && !/^\S+@\S+\.\S+$/.test(contacto)) return res.status(200).json({ ok: false, error: "El email de contacto no es válido (o dejalo vacío)." });
      const email = usuario + "@" + DOMINIO_USUARIOS;
      if (!b.password || String(b.password).length < 8) return res.status(200).json({ ok: false, error: "La clave temporal debe tener al menos 8 caracteres." });
      if (filas.some((f) => f.email.toLowerCase() === email || (f.usuario || "").toLowerCase() === usuario)) return res.status(200).json({ ok: false, error: "Ese usuario ya existe." });
      const nuevo = await authAdmin("/users", "POST", { email, password: b.password, email_confirm: true });
      const rol = b.rol === "admin" ? "admin" : "equipo";
      await guardarFila(email, { email, usuario, email_contacto: contacto || null, user_id: nuevo.id, nombre: b.nombre || usuario, rol, permisos: rol === "admin" ? [] : limpiarPermisos(b.permisos), activo: true, creado_por: u.email }, true);
      return res.status(200).json({ ok: true });
    }

    const email = String(b.email || "").toLowerCase();
    const objetivo = filas.find((f) => f.email.toLowerCase() === email);
    if (!objetivo) return res.status(200).json({ ok: false, error: "Usuario no encontrado." });

    if (accion === "actualizar") {
      const cambios = {};
      if (b.email_contacto !== undefined) cambios.email_contacto = String(b.email_contacto || "").trim().toLowerCase() || null;
      if (b.nombre !== undefined) cambios.nombre = String(b.nombre).slice(0, 80);
      if (b.permisos !== undefined) cambios.permisos = limpiarPermisos(b.permisos);
      if (b.rol !== undefined) cambios.rol = b.rol === "admin" ? "admin" : "equipo";
      if (b.activo !== undefined) cambios.activo = !!b.activo;
      const quedaAdmin = (cambios.rol ?? objetivo.rol) === "admin" && (cambios.activo ?? objetivo.activo);
      const otrosAdmins = filas.filter((f) => f.email.toLowerCase() !== email && f.rol === "admin" && f.activo).length;
      if (!quedaAdmin && otrosAdmins === 0) return res.status(200).json({ ok: false, error: "Tiene que quedar al menos una administración general activa." });
      if (cambios.activo !== undefined && objetivo.user_id) await authAdmin("/users/" + objetivo.user_id, "PUT", { ban_duration: cambios.activo ? "none" : "876000h" });
      await guardarFila(email, cambios, false);
      return res.status(200).json({ ok: true });
    }

    if (accion === "clave") {
      if (!b.password || String(b.password).length < 8) return res.status(200).json({ ok: false, error: "La clave debe tener al menos 8 caracteres." });
      if (!objetivo.user_id) return res.status(200).json({ ok: false, error: "Este usuario no tiene id de acceso registrado." });
      await authAdmin("/users/" + objetivo.user_id, "PUT", { password: b.password });
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: false, error: "Acción desconocida." });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message || String(e) });
  }
}
