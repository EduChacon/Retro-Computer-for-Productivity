/*
 * A barra de tarefas: o botão Iniciar com o menu, a busca, os programas fixados,
 * os botões das janelas abertas (com o nome, como na época, ou só os ícones,
 * agrupados por programa) e a bandeja (o foco, a rede, o volume, a bateria, o
 * relógio e as notificações).
 */
import { h, img, caminhoTela, nomeDe, tipoDe } from './util.js';
import { abrirMenu, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, minimizarTodas } from './janelas.js';
import { janelasNativas, eventosNativas, retroAtivo } from './janelas-nativas.js';
import { estado, abrir, abrirArquivo, eventos as evSistema, definirConfig, pastaDocs, app, instalado } from './sistema.js';
import { tr, marcar, localidade } from './idioma.js';
import { noMenu, nomeNativo, iconeNativoJa, abrirNativo, iconeNativo } from './nativos.js';
import { alternarCalendario, montarBusca } from './barra-extras.js';
import { montarBandeja } from './bandeja.js';
import { bloquear, temSenha } from './bloqueio.js';
import { usaFirefox as firefoxPadrao } from './apps/navegador.js';
import { naMesa, adicionarAtalho, removerAtalho } from './mesa.js';

let btIniciar;
let tarefas;
let fixadosEl;
let sepFixados;
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
  fixadosEl = h('div#fixados');
  sepFixados = h('div.sep-barra');
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
  // Como no Windows de hoje: o Iniciar, a busca e os programas fixados à esquerda.
  barra.append(btIniciar, h('div.sep-barra'), busca, fixadosEl, sepFixados, tarefas, bandeja);

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
      {
        rotulo: tr('Botões das &janelas'), sub: () => [
          { rotulo: tr('Com o &nome'), radio: true, marcado: modoBotoes() === 'nomes', acao: () => definirConfig({ barra: { botoes: 'nomes' } }) },
          { rotulo: tr('Só os &ícones, agrupados por programa'), radio: true, marcado: modoBotoes() === 'icones', acao: () => definirConfig({ barra: { botoes: 'icones' } }) },
        ],
      },
      { separador: true },
      { rotulo: tr('P&ropriedades'), acao: () => abrir('painel') },
    ], { x: e.clientX, y: e.clientY, acima: true });
  });

  evJanelas.on('mudou', desenharTarefas);
  eventosNativas.on('mudou', desenharTarefas);
  evSistema.on('config', () => { tique(); desenharTarefas(); });
  evSistema.on('programas', desenharTarefas);
  desenharTarefas();
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
    document.body.classList.toggle('barra-alta', !!data);
    relogio.replaceChildren(...(data ? [h('span', hora), h('span', data)] : [hora]));
  }
  relogio.dataset.dica = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function alternarData() {
  return definirConfig({ barra: { data: !mostrarData() } }).then(tique);
}

/* ---------- Os programas fixados ---------- */

// Os nomes que a barra mostra para alguns programas embutidos.
const NOMES_FIXADOS = { explorador: marcar('Explorador de arquivos') };
const fixados = () => ((estado.config.barra || {}).fixados || []);
const modoBotoes = () => ((estado.config.barra || {}).botoes === 'icones' ? 'icones' : 'nomes');
const iconesPedidos = new Set();

/**
 * O que a barra precisa de um programa (pela chave: "navegador", "craft:wordcraft",
 * "nativo:org.exemplo.desktop"): o nome, o ícone e como abrir. Null se ele não existe mais.
 */
