import { useEffect, useRef, useState } from 'react';
import { CFG, MODO_REAL } from './config.js';
import { supabase } from './lib/supabase.js';
import { useData } from './lib/useData.js';
import Produccion from './views/Produccion.jsx';
import Etapas from './views/Etapas.jsx';
import Inicio from './views/Inicio.jsx';
import Stock from './views/Stock.jsx';
import Ordenes from './views/Ordenes.jsx';
import Login from './views/Login.jsx';
import Bienvenida from './components/Bienvenida.jsx';
import BotBar from './components/BotBar.jsx';
import Caminante from './components/Caminante.jsx';
import { setSonido, sonidoActivo } from './lib/sonido.js';

// La pantalla de inicio es el mapa de áreas con EN VIVO y alertas al costado. Cada pin entra al área.
// No hay rotación automática: se cambia de pantalla con los pins o las pestañas.
const VIEWS = [
  { id: 'inicio', label: 'Mapa de áreas', title: 'Centro de control', C: Inicio },
  { id: 'produccion', label: 'Producción', title: 'Producción en vivo', C: Produccion },
  { id: 'etapas', label: 'Por etapa', title: 'Producción por etapa', C: Etapas },
  { id: 'stock', label: 'Stock', title: 'Stock', C: Stock },
  { id: 'ordenes', label: 'Órdenes', title: 'Órdenes de producción', C: Ordenes },
];

function fromHash() {
  let h = (window.location.hash || '').replace('#', '');
  if (h === 'mapa') h = 'inicio';
  const i = VIEWS.findIndex((v) => v.id === h);
  return i < 0 ? 0 : i;
}

function horaLocal() {
  return new Intl.DateTimeFormat('es-AR', { timeZone: CFG.zona, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
}

export default function App() {
  const [cur, setCur] = useState(fromHash);
  const [session, setSession] = useState(MODO_REAL ? undefined : null);
  const [hora, setHora] = useState(horaLocal);
  const [snd, setSnd] = useState(sonidoActivo);
  const [hola, setHola] = useState(() => {
    try { return window.sessionStorage.getItem('bienvenida') !== '1'; } catch { return true; }
  });
  const lastMove = useRef(0);
  const tipRef = useRef(null);
  const wake = useRef(null);
  const { snap, err } = useData(!MODO_REAL || Boolean(session));

  useEffect(() => {
    if (!supabase) return undefined;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setHora(horaLocal()), 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try { window.history.replaceState(null, '', `#${VIEWS[cur].id}`); } catch { /* sin historial */ }
  }, [cur]);

  useEffect(() => {
    const f = () => setCur(fromHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      lastMove.current = Date.now();
      const tip = tipRef.current;
      if (!tip) return;
      const t = e.target.closest ? e.target.closest('[data-tip]') : null;
      const text = t ? t.getAttribute('data-tip') : null;
      if (!text) { tip.hidden = true; return; }
      tip.textContent = text;
      tip.hidden = false;
      let x = e.clientX + 14;
      let y = e.clientY + 14;
      if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
      if (y + tip.offsetHeight > window.innerHeight - 8) y = e.clientY - tip.offsetHeight - 14;
      tip.style.left = `${Math.max(8, x)}px`;
      tip.style.top = `${Math.max(8, y)}px`;
    };
    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  const keepAwake = () => {
    try {
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { wake.current = l; }).catch(() => {});
    } catch { /* no disponible */ }
  };
  const toggleFull = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    } catch { /* no disponible */ }
    keepAwake();
  };

  if (MODO_REAL && session === undefined) return <div className="login-wrap"><p className="muted">Cargando…</p></div>;
  if (MODO_REAL && !session) return <Login />;
  if (!snap) {
    return (
      <div className="login-wrap">
        <p className="muted">{err ? `No se pudieron leer los datos: ${err}` : 'Cargando datos…'}</p>
      </div>
    );
  }

  const V = VIEWS[cur].C;
  const go = (id) => { const i = VIEWS.findIndex((v) => v.id === id); if (i >= 0) setCur(i); };
  const cerrarHola = () => {
    try { window.sessionStorage.setItem('bienvenida', '1'); } catch { /* sin storage */ }
    setHola(false);
  };
  const demo = snap.mode === 'demo';

  return (
    <div className="app">
      <header className="top">
        <div>
          <p className="eyebrow">{CFG.empresa} · Plantas {snap.plantas.map((p) => p.n).join(' y ') || '—'}</p>
          <h1>{VIEWS[cur].title}</h1>
        </div>
        <div className="tools">
          {demo ? <span className="pill demo">Datos de ejemplo</span> : <span className="pill live"><i className="dot flat" />En vivo</span>}
          <div className="clock">
            <span className="clock-label">{demo ? 'Hora de planta (simulada)' : 'Hora de planta'}</span>
            <span className="clock-val">{demo ? snap.clockLabel : hora}</span>
          </div>
          {cur !== 0 ? <button className="btn" type="button" onClick={() => setCur(0)}>← Mapa de áreas</button> : null}
          <button className="btn" type="button" aria-pressed={snd} data-tip="Avisos con un ding corto. Si no suena, tocá la pantalla una vez." onClick={() => { setSonido(!snd); setSnd(!snd); }}>{snd ? "Sonido: sí" : "Sonido: no"}</button>
          <button className="btn" type="button" onClick={toggleFull}>Pantalla completa</button>
          {MODO_REAL ? <button className="btn" type="button" onClick={() => supabase.auth.signOut()}>Salir</button> : null}
        </div>
      </header>

      {err ? <p className="banner" role="status">No se pudieron actualizar los datos ({err}). Se muestra lo último que se leyó.</p> : null}

      <main className="main enter" key={cur} aria-label={VIEWS[cur].label}>
        <V d={snap} go={go} />
      </main>

      <footer className="bottom">
        <Caminante d={snap} onClick={() => setHola(true)} />
        <div className="navrow">
        <nav className="tabs" aria-label="Vistas">
            {VIEWS.map((v, i) => (
              <button
                key={v.id}
                type="button"
                className="tab"
                aria-current={i === cur ? 'true' : undefined}
                onClick={() => setCur(i)}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <BotBar d={snap} onHola={() => setHola(true)} />
        </div>
        {cur === 0 ? null : (
        <p className="source">
          {demo
            ? 'Datos de ejemplo generados en este navegador: un minuto de planta cada 2,5 segundos. Con las claves de Supabase, cada cifra sale de las vistas v_produccion_hoy, v_produccion_hora, v_stock_insumos, v_stock_productos y v_avance_ordenes.'
            : 'Cada cifra sale de las vistas v_produccion_hoy, v_produccion_hora, v_stock_insumos, v_stock_productos y v_avance_ordenes. Se actualiza solo cuando se carga una etapa.'}
        </p>
        )}
      </footer>
      {hola ? <Bienvenida d={snap} onDone={cerrarHola} /> : null}
      <div className="tip" ref={tipRef} hidden />
    </div>
  );
}
