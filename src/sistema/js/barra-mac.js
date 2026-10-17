/*
 * A barra de menus no alto da tela, no tema Mac clássico (tema.js), inspirada na do Mac OS 9: à
 * esquerda, o menu do logotipo (o Iniciar) e os menus da janela da frente (a barra de menus dela sobe
 * para cá) ou, sem janela na frente, os da área de trabalho; à direita, como no Mac da época, só o
 * relógio (e o tempo do Foco, quando ligado) e o menu dos programas abertos, que mostra o da frente e
 * troca de um para outro (o "Ocultar" é o minimizar). Embaixo, à esquerda, a Faixa de controle: os
 * programas fixados na barra de tarefas, a busca (a lupa abre o campo) e os ícones da bandeja (a rede,
 * o volume, a bateria, as notificações), com a ponta que a recolhe. Com o tema do PC, tudo volta para
 * a barra de tarefas.
 */
import { h, img } from './util.js';
import { abrirMenu, barraDeMenus, fecharMenus } from './menus.js';
import { lista, eventos as evJanelas, janelaAtiva, emCascata, lado, desativarJanelas, daAreaAtual, novaArea, numAreas, MAX_AREAS } from './janelas.js';
import { janelasNativas, eventosNativas } from './janelas-nativas.js';
import { estado, abrir, eventos as evSistema, definirConfig, pastaDocs, pastaMesa } from './sistema.js';
import { tr } from './idioma.js';
import { temaMac, aoMudarTema } from './tema.js';
import { abrirIniciar, programaDe, desafixar, pecasDaBarra, devolverPecas } from './barra.js';
import { esvaziarLixeira, organizarMesa, atualizar as atualizarMesa } from './mesa.js';
import { novaPasta, novoTexto, colar, transferencia } from './arquivos.js';
import { bloquear, podeBloquear } from './bloqueio.js';
import { variosPerfis } from './perfis.js';
import { erro } from './dialogos.js';

let barra = null;
let btLogo = null;
let menus = null;
let direita = null;
let btApp = null;
let menusMesa = null;
let faixa = null;
let modulos = null; // a busca e a bandeja, na Faixa de controle

export const logoDaBarra = () => btLogo;

/** Monta a barra de menus e a Faixa de controle (uma vez) e acompanha o tema, as janelas e os fixados. */
export function montarBarraMac() {
  barra = document.getElementById('barra-mac');
  faixa = document.getElementById('faixa-controle');
  if (!barra || !faixa) return;
  btLogo = h('button.bm-logo', { dataset: { abreMenu: '1' }, title: tr('Clique aqui para começar.') }, img('logo', 16));
  btLogo.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (btLogo.classList.contains('apertado')) fecharMenus();
    else abrirIniciar(btLogo);
  });
  menus = h('div.bm-menus');
  direita = h('div.bm-direita');
  btApp = h('div.bm-app', { dataset: { abreMenu: '1' } });
  btApp.addEventListener('mousedown', (e) => { e.preventDefault(); if (!btApp.classList.contains('aberto')) menuDosProgramas(); });
  barra.append(btLogo, menus, h('div.bm-espaco'), direita, btApp);
  menusMesa = barraDeMenus(definicaoMesa());
  modulos = h('div.fc-modulos');
  prepararBusca();

  // No tema Mac, o clique na mesa (ou no fundo da outra tela) leva a área de trabalho para a frente.
  document.getElementById('mesa').addEventListener('pointerdown', (e) => { if (temaMac() && !e.target.closest('.item')) desativarJanelas(); });
  document.getElementById('tela').addEventListener('pointerdown', (e) => { if (temaMac() && e.target.classList.contains('fundo-tela')) desativarJanelas(); });

  evJanelas.on('mudou', atualizar);
  eventosNativas.on('mudou', atualizar);
  evSistema.on('config', desenharFaixa);
  evSistema.on('programas', desenharFaixa);
  aoMudarTema(aplicar);
  aplicar();
}

/** O tema mudou: a busca, a bandeja e as barras de menus das janelas vão para o lugar de cada tema. */
function aplicar() {
  if (!barra) return;
  if (temaMac()) {
    const { busca, bandeja, relogio, foco, areas } = pecasDaBarra();
    // As áreas de trabalho (com mais de uma) ficam ao lado do relógio, na barra de menus.
    direita.replaceChildren(...[areas].filter(Boolean), ...foco, relogio);
    modulos.replaceChildren(...[busca, bandeja].filter(Boolean));
  } else {
    devolverPecas();
    // Cada barra de menus volta para a janela dela, logo abaixo do título.
    for (const j of lista) if (j.menubar && j.menubar.parentNode !== j.el) j.barraTitulo.after(j.menubar);
    menus.replaceChildren();
  }
  atualizar();
  desenharFaixa();
}

