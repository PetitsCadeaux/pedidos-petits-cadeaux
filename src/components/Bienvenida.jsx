import { useEffect, useMemo, useRef, useState } from 'react';
import { CFG } from '../config.js';
import Mascota from './Mascota.jsx';
import { totals } from '../lib/derive.js';
import { n0 } from '../lib/format.js';

const reduce = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export default function Bienvenida({ d, onDone }) {
  const [step, setStep] = useState(0); // 1-2: toc toc, 3: entra la mascota
  const [n, setN] = useState(0); // líneas de arranque visibles
  const [out, setOut] = useState(false);
  const root = useRef(null);

  // Todo lo que dice el arranque sale de los datos reales ya leídos.
  const lineas = useMemo(() => {
    const t = totals(d);
    return [
      ...d.plantas.map((p) => `Planta ${p.n} conectada`),
      `Producción de hoy: ${n0(t.pack)} u empaquetadas`,
      d.mode === 'demo' ? 'Modo: datos de ejemplo' : 'Modo: datos en vivo',
    ];
  }, [d]);
  const total = lineas.length;

  const salir = () => {
    setOut(true);
    setTimeout(onDone, 500);
  };

  useEffect(() => {
    const ts = [];
    const at = (ms, fn) => ts.push(setTimeout(fn, ms));
    const knock = () => {
      const el = root.current;
      if (el && !reduce() && el.animate) {
        el.animate(
          [{ transform: 'translate(0,0)' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(8px,-5px)' }, { transform: 'translate(-4px,2px)' }, { transform: 'translate(0,0)' }],
          { duration: 320, easing: 'ease-out' },
        );
      }
    };
    at(350, () => { setStep(1); knock(); });
    at(1050, () => { setStep(2); knock(); });
    at(1900, () => setStep(3));
    for (let k = 1; k <= total; k += 1) at(2800 + k * 520, () => setN(k));
    at(2800 + total * 520 + 1600, salir);
    return () => ts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') salir(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`bv ${out ? 'out' : ''}`} ref={root} onClick={salir} role="dialog" aria-label={`Bienvenida de ${CFG.bot}`}>
      <div className={`bv-toc ${step >= 3 ? 'gone' : ''}`} aria-hidden="true">
        <span className={step >= 1 ? 'on' : ''}>toc</span>
        <span className={step >= 2 ? 'on' : ''}>toc</span>
      </div>
      <div className={`bv-main ${step >= 3 ? 'on' : ''}`}>
        <Mascota className="bv-mascot" estado={step >= 3 ? 'hola' : 'idle'} alt={`${CFG.bot}, la mascota de ${CFG.empresa}`} />
        <div className="bv-text">
          <p className="eyebrow">{CFG.empresa}</p>
          <p className="bv-hi">¡Hola! Soy {CFG.bot}, el bot de {CFG.empresa}.</p>
          <ul className="bv-boot" aria-live="polite">
            {lineas.slice(0, n).map((l) => (
              <li key={l}><span aria-hidden="true">✓</span> {l}</li>
            ))}
          </ul>
          <p className={`bv-go ${n >= total ? 'on' : ''}`}>Abriendo el panel…</p>
        </div>
      </div>
      <button className="btn bv-skip" type="button" onClick={(e) => { e.stopPropagation(); salir(); }}>Saltar</button>
    </div>
  );
}
