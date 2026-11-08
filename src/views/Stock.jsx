import { Chip, Meter } from '../components/ui.jsx';
import { fmtIns, stIns } from '../lib/derive.js';
import { n0 } from '../lib/format.js';

const FILL = { ok: 'var(--s1)', warn: 'var(--warn)', crit: 'var(--crit)' };

export default function Stock({ d }) {
  const mx = Math.max(1, ...d.productos.map((p) => p.s));
  return (
    <div className="grid">
      <section className="card c7">
        <div className="card-h"><h2>Insumos y embalaje</h2><span className="muted">La marca vertical es el stock mínimo</span></div>
        {d.insumos.length === 0 ? <p className="empty">Todavía no hay insumos cargados.</p> : null}
        {d.insumos.map((x) => {
          const st = stIns(x);
          return (
            <div className="srow" key={x.n}>
              <span className="sname">{x.n}</span>
              <Meter
                pct={(x.s / x.cap) * 100}
                color={FILL[st[0]]}
                pace={(x.min / x.cap) * 100}
                tip={`${x.n}\nStock ${fmtIns(x)} ${x.u}\nMínimo ${n0(x.min)} ${x.u}`}
              />
              <span className="sval">{fmtIns(x)} <small>{x.u}</small></span>
              <Chip k={st[0]}>{st[1]}</Chip>
            </div>
          );
        })}
      </section>
      <section className="card c5">
        <div className="card-h"><h2>Producto terminado</h2><span className="muted">Unidades en stock</span></div>
        {d.productos.length === 0 ? <p className="empty">Todavía no hay producto terminado en stock.</p> : null}
        {d.productos.map((p) => (
          <div className="pstock" key={p.n}>
            <span>{p.n}</span>
            <Meter pct={(p.s / mx) * 100} color="var(--s1)" tip={`${p.n}: ${n0(p.s)} u`} />
            <span className="pv">{n0(p.s)}</span>
          </div>
        ))}
        <p className="source gap-top">Cada empaquetado suma stock y cada receta descuenta insumos, por movimientos. Nunca se edita un número a mano.</p>
      </section>
    </div>
  );
}
