const env = import.meta.env || {};

export const CFG = {
  empresa: env.VITE_EMPRESA_NOMBRE || 'Pazzi',
  // Nombre de la mascota / bot. Cambialo por el que elijas.
  bot: env.VITE_BOT_NOMBRE || 'Bun',
  zona: env.VITE_ZONA_HORARIA || 'America/Argentina/Buenos_Aires',
  turnoIni: Number(env.VITE_TURNO_INICIO || 6),
  turnoFin: Number(env.VITE_TURNO_FIN || 14),
  supabaseUrl: env.VITE_SUPABASE_URL || '',
  supabaseKey: env.VITE_SUPABASE_ANON_KEY || '',
  forzarDemo: env.VITE_MODO_DEMO === 'true',
  // Áreas ya integradas al sistema. Las que están en false se muestran en gris
  // como "Próximamente" y no muestran números. Cuando integres un módulo, pasalo a true.
  modulos: {
    prod: true,
    compras: true,
    logi: false,
    venta: false,
    admin: false,
    fin: false,
    rrhh: false,
  },
};

export const MODO_REAL = Boolean(CFG.supabaseUrl && CFG.supabaseKey) && !CFG.forzarDemo;
