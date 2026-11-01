/* Os oito companheiros escolhidos: cada folha tem quatro colunas, duas linhas e oito expressões. */
import { h, limitar } from './util.js';
import { tr, marcar } from './idioma.js';
import { estado, eventos, abrir, definirConfig } from './sistema.js';
import { abrirMenu } from './menus.js';

export const MASCOTES = [
  { id: 'monitorzinho', nome: marcar('Monitorzinho'), descricao: marcar('Clássico e expressivo') },
  { id: 'disquetinho', nome: marcar('Disquetinho'), descricao: marcar('Compacto e discreto') },
  { id: 'robo', nome: marcar('Robô de Bolso'), descricao: marcar('Companheiro de trabalho') },
  { id: 'pastinha', nome: marcar('Pastinha'), descricao: marcar('Organizada e acolhedora') },
  { id: 'ratinho', nome: marcar('Ratinho'), descricao: marcar('Curioso e companheiro') },
  { id: 'gato', nome: marcar('Gato do Terminal'), descricao: marcar('Esperto e tranquilo') },
  { id: 'cafezinho', nome: marcar('Cafezinho'), descricao: marcar('Clássico e acolhedor') },
  { id: 'esmalte', nome: marcar('Caneca de Esmalte'), descricao: marcar('Retrô e resistente') },
];
export const ESTADOS = {
  pronto: marcar('Pronto para ajudar'), pensando: marcar('Pensando…'), trabalhando: marcar('Trabalhando…'),
  falando: marcar('Respondendo…'), aguardando: marcar('Preciso da sua resposta'), concluido: marcar('Tarefa concluída'),
  erro: marcar('Confira a conversa'), dormindo: marcar('Descansando'),
};
const QUADROS = {
  pronto: [[0, 3500], [1, 140], [0, 2600], [1, 140]],
  pensando: [[2, 650], [0, 180], [3, 650], [0, 180]],
  trabalhando: [[2, 480], [3, 480]], falando: [[0, 420], [5, 300], [0, 520]],
  aguardando: [[4, 1800], [0, 200]], concluido: [[5, 380], [0, 180], [5, 380], [0, 900]],
  erro: [[7, 2200], [0, 180]], dormindo: [[6, 4500], [1, 180]],
};
const figuras = new Map();
let relogio = null;
const preferencia = () => estado.config?.assistente || {};
const menosMovimento = matchMedia('(prefers-reduced-motion: reduce)');

export function nomeMascote(id) { return tr((MASCOTES.find((m) => m.id === id) || MASCOTES[0]).nome); }

export function figuraMascote(id = 'monitorzinho', situacao = 'pronto') {
  const el = h('span.mascote-figura', { 'aria-hidden': 'true' });
  mudarFigura(el, id, situacao);
  if (!relogio) relogio = setInterval(animar, 100);
  return el;
}
export function mudarFigura(el, id, situacao = 'pronto') {
  const seguro = MASCOTES.some((m) => m.id === id) ? id : 'monitorzinho';
  const anterior = figuras.get(el);
  const inicio = anterior?.situacao === situacao ? anterior.inicio : performance.now();
  figuras.set(el, { id: seguro, situacao: QUADROS[situacao] ? situacao : 'pronto', inicio });
  if (el.dataset.mascote !== seguro) { el.style.backgroundImage = `url("sistema://retro/mascotes/${seguro}.png")`; el.dataset.mascote = seguro; }
  el.dataset.estado = situacao;
  desenhar(el, figuras.get(el));
}
function desenhar(el, f) {
  const parado = menosMovimento.matches || preferencia().animacoes === false;
  const quadros = QUADROS[f.situacao];
  let tempo = (performance.now() - f.inicio) % quadros.reduce((s, q) => s + q[1], 0);
  let quadro = quadros[0][0];
  if (!parado) for (const [n, duracao] of quadros) { quadro = n; if (tempo < duracao) break; tempo -= duracao; }
  if (el.dataset.quadro !== String(quadro)) {
    el.style.backgroundPosition = `${(quadro % 4) * 100 / 3}% ${quadro >= 4 ? 100 : 0}%`;
    el.dataset.quadro = String(quadro);
  }
  el.classList.toggle('sem-animacao', parado);
}
function animar() {
  if (document.hidden) return;
  for (const [el, f] of figuras) {
    if (!el.isConnected) { figuras.delete(el); continue; }
    desenhar(el, f);
  }
  if (companhia) {
    const agora = performance.now();
    const situacao = estadoChat === 'concluido' && agora - mudouEm > 4500 ? 'pronto' : estadoChat;
    const final = situacao === 'pronto' && agora - interagiuEm > 90000 ? 'dormindo' : situacao;
    if (companhia.dataset.estado !== final) {
      companhia.dataset.estado = final;
      mudarFigura(desenho, preferencia().mascote, final);
    }
  }
}

