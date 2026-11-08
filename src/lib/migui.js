// Migui: un pancito rechoncho y simpático, diseño propio. Pocas piezas, formas blandas y sin contornos duros.
// Misma interfaz que bun.js: createMigui(elemento, { estado }) -> { setEstado, hablar, destroy }.
const NS = 'http://www.w3.org/2000/svg';
const sin = Math.sin;
const abs = Math.abs;
const PI2 = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);

const BASE = {
  fy: 0, bsx: 1, bsy: 1, brot: 0, bx: 0, by: 0, al: 8, ar: 8, fl: 0, fr: 0, flx: 0, frx: 0,
  open: 1, arc: 0, px: 0, py: 0, es: 1, mo: 0.18, mw: 1, msm: 1, cheek: 0.5, brow: 0, tint: 0, wheat: 0,
};

const POSES = {
  idle(t) {
    const b = sin((PI2 * t) / 3);
    const k = t % 5.2;
    let hop = 0; let sq = 0;
    if (k < 0.2) sq = -0.08 * sin((Math.PI * k) / 0.2);
    else if (k < 0.7) { hop = sin((Math.PI * (k - 0.2)) / 0.5); sq = 0.06 * hop; }
    else if (k < 0.92) sq = -0.09 * sin((Math.PI * (k - 0.7)) / 0.22);
    return {
      bsy: 1 + 0.03 * b + sq, bsx: 1 - 0.022 * b - sq * 0.7, brot: 1.5 * sin(t * 1.1), fy: -14 * hop,
      al: 8 + 5 * b + 30 * hop, ar: 8 - 5 * b + 30 * hop, px: sin(t * 0.7), py: 0.3 * sin(t * 0.5),
      arc: hop > 0.3 ? 1 : 0, mo: 0.18 + 0.3 * hop, fl: -6 * hop, fr: -6 * hop, cheek: 0.55,
    };
  },
  walk(t) {
    const w = (PI2 * t) / 0.7;
    const s = sin(w);
    const h = abs(s);
    return {
      fy: -11 * h, bsy: 0.92 + 0.15 * h, bsx: 1.08 - 0.1 * h, brot: 5 * s, bx: 6 * s,
      fl: -12 * Math.max(0, s), fr: -12 * Math.max(0, -s), flx: 16 * s, frx: -16 * s,
      al: 30 + 26 * s, ar: 30 - 26 * s, px: 0.6, mo: 0.35, wheat: 0,
    };
  },
  hola(t) {
    const w = PI2 * t * 1.1;
    const b = sin((PI2 * t) / 2.6);
    return { ar: 150 + 16 * sin(w), al: 8 + 3 * b, brot: -2 + 2 * b, bsy: 1 + 0.02 * b, bsx: 1 - 0.014 * b, arc: 1, mo: 0.5, mw: 1.2, cheek: 0.9 };
  },
  laugh(t) {
    const h = PI2 * 6 * t;
    return {
      arc: 1, mo: 0.6 + 0.3 * sin(h), mw: 1.25, bsy: 1 + 0.05 * sin(h), bsx: 1 - 0.035 * sin(h), brot: 4 * sin(h * 0.5), fy: -5 * abs(sin(h * 0.5)),
      al: 40 + 12 * sin(h), ar: 40 - 12 * sin(h), cheek: 1,
    };
  },
  sleep(t) {
    const b = sin((PI2 * t) / 3.8);
    return { arc: -1, mo: 0.1 + 0.05 * b, mw: 0.5, brot: -7, bsy: 1 + 0.035 * b, bsx: 1 - 0.022 * b, al: 2, ar: 14, cheek: 0.7, bx: -4 };
  },
  wow(t) {
    const j = t < 0.45 ? -30 * sin((Math.PI * t) / 0.45) : 0;
    return { fy: j, es: 1.22, mo: 0.9, mw: 0.45, al: 100, ar: 100, bsy: t < 0.45 ? 1.05 : 1, bx: t > 0.45 ? 1.5 * sin(PI2 * 14 * t) : 0, py: -0.3, cheek: 0.3 };
  },
  party(t) {
    const j = abs(sin(Math.PI * t * 1.9));
    const w = PI2 * t * 1.9;
    return { fy: -26 * j, arc: 1, mo: 0.9, mw: 1.2, al: 150 + 12 * sin(w), ar: 150 - 12 * sin(w + 1), bsy: 1 + 0.04 * (1 - j), bsx: 1 - 0.03 * (1 - j), brot: 4 * sin(w), cheek: 1, fl: -8 * j, fr: -8 * j };
  },
  guino(t) {
    const b = sin((PI2 * t) / 2.4);
    return { ar: 120 + 8 * b, al: 8, brot: 3 + 2 * b, mo: 0.55, mw: 1.2, wink: 1, cheek: 1, px: 0.5 };
  },
  angry(t) {
    const j = PI2 * 16 * t;
    return { brow: 1, msm: -1, mo: 0.25, mw: 0.9, tint: 0.3, bx: 2 * sin(j), al: 20, ar: 20, es: 0.9, cheek: 0.2, bsy: 1 + 0.015 * sin(j) };
  },
};
const ALIAS = { wave: 'hola', senala: 'guino', burger: 'hola' };
export const MIGUI_ESTADOS = [...Object.keys(POSES), ...Object.keys(ALIAS)];

