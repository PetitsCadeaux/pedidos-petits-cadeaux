import { useEffect, useState } from 'react';
import { MODO_REAL } from '../config.js';
import { createDemo } from './demo.js';
import { loadLive } from './live.js';
import { supabase } from './supabase.js';

const TABLAS = ['registros_etapa', 'movimientos_producto', 'movimientos_insumo', 'paradas', 'ordenes_produccion'];

export function useData(enabled) {
  const [snap, setSnap] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;

    if (!MODO_REAL) {
      const demo = createDemo();
      setSnap(demo.snapshot());
      const id = setInterval(() => {
        demo.tick();
        setSnap(demo.snapshot());
      }, 2500);
      return () => clearInterval(id);
    }

    let alive = true;
    let timer = null;
    const load = async () => {
      try {
        const s = await loadLive(supabase);
        if (alive) { setSnap(s); setErr(null); }
      } catch (e) {
        if (alive) setErr(e.message || String(e));
      }
    };
    const queue = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 1200);
    };
    load();
    const poll = setInterval(load, 20000);
    let ch = supabase.channel('panel-produccion');
    TABLAS.forEach((t) => {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: t }, queue);
    });
    ch.subscribe();
    return () => {
      alive = false;
      clearInterval(poll);
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [enabled]);

  return { snap, err };
}
