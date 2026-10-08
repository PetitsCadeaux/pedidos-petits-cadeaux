// Verifica quién llama a la API (token de login de Supabase) y qué permisos tiene.
// Usa SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SERVICE_KEY, por compatibilidad).
const SUPABASE_URL = "https://stkfdzqwcnzievrmivaj.supabase.co";

export function serviceKey() {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!k) throw new Error("Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY en Vercel");
  return k;
}

export function sbHeaders(extra = {}) {
  const k = serviceKey();
  return { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json", ...extra };
}

// Devuelve {email} del token, o null si no es válido.
export async function usuarioDelToken(req) {
  const h = req.headers.authorization || req.headers.Authorization || "";
  const token = h.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { apikey: serviceKey(), Authorization: "Bearer " + token },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.email ? { email: String(u.email).toLowerCase(), id: u.id } : null;
}

// {tabla: false} si todavía no se corrió sql-usuarios.sql; {filas: [...]} si existe.
export async function listarUsuarios() {
  const r = await fetch(SUPABASE_URL + "/rest/v1/usuarios_admin?select=*&order=creado_en.asc", { headers: sbHeaders() });
  if (r.status === 404) return { tabla: false, filas: [] };
  const d = await r.json();
  if (!r.ok) {
    if (d && (d.code === "42P01" || d.code === "PGRST205")) return { tabla: false, filas: [] };
    throw new Error(d.message || "No se pudo leer usuarios_admin");
  }
  return { tabla: true, filas: d };
}

// Exige un permiso. Si la tabla no existe o está vacía (todavía no se configuró),
// deja pasar a cualquier usuario logueado para no trabar el sistema actual.
export async function requierePermiso(req, res, permiso) {
  const u = await usuarioDelToken(req);
  if (!u) { res.status(401).json({ ok: false, error: "Sesión inválida o vencida. Volvé a iniciar sesión." }); return null; }
  const { tabla, filas } = await listarUsuarios();
  if (!tabla || filas.length === 0) return u;
  const yo = filas.find((f) => String(f.email).toLowerCase() === u.email);
  const ok = yo && yo.activo && (yo.rol === "admin" || (yo.permisos || []).includes(permiso));
  if (!ok) { res.status(403).json({ ok: false, error: "No tenés permiso para esta acción (" + permiso + ")." }); return null; }
  return { ...u, rol: yo.rol };
}
