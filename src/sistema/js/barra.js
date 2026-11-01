/*
 * A barra de tarefas: o botão Iniciar com o menu, a busca, os programas fixados,
 * os botões das janelas abertas (com o nome, como na época, ou só os ícones,
 * agrupados por programa) e a bandeja (o foco, a rede, o volume, a bateria, o
 * relógio e as notificações).
 */
import { h, img, caminhoTela, nomeDe, tipoDe } from './util.js';
import { abrirMenu, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, minimizarTodas, daAreaAtual, areaAtual, numAreas, irParaArea, novaArea, fecharArea, moverParaArea, MAX_AREAS } from './janelas.js';
import { janelasNativas, eventosNativas, retroAtivo } from './janelas-nativas.js';
import { estado, abrir, abrirArquivo, eventos as evSistema, definirConfig, pastaDocs, app, instalado } from './sistema.js';
import { tr, marcar, localidade } from './idioma.js';
import { noMenu, nomeNativo, iconeNativoJa, abrirNativo, iconeNativo } from './nativos.js';
import { alternarCalendario, montarBusca } from './barra-extras.js';
import { montarBandeja } from './bandeja.js';
import { bloquear, podeBloquear } from './bloqueio.js';
import { variosPerfis, perfilAtual, nomeDoPerfil } from './perfis.js';
import { usaFirefox as firefoxPadrao } from './apps/navegador.js';
import { naMesa, adicionarAtalho, removerAtalho } from './mesa.js';
import { reorganizavel as reorganizavelFaixa, arrastando } from './reorganizar.js';
import { variasTelas, listaTelas, mesmaTela, aoMudarTelas, definirBarraNasOutras } from './telas.js';
import { reajustarJanelas } from './janelas.js';
import { temaMac, aoMudarTema } from './tema.js';

let btIniciar;
let tarefas;
let fixadosEl;
let sepFixados;
let relogio;
let pecasBandeja = null; // o que vai na bandeja, na ordem (para o tema Mac separar o relógio e devolver)

/** Os ícones da bandeja que o usuário pode esconder (Painel › Barra de tarefas), na ordem das caixas de lá. */
export const ICONES_BANDEJA = [
  { id: 'rede', rotulo: marcar('Rede') },
  { id: 'som', rotulo: marcar('Volume') },
  { id: 'bateria', rotulo: marcar('Bateria') },
  { id: 'bluetooth', rotulo: marcar('Bluetooth') },
  { id: 'notificacoes', rotulo: marcar('Notificações') },
];

/** Esconde os ícones desmarcados (a classe não briga com o hidden de cada um, que diz se o aparelho existe). */
function aplicarOcultos() {
  if (!pecasBandeja) return;
  const ocultos = new Set((estado.config.barra && estado.config.barra.ocultos) || []);
  for (const { id } of ICONES_BANDEJA) {
    const el = pecasBandeja.porNome[id];
    if (el) el.classList.toggle('escondido', ocultos.has(id));
  }
}
let focoEl;
let busca;
const mostrarBusca = () => !(estado.config.barra && estado.config.barra.busca === false);
const mostrarData = () => !!(estado.config.barra && estado.config.barra.data);

/** O botão Iniciar: o da barra principal (#iniciar) e o de cada outra tela (.bt-iniciar). */
function botaoIniciar(principal) {
  const b = h(principal ? 'button#iniciar' : 'button.bt-iniciar', { dataset: { abreMenu: '1' }, title: tr('Clique aqui para começar.') }, img('logo', 16), h('span', tr('Iniciar')));
  b.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (b.classList.contains('apertado')) fecharMenus();
    else abrirIniciar(b);
  });
  return b;
}

