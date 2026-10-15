/*
 * Menus: os suspensos (barra de menus das janelas, botão direito) e os
 * submenus em cascata, com o teclado (setas, Enter, Esc, a letra sublinhada).
 *
 * Item: { rotulo: '&Abrir', icone, acao, sub: itens | () => itens | async () => itens,
 *         separador, desativado, marcado, radio, negrito, atalho }
 */
import { h, img, rotulo, letraAtalho, limitar } from './util.js';

const camada = () => document.getElementById('camada-menus');
let cadeia = [];          // menus abertos, do primeiro ao último submenu
let aoFecharTudo = null;

function fecharDesde(i) {
  while (cadeia.length > i) {
    const m = cadeia.pop();
    m.el.remove();
    if (m.aoFechar) m.aoFechar();
  }
}

export function fecharMenus() {
  const fn = aoFecharTudo;
  aoFecharTudo = null;
  fecharDesde(0);
  if (fn) fn();
}

export function menuAberto() {
  return cadeia.length > 0;
}

async function resolverItens(itens) {
  return typeof itens === 'function' ? await itens() : itens;
}

function posicionar(el, x, y, { abaixo = true, larguraPai = 0 } = {}) {
  const tela = document.getElementById('tela').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  let px = x;
  let py = y;
  if (px + r.width > tela.width) px = larguraPai ? x - larguraPai - r.width + 3 : tela.width - r.width;
  if (abaixo) {
    if (py + r.height > tela.height - 28) py = Math.max(0, tela.height - 28 - r.height);
  } else {
    py = y - r.height;
  }
  el.style.left = limitar(px, 0, Math.max(0, tela.width - r.width)) + 'px';
  el.style.top = Math.max(0, py) + 'px';
}

/**
 * Abre um menu suspenso.
 * @param {Array} itens
 * @param {{x:number, y:number, nivel?:number, classe?:string, acima?:boolean, aoFechar?:Function, elemento?:HTMLElement}} o
 */
export async function abrirMenu(itens, o = {}) {
  const nivel = o.nivel || 0;
  if (nivel === 0) {
    fecharMenus();
    aoFecharTudo = o.aoFechar || null;
  } else {
    fecharDesde(nivel);
  }
  const lista = await resolverItens(itens);
  const comIcones = lista.some((i) => i && i.icone);
  const el = o.elemento || h('div.menu');
  if (!o.elemento) {
    if (comIcones) el.classList.add('com-icones');
    if (o.classe) el.classList.add(...o.classe.split(' '));
  }
  const corpo = o.corpo || el;
  const registro = { el, itens: lista, opcoes: [], ativo: -1, nivel, subTimer: null };
  cadeia.push(registro);

  if (!lista.length) corpo.append(h('div.vazio', '(Vazio)'));
  lista.forEach((item) => {
    if (!item) return;
    if (item.separador) {
      corpo.append(h('div.separador'));
      return;
    }
    const op = h('div.opcao');
    if (item.sub) op.classList.add('sub');
    if (item.desativado) op.classList.add('desativada');
    if (item.marcado) op.classList.add(item.radio ? 'radio' : 'marcada');
    if (item.negrito) op.classList.add('negrito');
    if (comIcones) op.append(item.icone ? img(item.icone, o.tamIcone || 16) : h('span.vazio-ico'));
    op.append(rotulo(item.rotulo));
    if (item.atalho) op.append(h('span.atalho-tecla', item.atalho));
    const idx = registro.opcoes.length;
    registro.opcoes.push({ op, item });
    op.addEventListener('mouseenter', () => ativar(registro, idx, true));
    op.addEventListener('mousedown', (e) => e.preventDefault());
    op.addEventListener('click', (e) => {
      e.stopPropagation();
      escolher(registro, idx);
    });
    corpo.append(op);
  });

  camada().append(el);
  if (o.pai) {
    const r = o.pai.getBoundingClientRect();
    posicionar(el, r.right - 3, r.top - 3, { larguraPai: r.width });
  } else {
    posicionar(el, o.x || 0, o.y || 0, { abaixo: !o.acima });
  }
  return registro;
}

function ativar(reg, idx, comMouse) {
  if (reg.ativo === idx && reg.opcoes[idx]) return;
  reg.opcoes.forEach((o, i) => o.op.classList.toggle('ativa', i === idx));
  reg.ativo = idx;
  // Fechar submenus de outro item.
  const pos = cadeia.indexOf(reg);
  clearTimeout(reg.subTimer);
  const atual = reg.opcoes[idx];
  if (pos >= 0 && cadeia.length > pos + 1 && (!atual || cadeia[pos + 1].dono !== idx)) {
    if (comMouse) reg.subTimer = setTimeout(() => fecharDesde(pos + 1), 250);
    else fecharDesde(pos + 1);
  }
  if (atual && atual.item.sub && !atual.item.desativado && comMouse) {
    reg.subTimer = setTimeout(() => abrirSub(reg, idx), 250);
  }
}

