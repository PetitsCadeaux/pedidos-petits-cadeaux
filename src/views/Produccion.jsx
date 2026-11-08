import { Chip, Dot, Meter, PlantMeter } from '../components/ui.jsx';
import HourChart from '../components/HourChart.jsx';
import { totals } from '../lib/derive.js';
import { n0, n1 } from '../lib/format.js';

function FeedItem({ e }) {
  return (
    <li>
      <time>{e.t}</time>
      <div>
        <b><Dot cls={e.cls} />{e.planta} · {e.etapa}</b>
        {e.kind === 'stop' ? <div className="gap-top"><Chip k="warn">{e.text}</Chip></div> : null}
        {e.kind === 'go' ? <div className="gap-top"><Chip k="ok">{e.text}</Chip></div> : null}
        {e.kind === 'reg' ? <span className="sm">{e.text}</span> : null}
      </div>
    </li>
  );
}

export default function Produccion({ d }) {
  const t = totals(d);
  const f = d.frac;
  const exp = t.obj * f;
  const hasObj = t.obj > 0;
  const delta = exp > 0 ? (t.pack / exp - 1) * 100 : 0;
  const st = !hasObj ? null : delta >= -3 ? ['ok', 'En ritmo'] : delta >= -10 ? ['warn', 'Algo bajo el ritmo'] : ['crit', 'Bajo el ritmo'];
  const ms = t.mer <= 5 ? ['ok', 'Dentro de lo esperado'] : t.mer <= 7 ? ['warn', 'Sobre lo esperado'] : ['crit', 'Muy alta'];
  const enCurso = d.ordenes.filter((o) => o.st === 'En curso').length;
  const bajo = d.insumos.filter((x) => x.s < x.min).length;
  const sinDatos = t.pack === 0 && !hasObj && d.feed.length === 0;

  return (
    <div className="grid big">
      <section className="card c7">
        <h2 className="lbl">Empaquetado de hoy</h2>
        <p className="hero-val">
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
          {st ? <span>{(delta >= 0 ? '+' : '−') + n1(Math.abs(delta))} % frente al ritmo esperado</span> : <span>Cargá órdenes de producción para ver el ritmo.</span>}
        </p>
        {d.plantas.map((p) => (
          <div className="prow" key={p.id}>
            <span className="nm"><Dot cls={p.cls} />{p.n}</span>
            <PlantMeter
              planta={p}
              pace={p.obj > 0 ? f * 100 : null}
              tip={`${p.n}: ${n0(p.pack)} de ${n0(p.obj)} u\nRitmo esperado a esta hora: ${n0(p.obj * f)} u`}
            />
            <span className="vl">{n0(p.pack)} / {n0(p.obj)} · {n0(p.rate60)} u/h</span>
          </div>
        ))}
        {sinDatos ? <p className="empty">Todavía no hay registros de hoy. Apenas se cargue la primera etapa, el panel se llena solo.</p> : null}
      </section>

      <div className="c5 tiles">
        <section className="card">
          <h2 className="lbl">Merma total</h2>
          <p className="tile-val">{n1(t.mer)} %</p>
          <p className="tile-sub"><Chip k={ms[0]}>{ms[1]}</Chip></p>
        </section>
        <section className="card">
          <h2 className="lbl">Órdenes en curso</h2>
          <p className="tile-val">{enCurso}</p>
          <p className="tile-sub">de {d.ordenes.length} órdenes del turno</p>
        </section>
        <section className="card">
          <h2 className="lbl">Insumos bajo mínimo</h2>
          <p className="tile-val">{bajo}</p>
          <p className="tile-sub">{bajo > 0 ? <Chip k="crit">Reponer</Chip> : <Chip k="ok">Todo en orden</Chip>}</p>
        </section>
        <section className="card">
          <h2 className="lbl">Paradas de hoy</h2>
          <p className="tile-val">{d.paradas.min} <span className="hero-of">min</span></p>
          <p className="tile-sub">{d.paradas.n} {d.paradas.n === 1 ? 'parada registrada' : 'paradas registradas'}</p>
        </section>
      </div>

      <section className="card c7">
        <div className="card-h"><h2>Empaquetado por hora</h2></div>
        <div className="legend">
          {d.plantas.map((p) => <span key={p.id}><i className={`sw ${p.cls}`} />{p.n}</span>)}
          <span><i className="lk" />Ritmo necesario para la meta</span>
        </div>
        <HourChart d={d} objetivo={t.obj} />
      </section>

      <section className="card c5">
        <div className="card-h"><h2>Últimos registros</h2><span className="muted">Se cargan etapa por etapa</span></div>
        <ul className="feed">
          {d.feed.slice(0, 7).map((e, i) => <FeedItem key={`${e.t}-${i}`} e={e} />)}
        </ul>
      </section>
    </div>
  );
}
