// Simulador del modo demo: genera producción de ejemplo, un minuto de planta por tick.
// Devuelve el mismo formato que lib/live.js, así las vistas no saben de dónde vienen los datos.
import { CFG } from '../config.js';
import { hhmm, n1 } from './format.js';

const T0 = CFG.turnoIni * 60;
const T1 = CFG.turnoFin * 60;
const SLOTS = CFG.turnoFin - CFG.turnoIni;
const START = Math.min(T0 + 320, T1 - 60);

const ETAPAS = ['Producción', 'Horno', 'Desmolde', 'Empaquetado'];
const PRODUCTOS = [
  'Pan de hamburguesa clásico',
  'Pan de hamburguesa con sésamo',
  'Pan de hamburguesa brioche',
  'Pan de pancho',
];
const PLANTAS = [
  { id: 'pena', n: 'Peña', cls: 's1', obj: 7000, rate: 17.5, mer: [0.008, 0.026, 0.019, 0.006],
    tiempos: [38, 25, 9, 13], downs: [[T0 + 140, T0 + 148, 'Desmolde']] },
  { id: 'saraza', n: 'Saraza', cls: 's2', obj: 5500, rate: 13.2, mer: [0.011, 0.034, 0.022, 0.005],
    tiempos: [41, 29, 10, 14], downs: [[T0 + 220, T0 + 245, 'Horno 2']] },
];
const ORDENES = [
  { id: 'P-2411', p: 'pena', prod: 0, obj: 2400 },
  { id: 'P-2412', p: 'pena', prod: 1, obj: 2600 },
  { id: 'P-2413', p: 'pena', prod: 3, obj: 2000 },
  { id: 'S-1188', p: 'saraza', prod: 2, obj: 2000 },
  { id: 'S-1189', p: 'saraza', prod: 0, obj: 2100 },
  { id: 'S-1190', p: 'saraza', prod: 3, obj: 1400 },
];
const INSUMOS0 = [
  { n: 'Harina 000', u: 'kg', s: 5200, min: 3000, k: 0.05, cap: 6500, src: 'e0' },
  { n: 'Levadura fresca', u: 'kg', s: 137, min: 120, k: 0.0016, cap: 200, src: 'e0' },
  { n: 'Azúcar', u: 'kg', s: 380, min: 200, k: 0.004, cap: 500, src: 'e0' },
  { n: 'Margarina', u: 'kg', s: 410, min: 250, k: 0.0065, cap: 600, src: 'e0' },
  { n: 'Sal', u: 'kg', s: 160, min: 60, k: 0.001, cap: 250, src: 'e0' },
  { n: 'Sésamo', u: 'kg', s: 22.4, min: 20, k: 0.0004, cap: 60, src: 'e0' },
  { n: 'Bolsas 25×35', u: 'u', s: 9700, min: 9000, k: 0.0833, cap: 20000, src: 'pack' },
];

