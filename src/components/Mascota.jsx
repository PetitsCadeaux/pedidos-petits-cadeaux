import { useEffect, useRef } from 'react';
import { createBun } from '../lib/bun.js';
import { createMigui } from '../lib/migui.js';

// Bun, la mascota de Pazzi Buns, dibujada en vectores y animada pieza por pieza (lib/bun.js).
// estado: idle, walk, hola, wave, laugh, sleep, angry, wow, party
const DICE = { wave: '¡Todo bien!', laugh: '¡Ja, ja, ja!', sleep: 'Zzz…', party: '¡Meta lograda!', wow: '¡Uy!', angry: '¡Ojo!', guino: '¡El pan que hace la diferencia!', senala: '¡Mirá!', burger: '¡Pazzi Burger!' };

export default function Mascota({ skin = 'migui', estado = 'idle', texto, alt = '', className = '' }) {
  const host = useRef(null);
  const bun = useRef(null);
  const say = texto || DICE[estado];

  useEffect(() => {
    bun.current = (skin === 'migui' ? createMigui : createBun)(host.current, { estado, skin });
    return () => { bun.current?.destroy(); bun.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { bun.current?.setEstado(estado); }, [estado]);

  return (
    <span className={`mx mx-${estado} ${skin === 'migui' ? 'mx-sq' : ''} ${className}`} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      {say && estado !== 'hola' ? <span className="mx-say" key={`${estado}-${say}`}>{say}</span> : null}
      <span className="mx-flip"><span className="mx-fig mx-bun" ref={host} /></span>
    </span>
  );
}
