/*
 * O Mapa de caracteres: os acentos, os símbolos e as letras de outros alfabetos, em grupos.
 * Segurar o botão sobre um caractere o mostra ampliado; dois cliques (ou Enter) o juntam à
 * caixa "Caracteres a copiar", e Copiar leva o texto à área de transferência. A barra de
 * status mostra o código Unicode do caractere escolhido.
 */
import { h, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { ajustarAoConteudo } from '../dialogos.js';
import { tr, marcar } from '../idioma.js';

// Os de uso mais comum nos textos (os jurídicos, as aspas tipográficas, as frações, a moeda).
const MAIS_USADOS = '§¶ºª°©®™–—“”‘’«»…•·½¼¾€£¥¢$±×÷≠≈≤≥∞√¹²³†‡¿¡→←↑↓✓✗♪★';

const GRUPOS = [
  { rotulo: marcar('Mais usados'), texto: MAIS_USADOS },
  { rotulo: marcar('Letras com acento'), faixas: [[0xC0, 0x24F]] },
  { rotulo: marcar('Pontuação'), faixas: [[0x21, 0x2F], [0x3A, 0x40], [0x5B, 0x60], [0x7B, 0x7E], [0xA1, 0xBF], [0x2010, 0x205E]] },
  { rotulo: marcar('Moedas'), texto: '$¢£¤¥', faixas: [[0x20A0, 0x20C0]] },
  { rotulo: marcar('Matemática'), texto: '+<=>|~±×÷¬µ', faixas: [[0x2200, 0x22FF]] },
  { rotulo: marcar('Números e frações'), faixas: [[0x2070, 0x209F], [0x2150, 0x218B], [0x2460, 0x24FF]] },
  { rotulo: marcar('Setas'), faixas: [[0x2190, 0x21FF]] },
  { rotulo: marcar('Formas e desenhos de caixas'), faixas: [[0x2500, 0x25FF]] },
  { rotulo: marcar('Símbolos diversos'), faixas: [[0x2100, 0x214F], [0x2600, 0x2638], [0x263A, 0x266F], [0x2713, 0x2718]] },
  { rotulo: marcar('Grego'), faixas: [[0x391, 0x3A9], [0x3B1, 0x3C9]] },
  { rotulo: marcar('Cirílico'), faixas: [[0x400, 0x45F]] },
  { rotulo: marcar('Latim básico'), faixas: [[0x21, 0x7E]] },
];

const FONTES = [
  ['Katica', 'Katica'],
  ['Csilla', 'Csilla'],
  [marcar('Sem serifa'), 'sans-serif'],
  [marcar('Com serifa'), 'serif'],
  [marcar('Monoespaçada'), 'monospace'],
];

const COLUNAS = 20;
// Só o que se escreve (letras, marcas, números, pontuação e símbolos): sem os códigos vagos e de controle.
const VISIVEL = /^[\p{L}\p{M}\p{N}\p{P}\p{S}]$/u;

/** Os caracteres de um grupo, sem repetir e na ordem. */
export function caracteresDo(grupo) {
  const r = [...(grupo.texto || '')];
  for (const [de, ate] of grupo.faixas || []) {
    for (let c = de; c <= ate; c++) r.push(String.fromCodePoint(c));
  }
  return [...new Set(r)].filter((c) => VISIVEL.test(c));
}

/** U+00E9 */
export const codigoDe = (c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');

let aberta = null;

function abrirMapa() {
  if (aberta) return aberta.focar();
  let grupo = 0;
  let lista = [];
  let sel = 0;
  const selGrupo = h('select', ...GRUPOS.map((g, i) => h('option', { value: i }, tr(g.rotulo))));
  const selFonte = h('select', ...FONTES.map(([r, f]) => h('option', { value: f }, tr(r))));
  const grade = h('div.cm-grade', { tabIndex: 0, style: { gridTemplateColumns: `repeat(${COLUNAS}, 22px)` } });
  const lupa = h('div.cm-lupa', { hidden: true });
  const area = h('div.cm-area.afundado', grade, lupa);
  const copiar = h('input', { type: 'text', spellcheck: false, style: { flex: '1', minWidth: '0' } });

  const j = new Janela({
    id: 'caracteres', titulo: tr('Mapa de caracteres'), icone: 'caracteres', largura: 500, altura: 360,
    redimensionavel: false, maximizavel: false, classe: 'caracteres',
    status: [{ texto: '', largura: 110, fixo: true }, ''],
  });
  aberta = j;
  j.ev.on('fechada', () => { aberta = null; });

  const fonte = () => selFonte.value;
  const mostrarStatus = () => {
    const c = lista[sel];
    j.definirStatus(c ? [{ texto: codigoDe(c), largura: 110, fixo: true }, tr('Dois cliques ou Enter juntam o caractere à caixa de baixo.')] : ['', '']);
  };
  const marcarSel = (rolar) => {
    for (const el of grade.querySelectorAll('.sel')) el.classList.remove('sel');
    const el = grade.children[sel];
    if (!el) return;
    el.classList.add('sel');
    if (rolar) el.scrollIntoView({ block: 'nearest' });
    mostrarStatus();
  };
  const desenhar = () => {
    lista = caracteresDo(GRUPOS[grupo]);
    sel = Math.min(sel, lista.length - 1);
    // As famílias genéricas (sans-serif, serif, monospace) vão sem aspas; as do Retro, com.
    const f = fonte();
    grade.style.fontFamily = (/^(sans-serif|serif|monospace)$/.test(f) ? f : `'${f}'`) + ', sans-serif';
    lupa.style.fontFamily = grade.style.fontFamily;
    grade.replaceChildren(...lista.map((c, i) => h('div.cm-c', { dataset: { i } }, c)));
    grade.scrollTop = 0;
    marcarSel(false);
  };
  const juntar = () => {
    const c = lista[sel];
    if (!c) return;
    const ini = copiar.selectionStart ?? copiar.value.length;
    const fim = copiar.selectionEnd ?? copiar.value.length;
    copiar.value = copiar.value.slice(0, ini) + c + copiar.value.slice(fim);
    copiar.selectionStart = copiar.selectionEnd = ini + c.length;
  };
  const levar = async () => {
    const texto = copiar.value;
    if (!texto) return;
    try { await retro.transferencia.escrever(texto); } catch { await navigator.clipboard.writeText(texto).catch(() => { }); }
    j.definirStatus([{ texto: '', largura: 110, fixo: true }, tr('Copiado para a área de transferência.')]);
  };
  // A lupa: o caractere ampliado sobre a casa, enquanto o botão fica apertado.
  const mostrarLupa = (el) => {
    lupa.textContent = lista[sel];
    lupa.hidden = false;
    const r = el.getBoundingClientRect();
    const a = area.getBoundingClientRect();
    lupa.style.left = Math.max(0, Math.min(a.width - 48, r.left - a.left - 13)) + 'px';
    lupa.style.top = Math.max(0, Math.min(a.height - 48, r.top - a.top - 13)) + 'px';
  };
  grade.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.cm-c');
    if (!el || e.button !== 0) return;
    e.preventDefault();
    grade.focus();
    sel = Number(el.dataset.i);
    marcarSel(false);
    mostrarLupa(el);
    grade.setPointerCapture(e.pointerId);
  });
  grade.addEventListener('pointermove', (e) => {
    if (lupa.hidden) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.cm-c');
    if (!el || !grade.contains(el) || Number(el.dataset.i) === sel) return;
    sel = Number(el.dataset.i);
    marcarSel(false);
    mostrarLupa(el);
  });
  const soltar = () => { lupa.hidden = true; };
  grade.addEventListener('pointerup', soltar);
  grade.addEventListener('pointercancel', soltar);
  // Com o ponteiro preso à grade (pela lupa), o clique duplo chega a ela: vale o caractere escolhido.
  grade.addEventListener('dblclick', () => juntar());
  grade.addEventListener('keydown', (e) => {
    const passo = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -COLUNAS, ArrowDown: COLUNAS, PageUp: -COLUNAS * 6, PageDown: COLUNAS * 6 }[e.key];
    if (passo) sel = Math.max(0, Math.min(lista.length - 1, sel + passo));
    else if (e.key === 'Home') sel = 0;
    else if (e.key === 'End') sel = lista.length - 1;
    else if (e.key === 'Enter' || e.key === ' ') juntar();
    else return;
    e.preventDefault();
    e.stopPropagation();
    marcarSel(true);
  });
  selGrupo.addEventListener('change', () => { grupo = Number(selGrupo.value); sel = 0; desenhar(); grade.focus(); });
  selFonte.addEventListener('change', () => { desenhar(); grade.focus(); });
  copiar.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); levar(); } });

  j.corpo.style.padding = '8px';
  j.corpo.append(
    h('div.cm-linha',
      h('label', h('span', rotulo(tr('&Fonte:'))), h('div.select-caixa', selFonte)),
      h('label', h('span', rotulo(tr('&Grupo:'))), h('div.select-caixa', { style: { flex: '1' } }, selGrupo))),
    area,
    h('div.cm-linha',
      h('label', { style: { flex: '1' } }, h('span', rotulo(tr('&Caracteres a copiar:'))), copiar),
      h('button', { type: 'button', on: { click: () => { juntar(); grade.focus(); } } }, rotulo(tr('&Selecionar'))),
      h('button.padrao', { type: 'button', on: { click: levar } }, rotulo(tr('C&opiar')))));
  // As letras sublinhadas (as de cada idioma): Alt + a letra leva ao campo ou aperta o botão.
  const letra = (texto) => (/&(.)/.exec(texto) || [])[1]?.toLowerCase();
  const teclas = new Map([
    [letra(tr('&Fonte:')), () => selFonte.focus()],
    [letra(tr('&Grupo:')), () => selGrupo.focus()],
    [letra(tr('&Caracteres a copiar:')), () => copiar.focus()],
    [letra(tr('&Selecionar')), juntar],
    [letra(tr('C&opiar')), levar],
  ]);
  j.el.addEventListener('keydown', (e) => {
    const f = e.altKey && !e.ctrlKey && teclas.get(e.key.toLowerCase());
    if (f) { e.preventDefault(); f(); }
  });
  desenhar();
  ajustarAoConteudo(j, { largura: 500 });
  grade.focus();
  return j;
}

registrarApp('caracteres', { nome: 'Mapa de caracteres', icone: 'caracteres', abrir: abrirMapa });
export { GRUPOS };
