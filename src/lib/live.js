// Lectura de datos reales desde las vistas de Supabase (ver supabase/schema.sql).
// Devuelve el mismo formato que lib/demo.js.
import { CFG } from '../config.js';
import { n1 } from './format.js';

const num = (x) => Number(x) || 0;

function localParts() {
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: CFG.zona, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const o = {};
  f.formatToParts(new Date()).forEach((p) => { o[p.type] = p.value; });
  const hour = Number(o.hour) % 24;
  return { date: `${o.year}-${o.month}-${o.day}`, hour, minute: Number(o.minute) };
}

function hhmmLocal(iso) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: CFG.zona, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(iso));
}

function must(r) {
  if (r.error) throw r.error;
  return r.data || [];
}

export async function loadLive(sb) {
  const lp = localParts();
  const [prod, hora, ord, ins, pst, reg, par] = await Promise.all([
    sb.from('v_produccion_hoy').select('*'),
    sb.from('v_produccion_hora').select('*'),
    sb.from('v_avance_ordenes').select('*').eq('fecha', lp.date),
    sb.from('v_stock_insumos').select('*').order('nombre'),
    sb.from('v_stock_productos').select('*').order('nombre'),
    sb.from('v_ultimos_registros').select('*').limit(12),
    sb.from('v_paradas_hoy').select('*'),
  ]).then((rs) => rs.map(must));

  const slots = CFG.turnoFin - CFG.turnoIni;
  const hours = Array.from({ length: slots }, (_, i) => CFG.turnoIni + i);

  // plantas: unión de las que tienen registros u órdenes hoy
  const names = Array.from(new Set([...prod.map((r) => r.planta), ...ord.map((r) => r.planta)])).sort();

  // etapas: unión ordenada, así todas las plantas muestran la misma lista
  const etapaMap = new Map();
  prod.forEach((r) => etapaMap.set(r.etapa, { orden: num(r.orden), ingresa: !!r.ingresa_stock }));
  const etapas = Array.from(etapaMap.entries())
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([n, v]) => ({ n, ingresa: v.ingresa }));
  const packName = (etapas.find((e) => e.ingresa) || etapas[etapas.length - 1] || {}).n;

  const plantas = names.map((name, idx) => {
    const rows = prod.filter((r) => r.planta === name);
    const et = etapas.map((e) => {
      const rr = rows.filter((r) => r.etapa === e.n);
      const mins = rr.map((r) => num(r.min_prom)).filter((x) => x > 0);
      return {
        n: e.n,
        e: rr.reduce((s, r) => s + num(r.entrada), 0),
        s: rr.reduce((s, r) => s + num(r.salida), 0),
        min: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null,
      };
    });
    const pack = (et.find((e) => e.n === packName) || { s: 0 }).s;
    const hourly = hours.map((h) =>
      hora.filter((r) => r.planta === name && num(r.hora) === h).reduce((s, r) => s + num(r.empaquetado), 0));
    const obj = ord
      .filter((o) => o.planta === name && o.estado !== 'cancelada')
      .reduce((s, o) => s + num(o.cantidad_objetivo), 0);
    const last = hourly[lp.hour - CFG.turnoIni] || 0;
    return { id: name, n: name, cls: `s${(idx % 4) + 1}`, obj, pack, rate60: last, etapas: et, hourly };
  });

  const estadoTxt = { finalizada: 'Finalizada', en_curso: 'En curso', planificada: 'Planificada', cancelada: 'Cancelada' };
  const ordenes = ord.map((o) => {
    const pl = plantas.find((p) => p.n === o.planta);
    return {
      id: o.lote || String(o.orden_id).slice(0, 6),
      planta: o.planta,
      cls: pl ? pl.cls : 's1',
      producto: o.producto,
      obj: num(o.cantidad_objetivo),
      done: num(o.empaquetado),
      st: estadoTxt[o.estado] || o.estado,
    };
  });

  const byProd = {};
  prod.filter((r) => r.etapa === packName).forEach((r) => {
    byProd[r.producto] = (byProd[r.producto] || 0) + num(r.salida);
  });

  const nowMin = lp.hour * 60 + lp.minute;
  const frac = Math.max(0, Math.min(1, (nowMin - CFG.turnoIni * 60) / ((CFG.turnoFin - CFG.turnoIni) * 60)));

  return {
    mode: 'real',
    clockLabel: `${String(lp.hour).padStart(2, '0')}:${String(lp.minute).padStart(2, '0')}`,
    curHour: lp.hour,
    frac,
    hours,
    plantas,
    feed: reg.map((r) => ({
      t: hhmmLocal(r.creado_en),
      planta: r.planta,
      cls: (plantas.find((p) => p.n === r.planta) || { cls: 's1' }).cls,
      etapa: r.etapa,
      kind: 'reg',
      text: `Lote ${r.lote || '—'}: entran ${Math.round(num(r.cantidad_entrada))}, salen ${Math.round(num(r.cantidad_salida))} (${n1(num(r.cantidad_entrada) > 0 ? (num(r.merma) / num(r.cantidad_entrada)) * 100 : 0)} % de merma)`,
    })),
    insumos: ins.map((x) => ({
      n: x.nombre, u: x.unidad, s: num(x.stock_actual), min: num(x.stock_minimo),
      cap: Math.max(num(x.stock_actual), num(x.stock_minimo) * 2, 1),
    })),
    productos: pst.map((x) => ({ n: x.variante ? `${x.nombre} ${x.variante}` : x.nombre, s: num(x.stock_actual) })),
    ordenes,
    paradas: { min: Math.round(par.reduce((s, r) => s + num(r.minutos), 0)), n: par.length },
    prodHoy: Object.entries(byProd).map(([n, v]) => ({ n, v })),
  };
}