let companhia = null, desenho = null, balao = null;
let estadoChat = 'pronto', mudouEm = 0, interagiuEm = performance.now();
let arrastou = false;
function atualizar() {
  if (!companhia) return;
  const cfg = preferencia();
  companhia.hidden = cfg.visivel === false;
  companhia.dataset.tamanho = ['pequeno', 'grande'].includes(cfg.tamanho) ? cfg.tamanho : 'normal';
  mudarFigura(desenho, cfg.mascote, estadoChat);
  companhia.title = nomeMascote(cfg.mascote) + ' · ' + tr(ESTADOS[estadoChat] || ESTADOS.pronto);
  const b = companhia.getBoundingClientRect();
  const tela = document.getElementById('janelas').getBoundingClientRect();
  const px = Number(cfg.posicao?.x), py = Number(cfg.posicao?.y);
  const x = Number.isFinite(px) ? px * tela.width : tela.width - b.width - 18;
  const y = Number.isFinite(py) ? py * tela.height : tela.height - b.height - 12;
  companhia.style.left = limitar(x, 0, Math.max(0, tela.width - b.width)) + 'px';
  companhia.style.top = limitar(y, 0, Math.max(0, tela.height - b.height)) + 'px';
}
export function iniciarMascote() {
  if (companhia) return;
  desenho = figuraMascote(preferencia().mascote);
  const botao = h('button.mascote-botao', { 'aria-label': tr('Conversar com o assistente'), on: { click: () => {
    if (arrastou) { arrastou = false; return; } interagiuEm = performance.now(); abrir('assistente');
  } } }, desenho);
  balao = h('button.mascote-balao', { hidden: true, on: { click: () => abrir('assistente') } });
  companhia = h('div#mascote.mascote-companhia', { 'data-estado': 'pronto' }, balao, botao);
  document.getElementById('janelas').append(companhia);
  botao.addEventListener('contextmenu', (e) => {
    e.preventDefault(); e.stopPropagation();
    abrirMenu([
      { rotulo: tr('&Conversar'), acao: () => abrir('assistente') },
      { rotulo: tr('&Escolher mascote…'), acao: () => abrir('assistente', { opcoes: true }) },
      { separador: true },
      { rotulo: tr('&Ocultar mascote'), acao: () => definirConfig({ assistente: { visivel: false } }) },
    ], e.clientX, e.clientY);
  });
  botao.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const x = e.clientX, y = e.clientY;
    const ini = { x: parseFloat(companhia.style.left) || 0, y: parseFloat(companhia.style.top) || 0 };
    arrastou = false; botao.setPointerCapture(e.pointerId);
    const mover = (p) => {
      if (Math.abs(p.clientX - x) + Math.abs(p.clientY - y) > 5) arrastou = true;
      if (!arrastou) return;
      const t = document.getElementById('janelas').getBoundingClientRect();
      companhia.style.left = limitar(ini.x + p.clientX - x, 0, Math.max(0, t.width - companhia.offsetWidth)) + 'px';
      companhia.style.top = limitar(ini.y + p.clientY - y, 0, Math.max(0, t.height - companhia.offsetHeight)) + 'px';
    };
    const fim = () => {
      botao.removeEventListener('pointermove', mover); botao.removeEventListener('pointerup', fim); botao.removeEventListener('pointercancel', fim);
      if (!arrastou) return;
      const t = document.getElementById('janelas').getBoundingClientRect();
      definirConfig({ assistente: { posicao: { x: parseFloat(companhia.style.left) / t.width, y: parseFloat(companhia.style.top) / t.height } } }).catch(() => { });
    };
    botao.addEventListener('pointermove', mover); botao.addEventListener('pointerup', fim); botao.addEventListener('pointercancel', fim);
  });
  eventos.on('config', atualizar); window.addEventListener('resize', atualizar);
  retro.assistente.aoMudar((s) => {
    const anterior = estadoChat; estadoChat = s.estado || 'pronto'; mudouEm = performance.now(); interagiuEm = mudouEm;
    companhia.dataset.estado = estadoChat; mudarFigura(desenho, preferencia().mascote, estadoChat);
    balao.hidden = !['aguardando', 'erro', 'concluido'].includes(estadoChat) || !!estado.config?.naoPerturbe || document.hidden;
    balao.textContent = tr(ESTADOS[estadoChat] || ESTADOS.pronto);
    if (estadoChat === 'concluido' && anterior !== 'concluido') setTimeout(() => { if (estadoChat === 'concluido') balao.hidden = true; }, 5000);
  });
  // Soltar arquivos do C: abre o chat com anexos; só o envio começa uma tarefa.
  companhia.addEventListener('dragover', (e) => { e.preventDefault(); companhia.classList.add('recebendo'); });
  companhia.addEventListener('dragleave', () => companhia.classList.remove('recebendo'));
  companhia.addEventListener('drop', async (e) => {
    e.preventDefault(); companhia.classList.remove('recebendo');
    // O DataTransfer só pode ser lido durante o evento, antes de qualquer await.
    let arquivos = [];
    try { arquivos = JSON.parse(e.dataTransfer.getData('application/x-retro-arquivos') || '[]'); } catch { }
    const fora = [...(e.dataTransfer.files || [])].map((f) => retro.disco.caminhoDe(f)).filter(Boolean);
    if (!arquivos.length && fora.length) arquivos = (await retro.disco.relDe(fora).catch(() => [])).filter((r) => r != null);
    abrir('assistente', { arquivos: arquivos.slice(0, 8) });
  });
  atualizar();
}
