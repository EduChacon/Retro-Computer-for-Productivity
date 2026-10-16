/*
 * Os desenhos das peças do xadrez e das damas, feitos na hora e no próprio projeto. Cada peça do
 * xadrez é um conjunto de formas simples (círculos, retângulos, polígonos) numa grade de 32 por
 * 32; elas viram pontos (sem o borrado das bordas), ganham o contorno preto, as linhas entre as
 * partes e o sombreado de uma peça torneada, com a luz da esquerda, como nos jogos da época.
 */

const CACHE = new Map();

const PALETAS = {
  // As brancas em marfim; as pretas em ébano, com o brilho cinza.
  1: { contorno: '#000000', luz: '#ffffff', base: '#e6dfc8', sombra: '#a89c78', detalhe: '#000000' },
  [-1]: { contorno: '#000000', luz: '#8a8a8a', base: '#3c3c3c', sombra: '#1c1c1c', detalhe: '#a0a0a0' },
};

/* ---------- As formas (na grade de 32) ---------- */

const ret = (x, y, w, hh) => (c) => c.rect(x, y, w, hh);
const circ = (x, y, r) => (c) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); };
const elip = (x, y, rx, ry) => (c) => { c.moveTo(x + rx, y); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); };
const poli = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) c.lineTo(p[0], p[1]); c.closePath(); };

// O pedestal de todas as peças: a base larga e o anel de cima.
const pe = (larg = 18) => [[ret(16 - larg / 2, 26, larg, 3.5)], [ret(16 - larg / 2 + 2, 23.5, larg - 4, 2.5)]];

/**
 * Cada peça: as partes (cada uma uma lista de formas, desenhadas de baixo para cima; as linhas
 * entre as partes saem do contorno de cada uma) e os detalhes (o olho do cavalo, o corte do bispo).
 */
const XADREZ = {
  1: { // peão
    partes: [...pe(16), [poli([[12.5, 24], [19.5, 24], [18, 17], [14, 17]])], [elip(16, 16.6, 5, 1.7)], [circ(16, 11.2, 4.4)]],
  },
  2: { // cavalo, olhando para a esquerda
    partes: [...pe(18), [poli([[10.5, 24], [11.5, 19.5], [14.5, 15.5], [11, 16.6], [8.5, 17.6], [6.2, 16.6], [5.2, 14.4], [6.4, 12.3], [10, 8.8], [12.4, 6.3], [13.4, 3.2], [15.4, 5.4], [17.4, 4.3], [18.6, 5.8], [22.2, 8.2], [24.6, 12.4], [25.2, 17.5], [24.2, 24]])]],
    detalhes: [circ(12.4, 10.4, 1.05), circ(7.4, 14.3, 0.75), poli([[18.6, 6.4], [22.6, 10.2], [24, 15.2], [24.4, 21], [23.2, 21], [22.8, 15.6], [21.4, 11], [18, 7.4]])],
    detalheNaLuz: [2],
  },
  3: { // bispo
    partes: [...pe(18), [poli([[11.5, 24], [20.5, 24], [18.5, 18.8], [13.5, 18.8]])], [elip(16, 18.6, 5.6, 1.7)],
      [elip(16, 12.4, 4.9, 5.8), poli([[12.6, 9], [19.4, 9], [16, 4.6]])], [circ(16, 3.9, 1.9)]],
    detalhes: [poli([[17.6, 8.2], [18.8, 9], [15.4, 13.6], [14.2, 12.8]])],
  },
  4: { // torre
    partes: [...pe(18), [poli([[10.6, 24], [21.4, 24], [20.6, 12.4], [11.4, 12.4]])],
      [ret(9, 8.8, 14, 3.8), ret(9, 4.8, 3.6, 4.4), ret(14.2, 4.8, 3.6, 4.4), ret(19.4, 4.8, 3.6, 4.4)]],
    detalhes: [ret(11.6, 16, 8.8, 1), ret(11.6, 20, 8.8, 1), ret(15.6, 12.6, 1, 3.6), ret(13.4, 16.8, 1, 3.4), ret(17.8, 16.8, 1, 3.4)],
    detalheNaLuz: [0, 1, 2, 3, 4],
  },
  5: { // dama: a coroa aberta, de dentes largos (fininhos, eles virariam só contorno), e a pérola no alto
    partes: [...pe(20), [poli([[10.4, 24], [21.6, 24], [19.4, 15.4], [12.6, 15.4]])], [elip(16, 15.2, 6, 1.8)],
      [poli([[10.6, 14], [21.4, 14], [25, 5.6], [21.6, 9.2], [18.9, 5.4], [16, 8.8], [13.1, 5.4], [10.4, 9.2], [7, 5.6]])],
      [circ(16, 5.2, 2.3)]],
    detalhes: [ret(11, 12, 10, 1)],
  },
  6: { // rei
    partes: [...pe(20), [poli([[10.4, 24], [21.6, 24], [19.4, 15.4], [12.6, 15.4]])], [elip(16, 15.2, 6, 1.8)],
      [poli([[11, 14], [21, 14], [23.2, 9.6], [8.8, 9.6]]), elip(16, 9.8, 7.2, 2.6)], [ret(14.4, 0.4, 3.2, 8.2), ret(11.6, 2.2, 8.8, 3.2)]],
    detalhes: [ret(11, 12, 10, 1)],
  },
};

