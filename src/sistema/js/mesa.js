/*
 * A área de trabalho: os atalhos do sistema (Meu computador, Meus documentos,
 * Lixeira, Claude, Prompt de comando, os programas instalados) e os arquivos
 * da pasta "Área de trabalho" do disco.
 */
import { tipoDe, juntar } from './util.js';
import { VistaIcones } from './vista.js';
import { abrirMenu } from './menus.js';
import { temaMac, aoMudarTema } from './tema.js';
import { estado, abrir, abrirArquivo, eventos, definirConfig, instalado, pastaMesa, pastaDocs, app, iconeDaPasta } from './sistema.js';
import { menuDeItens, menuDoFundo, editarRotulo, renomear, excluir } from './arquivos.js';
import { confirmar } from './dialogos.js';
import { tocar } from './sons.js';
import { tr, marcar } from './idioma.js';
import { nomeNativo, iconeNativo, iconeNativoJa, abrirNativo } from './nativos.js';
import { estaFixado, fixar, desafixar, programaDe, itemDeAtalho } from './barra.js';
import { novaNota } from './notas.js';

let vista;
let lixeiraCheia = false;

const ATALHOS = {
  'meu-computador': { rotulo: marcar('Meu computador'), icone: 'computador', abrir: () => abrir('explorador', { pasta: '::computador' }) },
  'meus-documentos': { rotulo: marcar('Meus documentos'), icone: 'documentos', get alvo() { return pastaDocs(); }, abrir: () => abrir('explorador', { pasta: pastaDocs() }) },
  lixeira: { rotulo: marcar('Lixeira'), icone: 'lixeira', alvo: '::lixeira', abrir: () => abrir('lixeira') },
  navegador: { rotulo: marcar('Navegador'), icone: 'navegador', abrir: () => abrir('navegador') },
  correio: { rotulo: marcar('E-mail'), icone: 'correio', abrir: () => abrir('correio') },
  claude: { rotulo: marcar('Claude'), icone: 'claude', abrir: () => abrir('claude') },
  codex: { rotulo: marcar('Codex'), icone: 'codex', abrir: () => abrir('codex') },
  dot: { rotulo: marcar('Dot'), icone: 'internet', abrir: () => abrir('dot') },
  prompt: { rotulo: marcar('Prompt de comando'), icone: 'prompt', abrir: () => abrir('prompt') },
  bloco: { rotulo: marcar('Bloco de notas'), icone: 'bloco', abrir: () => abrir('bloco') },
  foco: { rotulo: marcar('Foco'), icone: 'foco', abrir: () => abrir('foco') },
  programas: { rotulo: marcar('Loja de programas'), icone: 'programas-caixa', abrir: () => abrir('programas') },
};

function atalhoDe(chave) {
  if (ATALHOS[chave]) return ATALHOS[chave];
  if (chave.startsWith('nativo:')) {
    const id = chave.slice(7);
    return { rotulo: nomeNativo(id), semTraducao: true, icone: 'programa', iconeUrl: iconeNativoJa(id), abrir: () => abrirNativo(id), atalhoSeta: true };
  }
  if (chave.startsWith('craft:')) {
    const p = instalado(chave.slice(6));
    if (!p) return null;
    return { rotulo: p.nome, icone: p.icone || 'programa', abrir: () => abrir(chave), atalhoSeta: true };
  }
  if (chave.startsWith('webapp:')) {
    const w = (estado.config.webapps || []).find((x) => x.id === chave.slice(7));
    if (!w) return null;
    return { rotulo: w.nome, semTraducao: true, icone: 'internet', iconeUrl: w.icone || null, abrir: () => abrir(chave), atalhoSeta: true };
  }
  // Os outros programas do Retro Computer (pelo botão direito no Iniciar): o atalho para eles.
  const p = app(chave);
  if (p) return { rotulo: p.nome, icone: p.icone || 'programa', abrir: () => abrir(chave), atalhoSeta: true };
  return null;
}