/** Na Faixa de controle, a busca é só a lupa: o clique abre o campo, que fecha vazio ao sair dele. */
function prepararBusca() {
  const { busca } = pecasDaBarra();
  if (!busca) return;
  const campo = busca.querySelector('input');
  busca.addEventListener('mousedown', (e) => {
    if (!temaMac() || busca.classList.contains('aberta')) return;
    e.preventDefault();
    busca.classList.add('aberta');
    campo.focus();
  });
  busca.addEventListener('focusout', () => setTimeout(() => {
    if (!busca.contains(document.activeElement) && !campo.value) busca.classList.remove('aberta');
  }, 0));
}

/** O nome e o ícone de uma janela no menu dos programas (o do programa, ou o título dela). */
function nomeDe(j) {
  const p = j.programa ? programaDe(j.programa) : null;
  return { nome: (p && p.nome) || j.titulo || tr('Programa'), icone: (p && !p.iconeUrl && p.icone) || j.icone || 'programa' };
}

let ultimaFrente = null; // a última janela comum da frente (a dona de uma caixa de diálogo aberta)

/** Os menus e o programa da frente, na barra. */
function atualizar() {
  if (!barra || !temaMac()) return;
  const j = janelaAtiva();
  let frente = j && !j.minimizada && !j.fechada ? j : null;
  // Com uma caixa de diálogo na frente, a barra continua com os menus e o nome do programa de antes.
  if (frente && frente.dialogo && !frente.menubar) frente = ultimaFrente && !ultimaFrente.fechada && lista.includes(ultimaFrente) ? ultimaFrente : null;
  else ultimaFrente = frente;
  // Sem janela na frente, os menus da área de trabalho; a janela sem menus (um Craft) fica só com o logotipo.
  const alvo = frente ? frente.menubar || null : menusMesa;
  if (alvo) { if (menus.firstChild !== alvo) menus.replaceChildren(alvo); } else menus.replaceChildren();
  const { nome, icone } = frente ? nomeDe(frente) : { nome: tr('Área de trabalho'), icone: 'computador' };
  btApp.replaceChildren(img(icone, 16), h('span', nome));
  btApp.dataset.dica = nome;
}

/* ---------- Os menus da área de trabalho (sem janela na frente) ---------- */

function definicaoMesa() {
  const novo = async (fazer) => {
    const r = await fazer(pastaMesa()).catch((e) => erro(e.message));
    if (r) atualizarMesa();
  };
  return [
    {
      rotulo: tr('&Arquivo'), itens: () => [
        { rotulo: tr('&Nova pasta'), icone: 'pasta', acao: () => novo(novaPasta) },
        { rotulo: tr('Novo &documento de texto'), icone: 'texto', acao: () => novo(novoTexto) },
        { separador: true },
        { rotulo: tr('Abrir o &Explorador'), acao: () => abrir('explorador', { pasta: pastaDocs() }) },
        { rotulo: tr('Abrir o &Prompt de comando aqui'), acao: () => abrir('prompt', { pasta: pastaMesa() }) },
        { rotulo: tr('Abrir o C&laude aqui'), acao: () => abrir('claude', { pasta: pastaMesa() }) },
        { separador: true },
        { rotulo: tr('Locali&zar…'), acao: () => abrir('localizar') },
        { rotulo: tr('&Trazer do computador principal…'), acao: () => retro.disco.importarEscolhendo(pastaMesa()).then(() => atualizarMesa()).catch((e) => erro(e.message)) },
      ],
    },
    {
      rotulo: tr('&Editar'), itens: () => [
        { rotulo: tr('&Colar'), atalho: 'Ctrl+V', desativado: !transferencia.rels.length, acao: () => colar(pastaMesa()).then(() => atualizarMesa()) },
        { separador: true },
        { rotulo: tr('Área de &transferência'), icone: 'transferencia', acao: () => abrir('transferencia') },
      ],
    },
    {
      rotulo: tr('E&xibir'), itens: () => [
        {
          rotulo: tr('&Organizar ícones'), sub: () => [
            { rotulo: tr('Por &nome'), acao: () => organizarMesa('nome') },
            { rotulo: tr('Por &tipo'), acao: () => organizarMesa('tipo') },
          ],
        },
        { rotulo: tr('A&linhar ícones'), acao: () => organizarMesa('alinhar') },
        { rotulo: tr('&Atualizar'), acao: () => atualizarMesa() },
        { separador: true },
        { rotulo: tr('&Propriedades da área de trabalho…'), acao: () => abrir('painel', { secao: 'aparencia' }) },
      ],
    },
    {
      rotulo: tr('E&special'), itens: () => [
        { rotulo: tr('&Esvaziar a Lixeira…'), icone: 'lixeira', acao: () => esvaziarLixeira() },
        { separador: true },
        { rotulo: tr('&Bloquear o computador'), icone: 'chave', acao: () => (podeBloquear() ? bloquear() : abrir('painel', { secao: 'senhas' })) },
        ...(variosPerfis() ? [{ rotulo: tr('Fazer l&ogoff…'), icone: 'usuario', acao: () => abrir('logoff') }] : []),
        { rotulo: tr('Desli&gar…'), icone: 'desligar', acao: () => abrir('desligar') },
      ],
    },
    {
      rotulo: tr('Aj&uda'), itens: () => [
        { rotulo: tr('&Ajuda do Retro Computer'), icone: 'ajuda', atalho: 'F1', acao: () => abrir('ajuda') },
        { rotulo: tr('&Sobre o Retro Computer'), icone: 'computador', acao: () => abrir('painel', { secao: 'sobre' }) },
      ],
    },
  ];
}

