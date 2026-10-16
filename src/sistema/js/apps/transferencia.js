/*
 * O histórico da área de transferência (a tecla do logotipo com V, como no Windows 10): os
 * últimos textos copiados, numa caixa que abre por cima de tudo. Enter (ou um clique) cola o
 * escolhido na posição do cursor; Delete o tira da lista; o "…" de cada item fixa ou exclui.
 * A lista fica só na memória do processo principal (transferencia.js) e some ao fechar.
 */
import { h, img } from '../util.js';
import { registrarApp, definirConfig } from '../sistema.js';
import { janelaAtiva } from '../janelas.js';
import { janelasNativas, retroAtivo } from '../janelas-nativas.js';
import { abrirMenu, menuAberto } from '../menus.js';
import { tr, marcar, localidade } from '../idioma.js';

let aberto = null; // { el, lista, itens, i, alvo, nativa, largar }

const PREVIA = 240; // caracteres mostrados de cada item

function quando(ms) {
  const d = new Date(ms);
  const hoje = new Date();
  const hora = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === hoje.toDateString() ? hora : d.toLocaleDateString(localidade(), { day: 'numeric', month: 'short' }) + ' ' + hora;
}

function fechar({ devolver = true } = {}) {
  if (!aberto) return null;
  const a = aberto;
  aberto = null;
  a.el.remove();
  a.largar();
  document.removeEventListener('mousedown', a.fora, true);
  // O foco volta ao que o tinha antes (um campo, um programa, uma página do Navegador).
  if (devolver && a.alvo && a.alvo.isConnected && a.alvo.focus) a.alvo.focus();
  return a;
}

/** Cola o item: o foco volta primeiro, e o processo principal faz o Ctrl+V. */
async function colar(item) {
  const a = fechar();
  if (!a) return;
  const temAlvo = a.nativa || (a.alvo && a.alvo !== document.body);
  if (!temAlvo) { await retro.transferencia.usar(item.id).catch(() => { }); return; }
  await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 30)));
  await retro.transferencia.colar(item.id, a.nativa ? a.nativa.id : null).catch(() => { });
}

function menuDoItem(item, x, y) {
  abrirMenu([
    { rotulo: tr('&Colar'), negrito: true, acao: () => colar(item) },
    { rotulo: tr('C&opiar sem colar'), acao: () => { fechar(); retro.transferencia.usar(item.id).catch(() => { }); } },
    { separador: true },
    { rotulo: item.fixado ? tr('&Desafixar') : tr('&Fixar'), acao: () => retro.transferencia.fixar(item.id, !item.fixado).then(recarregar) },
    { rotulo: tr('&Excluir'), icone: 'excluir', acao: () => retro.transferencia.apagar(item.id).then(recarregar) },
  ], { x, y });
}

function desenhar(dados) {
  if (!aberto) return;
  const a = aberto;
  a.itens = dados.itens || [];
  a.i = Math.max(0, Math.min(a.i, a.itens.length - 1));
  a.btLimpar.disabled = !dados.ligado || !a.itens.some((it) => !it.fixado);
  if (!dados.ligado) {
    a.lista.replaceChildren(h('div.ht-vazio',
      h('div', tr('O histórico da área de transferência está desligado.')),
      h('button', { type: 'button', on: { click: async () => { await definirConfig({ transferencia: { historico: true } }); recarregar(); } } }, tr('Ligar'))));
    return;
  }
  if (!a.itens.length) {
    a.lista.replaceChildren(h('div.ht-vazio', tr('Ainda não há nada aqui. O que você copiar nos programas aparece nesta lista.')));
    return;
  }
  a.lista.replaceChildren(...a.itens.map((it, k) => {
    const texto = it.texto.length > PREVIA ? it.texto.slice(0, PREVIA) + '…' : it.texto;
    const mais = h('button.ht-mais', { type: 'button', title: tr('Mais opções'), tabIndex: -1 }, '…');
    mais.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); const r = mais.getBoundingClientRect(); menuDoItem(it, r.left, r.bottom); });
    const el = h('div.ht-item' + (k === a.i ? '.sel' : ''), { role: 'option', 'aria-selected': String(k === a.i) },
      h('div.ht-cabeca', h('span.ht-quando', quando(it.quando)), it.fixado ? h('span.ht-fixado', tr('Fixado')) : null, mais),
      h('div.ht-texto', texto));
    el.addEventListener('mousedown', (e) => {
      if (e.button === 2) return;
      e.preventDefault();
      a.i = k;
      colar(it);
    });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); a.i = k; marcarEscolhido(); menuDoItem(it, e.clientX, e.clientY); });
    return el;
  }));
  const sel = a.lista.children[a.i];
  if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest' });
}