export function programaDe(chave) {
  if (!chave) return null;
  if (chave.startsWith('craft:')) {
    const p = instalado(chave.slice(6));
    return p ? { chave, nome: p.nome, icone: p.icone || 'programa', abrir: () => abrir(chave) } : null;
  }
  if (chave.startsWith('webapp:')) {
    const w = (estado.config.webapps || []).find((x) => x.id === chave.slice(7));
    return w ? { chave, nome: w.nome, icone: 'internet', iconeUrl: w.icone || null, abrir: () => abrir(chave) } : null;
  }
  if (chave.startsWith('nativo:')) {
    const id = chave.slice(7);
    if (!iconeNativoJa(id) && !iconesPedidos.has(id)) {
      iconesPedidos.add(id);
      iconeNativo(id).then((u) => { if (u) desenharTarefas(); });
    }
    return { chave, nome: nomeNativo(id), icone: 'programa', iconeUrl: iconeNativoJa(id), abrir: () => abrirNativo(id) };
  }
  const a = app(chave);
  if (!a || a.id === 'craft') return null;
  return { chave, nome: tr(NOMES_FIXADOS[chave] || a.nome), icone: a.icone || 'programa', abrir: () => abrir(chave) };
}

export const estaFixado = (chave) => fixados().includes(chave);

export function fixar(chave) {
  if (estaFixado(chave) || !programaDe(chave)) return Promise.resolve();
  return definirConfig({ barra: { fixados: [...fixados(), chave] } });
}

export function desafixar(chave) {
  return definirConfig({ barra: { fixados: fixados().filter((k) => k !== chave) } });
}

const iconeDe = (p) => (p.iconeUrl ? h('img.de-fora', { src: p.iconeUrl, width: 16, height: 16, alt: '' }) : img(p.icone, 16));
const fixarOuDesafixar = (chave) => (estaFixado(chave)
  ? { rotulo: tr('Desafixar da &barra de tarefas'), acao: () => desafixar(chave) }
  : { rotulo: tr('Fixar na &barra de tarefas'), acao: () => fixar(chave) });

async function fecharTodas(js) {
  for (const j of js.slice()) if (!(await j.fechar())) break;
}

/* ---------- Os botões das janelas ---------- */

/** A janela está na frente? (As do Linux dizem; as do Retro Computer, só com ele na frente.) */
const naFrente = (j, ativa) => (j.nativa ? j.ativa : j === ativa && !j.minimizada);

