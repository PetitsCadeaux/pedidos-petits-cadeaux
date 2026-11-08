import { n0 } from '../lib/format.js';

function barPath(x, y, w, h, r, round) {
  if (h <= 0.5) return '';
  const rr = Math.min(r, h, w / 2);
  if (!round) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return `M${x} ${y + h}V${y + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}h${w - 2 * rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${y + h}z`;
}

function niceStep(x) {
  const c = [50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000];
  return c.find((v) => v >= x) || Math.ceil(x / 10000) * 10000;
}

export default function HourChart({ d, objetivo }) {
  const hours = d.hours;
  const slots = hours.length;
  const W = 640;
  const H = 300;
  const ml = 52;
  const mr = 14;
  const mt = 26;
  const mb = 34;
  const pw = W - ml - mr;
  const ph = H - mt - mb;
  const band = pw / slots;
  const bw = Math.min(28, band * 0.6);
  const gap = 2;
  const pace = objetivo > 0 ? objetivo / slots : 0;
  const tot = hours.map((_, i) => d.plantas.reduce((s, p) => s + (p.hourly[i] || 0), 0));
  const top = Math.max(pace * 1.2, ...tot, 1);
  const step = niceStep(top / 4);
  const ymax = step * 4;
  const Y = (v) => mt + ph - (v / ymax) * ph;
  const cur = d.curHour - hours[0];
  const ticks = [0, 1, 2, 3, 4].map((k) => k * step);

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Unidades empaquetadas por hora, por planta">
        {ticks.map((v) => (
          <g key={v}>
            <line className={v === 0 ? 'axis-l' : 'grid-l'} x1={ml} x2={W - mr} y1={Y(v)} y2={Y(v)} />
            <text className="ax" x={ml - 8} y={Y(v) + 4} textAnchor="end">{n0(v)}</text>
          </g>
        ))}
        {pace > 0 ? (
          <g>
            <line className="pace" x1={ml} x2={W - mr} y1={Y(pace)} y2={Y(pace)} />
            <text className="ax" x={W - mr} y={Y(pace) - 6} textAnchor="end">Ritmo necesario {n0(pace)} u/h</text>
          </g>
        ) : null}
        {hours.map((h, i) => {
          const cx = ml + band * i + band / 2;
          const x = cx - bw / 2;
          const segs = d.plantas.map((p) => ({ p, v: p.hourly[i] || 0 })).filter((s) => s.v > 0.5);
          let acc = 0;
          let topY = Y(0);
          const bars = segs.map((s, k) => {
            const hh = (s.v / ymax) * ph;
            const y = Y(0) - acc - hh - k * gap;
            acc += hh;
            topY = y;
            return <path key={s.p.id} className={`f${s.p.cls}`} d={barPath(x, y, bw, hh, 4, k === segs.length - 1)} />;
          });
          const lines = d.plantas.map((p) => `${p.n}: ${n0(p.hourly[i] || 0)} u`).join('\n');
          const label = `${String(h).padStart(2, '0')}:00 a ${String(h + 1).padStart(2, '0')}:00${i === cur ? ' (en curso)' : ''}`;
          const tip = tot[i] > 0 ? `${label}\n${lines}\nTotal: ${n0(tot[i])} u` : `${label}\nSin registros todavía`;
          return (
            <g key={h}>
              {bars}
              {i === cur && tot[i] > 0 ? (
                <text className="val" x={cx} y={topY - 6} textAnchor="middle">{n0(tot[i])}</text>
              ) : null}
              <text className="ax" x={cx} y={H - 12} textAnchor="middle">{String(h).padStart(2, '0')} h</text>
              <rect className="hit" x={ml + band * i} y={mt} width={band} height={ph} data-tip={tip} />
            </g>
          );
        })}
      </svg>
      <table className="sr">
        <caption>Empaquetado por hora</caption>
        <thead>
          <tr>
            <th>Hora</th>
            {d.plantas.map((p) => <th key={p.id}>{p.n}</th>)}
          </tr>
        </thead>
        <tbody>
          {hours.map((h, i) => (
            <tr key={h}>
              <th scope="row">{h} h</th>
              {d.plantas.map((p) => <td key={p.id}>{n0(p.hourly[i] || 0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
