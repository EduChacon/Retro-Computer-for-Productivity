/* Ícones próprios para os novos Craft. Nenhum desenho ou marca dos fabricantes é distribuído. */
const cache = new Map();
const PALETA = ['#557fc4', '#9a64ba', '#368f82', '#be6c42', '#697caf', '#ab5e82'];
const LETRAS = {
  a: '0111010001111111000110001', b: '1111010001111101000111110', c: '0111110000100001000001111',
  d: '1111010001100011000111110', e: '1111110000111101000011111', f: '1111110000111101000010000',
  g: '0111110000101111000101111', h: '1000110001111111000110001', i: '1111100100001000010011111',
  j: '0011100010000101001001100', k: '1000110010111001001010001', l: '1000010000100001000011111',
  m: '1000111011101011000110001', n: '1000111001101011001110001', o: '0111010001100011000101110',
  p: '1111010001111101000010000', q: '0111010001101011001001101', r: '1111010001111101001010001',
  s: '0111110000011100000111110', t: '1111100100001000010000100', u: '1000110001100011000101110',
  v: '1000110001100010101000100', w: '1000110001101011101110001', x: '1000101010001000101010001',
  y: '1000101010001000010000100', z: '1111100010001000100011111',
};
function monograma(id) {
  const nome = id.replace(/craft/g, '').replace(/[^a-z]/g, '') || 'craft';
  return [...nome.slice(0, 2)].map((letra, n) => [...(LETRAS[letra] || LETRAS.c)].map((p, i) => p === '1' ? `<rect x="${5 + n * 12 + i % 5 * 2}" y="${11 + Math.floor(i / 5) * 2}" width="2" height="2"/>` : '').join('')).join('');
}
export function iconeCraft(nome, tam = 32) {
  const id = /^craft-auto-([a-z0-9-]{2,40})$/.exec(nome || '')?.[1];
  if (!id || ![16, 32].includes(tam)) return null;
  const chave = id + '/' + tam; if (cache.has(chave)) return cache.get(chave);
  let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const fundo = PALETA[hash % PALETA.length];
  let desenho;
  if (id === 'texturecraft') {
    desenho = '<path fill="#58465f" d="M6 6h20v20H6z"/><path fill="#cba6df" d="M6 6h6v6H6zm12 0h8v6h-8zM12 12h6v6h-6zM6 18h6v8H6zm12 0h8v8h-8z"/><path fill="#ffd77b" d="m16 22 10-14 4 4-12 12-6 2z"/><path fill="#684344" d="m12 26 2-6 4 4-2 2z"/>';
  } else if (id === 'craft-anything') {
    desenho = '<path fill="#b6dfe6" d="M6 8h20v18H6z"/><path fill="#345779" d="M8 12h16v12H8z"/><path fill="#fce48d" d="m18 4 2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path fill="#fff4c7" d="M17 9h2v6h-2zM14 11h8v2h-8z"/><path fill="#82dfb9" d="m8 20 4-4 2 2-4 4 4 2-2 2-4-4zm12 2 4-4v8z"/>';
  } else if (id === 'solidcraft') {
    desenho = '<path fill="#ffe2a3" d="m16 6 12 6-12 6-12-6z"/><path fill="#e69b56" d="m4 12 12 6v12L4 24z"/><path fill="#af633c" d="m16 18 12-6v12l-12 6z"/><path fill="none" stroke="#663f34" stroke-width="2" d="m16 6 12 6v12l-12 6-12-6V12zm0 12v12M4 12l12 6 12-6"/>';
  } else desenho = `<g fill="#f8f6ec">${monograma(id)}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 32 32" shape-rendering="crispEdges"><path fill="#253345" d="M2 2h28v28H2z"/><path fill="${fundo}" d="M4 4h24v24H4z"/><path fill="#ffffff66" d="M4 4h24v2H4zM4 4h2v24H4z"/>${desenho}</svg>`;
  const url = 'data:image/svg+xml,' + encodeURIComponent(svg); cache.set(chave, url); return url;
}
