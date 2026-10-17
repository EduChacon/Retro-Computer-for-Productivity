/*
 * A aparência da área de trabalho: a cor e o padrão do fundo (desenhos de 8×8
 * pontos, próprios do projeto) e o tamanho dos pixels na tela.
 */
import { marcar } from './idioma.js';

export const CORES = [
  '#008080', '#004040', '#000080', '#3a6ea5', '#5a7d9a', '#008000', '#556b2f', '#2f4f4f',
  '#800000', '#a0522d', '#800080', '#6b4f8b', '#808000', '#808080', '#c0c0c0', '#000000',
];

// 1 = ponto escuro; cada linha tem 8 pontos.
export const PADROES = {
  nenhum: { nome: marcar('(Nenhum)'), linhas: null },
  pontos: { nome: marcar('Pontos'), linhas: ['10000000', '00000000', '00001000', '00000000', '10000000', '00000000', '00001000', '00000000'] },
  xadrez: { nome: marcar('Xadrez fino'), linhas: ['10101010', '01010101', '10101010', '01010101', '10101010', '01010101', '10101010', '01010101'] },
  tijolos: { nome: marcar('Tijolos'), linhas: ['11111111', '10000000', '10000000', '10000000', '11111111', '00001000', '00001000', '00001000'] },
  diagonal: { nome: marcar('Diagonais'), linhas: ['10000000', '01000000', '00100000', '00010000', '00001000', '00000100', '00000010', '00000001'] },
  trama: { nome: marcar('Trama'), linhas: ['11000000', '11000000', '00110000', '00110000', '00001100', '00001100', '00000011', '00000011'] },
  losangos: { nome: marcar('Losangos'), linhas: ['00010000', '00101000', '01000100', '10000010', '01000100', '00101000', '00010000', '00000000'] },
  ondas: { nome: marcar('Ondas'), linhas: ['00000000', '01100000', '10010001', '00001110', '00000000', '00000110', '10001001', '01110000'] },
  grade: { nome: marcar('Grade'), linhas: ['11111111', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000'] },
};

/** A imagem do padrão (SVG 8×8), com a cor do ponto. */
export function imagemPadrao(nome, cor = '#000000') {
  const p = PADROES[nome];
  if (!p || !p.linhas) return null;
  let caminho = '';
  p.linhas.forEach((l, y) => {
    for (let x = 0; x < 8; x++) if (l[x] === '1') caminho += `M${x} ${y}h1v1h-1z`;
  });
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8' shape-rendering='crispEdges'><path fill='${cor}' d='${caminho}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Uma cor mais escura (para os pontos do padrão). */
export function escurecer(hex, f = 0.55) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/**
 * O fundo de cada tema (Painel › Aparência › Tema): o verde-azulado do PC e o azul-arroxeado do Mac.
 * Ao trocar de tema, o fundo de um vira o do outro; um fundo escolhido pelo usuário fica como está.
 */
export const FUNDO_TEMA = Object.freeze({ pc: Object.freeze({ cor: '#008080', padrao: 'nenhum' }), mac: Object.freeze({ cor: '#6a6aa8', padrao: 'nenhum' }) });
export function fundoParaTema(papel, de, para) {
  const p = papel || {};
  const a = FUNDO_TEMA[de];
  const igual = a && !p.imagem && (p.cor || '#008080').toLowerCase() === a.cor && (p.padrao || 'nenhum') === a.padrao;
  return igual && FUNDO_TEMA[para] ? { ...p, ...FUNDO_TEMA[para] } : p;
}

/** O fundo de sempre da página inicial do Navegador (Painel › Internet › Página inicial). */
export const FUNDO_INICIO = Object.freeze({ cor: '#3a6ea5', padrao: 'losangos' });

/** Os jeitos de mostrar a imagem do papel de parede (Painel › Aparência › Plano de fundo). */
export const MODOS_PAPEL = { centro: marcar('Centralizado'), lado: marcar('Lado a lado'), preencher: marcar('Preencher') };

/** As imagens que o papel de parede aceita (papel.js confere pelo conteúdo). */
export const EXTS_PAPEL = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];

/** O endereço da cópia de uma imagem do papel de parede (papel.js, na pasta do usuário). */
export const urlPapel = (arquivo) => `sistema://retro/papel/${encodeURIComponent(arquivo)}`;

/**
 * O fundo em CSS: a cor, o padrão 8×8 e, se houver, a imagem do papel de parede. Centralizada, a
 * imagem fica por cima do padrão; preenchendo, cobre tudo sem deformar. tam é o tamanho da imagem em
 * pontos da tela (sem ele, a imagem centralizada e a lado a lado ficam no tamanho do arquivo).
 */
export function fundoCss(papel, { tam = null } = {}) {
  const cor = (papel && papel.cor) || '#008080';
  const padrao = imagemPadrao(papel && papel.padrao, escurecer(cor));
  const base = { backgroundColor: cor, backgroundImage: padrao || 'none', backgroundRepeat: 'repeat', backgroundPosition: '0 0', backgroundSize: 'auto' };
  if (!papel || !papel.imagem) return base;
  const url = `url("${urlPapel(papel.imagem)}")`;
  const modo = MODOS_PAPEL[papel.modo] ? papel.modo : 'preencher';
  const tamanho = modo === 'preencher' ? 'cover' : tam ? `${tam.w}px ${tam.h}px` : 'auto';
  if (modo === 'centro' && padrao) {
    return { ...base, backgroundImage: `${url}, ${padrao}`, backgroundRepeat: 'no-repeat, repeat', backgroundPosition: 'center, 0 0', backgroundSize: `${tamanho}, auto` };
  }
  return { ...base, backgroundImage: url, backgroundRepeat: modo === 'lado' ? 'repeat' : 'no-repeat', backgroundPosition: modo === 'lado' ? '0 0' : 'center', backgroundSize: tamanho };
}

// O tamanho de cada imagem em pixels, lido uma vez.
const pixelsDasImagens = new Map();
function pixelsDe(arquivo) {
  if (!pixelsDasImagens.has(arquivo)) {
    pixelsDasImagens.set(arquivo, new Promise((ok) => {
      const i = new Image();
      i.onload = () => ok({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => ok(null);
      i.src = urlPapel(arquivo);
    }));
  }
  return pixelsDasImagens.get(arquivo);
}

/**
 * Pinta o fundo num elemento. A imagem centralizada ou lado a lado aparece com um pixel do arquivo
 * por pixel do monitor, como no Windows (qualquer que seja o tamanho dos pixels da interface);
 * escala encolhe tudo (a prévia do monitor no Painel).
 */
export function aplicarFundo(papel, el = document.getElementById('tela'), { escala = 1 } = {}) {
  const vez = (el._vezFundo = (el._vezFundo || 0) + 1);
  if (el.id === 'tela') {
    ultimoFundo = papel;
    // Com as duas telas (telas.js), cada uma tem o papel de parede inteiro.
    for (const f of el.querySelectorAll(':scope > .fundo-tela')) aplicarFundo(papel, f, { escala });
  }
  Object.assign(el.style, fundoCss(papel));
  if (!papel || !papel.imagem || !MODOS_PAPEL[papel.modo] || papel.modo === 'preencher') return;
  pixelsDe(papel.imagem).then((px) => {
    if (!px || el._vezFundo !== vez) return;
    const k = escala / (window.devicePixelRatio || 1);
    Object.assign(el.style, fundoCss(papel, { tam: { w: Math.max(1, px.w * k), h: Math.max(1, px.h * k) } }));
  });
}

// Mudar o tamanho dos pixels muda o devicePixelRatio: a imagem centralizada volta ao tamanho certo.
let ultimoFundo = null;

/** Pinta de novo o fundo da área de trabalho (as telas mudaram: telas.js). */
export function repintarFundo() {
  const el = typeof document !== 'undefined' && document.getElementById('tela');
  if (el && ultimoFundo) aplicarFundo(ultimoFundo, el);
}
if (typeof window !== 'undefined') window.addEventListener('resize', () => { if (ultimoFundo && ultimoFundo.imagem && ultimoFundo.modo !== 'preencher') aplicarFundo(ultimoFundo); });

/**
 * O tamanho dos pixels: a tela usa um número inteiro de pixels físicos por
 * pixel da interface, para a fonte e os ícones ficarem nítidos.
 */
let zoomAtual = 1;
/** O zoom da área de trabalho (pixels da interface por pixel da tela, sobre a escala do monitor). */
export const zoomInterface = () => zoomAtual;

// Os tamanhos dos pixels do Painel › Aparência: os inteiros e os do meio, entre eles.
export const ESCALAS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

// A menor área que a interface precisa (as caixas do Painel e as janelas cabem nela).
const AREA_MINIMA = { w: 1024, h: 720 };

/**
 * O tamanho automático: a escala do sistema arredondada (150% vira 2), mas sem deixar a área da
 * tela menor que a mínima (num monitor de 1920 × 1080 a 150%, o 2 deixaria só 960 × 540).
 */
export function pixelsAutomaticos({ escala = 1, w = 0, h = 0 } = {}) {
  const max = w && h ? Math.max(1, Math.floor(Math.min(w / AREA_MINIMA.w, h / AREA_MINIMA.h))) : 4;
  return Math.min(Math.max(1, Math.round(escala)), max);
}

export async function aplicarEscala(escala) {
  const tela = await retro.sistema.telaFisica().catch(() => null);
  const dpr = (tela && tela.escala) || window.devicePixelRatio || 1;
  // O automático segue a escala do sistema (que, com as duas telas em escalas diferentes, não é a da página).
  const n = escala === 'auto' || !escala ? pixelsAutomaticos(tela ? { ...tela, escala: tela.escalaSistema || tela.escala } : { escala: dpr }) : Number(escala);
  zoomAtual = n / dpr;
  await retro.sistema.zoom(zoomAtual);
  return n;
}
