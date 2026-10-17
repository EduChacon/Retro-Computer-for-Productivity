/*
 * As notas autoadesivas: papeizinhos na área de trabalho, entre os ícones e as janelas. Cada nota é
 * um .txt comum do disco C: (Meus documentos › Notas autoadesivas), que o Bloco de notas também abre;
 * a posição, o tamanho e a cor ficam nas configurações. Escrever grava sozinho (a primeira gravação
 * de cada vez guarda a versão anterior); excluir manda o arquivo para a Lixeira.
 */
import { h, nomeDe, semExtensao, juntar, caminhoTela } from './util.js';
import { estado, pastaDocs, definirConfig, abrirArquivo, abrir, registrarApp } from './sistema.js';
import { abrirMenu } from './menus.js';
import { confirmar, erro } from './dialogos.js';
import { tr, marcar } from './idioma.js';
import { temaMac } from './tema.js';

export const CORES = [
  { id: 'amarela', rotulo: marcar('&Amarela') },
  { id: 'verde', rotulo: marcar('&Verde') },
  { id: 'azul', rotulo: marcar('A&zul') },
  { id: 'rosa', rotulo: marcar('&Rosa') },
  { id: 'lilas', rotulo: marcar('&Lilás') },
  { id: 'branca', rotulo: marcar('&Branca') },
];
const MAX_NOTAS = 40;
const MAX_BYTES = 64 * 1024;
const ESPERA = 700; // depois da última tecla, grava
const VERSAO_A_CADA = 10 * 60 * 1000; // a versão anterior, no máximo uma a cada 10 minutos por nota

let camada = null;
const notas = new Map(); // rel → { el, texto, rel, timer, salvoEm, versaoEm, lido }

/** A pasta das notas (o nome fica guardado: trocar de idioma não cria outra). */
export function pastaNotas() {
  const nome = (estado.config.pastas && estado.config.pastas.notas) || tr('Notas autoadesivas');
  return `${pastaDocs()}/${nome}`;
}

const posicoes = () => (estado.config.notas && estado.config.notas.pos) || {};

/** A posição dentro da área visível (a tela pode ter mudado de tamanho desde a última vez). */
function noLugar(p) {
  const r = camada.getBoundingClientRect();
  const w = Math.max(140, Math.min(600, Number(p.w) || 200));
  const a = Math.max(100, Math.min(600, Number(p.h) || 170));
  const x = Math.max(0, Math.min(Math.round(Number(p.x) || 0), Math.max(0, r.width - w)));
  const y = Math.max(0, Math.min(Math.round(Number(p.y) || 0), Math.max(0, r.height - a)));
  return { x, y, w, h: a, cor: CORES.some((c) => c.id === p.cor) ? p.cor : 'amarela' };
}

function guardarPosicao(n) {
  const el = n.el;
  const p = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, cor: el.dataset.cor };
  definirConfig({ notas: { pos: { [nomeDe(n.rel)]: p } } }).catch(() => { });
}

function gravarJa(n) {
  clearTimeout(n.timer);
  n.timer = null;
  const agora = Date.now();
  const versao = !n.versaoEm || agora - n.versaoEm > VERSAO_A_CADA;
  if (versao) n.versaoEm = agora;
  const texto = n.texto.value;
  n.lido = texto;
  return retro.disco.gravar(n.rel, new TextEncoder().encode(texto), { versao })
    .then((info) => { n.salvoEm = info && info.modificado; })
    .catch((e) => erro(tr('Não foi possível gravar a nota: {erro}', { erro: e.message || String(e) })));
}

function arrastar(n, e, modo) {
  if (e.button !== 0) return;
  e.preventDefault();
  frente(n);
  const el = n.el;
  const r = camada.getBoundingClientRect();
  const ini = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  const mover = (ev) => {
    const dx = ev.clientX - ini.x;
    const dy = ev.clientY - ini.y;
    if (modo === 'mover') {
      el.style.left = Math.max(0, Math.min(r.width - 40, ini.l + dx)) + 'px';
      el.style.top = Math.max(0, Math.min(r.height - 20, ini.t + dy)) + 'px';
    } else {
      el.style.width = Math.max(140, Math.min(600, ini.w + dx)) + 'px';
      el.style.height = Math.max(100, Math.min(600, ini.h + dy)) + 'px';
    }
  };
  const soltar = () => {
    document.removeEventListener('pointermove', mover);
    document.removeEventListener('pointerup', soltar);
    guardarPosicao(n);
  };
  document.addEventListener('pointermove', mover);
  document.addEventListener('pointerup', soltar);
}

