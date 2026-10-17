#!/usr/bin/env node
/*
 * Os controles do tema Mac clássico, desenhados aqui ponto a ponto (nada da Apple): as caixas do
 * título (fechar, aumentar e recolher, normais e apertadas), a caixa de marcar, a bolinha de opção
 * e as ranhuras do puxador da barra de rolagem. Cada grade vira um SVG (um caminho por cor) e vai
 * para o bloco "controles" de src/sistema/tema-mac.css, entre as duas marcas.
 *
 * Uso: node ferramentas/controles-mac.js
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const CSS = path.join(__dirname, '..', 'src', 'sistema', 'tema-mac.css');
const INICIO = '/* controles: início (gerado por ferramentas/controles-mac.js) */';
const FIM = '/* controles: fim */';

// As cores das grades (as mesmas do tema: o cinza-claro, as sombras e o lavanda).
const CORES = { K: '#000000', D: '#555555', d: '#777777', G: '#999999', g: '#bbbbbb', l: '#dddddd', W: '#ffffff', A: '#8a8ad6' };

/** A caixa do título (13 × 13): o "poço" (cinza em cima e à esquerda, branco embaixo e à direita) e o contorno. */
const caixa = (dentro) => ['GGGGGGGGGGGGW', 'GKKKKKKKKKKKW', ...dentro.map((l) => 'GK' + l + 'KW'), 'GKKKKKKKKKKKW', 'WWWWWWWWWWWWW'];

/** O botão de 9 × 9 dentro da caixa: a luz no alto e à esquerda, a sombra embaixo e à direita. */
function botao() {
  const b = ['WWWWWWWWl'];
  for (let i = 0; i < 7; i++) b.push('WlllllllG');
  b.push('lGGGGGGGG');
  return b;
}

/** Os pontos [x, y] pintados com uma cor. */
function pintar(grade, pontos, cor) {
  const g = grade.map((l) => l.split(''));
  for (const [x, y] of pontos) g[y][x] = cor;
  return g.map((l) => l.join(''));
}

/** Apertado: a luz vira sombra e o miolo escurece, como no Mac da época. */
function apertado(b) {
  return b.map((l, y) => l.split('').map((c, x) => {
    if (y === 0 || x === 0) return 'd';
    if (y === b.length - 1 || x === l.length - 1) return 'g';
    return c === 'l' ? 'G' : c === 'd' ? 'K' : c;
  }).join(''));
}

const quadrado = []; // o "aumentar": um quadrado menor, no alto e à esquerda
for (let x = 1; x <= 5; x++) quadrado.push([x, 1], [x, 5]);
for (let y = 2; y <= 4; y++) quadrado.push([1, y], [5, y]);
const linhas = []; // o "recolher": duas linhas no meio
for (let x = 1; x <= 7; x++) linhas.push([x, 3], [x, 5]);
const xis = [[2, 2], [6, 2], [3, 3], [5, 3], [4, 4], [3, 5], [5, 5], [2, 6], [6, 6]]; // o fechar apertado

const fechar = botao();
const aumentar = pintar(botao(), quadrado, 'd');
const recolher = pintar(botao(), linhas, 'd');

const GRADES = {
  fechar: caixa(fechar),
  'fechar-apertado': caixa(pintar(apertado(fechar), xis, 'K')),
  aumentar: caixa(aumentar),
  'aumentar-apertado': caixa(apertado(aumentar)),
  recolher: caixa(recolher),
  'recolher-apertado': caixa(apertado(recolher)),
  marcar: [
    'KKKKKKKKKKKK',
    'KWWWWWWWWWlK',
    ...Array(8).fill('KWllllllllGK'),
    'KlGGGGGGGGGK',
    'KKKKKKKKKKKK',
  ],
  marcada: [
    'KKKKKKKKKKKK',
    'KWWWWWWWWWlK',
    'KWllllllllGK',
    'KWllllllKKGK',
    'KWlllllKKlGK',
    'KWKKllKKllGK',
    'KWlKKKKlllGK',
    'KWllKKllllGK',
    'KWllllllllGK',
    'KWllllllllGK',
    'KlGGGGGGGGGK',
    'KKKKKKKKKKKK',
  ],
  opcao: [
    '....KKKK....',
    '..KKWWWWKK..',
    '.KWWWllllGK.',
    '.KWllllllGK.',
    'KWllllllllGK',
    'KWllllllllGK',
    'KWllllllllGK',
    'KlllllllllGK',
    '.KlllllllGK.',
    '.KlGGGGGGGK.',
    '..KKGGGGKK..',
    '....KKKK....',
  ],
  'opcao-marcada': [
    '....KKKK....',
    '..KKWWWWKK..',
    '.KWWWllllGK.',
    '.KWllllllGK.',
    'KWlllKKlllGK',
    'KWllKKKKllGK',
    'KWllKKKKllGK',
    'KllllKKlllGK',
    '.KlllllllGK.',
    '.KlGGGGGGGK.',
    '..KKGGGGKK..',
    '....KKKK....',
  ],
  // As ranhuras do puxador da barra de rolagem (em pé e deitado).
  'puxador-v': ['WWWWWW', 'AAAAAA', 'WWWWWW', 'AAAAAA', 'WWWWWW', 'AAAAAA', 'WWWWWW', 'AAAAAA'],
  'puxador-h': Array(6).fill('WAWAWAWA'),
};

/** A grade num url("data:image/svg+xml,…"), com um caminho por cor. */
function svg(linhas) {
  const h = linhas.length;
  const w = linhas[0].length;
  const por = {};
  linhas.forEach((l, y) => {
    let x = 0;
    while (x < w) {
      const c = l[x];
      if (!CORES[c]) { x++; continue; }
      let x1 = x;
      while (x1 < w && l[x1] === c) x1++;
      (por[c] = por[c] || []).push(`M${x} ${y}h${x1 - x}v1h-${x1 - x}z`);
      x = x1;
    }
  });
  const caminhos = Object.entries(por).map(([c, d]) => `<path fill='${CORES[c]}' d='${d.join('')}'/>`).join('');
  const s = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' shape-rendering='crispEdges'>${caminhos}</svg>`;
  return `url("data:image/svg+xml,${s.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`;
}

const bloco = [INICIO, 'html.tema-mac {'];
for (const [nome, linhas] of Object.entries(GRADES)) {
  if (!linhas.every((l) => l.length === linhas[0].length)) throw new Error(`${nome}: linhas de tamanhos diferentes`);
  bloco.push(`  --mac-${nome}: ${svg(linhas)};`);
}
bloco.push('}', FIM);

let css = fs.readFileSync(CSS, 'utf8');
const i = css.indexOf(INICIO);
const f = css.indexOf(FIM);
if (i < 0 || f < i) throw new Error('as marcas do bloco "controles" não estão em tema-mac.css');
css = css.slice(0, i) + bloco.join('\n') + css.slice(f + FIM.length);
fs.writeFileSync(CSS, css);
console.log(`controles: ${Object.keys(GRADES).length} desenhos em ${path.relative(process.cwd(), CSS)}`);