function desenharTarefas() {
  if (!tarefas || !estado.config) return;
  // Com um programa do Linux na frente, nenhuma janela do Retro Computer fica apertada.
  const ativa = retroAtivo() ? janelaAtiva() : null;
  // As janelas dos programas do Linux (modo sistema) vêm depois das do Retro Computer.
  const visiveis = [...lista.filter((j) => !j.dialogo), ...janelasNativas()];
  const icones = modoBotoes() === 'icones';
  // Com o nome: os fixados ficam à parte, como a Inicialização rápida da época.
  const rapidos = icones ? [] : fixados().map(programaDe).filter(Boolean);
  fixadosEl.replaceChildren(...rapidos.map((p) => {
    const b = h('button.prog.rapido', { title: p.nome }, iconeDe(p));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => p.abrir());
    b.addEventListener('auxclick', (e) => { if (e.button === 1) p.abrir(); });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirMenu([{ rotulo: tr('&Abrir'), negrito: true, acao: p.abrir }, fixarOuDesafixar(p.chave)], { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
  fixadosEl.hidden = !rapidos.length;
  sepFixados.hidden = !rapidos.length;
  tarefas.classList.toggle('so-icones', icones);
  if (icones) return desenharGrupos(visiveis, ativa);
  tarefas.replaceChildren(...visiveis.map((j) => {
    const pj = j.nativa && j.programa ? programaDe(j.programa) : null;
    const b = h('button', { title: j.titulo }, pj ? iconeDe(pj) : j.icone ? img(j.icone, 16) : null, h('span', j.titulo));
    if (naFrente(j, ativa)) b.classList.add('apertado');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => {
      if (naFrente(j, ativa)) j.minimizar();
      else j.focar();
    });
    // O clique da roda abre outra janela do mesmo programa (como no Windows).
    b.addEventListener('auxclick', (e) => { const p = e.button === 1 && programaDe(j.programa); if (p) p.abrir(); });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const p = programaDe(j.programa);
      abrirMenu([
        // As janelas do Linux: trazer para a frente e minimizar (o tamanho é com o próprio programa).
        { rotulo: tr('&Restaurar'), desativado: !j.nativa && !j.minimizada && !j.maximizada, acao: () => { j.focar(); j.restaurar(); } },
        { rotulo: tr('Mi&nimizar'), desativado: j.minimizada, acao: () => j.minimizar() },
        ...(j.nativa ? [] : [{ rotulo: tr('Ma&ximizar'), desativado: j.maximizada, acao: () => { j.focar(); j.maximizar(); } }]),
        ...(p ? [{ separador: true }, fixarOuDesafixar(p.chave)] : []),
        { separador: true },
        { rotulo: tr('&Fechar'), negrito: true, atalho: 'Alt+F4', acao: () => j.fechar() },
      ], { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
}

/**
 * Só os ícones, como no Windows de hoje: um botão por programa (os fixados primeiro, na ordem
 * deles), com uma marca embaixo quando há janela aberta. Com várias janelas, o clique mostra a lista.
 */
function desenharGrupos(visiveis, ativa) {
  const grupos = new Map();
  for (const k of fixados()) {
    const p = programaDe(k);
    if (p) grupos.set(k, { p, janelas: [] });
  }
  for (const j of visiveis) {
    const p = j.programa ? (grupos.get(j.programa) || {}).p || programaDe(j.programa) : null;
    if (p) {
      if (!grupos.has(p.chave)) grupos.set(p.chave, { p, janelas: [] });
      grupos.get(p.chave).janelas.push(j);
    } else {
      // Uma janela sem programa conhecido fica sozinha, com o ícone dela.
      grupos.set(Symbol('janela'), { p: { nome: j.titulo, icone: j.icone || 'programa' }, janelas: [j] });
    }
  }
  tarefas.replaceChildren(...[...grupos.values()].map((g) => {
    const js = g.janelas;
    const b = h('button.prog', { title: js.length === 1 ? js[0].titulo : g.p.nome }, iconeDe(g.p));
    if (js.length) b.classList.add('aberto');
    if (js.length > 1) b.classList.add('varias');
    if (js.some((j) => naFrente(j, ativa))) b.classList.add('apertado');
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('auxclick', (e) => { if (e.button === 1 && g.p.abrir) g.p.abrir(); });
    b.addEventListener('click', () => {
      if (!js.length) return g.p.abrir && g.p.abrir();
      if (js.length === 1) {
        const j = js[0];
        return naFrente(j, ativa) ? j.minimizar() : j.focar();
      }
      const r = b.getBoundingClientRect();
      abrirMenu([
        ...js.map((j) => ({ rotulo: j.titulo.replace(/&/g, '&&'), icone: j.icone || g.p.icone, negrito: naFrente(j, ativa), acao: () => j.focar() })),
        ...(g.p.abrir ? [{ separador: true }, { rotulo: tr('&Nova janela'), acao: g.p.abrir }] : []),
      ], { x: r.left, y: r.top, acima: true });
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const itens = [];
      if (g.p.abrir) itens.push({ rotulo: js.length ? tr('&Nova janela') : tr('&Abrir'), negrito: !js.length, acao: g.p.abrir });
      if (g.p.chave) itens.push(fixarOuDesafixar(g.p.chave));
      if (js.length) itens.push({ separador: true }, { rotulo: js.length > 1 ? tr('Fechar todas as &janelas') : tr('&Fechar a janela'), acao: () => fecharTodas(js) });
      abrirMenu(itens, { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
}

/* ---------- O menu Iniciar ---------- */

// O botão direito num programa do Iniciar (como no Windows): abrir, a área de trabalho e a barra.
function contextoPrograma(chave, acao) {
  return () => [
    { rotulo: tr('&Abrir'), negrito: true, acao },
    { separador: true },
    naMesa(chave)
      ? { rotulo: tr('Remover da área de &trabalho'), acao: () => removerAtalho(chave) }
      : { rotulo: tr('Adicionar à área de &trabalho'), acao: () => adicionarAtalho(chave) },
    fixarOuDesafixar(chave),
  ];
}

/** Um programa do Iniciar, com o botão direito. */
const prog = (chave, rotulo, icone, acao = () => abrir(chave), extra = {}) => ({ rotulo, icone, acao, contexto: contextoPrograma(chave, acao), ...extra });

async function itensProgramas() {
  await Promise.all(noMenu().map((id) => iconeNativo(id)));
  const craft = estado.instalados
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((p) => prog('craft:' + p.id, p.nome, p.icone || 'programa'))
    // Os sites instalados como programas, entre eles, por nome.
    .concat((estado.config.webapps || []).map((w) => prog('webapp:' + w.id, w.nome.replace(/&/g, '&&'), 'internet', undefined, { iconeUrl: w.icone || null, webapp: w.id })))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  return [
    {
      rotulo: tr('Acessórios'), icone: 'pasta-programas', sub: () => [
        prog('transferencia', tr('Área de transferência'), 'transferencia'),
        prog('bloco', tr('Bloco de notas'), 'bloco'),
        prog('calculadora', tr('Calculadora'), 'calculadora'),
        prog('captura', tr('Captura de tela'), 'captura'),
        prog('diario', tr('Diário de trabalho'), 'diario'),
        prog('foco', tr('Foco (Pomodoro)'), 'foco'),
        prog('caracteres', tr('Mapa de caracteres'), 'caracteres'),
        prog('monitor', tr('Monitor do sistema'), 'monitor'),
        prog('prompt', tr('Prompt de comando'), 'prompt'),
        prog('midia', tr('Reprodutor de mídia'), 'reprodutor'),
        prog('imagens', tr('Visualizador de imagens'), 'imagens'),
        {
          rotulo: tr('Jogos'), icone: 'jogos', sub: () => [
            prog('paciencia', tr('Paciência'), 'paciencia'),
            prog('campo-minado', tr('Campo Minado'), 'campo-minado'),
            prog('breakout', 'Breakout', 'breakout'),
          ],
        },
      ],
    },
    { separador: true },
    ...craft,
    ...(craft.length ? [{ separador: true }] : []),
    // Os programas do computador principal que o usuário pôs no menu, e a janela com todos.
    ...noMenu().map((id) => prog('nativo:' + id, nomeNativo(id).replace(/&/g, '&&'), 'programa', () => abrirNativo(id), { iconeUrl: iconeNativoJa(id) })),
    { rotulo: tr('Programas do computador…'), icone: 'computador', acao: () => abrir('nativos') },
    { separador: true },
    prog('navegador', tr('Navegador'), 'navegador'),
    // Com o Firefox como padrão, o Navegador daqui (o dos sites instalados como programas) continua à mão.
    ...(firefoxPadrao() ? [{ rotulo: tr('Navegador do Retro Computer'), icone: 'internet', acao: () => abrir('navegador', { interno: true }) }] : []),
    prog('correio', tr('E-mail'), 'correio'),
    prog('claude', tr('Claude'), 'claude'),
    prog('explorador', tr('Explorador de arquivos'), 'computador', () => abrir('explorador', { pasta: pastaDocs() })),
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

/** A tecla do logotipo: abre o Iniciar, ou fecha se já estiver aberto. */
export function alternarIniciar() {
  if (btIniciar.classList.contains('apertado')) fecharMenus();
  else abrirIniciar();
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
    // Sem senha ainda, o item leva ao Painel de controle › Senhas para criar uma.
    { rotulo: tr('&Bloquear o computador'), icone: 'chave', acao: () => (temSenha() ? bloquear() : abrir('painel', { secao: 'senhas' })) },
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