/** A nota por cima das outras (a ordem não é guardada: é só a da vez). */
function frente(n) {
  if (camada.lastElementChild !== n.el) camada.append(n.el);
}

function menuDaNota(n, x, y) {
  abrirMenu([
    { rotulo: tr('&Nova nota'), atalho: 'Ctrl+N', acao: () => novaNota({ perto: n }) },
    { separador: true },
    ...CORES.map((c) => ({ rotulo: tr(c.rotulo), radio: true, marcado: n.el.dataset.cor === c.id, acao: () => { n.el.dataset.cor = c.id; guardarPosicao(n); } })),
    { separador: true },
    { rotulo: tr('Abrir no Bl&oco de notas'), acao: async () => { await gravarJa(n); abrirArquivo(n.rel, { com: 'bloco' }); } },
    { rotulo: tr('Mostrar a &pasta das notas'), acao: () => abrir('explorador', { pasta: pastaNotas(), selecionar: n.rel }) },
    { separador: true },
    { rotulo: tr('E&xcluir a nota'), acao: () => excluirNota(n) },
  ], { x, y });
}

function montarNota(rel, texto) {
  const p = noLugar(posicoes()[nomeDe(rel)] || {});
  const area = h('textarea.nota-texto', { spellcheck: false, maxLength: MAX_BYTES / 2, 'aria-label': semExtensao(nomeDe(rel)) });
  area.value = texto;
  const n = { rel, texto: area, lido: texto, timer: null, salvoEm: null, versaoEm: 0, el: null };
  const topo = h('div.nota-topo',
    h('button.nota-mais', { type: 'button', title: tr('Nova nota (Ctrl+N)'), on: { click: () => novaNota({ perto: n }) } }, '+'),
    h('div.nota-arrasto'),
    h('button.nota-menu', { type: 'button', title: tr('Cor e opções'), on: { click: (e) => { const r = e.currentTarget.getBoundingClientRect(); menuDaNota(n, r.left, r.bottom); } } }, '…'),
    h('button.nota-fechar', { type: 'button', title: tr('Excluir a nota'), on: { click: () => excluirNota(n) } }, '×'));
  const canto = h('div.nota-canto');
  n.el = h('div.nota', { dataset: { cor: p.cor }, style: { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' } }, topo, area, canto);
  topo.addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) arrastar(n, e, 'mover'); });
  canto.addEventListener('pointerdown', (e) => arrastar(n, e, 'tamanho'));
  n.el.addEventListener('pointerdown', () => frente(n));
  n.el.addEventListener('contextmenu', (e) => { if (e.target === area) return; e.preventDefault(); e.stopPropagation(); menuDaNota(n, e.clientX, e.clientY); });
  area.addEventListener('input', () => { clearTimeout(n.timer); n.timer = setTimeout(() => gravarJa(n), ESPERA); });
  area.addEventListener('blur', () => { if (n.timer) gravarJa(n); });
  area.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); e.stopPropagation(); novaNota({ perto: n }); }
    // O Esc devolve as notas para trás das janelas (quando vieram para a frente).
    if (e.key === 'Escape') { area.blur(); voltarParaTras(); }
  });
  notas.set(rel, n);
  camada.append(n.el);
  return n;
}

/** Lê a pasta das notas e acerta a tela: as novas aparecem, as apagadas somem, as mudadas por fora mudam. */
export async function lerNotas() {
  if (!camada) return;
  const pasta = pastaNotas();
  const itens = await retro.disco.listar(pasta).catch(() => []);
  const txt = itens.filter((i) => !i.pasta && /\.txt$/i.test(i.nome) && i.tamanho <= MAX_BYTES).sort((a, b) => a.nome.localeCompare(b.nome)).slice(0, MAX_NOTAS);
  const vistos = new Set();
  for (const i of txt) {
    vistos.add(i.rel);
    const n = notas.get(i.rel);
    if (n && (n.timer || document.activeElement === n.texto || i.modificado === n.salvoEm)) continue;
    const texto = await retro.disco.lerTexto(i.rel).catch(() => null);
    if (texto == null) continue;
    if (n) { if (texto !== n.lido) { n.texto.value = texto; n.lido = texto; } n.salvoEm = i.modificado; } else montarNota(i.rel, texto).salvoEm = i.modificado;
  }
  for (const [rel, n] of notas) {
    if (vistos.has(rel)) continue;
    clearTimeout(n.timer);
    n.el.remove();
    notas.delete(rel);
  }
}