export function createDemo() {
  let S;

  function init() {
    S = {
      clock: T0,
      plant: {},
      feed: [],
      prod: [2900, 1850, 1500, 2300],
      ins: INSUMOS0.map((x) => ({ ...x })),
    };
    PLANTAS.forEach((P) => {
      S.plant[P.id] = {
        et: ETAPAS.map(() => ({ e: 0, s: 0 })),
        pack: 0,
        hourly: Array(SLOTS).fill(0),
        hist: [],
      };
    });
  }

  function ordenes() {
    const out = [];
    PLANTAS.forEach((P) => {
      const cum = S.plant[P.id].pack;
      let acc = 0;
      ORDENES.filter((o) => o.p === P.id).forEach((o) => {
        const done = Math.max(0, Math.min(o.obj, cum - acc));
        acc += o.obj;
        out.push({
          id: o.id,
          planta: P.n,
          cls: P.cls,
          producto: PRODUCTOS[o.prod],
          prod: o.prod,
          obj: o.obj,
          done,
          st: done >= o.obj ? 'Finalizada' : done > 0 ? 'En curso' : 'Planificada',
        });
      });
    });
    return out;
  }

  function prodDone() {
    const a = [0, 0, 0, 0];
    ordenes().forEach((x) => { a[x.prod] += x.done; });
    return a;
  }

  function addEvent(P, i, kind, text) {
    S.feed.unshift({ min: S.clock, planta: P.n, cls: P.cls, etapa: ETAPAS[i], kind, text });
    if (S.feed.length > 30) S.feed.pop();
  }

  function stepMinute() {
    const before = prodDone();
    PLANTAS.forEach((P) => {
      const pl = S.plant[P.id];
      const c = S.clock;
      const ramp = Math.min(1, 0.5 + ((c - T0) / 90) * 0.5);
      const down = P.downs.some((d) => c >= d[0] && c < d[1]);
      P.downs.forEach((d) => {
        if (c === d[0]) addEvent(P, 1, 'stop', `Parada en ${d[2]}`);
        if (c === d[1]) addEvent(P, 1, 'go', `Se reanudó ${d[2]}`);
      });
      let flow = down ? 0 : P.rate * ramp * (0.92 + Math.random() * 0.16);
      const e0in = flow;
      for (let i = 0; i < 4; i++) {
        const out = flow * (1 - P.mer[i] * (0.85 + Math.random() * 0.3));
        pl.et[i].e += flow;
        pl.et[i].s += out;
        flow = out;
      }
      pl.pack += flow;
      pl.hist.push(flow);
      if (pl.hist.length > 60) pl.hist.shift();
      const hi = Math.floor(c / 60) - CFG.turnoIni;
      if (hi >= 0 && hi < SLOTS) pl.hourly[hi] += flow;
      S.ins.forEach((x) => { x.s = Math.max(0, x.s - (x.src === 'pack' ? flow : e0in) * x.k); });
      if (!down && c % 3 === (P.id === 'pena' ? 0 : 1)) {
        const ei = Math.floor(Math.random() * 4);
        const ent = Math.round(60 + Math.random() * 90);
        const sal = Math.round(ent * (1 - P.mer[ei] * (0.7 + Math.random() * 0.8)));
        const lote = `L-${P.id.charAt(0).toUpperCase()}${10 + (c % 90)}`;
        addEvent(P, ei, 'reg', `Lote ${lote}: entran ${ent}, salen ${sal} (${n1(((ent - sal) / ent) * 100)} % de merma)`);
      }
    });
    const after = prodDone();
    for (let k = 0; k < 4; k++) {
      S.prod[k] = Math.max(0, S.prod[k] + (after[k] - before[k]) - Math.random() * 4);
    }
    S.clock++;
  }

  function boot() {
    init();
    for (let i = START - T0; i > 0; i--) stepMinute();
  }

  function paradas() {
    let min = 0;
    let n = 0;
    PLANTAS.forEach((P) => P.downs.forEach((d) => {
      if (S.clock > d[0]) { n++; min += Math.min(S.clock, d[1]) - d[0]; }
    }));
    return { min, n };
  }

  function snapshot() {
    const pd = prodDone();
    return {
      mode: 'demo',
      clockLabel: hhmm(S.clock),
      curHour: Math.floor(S.clock / 60),
      frac: Math.max(0, Math.min(1, (S.clock - T0) / (T1 - T0))),
      hours: Array.from({ length: SLOTS }, (_, i) => CFG.turnoIni + i),
      plantas: PLANTAS.map((P) => {
        const pl = S.plant[P.id];
        const h = pl.hist.reduce((s, x) => s + x, 0);
        return {
          id: P.id,
          n: P.n,
          cls: P.cls,
          obj: P.obj,
          pack: pl.pack,
          rate60: h * (60 / Math.max(1, pl.hist.length)),
          etapas: pl.et.map((e, i) => ({ n: ETAPAS[i], e: e.e, s: e.s, min: P.tiempos[i] })),
          hourly: pl.hourly.slice(),
        };
      }),
      feed: S.feed.slice(0, 12).map((e) => ({ t: hhmm(e.min), planta: e.planta, cls: e.cls, etapa: e.etapa, kind: e.kind, text: e.text })),
      insumos: S.ins.map((x) => ({ n: x.n, u: x.u, s: x.s, min: x.min, cap: x.cap })),
      productos: PRODUCTOS.map((n, k) => ({ n, s: S.prod[k] })),
      ordenes: ordenes(),
      paradas: paradas(),
      prodHoy: PRODUCTOS.map((n, k) => ({ n, v: pd[k] })),
    };
  }

  boot();
  return {
    snapshot,
    tick() {
      stepMinute();
      if (S.clock >= T1) boot();
    },
  };
}
