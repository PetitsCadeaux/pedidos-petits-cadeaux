// Bun, la mascota de Pazzi Buns, redibujada en vectores y animada con un pequeño motor propio.
// Cada parte (gorra, cara, ojos, boca, brazos, piernas, zapatillas) se mueve por separado, con
// resortes para que la gorra y la cara se retrasen un instante respecto del cuerpo ("goma").
// Sin dependencias. Uso: const bun = createBun(elemento); bun.setEstado('walk'); bun.destroy();
const NS = 'http://www.w3.org/2000/svg';

const INK = '#1d1410';
const OUT = '#3a1d08';

const SKINS = {
  bun: { body: ['#ffdd80', '#fab63c', '#ee9a22', '#c9741a'], edge: '#c9741a', seeds: true, hat: 'cap', eyeK: 1, mouthW: 1, mouthD: 1, capK: 1, blush: '#ff6a7a', blushK: 1, arm: ['#e9a02a', '#b8701c'] },
  tierno: { body: ['#ffe3a0', '#fcc44f', '#f2a52f', '#d38220'], edge: '#d38220', seeds: true, hat: 'cap', eyeK: 1.17, mouthW: 0.78, mouthD: 0.8, capK: 0.88, blush: '#ff6a8a', blushK: 1.3, arm: ['#f3b13c', '#c47a1e'] },
  migas: { body: ['#fffaf2', '#fff0d6', '#f8dfb4', '#e8c286'], edge: '#e2bf86', seeds: false, hat: 'toque', eyeK: 1.12, mouthW: 0.82, mouthD: 0.85, capK: 1, blush: '#ff7f93', blushK: 1.35, arm: ['#f6dcae', '#d9ae72'] },
};