export function montarBarra() {
  const barra = document.getElementById('barra');
  btIniciar = botaoIniciar(true);
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
  pecasBandeja = { foco: [focoIco, focoEl], antes: itens.antes, depois: itens.depois, porNome: itens.porNome || {} };
  aplicarOcultos();
  const bandeja = h('div#bandeja', focoIco, focoEl, ...itens.antes, relogio, ...itens.depois);
  busca = montarBusca();
  busca.hidden = !mostrarBusca();
  areasEl = h('div#areas', { hidden: true, role: 'toolbar', 'aria-label': tr('Áreas de trabalho') });
  // Como no Windows de hoje: o Iniciar, a busca e os programas fixados à esquerda.
  barra.append(btIniciar, h('div.sep-barra'), busca, fixadosEl, sepFixados, tarefas, areasEl, bandeja);
  barra.addEventListener('contextmenu', menuDaBarra);

  evJanelas.on('mudou', desenharTarefas);
  // Uma janela mudou de lugar (arrastada, maximizada, encaixada): o botão dela vai para a barra da tela em que ficou.
  evJanelas.on('lugar', () => { if (outras.length) desenharTarefas(); });
  eventosNativas.on('mudou', desenharTarefas);
  evSistema.on('config', () => {
    tique();
    busca.hidden = !mostrarBusca();
    aplicarOcultos();
    if (querOutras() !== ligadaNasOutras) { montarOutras(); reajustarJanelas(); }
    desenharTarefas();
  });
  evSistema.on('programas', desenharTarefas);
  // As duas telas: uma barra em cada outra tela (e nenhuma, com uma tela só).
  aoMudarTelas(() => { montarOutras(); desenharTarefas(); });
  aoMudarTema(() => { montarOutras(); reajustarJanelas(); desenharTarefas(); });
  montarOutras();
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

/** A busca, a bandeja (a rede, o volume…), o relógio e o tempo do Foco: o tema Mac os tira daqui (barra-mac.js). */
export function pecasDaBarra() {
  return { busca, bandeja: document.getElementById('bandeja'), relogio, foco: pecasBandeja ? pecasBandeja.foco : [], areas: areasEl };
}

/** Devolve a busca e a bandeja para a barra de tarefas, nos lugares de sempre. */
export function devolverPecas() {
  const barra = document.getElementById('barra');
  const bandeja = document.getElementById('bandeja');
  if (!barra || !busca) return;
  if (busca.parentNode !== barra) fixadosEl.before(busca);
  if (bandeja && bandeja.parentNode !== barra) barra.append(bandeja);
  if (areasEl && areasEl.parentNode !== barra) bandeja.before(areasEl);
  // O relógio e o Foco voltam para a bandeja, na ordem de sempre.
  if (bandeja && pecasBandeja && relogio.parentNode !== bandeja) bandeja.replaceChildren(...pecasBandeja.foco, ...pecasBandeja.antes, relogio, ...pecasBandeja.depois);
}

/** O botão direito na barra de tarefas (a principal e a de cada outra tela). */
function menuDaBarra(e) {
  if (e.target.closest('#tarefas button, .barra-tela .tarefas button')) return;
  e.preventDefault();
  // O botão direito no Iniciar, como no Windows 95: abrir o menu, explorar e as propriedades.
  const bt = e.target.closest('#iniciar, .bt-iniciar');
  if (bt) {
    return abrirMenu([
      { rotulo: tr('&Abrir'), negrito: true, acao: () => abrirIniciar(bt) },
      { rotulo: tr('&Explorar'), acao: () => abrir('explorador', { pasta: pastaDocs() }) },
      { rotulo: tr('&Localizar'), acao: () => abrir('localizar') },
      { separador: true },
      { rotulo: tr('P&ropriedades'), acao: () => abrir('painel', { secao: 'barra', aba: 1 }) },
    ], { x: e.clientX, y: e.clientY, acima: true });
  }
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
    { rotulo: tr('Vi&são das tarefas'), atalho: tr('Logotipo+Tab'), acao: () => import('./areas.js').then((m) => m.abrirVisao()) },
    { rotulo: tr('&Nova área de trabalho'), atalho: tr('Logotipo+Ctrl+D'), desativado: numAreas() >= MAX_AREAS, acao: () => novaArea() },
    { separador: true },
    { rotulo: tr('Mostrar a caixa de &busca'), marcado: mostrarBusca(), acao: () => definirConfig({ barra: { busca: !mostrarBusca() } }).then(() => { busca.hidden = !mostrarBusca(); }) },
    ...(variasTelas() ? [{ rotulo: tr('Mostrar a barra em todas as &telas'), marcado: barraEmTodas(), acao: () => definirConfig({ barra: { todasTelas: !barraEmTodas() } }) }] : []),
    {
      rotulo: tr('Botões das &janelas'), sub: () => [
        { rotulo: tr('Com o &nome'), radio: true, marcado: modoBotoes() === 'nomes', acao: () => definirConfig({ barra: { botoes: 'nomes' } }) },
        { rotulo: tr('Só os &ícones, agrupados por programa'), radio: true, marcado: modoBotoes() === 'icones', acao: () => definirConfig({ barra: { botoes: 'icones' } }) },
      ],
    },
    { separador: true },
    { rotulo: tr('P&ropriedades'), acao: () => abrir('painel', { secao: 'barra' }) },
  ], { x: e.clientX, y: e.clientY, acima: true });
}

