/*
 * A barra de tarefas: o botão Iniciar com o menu, os botões das janelas
 * abertas e a bandeja (o foco, o som e o relógio).
 */
import { h, img, caminhoTela, nomeDe, tipoDe } from './util.js';
import { abrirMenu, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, minimizarTodas } from './janelas.js';
import { estado, abrir, abrirArquivo, eventos as evSistema, definirConfig } from './sistema.js';
import { tocar } from './sons.js';

let btIniciar;
let tarefas;
let relogio;
let somIco;
let focoEl;

export function montarBarra() {
  const barra = document.getElementById('barra');
  btIniciar = h('button#iniciar', { dataset: { abreMenu: '1' }, title: 'Clique aqui para começar.' }, img('logo', 16), h('span', 'Iniciar'));
  btIniciar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (btIniciar.classList.contains('apertado')) fecharMenus();
    else abrirIniciar();
  });
  tarefas = h('div#tarefas');
  relogio = h('span.relogio');
  somIco = img('sons', 16, { title: 'Volume' });
  focoEl = h('span.foco-tempo', { hidden: true, title: 'Foco' });
  const focoIco = img('foco', 16, { title: 'Foco (Pomodoro)' });
  focoIco.hidden = true;
  focoIco.style.cursor = 'pointer';
  focoIco.addEventListener('click', () => abrir('foco'));
  focoEl.addEventListener('click', () => abrir('foco'));
  somIco.addEventListener('click', alternarSom);
  relogio.addEventListener('dblclick', () => abrir('painel', { secao: 'data' }));
  const bandeja = h('div#bandeja', focoIco, focoEl, somIco, relogio);
  barra.append(btIniciar, h('div.sep-barra'), tarefas, bandeja);

  barra.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#tarefas button')) return;
    e.preventDefault();
    abrirMenu([
      { rotulo: '&Em cascata', acao: emCascata },
      { rotulo: 'Lado a lado &horizontal', acao: () => lado(false) },
      { rotulo: 'Lado a lado &vertical', acao: () => lado(true) },
      { separador: true },
      { rotulo: '&Minimizar todas as janelas', acao: minimizarTodas },
      { separador: true },
      { rotulo: 'P&ropriedades', acao: () => abrir('painel') },
    ], { x: e.clientX, y: e.clientY, acima: true });
  });

  evJanelas.on('mudou', desenharTarefas);
  evSistema.on('config', atualizarSom);
  evSistema.on('foco', (f) => {
    focoIco.hidden = !f.ativo;
    focoEl.hidden = !f.ativo;
    focoEl.textContent = f.texto || '';
    focoEl.title = f.fase || 'Foco';
  });
  atualizarSom();
  tique();
  setInterval(tique, 1000);
}