/* ---------- O menu dos programas abertos (no canto direito) ---------- */

async function menuDosProgramas() {
  const frente = janelaAtiva();
  // As janelas da área de trabalho de agora (as outras aparecem na Visão das tarefas).
  const js = lista.filter((j) => !j.dialogo && !j.fechada && daAreaAtual(j));
  const nativas = janelasNativas();
  const nomeFrente = frente && !frente.minimizada ? nomeDe(frente).nome : null;
  const r = btApp.getBoundingClientRect();
  btApp.classList.add('aberto');
  await abrirMenu([
    { rotulo: nomeFrente ? tr('&Ocultar "{nome}"', { nome: nomeFrente.replace(/&/g, '&&') }) : tr('&Ocultar'), desativado: !nomeFrente || frente.dialogo, acao: () => frente.minimizar() },
    { rotulo: tr('Ocultar as ou&tras'), desativado: !js.some((j) => j !== frente && !j.minimizada), acao: () => { for (const j of js) if (j !== frente) j.minimizar(); } },
    { rotulo: tr('&Mostrar todas'), desativado: !js.some((j) => j.minimizada), acao: () => { for (const j of js) if (j.minimizada) j.restaurarDoMinimizado(); if (frente) frente.focar(); } },
    { separador: true },
    ...(js.length || nativas.length
      ? [...js, ...nativas].map((j) => ({
        rotulo: j.titulo.replace(/&/g, '&&') || nomeDe(j).nome,
        icone: j.nativa ? 'programa' : nomeDe(j).icone,
        marcado: j === frente && !j.minimizada,
        acao: () => j.focar(),
      }))
      : [{ rotulo: tr('(Nenhuma janela aberta)'), desativado: true }]),
    { separador: true },
    { rotulo: tr('&Em cascata'), desativado: !js.length, acao: emCascata },
    { rotulo: tr('Lado a lado &horizontal'), desativado: !js.length, acao: () => lado(false) },
    { rotulo: tr('Lado a lado &vertical'), desativado: !js.length, acao: () => lado(true) },
    { separador: true },
    { rotulo: tr('Vi&são das tarefas'), acao: () => import('./areas.js').then((m) => m.abrirVisao()) },
    { rotulo: tr('&Nova área de trabalho'), desativado: numAreas() >= MAX_AREAS, acao: () => novaArea() },
  ], { x: r.left, y: r.bottom, aoFechar: () => btApp.classList.remove('aberto') });
}

/* ---------- A Faixa de controle (os programas fixados, a busca e a bandeja) ---------- */

// Como no Mac da época, a faixa começa recolhida (só a ponta à vista); a ponta e o Painel a abrem.
export const faixaAberta = () => !!(estado.config.barra && estado.config.barra.faixaAberta);

function desenharFaixa() {
  if (!faixa || !estado.config) return;
  if (!temaMac()) { faixa.replaceChildren(); return; }
  const progs = ((estado.config.barra || {}).fixados || []).map(programaDe).filter(Boolean);
  const botoes = h('div.fc-botoes', ...progs.map((p) => {
    const b = h('button', { title: p.nome }, p.iconeUrl ? h('img', { src: p.iconeUrl, width: 16, height: 16, alt: '' }) : img(p.icone, 16));
    b.addEventListener('mousedown', (e) => e.preventDefault());
    b.addEventListener('click', () => p.abrir());
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirMenu([
        { rotulo: tr('&Abrir'), negrito: true, acao: p.abrir },
        { rotulo: tr('Desafixar da &barra de tarefas'), acao: () => desafixar(p.chave) },
        { separador: true },
        { rotulo: tr('P&ropriedades'), acao: () => abrir('painel', { secao: 'barra' }) },
      ], { x: e.clientX, y: e.clientY, acima: true });
    });
    return b;
  }));
  botoes.hidden = !faixaAberta() || !progs.length;
  modulos.hidden = !faixaAberta();
  const ponta = h('button.fc-ponta', { title: faixaAberta() ? tr('Recolher a Faixa de controle') : tr('Abrir a Faixa de controle') });
  ponta.addEventListener('mousedown', (e) => e.preventDefault());
  ponta.addEventListener('click', () => definirConfig({ barra: { faixaAberta: !faixaAberta() } }));
  faixa.replaceChildren(botoes, modulos, ponta);
}