async function abrirSub(reg, idx) {
  const pos = cadeia.indexOf(reg);
  if (pos < 0) return;
  if (cadeia[pos + 1] && cadeia[pos + 1].dono === idx) return;
  fecharDesde(pos + 1);
  const { op, item } = reg.opcoes[idx];
  const sub = await abrirMenu(item.sub, { nivel: pos + 1, pai: op, tamIcone: 16 });
  sub.dono = idx;
  return sub;
}

async function escolher(reg, idx) {
  const { item } = reg.opcoes[idx] || {};
  if (!item || item.desativado) return;
  if (item.sub) {
    const sub = await abrirSub(reg, idx);
    if (sub && sub.opcoes.length) ativar(sub, 0);
    return;
  }
  fecharMenus();
  if (item.acao) setTimeout(() => item.acao(), 0);
}

/* ---------- Teclado ---------- */

document.addEventListener('keydown', (e) => {
  if (!cadeia.length) return;
  const reg = cadeia[cadeia.length - 1];
  const n = reg.opcoes.length;
  const mover = (d) => {
    if (!n) return;
    let i = reg.ativo;
    for (let k = 0; k < n; k++) {
      i = (i + d + n) % n;
      if (!reg.opcoes[i].item.desativado) break;
    }
    ativar(reg, i);
  };
  let tratado = true;
  switch (e.key) {
    case 'ArrowDown': mover(1); break;
    case 'ArrowUp': mover(-1); break;
    case 'ArrowRight':
      if (reg.opcoes[reg.ativo] && reg.opcoes[reg.ativo].item.sub) escolher(reg, reg.ativo);
      else if (reg.barra) reg.barra.vizinho(1);
      break;
    case 'ArrowLeft':
      if (cadeia.length > 1 && !cadeia[cadeia.length - 1].raizBarra) fecharDesde(cadeia.length - 1);
      else if (cadeia[0].barra) cadeia[0].barra.vizinho(-1);
      break;
    case 'Enter': if (reg.ativo >= 0) escolher(reg, reg.ativo); break;
    case 'Escape':
      if (cadeia.length > 1) fecharDesde(cadeia.length - 1);
      else fecharMenus();
      break;
    default: {
      const letra = e.key.length === 1 ? e.key.toLowerCase() : null;
      const i = letra ? reg.opcoes.findIndex((o) => !o.item.desativado && letraAtalho(o.item.rotulo || '') === letra) : -1;
      if (i >= 0) { ativar(reg, i); escolher(reg, i); } else tratado = false;
    }
  }
  if (tratado) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);

// Clicar fora fecha os menus.
document.addEventListener('mousedown', (e) => {
  if (!cadeia.length) return;
  if (e.target.closest('.menu') || e.target.closest('[data-abre-menu]')) return;
  fecharMenus();
}, true);
window.addEventListener('blur', () => {
  // Um clique dentro de um programa (iframe) tira o foco da área de trabalho.
  if (cadeia.length) fecharMenus();
});

/* ---------- Barra de menus das janelas ---------- */

/**
 * @param {Array<{rotulo:string, itens:Array|Function}>} definicao
 */
export function barraDeMenus(definicao) {
  const barra = h('div.menubar');
  const titulos = [];
  let abertoIdx = -1;

  const abrir = async (i) => {
    const def = definicao[i];
    if (!def) return;
    fecharMenus();
    titulos.forEach((t, k) => t.classList.toggle('aberto', k === i));
    abertoIdx = i;
    const r = titulos[i].getBoundingClientRect();
    const reg = await abrirMenu(def.itens, {
      x: r.left,
      y: r.bottom,
      aoFechar: () => {
        titulos.forEach((t) => t.classList.remove('aberto'));
        abertoIdx = -1;
      },
    });
    reg.barra = { vizinho: (d) => abrir((i + d + definicao.length) % definicao.length) };
    reg.raizBarra = true;
  };

  definicao.forEach((def, i) => {
    const t = h('div', { dataset: { abreMenu: '1' } }, rotulo(def.rotulo));
    t.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (abertoIdx === i) fecharMenus();
      else abrir(i);
    });
    t.addEventListener('mouseenter', () => {
      if (abertoIdx >= 0 && abertoIdx !== i) abrir(i);
    });
    titulos.push(t);
    barra.append(t);
  });
  barra.abrirPorLetra = (letra) => {
    const i = definicao.findIndex((d) => letraAtalho(d.rotulo) === letra);
    if (i >= 0) { abrir(i); return true; }
    return false;
  };
  return barra;
}