export function createMigui(host, opts = {}) {
  const id = Math.random().toString(36).slice(2, 8);
  const u = (n) => `${n}-${id}`;
  const SEED = [[128, 150, -25], [168, 128, -10], [214, 120, 8], [258, 128, 18], [296, 150, 30]];
  host.innerHTML = `
<svg xmlns="${NS}" viewBox="0 0 400 400" width="100%" height="100%" role="img" aria-hidden="true" style="display:block;overflow:visible">
  <defs>
    <linearGradient id="${u('b')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0903a"/><stop offset=".38" stop-color="#f2b459"/><stop offset=".78" stop-color="#fbdb9d"/><stop offset="1" stop-color="#fdeccc"/></linearGradient>
    <radialGradient id="${u('s')}" cx=".3" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="${u('m')}"><path class="mclip" d=""/></clipPath>
    <clipPath id="${u('body')}"><rect x="68" y="108" width="264" height="232" rx="112"/></clipPath>
  </defs>
  <ellipse class="sh" cx="200" cy="366" rx="125" ry="12" fill="#000" opacity=".18"/>
  <g class="fig">
    <ellipse class="footL" cx="150" cy="350" rx="38" ry="18" fill="#8a5530"/>
    <ellipse class="footR" cx="250" cy="350" rx="38" ry="18" fill="#8a5530"/>
    <g class="body">
      <g class="wheat">
        <path d="M200 112 C198 90 204 74 200 54" fill="none" stroke="#c98a3a" stroke-width="6" stroke-linecap="round"/>
        ${[[-10, 62, -35], [10, 62, 35], [-12, 76, -35], [12, 76, 35], [-12, 90, -35], [12, 90, 35]].map(([x, y, r]) => `<ellipse cx="${200 + x}" cy="${y - 2}" rx="6.5" ry="12" fill="#f0bf62" transform="rotate(${r} ${200 + x} ${y})"/>`).join('')}
        <ellipse cx="200" cy="50" rx="6.5" ry="12" fill="#f0bf62"/>
      </g>
      <rect x="68" y="108" width="264" height="232" rx="112" fill="url(#${u('b')})"/>
      <g clip-path="url(#${u('body')})">
        <rect class="tint" x="60" y="100" width="280" height="250" fill="#ff3b2a" opacity="0"/>
        <ellipse cx="150" cy="150" rx="70" ry="34" fill="url(#${u('s')})" transform="rotate(-18 150 150)"/>
        <ellipse cx="270" cy="330" rx="130" ry="50" fill="#d9a35a" opacity=".22"/>
      </g>
      <g fill="none" stroke="#fff2cf" stroke-width="9" stroke-linecap="round" opacity=".75">
        <path d="M150 140 Q164 124 184 120"/><path d="M196 134 Q212 118 234 116"/><path d="M242 140 Q256 126 276 128"/>
      </g>
      <g class="face">
        <ellipse class="blL" cx="112" cy="252" rx="26" ry="15" fill="#ff7f93"/><ellipse class="blR" cx="288" cy="252" rx="26" ry="15" fill="#ff7f93"/>
        ${['L', 'R'].map((s) => `<g class="eye${s}"><g class="ov"><g class="pu"><ellipse cx="0" cy="0" rx="19" ry="25" fill="#2c1810"/><ellipse cx="-6" cy="-9" rx="7" ry="9" fill="#fff"/><circle cx="7" cy="9" r="3.6" fill="#fff"/></g></g>
          <path class="happy" d="M-21 8 Q0 -26 21 8" fill="none" stroke="#2c1810" stroke-width="8" stroke-linecap="round" opacity="0"/>
          <path class="zz" d="M-21 -2 Q0 18 21 -2" fill="none" stroke="#2c1810" stroke-width="7" stroke-linecap="round" opacity="0"/></g>`).join('')}
        <path class="browL" d="M-20 4 L18 -6" stroke="#5a3016" stroke-width="8" stroke-linecap="round" opacity="0"/>
        <path class="browR" d="M-18 -6 L20 4" stroke="#5a3016" stroke-width="8" stroke-linecap="round" opacity="0"/>
        <g class="mouth"><path class="mfill" d="" fill="#7a2a24"/><g clip-path="url(#${u('m')})"><ellipse class="tg" cx="0" cy="26" rx="16" ry="9" fill="#f26b7c"/></g><path class="mline" d="" fill="none" stroke="#5a2a14" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></g>
      </g>
      <g class="armL"><path d="M0 0 C-20 12 -30 40 -20 62" fill="none" stroke="#e8a954" stroke-width="28" stroke-linecap="round"/><circle cx="-20" cy="68" r="26" fill="#fffaf0" stroke="#ebcf9f" stroke-width="3"/><circle cx="-26" cy="62" r="9" fill="#fff" opacity=".8"/></g>
      <g class="armR"><path d="M0 0 C20 12 30 40 20 62" fill="none" stroke="#e8a954" stroke-width="28" stroke-linecap="round"/><circle cx="20" cy="68" r="26" fill="#fffaf0" stroke="#ebcf9f" stroke-width="3"/><circle cx="14" cy="62" r="9" fill="#fff" opacity=".8"/></g>
    </g>
  </g>
  <g class="fx"></g>
</svg>`;
  const svg = host.querySelector('svg');
  const q = (s) => svg.querySelector(s);
  const el = {};
  ['sh', 'fig', 'body', 'wheat', 'footL', 'footR', 'armL', 'armR', 'face', 'mclip', 'mfill', 'mline', 'tg', 'tint', 'blL', 'blR', 'browL', 'browR', 'fx'].forEach((k) => { el[k] = q('.' + k); });
  const eyes = ['L', 'R'].map((s) => ({ g: q('.eye' + s), ov: q('.eye' + s + ' .ov'), pu: q('.eye' + s + ' .pu'), happy: q('.eye' + s + ' .happy'), zz: q('.eye' + s + ' .zz'), cx: s === 'L' ? 150 : 250, cy: 214 }));
  const reduce = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  const f = (n) => n.toFixed(2);
  let estado = POSES[opts.estado] ? opts.estado : (ALIAS[opts.estado] || 'idle');
  let tE = 0; let blendT = 0; let desde = { ...BASE }; let cur = { ...BASE };
  let raf = 0; let last = 0; let clock = 0; let nextBlink = 2.2; let blinkT = -1; let hablando = false; let acc = 0;
  const sp = { wa: 0, wv: 0, fx: 0, fv: 0, fy: 0, fyv: 0 };
  const parts = [];
  const spring = (x, v, tg, dt, k = 130, c = 9) => { const nv = v + ((tg - x) * k - v * c) * dt; return [x + nv * dt, nv]; };

  function boca(mo, msm, mw) {
    const w = 22 * mw; const D = mo * 34; const cy = -3 * msm;
    const top = cy + (msm >= 0 ? 7 * msm : 9 * msm);
    const bot = cy + D * 1.4 + 2;
    const d = D < 2.5 && msm >= 0
      ? `M${f(-w)} ${f(cy)} Q0 ${f(cy + 12)} ${f(w)} ${f(cy)}`
      : `M${f(-w)} ${f(cy)} Q0 ${f(top)} ${f(w)} ${f(cy)} Q0 ${f(bot)} ${f(-w)} ${f(cy)}Z`;
    el.mclip.setAttribute('d', d); el.mfill.setAttribute('d', D < 2.5 && msm >= 0 ? '' : d); el.mline.setAttribute('d', d);
    el.tg.setAttribute('cy', f(cy + D * 0.95)); el.tg.setAttribute('rx', f(w * 0.55)); el.tg.setAttribute('ry', f(Math.max(2, D * 0.35)));
  }

  function aplicar(p, dt) {
    [sp.wa, sp.wv] = spring(sp.wa, sp.wv, p.brot + p.bx * 0.4, dt, 110, 6);
    [sp.fy, sp.fyv] = spring(sp.fy, sp.fyv, p.fy, dt, 150, 9);
    [sp.fx, sp.fv] = spring(sp.fx, sp.fv, p.bx, dt, 120, 11);
    const wRel = clamp((sp.wa - p.brot - p.bx * 0.4) * 2.2, -26, 26) + clamp((sp.fy - p.fy) * -1.2, -18, 18);
    const fRel = clamp((sp.fx - p.bx) * 0.8, -6, 6);
    el.fig.setAttribute('transform', `translate(${f(p.bx)} ${f(p.fy)})`);
    el.sh.setAttribute('transform', `translate(200 366) scale(${f(clamp(1 + p.fy / 120, 0.55, 1.05))} 1) translate(-200 -366)`);
    el.sh.setAttribute('opacity', f(clamp(0.18 + p.fy / 220, 0.07, 0.2)));
    el.body.setAttribute('transform', `translate(200 340) rotate(${f(p.brot)}) scale(${f(p.bsx)} ${f(p.bsy)}) translate(-200 -340)`);
    el.wheat.setAttribute('transform', `rotate(${f(wRel + 4 * sin(clock * 1.7))} 200 112)`);
    el.footL.setAttribute('transform', `translate(${f(p.flx)} ${f(p.fl)})`);
    el.footR.setAttribute('transform', `translate(${f(p.frx)} ${f(p.fr)})`);
    el.armL.setAttribute('transform', `translate(82 240) rotate(${f(p.al)})`);
    el.armR.setAttribute('transform', `translate(318 240) rotate(${f(-p.ar)})`);
    el.face.setAttribute('transform', `translate(${f(fRel)} 0)`);
    el.tint.setAttribute('opacity', f(p.tint));
    el.blL.setAttribute('opacity', f(0.25 + p.cheek * 0.4)); el.blR.setAttribute('opacity', f(0.25 + p.cheek * 0.4));
    el.browL.setAttribute('transform', 'translate(150 176)'); el.browR.setAttribute('transform', 'translate(250 176)');
    el.browL.setAttribute('opacity', p.brow); el.browR.setAttribute('opacity', p.brow);
    el.mouth = el.mouth || q('.mouth'); el.mouth.setAttribute('transform', 'translate(200 254)');
    boca(p.mo, p.msm, p.mw);
    let bl = 0; if (blinkT >= 0) { const k = blinkT / 0.14; bl = k < 0.5 ? k * 2 : (1 - k) * 2; }
    eyes.forEach((e, i) => {
      const happy = clamp(p.arc, 0, 1) > 0.5 || (i === 1 && (p.wink || 0) > 0.5);
      const sleepy = p.arc < -0.5;
      e.g.setAttribute('transform', `translate(${e.cx} ${e.cy})`);
      e.ov.setAttribute('opacity', happy || sleepy ? 0 : 1);
      e.ov.setAttribute('transform', `scale(${f(p.es)} ${f(p.es * (1 - 0.92 * bl))})`);
      e.pu.setAttribute('transform', `translate(${f(p.px * 4)} ${f(p.py * 4)})`);
      e.happy.setAttribute('opacity', happy ? 1 : 0); e.zz.setAttribute('opacity', sleepy ? 1 : 0);
    });
  }

  function particula(tipo) {
    const g = document.createElementNS(NS, 'g'); el.fx.appendChild(g);
    const P = { g, tipo, t: 0, life: 2, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 };
    if (tipo === 'corazon') { g.innerHTML = '<path d="M0 12 C-22 -6 -18 -24 0 -13 C18 -24 22 -6 0 12Z" fill="#ff6b86"/><ellipse cx="-6" cy="-9" rx="4" ry="2.5" fill="#fff" opacity=".7"/>'; Object.assign(P, { x: 250 + Math.random() * 110, y: 80 + Math.random() * 40, vx: 8 + Math.random() * 14, vy: -50 - Math.random() * 20, life: 1.7 }); }
    else if (tipo === 'z') { g.innerHTML = '<text font-family="system-ui,sans-serif" font-weight="800" font-size="40" fill="#8fa6ff">Z</text>'; Object.assign(P, { x: 280, y: 70, vx: 18, vy: -30, life: 2.6, r: 8 }); }
    else if (tipo === 'confeti') { const c = ['#2f7df6', '#f26a2e', '#34c759', '#ffd23f', '#e84a8a', '#8b5cf6'][Math.floor(Math.random() * 6)]; g.innerHTML = `<rect x="-5" y="-8" width="10" height="16" rx="2" fill="${c}"/>`; Object.assign(P, { x: 40 + Math.random() * 320, y: -10, vx: -30 + Math.random() * 60, vy: 90 + Math.random() * 100, life: 2.6, r: Math.random() * 360, vr: -300 + Math.random() * 600 }); }
    else if (tipo === 'vapor') { g.innerHTML = '<circle r="12" fill="#fff" opacity=".85"/>'; const l = Math.random() < 0.5; Object.assign(P, { x: l ? 90 : 310, y: 130, vx: (l ? -1 : 1) * (14 + Math.random() * 16), vy: -55, life: 1.1 }); }
    parts.push(P);
  }
  function particulas(dt) {
    acc += dt;
    if ((estado === 'hola') && acc > 0.45) { acc = 0; particula('corazon'); }
    else if (estado === 'sleep' && acc > 0.9) { acc = 0; particula('z'); }
    else if (estado === 'party' && acc > 0.05) { acc = 0; particula('confeti'); }
    else if (estado === 'angry' && acc > 0.14) { acc = 0; particula('vapor'); }
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const P = parts[i]; P.t += dt;
      if (P.t >= P.life) { P.g.remove(); parts.splice(i, 1); continue; }
      const k = P.t / P.life; P.x += P.vx * dt; P.y += P.vy * dt; P.r += (P.vr || 0) * dt;
      let sc = 1; let op = 1;
      if (P.tipo === 'corazon') { sc = k < 0.2 ? 0.3 + k * 3.5 : 1; op = k > 0.65 ? (1 - k) / 0.35 : 1; }
      else if (P.tipo === 'z') { sc = 0.5 + k; op = sin(Math.PI * k); }
      else if (P.tipo === 'vapor') { sc = 0.5 + k * 1.5; op = 0.9 * (1 - k); }
      else if (P.tipo === 'confeti') { op = k > 0.75 ? (1 - k) * 4 : 1; P.vy += 60 * dt; }
      P.g.setAttribute('transform', `translate(${f(P.x)} ${f(P.y)}) rotate(${f(P.r)}) scale(${f(sc)})`); P.g.setAttribute('opacity', f(clamp(op, 0, 1)));
    }
  }
  const pose = () => ({ ...BASE, ...POSES[estado](tE) });
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; clock += dt; tE += dt; blendT += dt;
    if (blinkT >= 0) { blinkT += dt; if (blinkT > 0.14) blinkT = -1; } else if (clock > nextBlink) { blinkT = 0; nextBlink = clock + 2.2 + Math.random() * 3.5; }
    const g = pose(); const k = smooth(clamp(blendT / 0.3, 0, 1)); const p = {};
    Object.keys(BASE).forEach((key) => { p[key] = lerp(desde[key] ?? BASE[key], g[key], k); });
    p.wink = g.wink || 0;
    if (hablando) { const v = abs(sin(clock * 11)) * (0.55 + 0.45 * abs(sin(clock * 3.1))); p.mo = 0.1 + 0.8 * v; p.msm = 1; p.mw = 0.9 + 0.2 * (1 - v); }
    cur = p; aplicar(p, dt); particulas(dt); raf = requestAnimationFrame(frame);
  }
  const api = {
    get estado() { return estado; },
    setEstado(e) { const n = ALIAS[e] || e; if (!POSES[n] || n === estado) return; desde = { ...cur }; estado = n; tE = 0; blendT = 0; parts.splice(0).forEach((P) => P.g.remove()); acc = 0; },
    hablar(on) { hablando = !!on; },
    get hablando() { return hablando; },
    destroy() { cancelAnimationFrame(raf); host.innerHTML = ''; },
  };
  if (reduce) { cur = pose(); aplicar(cur, 0.016); } else { last = performance.now(); raf = requestAnimationFrame(frame); }
  return api;
}
