import { colorOf } from '../lib/derive.js';

const ICONS = {
  ok: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--good)" />
      <path d="M4.6 8.3l2.2 2.2 4.5-4.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  warn: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.4l7 12.4H1z" fill="var(--warn)" />
      <path d="M8 6v3.5M8 11.3v.1" stroke="#0b0b0b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  crit: () => (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="var(--crit)" />
      <path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  ),
};

// Un estado nunca va solo en color: siempre icono + texto.
export function Chip({ k, children }) {
  const Icon = k ? ICONS[k] : null;
  return (
    <span className="chip">
      {Icon ? <Icon /> : null}
      <span>{children}</span>
    </span>
  );
}

export function Dot({ cls }) {
  return <i className={`dot ${cls}`} />;
}

export function Meter({ pct, color, pace, tip, className }) {
  const p = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return (
    <div className={`meter ${className || ''}`} data-tip={tip}>
      <i style={{ width: `${p}%`, background: color }} />
      {pace != null ? <b style={{ left: `${Math.max(0, Math.min(100, pace))}%` }} /> : null}
    </div>
  );
}

export function PlantMeter({ planta, pace, tip }) {
  return (
    <Meter
      pct={planta.obj > 0 ? (planta.pack / planta.obj) * 100 : 0}
      color={colorOf(planta.cls)}
      pace={pace}
      tip={tip}
    />
  );
}
