/*
 * O tabuleiro de 8 × 8 das damas e do xadrez: as casas (com o veio da madeira), as peças, as
 * marcas (a casa escolhida, os lances possíveis, o último lance, o xeque, as peças que precisam
 * tomar) e o mouse (clicar na peça e depois na casa, ou arrastar), com as letras e os números em
 * volta. O teclado também joga: as setas andam, Enter (ou a barra de espaço) escolhe. Ele pode
 * virar, com as pretas embaixo.
 */
import { h } from '../util.js';

const escura = (c) => ((c >> 3) + (c & 7)) % 2 === 1;

/** Um ladrilho de madeira (ou liso), feito uma vez: o veio em faixas um pouco mais escuras. */
function ladrilho(tam, cor, veio, semente) {
  const c = document.createElement('canvas');
  c.width = tam;
  c.height = tam;
  const ctx = c.getContext('2d');
  ctx.fillStyle = cor;
  ctx.fillRect(0, 0, tam, tam);
  if (!veio) return c;
  const v = parseInt(cor.slice(1), 16);
  const [r, g, b] = [v >> 16, (v >> 8) & 255, v & 255];
  let s = semente * 9301 + 49297;
  const acaso = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const fase = acaso() * 10;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      // O veio corre na horizontal, ondulando de leve.
      const onda = Math.sin((y + Math.sin(x / 11 + fase) * 1.6) * 0.42 + fase);
      const k = onda > 0.93 ? 0.94 : onda > 0.78 ? 0.97 : acaso() < 0.03 ? 0.95 : 1;
      if (k === 1) continue;
      ctx.fillStyle = `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export class Tabuleiro {
  /**
   * @param {object} o
   * @param {number} [o.casa]  o lado da casa, em pontos
   * @param {string} o.claro  o.escuro  as cores das casas
   * @param {boolean} [o.veio]  as casas com o veio da madeira
   * @param {(c:number)=>HTMLCanvasElement|null} o.peca  o desenho da peça na casa
   * @param {(c:number)=>void} o.aoTocar  um clique (ou Enter) numa casa; -1 para soltar a escolha
   * @param {(c:number)=>boolean} o.podeArrastar
   * @param {(de:number, para:number)=>void} o.aoSoltar
   */
  constructor(o) {
    this.o = o;
    this.T = o.casa || 40;
    this.girado = false;
    this.marcas = {};
    this.cursor = -1;
    this.arrasto = null;
    this.ladrilhos = { claro: [], escuro: [] };
    for (let i = 0; i < 4; i++) {
      this.ladrilhos.claro.push(ladrilho(this.T, o.claro, o.veio, i + 1));
      this.ladrilhos.escuro.push(ladrilho(this.T, o.escuro, o.veio, i + 7));
    }
    this.canvas = h('canvas.tab-canvas', { width: this.T * 8, height: this.T * 8, tabIndex: 0 });
    this.ctx = this.canvas.getContext('2d');
    this.linhas = h('div.tab-linhas');
    this.colunas = h('div.tab-colunas');
    this.el = h('div.tab-moldura', this.linhas, h('div.tab-borda', this.canvas), h('div'), this.colunas);
    this.el.style.setProperty('--casa', this.T + 'px');
    this.rotular();
    this.canvas.addEventListener('pointerdown', (e) => this.apertar(e));
    this.canvas.addEventListener('pointermove', (e) => this.mover(e));
    this.canvas.addEventListener('pointerup', (e) => this.soltar(e));
    this.canvas.addEventListener('pointercancel', () => { this.arrasto = null; this.desenhar(); });
    this.canvas.addEventListener('keydown', (e) => this.tecla(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  girar(sim) {
    this.girado = !!sim;
    this.rotular();
    this.desenhar();
  }

  rotular() {
    const numeros = [8, 7, 6, 5, 4, 3, 2, 1];
    const letras = [...'abcdefgh'];
    if (this.girado) { numeros.reverse(); letras.reverse(); }
    this.linhas.replaceChildren(...numeros.map((n) => h('span', String(n))));
    this.colunas.replaceChildren(...letras.map((l) => h('span', l)));
  }

  /** A casa (0 a 63) na posição da tela, ou -1. */
  casaEm(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * 8);
    const y = Math.floor(((e.clientY - r.top) / r.height) * 8);
    if (x < 0 || y < 0 || x > 7 || y > 7) return -1;
    const v = y * 8 + x;
    return this.girado ? 63 - v : v;
  }

  ponto(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * this.canvas.width, y: ((e.clientY - r.top) / r.height) * this.canvas.height };
  }

  apertar(e) {
    if (e.button !== 0) return;
    this.canvas.focus();
    this.cursor = -1;
    const c = this.casaEm(e);
    if (c < 0) return;
    this.o.aoTocar(c);
    if (this.o.podeArrastar(c)) {
      this.canvas.setPointerCapture(e.pointerId);
      this.arrasto = { de: c, ...this.ponto(e), movido: false, x0: e.clientX, y0: e.clientY };
    }
    this.desenhar();
  }

  mover(e) {
    if (!this.arrasto) return;
    const p = this.ponto(e);
    if (Math.abs(e.clientX - this.arrasto.x0) + Math.abs(e.clientY - this.arrasto.y0) > 4) this.arrasto.movido = true;
    this.arrasto.x = p.x;
    this.arrasto.y = p.y;
    this.arrasto.sobre = this.casaEm(e);
    this.desenhar();
  }

  soltar(e) {
    const a = this.arrasto;
    this.arrasto = null;
    if (a && a.movido) {
      const c = this.casaEm(e);
      if (c >= 0 && c !== a.de) this.o.aoSoltar(a.de, c);
    }
    this.desenhar();
  }

  tecla(e) {
    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
    if (passos[e.key] != null) {
      e.preventDefault();
      if (this.cursor < 0) this.cursor = this.marcas.escolhida >= 0 ? this.marcas.escolhida : (this.girado ? 3 : 59);
      let v = this.girado ? 63 - this.cursor : this.cursor;
      const k = v & 7;
      const l = v >> 3;
      const d = passos[e.key];
      if ((d === -1 && k > 0) || (d === 1 && k < 7) || (d === -8 && l > 0) || (d === 8 && l < 7)) v += d;
      this.cursor = this.girado ? 63 - v : v;
      this.desenhar();
    } else if ((e.key === 'Enter' || e.key === ' ') && this.cursor >= 0) {
      e.preventDefault();
      this.o.aoTocar(this.cursor);
      this.desenhar();
    } else if (e.key === 'Escape') {
      this.o.aoTocar(-1);
      this.desenhar();
    }
  }

  /** As coordenadas na tela de uma casa. */
  lugar(c) {
    const v = this.girado ? 63 - c : c;
    return { x: (v & 7) * this.T, y: (v >> 3) * this.T };
  }

  desenhar() {
    const ctx = this.ctx;
    const T = this.T;
    const m = this.marcas;
    for (let c = 0; c < 64; c++) {
      const { x, y } = this.lugar(c);
      ctx.drawImage(this.ladrilhos[escura(c) ? 'escuro' : 'claro'][(c * 7 + (c >> 3)) % 4], x, y);
      if (m.ultimo && m.ultimo.includes(c)) { ctx.fillStyle = 'rgba(255, 230, 40, 0.38)'; ctx.fillRect(x, y, T, T); }
      if (c === m.escolhida) { ctx.fillStyle = 'rgba(40, 150, 255, 0.42)'; ctx.fillRect(x, y, T, T); }
      if (c === m.xeque) this.brilho(x, y, 'rgba(230, 0, 0, ');
      if (m.obrigatorias && m.obrigatorias.includes(c)) this.moldura(x, y, '#ff8000', 2);
    }
    const arr = this.arrasto && this.arrasto.movido ? this.arrasto : null;
    for (let c = 0; c < 64; c++) {
      if (arr && c === arr.de) continue;
      const p = this.o.peca(c);
      if (!p) continue;
      const { x, y } = this.lugar(c);
      ctx.drawImage(p, x + Math.floor((T - p.width) / 2), y + Math.floor((T - p.height) / 2));
    }
    for (const c of m.alvos || []) {
      const { x, y } = this.lugar(c);
      if (this.o.peca(c) && !(arr && c === arr.de)) this.moldura(x, y, 'rgba(0, 0, 0, 0.45)', 3);
      else this.ponto9(x + T / 2, y + T / 2);
    }
    for (const c of m.caminho || []) {
      const { x, y } = this.lugar(c);
      this.moldura(x, y, '#2a7fff', 2);
    }
    if (arr && arr.sobre >= 0) {
      const { x, y } = this.lugar(arr.sobre);
      this.moldura(x, y, '#ffffff', 2);
    }
    if (this.cursor >= 0) {
      const { x, y } = this.lugar(this.cursor);
      this.tracejado(x, y);
    }
    if (arr) {
      const p = this.o.peca(arr.de);
      if (p) ctx.drawImage(p, Math.round(arr.x - p.width / 2), Math.round(arr.y - p.height / 2));
    }
  }

  /** O ponto dos lances possíveis: um disco de 10 pontos, escuro e meio transparente. */
  ponto9(cx, cy) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    const linhas = [[4, 2], [2, 6], [1, 8], [0, 10], [0, 10], [0, 10], [0, 10], [1, 8], [2, 6], [4, 2]];
    const x0 = Math.round(cx) - 5;
    const y0 = Math.round(cy) - 5;
    linhas.forEach(([dx, w], j) => ctx.fillRect(x0 + dx, y0 + j, w, 1));
  }

  moldura(x, y, cor, e) {
    const ctx = this.ctx;
    const T = this.T;
    ctx.fillStyle = cor;
    ctx.fillRect(x, y, T, e);
    ctx.fillRect(x, y + T - e, T, e);
    ctx.fillRect(x, y + e, e, T - 2 * e);
    ctx.fillRect(x + T - e, y + e, e, T - 2 * e);
  }

  tracejado(x, y) {
    const ctx = this.ctx;
    const T = this.T;
    for (let i = 0; i < T; i += 2) {
      ctx.fillStyle = (i / 2) % 2 ? '#ffffff' : '#000000';
      ctx.fillRect(x + i, y + 1, 2, 1);
      ctx.fillRect(x + i, y + T - 2, 2, 1);
      ctx.fillRect(x + 1, y + i, 1, 2);
      ctx.fillRect(x + T - 2, y + i, 1, 2);
    }
  }

  /** O brilho do xeque: anéis em volta do rei, mais fortes por fora. */
  brilho(x, y, base) {
    const ctx = this.ctx;
    const T = this.T;
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = base + (0.55 - k * 0.12) + ')';
      const e = k * 3;
      ctx.fillRect(x + e, y + e, T - 2 * e, 3);
      ctx.fillRect(x + e, y + T - e - 3, T - 2 * e, 3);
      ctx.fillRect(x + e, y + e + 3, 3, T - 2 * e - 6);
      ctx.fillRect(x + T - e - 3, y + e + 3, 3, T - 2 * e - 6);
    }
  }
}
