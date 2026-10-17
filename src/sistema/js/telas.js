/*
 * As duas telas em tela cheia (Windows e Mac): a janela do Retro Computer cobre os monitores, e o
 * processo principal diz onde está cada um dentro dela (monitores.js). A barra de tarefas, os ícones,
 * os balões e as telas da época (o bloqueio, a entrada, o desligar) ficam na principal, pelas
 * variáveis --tela-* e a classe "varias-telas" do estilo; cada tela tem o papel de parede inteiro;
 * as janelas andam pelas duas e maximizam e encaixam na tela em que estão (janelas.js), e os menus
 * não passam da borda da tela deles (menus.js). Com uma tela só, nada muda.
 */
import { h } from './util.js';
import { repintarFundo } from './aparencia.js';

let telas = []; // em pontos da página, a partir do canto da janela: { x, y, w, h, principal }
let ultima = null; // o que o processo principal mandou por último (para refazer a conta com o zoom)
const ouvintes = new Set();

export const variasTelas = () => telas.length > 1;
export const listaTelas = () => telas;

/** A tela principal (com uma tela só, a página inteira). */
export function telaPrincipal() {
  return telas.find((t) => t.principal) || telas[0] || { x: 0, y: 0, w: innerWidth, h: innerHeight, principal: true };
}

/** A tela de um ponto da página (a mais perto, se ele cair num vão entre monitores de tamanhos diferentes). */
export function telaDoPonto(x, y) {
  if (!variasTelas()) return telaPrincipal();
  let melhor = telas[0];
  let menor = Infinity;
  for (const t of telas) {
    const dx = x < t.x ? t.x - x : x > t.x + t.w ? x - (t.x + t.w) : 0;
    const dy = y < t.y ? t.y - y : y > t.y + t.h ? y - (t.y + t.h) : 0;
    if (dx * dx + dy * dy < menor) { menor = dx * dx + dy * dy; melhor = t; }
  }
  return melhor;
}

/** A tela de um retângulo (a do meio dele). */
export const telaDoRet = (r) => telaDoPonto(r.left + r.width / 2, r.top + Math.min(r.height / 2, 12));

// A barra de tarefas também nas outras telas (barra.js diz, pela configuração).
let barraNasOutras = false;
export function definirBarraNasOutras(v) { barraNasOutras = !!v; }

/** A área útil de uma tela (sem a barra de tarefas dela), como um getBoundingClientRect. */
export function areaUtil(t) {
  const barra = t.principal || barraNasOutras ? (document.getElementById('barra') || {}).offsetHeight || 0 : 0;
  return { left: t.x, top: t.y, right: t.x + t.w, bottom: t.y + t.h - barra, width: t.w, height: t.h - barra };
}

/** As duas são a mesma tela? (As telas são refeitas a cada mudança: vale o lugar.) */
export const mesmaTela = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

/** Avisa quando as telas mudam: fn({ antes, motivo }), com motivo 'monitores' quando um monitor entrou ou saiu. */
export function aoMudarTelas(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function aplicar(info, motivo = info && info.motivo) {
  ultima = info;
  const k = info && info.largura ? innerWidth / info.largura : 1;
  const antes = telas;
  telas = ((info && info.telas) || []).map((t) => ({ x: Math.round(t.x * k), y: Math.round(t.y * k), w: Math.round(t.w * k), h: Math.round(t.h * k), principal: !!t.principal }));
  if (telas.length < 2) telas = [];
  const raiz = document.documentElement;
  raiz.classList.toggle('varias-telas', variasTelas());
  const p = telaPrincipal();
  const vars = { '--tela-x': p.x, '--tela-y': p.y, '--tela-w': p.w, '--tela-h': p.h, '--tela-direita': innerWidth - p.x - p.w, '--tela-baixo': innerHeight - p.y - p.h };
  for (const [n, v] of Object.entries(vars)) { if (variasTelas()) raiz.style.setProperty(n, v + 'px'); else raiz.style.removeProperty(n); }
  // O papel de parede inteiro em cada tela (e não um só, partido entre os monitores).
  const tela = document.getElementById('tela');
  if (tela) {
    tela.querySelectorAll(':scope > .fundo-tela').forEach((e) => e.remove());
    if (variasTelas()) tela.prepend(...telas.map((t) => h('div.fundo-tela', { style: { left: t.x + 'px', top: t.y + 'px', width: t.w + 'px', height: t.h + 'px' } })));
    repintarFundo();
  }
  const mudou = JSON.stringify(antes) !== JSON.stringify(telas);
  if (mudou || motivo) for (const fn of ouvintes) { try { fn({ antes, motivo }); } catch { } }
}

export async function iniciarTelas() {
  if (!window.retro || !retro.tela || !retro.tela.naJanela) return;
  retro.tela.aoMudarTelas((info) => aplicar(info));
  // O zoom da página (o tamanho dos pixels) muda os pontos: a conta é refeita com o mesmo pedido.
  window.addEventListener('resize', () => { if (ultima) aplicar(ultima, ''); });
  aplicar(await retro.tela.naJanela().catch(() => null));
}
