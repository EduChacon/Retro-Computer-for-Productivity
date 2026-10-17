/*
 * O painel de emojis (Logotipo+. ou Logotipo+;), como o do Windows de hoje no visual da época: a
 * busca pelo nome (em português, inglês e espanhol, sem precisar dos acentos), as categorias, os
 * usados há pouco e um clique que põe o emoji no campo que estava com o foco: um campo da área de
 * trabalho, um programa Craft, o Prompt ou a página do Navegador. Sem campo nenhum, ele vai para a
 * área de transferência. Os desenhos são os do SerenityOS (emojis/emojis.png, ferramentas/emojis.py).
 */
import { h } from './util.js';
import { estado, definirConfig, registrarApp } from './sistema.js';
import { telaDoRet, telaPrincipal, areaUtil } from './telas.js';
import { campoRecente } from './atalhos.js';
import { tr, marcar } from './idioma.js';

const GRUPOS = [
  { id: 'recentes', nome: marcar('Usados há pouco'), icone: '🕒' },
  { g: 0, nome: marcar('Rostos e emoções'), icone: '😀' },
  { g: 1, nome: marcar('Pessoas e corpo'), icone: '👋' },
  { g: 3, nome: marcar('Animais e natureza'), icone: '🐱' },
  { g: 4, nome: marcar('Comida e bebida'), icone: '🍎' },
  { g: 5, nome: marcar('Viagens e lugares'), icone: '🚗' },
  { g: 6, nome: marcar('Atividades'), icone: '⚽' },
  { g: 7, nome: marcar('Objetos'), icone: '💡' },
  { g: 8, nome: marcar('Símbolos'), icone: '❤️' },
  { g: 9, nome: marcar('Bandeiras'), icone: '🏁' },
];
const MAX_RECENTES = 32;
const MAX_ACHADOS = 240;
const ESCALA = 2;

let dados = null; // { lista, colunas, casa, porCaractere, texto }
let painel = null;

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const recentes = () => ((estado.config.emojis && estado.config.emojis.recentes) || []).filter((c) => dados.porCaractere.has(c));
const coluna = () => ({ 'pt-BR': 2, en: 3, es: 4 }[estado.config.idiomaEfetivo] || 2);

async function carregar() {
  if (dados) return dados;
  const m = await import('./emojis-dados.js');
  const porCaractere = new Map(m.EMOJIS.map((e, i) => [e[0], i]));
  // O texto de busca de cada um: os três nomes e as palavras, sem acentos.
  const texto = m.EMOJIS.map((e) => semAcento(`${e[2]} ${e[3]} ${e[4]} ${e[5]}`));
  dados = { lista: m.EMOJIS, colunas: m.COLUNAS, casa: m.CASA, porCaractere, texto };
  return dados;
}

/** O desenho de um emoji (o pedaço dele na folha, em dobro). */
function desenho(i) {
  const { colunas, casa } = dados;
  const lado = casa * ESCALA;
  return h('span.emoji', { 'aria-hidden': 'true', style: {
    width: lado + 'px', height: lado + 'px', backgroundSize: `${colunas * lado}px auto`,
    backgroundPosition: `-${(i % colunas) * lado}px -${Math.floor(i / colunas) * lado}px`,
  } });
}

function buscar(q) {
  const termos = semAcento(q).split(/\s+/).filter(Boolean);
  const achados = [];
  for (let i = 0; i < dados.lista.length && achados.length < MAX_ACHADOS; i++) {
    if (termos.every((t) => dados.texto[i].includes(t))) achados.push(i);
  }
  return achados;
}