/** Marca o item escolhido sem refazer a lista. */
function marcarEscolhido() {
  if (!aberto) return;
  [...aberto.lista.children].forEach((el, k) => {
    el.classList.toggle('sel', k === aberto.i);
    el.setAttribute('aria-selected', String(k === aberto.i));
    if (k === aberto.i && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  });
}

async function recarregar() {
  if (!aberto) return;
  const d = await retro.transferencia.listar().catch(() => ({ ligado: false, itens: [] }));
  desenhar(d);
}

function tecla(e) {
  const a = aberto;
  if (!a || menuAberto()) return;
  if (e.key === 'Escape') { e.preventDefault(); fechar(); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (!a.itens.length) return;
    a.i = (a.i + (e.key === 'ArrowDown' ? 1 : -1) + a.itens.length) % a.itens.length;
    marcarEscolhido();
  } else if (e.key === 'Home' || e.key === 'End') {
    e.preventDefault();
    a.i = e.key === 'Home' ? 0 : Math.max(0, a.itens.length - 1);
    marcarEscolhido();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (a.itens[a.i]) colar(a.itens[a.i]);
  } else if (e.key === 'Delete') {
    e.preventDefault();
    if (a.itens[a.i]) retro.transferencia.apagar(a.itens[a.i].id).then(recarregar);
  } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
    e.preventDefault();
    const el = a.lista.children[a.i];
    if (el && a.itens[a.i]) { const r = el.getBoundingClientRect(); menuDoItem(a.itens[a.i], r.left + 20, r.top + 20); }
  }
}

/** Abre a caixa (ou fecha, se já estiver aberta). */
export async function abrirHistorico() {
  if (aberto) { fechar(); return; }
  // Para onde o texto vai: o que tinha o foco antes (e, no modo sistema, o programa do Linux da frente).
  const alvo = document.activeElement;
  const nativa = retroAtivo() ? null : janelasNativas().find((n) => n.ativa) || null;
  const lista = h('div.ht-lista', { role: 'listbox', tabIndex: 0, 'aria-label': tr('Área de transferência') });
  const btLimpar = h('button', { type: 'button', on: { click: () => retro.transferencia.limpar().then(recarregar) } }, tr('Limpar tudo'));
  const el = h('div.historico-transf', { role: 'dialog', 'aria-label': tr('Área de transferência') },
    h('div.titulo', img('transferencia', 16, { className: 'ico' }), h('span.texto', tr('Área de transferência')),
      h('div.botoes', h('button.b-fechar', { title: tr('Fechar'), tabIndex: -1, on: { click: () => fechar() } }))),
    h('div.ht-corpo', lista, h('div.ht-rodape', h('span', tr('Enter cola; Delete exclui.')), btLimpar)));
  el.addEventListener('keydown', tecla);
  el.addEventListener('mousedown', (e) => { if (e.target === el || e.target.closest('.ht-corpo')) lista.focus(); });
  const fora = (e) => { if (!el.contains(e.target) && !e.target.closest('#camada-menus')) fechar({ devolver: false }); };
  document.addEventListener('mousedown', fora, true);
  const largar = retro.transferencia.aoMudar(() => recarregar());
  aberto = { el, lista, btLimpar, itens: [], i: 0, alvo, nativa, largar, fora };
  document.getElementById('tela').append(el);
  // Sobre a janela da frente (como no Windows, perto de onde se escreve); sem ela, no meio da tela.
  const tela = document.getElementById('tela').getBoundingClientRect();
  const j = !nativa && janelaAtiva();
  const ref = j && !j.minimizada && !j.fechada ? j.el.getBoundingClientRect() : { left: 0, top: 0, width: tela.width, height: tela.height - 28 };
  const w = el.offsetWidth;
  const hgt = el.offsetHeight;
  el.style.left = Math.round(Math.max(4, Math.min(tela.width - w - 4, ref.left + (ref.width - w) / 2))) + 'px';
  el.style.top = Math.round(Math.max(4, Math.min(tela.height - hgt - 32, ref.top + (ref.height - hgt) / 2))) + 'px';
  lista.focus();
  await recarregar();
}

registrarApp('transferencia', { nome: marcar('Área de transferência'), icone: 'transferencia', abrir: () => abrirHistorico() });
