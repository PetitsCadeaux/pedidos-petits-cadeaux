const nf = new Intl.NumberFormat('es-AR');

export const n0 = (x) => nf.format(Math.round(Number(x) || 0));

export const n1 = (x) =>
  (Number(x) || 0).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const hhmm = (m) => {
  const h = Math.floor(m / 60);
  const mm = Math.floor(m % 60);
  return `${h < 10 ? '0' : ''}${h}:${mm < 10 ? '0' : ''}${mm}`;
};