function tique() {
  const d = new Date();
  const hora = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  // Com a data, o relógio fica em duas linhas: a hora em cima e a data embaixo.
  const data = mostrarData() ? d.toLocaleDateString(localidade(), { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const chave = hora + '|' + data;
  document.body.classList.toggle('barra-alta', !!data);
  const dica = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  // O relógio da barra principal e o de cada outra tela.
  for (const r of [relogio, ...outras.map((o) => o.relogio)]) {
    if (r.dataset.chave !== chave) {
      r.dataset.chave = chave;
      r.classList.toggle('com-data', !!data);
      r.replaceChildren(...(data ? [h('span', hora), h('span', data)] : [hora]));
    }
    r.dataset.dica = dica;
  }
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

/**
 * Um arquivo de atalho (o disco já leu a chave do programa: f.atalho) como item de uma pasta: o
 * ícone do programa com a setinha e o nome sem o ".atalho" (que volta ao renomear: extOculta).
 */
export function itemDeAtalho(f) {
  const p = programaDe(f.atalho);
  return {
    rotulo: f.nome.replace(/\.atalho$/i, ''), icone: p ? p.icone : 'programa', iconeUrl: (p && p.iconeUrl) || null,
    atalho: true, extOculta: f.nome.slice(-'.atalho'.length),
  };
}

export const estaFixado = (chave) => fixados().includes(chave);

export function fixar(chave) {
  if (estaFixado(chave) || !programaDe(chave)) return Promise.resolve();
  return definirConfig({ barra: { fixados: [...fixados(), chave] } });
}

export function desafixar(chave) {
  return definirConfig({ barra: { fixados: fixados().filter((k) => k !== chave) } });
}

/* ---------- O menu Iniciar configurável (Painel › Barra de tarefas e menu Iniciar) ---------- */

const cfgIniciar = () => estado.config.iniciar || {};
/** Os programas fixados no alto do menu Iniciar (as mesmas chaves da barra). */
export const fixadosIniciar = () => cfgIniciar().fixados || [];
export const estaNoIniciar = (chave) => fixadosIniciar().includes(chave);

export function fixarNoIniciar(chave) {
  if (estaNoIniciar(chave) || !programaDe(chave)) return Promise.resolve();
  return definirConfig({ iniciar: { fixados: [...fixadosIniciar(), chave] } });
}

export function desafixarDoIniciar(chave) {
  return definirConfig({ iniciar: { fixados: fixadosIniciar().filter((k) => k !== chave) } });
}

/** Os itens do menu Iniciar que dá para esconder (o Programas e o Desligar ficam sempre). */
export const ITENS_INICIAR = [
  { id: 'loja', rotulo: marcar('Loja de programas') },
  { id: 'documentos', rotulo: marcar('Documentos') },
  { id: 'configuracoes', rotulo: marcar('Configurações') },
  { id: 'localizar', rotulo: marcar('Localizar') },
  { id: 'ajuda', rotulo: marcar('Ajuda') },
  { id: 'executar', rotulo: marcar('Executar') },
  { id: 'bloquear', rotulo: marcar('Bloquear o computador') },
];
const ocultoNoIniciar = (id) => (cfgIniciar().ocultos || []).includes(id);
export const guardaRecentes = () => cfgIniciar().recentes !== false;

/** Os programas que podem ser fixados (no menu Iniciar ou na barra), para a lista do Painel. */
export function programasFixaveis() {
  const embutidos = ['explorador', 'navegador', 'correio', 'claude', 'codex', 'assistente', 'bloco', 'calculadora', 'captura', 'diario', 'foco', 'caracteres',
    'monitor', 'laboratorio', 'prompt', 'dos', 'mac', 'midia', 'imagens', 'transferencia', 'painel', 'programas', 'paciencia', 'campo-minado', 'breakout', 'damas', 'xadrez'];
  const chaves = [...embutidos, ...estado.instalados.map((p) => 'craft:' + p.id), ...(estado.config.webapps || []).map((w) => 'webapp:' + w.id), ...noMenu().map((id) => 'nativo:' + id)];
  return chaves.map(programaDe).filter(Boolean).sort((a, b) => a.nome.localeCompare(b.nome, localidade()));
}

const iconeDe = (p) => (p.iconeUrl ? h('img.de-fora', { src: p.iconeUrl, width: 16, height: 16, alt: '' }) : img(p.icone, 16));
const fixarOuDesafixar = (chave) => (estaFixado(chave)
  ? { rotulo: tr('Desafixar da &barra de tarefas'), acao: () => desafixar(chave) }
  : { rotulo: tr('Fixar na &barra de tarefas'), acao: () => fixar(chave) });

async function fecharTodas(js) {
  for (const j of js.slice()) if (!(await j.fechar())) break;
}

/* ---------- Arrastar para reorganizar a barra ---------- */

/*
 * Os botões da barra mudam de lugar arrastando, como no Windows de hoje: o botão troca de lugar
 * com o vizinho quando o ponteiro passa do meio dele, e soltar grava a ordem nova. A ordem dos
 * fixados fica guardada (barra.fixados); a das janelas e a dos programas abertos que não estão
 * fixados vale até o Retro Computer fechar.
 */
let redesenharDepois = false;
let proximaPosicao = 0;
const posicaoJanela = new Map(); // a janela (ou o id da do Linux) -> a posição na barra
let ordemGrupos = new Map(); // no modo só com ícones: a chave do grupo -> a posição

/** A chave de uma janela na ordem da barra (as do Linux são refeitas a cada leitura: vale o id). */
const chaveJanela = (j) => (j.nativa ? 'nativa:' + j.id : j);

/** As janelas na ordem da barra: as novas no fim, as arrastadas onde ficaram. */
function emOrdem(js) {
  for (const j of js) if (!posicaoJanela.has(chaveJanela(j))) posicaoJanela.set(chaveJanela(j), proximaPosicao++);
  // As que fecharam saem da conta.
  const vivas = new Set(js.map(chaveJanela));
  for (const k of [...posicaoJanela.keys()]) if (!vivas.has(k)) posicaoJanela.delete(k);
  return js.slice().sort((a, b) => posicaoJanela.get(chaveJanela(a)) - posicaoJanela.get(chaveJanela(b)));
}

/** Um botão da barra que se reorganiza arrastando (reorganizar.js); a barra se refaz no fim, se mudou no meio. */
const reorganizavel = (b, faixa, aoSoltar) => reorganizavelFaixa(b, faixa, aoSoltar, {
  depois: (soltou) => { if (redesenharDepois || !soltou) { redesenharDepois = false; desenharTarefas(); } },
});

/** Grava a ordem nova dos fixados (os que não estão na barra agora, como um programa removido, ficam no fim). */
function gravarFixados(chaves) {
  const atuais = fixados();
  const novos = [...chaves.filter((k) => atuais.includes(k)), ...atuais.filter((k) => !chaves.includes(k))];
  if (novos.join('\n') === atuais.join('\n')) return desenharTarefas();
  return definirConfig({ barra: { fixados: novos } });
}

/* ---------- Os botões das janelas ---------- */

/** A janela está na frente? (As do Linux dizem; as do Retro Computer, só com ele na frente.) */
const naFrente = (j, ativa) => (j.nativa ? j.ativa : j === ativa && !j.minimizada);

function desenharTarefas() {
  if (!tarefas || !estado.config) return;
  // No meio de um arrasto, a barra só é refeita depois de soltar (o botão arrastado sumiria).
  if (arrastando()) { redesenharDepois = true; return; }
  // Com um programa do Linux na frente, nenhuma janela do Retro Computer fica apertada.
  const ativa = retroAtivo() ? janelaAtiva() : null;
  // As janelas dos programas do Linux (modo sistema) vêm depois das do Retro Computer.
  // Só as janelas da área de trabalho de agora (as do Linux ficam em todas).
  const visiveis = emOrdem([...lista.filter((j) => !j.dialogo && daAreaAtual(j)), ...janelasNativas()]);
  const icones = modoBotoes() === 'icones';
  // Com o nome: os fixados ficam à parte, como a Inicialização rápida da época.
  const rapidos = icones ? [] : fixados().map(programaDe).filter(Boolean);
  fixadosEl.replaceChildren(...rapidos.map((p) => {
    const b = h('button.prog.rapido', { title: p.nome, dataset: { chave: p.chave } }, iconeDe(p));
    reorganizavel(b, fixadosEl, (bs) => gravarFixados(bs.map((x) => x.dataset.chave)));
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
  if (icones) desenharGrupos(visiveis, ativa);
  else tarefas.replaceChildren(...visiveis.map((j) => botaoJanela(j, ativa, tarefas, (bs) => bs.forEach((x, i) => posicaoJanela.set(chaveJanela(x.janela), i)))));
  desenharOutras(visiveis, ativa, icones);
  desenharAreas();
}

/* ---------- As áreas de trabalho ---------- */

let areasEl = null;
export const nomeArea = (n) => tr('Área de trabalho {n}', { n: n + 1 });

/** O submenu "Mover para": as outras áreas e uma nova. */
export function itensMoverPara(j) {
  const itens = [];
  for (let n = 0; n < numAreas(); n++) if (n !== (j.area || 0)) itens.push({ rotulo: nomeArea(n).replace(/&/g, '&&'), acao: () => moverParaArea(j, n) });
  if (itens.length) itens.push({ separador: true });
  itens.push({ rotulo: tr('&Nova área de trabalho'), desativado: numAreas() >= MAX_AREAS, acao: () => moverParaArea(j, 'nova') });
  return itens;
}

/** O seletor das áreas na barra (como o "pager" da época): um botão por área, só com mais de uma. */
function desenharAreas() {
  if (!areasEl) return;
  const n = numAreas();
  areasEl.hidden = n < 2;
  if (n < 2) { areasEl.replaceChildren(); return; }
  const agora = areaAtual();
  areasEl.replaceChildren(...Array.from({ length: n }, (_, i) => {
    const qtd = lista.filter((j) => !j.dialogo && !j.fechada && (j.area || 0) === i).length;
    const b = h('button.area' + (i === agora ? '.apertado' : ''), { title: `${nomeArea(i)} · ${tr('{n} janela(s)', { n: qtd })}`, 'aria-pressed': String(i === agora) }, String(i + 1));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => irParaArea(i));
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirMenu([
        { rotulo: tr('&Ir para esta área'), negrito: true, desativado: i === agora, acao: () => irParaArea(i) },
        { rotulo: tr('Vi&são das tarefas'), atalho: tr('Logotipo+Tab'), acao: () => import('./areas.js').then((m) => m.abrirVisao()) },
        { separador: true },
        { rotulo: tr('&Nova área de trabalho'), desativado: numAreas() >= MAX_AREAS, acao: () => novaArea() },
        { rotulo: tr('&Fechar esta área de trabalho'), acao: () => fecharArea(i) },
      ], { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
}

/** O botão de uma janela na barra (faixa: a lista de botões; aoSoltar: a ordem nova, depois de arrastar). */
function botaoJanela(j, ativa, faixa, aoSoltar) {
  const pj = j.nativa && j.programa ? programaDe(j.programa) : null;
  const b = h('button', { title: j.titulo }, pj ? iconeDe(pj) : j.icone ? img(j.icone, 16) : null, h('span', j.titulo));
  b.janela = j;
  reorganizavel(b, faixa, aoSoltar);
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
      ...(j.nativa ? [] : [{ separador: true }, { rotulo: tr('Mo&ver para'), sub: () => itensMoverPara(j) }]),
      ...(p ? [{ separador: true }, fixarOuDesafixar(p.chave)] : []),
      { separador: true },
      { rotulo: tr('&Fechar'), negrito: true, atalho: 'Alt+F4', acao: () => j.fechar() },
    ], { x: e.clientX, y: e.clientY, acima: true });
  });
  return b;
}

/**
 * Só os ícones, como no Windows de hoje: um botão por programa (os fixados primeiro, na ordem
 * deles), com uma marca embaixo quando há janela aberta. Com várias janelas, o clique mostra a lista.
 */
function desenharGrupos(visiveis, ativa, { alvo = tarefas, comFixados = true, ordem = null } = {}) {
  const grupos = new Map();
  for (const k of comFixados ? fixados() : []) {
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
      grupos.set(chaveJanela(j), { p: { nome: j.titulo, icone: j.icone || 'programa' }, janelas: [j] });
    }
  }
  // A ordem arrastada (até fechar o Retro Computer); os grupos novos vão para o fim.
  const naturais = [...grupos.keys()];
  const mapa = ordem || ordemGrupos;
  const pos = (k) => (mapa.has(k) ? mapa.get(k) : 1e6 + naturais.indexOf(k));
  const chaves = naturais.slice().sort((a, b) => pos(a) - pos(b));
  alvo.replaceChildren(...chaves.map((k) => {
    const g = grupos.get(k);
    const js = g.janelas;
    const b = h('button.prog', { title: js.length === 1 ? js[0].titulo : g.p.nome }, iconeDe(g.p));
    b.grupo = k;
    // Na barra de outra tela, a ordem é só dela (os fixados ficam na principal).
    reorganizavel(b, alvo, (bs) => {
      if (ordem) { bs.forEach((x, i) => ordem.set(x.grupo, i)); return desenharTarefas(); }
      ordemGrupos = new Map(bs.map((x, i) => [x.grupo, i]));
      gravarFixados(bs.map((x) => x.grupo).filter((x) => typeof x === 'string'));
    });
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

/* ---------- A barra nas outras telas ---------- */

/*
 * Com as duas telas (e a opção de Painel › Barra de tarefas, ligada por padrão), cada outra tela tem
 * a sua barra, como a "barra de tarefas em todas as telas" do Windows: o Iniciar, os botões das
 * janelas que estão nela e o relógio. A principal continua com todas as janelas, os fixados, a busca
 * e a bandeja (como a escolha do Windows "a barra principal e a barra em que a janela está aberta").
 */
export const barraEmTodas = () => !(estado.config.barra && estado.config.barra.todasTelas === false);
// No tema Mac, a barra de tarefas não aparece (a barra de menus do alto fica no lugar dela).
const querOutras = () => barraEmTodas() && !temaMac();
let outras = []; // { tela, el, tarefas, relogio }
let ligadaNasOutras = null;
const ordemOutras = new Map(); // só com os ícones: a ordem arrastada dos grupos de cada tela (pelo lugar dela)

/** Monta (ou desmonta) a barra de cada tela que não é a principal. */
function montarOutras() {
  for (const o of outras) o.el.remove();
  outras = [];
  ligadaNasOutras = querOutras();
  definirBarraNasOutras(ligadaNasOutras);
  if (!variasTelas() || !ligadaNasOutras) return;
  const antesDe = document.getElementById('camada-menus');
  for (const t of listaTelas()) {
    if (t.principal) continue;
    const faixa = h('div.tarefas');
    const rel = h('span.relogio', { style: { cursor: 'pointer' } });
    rel.addEventListener('mousedown', (e) => { if (e.button === 0) { e.preventDefault(); alternarCalendario(rel); } });
    const el = h('div.barra-tela', { style: { left: t.x + 'px', width: t.w + 'px', top: `calc(${t.y + t.h}px - var(--altura-barra))` } },
      botaoIniciar(false), h('div.sep-barra'), faixa, h('div.bandeja', rel));
    el.addEventListener('contextmenu', menuDaBarra);
    antesDe.before(el);
    outras.push({ tela: t, el, tarefas: faixa, relogio: rel });
  }
  tique();
}

/** Os botões das janelas de cada outra tela (visiveis: todas, na ordem da barra). */
function desenharOutras(visiveis, ativa, icones) {
  for (const o of outras) {
    const js = visiveis.filter((j) => !j.nativa && j.tela && mesmaTela(j.tela(), o.tela));
    o.tarefas.classList.toggle('so-icones', icones);
    if (icones) {
      const k = `${o.tela.x},${o.tela.y}`;
      if (!ordemOutras.has(k)) ordemOutras.set(k, new Map());
      desenharGrupos(js, ativa, { alvo: o.tarefas, comFixados: false, ordem: ordemOutras.get(k) });
    } else {
      o.tarefas.replaceChildren(...js.map((j) => botaoJanela(j, ativa, o.tarefas, (bs) => reordenarParte(bs.map((x) => x.janela)))));
    }
  }
}

/** A ordem nova de uma parte das janelas (a barra de outra tela): elas trocam de lugar entre si na ordem de todas. */
function reordenarParte(js) {
  const pos = js.map((j) => posicaoJanela.get(chaveJanela(j))).sort((a, b) => a - b);
  js.forEach((j, i) => posicaoJanela.set(chaveJanela(j), pos[i]));
}

/** O Iniciar da tela da janela da frente (a tecla do logotipo e o Ctrl+Esc abrem o menu lá). */
function iniciarDaFrente() {
  if (temaMac()) return document.querySelector('#barra-mac .bm-logo') || btIniciar;
  const j = janelaAtiva();
  const t = j && !j.minimizada && j.tela ? j.tela() : null;
  const o = t && outras.find((x) => mesmaTela(x.tela, t));
  return o ? o.el.querySelector('.bt-iniciar') : btIniciar;
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
    estaNoIniciar(chave)
      ? { rotulo: tr('Desafixar do menu &Iniciar'), acao: () => desafixarDoIniciar(chave) }
      : { rotulo: tr('Fixar no menu &Iniciar'), acao: () => fixarNoIniciar(chave), desativado: !programaDe(chave) },
  ];
}

// O botão direito num item do próprio menu Iniciar: escondê-lo e personalizar o menu.
const contextoItem = (id) => () => [
  { rotulo: tr('&Não mostrar no menu Iniciar'), acao: () => definirConfig({ iniciar: { ocultos: [...new Set([...(cfgIniciar().ocultos || []), id])] } }) },
  { rotulo: tr('&Personalizar o menu Iniciar…'), acao: () => abrir('painel', { secao: 'barra', aba: 1 }) },
];

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
        prog('agenda', tr('Agenda'), 'calendario'),
        prog('transferencia', tr('Área de transferência'), 'transferencia'),
        prog('bloco', tr('Bloco de notas'), 'bloco'),
        prog('calculadora', tr('Calculadora'), 'calculadora'),
        prog('captura', tr('Captura de tela'), 'captura'),
        prog('diario', tr('Diário de trabalho'), 'diario'),
        prog('scanner', tr('Digitalizar'), 'scanner'),
        prog('discos', tr('Discos'), 'discos'),
        prog('dos', tr('DOS'), 'dos'),
        prog('emojis', tr('Emojis'), 'emoji'),
        prog('foco', tr('Foco (Pomodoro)'), 'foco'),
        prog('pdf', tr('Ferramentas de PDF'), 'pdf'),
        prog('leitorpdf', tr('Leitor de PDF'), 'leitor-pdf'),
        prog('laboratorio', tr('Laboratório de programação'), 'codigo'),
        prog('mac', tr('Mac Plus'), 'mac'),
        prog('caracteres', tr('Mapa de caracteres'), 'caracteres'),
        prog('monitor', tr('Monitor do sistema'), 'monitor'),
        prog('notas', tr('Notas autoadesivas'), 'notas'),
        // A nuvem pelo rclone é só do Linux.
        ...(estado.config.plataforma === 'linux' ? [prog('nuvem', tr('Nuvem'), 'nuvem')] : []),
        prog('prompt', tr('Prompt de comando'), 'prompt'),
        prog('receber', tr('Receber do celular'), 'celular'),
        prog('midia', tr('Reprodutor de mídia'), 'reprodutor'),
        prog('imagens', tr('Visualizador de imagens'), 'imagens'),
        {
          rotulo: tr('Jogos'), icone: 'jogos', sub: () => [
            prog('paciencia', tr('Paciência'), 'paciencia'),
            prog('campo-minado', tr('Campo Minado'), 'campo-minado'),
            prog('breakout', 'Breakout', 'breakout'),
            prog('damas', tr('Damas'), 'damas'),
            prog('xadrez', tr('Xadrez'), 'xadrez'),
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
    // No Linux, os programas do Windows instalados pelo WINE (os atalhos que os instaladores criaram).
    ...(estado.config.plataforma === 'linux' ? [{
      rotulo: tr('Programas do Windows'), icone: 'pasta-programas', sub: async () => {
        const lista = await retro.wine.programas().catch(() => []);
        return lista.length
          ? lista.map((p) => ({ rotulo: p.nome.replace(/&/g, '&&'), icone: 'executavel', acao: () => retro.wine.abrirPrograma(p.id).catch(() => { }) }))
          : [{ rotulo: tr('(Vazio)'), desativado: true }];
      },
    }] : []),
    { separador: true },
    prog('navegador', tr('Navegador'), 'navegador'),
    // Com o Firefox como padrão, o Navegador daqui (o dos sites instalados como programas) continua à mão.
    ...(firefoxPadrao() ? [{ rotulo: tr('Navegador do Retro Computer'), icone: 'internet', acao: () => abrir('navegador', { interno: true }) }] : []),
    prog('correio', tr('E-mail'), 'correio'),
    prog('claude', tr('Claude'), 'claude'),
    prog('codex', tr('Codex'), 'codex'),
    prog('assistente', tr('Assistente do Retro'), 'assistente'),
    prog('explorador', tr('Explorador de arquivos'), 'computador', () => abrir('explorador', { pasta: pastaDocs() })),
    ...(craft.length ? [] : [{ rotulo: tr('Instalar programas…'), icone: 'programas-caixa', acao: () => abrir('programas') }]),
  ];
}

function itensDocumentos() {
  const recentes = (guardaRecentes() ? estado.config.recentes || [] : []).slice(0, 15).map((rel) => ({
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
  if (document.querySelector('#iniciar.apertado, .bt-iniciar.apertado, #barra-mac .bm-logo.apertado')) fecharMenus();
  else abrirIniciar(iniciarDaFrente());
}

/** Abre o menu Iniciar sobre o botão bt (o da barra principal, ou o de outra tela). */
export async function abrirIniciar(bt = btIniciar) {
  const r = bt.getBoundingClientRect();
  const mac = temaMac();
  const pequenos = mac || !!cfgIniciar().pequenos;
  // Com os ícones pequenos, como no Windows 95, o menu fica mais baixo e sem a faixa do lado.
  const el = h('div.menu.iniciar.com-icones' + (pequenos ? '.pequenos' : ''));
  const itens = h('div.itens');
  if (!pequenos) el.append(h('div.faixa', h('span', h('b', 'Retro'), ' Computer')));
  el.append(itens);
  bt.classList.add('apertado');
  const se = (id, item) => (ocultoNoIniciar(id) ? [] : [{ ...item, contexto: contextoItem(id) }]);
  // Os programas fixados pelo usuário ficam no alto, como no Windows de depois.
  const fixos = fixadosIniciar().map(programaDe).filter(Boolean)
    .map((p) => ({ rotulo: p.nome.replace(/&/g, '&&'), icone: p.icone, iconeUrl: p.iconeUrl || null, acao: p.abrir, contexto: contextoPrograma(p.chave, p.abrir) }));
  // A loja (os Craft e, no Linux, os programas do Flathub), à vista no alto, como o Windows Update da época.
  const loja = se('loja', { rotulo: tr('Lo&ja de programas'), icone: 'programas-caixa', acao: () => abrir('programas') });
  // O menu do logotipo do tema Mac começa pelo "Sobre", como o da época.
  const sobre = mac ? [{ rotulo: tr('&Sobre o Retro Computer'), icone: 'computador', acao: () => abrir('painel', { secao: 'sobre' }) }, { separador: true }] : [];
  await abrirMenu([
    ...sobre,
    ...fixos,
    ...(fixos.length ? [{ separador: true }] : []),
    ...loja,
    ...(loja.length ? [{ separador: true }] : []),
    { rotulo: tr('&Programas'), icone: 'pasta-programas', sub: itensProgramas },
    ...se('documentos', { rotulo: tr('&Documentos'), icone: 'documentos', sub: itensDocumentos }),
    ...se('configuracoes', {
      rotulo: tr('&Configurações'), icone: 'configuracoes', sub: () => [
        { rotulo: tr('&Painel de controle'), icone: 'painel', acao: () => abrir('painel') },
        { rotulo: tr('&Adicionar ou remover programas'), icone: 'programas-caixa', acao: () => abrir('programas') },
        { rotulo: tr('Apa&rência'), icone: 'aparencia', acao: () => abrir('painel', { secao: 'aparencia' }) },
        { rotulo: tr('&Barra de tarefas e menu Iniciar…'), icone: 'barra-tarefas', acao: () => abrir('painel', { secao: 'barra' }) },
      ],
    }),
    ...se('localizar', { rotulo: tr('&Localizar'), icone: 'localizar', acao: () => abrir('localizar') }),
    ...se('ajuda', { rotulo: tr('&Ajuda'), icone: 'ajuda', acao: () => abrir('ajuda') }),
    ...se('executar', { rotulo: tr('&Executar…'), icone: 'executar', acao: () => abrir('executar') }),
    { separador: true },
    // Sem senha ainda, o item leva ao Painel de controle › Senhas para criar uma.
    ...se('bloquear', { rotulo: tr('&Bloquear o computador'), icone: 'chave', acao: () => (podeBloquear() ? bloquear() : abrir('painel', { secao: 'senhas' })) }),
    // Com mais de um usuário, o logoff (com o nome de quem está usando, como na época).
    ...(variosPerfis() ? [{ rotulo: tr('Fazer l&ogoff de {nome}…', { nome: nomeDoPerfil(perfilAtual()).replace(/&/g, '&&') }), icone: 'usuario', acao: () => abrir('logoff') }] : []),
    // O D é dos Documentos: o Desligar fica com o G.
    { rotulo: tr('Desli&gar…'), icone: 'desligar', acao: () => abrir('desligar') },
  ], {
    x: r.left,
    y: mac ? r.bottom : r.top + 1,
    acima: !mac,
    elemento: el,
    corpo: itens,
    tamIcone: pequenos ? 16 : 32,
    aoFechar: () => bt.classList.remove('apertado'),
  });
}

// A tecla do sistema (Ctrl+Esc) abre o menu Iniciar, como nos computadores da época.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Escape') {
    e.preventDefault();
    abrirIniciar(iniciarDaFrente());
  }
});

export { caminhoTela };