/* ---------- Das formas aos pontos ---------- */

function mascara(tam, formas) {
  const c = document.createElement('canvas');
  c.width = tam;
  c.height = tam;
  const ctx = c.getContext('2d');
  ctx.scale(tam / 32, tam / 32);
  // Cada forma é pintada sozinha: no mesmo traçado, duas formas sobrepostas em sentidos opostos
  // se anulariam (e a parte de cima do bispo e a coroa do rei sumiam).
  for (const f of formas) {
    ctx.beginPath();
    f(ctx);
    ctx.fill();
  }
  const d = ctx.getImageData(0, 0, tam, tam).data;
  const m = new Uint8Array(tam * tam);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] >= 120 ? 1 : 0;
  return m;
}

/** Monta o desenho: as partes, o contorno, as linhas entre as partes, o sombreado e os detalhes. */
function montar(def, tam, cores) {
  const n = tam * tam;
  const dono = new Int16Array(n).fill(-1); // a parte de cima em cada ponto
  def.partes.forEach((formas, k) => {
    const m = mascara(tam, formas);
    for (let i = 0; i < n; i++) if (m[i]) dono[i] = k;
  });
  const det = def.detalhes ? def.detalhes.map((f) => mascara(tam, [f])) : [];
  const cor = new Array(n).fill(null);
  const fora = (x, y) => x < 0 || y < 0 || x >= tam || y >= tam || dono[y * tam + x] < 0;
  // Nas peças pequenas, só o contorno de fora (as linhas internas embaralhariam o desenho).
  const linhas = tam >= 24;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const i = y * tam + x;
      const k = dono[i];
      if (k < 0) continue;
      if (fora(x - 1, y) || fora(x + 1, y) || fora(x, y - 1) || fora(x, y + 1)) { cor[i] = cores.contorno; continue; }
      // A linha entre as partes fica do lado da parte de baixo.
      if (linhas && [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(([a, b]) => dono[b * tam + a] > k)) { cor[i] = cores.contorno; continue; }
    }
  }
  // O sombreado: em cada fileira de cada parte, a luz à esquerda e a sombra à direita.
  for (let y = 0; y < tam; y++) {
    let x = 0;
    while (x < tam) {
      const i = y * tam + x;
      if (dono[i] < 0 || cor[i]) { x++; continue; }
      const k = dono[i];
      let fim = x;
      while (fim + 1 < tam && dono[y * tam + fim + 1] === k && !cor[y * tam + fim + 1]) fim++;
      const larg = fim - x + 1;
      for (let a = x; a <= fim; a++) {
        const u = larg > 1 ? (a - x) / (larg - 1) : 0.5;
        cor[y * tam + a] = larg <= 2 ? cores.base : u < 0.12 ? cores.base : u < 0.42 ? cores.luz : u < 0.74 ? cores.base : cores.sombra;
      }
      x = fim + 1;
    }
  }
  det.forEach((m, k) => {
    const naLuz = def.detalheNaLuz && def.detalheNaLuz.includes(k);
    for (let i = 0; i < n; i++) {
      if (!m[i] || dono[i] < 0 || cor[i] === cores.contorno) continue;
      cor[i] = naLuz ? cores.sombra : cores.detalhe;
    }
  });
  const c = document.createElement('canvas');
  c.width = tam;
  c.height = tam;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  for (let i = 0; i < n; i++) {
    if (!cor[i]) continue;
    const v = parseInt(cor[i].slice(1), 16);
    img.data.set([v >> 16, (v >> 8) & 255, v & 255, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** A peça do xadrez (1 a 6, positiva nas brancas) em tam × tam pontos. */
export function pecaXadrez(p, tam = 32) {
  const chave = 'x' + p + ':' + tam;
  if (!CACHE.has(chave)) CACHE.set(chave, montar(XADREZ[Math.abs(p)], tam, PALETAS[Math.sign(p)]));
  return CACHE.get(chave);
}

/* ---------- As peças das damas ---------- */

const CORES_DAMAS = {
  1: { contorno: '#000000', luz: '#ffffff', base: '#ece4cc', sombra: '#b4a684', sulco: '#c8bc9c', fundo: '#7c6c4c' },
  [-1]: { contorno: '#000000', luz: '#7a7a7a', base: '#3a3a3a', sombra: '#202020', sulco: '#2a2a2a', fundo: '#101010' },
};

/**
 * A pedra das damas vista de cima, um pouco de lado (aparece a lateral), com o sulco e a borda
 * em relevo (a luz do alto à esquerda); a dama leva a coroa dourada no meio.
 */
export function pecaDamas(p, tam = 32) {
  const chave = 'd' + p + ':' + tam;
  if (CACHE.has(chave)) return CACHE.get(chave);
  const k = CORES_DAMAS[Math.sign(p)];
  const c = document.createElement('canvas');
  c.width = tam;
  c.height = tam;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(tam, tam);
  const esp = Math.max(2, Math.round(tam / 10)); // a altura da lateral
  const r = (tam - esp) / 2 - 1;
  const cx = tam / 2;
  const cy = r + 1;
  const face = (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r;
  const pedra = (x, y) => { for (let e = 0; e <= esp; e++) if (face(x, y - e)) return true; return false; };
  const pintar = (x, y, cor) => {
    const v = parseInt(cor.slice(1), 16);
    img.data.set([v >> 16, (v >> 8) & 255, v & 255, 255], (y * tam + x) * 4);
  };
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      if (!pedra(x, y)) continue;
      if (!pedra(x - 1, y) || !pedra(x + 1, y) || !pedra(x, y - 1) || !pedra(x, y + 1)) { pintar(x, y, k.contorno); continue; }
      const dx = x + 0.5 - cx;
      if (!face(x, y)) {
        // A lateral: a linha logo abaixo da face, e o resto mais escuro à direita.
        pintar(x, y, face(x, y - 1) ? k.contorno : dx > r * 0.35 ? k.fundo : k.sombra);
        continue;
      }
      const dy = y + 0.5 - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const d = dist / r;
      const lado = (-dx - dy) / (dist || 1);
      let cor = k.base;
      if (d > 0.76) cor = lado > 0.35 ? k.luz : lado < -0.35 ? k.sombra : k.base;
      else if (d > 0.6) cor = k.sulco;
      else if (d > 0.48) cor = lado > 0.2 ? k.sombra : lado < -0.2 ? k.luz : k.base;
      pintar(x, y, cor);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (Math.abs(p) === 2) coroa(ctx, cx, cy, tam);
  CACHE.set(chave, c);
  return c;
}

/** A coroa da dama, em pontos, no meio da pedra. */
function coroa(ctx, cx, cy, tam) {
  const e = Math.max(1, Math.floor(tam / 32));
  const linhas = [
    '.K.....K.....K.',
    'KYK...KYK...KYK',
    'KYYK.KYYYK.KYYK',
    'KYYYKYYYYYKYYYK',
    'KYYYYYYYYYYYYYK',
    'KYyYYYyYyYYYyYK',
    'KYYYYYYYYYYYYYK',
    'KKKKKKKKKKKKKKK',
  ];
  const cores = { K: '#000000', Y: '#f0c838', y: '#b07810' };
  const w = linhas[0].length * e;
  const hh = linhas.length * e;
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - hh / 2);
  linhas.forEach((l, j) => [...l].forEach((ch, i) => {
    if (!cores[ch]) return;
    ctx.fillStyle = cores[ch];
    ctx.fillRect(x0 + i * e, y0 + j * e, e, e);
  }));
}
