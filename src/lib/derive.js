import { n0, n1 } from './format.js';

export function totals(d) {
  let pack = 0;
  let obj = 0;
  let e0 = 0;
  d.plantas.forEach((p) => {
    pack += p.pack;
    obj += p.obj;
    e0 += p.etapas[0] ? p.etapas[0].e : 0;
  });
  return { pack, obj, e0, mer: e0 > 0 ? Math.max(0, ((e0 - pack) / e0) * 100) : 0 };
}

export const stIns = (x) =>
  x.s < x.min ? ['crit', 'Bajo mínimo'] : x.s < x.min * 1.15 ? ['warn', 'Cerca del mínimo'] : ['ok', 'Normal'];

export const fmtIns = (x) => (x.u === 'kg' && x.s < 100 ? n1(x.s) : n0(x.s));

export const colorOf = (cls) => `var(--${cls})`;
