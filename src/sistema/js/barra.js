/*
 * A barra de tarefas: o botão Iniciar com o menu, os botões das janelas
 * abertas e a bandeja (o foco, a rede, o volume, a bateria, o relógio e as notificações).
 */
import { h, img, caminhoTela, nomeDe, tipoDe } from './util.js';
import { abrirMenu, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, minimizarTodas } from './janelas.js';
import { estado, abrir, abrirArquivo, eventos as evSistema, definirConfig, pastaDocs } from './sistema.js';
import { tr, localidade } from './idioma.js';
import { noMenu, nomeNativo, iconeNativoJa, abrirNativo, iconeNativo } from './nativos.js';
import { alternarCalendario, montarBusca } from './barra-extras.js';
import { montarBandeja } from './bandeja.js';

let btIniciar;
let tarefas;
let relogio;
let focoEl;
let busca;
const mostrarBusca = () => !(estado.config.barra && estado.config.barra.busca === false);
const mostrarData = () => !!(estado.config.barra && estado.config.barra.data);

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
  focoEl = h('span.foco-tempo', { hidden: true, title: tr('Foco') });
  const focoIco = img('foco', 16, { title: tr('Foco (Pomodoro)') });
  focoIco.hidden = true;
  focoIco.style.cursor = 'pointer';
  focoIco.addEventListener('click', () => abrir('foco'));
  focoEl.addEventListener('click', () => abrir('foco'));
  relogio.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); alternarCalendario(relogio); } });
  relogio.style.cursor = 'pointer';
  const itens = montarBandeja();
  const bandeja = h('div#bandeja', focoIco, focoEl, ...itens.antes, relogio, ...itens.depois);
  busca = montarBusca();
  busca.hidden = !mostrarBusca();
  barra.append(btIniciar, h('div.sep-barra'), tarefas, busca, bandeja);

  barra.addEventListener('contextmenu', (e) => {
    if (e.target.closest('#tarefas button')) return;
    e.preventDefault();
    if (e.target.closest('.relogio')) {
      return abrirMenu([
        { rotulo: tr('&Ajustar data e hora…'), negrito: true, acao: () => abrir('painel', { secao: 'data' }) },
        { rotulo: tr('Mostrar a &data'), marcado: mostrarData(), acao: () => alternarData() },
      ], { x: e.clientX, y: e.clientY, acima: true });
    }
    abrirMenu([
      { rotulo: tr('&Em cascata'), acao: emCascata },
      { rotulo: tr('Lado a lado &horizontal'), acao: () => lado(false) },
      { rotulo: tr('Lado a lado &vertical'), acao: () => lado(true) },
      { separador: true },
      { rotulo: tr('&Minimizar todas as janelas'), acao: minimizarTodas },
      { separador: true },
      { rotulo: tr('Mostrar a caixa de &busca'), marcado: mostrarBusca(), acao: () => definirConfig({ barra: { busca: !mostrarBusca() } }).then(() => { busca.hidden = !mostrarBusca(); }) },
      { separador: true },
      { rotulo: tr('P&ropriedades'), acao: () => abrir('painel') },
    ], { x: e.clientX, y: e.clientY, acima: true });
  });

  evJanelas.on('mudou', desenharTarefas);
  evSistema.on('config', tique);
  evSistema.on('foco', (f) => {
    focoIco.hidden = !f.ativo;
    focoEl.hidden = !f.ativo;
    focoEl.textContent = f.texto || '';
    focoEl.dataset.dica = f.fase || tr('Foco');
  });
  tique();
  setInterval(tique, 1000);
}

function tique() {
  const d = new Date();
  const hora = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  // Com a data, o relógio fica em duas linhas: a hora em cima e a data embaixo.
  const data = mostrarData() ? d.toLocaleDateString(localidade(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const chave = hora + '|' + data;
  if (relogio.dataset.chave !== chave) {
    relogio.dataset.chave = chave;
    relogio.classList.toggle('com-data', !!data);
    relogio.replaceChildren(...(data ? [h('span', hora), h('span', data)] : [hora]));
  }
  relogio.dataset.dica = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function alternarData() {
  return definirConfig({ barra: { data: !mostrarData() } }).then(tique);
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

async function itensProgramas() {
  await Promise.all(noMenu().map((id) => iconeNativo(id)));
  const craft = estado.instalados
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => ({ rotulo: p.nome, icone: p.icone || 'programa', acao: () => abrir('craft:' + p.id) }));
  return [
    {
      rotulo: tr('Acessórios'), icone: 'pasta-programas', sub: () => [
        { rotulo: tr('Bloco de notas'), icone: 'bloco', acao: () => abrir('bloco') },
        { rotulo: tr('Calculadora'), icone: 'calculadora', acao: () => abrir('calculadora') },
        { rotulo: tr('Foco (Pomodoro)'), icone: 'foco', acao: () => abrir('foco') },
        { rotulo: tr('Prompt de comando'), icone: 'prompt', acao: () => abrir('prompt') },
        {
          rotulo: tr('Jogos'), icone: 'jogos', sub: () => [
            { rotulo: tr('Paciência'), icone: 'paciencia', acao: () => abrir('paciencia') },
            { rotulo: tr('Campo Minado'), icone: 'campo-minado', acao: () => abrir('campo-minado') },
            { rotulo: 'Breakout', icone: 'breakout', acao: () => abrir('breakout') },
          ],
        },
      ],
    },
    { separador: true },
    ...craft,
    ...(craft.length ? [{ separador: true }] : []),
    // Os programas do computador principal que o usuário pôs no menu, e a janela com todos.
    ...noMenu().map((id) => ({ rotulo: nomeNativo(id).replace(/&/g, '&&'), icone: 'programa', iconeUrl: iconeNativoJa(id), acao: () => abrirNativo(id) })),
    { rotulo: tr('Programas do computador…'), icone: 'computador', acao: () => abrir('nativos') },
    { separador: true },
    { rotulo: tr('Navegador'), icone: 'navegador', acao: () => abrir('navegador') },
    { rotulo: tr('E-mail'), icone: 'correio', acao: () => abrir('correio') },
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