/** Uma nota nova (perto de outra, ou no alto à direita da área de trabalho), já com o cursor nela. */
export async function novaNota({ perto = null, texto = '' } = {}) {
  if (!camada) return null;
  if (notas.size >= MAX_NOTAS) { erro(tr('Já há {n} notas na área de trabalho. Exclua algumas antes de criar outra.', { n: MAX_NOTAS })); return null; }
  try {
    const pasta = pastaNotas();
    if (!(estado.config.pastas && estado.config.pastas.notas)) await definirConfig({ pastas: { notas: nomeDe(pasta) } });
    const nome = await retro.disco.nomeLivre(pasta, `${tr('Nota')}.txt`);
    const rel = juntar(pasta, nome);
    const r = camada.getBoundingClientRect();
    // A primeira fica no alto, do lado oposto ao dos ícones (no tema Mac, eles ficam à direita).
    const passo = (notas.size % 6) * 24;
    const base = perto ? { x: perto.el.offsetLeft + 24, y: perto.el.offsetTop + 24 } : { x: temaMac() ? 96 + passo : r.width - 240 - passo, y: 16 + passo };
    await definirConfig({ notas: { pos: { [nome]: { ...base, w: 200, h: 170, cor: perto ? perto.el.dataset.cor : 'amarela' } } } });
    const info = await retro.disco.gravar(rel, new TextEncoder().encode(texto), { versao: false });
    const n = notas.get(rel) || montarNota(rel, texto);
    n.salvoEm = info && info.modificado;
    frente(n);
    n.texto.focus();
    return n;
  } catch (e) {
    erro(tr('Não foi possível criar a nota: {erro}', { erro: e.message || String(e) }));
    return null;
  }
}

async function excluirNota(n) {
  const vazia = !n.texto.value.trim();
  if (!vazia && !await confirmar(tr('Excluir esta nota? Ela vai para a Lixeira, de onde pode ser restaurada.'), { titulo: tr('Excluir a nota') })) return;
  clearTimeout(n.timer);
  n.timer = null;
  try {
    // O que foi escrito vai junto (a gravação pendente primeiro).
    if (!vazia && n.texto.value !== n.lido) await gravarJa(n);
    await retro.disco.paraLixeira(n.rel);
  } catch (e) {
    erro(tr('Não foi possível excluir a nota: {erro}', { erro: e.message || String(e) }));
    return;
  }
  n.el.remove();
  notas.delete(n.rel);
  definirConfig({ notas: { pos: { [nomeDe(n.rel)]: null } } }).catch(() => { });
}

/* ---------- Na frente das janelas (pelo Iniciar) ---------- */

let naFrente = false;
const aoClicarFora = (e) => { if (!e.target.closest('.nota, .menu, #camada-menus')) voltarParaTras(); };

function trazerParaFrente() {
  if (naFrente) return;
  naFrente = true;
  // As janelas sobem pelo z-index (janelas.js); a classe põe a camada acima delas e abaixo da barra e dos menus.
  camada.classList.add('na-frente');
  setTimeout(() => document.addEventListener('pointerdown', aoClicarFora, true), 0);
}

function voltarParaTras() {
  if (!naFrente) return;
  naFrente = false;
  document.removeEventListener('pointerdown', aoClicarFora, true);
  camada.classList.remove('na-frente');
}

/** Iniciar › Notas autoadesivas: as notas vêm para a frente das janelas; sem nenhuma, uma nova. */
export async function abrirNotas() {
  await lerNotas();
  trazerParaFrente();
  if (!notas.size) return novaNota();
  const ultima = [...camada.querySelectorAll('.nota')].pop();
  const n = [...notas.values()].find((x) => x.el === ultima);
  if (n) n.texto.focus();
  return n;
}

/** Monta a camada e lê as notas (depois da abertura) e acompanha a pasta delas. */
export function iniciarNotas() {
  camada = h('div#notas');
  document.getElementById('mesa').after(camada);
  setTimeout(() => lerNotas().catch(() => { }), 1500);
  retro.disco.aoMudar((pastas) => { if (pastas.includes(pastaNotas())) lerNotas().catch(() => { }); });
  // Antes de fechar o Retro Computer, o que ainda não foi gravado.
  window.addEventListener('beforeunload', () => { for (const n of notas.values()) if (n.timer) gravarJa(n); });
}

export const caminhoDasNotas = () => caminhoTela(pastaNotas());

registrarApp('notas', { nome: 'Notas autoadesivas', icone: 'notas', abrir: () => abrirNotas() });