function desenharGrade() {
  const p = painel;
  const q = p.busca.value.trim();
  let itens;
  let titulo;
  if (q) {
    itens = buscar(q);
    titulo = itens.length ? tr('Resultados para "{busca}"', { busca: q }) : tr('Nenhum emoji para "{busca}"', { busca: q });
  } else if (p.grupo === 'recentes') {
    itens = recentes().map((c) => dados.porCaractere.get(c));
    titulo = itens.length ? tr('Usados há pouco') : tr('Os emojis que você usar aparecem aqui.');
  } else {
    itens = [];
    dados.lista.forEach((e, i) => { if (e[1] === p.grupo) itens.push(i); });
    titulo = tr(GRUPOS.find((g) => g.g === p.grupo).nome);
  }
  for (const b of p.abas.children) b.classList.toggle('apertado', !q && b.dataset.grupo === String(p.grupo));
  p.titulo.textContent = titulo;
  const k = coluna();
  p.grade.replaceChildren(...itens.map((i) => {
    const e = dados.lista[i];
    const b = h('button.emo', { type: 'button', title: e[k], 'aria-label': e[k] }, desenho(i));
    // O foco fica onde estava (o campo do texto), para o emoji entrar lá.
    b.addEventListener('mousedown', (ev) => ev.preventDefault());
    b.addEventListener('click', () => escolher(i));
    b.addEventListener('mouseenter', () => { p.nome.textContent = e[k]; });
    return b;
  }));
  p.grade.scrollTop = 0;
  p.nome.textContent = '';
}

function guardarRecente(c) {
  const lista = [c, ...recentes().filter((x) => x !== c)].slice(0, MAX_RECENTES);
  definirConfig({ emojis: { recentes: lista } }).catch(() => { });
}

const editavel = (el) => !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'IFRAME' || el.tagName === 'WEBVIEW' || el.isContentEditable
  || (el.tagName === 'INPUT' && /^(text|search|email|url|tel|password|)$/.test(el.type || '')));

async function escolher(i) {
  const c = dados.lista[i][0];
  const alvo = painel.alvo;
  guardarRecente(c);
  if (editavel(alvo) && alvo.isConnected && !alvo.disabled && !alvo.readOnly) {
    try {
      alvo.focus();
      // A página do Navegador é outro webContents: o próprio webview põe o texto nela.
      if (alvo.tagName === 'WEBVIEW') await alvo.insertText(c);
      else await retro.sistema.inserirTexto(c);
      painel.nome.textContent = tr('Inserido: {nome}', { nome: dados.lista[i][coluna()] });
      return;
    } catch { /* cai na área de transferência */ }
  }
  try { await retro.transferencia.escrever(c); } catch { await navigator.clipboard.writeText(c).catch(() => { }); }
  painel.nome.textContent = tr('Copiado para a área de transferência: {nome}', { nome: dados.lista[i][coluna()] });
}

/**
 * O lugar do painel: embaixo de um campo de uma linha; ao lado de um campo grande (à direita ou à
 * esquerda, para não cobrir o texto) ou, sem espaço, no canto de baixo dele; sem campo, no canto da
 * tela. Nunca fora da área útil.
 */
function posicionar(el, alvo) {
  const r = alvo && alvo !== document.body && alvo.getBoundingClientRect ? alvo.getBoundingClientRect() : null;
  const t = areaUtil(r && r.width ? telaDoRet(r) : telaPrincipal());
  const w = el.offsetWidth;
  const a = el.offsetHeight;
  let x;
  let y;
  if (r && r.width && r.height < 80) { x = r.left; y = r.bottom + 2; if (y + a > t.bottom) y = r.top - a - 2; }
  else if (r && r.width) {
    y = r.top;
    if (r.right + 4 + w <= t.right) x = r.right + 4;
    else if (r.left - 4 - w >= t.left) x = r.left - 4 - w;
    else { x = r.right - w - 8; y = r.bottom - a - 8; }
  } else { x = t.right - w - 12; y = t.bottom - a - 12; }
  x = Math.max(t.left + 4, Math.min(x, t.right - w - 4));
  y = Math.max(t.top + 4, Math.min(y, t.bottom - a - 4));
  const base = document.getElementById('tela').getBoundingClientRect();
  el.style.left = Math.round(x - base.left) + 'px';
  el.style.top = Math.round(y - base.top) + 'px';
}