function plantilla(id, skin = SKINS.bun) {
  const u = (n) => `${n}-${id}`;
  const seeds = [[110,350,-40],[84,430,20],[104,520,40],[170,580,15],[250,600,0],[340,600,-15],[420,570,-35],[470,500,20],[486,420,-10],[470,340,35],[140,300,10],[250,230,0],[390,250,-30],[300,310,25],[200,480,10],[360,520,-20],[120,470,30],[430,440,0]];
  const glove = (id2) => `fill="url(#${u('glove')})"`;
  return `
<svg xmlns="${NS}" viewBox="0 0 424 560" width="100%" height="100%" role="img" aria-hidden="true" style="display:block;overflow:visible">
  <defs>
    <radialGradient id="${u('bun')}" gradientUnits="userSpaceOnUse" cx="210" cy="330" r="440">
      <stop offset="0" stop-color="${skin.body[0]}"/><stop offset=".3" stop-color="${skin.body[1]}"/><stop offset=".72" stop-color="${skin.body[2]}"/><stop offset="1" stop-color="${skin.body[3]}"/>
    </radialGradient>
    <radialGradient id="${u('shade')}" gradientUnits="userSpaceOnUse" cx="420" cy="560" r="300">
      <stop offset="0" stop-color="#6e3200" stop-opacity="0"/><stop offset="1" stop-color="#6e3200" stop-opacity=".38"/>
    </radialGradient>
    <radialGradient id="${u('glove')}" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fbf8f2"/><stop offset="1" stop-color="#ddd5c6"/></radialGradient>
    <linearGradient id="${u('limb')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a4a3a"/><stop offset="1" stop-color="#2e1f18"/></linearGradient>
    <linearGradient id="${u('armc')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${skin.arm[0]}"/><stop offset="1" stop-color="${skin.arm[1]}"/></linearGradient>
    <radialGradient id="${u('cap')}" gradientUnits="userSpaceOnUse" cx="240" cy="140" r="260"><stop offset="0" stop-color="#4a4a52"/><stop offset=".5" stop-color="#26262a"/><stop offset="1" stop-color="#121214"/></radialGradient>
    <radialGradient id="${u('iris')}" cx=".45" cy=".7" r=".75"><stop offset="0" stop-color="#9a5524"/><stop offset=".55" stop-color="#4f2711"/><stop offset="1" stop-color="#1c0c04"/></radialGradient>
    <clipPath id="${u('eyeL')}"><ellipse cx="214" cy="382" rx="50" ry="57"/></clipPath>
    <clipPath id="${u('eyeR')}"><ellipse cx="348" cy="382" rx="50" ry="57"/></clipPath>
    <clipPath id="${u('mouth')}"><path class="mouthclip" d=""/></clipPath>
  </defs>

  <g transform="translate(6 8) scale(.712)">
  <ellipse class="shadow" cx="280" cy="706" rx="190" ry="16" fill="#000" opacity=".3"/>

  <g class="fig">
    <g class="legR"><path d="M362 590V640" stroke="url(#${u('limb')})" stroke-width="38" stroke-linecap="round"/>
      <g class="shoeR">${zapatilla()}</g></g>
    <g class="legL"><path d="M200 590V640" stroke="url(#${u('limb')})" stroke-width="38" stroke-linecap="round"/>
      <g class="shoeL">${zapatilla()}</g></g>

    <g class="torso">
      <ellipse cx="280" cy="410" rx="218" ry="200" fill="url(#${u('bun')})" stroke="${skin.edge}" stroke-width="3"/>
      <ellipse cx="280" cy="410" rx="218" ry="200" fill="url(#${u('shade')})"/>
      <ellipse class="tint" cx="280" cy="410" rx="218" ry="200" fill="#ff2d1a" opacity="0"/>
      <ellipse cx="170" cy="330" rx="70" ry="30" fill="#fff" opacity=".3" transform="rotate(-38 170 330)"/>
      <path d="M96 470 C110 560 180 612 280 612" fill="none" stroke="#ffe7a0" stroke-width="9" stroke-linecap="round" opacity=".28"/>
      <g fill="#ffeaa8" opacity=".9">
        ${(skin.seeds ? seeds : []).map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="10" ry="5" transform="rotate(${r} ${x} ${y})"/>`).join('')}
      </g>

      <g class="face">
        <ellipse class="blushL" cx="128" cy="458" rx="${46 * skin.blushK}" ry="${27 * skin.blushK}" fill="${skin.blush}" opacity=".5"/>
        <ellipse class="blushR" cx="432" cy="458" rx="${46 * skin.blushK}" ry="${27 * skin.blushK}" fill="${skin.blush}" opacity=".5"/>

        ${ojo('L', 214, 382, 50, 57, 36, 45, u)}
        ${ojo('R', 348, 382, 50, 57, 36, 45, u)}

        <g class="browL"><path d="M-36 8 Q-4 -22 36 -4" fill="none" stroke="#7a4418" stroke-width="10" stroke-linecap="round"/></g>
        <g class="browR"><path d="M-36 -4 Q4 -22 36 8" fill="none" stroke="#7a4418" stroke-width="10" stroke-linecap="round"/></g>

        <g class="mouth">
          <path class="mouthfill" d="" fill="#6a1a14"/>
          <g clip-path="url(#${u('mouth')})">
            <rect class="teeth" fill="#fff" x="-140" y="-40" width="280" height="40"/>
            <ellipse class="tongue" cx="0" cy="40" rx="34" ry="16" fill="#ee6060"/>
            <path class="tongueline" d="M0 28V44" stroke="#c13a40" stroke-width="3.5" stroke-linecap="round"/>
          </g>
          <path class="mouthline" d="" fill="none" stroke="#5a2a0c" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
          <path d="M-82 -6Q-92 10 -78 19" fill="none" stroke="#b86a18" stroke-width="5" stroke-linecap="round" opacity=".55" class="dimL"/>
          <path d="M82 -6Q92 10 78 19" fill="none" stroke="#b86a18" stroke-width="5" stroke-linecap="round" opacity=".55" class="dimR"/>
        </g>
      </g>

      <g class="cap">
        ${skin.hat === 'toque' ? toque(u) : `        <g transform="rotate(-7 290 262)">
          <ellipse cx="290" cy="290" rx="160" ry="22" fill="#6e3200" opacity=".28"/>
          <path d="M140 270 C124 160 205 98 295 100 C392 102 456 168 442 270 C380 292 200 294 140 270Z" fill="url(#${u('cap')})" stroke="#1a1a1d" stroke-width="2" stroke-linejoin="round"/>
          <path d="M296 102C270 150 268 220 286 284" fill="none" stroke="#4a4a52" stroke-width="3" stroke-linecap="round" opacity=".8"/>
          <path d="M196 140 C230 112 280 106 316 112" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".16"/>
          <circle cx="296" cy="100" r="12" fill="#35353a" stroke="#0a0a0c" stroke-width="3.5"/>
          <text x="200" y="222" font-family="'Dancing Script','Brush Script MT','Segoe Script',cursive" font-weight="700" font-size="82" fill="#fbf4e6" transform="rotate(-6 200 222)">Pazzi</text>
          <text x="352" y="252" font-family="'Barlow Semi Condensed','Arial Narrow',sans-serif" font-weight="700" font-size="20" letter-spacing="2.5" fill="#fbf4e6">BUNS</text>
          <path d="M146 262 C100 244 40 262 40 292 C42 322 150 326 234 304 C290 290 330 282 372 284 C300 268 220 276 146 262Z" fill="#17171a" stroke="#1a1a1d" stroke-width="2" stroke-linejoin="round"/>
          <path d="M60 296 C100 312 170 312 226 296" fill="none" stroke="#55555c" stroke-width="4" stroke-linecap="round" opacity=".8"/>
        </g>`}
      </g>

      <g class="armL">
        <path d="M92 440 C44 450 30 500 50 530" fill="none" stroke="url(#${u('armc')})" stroke-width="38" stroke-linecap="round"/>
        <g class="gFL">${mano(u, false, "translate(58 548) rotate(-8) scale(1.15)")}</g><g class="gOL" style="display:none">${manoAbierta(u, "L")}</g>
        <g class="burger" style="display:none">${hamburguesa()}</g>
      </g>
      <g class="armR">
        <path d="M468 440 C520 450 548 430 548 392" fill="none" stroke="url(#${u('armc')})" stroke-width="38" stroke-linecap="round"/>
        <g class="gUp">${mano(u, true, "translate(534 366) rotate(6) scale(1.2)")}</g><g class="gS" style="display:none">${manoSenala(u, "translate(530 372) rotate(-4) scale(1.2)")}</g><g class="gO" style="display:none">${manoAbierta(u, "R")}</g>
      </g>
    </g>
  </g>
  </g>
  <g class="fx" transform="translate(0 20)"></g>