/** Os ícones do sistema que Painel › Aparência › Área de trabalho liga e desliga, na ordem da mesa. */
export const ICONES_SISTEMA = ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude', 'codex', 'dot', 'programas', 'prompt', 'painel', 'bloco', 'foco'];
// Os ícones da área de trabalho que não são programas (não viram arquivo de atalho).
const NAO_PROGRAMAS = ['meu-computador', 'meus-documentos', 'lixeira'];
export const ICONES_PADRAO = ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude', 'codex', 'dot'];
export const naMesa = (chave) => ((estado.config.mesa && estado.config.mesa.atalhos) || []).includes(chave);

/** Liga e desliga os ícones do sistema de uma vez, mantendo os outros atalhos e a ordem. */
export async function definirIconesSistema(ligados) {
  const atuais = (estado.config.mesa && estado.config.mesa.atalhos) || [];
  const outros = atuais.filter((k) => !ICONES_SISTEMA.includes(k));
  const atalhos = [...ICONES_SISTEMA.filter((k) => ligados.includes(k)), ...outros];
  estado.config.mesa.atalhos = atalhos;
  await definirConfig({ mesa: { atalhos } });
  await atualizar();
}

export async function montarMesa() {
  const raiz = document.getElementById('mesa');
  vista = new VistaIcones(raiz, {
    modo: 'mesa',
    pastaSoltar: pastaMesa(),
    // No tema Mac, os ícones começam do canto de cima, à direita, e a Lixeira fica no de baixo.
    espelhada: () => temaMac(),
    noCanto: 'lixeira',
    aoAbrir: (it) => {
      if (it.sistema) return atalhoDe(it.chave).abrir();
      if (it.pasta) return abrir('explorador', { pasta: it.rel });
      return abrirArquivo(it.rel);
    },
    aoMenu: (sel, e) => menu(sel, e),
    aoRenomear: (it) => renomearItem(it),
    aoExcluir: (itens) => {
      const rels = itens.filter((i) => i.rel).map((i) => i.rel);
      if (rels.length) excluir(rels);
    },
    aoMover: (it, pos) => {
      const k = chavePosicoes();
      estado.config.mesa[k] = { ...(estado.config.mesa[k] || {}), [it.chave]: pos };
      definirConfig({ mesa: { [k]: { [it.chave]: pos } } });
    },
  });
  await atualizar();
  // Os ícones dos programas do computador principal chegam depois (o processo principal os procura).
  const nativos = ((estado.config.mesa && estado.config.mesa.atalhos) || []).filter((k) => k.startsWith('nativo:'));
  if (nativos.length) Promise.all(nativos.map((k) => iconeNativo(k.slice(7)))).then(() => atualizar());
  retro.disco.aoMudar((pastas) => {
    if (pastas.includes(pastaMesa()) || pastas.includes('')) atualizar();
    if (pastas.includes('::lixeira')) atualizarLixeira();
  });
  eventos.on('programas', () => atualizar());
  aoMudarTema(() => atualizar());
  window.addEventListener('resize', () => vista.posicionarMesa());
  // Com as duas telas, o fundo da outra tela também é a área de trabalho (o botão direito).
  document.getElementById('tela').addEventListener('contextmenu', (e) => {
    if (!e.target.classList || !e.target.classList.contains('fundo-tela')) return;
    e.preventDefault();
    menu([], e);
  });
  atualizarLixeira();
  raiz.focus();
}

async function atualizarLixeira() {
  const itens = await retro.disco.lixeira().catch(() => []);
  const cheia = itens.length > 0;
  if (cheia !== lixeiraCheia) {
    lixeiraCheia = cheia;
    ATALHOS.lixeira.icone = cheia ? 'lixeira-cheia' : 'lixeira';
    atualizar();
  }
}

/** Onde ficam as posições dos ícones: as do tema Mac (a mesa espelhada) são outras. */
const chavePosicoes = () => (temaMac() ? 'posicoesMac' : 'posicoes');