/** Abre o painel (o foco de agora é o alvo: o emoji vai para ele). */
export async function abrirEmojis() {
  if (painel) return fecharEmojis();
  // O campo com o foco agora (pela tecla) ou o último usado (pelo Iniciar, que tira o foco dele).
  const alvo = editavel(document.activeElement) ? document.activeElement : campoRecente() || document.activeElement;
  await carregar();
  const busca = h('input', { type: 'search', placeholder: tr('Procurar um emoji'), spellcheck: false, 'aria-label': tr('Procurar um emoji') });
  const abas = h('div.emo-abas', { role: 'tablist' });
  const titulo = h('div.emo-titulo');
  const grade = h('div.emo-grade', { role: 'listbox', 'aria-label': tr('Emojis') });
  const nome = h('div.emo-nome');
  const fechar = h('button.b-fechar', { title: tr('Fechar'), tabIndex: -1, on: { click: () => fecharEmojis() } });
  const el = h('div#painel-emojis.dialogo', { role: 'dialog', 'aria-label': tr('Emojis') },
    h('div.titulo', h('span.texto', tr('Emojis')), h('div.botoes', fechar)),
    h('div.emo-corpo', busca, abas, titulo, grade, nome));
  painel = { el, alvo, busca, abas, titulo, grade, nome, grupo: recentes().length ? 'recentes' : 0 };
  abas.append(...GRUPOS.map((g) => {
    const i = dados.porCaractere.get(g.icone);
    const b = h('button.emo-aba', { type: 'button', title: tr(g.nome), dataset: { grupo: String(g.id || g.g) } }, i != null ? desenho(i) : g.icone);
    b.addEventListener('mousedown', (ev) => ev.preventDefault());
    b.addEventListener('click', () => { painel.grupo = g.id || g.g; busca.value = ''; desenharGrade(); });
    return b;
  }));
  busca.addEventListener('input', desenharGrade);
  busca.addEventListener('keydown', (ev) => {
    // Enter põe o primeiro achado; a seta para baixo vai para a grade.
    if (ev.key === 'Enter') { ev.preventDefault(); const b = grade.querySelector('.emo'); if (b) b.click(); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); const b = grade.querySelector('.emo'); if (b) b.focus(); }
  });
  grade.addEventListener('keydown', (ev) => {
    const bs = [...grade.querySelectorAll('.emo')];
    const i = bs.indexOf(document.activeElement);
    if (i < 0) return;
    const por = Math.max(1, Math.round(grade.clientWidth / (bs[0].offsetWidth || 1)));
    const passo = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: por, ArrowUp: -por }[ev.key];
    if (passo) { ev.preventDefault(); const b = bs[Math.max(0, Math.min(bs.length - 1, i + passo))]; b.focus(); nome.textContent = b.getAttribute('aria-label'); }
  });
  painel.tecla = (ev) => { if (ev.key === 'Escape' && painel) { ev.preventDefault(); ev.stopPropagation(); const a = painel.alvo; fecharEmojis(); if (editavel(a)) a.focus(); } };
  painel.fora = (ev) => { if (painel && !el.contains(ev.target)) fecharEmojis(); };
  document.addEventListener('keydown', painel.tecla, true);
  document.addEventListener('pointerdown', painel.fora, true);
  // A barra de título arrasta o painel (o foco fica no campo do texto).
  el.querySelector('.titulo').addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0 || ev.target.closest('button')) return;
    ev.preventDefault();
    const x0 = ev.clientX - el.offsetLeft;
    const y0 = ev.clientY - el.offsetTop;
    const mover = (m) => { el.style.left = Math.round(m.clientX - x0) + 'px'; el.style.top = Math.max(0, Math.round(m.clientY - y0)) + 'px'; };
    const soltar = () => { document.removeEventListener('pointermove', mover); document.removeEventListener('pointerup', soltar); };
    document.addEventListener('pointermove', mover);
    document.addEventListener('pointerup', soltar);
  });
  document.getElementById('tela').append(el);
  desenharGrade();
  posicionar(el, alvo);
  busca.focus();
}

export function fecharEmojis() {
  if (!painel) return;
  document.removeEventListener('keydown', painel.tecla, true);
  document.removeEventListener('pointerdown', painel.fora, true);
  painel.el.remove();
  painel = null;
}

registrarApp('emojis', { nome: 'Emojis', icone: 'emoji', abrir: () => { abrirEmojis().catch(() => { }); return null; } });
