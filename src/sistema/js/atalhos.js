/*
 * Os atalhos do Windows: o Alt+Tab (a caixa com os ícones das janelas, como na época), o Alt+F4
 * e a tecla do logotipo com uma letra, um número ou uma seta. As teclas chegam do processo
 * principal (retro.sistema.aoTecla), que as vê em qualquer janela, inclusive dentro dos
 * programas e do Navegador; no modo sistema, também com um programa do Linux na frente.
 */
import { h, img } from './util.js';
import { lista, recentes, janelaAtiva, opcoes, mostrarAreaDeTrabalho, minimizarTodas, daAreaAtual, areaAtual, irParaArea, novaArea, fecharArea } from './janelas.js';
import { estado, abrir } from './sistema.js';
import { janelasNativas, retroAtivo, minimizarNativas } from './janelas-nativas.js';
import { iconeNativoJa } from './nativos.js';
import { estaBloqueado } from './bloqueio.js';
import { tr } from './idioma.js';

/* ---------- O alternador de janelas (Alt+Tab) ---------- */

let alt = null; // { itens, i, el, icones, titulo }

/** As janelas na ordem do uso: a da frente primeiro; as do Linux depois das do Retro Computer. Só as da área de trabalho de agora, como no Windows. */
function janelasParaAlternar() {
  const nativas = janelasNativas();
  const doRetro = [...recentes].reverse().filter((j) => !j.fechada && !j.dialogo && daAreaAtual(j));
  // As que nunca foram usadas (raro) entram no fim, na ordem de abertura.
  for (const j of lista) if (!j.dialogo && daAreaAtual(j) && !doRetro.includes(j)) doRetro.push(j);
  const ativaNativa = nativas.find((n) => n.ativa);
  if (ativaNativa) return [ativaNativa, ...doRetro, ...nativas.filter((n) => n !== ativaNativa)];
  return [...doRetro, ...nativas];
}

function iconeDe(j) {
  // Os programas do Linux com o ícone deles (o mesmo da barra de tarefas), quando se sabe qual é.
  const url = j.nativa && j.programa ? iconeNativoJa(j.programa.slice('nativo:'.length)) : null;
  if (url) return h('img.de-fora', { src: url, width: 32, height: 32, alt: '' });
  return img(j.icone || 'programa', 32);
}

function desenharAlternador() {
  alt.icones.replaceChildren(...alt.itens.map((j, k) => {
    const el = h('div.alt-icone' + (k === alt.i ? '.sel' : ''), { title: j.titulo }, iconeDe(j));
    el.addEventListener('mousedown', (e) => { e.preventDefault(); alt.i = k; terminarAlternador(true); });
    return el;
  }));
  alt.titulo.textContent = (alt.itens[alt.i] || {}).titulo || '';
}

function abrirAlternador(passo) {
  if (alt) {
    alt.i = (alt.i + passo + alt.itens.length) % alt.itens.length;
    desenharAlternador();
    return;
  }
  const itens = janelasParaAlternar();
  if (!itens.length) return;
  const icones = h('div.alt-icones');
  const titulo = h('div.alt-titulo');
  const el = h('div.alternador', { role: 'listbox', 'aria-label': tr('Janelas abertas') }, icones, titulo);
  alt = { itens, i: itens.length > 1 ? (passo > 0 ? 1 : itens.length - 1) : 0, el, icones, titulo };
  desenharAlternador();
  document.body.append(el);
  // Se o soltar do Alt se perder (a tecla foi solta antes de o Retro Computer vir para a
  // frente), Enter escolhe e Esc desiste; o clique num ícone também escolhe.
  document.addEventListener('keydown', teclaNoAlternador, true);
}

function teclaNoAlternador(e) {
  if (!alt) return;
  if (e.key === 'Enter') { e.preventDefault(); terminarAlternador(true); }
  else if (e.key === 'Escape') { e.preventDefault(); terminarAlternador(false); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); abrirAlternador(e.key === 'ArrowRight' ? 1 : -1); }
}

function terminarAlternador(escolher) {
  if (!alt) return;
  const j = escolher ? alt.itens[alt.i] : null;
  alt.el.remove();
  alt = null;
  document.removeEventListener('keydown', teclaNoAlternador, true);
  if (j) j.focar();
}

