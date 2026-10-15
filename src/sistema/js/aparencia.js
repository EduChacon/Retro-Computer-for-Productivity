/*
 * A aparência da área de trabalho: a cor e o padrão do fundo (desenhos de 8×8
 * pontos, próprios do projeto) e o tamanho dos pixels na tela.
 */
export const CORES = [
  '#008080', '#004040', '#000080', '#3a6ea5', '#5a7d9a', '#008000', '#556b2f', '#2f4f4f',
  '#800000', '#a0522d', '#800080', '#6b4f8b', '#808000', '#808080', '#c0c0c0', '#000000',
];

// 1 = ponto escuro; cada linha tem 8 pontos.
export const PADROES = {
  nenhum: { nome: '(Nenhum)', linhas: null },
  pontos: { nome: 'Pontos', linhas: ['10000000', '00000000', '00001000', '00000000', '10000000', '00000000', '00001000', '00000000'] },
  xadrez: { nome: 'Xadrez fino', linhas: ['10101010', '01010101', '10101010', '01010101', '10101010', '01010101', '10101010', '01010101'] },
  tijolos: { nome: 'Tijolos', linhas: ['11111111', '10000000', '10000000', '10000000', '11111111', '00001000', '00001000', '00001000'] },
  diagonal: { nome: 'Diagonais', linhas: ['10000000', '01000000', '00100000', '00010000', '00001000', '00000100', '00000010', '00000001'] },
  trama: { nome: 'Trama', linhas: ['11000000', '11000000', '00110000', '00110000', '00001100', '00001100', '00000011', '00000011'] },
  losangos: { nome: 'Losangos', linhas: ['00010000', '00101000', '01000100', '10000010', '01000100', '00101000', '00010000', '00000000'] },
  ondas: { nome: 'Ondas', linhas: ['00000000', '01100000', '10010001', '00001110', '00000000', '00000110', '10001001', '01110000'] },
  grade: { nome: 'Grade', linhas: ['11111111', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000', '10000000'] },
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

export function fundoCss(papel) {
  const cor = (papel && papel.cor) || '#008080';
  const img = imagemPadrao(papel && papel.padrao, escurecer(cor));
  return { backgroundColor: cor, backgroundImage: img || 'none' };
}

export function aplicarFundo(papel, el = document.getElementById('tela')) {
  Object.assign(el.style, fundoCss(papel));
}

/**
 * O tamanho dos pixels: a tela usa um número inteiro de pixels físicos por
 * pixel da interface, para a fonte e os ícones ficarem nítidos.
 */
export async function aplicarEscala(escala) {
  const dpr = await retro.sistema.escalaTela().catch(() => window.devicePixelRatio || 1);
  const n = escala === 'auto' || !escala ? Math.max(1, Math.round(dpr)) : Number(escala);
  await retro.sistema.zoom(n / dpr);
  return n;
}
