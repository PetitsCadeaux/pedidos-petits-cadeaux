import { useEffect, useRef, useState } from 'react';
import Mascota from './Mascota.jsx';
import { totals } from '../lib/derive.js';
import { ding } from '../lib/sonido.js';

// La mascota camina por la línea de abajo y cada tanto se frena: saluda, guiña, señala, muestra la hamburguesa, se ríe o se duerme.
// Además reacciona a los datos reales: se enoja con un insumo bajo mínimo, se sorprende con una
// parada nueva y festeja cuando se llega a la meta de empaquetado.
const GESTOS = [['wave', 4200], ['guino', 4800], ['laugh', 5200], ['burger', 5000], ['senala', 4200], ['sleep', 9000]];

export default function Caminante({ d, onClick }) {
  const [est, setEst] = useState({ e: 'walk' });
  const timer = useRef(null);
  const prev = useRef(null);
  const dRef = useRef(d);
  dRef.current = d;

  const t = totals(d);
  const critN = d.insumos.filter((x) => x.s < x.min).length;
  const paraN = d.paradas ? d.paradas.n : 0;
  const ordN = d.ordenes ? d.ordenes.length : 0;
  const hit = t.obj > 0 && t.pack >= t.obj;

  const caminar = (ms, i = Math.floor(Math.random() * GESTOS.length)) => {
    clearTimeout(timer.current);
    setEst({ e: 'walk' });
    timer.current = setTimeout(() => {
      const [g, dur] = GESTOS[i % GESTOS.length];
      setEst({ e: g });
      timer.current = setTimeout(() => caminar(14000, i + 1), dur);
    }, ms);
  };
  const SON = { angry: 'alerta', wow: 'sorpresa', party: 'festejo', senala: 'ding' };
  const play = (e, dur, texto) => {
    ding(SON[e]);
    clearTimeout(timer.current);
    setEst({ e, texto });
    timer.current = setTimeout(() => caminar(10000), dur);
  };
  const textos = {
    angry: () => {
      const x = dRef.current.insumos.find((r) => r.s < r.min);
      return x ? `¡Falta ${x.n}!` : '¡Ojo con el stock!';
    },
    wow: () => {
      const s = dRef.current.feed.find((e) => e.kind === 'stop');
      return s ? `¡Parada en ${s.planta}!` : '¡Hubo una parada!';
    },
    party: () => '¡Meta lograda!',
    senala: () => '¡Nueva orden!',
  };

  useEffect(() => {
    caminar(6000);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al abrir el panel: si ya hay algo para avisar, avisa una vez que pasó la bienvenida.
  useEffect(() => {
    const w = setTimeout(() => {
      const x = dRef.current;
      const tt = totals(x);
      if (tt.obj > 0 && tt.pack >= tt.obj) play('party', 8000, textos.party());
      else if (x.insumos.some((r) => r.s < r.min)) play('angry', 6500, textos.angry());
    }, 9000);
    return () => clearTimeout(w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Después, reacciona cuando algo cambia.
  useEffect(() => {
    const p = prev.current;
    prev.current = { critN, paraN, hit, ordN };
    if (!p) return;
    if (ordN > p.ordN) play('senala', 5000, textos.senala());
    else if (paraN > p.paraN) play('wow', 5500, textos.wow());
    else if (hit && !p.hit) play('party', 8000, textos.party());
    else if (critN > p.critN) play('angry', 6500, textos.angry());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critN, paraN, hit, ordN]);

  // Mientras siga faltando un insumo, se acuerda cada 4 minutos.
  useEffect(() => {
    if (critN === 0) return undefined;
    const id = setInterval(() => play('angry', 6500, textos.angry()), 240000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critN > 0]);

  return (
    <div className={`walk ${est.e === 'walk' ? '' : 'pausa'}`} aria-hidden="true">
      <button className="walker" type="button" tabIndex={-1} onClick={onClick} data-tip="Tocá para ver la bienvenida">
        <Mascota estado={est.e} texto={est.texto} />
      </button>
    </div>
  );
}