</svg>`;
}

// Manos de dibujo animado: palma redonda y dedos gorditos y cortos.
const OUTL = 'stroke="#b3a68f" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
const LINEA = 'fill="none" stroke="#b3a68f" stroke-width="3" stroke-linecap="round"';
const cap = (len, w) => `M${-w / 2} 6 C${-w / 2} ${-len * 0.7} ${-w / 2 + 1} ${-len} 0 ${-len} C${w / 2 - 1} ${-len} ${w / 2} ${-len * 0.7} ${w / 2} 6Z`;
function mano(u, arriba, tf) {
  const fill = `fill="url(#${u('glove')})"`;
  const pulgar = arriba
    ? `<path d="${cap(52, 32)}" ${fill} ${OUTL} transform="translate(-14 -26) rotate(-8)"/>`
    : `<path d="${cap(30, 30)}" ${fill} ${OUTL} transform="translate(-26 -22) rotate(-55)"/>`;
  return `<g transform="${tf}">${arriba ? pulgar : ''}
    <ellipse cx="0" cy="0" rx="44" ry="42" ${fill} ${OUTL}/>
    <path d="M-34 -10 Q-18 -14 -4 -8M-36 8 Q-20 4 -6 10" ${LINEA}/>${arriba ? '' : pulgar}
  </g>`;
}

const DEDOS = { len: [34, 42, 34], base: [[-22, -20], [0, -30], [22, -20]], spread: [-16, 0, 16] };
function manoAbierta(u, lado) {
  const fill = `fill="url(#${u('glove')})"`;
  const dedos = DEDOS.len.map((l, i) => `<g class="${lado}f${i}"><path d="${cap(l, 28)}" ${fill} ${OUTL}/></g>`).join('');
  return `<g class="${lado}hand">${dedos}
    <g class="${lado}t"><path d="${cap(30, 30)}" ${fill} ${OUTL}/></g>
    <ellipse cx="0" cy="6" rx="42" ry="38" ${fill} ${OUTL}/>
  </g>`;
}

function manoSenala(u, tf) {
  const fill = `fill="url(#${u('glove')})"`;
  return `<g transform="${tf}"><path d="${cap(52, 26)}" ${fill} ${OUTL} transform="translate(-24 -14) rotate(-80)"/>
    <ellipse cx="0" cy="0" rx="42" ry="40" ${fill} ${OUTL}/>
    <path d="M-2 -8 Q14 -12 28 -6M0 10 Q16 8 30 14" ${LINEA}/>
    <path d="${cap(26, 26)}" ${fill} ${OUTL} transform="translate(-20 -26) rotate(-30)"/></g>`;
}

function hamburguesa() {
  const o = 'stroke="#6a3a10" stroke-width="3" stroke-linejoin="round"';
  const sem = [[-34,-82,-20],[-8,-92,10],[22,-84,25],[40,-70,40],[-48,-66,-40],[2,-70,0]].map(([x,y,r])=>`<ellipse cx="${x}" cy="${y}" rx="6" ry="3" fill="#fff0c0" transform="rotate(${r} ${x} ${y})"/>`).join('');
  return `<g class="bgr">
    <path d="M-62 -6 Q0 16 62 -6 L56 8 Q0 24 -56 8Z" fill="#f0a840" ${o}/>
    <rect x="-62" y="-30" width="124" height="24" rx="12" fill="#5a2a14" ${o}/>
    <path d="M-62 -30 H62 L50 -14 L38 -30 Z" fill="#ffcc33" ${o}/>
    <rect x="-58" y="-46" width="116" height="16" rx="8" fill="#e8432e" ${o}/>
    <path d="M-68 -46 q11 -14 23 0 q11 -14 23 0 q11 -14 23 0 q11 -14 23 0 q11 -14 23 0 L62 -40 H-62Z" fill="#6cc04a" ${o}/>
    <path d="M-62 -50 C-64 -112 64 -112 62 -50 Z" fill="#f4b445" ${o}/>${sem}
  </g>`;
}

// Gorro de panadero (para Migas, la opción de creación propia).
function toque() {
  const o = 'stroke="#d9d0bf" stroke-width="4" stroke-linejoin="round"';
  return `<g transform="rotate(-7 290 262)">
    <ellipse cx="290" cy="288" rx="150" ry="20" fill="#6e3200" opacity=".22"/>
    <circle cx="196" cy="188" r="52" fill="#fff" ${o}/><circle cx="388" cy="188" r="52" fill="#fff" ${o}/>
    <circle cx="250" cy="140" r="62" fill="#fff" ${o}/><circle cx="336" cy="140" r="62" fill="#fff" ${o}/>
    <circle cx="292" cy="170" r="66" fill="#fff" ${o}/>
    <path d="M200 150 C230 120 270 112 300 118" fill="none" stroke="#f0eadc" stroke-width="8" stroke-linecap="round"/>
    <rect x="160" y="212" width="264" height="62" rx="26" fill="#fff" ${o}/>
    <path d="M178 262 Q292 276 408 262" fill="none" stroke="#efe7d6" stroke-width="8" stroke-linecap="round"/>
    <path d="M292 240 C262 222 262 204 280 204 C288 204 292 210 292 214 C292 210 296 204 304 204 C322 204 322 222 292 240Z" fill="#ff6a86" stroke="#d63a5a" stroke-width="2.5"/>
  </g>`;
}

function zapatilla() {
  return `
    <path d="M-52 4 C-56 -26 -14 -40 18 -26 C58 -32 98 -10 102 22 C104 46 90 58 64 58 L-34 58 C-56 58 -52 30 -52 4Z" fill="${INK}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="58" cy="30" rx="40" ry="24" fill="#fff"/>
    <path d="M-10 -16 L22 -2M-14 8 L18 20" stroke="#fff" stroke-width="11" stroke-linecap="round"/>
    <rect x="-60" y="46" width="168" height="20" rx="10" fill="#fff" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="-14" cy="-22" rx="22" ry="8" fill="#fff" opacity=".25"/>`;
}

function ojo(lado, cx, cy, rx, ry, prx, pry, u) {
  return `
  <g class="eye${lado}">
    <ellipse class="white" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fffdf8"/>
    <g clip-path="url(#${u('eye' + lado)})">
      <g class="pupil"><ellipse cx="${cx + 4}" cy="${cy + 8}" rx="${prx}" ry="${pry}" fill="url(#${u('iris')})"/>
        <ellipse cx="${cx + 4}" cy="${cy + 6}" rx="${prx * 0.52}" ry="${pry * 0.52}" fill="#150803"/>
        <ellipse cx="${cx - 8}" cy="${cy - 10}" rx="14" ry="17" fill="#fff"/><circle cx="${cx + 20}" cy="${cy + 6}" r="6" fill="#fff" opacity=".9"/><circle cx="${cx + 14}" cy="${cy + 22}" r="5.5" fill="#fff"/></g>
      <rect class="lid" x="${cx - rx - 6}" y="${cy - ry - 6}" width="${rx * 2 + 12}" height="0" fill="url(#${u('bun')})"/>
    </g>
    <path class="lidline" d="" fill="none" stroke="#3a1d08" stroke-width="7" stroke-linecap="round" opacity="0"/>
    <path class="arcH" d="M${cx - rx * 0.9} ${cy + 16} Q${cx} ${cy - 48} ${cx + rx * 0.9} ${cy + 16}" fill="none" stroke="#3a1d08" stroke-width="12" stroke-linecap="round" opacity="0"/>
    <path class="arcS" d="M${cx - rx * 0.9} ${cy - 2} Q${cx} ${cy + 34} ${cx + rx * 0.9} ${cy - 2}" fill="none" stroke="#3a1d08" stroke-width="11" stroke-linecap="round" opacity="0"/>
    <ellipse class="rim" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#6a3c18" stroke-width="3.5"/>
  </g>`;
}

// ---------- poses ----------
const BASE = {
  fx: 0, fy: 0, frot: 0, fsx: 1, fsy: 1,
  tx: 0, ty: 0, trot: 0, tsx: 1, tsy: 1,
  ll: 0, lr: 0, sl: 0, sr: 0, al: -4, ar: 0,
  eyeC: 0, arc: 0, px: 0.15, py: 0, ps: 1, es: 1,
  blY: 0, blR: 0, brY: 0, brR: 0,
  mo: 0.72, msm: 1, mw: 1, cr: 0, tint: 0, capD: 0, hm: 0, bg: 0, wk: 0, ho: 0, hl: 0, fs: 1, fw: 0,
};
const sin = Math.sin;
const PI2 = Math.PI * 2;
const abs = Math.abs;

const POSES = {
  idle(t) {
    const b = sin((PI2 * t) / 3.2);
    const k = (t % 4.6);
    let hop = 0; let sq = 0;
    if (k < 0.22) sq = -0.07 * sin((Math.PI * k) / 0.22);
    else if (k < 0.72) { hop = sin((Math.PI * (k - 0.22)) / 0.5); sq = 0.06 * hop; }
    else if (k < 0.95) sq = -0.08 * sin((Math.PI * (k - 0.72)) / 0.23);
    return {
      tsy: 1 + 0.035 * b + sq, tsx: 1 - 0.025 * b - sq * 0.7, fy: -16 * hop, ty: -3 * b, trot: 1.8 * sin(t * 1.1), frot: 0.6 * sin(t * 0.7),
      al: -4 + 6 * b + 30 * hop, ar: 3 * b + 2 * sin(t * 1.6) - 30 * hop, ll: 1.5 * sin(t * 0.9) - 6 * hop, lr: -1.5 * sin(t * 0.9) + 6 * hop,
      capD: 2.5 * sin(t * 1.1 + 1), arc: hop > 0.3 ? 0.9 : 0, blY: -8 * hop, brY: -8 * hop, mo: 0.72 + 0.04 * b + 0.2 * hop,
      px: 0.15 + 0.5 * sin(t * 0.7), py: 0.1 * sin(t * 0.5),
    };
  },
  walk(t) {
    const w = (PI2 * t) / 0.72;
    const s2 = sin(w);
    const ang = 30 * s2;
    const h = abs(sin(w));
    return {
      ll: ang, lr: -ang, sl: -ang * 0.5 + 8 * Math.max(0, -Math.cos(w)), sr: ang * 0.5 + 8 * Math.max(0, Math.cos(w)),
      fy: -12 * h, tx: 10 * s2, trot: -8 * s2 + 3, tsy: 0.9 + 0.2 * h, tsx: 1.1 - 0.14 * h,
      al: 30 * s2, ar: -10 * s2, blY: -6 * h, brY: -6 * h,
      px: 0.4, mo: 0.74 + 0.06 * sin(w * 2), cr: 0.1,
    };
  },
  guino(t) {
    const b = sin((PI2 * t) / 2.4);
    return {
      hm: 1, wk: 1, mo: 0.8, mw: 1.05, ar: -50 + 6 * b, al: -4 + 4 * b, trot: 4 + 2 * b, tsy: 1 + 0.03 * b, tsx: 1 - 0.02 * b, ty: -2 * b,
      px: 0.7, py: 0.1, blY: -4, brY: 2, cr: 0.5, capD: 3 + 2 * b,
    };
  },
  senala(t) {
    const b = sin((PI2 * t) / 2.2);
    return {
      hm: 1, mo: 0.9, mw: 1.05, ar: -42 + 10 * sin(PI2 * t * 1.1), al: -6, trot: -3 + 2 * b, tsy: 1 + 0.03 * b, tsx: 1 - 0.02 * b,
      px: 0.8, py: 0.1, blY: -6, brY: -6, cr: 0.4, fy: -4 * abs(sin(PI2 * t * 1.1)),
    };
  },
  burger(t) {
    const b = sin((PI2 * t) / 2.2);
    return {
      bg: 1, al: 96 + 6 * b, ar: 3 * b, mo: 0.85, mw: 1.05, trot: 3 * b, tsy: 1 + 0.03 * b, tsx: 1 - 0.02 * b, ty: -2 * b,
      px: -0.8, py: -0.4, blY: -8, brY: -8, cr: 0.5, capD: 2 * b,
    };
  },
  hola(t) {
    const b = sin((PI2 * t) / 2.8);
    const w = PI2 * t * 0.9;
    return {
      ho: 1, fw: 13, fs: 1.15, ar: -56 + 11 * sin(w), al: -4 + 2 * b, trot: 2 * sin(w * 0.5), tsy: 1 + 0.02 * b, tsx: 1 - 0.014 * b, ty: -1.5 * b,
      mo: 0.8, mw: 1.04, blY: -4, brY: -4, px: 0.3, cr: 0.3, capD: 1.5 * sin(w * 0.5),
    };
  },
  wave(t) {
    const w = PI2 * t * 1.1;
    return {
      ar: -30 + 12 * sin(w), al: -4, fy: -1.5 * abs(sin(w)), trot: 2 * sin(w * 0.5),
      tsy: 1 + 0.02 * sin(w * 2), ty: -1 * abs(sin(w)), mo: 0.75, arc: 0.3, blY: -4, brY: -4, px: 0.3,
    };
  },
  laugh(t) {
    const h = PI2 * 6.5 * t;
    const o = 0.78 + 0.22 * sin(h);
    return {
      ho: 1, hl: 1, fw: 8, fs: 1.2, mo: o, mw: 1.06, msm: 1, arc: 1, cr: 0.7,
      fy: -4 * abs(sin(h * 0.5)), trot: -5 + 3.2 * sin(h * 0.5), tsy: 1 + 0.045 * sin(h), tsx: 1 - 0.03 * sin(h), ty: -2.5 * abs(sin(h)),
      al: 24 + 7 * sin(h), ar: -10 + 10 * sin(h), blY: -8, brY: -8, capD: 4 * sin(h * 0.5),
      ll: 3 * sin(h * 0.5), lr: -3 * sin(h * 0.5),
    };
  },
  sleep(t) {
    const b = sin((PI2 * t) / 3.6);
    return {
      frot: -8, eyeC: 1, arc: -1, mo: 0.1 + 0.07 * b, msm: 0.4, mw: 0.5,
      tsy: 1 + 0.032 * b, tsx: 1 - 0.02 * b, ty: -1 * b, al: -12, ar: 16, trot: 2, capD: 7,
      blY: 6, brY: 6, px: 0, cr: 0.15,
    };
  },
  angry(t) {
    const j = PI2 * 16 * t;
    return {
      eyeC: 0.22, blY: 15, blR: 24, brY: 15, brR: -24, mo: 0.32, msm: -1, mw: 0.95, cr: 0.9, tint: 0.34,
      tx: 2.2 * sin(j), trot: 1.6 * sin(j * 0.5), tsy: 1 + 0.015 * sin(j), px: 0, ps: 0.8,
      lr: 9 * Math.max(0, sin(PI2 * 2.2 * t)), fy: -3 * Math.max(0, sin(PI2 * 2.2 * t)),
      al: 14, ar: -16 + 8 * sin(j * 0.5),
    };
  },
  wow(t) {
    const jump = t < 0.45 ? -30 * sin((Math.PI * t) / 0.45) : 0;
    const tr = t > 0.45 ? 1.4 * sin(PI2 * 14 * t) : 0;
    return {
      ho: 1, hl: 1, fw: 6, fs: 1.7, fy: jump, es: 1.2, ps: 0.62, blY: -20, brY: -20, blR: -6, brR: 6, mo: 0.85, mw: 0.45, msm: 0, px: 0, py: 0,
      al: 78, ar: -40, tx: tr, tsy: t < 0.45 ? 1.04 : 1, ll: -6, lr: 6,
    };
  },
  party(t) {
    const j = abs(sin(Math.PI * t * 1.9));
    const w = PI2 * t * 1.9;
    return {
      ho: 1, hl: 1, fw: 22, fs: 1.4, fy: -26 * j, arc: 1, mo: 0.92, msm: 1, mw: 1.05, cr: 0.5,
      al: 118 + 24 * sin(w), ar: -46 + 18 * sin(w + 3), tsy: 1 + 0.03 * (1 - j), tsx: 1 - 0.02 * (1 - j),
      ll: 10 * sin(w), lr: -10 * sin(w), sl: 14 * (1 - j), sr: 14 * (1 - j), blY: -10, brY: -10, trot: 4 * sin(w),
    };
  },
};

const lerp = (a, b, k) => a + (b - a) * k;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (k) => k * k * (3 - 2 * k);

export const SKIN_NOMBRES = Object.keys(SKINS);
export const ESTADOS = Object.keys(POSES);

export function createBun(host, opts = {}) {
  const id = Math.random().toString(36).slice(2, 8);
  const skin = SKINS[opts.skin] || SKINS.bun;
  host.innerHTML = plantilla(id, skin).replace('url(#bunref)', `url(#bun-${id})`).replaceAll('url(#bunref)', `url(#bun-${id})`);
  const svg = host.querySelector('svg');
  const q = (s) => svg.querySelector(s);
  const qa = (s) => svg.querySelectorAll(s);
  const el = {
    shadow: q('.shadow'), fig: q('.fig'), torso: q('.torso'), cap: q('.cap'), face: q('.face'),
    legL: q('.legL'), legR: q('.legR'), shoeL: q('.shoeL'), shoeR: q('.shoeR'), armL: q('.armL'), armR: q('.armR'),
    browL: q('.browL'), browR: q('.browR'), tint: q('.tint'), blushL: q('.blushL'), blushR: q('.blushR'),
    mouthclip: q('.mouthclip'), mouthfill: q('.mouthfill'), mouthline: q('.mouthline'), mouth: q('.mouth'),
    teeth: q('.teeth'), tongue: q('.tongue'), tongueline: q('.tongueline'), dimL: q('.dimL'), dimR: q('.dimR'),
    fx: q('.fx'), gO: q('.gO'), gOL: q('.gOL'), gFL: q('.gFL'), gUp: q('.gUp'), gS: q('.gS'), burger: q('.burger'),
  };
  const dedosEl = { R: [0, 1, 2].map((i) => q('.Rf' + i)), L: [0, 1, 2].map((i) => q('.Lf' + i)) };
  const pulgarEl = { R: q('.Rt'), L: q('.Lt') };
  const eyes = ['L', 'R'].map((s) => {
    const g = q('.eye' + s);
    return {
      g, white: g.querySelector('.white'), pupil: g.querySelector('.pupil'), lid: g.querySelector('.lid'),
      lidline: g.querySelector('.lidline'), rim: g.querySelector('.rim'), clipg: g.querySelector('g[clip-path]'), arcH: g.querySelector('.arcH'), arcS: g.querySelector('.arcS'),
      cx: s === 'L' ? 214 : 348, cy: 382, rx: 50, ry: 57,
    };
  });

  const reduce = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();
  let estado = opts.estado || 'idle';
  let tEstado = 0;
  let desde = { ...BASE };
  let blendT = 0;
  let cur = { ...BASE };
  let raf = 0;
  let last = 0;
  let clock = 0;
  let hablando = false;
  let nextBlink = 2.5;
  let blinkT = -1;
  // resortes: la gorra y la cara siguen al cuerpo con retraso
  const sp = { jy: 0, jv: 0, capA: 0, capAv: 0, capY: 0, capYv: 0, faceX: 0, faceXv: 0, faceY: 0, faceYv: 0 };
  const parts = [];
  let acc = 0;

  const f = (n) => n.toFixed(2);

  function spring(x, v, target, dt, k = 150, c = 11) {
    const a = (target - x) * k - v * c;
    const nv = v + a * dt;
    return [x + nv * dt, nv];
  }

  function setMouth(mo, msm, mw) {
    const w = 58 * mw * skin.mouthW;
    const cy = -8 * msm;
    const D = mo * 74 * skin.mouthD;
    const topC = cy + (msm >= 0 ? 26 * msm + 3 : 20 * msm);
    const botC = cy + D * 1.42 + 3;
    const d = `M${f(-w)} ${f(cy)} Q0 ${f(topC)} ${f(w)} ${f(cy)} Q0 ${f(botC)} ${f(-w)} ${f(cy)}Z`;
    el.mouthclip.setAttribute('d', d);
    el.mouthfill.setAttribute('d', d);
    el.mouthline.setAttribute('d', d);
    el.teeth.setAttribute('y', f(cy - 36));
    el.teeth.setAttribute('height', f(36 + clamp(D * 0.42, 5, 24)));
    el.tongue.setAttribute('cy', f(cy + D * 0.95));
    el.tongue.setAttribute('rx', f(w * 0.55));
    el.tongue.setAttribute('ry', f(Math.max(3, D * 0.4)));
    el.tongueline.setAttribute('d', `M0 ${f(cy + D * 0.55)}V${f(cy + D * 1.15)}`);
    el.dimL.setAttribute('transform', `translate(${f(-(w - 58 * skin.mouthW) + 8)} ${f(cy + 8)})`);
    el.dimR.setAttribute('transform', `translate(${f(w - 58 * skin.mouthW - 8)} ${f(cy + 8)})`);
    el.dimL.setAttribute('opacity', msm > 0.2 ? 0.55 : 0);
    el.dimR.setAttribute('opacity', msm > 0.2 ? 0.55 : 0);
  }

  function setEye(e, closure, arc, es, px, py, ps) {
    const { cx, cy, rx, ry } = e;
    const esK = es * skin.eyeK;
    e.g.setAttribute('transform', esK === 1 ? '' : `translate(${cx} ${cy}) scale(${f(esK)}) translate(${-cx} ${-cy})`);
    e.pupil.setAttribute('transform', `translate(${f(px * 12)} ${f(py * 12)}) translate(${cx} ${cy}) scale(${f(ps)}) translate(${-cx} ${-cy})`);
    const h = (ry * 2 + 12) * clamp(closure, 0, 1);
    e.lid.setAttribute('height', f(h));
    if (closure > 0.02) {
      const y = cy - ry - 6 + h;
      e.lidline.setAttribute('d', `M${cx - rx - 3} ${f(y)} Q${cx} ${f(y + 10 * closure)} ${cx + rx + 3} ${f(y)}`);
      e.lidline.setAttribute('opacity', closure > 0.9 ? 0 : clamp(closure * 6, 0, 1));
    } else e.lidline.setAttribute('opacity', 0);
    const happy = clamp((arc - 0.5) * 2, 0, 1);
    const sleepy = clamp((-arc - 0.5) * 2, 0, 1);
    e.arcH.setAttribute('opacity', happy);
    e.arcS.setAttribute('opacity', sleepy);
    const vis = f(clamp(1 - Math.max(happy, sleepy) * 1.6, 0, 1));
    e.white.setAttribute('opacity', vis); e.rim.setAttribute('opacity', vis); e.clipg.setAttribute('opacity', vis);
    if (Math.max(happy, sleepy) > 0.02) e.lidline.setAttribute('opacity', 0);
  }

  function manos(lado, x, y, rot, p) {
    const g = lado === 'R' ? el.gO : el.gOL;
    g.setAttribute('transform', `translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(1.18)`);
    dedosEl[lado].forEach((d, i) => {
      const a = DEDOS.spread[i] * p.fs + p.fw * sin(clock * 9 + i * 1.3);
      d.setAttribute('transform', `translate(${DEDOS.base[i][0]} ${DEDOS.base[i][1]}) rotate(${f(a)})`);
    });
    pulgarEl[lado].setAttribute('transform', `translate(${lado === 'R' ? -34 : -34} 10) rotate(${f(-52 - p.fs * 6 + p.fw * 0.5 * sin(clock * 9 + 2))})`);
  }

  function aplicar(p, dt) {
    // resortes de seguimiento
    [sp.jy, sp.jv] = spring(sp.jy, sp.jv, p.tsy - 1, dt, 240, 8);
    const jd = sp.jy - (p.tsy - 1);
    const jsy = p.tsy + jd;
    const jsx = p.tsx - 0.85 * jd;
    [sp.capA, sp.capAv] = spring(sp.capA, sp.capAv, p.trot + p.frot, dt);
    [sp.capY, sp.capYv] = spring(sp.capY, sp.capYv, p.ty + p.fy, dt, 170, 10);
    [sp.faceX, sp.faceXv] = spring(sp.faceX, sp.faceXv, p.tx, dt, 120, 12);
    [sp.faceY, sp.faceYv] = spring(sp.faceY, sp.faceYv, p.ty + p.fy, dt, 140, 11);
    const capRel = clamp((sp.capA - p.trot - p.frot) * 1.7, -16, 16);
    const capDy = clamp((sp.capY - p.ty - p.fy) * 1.5, -14, 14);
    const faceDx = clamp((sp.faceX - p.tx) * 0.9, -8, 8);
    const faceDy = clamp((sp.faceY - p.ty - p.fy) * 0.8, -6, 6);

    const K = 1.32;
    el.fig.setAttribute('transform', `translate(${f(p.fx * K)} ${f(p.fy * K)}) translate(280 704) rotate(${f(p.frot)}) scale(${f(p.fsx)} ${f(p.fsy)}) translate(-280 -704)`);
    el.shadow.setAttribute('transform', `translate(280 706) scale(${f(clamp(1 + p.fy / 120, 0.55, 1.05))} 1) translate(-280 -706)`);
    el.shadow.setAttribute('opacity', f(clamp(0.3 + p.fy / 160, 0.12, 0.34)));
    el.torso.setAttribute('transform', `translate(${f(p.tx * K)} ${f(p.ty * K)}) translate(280 606) rotate(${f(p.trot)}) scale(${f(jsx)} ${f(jsy)}) translate(-280 -606)`);
    el.legL.setAttribute('transform', `rotate(${f(p.ll)} 200 590)`);
    el.legR.setAttribute('transform', `rotate(${f(p.lr)} 362 590)`);
    el.shoeL.setAttribute('transform', `translate(200 636) rotate(${f(p.sl - p.ll)})`);
    el.shoeR.setAttribute('transform', `translate(362 636) rotate(${f(p.sr - p.lr)})`);
    el.armL.setAttribute('transform', `rotate(${f(p.al + jd * 160)} 92 440)`);
    el.armR.setAttribute('transform', `rotate(${f(p.ar - jd * 160)} 468 440)`);
    el.cap.setAttribute('transform', `translate(0 ${f(capDy * K)}) rotate(${f(capRel + p.capD)} 295 270) translate(295 270) scale(${skin.capK}) translate(-295 -270)`);
    el.face.setAttribute('transform', `translate(${f(faceDx * K)} ${f(faceDy * K)})`);
    el.browL.setAttribute('transform', `translate(214 ${f(312 + p.blY * K)}) rotate(${f(p.blR)})`);
    el.browR.setAttribute('transform', `translate(348 ${f(312 + p.brY * K)}) rotate(${f(p.brR)})`);
    const ro = p.ho > 0.5; const lo = p.hl > 0.5;
    el.gUp.style.display = ro || p.hm > 0.5 ? 'none' : '';
    el.gS.style.display = !ro && p.hm > 0.5 ? '' : 'none';
    el.gO.style.display = ro ? '' : 'none';
    el.gFL.style.display = lo ? 'none' : '';
    el.gOL.style.display = lo ? '' : 'none';
    if (ro) manos('R', 534, 372, -p.ar * 0.8, p);
    if (lo) manos('L', 58, 548, -(p.al + jd * 160) * 0.8, p);
    el.burger.style.display = p.bg > 0.5 ? '' : 'none';
    el.burger.setAttribute('transform', `translate(54 520) rotate(${f(-(p.al + jd * 160))}) translate(0 -92) scale(1.45)`);
    el.tint.setAttribute('opacity', f(p.tint));
    el.blushL.setAttribute('opacity', f(0.5 + p.cr * 0.4));
    el.blushR.setAttribute('opacity', f(0.5 + p.cr * 0.4));
    el.mouth.setAttribute('transform', 'translate(281 480)');
    setMouth(p.mo, p.msm, p.mw);
    let blink = 0;
    if (blinkT >= 0) { const k = blinkT / 0.15; blink = k < 0.5 ? k * 2 : (1 - k) * 2; }
    const closure = Math.max(p.eyeC, blink);
    eyes.forEach((e, i) => setEye(e, closure, i === 1 && p.wk > 0.05 ? Math.max(p.arc, p.wk) : p.arc, p.es, p.px, p.py, p.ps));
  }

  // partículas: Zzz, confeti, vapor, signo de exclamación
  function nuevaParticula(tipo) {
    const g = document.createElementNS(NS, 'g');
    el.fx.appendChild(g);
    const P = { g, tipo, t: 0, life: 2, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, s: 1 };
    if (tipo === 'z') {
      g.innerHTML = `<text font-family="'Barlow Semi Condensed',Arial,sans-serif" font-weight="700" font-size="46" fill="#9fb4ff" stroke="#2a3a8f" stroke-width="1.5">Z</text>`;
      Object.assign(P, { x: 290 + Math.random() * 20, y: 90, vx: 22, vy: -34, life: 2.6, r: 8 });
    } else if (tipo === 'confeti') {
      const c = ['#2f7df6', '#f26a2e', '#34c759', '#ffd23f', '#e84a8a', '#8b5cf6'][Math.floor(Math.random() * 6)];
      g.innerHTML = `<rect x="-5" y="-8" width="10" height="16" rx="1.5" fill="${c}"/>`;
      Object.assign(P, { x: 30 + Math.random() * 350, y: -10, vx: -40 + Math.random() * 80, vy: 90 + Math.random() * 120, life: 2.6, r: Math.random() * 360, vr: -360 + Math.random() * 720 });
    } else if (tipo === 'vapor') {
      g.innerHTML = '<circle r="14" fill="#fff" opacity=".85"/><circle r="14" fill="none" stroke="#c9c9c9" stroke-width="2"/>';
      const izq = Math.random() < 0.5;
      Object.assign(P, { x: izq ? 70 : 340, y: 150, vx: (izq ? -1 : 1) * (18 + Math.random() * 20), vy: -60 - Math.random() * 30, life: 1.1 });
    } else if (tipo === 'corazon') {
      g.innerHTML = '<path d="M0 16 C-28 -8 -24 -32 0 -18 C24 -32 28 -8 0 16Z" fill="#ff5c7a" stroke="#d63a5a" stroke-width="2"/><ellipse cx="-8" cy="-12" rx="5" ry="3" fill="#fff" opacity=".7" transform="rotate(-30 -8 -12)"/>';
      Object.assign(P, { x: 290 + Math.random() * 110, y: 170 + Math.random() * 30, vx: -10 + Math.random() * 30, vy: -60 - Math.random() * 25, life: 1.7, r: -15 + Math.random() * 30 });
    } else if (tipo === 'signo') {
      g.innerHTML = '<text font-family="\'Barlow Semi Condensed\',Arial,sans-serif" font-weight="800" font-size="84" fill="#ffd23f" stroke="#7a5200" stroke-width="3" text-anchor="middle">!</text>';
      Object.assign(P, { x: 345, y: 60, life: 1.4 });
    }
    parts.push(P);
  }

  function actualizarParticulas(dt) {
    acc += dt;
    if (estado === 'sleep' && acc > 0.9) { acc = 0; nuevaParticula('z'); }
    else if ((estado === 'hola' || estado === 'wave') && acc > 0.42) { acc = 0; nuevaParticula('corazon'); }
    else if (estado === 'party' && acc > 0.05) { acc = 0; nuevaParticula('confeti'); }
    else if (estado === 'angry' && acc > 0.13) { acc = 0; nuevaParticula('vapor'); }
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const P = parts[i];
      P.t += dt;
      if (P.t >= P.life) { P.g.remove(); parts.splice(i, 1); continue; }
      const k = P.t / P.life;
      P.x += P.vx * dt; P.y += P.vy * dt; P.r += (P.vr || 0) * dt;
      let sc = 1; let op = 1;
      if (P.tipo === 'z') { sc = 0.5 + k * 1.1; op = Math.sin(Math.PI * k); }
      else if (P.tipo === 'vapor') { sc = 0.5 + k * 1.6; op = 0.9 * (1 - k); }
      else if (P.tipo === 'corazon') { sc = k < 0.2 ? 0.3 + k * 3.5 : 1 + 0.08 * sin(k * 20); op = k > 0.65 ? (1 - k) / 0.35 : 1; }
      else if (P.tipo === 'signo') { sc = k < 0.15 ? k / 0.15 * 1.2 : 1.2 - 0.2 * Math.min(1, (k - 0.15) * 4); op = k > 0.8 ? (1 - k) * 5 : 1; }
      else if (P.tipo === 'confeti') { op = k > 0.75 ? (1 - k) * 4 : 1; P.vy += 60 * dt; }
      P.g.setAttribute('transform', `translate(${f(P.x)} ${f(P.y)}) rotate(${f(P.r)}) scale(${f(sc)})`);
      P.g.setAttribute('opacity', f(clamp(op, 0, 1)));
    }
  }

  function limpiarParticulas() { parts.splice(0).forEach((P) => P.g.remove()); acc = 0; }

  function poseActual() {
    const fn = POSES[estado] || POSES.idle;
    return { ...BASE, ...fn(tEstado) };
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    clock += dt;
    tEstado += dt;
    blendT += dt;
    if (blinkT >= 0) { blinkT += dt; if (blinkT > 0.15) blinkT = -1; }
    else if (clock > nextBlink && estado !== 'sleep') { blinkT = 0; nextBlink = clock + 2.5 + Math.random() * 3.5; }
    const objetivo = poseActual();
    const k = smooth(clamp(blendT / 0.3, 0, 1));
    const p = {};
    Object.keys(BASE).forEach((key) => { p[key] = lerp(desde[key], objetivo[key], k); });
    if (hablando) {
      const v = abs(sin(clock * 11)) * (0.55 + 0.45 * abs(sin(clock * 3.1)));
      p.mo = 0.12 + 0.78 * v; p.msm = 1; p.mw = 0.9 + 0.14 * (1 - v); p.ty -= 1.2 * v;
    }
    cur = p;
    aplicar(p, dt);
    actualizarParticulas(dt);
    raf = requestAnimationFrame(frame);
  }

  const api = {
    get estado() { return estado; },
    setEstado(e) {
      if (!POSES[e] || e === estado) return;
      desde = { ...cur };
      estado = e;
      tEstado = 0;
      blendT = 0;
      limpiarParticulas();
      if (e === 'wow') nuevaParticula('signo');
      if (reduce) { cur = poseActual(); aplicar(cur, 0.016); }
    },
    hablar(on) { hablando = !!on; },
    get hablando() { return hablando; },
    destroy() { cancelAnimationFrame(raf); host.innerHTML = ''; },
  };

  if (reduce) { cur = poseActual(); aplicar(cur, 0.016); }
  else { last = performance.now(); raf = requestAnimationFrame(frame); }
  if (estado === 'wow') nuevaParticula('signo');
  return api;
}