export async function atualizar(selecionarChaves) {
  const c = estado.config;
  const posicoes = (c.mesa && c.mesa[chavePosicoes()]) || {};
  const atalhos = ((c.mesa && c.mesa.atalhos) || []).map((k) => ({ k, a: atalhoDe(k) })).filter((x) => x.a);
  const itens = atalhos.map(({ k, a }) => ({
    chave: k, rotulo: a.semTraducao ? a.rotulo : tr(a.rotulo), icone: a.icone, iconeUrl: a.iconeUrl, sistema: true, alvo: a.alvo, atalho: a.atalhoSeta,
    pos: posicoes[k], arrastavel: true,
    // Os programas (não Meu computador, Meus documentos e a Lixeira): soltos numa pasta, viram um arquivo de atalho.
    programa: !NAO_PROGRAMAS.includes(k) && !!programaDe(k),
  }));
  let arquivos = [];
  try { arquivos = await retro.disco.listar(pastaMesa()); } catch { }
  for (const f of arquivos) {
    const t = tipoDe(f.nome, f.pasta);
    const chave = 'arq:' + f.nome;
    itens.push({ chave, rotulo: f.nome, icone: f.pasta ? iconeDaPasta(f.rel) : t.icone, rel: f.rel, pasta: f.pasta, alvo: f.pasta ? f.rel : null, pos: posicoes[chave], ...(f.atalho ? itemDeAtalho(f) : {}) });
  }
  vista.desenhar(itens, { selecionarChaves });
}

async function renomearItem(it) {
  if (it.sistema) return;
  const i = vista.itens.indexOf(it);
  let novo = await editarRotulo(vista.els[i].itemEl, it.rotulo, { semExtensao: !it.pasta });
  if (!novo) return;
  // O atalho mostra o nome sem o ".atalho": ele volta no nome do arquivo.
  if (it.extOculta && !novo.toLowerCase().endsWith(it.extOculta.toLowerCase())) novo += it.extOculta;
  const rel = await renomear(it.rel, novo);
  if (rel) {
    const k = chavePosicoes();
    const posicoes = { ...(estado.config.mesa[k] || {}) };
    if (posicoes[it.chave]) {
      const mudanca = { [it.chave]: null, ['arq:' + novo]: posicoes[it.chave] };
      posicoes['arq:' + novo] = posicoes[it.chave];
      delete posicoes[it.chave];
      estado.config.mesa[k] = posicoes;
      definirConfig({ mesa: { [k]: mudanca } });
    }
    atualizar(['arq:' + novo]);
  }
}

function menu(sel, e) {
  const pos = { x: e.clientX, y: e.clientY };
  if (!sel.length) {
    return abrirMenu([
      {
        rotulo: tr('&Organizar ícones'), sub: () => [
          { rotulo: tr('Por &nome'), acao: () => organizar('nome') },
          { rotulo: tr('Por &tipo'), acao: () => organizar('tipo') },
        ],
      },
      { rotulo: tr('A&linhar ícones'), acao: () => organizar('alinhar') },
      { rotulo: tr('&Atualizar'), acao: () => atualizar() },
      ...menuDoFundo(pastaMesa(), {
        aoNovo: async (rel) => {
          const chave = 'arq:' + rel.split('/').pop();
          await atualizar([chave]);
          const it = vista.itens.find((x) => x.chave === chave);
          if (it) renomearItem(it);
        },
      }).slice(1),
      { rotulo: tr('Nova nota a&utoadesiva'), icone: 'notas', acao: () => novaNota() },
      { separador: true },
      { rotulo: tr('P&ropriedades'), acao: () => abrir('painel', { secao: 'aparencia' }) },
    ], pos);
  }
  if (sel.length === 1 && sel[0].sistema) {
    const it = sel[0];
    const a = atalhoDe(it.chave);
    const itens = [{ rotulo: tr('&Abrir'), negrito: true, acao: a.abrir }];
    if (it.chave === 'meu-computador' || it.chave === 'meus-documentos') {
      itens.push({ rotulo: tr('Expl&orar'), acao: a.abrir });
      itens.push({ rotulo: tr('&Mostrar no computador principal'), acao: () => retro.disco.mostrar(it.chave === 'meus-documentos' ? pastaDocs() : '') });
    }
    if (it.chave === 'lixeira') {
      itens.push({ rotulo: tr('&Esvaziar Lixeira'), desativado: !lixeiraCheia, acao: esvaziarLixeira });
    }
    if (it.chave === 'codex') itens.push({ rotulo: tr('Conta e opções do Codex…'), acao: () => abrir('codex', { configurar: true }) });
    if (it.chave === 'claude') {
      itens.push({ rotulo: tr('Configurar a &chave de API…'), acao: () => abrir('painel', { secao: 'claude' }) });
    }
    // O mesmo programa na barra de tarefas (Meu computador é o Explorador de arquivos).
    const naBarra = it.chave === 'meu-computador' ? 'explorador' : it.chave === 'meus-documentos' ? null : it.chave;
    if (naBarra) {
      itens.push({ separador: true }, estaFixado(naBarra)
        ? { rotulo: tr('Desafixar da &barra de tarefas'), acao: () => desafixar(naBarra) }
        : { rotulo: tr('Fixar na &barra de tarefas'), acao: () => fixar(naBarra) });
    }
    itens.push({ separador: true });
    itens.push({ rotulo: tr('Remover da área de &trabalho'), desativado: it.chave === 'meu-computador' || it.chave === 'lixeira', acao: () => removerAtalho(it.chave) });
    if (it.chave === 'meu-computador') itens.push({ separador: true }, { rotulo: tr('P&ropriedades'), acao: () => abrir('painel', { secao: 'disco' }) });
    return abrirMenu(itens, pos);
  }
  const arquivos = sel.filter((s) => !s.sistema);
  return abrirMenu(menuDeItens(arquivos, { aoRenomear: renomearItem }), pos);
}

