import { Chip, Dot, Meter } from '../components/ui.jsx';
import { colorOf } from '../lib/derive.js';
import { n0, n1 } from '../lib/format.js';

export default function Etapas({ d }) {
  let worst = { m: -1, txt: '' };
  d.plantas.forEach((p) => p.etapas.forEach((e) => {
    const m = e.e > 0 ? ((e.e - e.s) / e.e) * 100 : 0;
    if (m > worst.m) worst = { m, txt: `${e.n} · ${p.n}` };
  }));

  return (
    <>
      <p className="insight">
        {worst.m >= 0 ? (
          <>Mayor merma hoy: <b>{worst.txt}</b>, con {n1(worst.m)} %. Cada etapa se registra por separado, por eso se ve dónde se pierde.</>
        ) : (
          <>Todavía no hay registros por etapa hoy.</>
        )}
      </p>
      <div className="grid">
        {d.plantas.map((p) => {
          const base = p.etapas[0] && p.etapas[0].e > 0 ? p.etapas[0].e : 1;
          return (
            <section className="card c6" key={p.id}>
              <div className="card-h">
                <h2><Dot cls={p.cls} />{p.n}</h2>
                <span className="muted">Merma y tiempo por etapa, acumulado de hoy</span>
              </div>
              {p.etapas.map((e) => {
                const m = e.e > 0 ? ((e.e - e.s) / e.e) * 100 : 0;
                const k = m > 3 ? 'crit' : m > 2 ? 'warn' : 'ok';
                return (
                  <div className="erow" key={e.n}>
                    <span className="en">{e.n}</span>
                    <Meter
                      pct={(e.s / base) * 100}
                      color={colorOf(p.cls)}
                      tip={`${e.n} en ${p.n}\nEntran ${n0(e.e)}\nSalen ${n0(e.s)}\nMerma ${n0(e.e - e.s)} u`}
                    />
                    <span className="num">entran {n0(e.e)} · salen {n0(e.s)}</span>
                    <Chip k={k}>{n1(m)} %</Chip>
                    <span className="tm">{e.min != null ? `${e.min} min por lote` : 'sin tiempos'}</span>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
