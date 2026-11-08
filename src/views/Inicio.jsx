import { useRef, useState } from 'react';
import { Chip, Dot, Meter, PlantMeter } from '../components/ui.jsx';
import { CFG } from '../config.js';
import { fmtIns, stIns, totals } from '../lib/derive.js';
import { n0, n1 } from '../lib/format.js';

const NODES = [
  { id: 'prod', n: 'Producción', a: 180, sub: 'Peña · Saraza' },
  { id: 'compras', n: 'Compras', a: 135, sub: 'Insumos y embalaje' },
  { id: 'logi', n: 'Logística', a: 90, sub: 'Flota y envíos' },
  { id: 'venta', n: 'Venta', a: 0, sub: 'Pedidos y clientes' },
  { id: 'fin', n: 'Finanzas', a: -45, sub: 'Flujo de caja' },
  { id: 'admin', n: 'Administración', a: -90, sub: 'Facturación y cobranzas' },
  { id: 'rrhh', n: 'RRHH', a: -135, sub: 'Reloj y recibos' },
];
// A qué pantalla entra el pin de cada área. Cuando integres otra, sumala acá y en config.js.
const ENTRA = { prod: 'produccion', compras: 'stock' };

const LINKS = [
  ['prod', 'compras', 5, 'El stock de materia prima baja por receta y dispara las compras'],
  ['prod', 'venta', 4, 'Los pedidos marcan qué hay que producir'],
  ['venta', 'admin', 4, 'Facturación con stock'],
  ['admin', 'fin', 4, 'Flujo de caja proyectado'],
  ['prod', 'logi', 3, 'Traslados interplanta y retiro de materia prima'],
  ['compras', 'logi', 3, 'Abastece a producción y a logística'],
  ['compras', 'admin', 3, 'Cuentas a pagar a proveedores'],
  ['venta', 'logi', 3, 'Entregas en AMBA y expresos'],
  ['rrhh', 'admin', 3, 'Recibos de sueldo y pago de sueldos'],
  ['prod', 'rrhh', 2, 'Quién hizo cada etapa y cuántas horas'],
];
const CX = 380;
const CY = 250;
const RX = 290;
const RY = 185;

const byId = (id) => NODES.find((n) => n.id === id);
const linksOf = (id) => LINKS.filter((l) => l[0] === id || l[1] === id);
const pos = (n) => {
  const r = (n.a * Math.PI) / 180;
  return { x: CX + RX * Math.cos(r), y: CY - RY * Math.sin(r) };
};
const activo = (id) => Boolean(CFG.modulos[id]);
const sinMov = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

