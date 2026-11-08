import { Chip, Dot, Meter } from '../components/ui.jsx';
import { colorOf } from '../lib/derive.js';
import { n0, n1 } from '../lib/format.js';

function Estado({ st }) {
  if (st === 'Finalizada') return <Chip k="ok">Finalizada</Chip>;
  if (st === 'En curso') return <span className="chip"><i className="dot s1 flat" /><span>En curso</span></span>;
  return <Chip>{st}</Chip>;
}

export default function Ordenes({ d }) {
  return (
    <div className="grid">
      <section className="card c12">
        <div className="card-h"><h2>Órdenes de producción del turno</h2><span className="muted">Avance contra el objetivo de cada orden</span></div>
        {d.ordenes.length === 0 ? <p className="empty">No hay órdenes cargadas para hoy.</p> : (
          <div className="tblwrap">
            <table>
              <thead>
                <tr>
                  <th>Orden</th><th>Planta</th><th>Producto</th>
                  <th className="r">Objetivo</th><th className="r">Empaquetado</th>
                  <th>Avance</th><th className="r">%</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {d.ordenes.map((o) => {
                  const pct = o.obj > 0 ? (o.done / o.obj) * 100 : 0;
                  return (
                    <tr key={`${o.planta}-${o.id}`}>
                      <td><b>{o.id}</b></td>
                      <td><Dot cls={o.cls} />{o.planta}</td>
                      <td>{o.producto}</td>
                      <td className="r">{n0(o.obj)}</td>
                      <td className="r">{n0(o.done)}</td>
                      <td><Meter pct={pct} color={colorOf(o.cls)} tip={`${o.id}: ${n1(pct)} %`} /></td>
                      <td className="r">{n0(pct)} %</td>
                      <td><Estado st={o.st} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
