/*
 * A barra de tarefas: o botão Iniciar com o menu, os botões das janelas
 * abertas e a bandeja (o foco, o som e o relógio).
 */
import { h, img, caminhoTela, nomeDe, tipoDe } from './util.js';
import { abrirMenu, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, minimizarTodas } from './janelas.js';
import { estado, abrir, abrirArquivo, eventos as evSistema, definirConfig, pastaDocs } from './sistema.js';
import { tocar } from './sons.js';
import { tr, localidade } from './idioma.js';

let btIniciar;
let tarefas;
let relogio;
let somIco;
let focoEl;

export function montarBarra() {
  const barra = document.getElementById('barra');
  btIniciar = h('button#iniciar', { dataset: { abreMenu: '1' }, title: tr('Clique aqui para começar.') }, img('logo', 16), h('span', tr('Iniciar')));
  btIniciar.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (btIniciar.classList.contains('apertado')) fecharMenus();
    else abrirIniciar();
  });
  tarefas = h('div#tarefas');
  relogio = h('span.relogio');
  somIco = img('sons', 16, { title: tr('Volume') });
  focoEl = h('span.foco-tempo', { hidden: true, title: tr('Foco') });
  const focoIco = img('foco', 16, { title: tr('Foco (Pomodoro)') });
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
      { rotulo: tr('&Em cascata'), acao: emCascata },
      { rotulo: tr('Lado a lado &horizontal'), acao: () => lado(false) },
      { rotulo: tr('Lado a lado &vertical'), acao: () => lado(true) },
      { separador: true },
      { rotulo: tr('&Minimizar todas as janelas'), acao: minimizarTodas },
      { separador: true },
      { rotulo: tr('P&ropriedades'), acao: () => abrir('painel') },
    ], { x: e.clientX, y: e.clientY, acima: true });
  });

  evJanelas.on('mudou', desenharTarefas);
  evSistema.on('config', atualizarSom);
  evSistema.on('foco', (f) => {
    focoIco.hidden = !f.ativo;
    focoEl.hidden = !f.ativo;
    focoEl.textContent = f.texto || '';
    focoEl.dataset.dica = f.fase || tr('Foco');
  });
  atualizarSom();
  tique();
  setInterval(tique, 1000);
}

function tique() {
  const d = new Date();
  const t = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  if (relogio.textContent !== t) relogio.textContent = t;
  relogio.dataset.dica = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function atualizarSom() {
  const c = estado.config || {};
  const mudo = !c.sons || !c.volume;
  somIco.src = mudo ? 'icones/16/sons.png' : 'icones/16/sons.png';
  somIco.style.opacity = mudo ? '0.45' : '1';
  somIco.dataset.dica = mudo ? tr('Sons desligados (clique para ligar)') : tr('Sons ligados (clique para desligar)');
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
        { rotulo: tr('&Restaurar'), desativado: !j.minimizada && !j.maximizada, acao: () => { j.focar(); j.restaurar(); } },
        { rotulo: tr('Mi&nimizar'), desativado: j.minimizada, acao: () => j.minimizar() },
        { rotulo: tr('Ma&ximizar'), desativado: j.maximizada, acao: () => { j.focar(); j.maximizar(); } },
        { separador: true },
        { rotulo: tr('&Fechar'), negrito: true, atalho: 'Alt+F4', acao: () => j.fechar() },
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
      rotulo: tr('Acessórios'), icone: 'pasta-programas', sub: () => [
        { rotulo: tr('Bloco de notas'), icone: 'bloco', acao: () => abrir('bloco') },
        { rotulo: tr('Foco (Pomodoro)'), icone: 'foco', acao: () => abrir('foco') },
        { rotulo: tr('Prompt de comando'), icone: 'prompt', acao: () => abrir('prompt') },
      ],
    },
    { separador: true },
    ...craft,
    ...(craft.length ? [{ separador: true }] : []),
    { rotulo: tr('Claude'), icone: 'claude', acao: () => abrir('claude') },
    { rotulo: tr('Explorador de arquivos'), icone: 'computador', acao: () => abrir('explorador', { pasta: pastaDocs() }) },
    ...(craft.length ? [] : [{ rotulo: tr('Instalar programas…'), icone: 'programas-caixa', acao: () => abrir('programas') }]),
  ];
}

function itensDocumentos() {
  const recentes = (estado.config.recentes || []).slice(0, 15).map((rel) => ({
    rotulo: nomeDe(rel),
    icone: tipoDe(nomeDe(rel)).icone,
    acao: () => abrirArquivo(rel),
  }));
  return [
    { rotulo: tr('Meus documentos'), icone: 'documentos', acao: () => abrir('explorador', { pasta: pastaDocs() }) },
    { separador: true },
    ...(recentes.length ? recentes : [{ rotulo: tr('(Vazio)'), desativado: true }]),
  ];
}

export async function abrirIniciar() {
  const r = btIniciar.getBoundingClientRect();
  const el = h('div.menu.iniciar.com-icones');
  const itens = h('div.itens');
  el.append(h('div.faixa', h('span', h('b', 'Retro'), ' Computer')), itens);
  btIniciar.classList.add('apertado');
  await abrirMenu([
    { rotulo: tr('&Programas'), icone: 'pasta-programas', sub: itensProgramas },
    { rotulo: tr('&Documentos'), icone: 'documentos', sub: itensDocumentos },
    {
      rotulo: tr('&Configurações'), icone: 'configuracoes', sub: () => [
        { rotulo: tr('&Painel de controle'), icone: 'painel', acao: () => abrir('painel') },
        { rotulo: tr('&Adicionar ou remover programas'), icone: 'programas-caixa', acao: () => abrir('programas') },
        { rotulo: tr('A&parência'), icone: 'aparencia', acao: () => abrir('painel', { secao: 'aparencia' }) },
      ],
    },
    { rotulo: tr('&Localizar'), icone: 'localizar', acao: () => abrir('localizar') },
    { rotulo: tr('&Ajuda'), icone: 'ajuda', acao: () => abrir('ajuda') },
    { rotulo: tr('&Executar…'), icone: 'executar', acao: () => abrir('executar') },
    { separador: true },
    { rotulo: tr('&Desligar…'), icone: 'desligar', acao: () => abrir('desligar') },
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