/* ---------- As outras teclas ---------- */

/** A janela do Linux que está na frente (modo sistema), se for uma. */
const nativaNaFrente = () => (retroAtivo() ? null : janelasNativas().find((n) => n.ativa) || null);

function fecharJanela() {
  const n = nativaNaFrente();
  if (n) return n.fechar();
  const j = janelaAtiva();
  // Sem nenhuma janela na frente, o Alt+F4 abre o Desligar (como no Windows).
  if (j && !j.fechada && !j.minimizada) return j.fechar();
  return abrir('desligar');
}

function encaixar(seta) {
  const n = nativaNaFrente();
  if (n) return retro.janelasLinux.encaixar(n.id, seta);
  const j = janelaAtiva();
  if (j && !j.fechada && !j.minimizada) j.encaixarPorSeta(seta);
  return null;
}

/** Logotipo+número: o programa fixado nessa posição (abre, ou traz a janela dele, ou minimiza). */
async function fixado(n) {
  const { programaDe } = await import('./barra.js');
  const chave = ((estado.config.barra || {}).fixados || [])[n - 1];
  const p = chave && programaDe(chave);
  if (!p) return;
  const dele = [...recentes].reverse().filter((j) => j.programa === chave && !j.fechada);
  if (!dele.length) return p.abrir();
  const ativa = janelaAtiva();
  if (dele[0] === ativa && !ativa.minimizada) return dele.length > 1 ? dele[1].focar() : ativa.minimizar();
  return dele[0].focar();
}

function focarBusca() {
  const campo = document.querySelector('#busca-barra input');
  if (campo && campo.offsetParent) { campo.focus(); campo.select(); return; }
  abrir('localizar');
}

const ACOES = {
  'fechar-janela': fecharJanela,
  alternar: () => abrirAlternador(1),
  'alternar-volta': () => abrirAlternador(-1),
  'alternar-fim': () => terminarAlternador(true),
  'alternar-cancelar': () => terminarAlternador(false),
  explorador: () => abrir('explorador'),
  executar: () => abrir('executar'),
  painel: () => abrir('painel'),
  busca: focarBusca,
  'area-de-trabalho': () => { if (mostrarAreaDeTrabalho() === 'escondeu') minimizarNativas(); },
  'minimizar-tudo': () => { minimizarTodas(); minimizarNativas(); },
  'area-transferencia': () => import('./apps/transferencia.js').then((m) => m.abrirHistorico()),
  // A lupa da Acessibilidade.
  'lupa+': () => import('./acessibilidade.js').then((m) => m.mudarLupa(1)),
  'lupa-': () => import('./acessibilidade.js').then((m) => m.mudarLupa(-1)),
  'lupa-sair': () => import('./acessibilidade.js').then((m) => { if (m.nivelLupa() > 1) m.mudarLupa(0); }),
  // As áreas de trabalho e a Visão das tarefas (areas.js).
  'visao-tarefas': () => import('./areas.js').then((m) => m.alternarVisao()),
  'area:nova': () => novaArea(),
  'area:esquerda': () => irParaArea(areaAtual() - 1),
  'area:direita': () => irParaArea(areaAtual() + 1),
  'area:fechar': () => fecharArea(),
  emojis: () => import('./emojis.js').then((m) => m.abrirEmojis()).catch(() => { }),
};

retro.sistema.aoTecla((acao) => {
  // Com a tela bloqueada, nada se mexe por trás dela.
  if (estaBloqueado()) return;
  if (ACOES[acao]) return ACOES[acao]();
  if (acao.startsWith('encaixe:')) return encaixar(acao.slice(8));
  if (acao.startsWith('fixado:')) return fixado(Number(acao.slice(7)));
  return null;
});

/* ---------- Os cantos magnéticos seguem a configuração ---------- */

// Lido na hora de cada arrasto (a configuração carrega depois deste módulo).
Object.defineProperty(opcoes, 'encaixe', {
  get: () => !estado.config || !estado.config.janelas || estado.config.janelas.encaixe !== false,
  configurable: true,
});

export { abrirAlternador, terminarAlternador, janelasParaAlternar };