function tique() {
  const d = new Date();
  const t = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (relogio.textContent !== t) relogio.textContent = t;
  relogio.title = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function atualizarSom() {
  const c = estado.config || {};
  const mudo = !c.sons || !c.volume;
  somIco.src = mudo ? 'icones/16/sons.png' : 'icones/16/sons.png';
  somIco.style.opacity = mudo ? '0.45' : '1';
  somIco.title = mudo ? 'Sons desligados (clique para ligar)' : 'Sons ligados (clique para desligar)';
}

async function alternarSom() {
  await definirConfig({ sons: !estado.config.sons });
  if (estado.config.sons) tocar('info');
}

function desenharTarefas() {
  const ativa = janelaAtiva();
  const visiveis = lista.filter((j) => !j.dialogo);
  tarefas.replaceChildren(...visiveis.map((j) => {
    const b = h('button', { title: j.titulo }, j.icone ? img(j.icone, 16) : null, h('span', j.titulo));
    if (j === ativa && !j.minimizada) b.classList.add('apertado');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      if (j === janelaAtiva() && !j.minimizada) j.minimizar();
      else j.focar();
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirMenu([
        { rotulo: '&Restaurar', desativado: !j.minimizada && !j.maximizada, acao: () => { j.focar(); j.restaurar(); } },
        { rotulo: 'Mi&nimizar', desativado: j.minimizada, acao: () => j.minimizar() },
        { rotulo: 'Ma&ximizar', desativado: j.maximizada, acao: () => { j.focar(); j.maximizar(); } },
        { separador: true },
        { rotulo: '&Fechar', negrito: true, atalho: 'Alt+F4', acao: () => j.fechar() },
      ], { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
}

/* ---------- O menu Iniciar ---------- */

function itensProgramas() {
  const craft = estado.instalados
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => ({ rotulo: p.nome, icone: p.icone || 'programa', acao: () => abrir('craft:' + p.id) }));
  return [
    {
      rotulo: 'Acessórios', icone: 'pasta-programas', sub: () => [
        { rotulo: 'Bloco de notas', icone: 'bloco', acao: () => abrir('bloco') },
        { rotulo: 'Foco (Pomodoro)', icone: 'foco', acao: () => abrir('foco') },
        { rotulo: 'Prompt de comando', icone: 'prompt', acao: () => abrir('prompt') },
      ],
    },
    { separador: true },
    ...craft,
    ...(craft.length ? [{ separador: true }] : []),
    { rotulo: 'Claude', icone: 'claude', acao: () => abrir('claude') },
    { rotulo: 'Explorador de arquivos', icone: 'computador', acao: () => abrir('explorador', { pasta: 'Meus documentos' }) },
    ...(craft.length ? [] : [{ rotulo: 'Instalar programas…', icone: 'programas-caixa', acao: () => abrir('programas') }]),
  ];
}

function itensDocumentos() {
  const recentes = (estado.config.recentes || []).slice(0, 15).map((rel) => ({
    rotulo: nomeDe(rel),
    icone: tipoDe(nomeDe(rel)).icone,
    acao: () => abrirArquivo(rel),
  }));
  return [
    { rotulo: 'Meus documentos', icone: 'documentos', acao: () => abrir('explorador', { pasta: 'Meus documentos' }) },
    { separador: true },
    ...(recentes.length ? recentes : [{ rotulo: '(Vazio)', desativado: true }]),
  ];
}

export async function abrirIniciar() {
  const r = btIniciar.getBoundingClientRect();
  const el = h('div.menu.iniciar.com-icones');
  const itens = h('div.itens');
  el.append(h('div.faixa', h('span', h('b', 'Retro'), ' Computer')), itens);
  btIniciar.classList.add('apertado');
  await abrirMenu([
    { rotulo: '&Programas', icone: 'pasta-programas', sub: itensProgramas },
    { rotulo: '&Documentos', icone: 'documentos', sub: itensDocumentos },
    {
      rotulo: '&Configurações', icone: 'configuracoes', sub: () => [
        { rotulo: '&Painel de controle', icone: 'painel', acao: () => abrir('painel') },
        { rotulo: '&Adicionar ou remover programas', icone: 'programas-caixa', acao: () => abrir('programas') },
        { rotulo: 'A&parência', icone: 'aparencia', acao: () => abrir('painel', { secao: 'aparencia' }) },
      ],
    },
    { rotulo: '&Localizar', icone: 'localizar', acao: () => abrir('localizar') },
    { rotulo: '&Ajuda', icone: 'ajuda', acao: () => abrir('ajuda') },
    { rotulo: '&Executar…', icone: 'executar', acao: () => abrir('executar') },
    { separador: true },
    { rotulo: '&Desligar…', icone: 'desligar', acao: () => abrir('desligar') },
  ], {
    x: r.left,
    y: r.top + 1,
    acima: true,
    elemento: el,
    corpo: itens,
    tamIcone: 32,
    aoFechar: () => btIniciar.classList.remove('apertado'),
  });
}

// A tecla do sistema (Ctrl+Esc) abre o menu Iniciar, como nos computadores da época.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Escape') {
    e.preventDefault();
    abrirIniciar();
  }
});

export { caminhoTela };