export async function esvaziarLixeira() {
  const itens = await retro.disco.lixeira();
  if (!itens.length) return;
  const texto = itens.length === 1 ? tr('Deseja mesmo apagar definitivamente "{nome}"?', { nome: itens[0].nome }) : tr('Deseja mesmo apagar definitivamente estes {n} itens?', { n: itens.length });
  const ok = await confirmar(texto + '\n\n' + tr('Depois de apagados, eles não podem ser recuperados.'), { titulo: tr('Esvaziar Lixeira'), tipo: 'aviso' });
  if (!ok) return;
  await retro.disco.esvaziarLixeira();
  tocar('lixeira');
  atualizarLixeira();
}

export function removerAtalho(chave) {
  const atalhos = (estado.config.mesa.atalhos || []).filter((k) => k !== chave);
  estado.config.mesa.atalhos = atalhos;
  definirConfig({ mesa: { atalhos } }).then(() => atualizar());
}

export async function adicionarAtalho(chave) {
  const atalhos = estado.config.mesa.atalhos || [];
  if (atalhos.includes(chave)) return;
  if (chave.startsWith('nativo:')) await iconeNativo(chave.slice(7));
  estado.config.mesa.atalhos = [...atalhos, chave];
  definirConfig({ mesa: { atalhos: estado.config.mesa.atalhos } }).then(() => atualizar());
}

/** Organiza os ícones da mesa: 'nome', 'tipo' ou 'alinhar' (o botão direito na mesa e o menu Exibir do tema Mac). */
export function organizarMesa(como) { organizar(como); }

function organizar(como) {
  const itens = vista.itens.slice();
  if (como !== 'alinhar') {
    itens.sort((a, b) => {
      if (a.sistema !== b.sistema) return a.sistema ? -1 : 1;
      if (a.sistema) return 0;
      if (a.pasta !== b.pasta) return a.pasta ? -1 : 1;
      if (como === 'tipo') {
        const ta = tipoDe(a.rotulo).descricao;
        const tb = tipoDe(b.rotulo).descricao;
        if (ta !== tb) return ta.localeCompare(tb, 'pt-BR');
      }
      return a.rotulo.localeCompare(b.rotulo, 'pt-BR', { numeric: true });
    });
  }
  for (const it of itens) it.pos = null;
  const kp = chavePosicoes();
  const apagar = Object.fromEntries(Object.keys(estado.config.mesa[kp] || {}).map((k) => [k, null]));
  estado.config.mesa[kp] = {};
  vista.desenhar(itens);
  definirConfig({ mesa: { [kp]: apagar } });
}

export { juntar };