function Pin({ x, y, on, name, onEnter }) {
  const act = on;
  return (
    <g
      className={`pin ${act ? 'on' : 'off'}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={act ? 0 : -1}
      aria-disabled={!act}
      aria-label={act ? `Entrar a ${name}` : `${name}, próximamente`}
      data-tip={act ? `Entrar a ${name}` : `${name}: próximamente`}
      onClick={(e) => { e.stopPropagation(); if (act) onEnter(); }}
      onKeyDown={(e) => {
        if (act && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); onEnter(); }
      }}
    >
      {act ? <circle className="pin-ring" cx="0" cy="-8" r="9" /> : null}
      <circle className="pin-hit" cx="0" cy="-8" r="17" />
      <path className="pin-body" d="M0 0C-3 -5 -9 -9 -9 -15a9 9 0 0 1 18 0C9 -9 3 -5 0 0z" />
      <circle className="pin-dot" cx="0" cy="-15" r="3.2" />
    </g>
  );
}

export default function Inicio({ d, go }) {
  const [sel, setSel] = useState('prod');
  const lastClick = useRef(0);

  const choose = (id) => { lastClick.current = Date.now(); setSel(id); };
  const entrar = (id) => { if (ENTRA[id] && activo(id)) go(ENTRA[id]); };
  const rel = new Set([sel]);
  linksOf(sel).forEach((l) => { rel.add(l[0]); rel.add(l[1]); });
  const node = byId(sel);
  const movimiento = !sinMov();

  const t = totals(d);
  const f = d.frac;
  const exp = t.obj * f;
  const hasObj = t.obj > 0;
  const delta = exp > 0 ? (t.pack / exp - 1) * 100 : 0;
  const st = !hasObj ? null : delta >= -3 ? ['ok', 'En ritmo'] : delta >= -10 ? ['warn', 'Algo bajo el ritmo'] : ['crit', 'Bajo el ritmo'];
  const ms = t.mer <= 5 ? ['ok', 'Merma normal'] : t.mer <= 7 ? ['warn', 'Merma sobre lo esperado'] : ['crit', 'Merma muy alta'];
  const enCurso = d.ordenes.filter((o) => o.st === 'En curso').length;
  const demo = d.mode === 'demo';
  const alertas = d.insumos
    .map((x) => ({ x, k: stIns(x) }))
    .filter((r) => r.k[0] !== 'ok')
    .sort((a, b) => (a.k[0] === 'crit' ? 0 : 1) - (b.k[0] === 'crit' ? 0 : 1));
  const crit = alertas.filter((r) => r.k[0] === 'crit');
  const vinc = [...linksOf(sel)].sort((a, b) => b[2] - a[2]).map((l) => byId(l[0] === sel ? l[1] : l[0]).n);

  return (
    <div className="grid home">
      <section className="card c8 mapcard">
        <div className="card-h">
          <h2>Cómo se conecta {CFG.empresa}</h2>
          <span className="muted">Tocá un pin para entrar al área.</span>
        </div>
        <svg className="hub" viewBox="0 0 760 490" role="group" aria-label="Mapa de áreas">
          {NODES.map((n) => {
            const p = pos(n);
            return <line key={`s-${n.id}`} className="spoke" x1={CX} y1={CY} x2={p.x} y2={p.y} />;
          })}
          {LINKS.map((l) => {
            const a = pos(byId(l[0]));
            const b = pos(byId(l[1]));
            const on = l[0] === sel || l[1] === sel;
            const ready = activo(l[0]) && activo(l[1]);
            const dd = l[0] === 'prod' && l[1] === 'venta'
              ? `M${a.x} ${a.y}Q${CX} 30 ${b.x} ${b.y}`
              : `M${a.x} ${a.y}L${b.x} ${b.y}`;
            return (
              <g key={`${l[0]}-${l[1]}`}>
                <path
                  className="lnk"
                  d={dd}
                  stroke={on ? 'var(--ink)' : 'var(--axis)'}
                  strokeWidth={1 + l[2] * 0.8}
                  strokeDasharray={ready ? undefined : '3 7'}
                  opacity={ready ? (on ? 1 : 0.8) : on ? 0.8 : 0.45}
                >
                  <title>{`${l[3]}${ready ? '' : ' (todavía no integrado)'}`}</title>
                </path>
                {ready && movimiento ? (
                  <circle r="4.5" className="pulse">
                    <animateMotion dur="2.6s" repeatCount="indefinite" path={dd} />
                  </circle>
                ) : null}
              </g>
            );
          })}
          <circle className="core" cx={CX} cy={CY} r="50" />
          <text className="ct" x={CX} y={CY + 6} textAnchor="middle">{CFG.empresa.toUpperCase()}</text>
          {NODES.map((n) => {
            const p = pos(n);
            const cls = n.id === sel ? 'nsel' : rel.has(n.id) ? 'nrel' : 'ndim';
            const act = activo(n.id);
            return (
              <g key={n.id}>
                <g
                  className={`${cls} ${act ? '' : 'npend'}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`${n.n}${act ? '' : ', próximamente'}`}
                  onClick={() => choose(n.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(n.id); } }}
                >
                  <rect className="nbox" x={p.x - 66} y={p.y - 23} width="132" height="46" rx="10" />
                  <text className="nt" x={p.x} y={p.y - 2} textAnchor="middle">{n.n}</text>
                  <text className="ns" x={p.x} y={p.y + 14} textAnchor="middle">{act ? n.sub : 'Próximamente'}</text>
                </g>
                <Pin x={p.x + 60} y={p.y - 18} on={act && Boolean(ENTRA[n.id])} name={n.n} onEnter={() => entrar(n.id)} />
              </g>
            );
          })}
        </svg>
        <p className="sel-line"><b>{node.n}</b> <span className="muted">· vinculado con {vinc.slice(0, 3).join(', ')}</span>
          {ENTRA[sel] && activo(sel) ? <button className="btn" type="button" onClick={() => entrar(sel)}>Entrar a {node.n} →</button> : null}
          {!activo(sel) ? <span className="muted"> · módulo todavía no integrado</span> : null}
        </p>
        <p className="legend pinleg">
          <span><i className="pinkey on" />Área integrada: tocá el pin para entrar</span>
          <span><i className="pinkey" />Próximamente</span>
        </p>
      </section>

      <div className="c4 side">
        <section className="card live">
          <div className="live-h">
            <span className="live-sq" aria-hidden="true" />
            <b>EN VIVO</b>
            <span className="live-area">Producción</span>
            {demo ? <small className="muted">datos de ejemplo</small> : null}
          </div>
          <p className="lbl">Empaquetado de hoy</p>
          <p className="hero-val side-hero">
            {n0(t.pack)}
            <span className="hero-of">{hasObj ? `de ${n0(t.obj)} u` : 'u'}</span>
          </p>
          <Meter
            className="big"
            pct={hasObj ? (t.pack / t.obj) * 100 : 0}
            color="var(--ink)"
            pace={hasObj ? f * 100 : null}
            tip={hasObj ? `Avance: ${n1((t.pack / t.obj) * 100)} %\nRitmo esperado: ${n0(exp)} u` : undefined}
          />
          <p className="hero-sub">
            {st ? <Chip k={st[0]}>{st[1]}</Chip> : <Chip>Sin meta cargada</Chip>}
            {st ? <span>{(delta >= 0 ? '+' : '−') + n1(Math.abs(delta))} % vs. ritmo</span> : null}
          </p>
          {d.plantas.map((p) => (
            <div className="prow compact" key={p.id}>
              <span className="nm"><Dot cls={p.cls} />{p.n}</span>
              <PlantMeter planta={p} pace={p.obj > 0 ? f * 100 : null} tip={`${p.n}: ${n0(p.pack)} de ${n0(p.obj)} u`} />
              <span className="vl">{n0(p.pack)} · {n0(p.rate60)} u/h</span>
            </div>
          ))}
          <p className="hero-sub chips2">
            {t.e0 > 0 ? <Chip k={ms[0]}>{n1(t.mer)} % · {ms[1]}</Chip> : null}
            <Chip>{enCurso} {enCurso === 1 ? 'orden en curso' : 'órdenes en curso'}</Chip>
            {d.paradas.min > 0 ? <Chip k="warn">{n0(d.paradas.min)} min de paradas</Chip> : null}
          </p>
          <button className="btn solid enter" type="button" onClick={() => go('produccion')}>Entrar a Producción →</button>
        </section>

        <section className={`card alerta ${crit.length ? 'hot' : ''}`}>
          <div className="card-h">
            <h2>Alerta insumos</h2>
            {crit.length ? <Chip k="crit">{crit.length} bajo mínimo</Chip> : alertas.length ? <Chip k="warn">Cerca del mínimo</Chip> : <Chip k="ok">Todo en orden</Chip>}
          </div>
          {alertas.length === 0 ? <p className="empty">Todos los insumos están por encima de su mínimo.</p> : (
            <ul className="lines">
              {alertas.slice(0, 3).map(({ x, k }) => (
                <li key={x.n}>
                  <span><Chip k={k[0]}>{k[1]}</Chip> <b>{x.n}</b></span>
                  <span>{fmtIns(x)} / {n0(x.min)} {x.u}</span>
                </li>
              ))}
            </ul>
          )}
          {alertas.length > 3 ? <p className="muted sm-more">y {alertas.length - 3} más · ver Stock</p> : null}
        </section>
      </div>
    </div>
  );
}
