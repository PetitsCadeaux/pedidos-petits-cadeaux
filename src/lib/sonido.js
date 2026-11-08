// Avisos sonoros cortos (un "ding"), generados con Web Audio: no hay archivos de audio.
// Los navegadores no dejan sonar nada hasta que alguien toca la pantalla una vez; por eso se
// habilita con el primer toque o tecla. Se puede apagar desde el botón "Sonido" del encabezado.
let ctx = null;
let activo = true;
try { activo = window.localStorage.getItem('sonido') !== 'off'; } catch { /* sin storage */ }

const audio = () => {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
};

if (typeof window !== 'undefined') {
  const habilitar = () => { audio(); window.removeEventListener('pointerdown', habilitar); window.removeEventListener('keydown', habilitar); };
  window.addEventListener('pointerdown', habilitar);
  window.addEventListener('keydown', habilitar);
}

export const sonidoActivo = () => activo;
export function setSonido(v) {
  activo = Boolean(v);
  try { window.localStorage.setItem('sonido', activo ? 'on' : 'off'); } catch { /* sin storage */ }
}

// notas: [frecuencia Hz, inicio s, duración s]
const SONIDOS = {
  ding: [[1320, 0, 0.35]],
  alerta: [[740, 0, 0.18], [554, 0.16, 0.34]],
  sorpresa: [[1175, 0, 0.12], [1568, 0.1, 0.3]],
  festejo: [[784, 0, 0.14], [988, 0.12, 0.14], [1318, 0.24, 0.4]],
};

export function ding(tipo = 'ding') {
  if (!activo) return;
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + 0.02;
  (SONIDOS[tipo] || SONIDOS.ding).forEach(([f, ini, dur]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + ini);
    g.gain.exponentialRampToValueAtTime(0.16, t0 + ini + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ini + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0 + ini);
    o.stop(t0 + ini + dur + 0.05);
  });
}
