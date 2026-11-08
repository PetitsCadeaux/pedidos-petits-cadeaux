import { totals } from './derive.js';
import { n0, n1 } from './format.js';

// Frases del bot a partir de los datos reales del panel. Nada se inventa:
// cada frase sale de una cifra que ya está en el snapshot.
export function botMensajes(d) {
  const out = [];
  const t = totals(d);
  const f = d.frac;

  if (t.obj > 0 && t.pack > 0) {
    const exp = t.obj * f;
    const dl = exp > 0 ? (t.pack / exp - 1) * 100 : 0;
    out.push(
      dl >= -3
        ? `Vamos en ritmo: ${n0(t.pack)} de ${n0(t.obj)} u empaquetadas.`
        : `Vamos ${n1(Math.abs(dl))} % abajo del ritmo esperado.`,
    );
  } else if (t.pack > 0) {
    out.push(`Hoy se empaquetaron ${n0(t.pack)} u.`);
  }

  d.plantas.forEach((p) => {
    if (p.obj > 0 && f > 0) {
      const dl = (p.pack / (p.obj * f) - 1) * 100;
      if (dl < -10) out.push(`${p.n} va ${n1(Math.abs(dl))} % abajo de su ritmo.`);
    }
  });

  if (t.e0 > 0) {
    out.push(
      t.mer > 7 ? `Ojo con la merma: está en ${n1(t.mer)} %.`
        : t.mer > 5 ? `La merma está en ${n1(t.mer)} %, un poco sobre lo esperado.`
          : `La merma está en ${n1(t.mer)} %, dentro de lo esperado.`,
    );
  }

  const bajo = d.insumos.filter((x) => x.s < x.min);
  if (bajo.length > 0) {
    const nombres = bajo.slice(0, 2).map((x) => x.n).join(' y ');
    out.push(`Hay que reponer: ${nombres}${bajo.length > 2 ? ` y ${bajo.length - 2} más` : ''} bajo el mínimo.`);
  }

  if (d.paradas && d.paradas.min > 0) {
    out.push(`Hoy hubo ${n0(d.paradas.min)} min de paradas en ${d.paradas.n} ${d.paradas.n === 1 ? 'registro' : 'registros'}.`);
  }

  if (d.feed[0]) out.push(`Último registro a las ${d.feed[0].t}: ${d.feed[0].planta} · ${d.feed[0].etapa}.`);
  if (out.length === 0) out.push('Esperando el primer registro de hoy.');
  return out;
}
