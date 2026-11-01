/*
 * O Painel de controle: Aparência, Disco C:, Claude, Idioma, Teclado, Mouse, Sons, Data e hora,
 * Adicionar ou remover programas, Foco e Sobre.
 */
import { h, img, icone, tamanho, caminhoTela, rotulo, tipoDe } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, abrir, carregarConfig, avisar, abrirEndereco, programasPara, pastaDocs, adicionarPapel, removerPapel } from '../sistema.js';
import { ajustarAoConteudo, acompanharConteudo, confirmar, confirmarComPrazo, erro, info, entrada, caixaArquivo } from '../dialogos.js';
import { deslizante } from '../controles.js';
import { CORES, PADROES, FUNDO_INICIO, MODOS_PAPEL, EXTS_PAPEL, fundoCss, aplicarFundo, aplicarEscala, pixelsAutomaticos, ESCALAS, fundoParaTema } from '../aparencia.js';
import { TEMAS, temaMac } from '../tema.js';
import { ESQUEMAS, esquemaValido, variaveisDoEsquema, fundoParaEsquema } from '../esquemas.js';
import { solDoFuso, fusoDoComputador } from '../sol.js';
import { tocar } from '../sons.js';
import { esvaziarLixeira, ICONES_SISTEMA, ICONES_PADRAO, naMesa, definirIconesSistema } from '../mesa.js';
import { tr, marcar, IDIOMAS, localidade } from '../idioma.js';
import { BUSCAS, CORREIOS, paraEndereco, conferirFirefox } from './navegador.js';
import { aoMudar as aoMudarAtualizacao, reiniciarParaAtualizar } from '../atualizacao.js';
import { comSenhaAdmin } from '../admin.js';
import { abrirChaveiro } from '../chaveiro.js';
import { aplicarLuzNoturna } from '../luz-noturna.js';
import { programaDe, programasFixaveis, ITENS_INICIAR, ICONES_BANDEJA } from '../barra.js';
import { perfisInfo, atualizarPerfis, nomeDoPerfil } from '../perfis.js';
import { escolherPrograma } from '../arquivos.js';

const ITENS = [
  { chave: 'aparencia', rotulo: marcar('Aparência'), icone: 'aparencia', descricao: marcar('Muda o tema, a cor e o padrão do fundo, a tela cheia e o tamanho dos pixels.'), abrir: (args) => dialogoAparencia(args) },
  { chave: 'barra', rotulo: marcar('Barra de tarefas e menu Iniciar'), icone: 'barra-tarefas', descricao: marcar('Os programas fixados, os itens do menu Iniciar, os ícones pequenos e os documentos recentes.'), abrir: (args) => dialogoBarra(args) },
  { chave: 'disco', rotulo: marcar('Disco C:'), icone: 'disco', descricao: marcar('Mostra a pasta do disco C: no computador principal e permite trocá-la.'), abrir: () => dialogoDisco() },
  { chave: 'claude', rotulo: marcar('Claude'), icone: 'claude', descricao: marcar('Instala o Claude Code e guarda a chave de API.'), abrir: () => dialogoClaude() },
  { chave: 'internet', rotulo: marcar('Internet'), icone: 'navegador', descricao: marcar('O e-mail, a pesquisa e em qual navegador os links abrem.'), abrir: () => dialogoInternet() },
  { chave: 'idioma', rotulo: marcar('Idioma'), icone: 'internet', descricao: marcar('Escolhe o idioma do Retro Computer.'), abrir: () => dialogoIdioma() },
  { chave: 'copia', rotulo: marcar('Cópia de segurança'), icone: 'copia', descricao: marcar('Copia o disco C: para um disco externo ou outra pasta, todo dia ou toda semana.'), abrir: () => dialogoCopia() },
  { chave: 'seguranca', rotulo: marcar('Segurança'), icone: 'seguranca', descricao: marcar('A proteção do computador num lugar só: a senha, o firewall, as atualizações e a privacidade.'), abrir: () => dialogoSeguranca() },
  { chave: 'senhas', rotulo: marcar('Senhas'), icone: 'chave', descricao: marcar('A senha da tela de bloqueio e quando pedi-la.'), abrir: () => dialogoSenhas() },
  { chave: 'usuarios', rotulo: marcar('Usuários'), icone: 'usuarios', descricao: marcar('As pessoas que usam este computador, cada uma com a área de trabalho, as configurações e o disco C: próprios.'), abrir: () => dialogoUsuarios() },
  { chave: 'bluetooth', rotulo: marcar('Bluetooth'), icone: 'bluetooth', descricao: marcar('Os mouses, os teclados e os fones sem fio: parear, conectar e esquecer.'), abrir: () => import('../bluetooth.js').then((m) => m.abrirBluetooth()) },
  { chave: 'firewall', rotulo: marcar('Firewall'), icone: 'firewall', descricao: marcar('Recusa as conexões que outros computadores tentam abrir neste.'), abrir: () => dialogoFirewall(), mostrar: () => estado.config.plataforma === 'linux' },
  { chave: 'atualizacoes', rotulo: marcar('Atualizações do Linux'), icone: 'atualizacoes', descricao: marcar('As atualizações de segurança do Linux e dos programas da Loja.'), abrir: () => abrir('atualizacoes'), mostrar: () => estado.config.plataforma === 'linux' },
  { chave: 'impressoras', rotulo: marcar('Impressoras'), icone: 'impressora', descricao: marcar('As impressoras, a padrão, a fila de impressão e a página de teste.'), abrir: () => dialogoImpressoras() },
  { chave: 'teclado', rotulo: marcar('Teclado'), icone: 'teclado', descricao: marcar('O layout do teclado e um lugar para testar as teclas.'), abrir: () => dialogoTeclado() },
  { chave: 'mouse', rotulo: marcar('Mouse'), icone: 'mouse', descricao: marcar('A velocidade do ponteiro, o botão principal, a rolagem e o touchpad.'), abrir: () => dialogoMouse() },
  { chave: 'acessibilidade', rotulo: marcar('Opções de acessibilidade'), icone: 'acessibilidade', descricao: marcar('O alto contraste, a lupa, o cursor grande, os avisos visuais dos sons e as teclas de aderência.'), abrir: () => dialogoAcessibilidade() },
  { chave: 'sons', rotulo: marcar('Sons'), icone: 'sons', descricao: marcar('Os sons do sistema, a saída de som e o microfone.'), abrir: (args) => dialogoSons(args) },
  { chave: 'data', rotulo: marcar('Data e hora'), icone: 'relogio', descricao: marcar('A data, a hora e o fuso horário do computador.'), abrir: () => dialogoData() },
  { chave: 'energia', rotulo: marcar('Opções de energia'), icone: 'energia', descricao: marcar('Quando apagar a tela e suspender o computador parado, e o que a tampa do notebook faz.'), abrir: () => dialogoEnergia() },
  { chave: 'programas', rotulo: marcar('Adicionar ou remover programas'), icone: 'programas-caixa', descricao: marcar('Instala, atualiza e remove programas.'), abrir: () => abrir('programas') },
  { chave: 'padroes', rotulo: marcar('Programas padrão'), icone: 'programa', descricao: marcar('O programa que abre cada tipo de arquivo com dois cliques.'), abrir: () => dialogoPadroes() },
  { chave: 'foco', rotulo: marcar('Foco'), icone: 'foco', descricao: marcar('Abre o relógio de foco (Pomodoro).'), abrir: () => abrir('foco') },
  { chave: 'sobre', rotulo: marcar('Sobre o Retro Computer'), icone: 'computador', descricao: marcar('Versão, licenças e créditos.'), abrir: () => dialogoSobre() },
];

// Alguns itens só existem em um sistema (as atualizações do Linux).
const visiveis = () => ITENS.filter((i) => !i.mostrar || i.mostrar());

function abrirPainel(args = {}) {
  if (args.secao) {
    const it = ITENS.find((i) => i.chave === args.secao);
    if (it) return it.abrir(args);
  }
  const aberta = janelas.find((j) => j.id === 'painel');
  if (aberta) return aberta.focar();
  const contagem = () => ({ texto: tr('{n} objeto(s)', { n: visiveis().length }), largura: 120, fixo: true });
  const j = new Janela({
    id: 'painel', titulo: tr('Painel de controle'), icone: 'painel', largura: 440, altura: 300,
    status: [contagem(), ''],
    menus: [
      { rotulo: tr('&Arquivo'), itens: () => [{ rotulo: tr('&Fechar'), acao: () => j.fechar() }] },
      { rotulo: tr('&Exibir'), itens: () => [{ rotulo: tr('Ícones &grandes'), radio: true, marcado: vista.modo === 'icones', acao: () => vista.definirModo('icones') }, { rotulo: tr('&Lista'), radio: true, marcado: vista.modo === 'lista', acao: () => vista.definirModo('lista') }] },
      { rotulo: tr('A&juda'), itens: () => [{ rotulo: tr('&Tópicos da Ajuda'), acao: () => abrir('ajuda', { topico: 'painel' }) }] },
    ],
  });
  const area = h('div.lista-arquivos', { style: { flex: '1' } });
  j.corpo.append(area);
  const vista = new VistaIcones(area, {
    modo: 'icones',
    aoAbrir: (it) => ITENS.find((i) => i.chave === it.chave).abrir(),
    aoMenu: (sel, e) => { if (sel.length) abrirMenu([{ rotulo: tr('&Abrir'), negrito: true, acao: () => ITENS.find((i) => i.chave === sel[0].chave).abrir() }], { x: e.clientX, y: e.clientY }); },
    aoSelecionar: (sel) => j.definirStatus([contagem(), sel.length === 1 ? tr(ITENS.find((i) => i.chave === sel[0].chave).descricao) : '']),
  });
  vista.desenhar(visiveis().map((i) => ({ chave: i.chave, rotulo: tr(i.rotulo), icone: i.icone, arrastavel: false })));
  return j;
}

/* ---------- Diálogos de propriedades ---------- */

function dialogoBase({ titulo, icone, abas, larg = 380, altMin = 0, aoAplicar, aba = 0 }) {
  const existente = janelas.find((x) => x.titulo === titulo);
  if (existente) { existente.focar(); return null; }
  const j = new Janela({ titulo, icone, largura: larg, altura: 420, redimensionavel: false, minimizavel: false, maximizavel: false });
  let atual = Math.max(0, Math.min(abas.length - 1, aba));
  const cab = h('div.abas');
  const painel = h('div.painel-aba');
  const desenhar = () => {
    cab.replaceChildren(...abas.map((a, i) => {
      const t = h('div' + (i === atual ? '.ativa' : ''), a.titulo);
      t.addEventListener('mousedown', () => { atual = i; desenhar(); });
      return t;
    }));
    painel.replaceChildren(abas[atual].conteudo);
  };
  desenhar();
  const aplicar = async () => { if (aoAplicar) await aoAplicar(); };
  const acoes = h('div.acoes.direita',
    h('button.padrao', { on: { click: async () => { await aplicar(); j.fechar(); } } }, tr('OK')),
    h('button', { on: { click: () => j.fechar() } }, tr('Cancelar')),
    aoAplicar ? h('button', { on: { click: aplicar } }, rotulo(tr('&Aplicar'))) : null,
  );
  j.corpo.style.padding = '8px';
  j.corpo.append(cab, painel, acoes);
  ajustarAoConteudo(j, { largura: larg });
  // Como na época, a caixa tem a altura da aba mais alta: trocar de aba não a muda.
  if (abas.length > 1) {
    const alturas = abas.map((a) => {
      painel.replaceChildren(a.conteudo);
      j.el.style.height = 'auto';
      return Math.ceil(j.el.getBoundingClientRect().height);
    });
    painel.replaceChildren(abas[atual].conteudo);
    const maior = Math.max(j.ret.h, ...alturas);
    if (maior > j.ret.h) {
      const area = document.getElementById('janelas').getBoundingClientRect();
      j.ret.h = Math.min(maior, Math.floor(area.height) - 8);
      j.ret.y = Math.max(0, Math.round((area.height - j.ret.h) / 2.4));
    }
    j.aplicarRet();
  }
  // O que chega depois de abrir (o estado lido do sistema) também cabe: a janela cresce com ele.
  acompanharConteudo(j, abas.map((a) => a.conteudo));
  // As abas mais altas (que crescem depois de abrir) cabem sem rolar.
  if (altMin && j.ret.h < altMin) {
    const area = document.getElementById('janelas').getBoundingClientRect();
    j.ret.h = Math.min(altMin, Math.floor(area.height) - 8);
    j.ret.y = Math.max(0, Math.round((area.height - j.ret.h) / 2.4));
    j.aplicarRet();
  }
  return j;
}

/* Barra de tarefas e menu Iniciar */

/**
 * Uma lista de programas na ordem que o usuário escolhe (os fixados): subir, descer, tirar e
 * acrescentar um da lista de todos.
 */
function listaDeProgramas(chaves, vazio) {
  let lista = chaves.filter((k) => programaDe(k));
  let sel = -1;
  const caixa = h('div.campo.lp-lista', { tabIndex: 0 });
  const btCima = h('button', { type: 'button', on: { click: () => mover(-1) } }, rotulo(tr('Para &cima')));
  const btBaixo = h('button', { type: 'button', on: { click: () => mover(1) } }, rotulo(tr('Para &baixo')));
  const btTirar = h('button', { type: 'button', on: { click: () => { lista.splice(sel, 1); sel = Math.min(sel, lista.length - 1); desenhar(); } } }, rotulo(tr('&Remover')));
  const escolha = h('select', { style: { width: '100%' } });
  const btPor = h('button', { type: 'button', on: { click: () => { if (escolha.value) { lista.push(escolha.value); sel = lista.length - 1; desenhar(); } } } }, rotulo(tr('&Adicionar')));
  const mover = (d) => {
    const j = sel + d;
    if (sel < 0 || j < 0 || j >= lista.length) return;
    [lista[sel], lista[j]] = [lista[j], lista[sel]];
    sel = j;
    desenhar();
  };
  const desenhar = () => {
    caixa.replaceChildren(...(lista.length ? lista.map((k, i) => {
      const p = programaDe(k);
      const linha = h('div.lp-linha' + (i === sel ? '.sel' : ''),
        p.iconeUrl ? h('img', { src: p.iconeUrl, width: 16, height: 16, alt: '' }) : img(p.icone, 16), h('span', p.nome));
      linha.addEventListener('mousedown', () => { sel = i; desenhar(); });
      return linha;
    }) : [h('div.lp-vazio', vazio)]));
    btCima.disabled = sel <= 0;
    btBaixo.disabled = sel < 0 || sel >= lista.length - 1;
    btTirar.disabled = sel < 0;
    const livres = programasFixaveis().filter((p) => !lista.includes(p.chave));
    escolha.replaceChildren(...livres.map((p) => h('option', { value: p.chave }, p.nome)));
    escolha.disabled = btPor.disabled = !livres.length;
  };
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && sel > 0) { sel--; desenhar(); e.preventDefault(); }
    if (e.key === 'ArrowDown' && sel < lista.length - 1) { sel++; desenhar(); e.preventDefault(); }
    if (e.key === 'Delete' && sel >= 0) btTirar.click();
  });
  desenhar();
  const el = h('div.lp',
    h('div.lp-topo', caixa, h('div.lp-botoes', btCima, btBaixo, btTirar)),
    h('div.lp-por', h('div.select-caixa', { style: { flex: '1', minWidth: '0' } }, escolha), btPor));
  return { el, valor: () => lista.slice() };
}

function dialogoBarra(args = {}) {
  const c = estado.config;
  const b = c.barra || {};
  const ini = c.iniciar || {};
  // A aba Barra de tarefas: as opções que também estão no botão direito da barra, e os fixados.
  const chkBusca = h('input', { type: 'checkbox', checked: b.busca !== false });
  const chkData = h('input', { type: 'checkbox', checked: !!b.data });
  // Com mais de um monitor (fora do modo sistema): a barra também nas outras telas, ligada por padrão.
  const chkTodas = h('input', { type: 'checkbox', checked: b.todasTelas !== false });
  const linhaTodas = h('label', chkTodas, h('span', tr('Mostrar a barra de tarefas em todas as telas')));
  linhaTodas.hidden = true;
  // No tema Mac não há barra de tarefas (a barra de menus fica no alto da principal): a opção não aparece.
  retro.tela.duasTelas().then((d) => { if (d && d.possivel && c.tema !== 'mac') linhaTodas.hidden = false; }).catch(() => { });
  const radNomes = h('input', { type: 'radio', name: 'botoes-barra', checked: b.botoes !== 'icones' });
  const radIcones = h('input', { type: 'radio', name: 'botoes-barra', checked: b.botoes === 'icones' });
  const fixBarra = listaDeProgramas(b.fixados || [], tr('Nenhum programa fixado. Clique com o botão direito num programa do Iniciar para fixá-lo.'));
  // Os ícones da bandeja, um a um (no tema Mac, os da Faixa de controle, que pode começar aberta).
  const mac = temaMac();
  const ocultosBandeja = new Set(b.ocultos || []);
  const chksBandeja = ICONES_BANDEJA.map((it) => ({ id: it.id, el: h('input', { type: 'checkbox', checked: !ocultosBandeja.has(it.id) }), rotulo: tr(it.rotulo) }));
  const chkFaixa = h('input', { type: 'checkbox', checked: !!b.faixaAberta });
  const botoesJanelas = mac ? [] : [
    h('div', { style: { margin: '6px 0 2px' } }, tr('Os botões das janelas:')),
    h('div', { style: { marginLeft: '12px' } }, h('label', radNomes, h('span', tr('Com o nome')))),
    h('div', { style: { marginLeft: '12px' } }, h('label', radIcones, h('span', tr('Só os ícones, agrupados por programa')))),
  ];
  const abaBarra = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Opções da barra')),
      mac ? h('label', chkFaixa, h('span', tr('Deixar a Faixa de controle aberta'))) : null,
      h('label', chkBusca, h('span', mac ? tr('Mostrar a lupa da busca na Faixa de controle') : tr('Mostrar a caixa de busca ao lado do Iniciar'))),
      h('label', chkData, h('span', mac ? tr('Mostrar a data ao lado da hora') : tr('Mostrar a data embaixo da hora'))),
      linhaTodas,
      ...botoesJanelas),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', mac ? tr('Ícones da Faixa de controle') : tr('Ícones da bandeja')),
      h('div.lp-itens', ...chksBandeja.map((x) => h('label', x.el, h('span', x.rotulo)))),
      h('div', { style: { color: 'var(--texto-meio)', marginTop: '4px' } }, tr('O Bluetooth e a bateria só aparecem quando o computador os tem.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Fixados na barra de tarefas')), fixBarra.el));
  // A aba Menu Iniciar: os fixados no alto, os itens à vista, os ícones pequenos e os recentes.
  const fixIni = listaDeProgramas(ini.fixados || [], tr('Nenhum programa fixado. Clique com o botão direito num programa do Iniciar e escolha "Fixar no menu Iniciar".'));
  const ocultos = new Set(ini.ocultos || []);
  const chks = ITENS_INICIAR.map((it) => ({ id: it.id, el: h('input', { type: 'checkbox', checked: !ocultos.has(it.id) }), rotulo: tr(it.rotulo) }));
  const chkPequenos = h('input', { type: 'checkbox', checked: !!ini.pequenos });
  const chkRecentes = h('input', { type: 'checkbox', checked: ini.recentes !== false });
  const avisoLimpo = h('span', { style: { color: 'var(--texto-meio)' } });
  const btLimpar = h('button', { type: 'button', disabled: !(c.recentes || []).length, on: { click: async () => { await definirConfig({ recentes: [] }); btLimpar.disabled = true; avisoLimpo.textContent = tr('A lista foi limpa.'); } } }, rotulo(tr('&Limpar a lista')));
  const abaIniciar = h('div',
    h('fieldset', { style: { margin: '0 0 8px' } }, h('legend', tr('Fixados no alto do menu Iniciar')), fixIni.el),
    h('fieldset', { style: { margin: '0 0 8px' } }, h('legend', tr('Mostrar no menu Iniciar')),
      h('div.lp-itens', ...chks.map((x) => h('label', x.el, h('span', x.rotulo))))),
    h('label', { style: { margin: '0 0 8px' } }, chkPequenos, h('span', tr('Ícones pequenos no menu Iniciar'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Documentos recentes')),
      h('label', chkRecentes, h('span', tr('Guardar os documentos abertos recentemente'))),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' } }, btLimpar, avisoLimpo)));
  dialogoBase({
    titulo: tr('Propriedades da Barra de tarefas e do menu Iniciar'), icone: 'barra-tarefas', larg: 400, aba: args.aba || 0,
    abas: [{ titulo: tr('Barra de tarefas'), conteudo: abaBarra }, { titulo: tr('Menu Iniciar'), conteudo: abaIniciar }],
    aoAplicar: () => definirConfig({
      barra: {
        busca: chkBusca.checked, data: chkData.checked, todasTelas: chkTodas.checked, botoes: radIcones.checked ? 'icones' : 'nomes', fixados: fixBarra.valor(),
        ocultos: chksBandeja.filter((x) => !x.el.checked).map((x) => x.id), ...(mac ? { faixaAberta: chkFaixa.checked } : {}),
      },
      iniciar: { fixados: fixIni.valor(), ocultos: chks.filter((x) => !x.el.checked).map((x) => x.id), pequenos: chkPequenos.checked, recentes: chkRecentes.checked },
    }),
  });
}

/* Aparência */

/**
 * A escolha da cor e do padrão 8×8 de um fundo (o da área de trabalho, o da página inicial do
 * Navegador): muda o papel ({ cor, padrao }) na hora e chama aoMudar; atualizar() relê o papel.
 */
function escolhaDeFundo(papel, aoMudar) {
  const cores = h('div.cores', CORES.map((cor) => {
    const el = h('div', { title: cor }, h('div', { style: { background: cor } }));
    el.addEventListener('mousedown', () => { papel.cor = cor; marcarCores(); outra.value = cor; aoMudar(); });
    return el;
  }));
  const marcarCores = () => [...cores.children].forEach((el, i) => el.classList.toggle('sel', CORES[i] === papel.cor));
  const outra = h('input', { type: 'color', style: { width: '40px', height: '21px', padding: '0', border: 'none' } });
  outra.addEventListener('input', () => { papel.cor = outra.value; marcarCores(); aoMudar(); });
  const listaPadroes = h('select', { size: 6, style: { height: 'auto', width: '140px', background: 'var(--janela)' } }, Object.entries(PADROES).map(([k, p]) => h('option', { value: k }, tr(p.nome))));
  listaPadroes.addEventListener('change', () => { papel.padrao = listaPadroes.value; aoMudar(); });
  const atualizar = () => { marcarCores(); outra.value = papel.cor || '#008080'; listaPadroes.value = papel.padrao || 'nenhum'; };
  atualizar();
  // A lista só rola até o padrão escolhido quando aparece (a aba começa escondida).
  new ResizeObserver((_e, o) => {
    if (!listaPadroes.clientHeight) return;
    o.disconnect();
    const v = listaPadroes.value;
    listaPadroes.selectedIndex = -1;
    listaPadroes.value = v;
  }).observe(listaPadroes);
  const el = h('div', { style: { display: 'flex', gap: '14px' } },
    h('fieldset', { style: { flex: '1', margin: '0' } }, h('legend', tr('Cor')), cores, h('div', { style: { marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' } }, tr('Outra:'), outra)),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Padrão')), listaPadroes));
  return { el, atualizar };
}

// A Aparência abre no Plano de fundo, como antes; args.aba === 'tema' abre no Tema.
function dialogoAparencia(args = {}) {
  const c = estado.config;
  const papel = { ...c.papel };
  let telaCheia = c.telaCheiaAgora;
  let escala = c.escala || 'auto';
  let protecao = { ...c.protecaoTela };

  const previa = h('div.tela-previa');
  // A prévia é o monitor pequeno: a imagem centralizada encolhe na mesma proporção da tela.
  const atualizarPrevia = () => aplicarFundo(papel, previa, { escala: 78 / Math.max(1, innerWidth) });
  const monitor = h('div.monitor-previa', previa);

  // O papel de parede: uma imagem do disco C: por cima da cor (a cópia fica na pasta do usuário).
  const selImagem = h('select', { style: { width: '100%' } });
  const selModo = h('select', Object.entries(MODOS_PAPEL).map(([k, r]) => h('option', { value: k }, tr(r))));
  selModo.value = MODOS_PAPEL[papel.modo] ? papel.modo : 'preencher';
  const btRemover = h('button', { type: 'button' }, tr('Remover…'));
  const desenharImagens = () => {
    const lista = estado.config.papeis || [];
    if (papel.imagem && !lista.some((p) => p.arquivo === papel.imagem)) papel.imagem = null;
    selImagem.replaceChildren(h('option', { value: '' }, tr('(Nenhum)')), ...lista.map((p) => h('option', { value: p.arquivo }, p.nome)));
    selImagem.value = papel.imagem || '';
    selModo.disabled = btRemover.disabled = !papel.imagem;
  };
  selImagem.addEventListener('change', () => { papel.imagem = selImagem.value || null; desenharImagens(); atualizarPrevia(); });
  selModo.addEventListener('change', () => { papel.modo = selModo.value; atualizarPrevia(); });
  const btProcurar = h('button', { type: 'button', on: { click: async () => {
    const rel = await caixaArquivo({ modo: 'abrir', titulo: tr('Procurar'), pasta: pastaDocs(), tipos: [{ rotulo: tr('Imagens'), exts: EXTS_PAPEL }] });
    if (!rel) return;
    try {
      const p = await adicionarPapel(rel);
      papel.imagem = p.arquivo;
      papel.modo = selModo.value;
    } catch (e) { erro(e.message); }
    desenharImagens();
    atualizarPrevia();
  } } }, tr('Procurar…'));
  btRemover.addEventListener('click', async () => {
    const atual = (estado.config.papeis || []).find((p) => p.arquivo === papel.imagem);
    if (!atual || !(await confirmar(tr('Tirar "{nome}" da lista dos papéis de parede? O arquivo do disco C: não é apagado.', { nome: atual.nome }), { titulo: tr('Papel de parede') }))) return;
    await removerPapel(atual.arquivo).catch((e) => erro(e.message));
    if (!estado.config.papel || !estado.config.papel.imagem) aplicarFundo(estado.config.papel);
    papel.imagem = null;
    desenharImagens();
    atualizarPrevia();
  });
  desenharImagens();
  atualizarPrevia();

  const fundo = escolhaDeFundo(papel, atualizarPrevia);
  const abaFundo = h('div', monitor,
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Papel de parede')),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, h('div.select-caixa', { style: { flex: '1', minWidth: '0' } }, selImagem), btProcurar, btRemover),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px' } }, h('span', tr('Ajuste:')), h('div.select-caixa', selModo))),
    fundo.el);

  // O tema: o PC clássico ou o Mac clássico (tema.js), com a prévia de cada um. O fundo de sempre de
  // um vira o do outro (um fundo escolhido pelo usuário fica como está).
  let tema = c.tema === 'mac' ? 'mac' : 'pc';
  const temaAntes = tema;
  const opcoesTema = Object.entries(TEMAS).map(([k, nome]) => {
    const radio = h('input', { type: 'radio', name: 'tema', checked: k === tema });
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      Object.assign(papel, fundoParaTema(papel, tema, k));
      tema = k;
      fundo.atualizar();
      atualizarPrevia();
    });
    return h('label.tema-opcao', h('div.previa-tema.' + k, h('div.pt-menus'), h('div.pt-janela', h('div.pt-titulo'), h('div.pt-corpo')), h('div.pt-barra')), h('span', radio, tr(nome)));
  });
  // A escolha de uma hora cheia (o esquema da noite e a luz noturna).
  const selHora = (v, rot) => {
    const s = h('select', { 'aria-label': rot }, ...Array.from({ length: 24 }, (_, i) => h('option', { value: String(i) },
      new Date(2000, 0, 1, i).toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' }))));
    s.value = String(v);
    return s;
  };
  // O esquema de cores do PC clássico (esquemas.js), com a prévia: as janelas, o menu, o texto e um botão.
  let esquema = esquemaValido(c.esquema);
  const opcoesEsquema = () => Object.entries(ESQUEMAS).map(([k, e]) => h('option', { value: k }, tr(e.nome)));
  const selEsquema = h('select', { style: { width: '100%' } }, opcoesEsquema());
  selEsquema.value = esquema;
  const previaEsq = h('div.previa-esquema',
    h('div.pe-janela.inativa', h('div.pe-titulo', tr('Janela inativa'))),
    h('div.pe-janela.ativa',
      h('div.pe-titulo', tr('Janela ativa')),
      h('div.pe-menus', h('span', tr('Normal')), h('span.des', tr('Desativado')), h('span.sel', tr('Selecionado'))),
      h('div.pe-campo', tr('Texto da janela'), ' ', h('span.pe-sel', tr('selecionado')), h('div.pe-fraco', tr('Uma nota mais apagada')), h('a', tr('Um link')))),
    h('div.pe-janela.pe-msg', h('div.pe-titulo', tr('Mensagem')), h('div.pe-texto', tr('Texto da mensagem')), h('div.pe-botao', tr('OK'))));
  // A prévia mostra o esquema que se escolheu por último (o do dia ou o da noite).
  const mostrarEsquema = (id = esquema) => {
    previaEsq.style.cssText = variaveisDoEsquema(id);
    previaEsq.style.background = ESQUEMAS[esquemaValido(id)].mesa;
  };
  selEsquema.addEventListener('change', () => {
    Object.assign(papel, fundoParaEsquema(papel, esquema, selEsquema.value));
    esquema = esquemaValido(selEsquema.value);
    mostrarEsquema();
    fundo.atualizar();
    atualizarPrevia();
  });
  mostrarEsquema();
  // A troca à noite, como o modo escuro dos sistemas de hoje: outro esquema do pôr ao nascer do sol
  // (pelo fuso horário do computador, sol.js) ou entre duas horas. O fundo acompanha (inicio.js).
  const en = { ligado: false, esquema: 'noite', quando: 'sol', de: 19, ate: 7, ...(c.esquemaNoite || {}) };
  const chkNoite = h('input', { type: 'checkbox', checked: !!en.ligado });
  const selNoite = h('select', { 'aria-label': tr('Esquema da noite') }, opcoesEsquema());
  selNoite.value = esquemaValido(en.esquema);
  const sol = solDoFuso();
  const radioSol = h('input', { type: 'radio', name: 'esquema-quando', checked: en.quando !== 'horas' && !!sol });
  const radioHoras = h('input', { type: 'radio', name: 'esquema-quando', checked: en.quando === 'horas' || !sol });
  const selDeEsq = selHora(en.de, tr('Começa às'));
  const selAteEsq = selHora(en.ate, tr('Termina às'));
  const horaCurta = (d) => d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
  // As horas de hoje ao lado da opção; o fuso horário (de onde vem a cidade) fica na dica.
  const notaSol = h('span', { style: { color: 'var(--texto-fraco)', marginLeft: '4px' } },
    !sol ? tr('(o fuso {fuso} não tem uma cidade de referência)', { fuso: fusoDoComputador() || 'UTC' })
      : sol.sempre === 'dia' ? tr('(hoje, o sol não se põe)')
        : sol.sempre === 'noite' ? tr('(hoje, o sol não nasce)')
          : tr('(hoje, das {por} às {nascer})', { por: horaCurta(sol.por), nascer: horaCurta(sol.nascer) }));
  const dicaSol = tr('O pôr e o nascer do sol na cidade de referência do fuso horário do computador ({fuso}).', { fuso: sol ? sol.fuso : fusoDoComputador() || 'UTC' });
  const lerEsqNoite = () => ({ ligado: chkNoite.checked, esquema: esquemaValido(selNoite.value), quando: radioHoras.checked ? 'horas' : 'sol', de: Number(selDeEsq.value), ate: Number(selAteEsq.value) });
  selNoite.addEventListener('change', () => mostrarEsquema(selNoite.value));
  chkNoite.addEventListener('change', () => { marcarTemaEsquema(); mostrarEsquema(chkNoite.checked ? selNoite.value : esquema); });
  const notaEsquema = h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px', marginTop: '6px' } });
  const marcarTemaEsquema = () => {
    selEsquema.disabled = chkNoite.disabled = tema === 'mac';
    selNoite.disabled = radioHoras.disabled = selDeEsq.disabled = selAteEsq.disabled = tema === 'mac' || !chkNoite.checked;
    radioSol.disabled = selNoite.disabled || !sol;
    previaEsq.classList.toggle('apagada', tema === 'mac');
    notaEsquema.textContent = tema === 'mac'
      ? tr('O Mac clássico tem as cores próprias: o esquema vale para o PC clássico.')
      : tr('Os esquemas escuros deixam as janelas, os campos e as listas escuros, com o texto claro.');
  };
  marcarTemaEsquema();
  for (const o of opcoesTema) o.querySelector('input').addEventListener('change', marcarTemaEsquema);
  const abaTema = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tema')), h('div.temas', ...opcoesTema)),
    h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } },
      tr('O PC clássico tem a barra de tarefas e o Iniciar embaixo. O Mac clássico, inspirado no Mac OS 9, tem a barra de menus no alto da tela (o menu do logotipo no lugar do Iniciar, os menus da janela da frente e, no canto, o menu dos programas abertos), a Faixa de controle com os programas fixados, as janelas que se recolhem com um duplo clique no título e os ícones próprios dele.')),
    h('fieldset', { style: { margin: '10px 0 0' } }, h('legend', tr('Esquema de cores')),
      previaEsq,
      h('div.linha', { style: { marginTop: '6px' } }, h('div.select-caixa', { style: { flex: '1' } }, selEsquema)),
      h('div.linha', { style: { marginTop: '6px', gap: '4px' } }, h('label', chkNoite, h('span', tr('Trocar à noite para:'))), h('div.select-caixa', { style: { flex: '1' } }, selNoite)),
      h('div', { style: { marginTop: '4px', marginLeft: '18px' }, title: dicaSol }, h('label', radioSol, h('span', tr('Do pôr ao nascer do sol'))), notaSol),
      h('div.linha', { style: { marginTop: '4px', marginLeft: '18px', gap: '4px' } }, h('label', radioHoras, h('span', tr('Das'))), h('div.select-caixa', selDeEsq), h('span', tr('às')), h('div.select-caixa', selAteEsq)),
      notaEsquema));

  const chkProt = h('input', { type: 'checkbox', checked: protecao.ligada });
  const minProt = h('input', { type: 'number', min: 1, max: 120, value: protecao.minutos, style: { width: '56px' } });
  const tipoProt = h('select', h('option', { value: 'estrelas' }, tr('Voando pelas estrelas')), h('option', { value: 'canos' }, tr('Linhas coloridas')), h('option', { value: 'relogio' }, tr('Relógio')));
  tipoProt.value = protecao.tipo || 'estrelas';
  const aplicarProt = () => { protecao = { ligada: chkProt.checked, minutos: Math.max(1, Number(minProt.value) || 10), tipo: tipoProt.value }; };
  const abaProtecao = h('div',
    h('div.monitor-previa', h('div.tela-previa', { style: { background: '#000' } })),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Proteção de tela')),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, tipoProt), h('button', { on: { click: () => { aplicarProt(); definirConfig({ protecaoTela: protecao }).then(() => abrir('protecao', { agora: true })); } } }, tr('Visualizar'))),
      h('div.linha', h('label', chkProt, h('span', tr('Ligar depois de'))), minProt, h('span', tr('minutos sem uso')))),
  );

  const radioCheia = h('input', { type: 'radio', name: 'modo-tela', checked: telaCheia });
  const radioJanela = h('input', { type: 'radio', name: 'modo-tela', checked: !telaCheia });
  // Os tamanhos dos pixels: os inteiros (as letras mais nítidas) e os do meio, entre eles. Cada um
  // mostra a área que a tela fica tendo (os pixels do monitor divididos pelo tamanho).
  const numero = (n) => n.toLocaleString(localidade(), { maximumFractionDigits: 2 });
  const rotuloEscala = (n, tela) => (tela && tela.w && tela.h
    ? tr('{n} × (área de {l} por {a})', { n: numero(n), l: Math.floor(tela.w / n), a: Math.floor(tela.h / n) })
    : tr('{n} ×', { n: numero(n) }));
  const opcoesEscala = ESCALAS.map((n) => h('option', { value: String(n) }, rotuloEscala(n)));
  const opcaoAuto = h('option', { value: 'auto' }, tr('Automático'));
  const selEscala = h('select', opcaoAuto, ...opcoesEscala);
  // Um tamanho guardado que não está na lista (de outra versão ou do Claude) continua escolhível.
  if (escala !== 'auto' && !ESCALAS.includes(Number(escala)) && Number(escala) > 0) selEscala.append(h('option', { value: String(escala) }, rotuloEscala(Number(escala))));
  selEscala.value = String(escala);
  retro.sistema.telaFisica().then((tela) => {
    if (!tela) return;
    for (const o of selEscala.options) {
      if (o.value === 'auto') o.textContent = tr('Automático ({n} ×)', { n: numero(pixelsAutomaticos({ ...tela, escala: tela.escalaSistema || tela.escala })) });
      else o.textContent = rotuloEscala(Number(o.value), tela);
    }
  }).catch(() => { });
  const chkRapido = h('input', { type: 'checkbox', checked: !!c.inicioRapido });
  const chkReabrir = h('input', { type: 'checkbox', checked: !c.reabrir || c.reabrir.ligado !== false });
  // A área da tela (a resolução), como no Windows 95: só no Retro Computer como sistema do Linux.
  const res = { saida: null, antes: null, modos: [], escolhido: null };
  const areaTela = h('div', { hidden: true, style: { marginTop: '8px' } });
  retro.tela.modos().then((t) => {
    if (!t || !t.disponivel) return;
    Object.assign(res, { saida: t.saida, antes: t.atual, modos: t.modos.slice().reverse(), escolhido: t.atual });
    const texto = h('div', { style: { textAlign: 'center', marginTop: '2px' } });
    const mostrar = (m) => { const [l, a] = m.replace('i', '').split('x'); texto.textContent = tr('{l} por {a} pixels', { l, a }); };
    const desl = deslizante({
      valor: Math.max(0, res.modos.indexOf(t.atual)), min: 0, max: res.modos.length - 1, tamanho: 160, passo: 1, passoGrande: 1, rotulo: tr('Área da tela'),
      aoMudar: (i) => { res.escolhido = res.modos[i]; mostrar(res.escolhido); },
    });
    mostrar(t.atual);
    areaTela.replaceChildren(h('div', tr('Área da tela')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' } }, h('span', tr('Menos')), desl.el, h('span', tr('Mais'))), texto);
    areaTela.hidden = false;
  }).catch(() => { });
  // As várias telas: no modo sistema, o arranjo (duplicar, estender, uma só); fora dele, o monitor.
  const varias = { el: h('div', { hidden: true, style: { marginTop: '8px' } }), antes: null, escolhido: null, monitor: null, monitorAntes: null, duas: null, duasAntes: null };
  const notaVarias = (texto) => h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px', marginTop: '4px' } }, texto);
  if (c.modoSistema) {
    retro.tela.telas().then((e) => {
      if (!e || !e.disponivel || e.telas.length < 2) return;
      varias.antes = e.arranjo;
      varias.escolhido = e.arranjo;
      const sel = h('select', { style: { width: '100%' } },
        h('option', { value: 'duplicar' }, tr('Duplicar estas telas')),
        h('option', { value: 'estender' }, tr('Estender estas telas')),
        ...e.telas.map((x, i) => h('option', { value: 'so:' + x.saida }, tr('Mostrar só na tela {n} ({saida})', { n: i + 1, saida: x.saida }))));
      sel.value = e.arranjo || 'estender';
      sel.addEventListener('change', () => { varias.escolhido = sel.value; });
      varias.el.replaceChildren(h('div', tr('Várias telas')), h('div.select-caixa', { style: { width: '100%', marginTop: '4px' } }, sel),
        notaVarias(tr('Estendidas, o Retro Computer fica na tela principal, e os programas do Linux podem ir para a outra (arraste a janela até lá).')));
      varias.el.hidden = false;
    }).catch(() => { });
  } else {
    retro.tela.monitores().then((ms) => {
      if (!ms || ms.length < 2) return;
      const atual = ms.find((m) => m.atual) || ms[0];
      varias.monitorAntes = String(atual.id);
      const sel = h('select', { style: { width: '100%' } }, ...ms.map((m, i) => h('option', { value: m.id, selected: m === atual },
        m.principal ? tr('Tela {n}: {l} por {a} (a principal)', { n: i + 1, l: m.w, a: m.h }) : tr('Tela {n}: {l} por {a}', { n: i + 1, l: m.w, a: m.h }))));
      sel.addEventListener('change', () => { varias.monitor = sel.value; });
      // As duas telas em tela cheia: a área de trabalho cobre os monitores (e a escolha de um deixa de valer).
      const chkDuas = h('input', { type: 'checkbox' });
      const notaDuas = notaVarias(tr('Com a tela cheia, a área de trabalho cobre todos os monitores: os ícones ficam na tela principal, cada tela tem a sua barra de tarefas, e as janelas podem ir de uma para a outra (arraste-as até lá).'));
      const notaMac = notaVarias(tr('No Mac, para a janela aparecer nos dois monitores, desligue “Monitores têm Spaces separados” em Ajustes do Sistema › Mesa e Dock, e saia da sessão e entre de novo.'));
      notaMac.hidden = true;
      const marcarDuas = () => { sel.disabled = chkDuas.checked; varias.duas = chkDuas.checked; };
      chkDuas.addEventListener('change', () => { if (chkDuas.checked) radioCheia.checked = true; marcarDuas(); });
      retro.tela.duasTelas().then((d) => {
        if (!d || !d.possivel) return;
        chkDuas.checked = !!d.ligada;
        varias.duasAntes = !!d.ligada;
        notaMac.hidden = !d.spacesSeparados;
        marcarDuas();
      }).catch(() => { });
      varias.el.replaceChildren(h('div', tr('Mostrar o Retro Computer na tela:')), h('div.select-caixa', { style: { width: '100%', marginTop: '4px' } }, sel),
        h('div', { style: { marginTop: '6px' } }, h('label', chkDuas, h('span', tr('Usar as duas telas na tela cheia')))), notaDuas, notaMac);
      varias.el.hidden = false;
    }).catch(() => { });
  }
  const abaConfig = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tela')),
      h('div', h('label', radioCheia, h('span', tr('Tela cheia (recomendado para o foco)')))),
      h('div', { style: { marginTop: '6px' } }, h('label', radioJanela, h('span', tr('Numa janela do computador principal')))),
      c.modoSistema ? null : h('div', { style: { marginTop: '6px', color: 'var(--texto-fraco)' } }, tr('A tecla F11 alterna a qualquer momento.')),
      areaTela, varias.el),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Tamanho dos pixels')),
      h('div.linha', h('div.select-caixa', { style: { flex: '1' } }, selEscala)),
      h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } }, tr('Nos tamanhos inteiros (1, 2, 3 e 4), cada pixel da interface usa um número inteiro de pixels da tela, e as letras e os ícones ficam mais nítidos; os do meio dão um tamanho entre eles.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Inicialização')),
      h('label', chkRapido, h('span', tr('Pular a tela de abertura'))),
      h('div', { style: { marginTop: '4px' } }, h('label', chkReabrir, h('span', tr('Reabrir as janelas que estavam abertas')))),
      inicioComComputador()),
  );
  // No modo sistema, o Retro Computer é a tela inteira.
  if (c.modoSistema) { radioCheia.disabled = true; radioJanela.disabled = true; }

  // Os efeitos (como a aba do Windows 98): os cantos magnéticos das janelas e a luz noturna.
  const chkEncaixe = h('input', { type: 'checkbox', checked: !c.janelas || c.janelas.encaixe !== false });
  const ln = { ligada: false, quando: 'noite', de: 20, ate: 7, intensidade: 50, ...(c.luzNoturna || {}) };
  const chkLuz = h('input', { type: 'checkbox', checked: !!ln.ligada });
  const solLuz = !!solDoFuso();
  const radioSolLuz = h('input', { type: 'radio', name: 'luz-quando', checked: ln.quando === 'sol' && solLuz });
  const radioNoite = h('input', { type: 'radio', name: 'luz-quando', checked: ln.quando === 'noite' || (ln.quando === 'sol' && !solLuz) || !['sol', 'sempre'].includes(ln.quando) });
  const radioSempre = h('input', { type: 'radio', name: 'luz-quando', checked: ln.quando === 'sempre' });
  const selDe = selHora(ln.de, tr('Começa às'));
  const selAte = selHora(ln.ate, tr('Termina às'));
  const lerLuz = () => ({ ligada: chkLuz.checked, quando: radioSempre.checked ? 'sempre' : radioSolLuz.checked ? 'sol' : 'noite', de: Number(selDe.value), ate: Number(selAte.value), intensidade: ln.intensidade });
  let previaLuz = false;
  // Mexer na intensidade mostra o resultado na hora (e o que não for aplicado volta ao fechar).
  const intensidade = deslizante({
    valor: ln.intensidade, min: 10, max: 100, tamanho: 140, passo: 5, passoGrande: 20, rotulo: tr('Intensidade da luz noturna'),
    aoMudar: (n) => { ln.intensidade = n; previaLuz = true; aplicarLuzNoturna({ ...lerLuz(), ligada: true }); },
  });
  const marcarLuz = () => {
    for (const el of [radioNoite, radioSempre, selDe, selAte]) el.disabled = !chkLuz.checked;
    radioSolLuz.disabled = !chkLuz.checked || !solLuz;
  };
  chkLuz.addEventListener('change', marcarLuz);
  marcarLuz();
  const abaEfeitos = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Janelas')),
      h('label', chkEncaixe, h('span', tr('Encaixar as janelas ao arrastá-las até as bordas e os cantos da tela'))),
      h('div', { style: { color: 'var(--texto-fraco)', marginTop: '6px', lineHeight: '13px' } },
        tr('À esquerda ou à direita, a janela ocupa metade da tela; num canto, um quarto; no alto, a tela toda. A tecla do logotipo com as setas faz o mesmo.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Luz noturna')),
      h('label', chkLuz, h('span', tr('Deixar as cores mais quentes, com menos azul, para descansar a vista'))),
      h('div', { style: { marginTop: '6px', marginLeft: '18px' } }, h('label', radioSolLuz, h('span', tr('Do pôr ao nascer do sol')))),
      h('div.linha', { style: { marginTop: '4px', marginLeft: '18px', gap: '4px' } }, h('label', radioNoite, h('span', tr('Das'))), h('div.select-caixa', selDe), h('span', tr('às')), h('div.select-caixa', selAte)),
      h('div', { style: { marginTop: '4px', marginLeft: '18px' } }, h('label', radioSempre, h('span', tr('O dia todo')))),
      h('div', { style: { marginTop: '8px' } }, tr('Intensidade:')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' } }, h('span', tr('Menos')), intensidade.el, h('span', tr('Mais')))),
  );

  // Os ícones da área de trabalho (como as "Configurações de ícones da área de trabalho" do Windows).
  const NOMES_MESA = {
    'meu-computador': [marcar('Meu computador'), 'computador'], 'meus-documentos': [marcar('Meus documentos'), 'documentos'],
    lixeira: [marcar('Lixeira'), 'lixeira'], navegador: [marcar('Navegador'), 'navegador'], correio: [marcar('E-mail'), 'correio'],
    claude: [marcar('Claude'), 'claude'], programas: [marcar('Loja de programas'), 'programas-caixa'], prompt: [marcar('Prompt de comando'), 'prompt'], painel: [marcar('Painel de controle'), 'painel'],
    codex: [marcar('Codex'), 'codex'], assistente: [marcar('Assistente do Retro'), 'assistente'],
    bloco: [marcar('Bloco de notas'), 'bloco'], foco: [marcar('Foco'), 'foco'],
  };
  const caixasMesa = ICONES_SISTEMA.map((k) => ({ k, c: h('input', { type: 'checkbox', checked: naMesa(k) }) }));
  const abaMesa = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Ícones da área de trabalho')),
      h('div.mesa-icones', ...caixasMesa.map(({ k, c }) => h('label', c, img(NOMES_MESA[k][1], 16), h('span', tr(NOMES_MESA[k][0]))))),
      h('div.acoes', { style: { marginTop: '8px' } }, h('button', { type: 'button', on: { click: () => { for (const { k, c } of caixasMesa) c.checked = ICONES_PADRAO.includes(k); } } }, rotulo(tr('Restaurar o &padrão'))))),
    h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } },
      tr('Para pôr outro programa na área de trabalho, use o botão direito nele, no menu Iniciar › Adicionar à área de trabalho. Os arquivos e as pastas da área de trabalho ficam na pasta Área de trabalho do disco C:.')));

  const dlg = dialogoBase({
    titulo: tr('Propriedades de Aparência'),
    icone: 'aparencia',
    larg: 480,
    altMin: 540,
    aba: args.aba === 'tema' ? 0 : 1,
    abas: [{ titulo: tr('Tema'), conteudo: abaTema }, { titulo: tr('Plano de fundo'), conteudo: abaFundo }, { titulo: tr('Ícones'), conteudo: abaMesa }, { titulo: tr('Proteção de tela'), conteudo: abaProtecao }, { titulo: tr('Efeitos'), conteudo: abaEfeitos }, { titulo: tr('Configurações'), conteudo: abaConfig }],
    aoAplicar: async () => {
      aplicarProt();
      escala = selEscala.value;
      previaLuz = false;
      await definirConfig({ papel, tema, esquema, esquemaNoite: lerEsqNoite(), escala, protecaoTela: protecao, inicioRapido: chkRapido.checked, reabrir: { ligado: chkReabrir.checked }, janelas: { encaixe: chkEncaixe.checked }, luzNoturna: lerLuz() });
      await definirIconesSistema(caixasMesa.filter((x) => x.c.checked).map((x) => x.k));
      if (chkAbrirAoEntrar && !chkAbrirAoEntrar.disabled) await retro.sistema.abrirAoEntrar(chkAbrirAoEntrar.checked).catch(() => { });
      // O fundo gravado (a troca do esquema à noite pode tê-lo acompanhado: inicio.js).
      aplicarFundo(estado.config.papel || papel);
      await aplicarEscala(escala);
      // As duas telas antes da tela cheia: ao entrar nela, a janela já se espalha (sem passar por um monitor só).
      if (varias.duas != null && varias.duas !== varias.duasAntes) await usarDuasTelas(varias);
      if (radioCheia.checked !== telaCheia) {
        telaCheia = radioCheia.checked;
        await retro.sistema.telaCheia(telaCheia);
      }
      if (res.escolhido && res.escolhido !== res.antes) await trocarResolucao(res);
      if (varias.escolhido && varias.escolhido !== varias.antes) await trocarArranjo(varias);
      if (varias.monitor && varias.monitor !== varias.monitorAntes && !varias.duas) {
        await retro.tela.usarMonitor(Number(varias.monitor)).catch(() => { });
        varias.monitorAntes = varias.monitor;
      }
    },
  });
  // A prévia da luz noturna que não foi aplicada volta ao que estava.
  if (dlg) dlg.ev.on('fechada', () => { if (previaLuz) aplicarLuzNoturna(); });
}

/**
 * Liga ou desliga as duas telas. No Windows, com monitores de escalas diferentes (o notebook a 150% e
 * o monitor a 100%), a janela que cobre os dois só fica no lugar medida em pixels de verdade, e o
 * Retro Computer abre de novo para isso.
 */
async function usarDuasTelas(varias) {
  let r = await retro.tela.usarDuasTelas(varias.duas).catch(() => null);
  if (r && r.precisaReabrir) {
    const sim = await confirmar(tr('Os monitores têm escalas diferentes no Windows. Para a área de trabalho cobrir os dois sem sair do lugar, o Retro Computer mede as duas telas em pixels de verdade e precisa abrir de novo. Os programas abertos são fechados. Abrir de novo agora?'), { titulo: tr('Duas telas') });
    if (!sim) return;
    r = await retro.tela.usarDuasTelas(true, { reabrir: true }).catch(() => null);
  }
  if (r && r.ok !== false) varias.duasAntes = varias.duas;
  if (r && r.escalaVoltaAoAbrir) info(tr('As telas voltam à escala do Windows na próxima vez que o Retro Computer abrir.'), tr('Duas telas'));
}

/** Troca a resolução e pergunta se fica; sem resposta em 15 segundos, volta à anterior. */
async function trocarResolucao(res) {
  const r = await retro.tela.definir(res.saida, res.escolhido);
  if (!r || !r.ok) {
    erro(tr('Não foi possível mudar a resolução: {erro}', { erro: (r && r.erro) || '?' }));
    return;
  }
  // A janela acompanha a tela nova antes da pergunta.
  await new Promise((ok) => setTimeout(ok, 600));
  if (await confirmarComPrazo(tr('A tela foi reconfigurada. Manter esta configuração?'), 15, { titulo: tr('Configurações da tela') })) {
    await definirConfig({ tela: { saida: res.saida, modo: res.escolhido } });
    res.antes = res.escolhido;
  } else {
    await retro.tela.definir(res.saida, res.antes);
    res.escolhido = res.antes;
  }
}

/** Troca o arranjo das telas e pergunta se fica; sem resposta em 15 segundos, volta ao anterior. */
async function trocarArranjo(v) {
  const r = await retro.tela.arranjo(v.escolhido);
  if (!r || !r.ok) {
    erro(tr('Não foi possível mudar as telas: {erro}', { erro: (r && r.erro) || '?' }));
    return;
  }
  await new Promise((ok) => setTimeout(ok, 1200));
  if (await confirmarComPrazo(tr('A tela foi reconfigurada. Manter esta configuração?'), 15, { titulo: tr('Configurações da tela') })) {
    await definirConfig({ tela: { arranjo: v.escolhido } });
    v.antes = v.escolhido;
  } else if (v.antes) {
    await retro.tela.arranjo(v.antes);
    v.escolhido = v.antes;
  }
}

/* Abrir junto com o computador e, no Linux, ser o sistema dele */

let chkAbrirAoEntrar = null;

function inicioComComputador() {
  const c = estado.config;
  const caixa = h('div', { style: { marginTop: '6px' } });
  chkAbrirAoEntrar = null;
  if (!c.modoSistema) {
    chkAbrirAoEntrar = h('input', { type: 'checkbox', disabled: true });
    retro.sistema.abrirAoEntrar().then((v) => { chkAbrirAoEntrar.checked = !!v; chkAbrirAoEntrar.disabled = false; }).catch(() => { });
    caixa.append(h('div', h('label', chkAbrirAoEntrar, h('span', tr('Abrir o Retro Computer ao entrar no computador')))));
  }
  if (c.plataforma !== 'linux') return caixa;
  // No Linux: a sessão "Retro Computer", escolhida na tela de entrada (instalada pelo pacote .deb).
  const lugar = h('div', { style: { marginTop: '8px', lineHeight: '13px' } });
  caixa.append(lugar);
  retro.sistema.sessao().then((s) => {
    if (!s.instalada) {
      lugar.replaceChildren(h('div', { style: { color: 'var(--texto-fraco)' } }, tr('Para usar o Retro Computer como o sistema do computador, instale o pacote .deb: ele acrescenta a sessão "Retro Computer" à tela de entrada do Linux.')));
      return;
    }
    const partes = [h('div', { style: { color: 'var(--texto-fraco)', marginBottom: '6px' } }, c.modoSistema
      ? tr('O Retro Computer está como o sistema do computador (a sessão "Retro Computer"). Para voltar à área de trabalho do Linux, use Desligar › Sair da sessão.')
      : tr('Para usar o Retro Computer como o sistema do computador, escolha a sessão "Retro Computer" na tela de entrada do Linux.'))];
    if (s.lightdm) {
      const chk = h('input', { type: 'checkbox', checked: s.entrarDireto });
      chk.addEventListener('change', async () => {
        const querer = chk.checked;
        chk.disabled = true;
        const r = await comSenhaAdmin(querer
          ? tr('Para o computador entrar direto no Retro Computer ao ligar, digite a senha de administrador do Linux (a mesma da entrada no computador):')
          : tr('Para o computador voltar a mostrar a tela de entrada, digite a senha de administrador do Linux:'), (senha) => retro.sistema.entrarDireto(querer, senha));
        chk.disabled = false;
        if (!r || !r.ok) {
          chk.checked = !querer;
          if (r && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível mudar a entrada do computador: {erro}', { erro: r.erro || '?' }));
        }
      });
      partes.push(h('label', chk, h('span', tr('Entrar direto no Retro Computer ao ligar (sem a tela de entrada)'))));
    }
    lugar.replaceChildren(...partes);
  }).catch(() => { });
  return caixa;
}

/* Senhas (a tela de bloqueio) */

/** Criar, trocar ou tirar a senha: com uma senha já criada, a atual é pedida antes. */
function mudarSenha(tirar) {
  return new Promise((resolve) => {
    const tem = !!(estado.config.bloqueio || {}).temSenha;
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    const j = new Janela({ titulo: tirar ? tr('Tirar a senha') : tem ? tr('Trocar a senha') : tr('Criar a senha'), icone: 'chave', dialogo: true, largura: 360, altura: 200, aoFechar: () => { if (!feito) { feito = true; resolve(false); } } });
    const campo = () => h('input', { type: 'password', autocomplete: 'off', spellcheck: false });
    const atual = campo();
    const nova = campo();
    const repetir = campo();
    const aviso = h('div', { style: { color: 'var(--alerta)', minHeight: '13px', marginTop: '4px' } });
    const linha = (rot, c) => h('div', { style: { display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '6px', marginBottom: '6px' } }, h('span', rot), c);
    const ok = h('button.padrao', { type: 'button' }, tr('OK'));
    const confirmar = async () => {
      if (!tirar) {
        if (nova.value.length < 4) { aviso.textContent = tr('A senha precisa de pelo menos 4 letras ou números.'); return nova.focus(); }
        if (nova.value !== repetir.value) { aviso.textContent = tr('As duas senhas novas não são iguais.'); return repetir.focus(); }
      }
      ok.disabled = true;
      aviso.textContent = tr('Conferindo…');
      const r = await retro.bloqueio.definir(atual.value, tirar ? '' : nova.value).catch((e) => ({ ok: false, erro: e.message }));
      ok.disabled = false;
      if (r.ok) { await definirConfig({}); return fim(true); }
      aviso.textContent = r.senhaErrada ? tr('A senha atual não está certa.') : (r.erro || '?');
      (r.senhaErrada ? atual : nova).focus();
    };
    ok.addEventListener('click', confirmar);
    j.corpo.append(
      h('div.mensagem', img('chave', 32), h('div', { style: { flex: '1' } },
        tem ? linha(tr('Senha atual:'), atual) : null,
        tirar ? null : linha(tr('Senha nova:'), nova),
        tirar ? null : linha(tr('Repita a senha nova:'), repetir),
        aviso)),
      h('div.acoes.direita', ok, h('button', { type: 'button', on: { click: () => fim(false) } }, tr('Cancelar'))));
    j.corpo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } });
    ajustarAoConteudo(j, { minLarg: 360 });
    (tem ? atual : nova).focus();
  });
}

function dialogoSenhas() {
  const b = () => estado.config.bloqueio || {};
  const estadoEl = h('div', { style: { flex: '1', lineHeight: '13px' } });
  const btCriar = h('button', { type: 'button' });
  const btTirar = h('button', { type: 'button' }, tr('Tirar a senha…'));
  const chkVoltar = h('input', { type: 'checkbox', checked: b().aoVoltar !== false });
  const chkAbrir = h('input', { type: 'checkbox', checked: b().aoAbrir !== false });
  // No modo sistema, a proteção de tela pede a senha, a não ser que se tenha escolhido outra coisa.
  const chkProtecao = h('input', { type: 'checkbox', checked: 'naProtecao' in b() ? !!b().naProtecao : !!estado.config.modoSistema });
  const desenhar = () => {
    const tem = !!b().temSenha;
    const linux = !!b().senhaLinux;
    estadoEl.textContent = tem ? tr('Há uma senha para desbloquear o computador.')
      : linux ? tr('Sem uma senha própria, a senha de entrada do Linux bloqueia e desbloqueia o computador.')
        : tr('Ainda não há senha: a tela de bloqueio fica desligada.');
    btCriar.textContent = tem ? tr('Trocar a senha…') : tr('Criar a senha…');
    btTirar.disabled = !tem;
    for (const c of [chkVoltar, chkProtecao]) c.disabled = !tem && !linux;
    // Ao abrir, só com a senha do Retro Computer (a do Linux acabou de ser pedida na tela de entrada).
    chkAbrir.disabled = !tem;
  };
  btCriar.addEventListener('click', () => mudarSenha(false).then(desenhar));
  btTirar.addEventListener('click', () => mudarSenha(true).then(desenhar));
  desenhar();
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('chave', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('Com uma senha, o Retro Computer pode ficar bloqueado quando você sai de perto: Iniciar › Bloquear o computador.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Senha do Retro Computer')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, estadoEl),
      h('div', { style: { display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '8px' } }, btCriar, btTirar)),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Pedir a senha')),
      h('div', { style: { marginBottom: '5px' } }, h('label', chkVoltar, h('span', tr('Ao voltar da suspensão (ou ao fechar a tampa)')))),
      h('div', { style: { marginBottom: '5px' } }, h('label', chkProtecao, h('span', tr('Ao sair da proteção de tela')))),
      h('div', h('label', chkAbrir, h('span', tr('Ao abrir o Retro Computer')))),
      estado.config.plataforma === 'linux' ? h('div', { style: { color: 'var(--texto-fraco)', marginTop: '8px', lineHeight: '13px' } }, tr('No Linux, a senha de entrada do Linux também desbloqueia (para o caso de esquecer a do Retro Computer).')) : null));
  return dialogoBase({
    titulo: tr('Propriedades de Senhas'), icone: 'chave', larg: 400,
    abas: [{ titulo: tr('Tela de bloqueio'), conteudo }],
    aoAplicar: () => definirConfig({ bloqueio: { aoVoltar: chkVoltar.checked, aoAbrir: chkAbrir.checked, naProtecao: chkProtecao.checked } }),
  });
}

/* Usuários */

/**
 * Os usuários deste computador: criar, renomear e tirar (tirar nunca apaga nada: a pasta de
 * dados e o disco C: ficam onde estão). Cada um entra pela tela de entrada (Iniciar › Fazer logoff).
 */
function dialogoUsuarios() {
  const lista = () => perfisInfo().lista;
  let sel = Math.max(0, lista().findIndex((p) => p.atual));
  const caixa = h('div.campo.lp-lista', { tabIndex: 0, style: { height: '104px' } });
  const btNovo = h('button', { type: 'button' }, rotulo(tr('&Novo usuário…')));
  const btRenomear = h('button', { type: 'button' }, rotulo(tr('&Renomear…')));
  const btTirar = h('button', { type: 'button' }, rotulo(tr('&Tirar…')));
  const btSenha = h('button', { type: 'button', on: { click: () => abrir('painel', { secao: 'senhas' }) } }, rotulo(tr('&Senha…')));
  const discoEl = h('div.us-disco');
  const chkPerguntar = h('input', { type: 'checkbox', checked: perfisInfo().perguntar !== false });
  const emUso = h('div', { style: { lineHeight: '13px' } });
  let pedido = 0;
  const desenhar = () => {
    const l = lista();
    sel = Math.max(0, Math.min(sel, l.length - 1));
    caixa.replaceChildren(...l.map((p, i) => {
      const linha = h('div.lp-linha' + (i === sel ? '.sel' : ''), img('usuario', 16), h('span', nomeDoPerfil(p)),
        p.atual ? h('span.us-nota', tr('(em uso)')) : null, p.temSenha ? img('cadeado', 16) : null);
      linha.addEventListener('mousedown', () => { sel = i; desenhar(); });
      linha.addEventListener('dblclick', () => btRenomear.click());
      return linha;
    }));
    const p = l[sel];
    btTirar.disabled = p.id === 'principal' || p.atual;
    // A senha de cada um é a da tela de bloqueio dele (só dá para mudar a de quem está usando).
    btSenha.disabled = !p.atual;
    chkPerguntar.disabled = l.length < 2;
    emUso.textContent = tr('Quem está usando agora: {nome}.', { nome: nomeDoPerfil(l.find((x) => x.atual)) });
    const n = ++pedido;
    retro.perfis.disco(p.id).then((pasta) => { if (n === pedido) discoEl.textContent = tr('O disco C: de {nome} fica em: {pasta}', { nome: nomeDoPerfil(p), pasta: pasta || '?' }); }).catch(() => { });
  };
  const errar = (r) => erro(r.erro === 'repetido' ? tr('Já existe um usuário com esse nome.') : r.erro === 'nome' ? tr('Digite o nome do usuário.') : tr('Não foi possível mudar os usuários.'));
  btNovo.addEventListener('click', async () => {
    const nome = await entrada({ titulo: tr('Novo usuário'), texto: tr('O nome do novo usuário:'), icone: 'usuario' });
    if (nome == null) return;
    const r = await retro.perfis.criar(nome).catch(() => ({ ok: false }));
    if (!r.ok) return errar(r);
    atualizarPerfis(r.estado);
    sel = lista().findIndex((p) => p.id === r.id);
    desenhar();
    info(tr('O usuário {nome} foi criado, com uma área de trabalho nova e o disco C: em:\n\n{pasta}\n\nPara entrar com ele, use Iniciar › Fazer logoff.', { nome: nomeDoPerfil(lista()[sel]), pasta: r.disco }), tr('Novo usuário'));
  });
  btRenomear.addEventListener('click', async () => {
    const p = lista()[sel];
    const nome = await entrada({ titulo: tr('Renomear o usuário'), texto: tr('O novo nome de {nome}:', { nome: nomeDoPerfil(p) }), valor: p.nome || nomeDoPerfil(p), icone: 'usuario' });
    if (nome == null) return;
    const r = await retro.perfis.renomear(p.id, nome).catch(() => ({ ok: false }));
    if (!r.ok) return errar(r);
    atualizarPerfis(r.estado);
    desenhar();
  });
  btTirar.addEventListener('click', async () => {
    const p = lista()[sel];
    const pasta = await retro.perfis.disco(p.id).catch(() => null);
    if (!(await confirmar(tr('Tirar {nome} da lista de usuários?\n\nNada é apagado: os documentos continuam no disco C: de {nome}, em:\n\n{pasta}', { nome: nomeDoPerfil(p), pasta: pasta || '?' }), { titulo: tr('Tirar o usuário') }))) return;
    const r = await retro.perfis.remover(p.id).catch(() => ({ ok: false }));
    if (!r.ok) return errar(r);
    atualizarPerfis(r.estado);
    desenhar();
  });
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && sel > 0) { sel--; desenhar(); e.preventDefault(); }
    if (e.key === 'ArrowDown' && sel < lista().length - 1) { sel++; desenhar(); e.preventDefault(); }
    if (e.key === 'F2') btRenomear.click();
    if (e.key === 'Delete' && !btTirar.disabled) btTirar.click();
  });
  desenhar();
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('usuarios', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('Cada usuário tem a área de trabalho, as configurações, a senha e o disco C: próprios. Os programas instalados são de todos.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Usuários deste computador')),
      h('div.lp-topo', caixa, h('div.lp-botoes', btNovo, btRenomear, btTirar, btSenha)),
      discoEl, emUso),
    h('label', chkPerguntar, h('span', tr('Perguntar quem vai usar ao abrir o Retro Computer'))),
    // Os usuários não são uma barreira de segurança: o Prompt de qualquer um alcança os arquivos de todos.
    h('div', { style: { color: 'var(--texto-fraco)', marginTop: '8px', lineHeight: '13px' } }, tr('Os usuários separam as áreas de trabalho de quem divide o computador, mas não são uma proteção: o Prompt de comando de qualquer um deles alcança os arquivos de todos.')));
  return dialogoBase({
    titulo: tr('Propriedades de Usuários'), icone: 'usuarios', larg: 420,
    abas: [{ titulo: tr('Usuários'), conteudo }],
    aoAplicar: async () => {
      if (!chkPerguntar.disabled && chkPerguntar.checked !== (perfisInfo().perguntar !== false)) atualizarPerfis(await retro.perfis.perguntar(chkPerguntar.checked));
    },
  });
}

/* Programas padrão */

/** O nome do programa escolhido para o tipo (também o de um Craft que saiu do computador). */
function nomeDoPadrao(ext, id) {
  if (id === 'fora') return tr('Programa do computador principal');
  const p = programasPara('arquivo.' + ext).find((x) => x.id === id);
  if (p) return p.nome;
  const c = id.startsWith('craft:') && (estado.catalogo || []).find((x) => 'craft:' + x.id === id);
  return tr('{programa} (não instalado)', { programa: c ? c.nome : id });
}

/**
 * O programa de cada tipo de arquivo, como em "Abrir com › Escolher o programa…": a lista dos tipos
 * que têm um escolhido, Mudar, Voltar ao normal (o programa de sempre) e Novo tipo. Grava no OK.
 */
function dialogoPadroes() {
  const pend = { ...(estado.config.abrirCom || {}) };
  const tipos = () => Object.keys(pend).filter((e) => pend[e]).sort();
  let sel = 0;
  const caixa = h('div.campo.lp-lista', { tabIndex: 0, style: { height: '150px' } });
  const btNovo = h('button', { type: 'button' }, rotulo(tr('&Novo tipo…')));
  const btMudar = h('button', { type: 'button' }, rotulo(tr('&Mudar…')));
  const btVoltar = h('button', { type: 'button' }, rotulo(tr('&Voltar ao normal')));
  const descricao = h('div', { style: { lineHeight: '13px', minHeight: '26px', marginTop: '6px' } });
  const desenhar = () => {
    const l = tipos();
    sel = Math.max(0, Math.min(sel, l.length - 1));
    caixa.replaceChildren(...(l.length ? l.map((ext, i) => {
      const linha = h('div.lp-linha' + (i === sel ? '.sel' : ''), img(tipoDe('a.' + ext).icone, 16),
        h('span', { style: { width: '64px', flex: 'none' } }, '.' + ext), h('span', nomeDoPadrao(ext, pend[ext])));
      linha.addEventListener('mousedown', () => { sel = i; desenhar(); });
      linha.addEventListener('dblclick', () => btMudar.click());
      return linha;
    }) : [h('div', { style: { color: 'var(--texto-fraco)', padding: '2px 3px' } }, tr('Nenhum tipo tem um programa escolhido.'))]));
    btMudar.disabled = btVoltar.disabled = !l.length;
    descricao.textContent = l.length ? tr('Os arquivos {tipo} (.{ext}) abrem com {programa}.', { tipo: tipoDe('a.' + l[sel]).descricao, ext: l[sel], programa: nomeDoPadrao(l[sel], pend[l[sel]]) }) : '';
  };
  const mudar = async (ext) => {
    const v = await escolherPrograma({ nome: 'arquivo.' + ext, soPadrao: true, guardar: false, atual: pend[ext] || null });
    if (!v) return;
    pend[ext] = v;
    sel = tipos().indexOf(ext);
    desenhar();
  };
  btMudar.addEventListener('click', () => { const ext = tipos()[sel]; if (ext) mudar(ext); });
  btVoltar.addEventListener('click', () => { const ext = tipos()[sel]; if (!ext) return; pend[ext] = null; desenhar(); });
  btNovo.addEventListener('click', async () => {
    const v = await entrada({ titulo: tr('Novo tipo'), texto: tr('A extensão do tipo de arquivo (por exemplo, docx):'), icone: 'programa' });
    const ext = String(v || '').trim().replace(/^\*?\./, '').toLowerCase();
    if (!ext) return;
    if (!/^[a-z0-9_-]{1,12}$/.test(ext)) return erro(tr('"{ext}" não é uma extensão de arquivo.', { ext: v }));
    mudar(ext);
  });
  caixa.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && sel > 0) { sel--; desenhar(); e.preventDefault(); }
    if (e.key === 'ArrowDown' && sel < tipos().length - 1) { sel++; desenhar(); e.preventDefault(); }
    if (e.key === 'Enter' && !btMudar.disabled) btMudar.click();
    if (e.key === 'Delete' && !btVoltar.disabled) btVoltar.click();
  });
  desenhar();
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('programa', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('Os tipos de arquivo com um programa escolhido abrem com ele nos dois cliques. Os outros abrem com o programa de sempre. Para escolher, você também pode usar o botão direito: Abrir com › Escolher o programa…'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Tipos de arquivo')),
      h('div.lp-topo', caixa, h('div.lp-botoes', btNovo, btMudar, btVoltar)), descricao));
  return dialogoBase({
    titulo: tr('Programas padrão'), icone: 'programa', larg: 420,
    abas: [{ titulo: tr('Abrir com'), conteudo }],
    aoAplicar: async () => {
      const atual = estado.config.abrirCom || {};
      const mudou = {};
      for (const ext of new Set([...Object.keys(atual), ...Object.keys(pend)])) {
        if ((atual[ext] || null) !== (pend[ext] || null)) mudou[ext] = pend[ext] || null;
      }
      if (Object.keys(mudou).length) await definirConfig({ abrirCom: mudou });
    },
  });
}

/* Teclado */

// Os layouts mais comuns (o do Linux: layout e variante do setxkbmap).
const LAYOUTS = [
  ['br', 'abnt2', marcar('Português (Brasil, ABNT2)')],
  ['us', 'intl', marcar('Inglês (EUA, internacional com teclas mortas)')],
  ['us', '', marcar('Inglês (EUA)')],
  ['pt', '', marcar('Português (Portugal)')],
  ['es', '', marcar('Espanhol (Espanha)')],
  ['latam', '', marcar('Espanhol (América Latina)')],
  ['gb', '', marcar('Inglês (Reino Unido)')],
];

function dialogoTeclado() {
  const c = estado.config;
  const sistema = !!c.modoSistema;
  const sel = h('select', { style: { width: '100%' }, disabled: !sistema }, ...LAYOUTS.map(([l, v, rot]) => h('option', { value: l + ':' + v }, tr(rot))));
  const teste = h('input', { type: 'text', spellcheck: false, placeholder: tr('Digite aqui para testar: ação, você, ñ…'), style: { width: '100%' } });
  retro.sistema.teclado().then((q) => {
    if (!q || !q.layout) return;
    const valor = q.layout + ':' + (q.variante || '');
    // Um layout fora da lista aparece também, com o nome do Linux.
    if (![...sel.options].some((o) => o.value === valor)) sel.append(h('option', { value: valor }, q.variante ? `${q.layout} (${q.variante})` : q.layout));
    sel.value = valor;
  }).catch(() => { });
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('teclado', 32),
      h('div', { style: { lineHeight: '13px' } }, sistema
        ? tr('O layout diz o que cada tecla escreve. Para os teclados americanos com acentos por teclas mortas (´ + a = á, e ´ + c = ç, como no Windows), escolha "Inglês (EUA, internacional com teclas mortas)".')
        : tr('O layout do teclado é o do computador principal: troque-o nas configurações do sistema dele.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Layout do teclado')), h('div.select-caixa', { style: { width: '100%' } }, sel)),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Testar')), teste));
  // Os atalhos: o histórico da área de transferência (logotipo + V) e o caminho para a lista das teclas.
  const chkHistorico = h('input', { type: 'checkbox', checked: !c.transferencia || c.transferencia.historico !== false });
  const atalhos = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Área de transferência')),
      h('label', chkHistorico, h('span', tr('Guardar o histórico do que é copiado (logotipo + V)'))),
      h('div', { style: { color: 'var(--texto-fraco)', marginTop: '6px', lineHeight: '13px' } },
        tr('Os últimos 25 textos copiados, só na memória: nada vai para o disco, e tudo some ao fechar o Retro Computer. O que os gerenciadores de senhas marcam como secreto fica de fora.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Teclas de atalho')),
      h('div', { style: { lineHeight: '13px' } }, tr('Alt+Tab troca de janela, Alt+F4 fecha, e a tecla do logotipo com uma letra abre o que se usa mais: E, o Explorador; R, o Executar; D, a área de trabalho; V, a área de transferência; L, o bloqueio.')),
      h('div.acoes', { style: { marginTop: '8px' } }, h('button', { type: 'button', on: { click: () => abrir('ajuda', { topico: 'atalhos' }) } }, tr('Ver todas as teclas…')))));
  dialogoBase({
    titulo: tr('Propriedades de Teclado'), icone: 'teclado', larg: 400, altMin: 430,
    abas: [{ titulo: tr('Idioma do teclado'), conteudo }, { titulo: tr('Atalhos'), conteudo: atalhos }],
    aoAplicar: async () => {
      await definirConfig({ transferencia: { historico: chkHistorico.checked } });
      if (!sistema) return;
      const [l, v] = sel.value.split(':');
      const r = await retro.sistema.teclado(l, v).catch((e) => ({ ok: false, erro: e.message }));
      if (!r.ok) erro(tr('Não foi possível trocar o layout do teclado: {erro}', { erro: r.erro || '?' }));
      // As teclas mortas do layout novo (as regras do Windows no EUA internacional) valem ao abrir de novo.
      else if (r.reabrir && await confirmar(tr('O jeito de juntar os acentos do layout novo vale depois de abrir o Retro Computer de novo. Abrir de novo agora?'), { titulo: tr('Propriedades de Teclado') })) return retro.sistema.reabrir();
      teste.focus();
    },
  });
}

/* Mouse e touchpad (no modo sistema, pelo xinput; fora dele, os do computador principal) */

async function dialogoMouse() {
  const titulo = tr('Propriedades de Mouse');
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const est = await retro.mouse.estado().catch(() => ({ disponivel: false }));
  const aparelhos = est.disponivel ? est.aparelhos || [] : [];
  const m = aparelhos.find((a) => a.tipo === 'mouse');
  const t = aparelhos.find((a) => a.tipo === 'touchpad');
  const cabeca = (icone, texto) => h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img(icone, 32), h('div', { style: { lineHeight: '13px' } }, texto));

  if (!m && !t) {
    const plat = estado.config.plataforma;
    const texto = est.disponivel
      ? tr('Nenhum mouse ou touchpad com o controlador libinput foi encontrado. Os aparelhos com outro controlador seguem as configurações do Linux.')
      : tr('O mouse e o touchpad seguem as configurações do computador principal.');
    const botao = !est.disponivel && (plat === 'win32' || plat === 'darwin')
      ? h('div.acoes', h('button', { type: 'button', on: { click: () => retro.mouse.configuracoesDoSistema().catch(() => { }) } }, tr('Abrir as configurações do sistema…')))
      : null;
    return dialogoBase({ titulo, icone: 'mouse', larg: 380, abas: [{ titulo: tr('Geral'), conteudo: h('div', cabeca('mouse', texto), botao) }] });
  }

  // Uma caixa de marcar com o valor do aparelho (apagada quando ele não tem a opção). Sem o
  // aparelho ligado, ela começa no padrão do libinput e vale para quando ele for ligado.
  const caixa = (ap, chave, rotuloCaixa, padrao = false) => {
    const c = h('input', { type: 'checkbox', checked: ap ? !!ap.valores[chave] : padrao, disabled: ap ? !ap.pode[chave] : false });
    return { c, chave, el: h('div', { style: { marginTop: '4px' } }, h('label', c, h('span', rotuloCaixa))) };
  };
  // A velocidade: o deslizante vai de 0 a 20, e o libinput, de -1 a 1.
  const velocidade = (ap, rotuloDesl) => {
    const d = deslizante({ valor: Math.round(((ap && ap.valores.velocidade) || 0) * 10) + 10, min: 0, max: 20, tamanho: 180, passo: 1, passoGrande: 4, rotulo: rotuloDesl });
    if (ap && !ap.pode.velocidade) d.el.style.opacity = '0.5';
    return { d, el: h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' } }, h('span', tr('Lenta')), d.el, h('span', tr('Rápida'))) };
  };
  const grupo = (legenda, ...filhos) => h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', legenda), ...filhos);

  // Botões: a mão do botão principal (para o mouse e o touchpad) e a área de teste.
  const podeCanhoto = aparelhos.some((a) => a.pode.canhoto);
  const canhoto = aparelhos.some((a) => a.valores.canhoto);
  const radioDestro = h('input', { type: 'radio', name: 'mouse-mao', checked: !canhoto, disabled: !podeCanhoto });
  const radioCanhoto = h('input', { type: 'radio', name: 'mouse-mao', checked: canhoto, disabled: !podeCanhoto });
  const funcoes = h('div', { style: { lineHeight: '13px', marginTop: '8px' } });
  const mostrarFuncoes = () => {
    funcoes.textContent = radioCanhoto.checked
      ? tr('Botão direito: selecionar e arrastar. Botão esquerdo: o menu de cada objeto.')
      : tr('Botão esquerdo: selecionar e arrastar. Botão direito: o menu de cada objeto.');
  };
  for (const r of [radioDestro, radioCanhoto]) r.addEventListener('change', mostrarFuncoes);
  mostrarFuncoes();
  const pasta = img('pasta', 32);
  let pastaAberta = false;
  const teste = h('div.mouse-teste.afundado', { title: tr('Clique duas vezes na pasta para testar.') }, pasta);
  teste.addEventListener('dblclick', () => { pastaAberta = !pastaAberta; pasta.src = icone(pastaAberta ? 'pasta-aberta' : 'pasta', 32); });
  const botoes = h('div',
    grupo(tr('Configuração dos botões'),
      h('div', { style: { display: 'flex', gap: '16px' } }, h('label', radioDestro, h('span', tr('Destro'))), h('label', radioCanhoto, h('span', tr('Canhoto')))),
      funcoes),
    grupo(tr('Área de teste'), h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, teste,
      h('div', { style: { lineHeight: '13px' } }, tr('Clique duas vezes na pasta para testar: ela abre e fecha.')))));

  // Movimento: o mouse.
  const velM = velocidade(m, tr('Velocidade do ponteiro do mouse'));
  const acelM = caixa(m, 'aceleracao', tr('Aceleração: o ponteiro vai mais longe quando o mouse anda depressa'), true);
  const natM = caixa(m, 'natural', tr('Rolagem natural (ao contrário da de costume, como na tela de um celular)'));
  const movimento = h('div',
    grupo(tr('Velocidade do ponteiro'), velM.el, acelM.el),
    grupo(tr('Roda do mouse'), natM.el),
    m ? null : h('div', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } }, tr('Nenhum mouse ligado agora: estas opções valem quando um for ligado.')));

  // O touchpad.
  const velT = velocidade(t, tr('Velocidade do ponteiro do touchpad'));
  const caixasT = [
    caixa(t, 'tocar', tr('Tocar para clicar (com dois dedos, o botão direito)')),
    caixa(t, 'doisDedos', tr('Rolar com dois dedos (sem esta opção, pela borda direita)')),
    caixa(t, 'cliqueDedos', tr('Clicar com dois dedos para o botão direito (sem esta opção, no canto de baixo à direita)')),
    caixa(t, 'natural', tr('Rolagem natural (como na tela de um celular)')),
  ];
  const deslT = [caixa(t, 'digitando', tr('Enquanto se digita')), caixa(t, 'comMouse', tr('Quando um mouse estiver ligado'))];
  const touchpad = t ? h('div',
    grupo(tr('Velocidade do ponteiro'), velT.el),
    grupo(tr('Toques e gestos'), ...caixasT.map((x) => x.el)),
    grupo(tr('Desligar o touchpad'), ...deslT.map((x) => x.el))) : null;

  const abas = [{ titulo: tr('Botões'), conteudo: botoes }, { titulo: tr('Movimento'), conteudo: movimento }];
  if (touchpad) abas.push({ titulo: tr('Touchpad'), conteudo: touchpad });
  return dialogoBase({
    titulo, icone: 'mouse', larg: 420, altMin: touchpad ? 430 : 0, abas,
    aoAplicar: async () => {
      const marcadas = (lista) => Object.fromEntries(lista.filter((x) => !x.c.disabled).map((x) => [x.chave, x.c.checked]));
      const esc = { mouse: marcadas([acelM, natM]), touchpad: t ? marcadas([...caixasT, ...deslT]) : {} };
      if (podeCanhoto) esc.canhoto = radioCanhoto.checked;
      if (!m || m.pode.velocidade) esc.mouse.velocidade = (velM.d.valor() - 10) / 10;
      if (t && t.pode.velocidade) esc.touchpad.velocidade = (velT.d.valor() - 10) / 10;
      const r = await retro.mouse.aplicar(esc).catch((e) => ({ ok: false, erro: e.message }));
      if (!r || !r.ok) erro(tr('Não foi possível mudar o mouse: {erro}', { erro: (r && r.erro) || '?' }));
    },
  });
}

/* A Central de segurança: o estado de cada proteção e as opções de privacidade */

function dialogoSeguranca() {
  const linux = estado.config.plataforma === 'linux';
  // Uma linha do estado: o nome, a situação (boa ou não), o que ela quer dizer e o botão que leva à configuração.
  const linha = (titulo, botao, aoClicar) => {
    const situacao = h('span.seg-estado', tr('Lendo…'));
    const texto = h('div.seg-texto');
    const el = h('div.seg-linha',
      h('div', h('div.seg-cabeca', h('b', titulo), situacao), texto),
      h('button', { type: 'button', on: { click: aoClicar } }, botao));
    const definir = (bom, etiqueta, detalhe) => {
      situacao.textContent = etiqueta;
      situacao.className = 'seg-estado ' + (bom ? 'bom' : 'ruim');
      texto.textContent = detalhe;
    };
    return { el, definir };
  };
  // Quando a configuração de uma linha fecha, o estado é lido de novo.
  const depois = (j) => { if (j && j.ev) j.ev.on('fechada', () => ler()); };

  const bloq = linha(tr('Tela de bloqueio'), tr('Senhas…'), () => depois(dialogoSenhas()));
  const fw = linux ? linha(tr('Firewall'), tr('Configurar…'), () => depois(dialogoFirewall())) : null;
  const atl = linux ? linha(tr('Atualizações de segurança'), tr('Atualizações…'), () => abrir('atualizacoes')) : null;
  const chave = linha(tr('Chave de API do Claude'), tr('Claude…'), () => dialogoClaude());
  const av = linha(tr('Antivírus'), tr('Verificar…'), () => abrir('antivirus'));

  async function ler() {
    const b = estado.config.bloqueio || {};
    const com = b.temSenha ? tr('Com senha') : tr('Com a senha do Linux');
    const naProtecao = 'naProtecao' in b ? !!b.naProtecao : !!estado.config.modoSistema;
    if (!b.temSenha && !b.senhaLinux) bloq.definir(false, tr('Sem senha'), tr('Qualquer pessoa perto do computador usa os seus arquivos e as suas contas.'));
    else if (b.aoVoltar !== false && naProtecao) bloq.definir(true, com, tr('A senha é pedida ao voltar da suspensão e ao sair da proteção de tela.'));
    else if (b.aoVoltar !== false) bloq.definir(true, com, tr('A senha é pedida ao voltar da suspensão, mas não ao sair da proteção de tela.'));
    else if (naProtecao) bloq.definir(true, com, tr('A senha é pedida ao sair da proteção de tela, mas não ao voltar da suspensão.'));
    else bloq.definir(true, com, tr('A senha só é pedida quando você bloqueia: Iniciar › Bloquear o computador.'));
    if (fw) {
      const e = await retro.firewall.estado().catch(() => null);
      if (!e || !e.disponivel) fw.definir(false, tr('Indisponível'), tr('O firewall deste computador é configurado pelo próprio sistema.'));
      else if (!e.instalado) fw.definir(false, tr('Não instalado'), tr('O firewall do Linux (ufw) não está instalado. Configurar… o instala e liga.'));
      else if (e.ligado) fw.definir(true, tr('Ligado'), tr('Ligado: ninguém de fora abre conexões com este computador.'));
      else fw.definir(false, tr('Desligado'), tr('Desligado: outros computadores da rede podem tentar se conectar a este.'));
    }
    if (atl) {
      const r = await retro.atualizacoesLinux.listar().catch(() => ({ disponivel: false }));
      if (!r.disponivel) atl.definir(true, tr('Pelo sistema'), tr('As atualizações deste sistema são feitas pelo próprio sistema.'));
      else if (r.automaticas) atl.definir(true, tr('Automáticas'), tr('As correções de segurança do Linux entram sozinhas, todo dia.'));
      else atl.definir(false, tr('Manuais'), tr('As correções de segurança só entram quando você as instala.'));
    }
    const e = await retro.antivirus.estado().catch(() => ({ disponivel: false }));
    if (e.disponivel) av.definir(true, tr('Pronto'), e.motor === 'clamav' ? tr('O ClamAV verifica o disco C:, uma pasta ou um pendrive quando você pede (botão direito › Verificar com o antivírus).') : tr('O Microsoft Defender do Windows protege sempre; aqui, ele verifica o que você pedir.'));
    else if (e.instalavel) av.definir(false, tr('Não instalado'), tr('O antivírus ClamAV não está instalado. Verificar… o instala.'));
    else av.definir(true, tr('Pelo sistema'), tr('O próprio sistema verifica os arquivos.'));
    const s = await retro.seguranca.estado().catch(() => ({}));
    if (s.chaveiro === 'trancado') chave.definir(false, tr('Chaveiro trancado'), tr('O chaveiro do Linux está trancado: a chave e os cookies do Navegador esperam a senha de entrada. Claude… o abre.'));
    else if (!s.temChave) chave.definir(true, tr('Nenhuma'), tr('Nenhuma chave de API guardada (o Claude Code pode entrar com a conta).'));
    else if (s.chaveiro === 'basic_text') chave.definir(false, tr('Sem chaveiro'), tr('Sem o chaveiro do Linux, a chave fica só embaralhada no disco. Instale o GNOME Keyring (o pacote gnome-keyring) e entre de novo no computador.'));
    else chave.definir(true, tr('Cifrada'), tr('A chave fica cifrada pelo cofre de senhas do sistema.'));
  }

  const estadoAba = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('seguranca', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('O estado das proteções deste computador. O que estiver em vermelho merece uma olhada.'))),
    bloq.el, fw && fw.el, atl && atl.el, av.el, chave.el);

  const n = estado.config.navegador || {};
  const chkHttps = h('input', { type: 'checkbox', checked: n.soHttps !== false });
  const chkLimpar = h('input', { type: 'checkbox', checked: !!n.limparAoFechar });
  const chkPropaganda = h('input', { type: 'checkbox', checked: n.bloquearPropaganda !== false });
  const chkHistorico = h('input', { type: 'checkbox', checked: !estado.config.transferencia || estado.config.transferencia.historico !== false });
  const nota = (texto) => h('div', { style: { color: 'var(--texto-fraco)', margin: '4px 0 10px 18px', lineHeight: '13px' } }, texto);
  const privacidade = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Navegador')),
      h('label', chkHttps, h('span', tr('Só conexões seguras (HTTPS)'))),
      nota(tr('Os endereços http:// abrem na versão segura; o site que não a tiver só abre depois de um aviso. Os aparelhos da rede de casa (o roteador, a impressora) ficam de fora.')),
      h('label', chkPropaganda, h('span', tr('Bloquear propagandas e rastreadores'))),
      nota(tr('Os anúncios e os rastreadores das redes conhecidas não carregam, e os espaços deles somem da página. Um site que não funcionar bem pode ficar de fora (no Navegador, Exibir › Permitir as propagandas neste site).')),
      h('label', chkLimpar, h('span', tr('Apagar os dados de navegação ao fechar o Retro Computer'))),
      nota(tr('Os cookies, os dados dos sites e os arquivos temporários. Ao abrir de novo, é preciso entrar outra vez nas contas.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Área de transferência')),
      h('label', chkHistorico, h('span', tr('Guardar o histórico do que é copiado (logotipo + V)'))),
      nota(tr('Os últimos 25 textos copiados, só na memória: nada vai para o disco, e tudo some ao fechar o Retro Computer. O que os gerenciadores de senhas marcam como secreto fica de fora.'))));

  const j = dialogoBase({
    titulo: tr('Central de segurança'), icone: 'seguranca', larg: 440, altMin: 470,
    abas: [{ titulo: tr('Estado'), conteudo: estadoAba }, { titulo: tr('Privacidade'), conteudo: privacidade }],
    aoAplicar: () => definirConfig({ navegador: { soHttps: chkHttps.checked, limparAoFechar: chkLimpar.checked, bloquearPropaganda: chkPropaganda.checked }, transferencia: { historico: chkHistorico.checked } }),
  });
  if (j) ler();
  return j;
}

/* A cópia de segurança do disco C: */

// O que dizer de cada erro da cópia (copia.js).
export function erroDaCopia(r) {
  if (r.erro === 'destino') return tr('Escolha uma pasta fora do disco C: (e que não o contenha).');
  if (r.erro === 'semDestino') return tr('A pasta da cópia não está disponível. O disco externo ou o pendrive está ligado?');
  if (r.erro === 'espaco') return tr('Falta espaço no destino: a cópia precisa de {precisa}, e há {livre}.', { precisa: tamanho(r.bytes), livre: tamanho(r.livre) });
  if (r.erros && r.erros.length) return tr('{n} arquivo(s) não foram copiados.', { n: typeof r.erros === 'number' ? r.erros : r.erros.length });
  return '';
}

function dialogoCopia() {
  const c = { ligada: false, destino: '', quando: 'diaria', ...(estado.config.copia || {}) };
  let destino = c.destino || '';
  const campo = h('input', { type: 'text', readOnly: true, value: destino, placeholder: tr('Nenhuma pasta escolhida'), style: { flex: '1', minWidth: '0' } });
  const chk = h('input', { type: 'checkbox', checked: !!c.ligada });
  const sel = h('select', h('option', { value: 'diaria' }, tr('Todo dia')), h('option', { value: 'semanal' }, tr('Toda semana')));
  sel.value = c.quando === 'semanal' ? 'semanal' : 'diaria';
  const situacao = h('div', { style: { lineHeight: '13px', minHeight: '26px' } });
  const btAgora = h('button', { type: 'button' }, rotulo(tr('&Fazer a cópia agora')));
  const btAbrir = h('button', { type: 'button' }, rotulo(tr('A&brir a cópia')));
  const quando = (t) => new Date(t).toLocaleString(localidade(), { dateStyle: 'short', timeStyle: 'short' });
  const mostrar = () => {
    const r = (estado.config.copia || {}).resultado;
    const ultima = (estado.config.copia || {}).ultima;
    if (!r && !ultima) situacao.textContent = tr('Nenhuma cópia feita ainda.');
    else if (r && !r.ok) situacao.textContent = tr('A última tentativa ({quando}) não terminou: {erro}', { quando: quando(r.em), erro: erroDaCopia(r) || '?' });
    else situacao.textContent = tr('Última cópia: {quando} ({n} arquivo(s) copiado(s); {iguais} já estavam iguais).', { quando: quando(ultima), n: r ? r.copiados : 0, iguais: r ? r.iguais : 0 });
  };
  const atualizarBotoes = () => { sel.disabled = !chk.checked; btAgora.disabled = !destino; };
  chk.addEventListener('change', atualizarBotoes);
  const escolher = async () => {
    const r = await retro.copia.escolher().catch(() => null);
    if (!r) return;
    if (!r.valido) { erro(tr('Escolha uma pasta fora do disco C: (e que não o contenha).')); return; }
    destino = r.destino;
    campo.value = destino;
    atualizarBotoes();
  };
  const desligar = [];
  btAgora.addEventListener('click', async () => {
    btAgora.disabled = true;
    situacao.textContent = tr('Copiando…');
    desligar.push(retro.copia.aoProgresso((p) => { situacao.textContent = tr('Copiando: {n} de {total} arquivo(s)…', { n: p.copiados, total: p.total }); }));
    await definirConfig({ copia: { destino } });
    await retro.copia.fazer(destino).catch(() => null);
    await carregarConfig();
    mostrar();
    atualizarBotoes();
  });
  btAbrir.addEventListener('click', async () => { if (!(await retro.copia.abrir().catch(() => false))) erro(tr('A cópia ainda não existe nesse destino, ou ele não está disponível.')); });
  mostrar();
  atualizarBotoes();
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('copia', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('A cópia leva o disco C: inteiro, com a Lixeira e as versões anteriores, para outra pasta: um disco externo, um pendrive ou a pasta de uma nuvem do computador principal. Ela só acrescenta e atualiza: nada é apagado na cópia.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Destino')),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, campo, h('button', { type: 'button', on: { click: escolher } }, rotulo(tr('&Escolher…'))))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Quando')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('label', chk, h('span', tr('Fazer a cópia sozinho:'))), h('div.select-caixa', sel)),
      h('div', { style: { color: 'var(--texto-fraco)', marginTop: '6px', lineHeight: '13px' } }, tr('Com o destino desligado (o disco externo guardado), a cópia espera: ela é feita quando ele voltar.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Situação')), situacao,
      h('div.acoes', { style: { marginTop: '8px' } }, btAgora, btAbrir)));
  const j = dialogoBase({
    titulo: tr('Propriedades de Cópia de segurança'), icone: 'copia', larg: 440,
    abas: [{ titulo: tr('Geral'), conteudo }],
    aoAplicar: async () => {
      if (chk.checked && !destino) { erro(tr('Escolha antes a pasta da cópia.')); chk.checked = false; atualizarBotoes(); }
      await definirConfig({ copia: { ligada: chk.checked, quando: sel.value, destino } });
    },
  });
  if (j) j.ev.on('fechada', () => desligar.forEach((f) => f && f()));
  return j;
}

/* Firewall (o ufw do Linux) */

function dialogoFirewall() {
  const radioLigado = h('input', { type: 'radio', name: 'firewall', disabled: true });
  const radioDesligado = h('input', { type: 'radio', name: 'firewall', disabled: true });
  const nota = h('div', { style: { color: 'var(--texto-fraco)', marginTop: '8px', lineHeight: '13px' } }, tr('Lendo…'));
  let antes = null;
  retro.firewall.estado().then((e) => {
    if (!e || !e.disponivel) { nota.textContent = tr('O firewall deste computador é configurado pelo próprio sistema.'); return; }
    antes = !!e.ligado;
    radioLigado.checked = antes;
    radioDesligado.checked = !antes;
    if (e.instalado || e.podeInstalar) radioLigado.disabled = radioDesligado.disabled = false;
    nota.textContent = !e.instalado
      ? (e.podeInstalar ? tr('O firewall do Linux (ufw) ainda não está instalado: ligar o instala.') : tr('O firewall do Linux (ufw) não está instalado.'))
      : antes ? tr('Ligado: ninguém de fora abre conexões com este computador.') : tr('Desligado: outros computadores da rede podem tentar se conectar a este.');
  }).catch(() => { nota.textContent = tr('O firewall deste computador é configurado pelo próprio sistema.'); });
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('firewall', 32),
      h('div', { style: { lineHeight: '13px' } }, tr('O firewall recusa as conexões que outros computadores tentam abrir neste. A internet, os downloads e os programas continuam como antes.'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Firewall')),
      h('div', h('label', radioLigado, h('span', tr('Ligado (recomendado)')))),
      h('div', { style: { marginTop: '6px' } }, h('label', radioDesligado, h('span', tr('Desligado')))),
      nota));
  return dialogoBase({
    titulo: tr('Propriedades do Firewall'), icone: 'firewall', larg: 400, altMin: 320,
    abas: [{ titulo: tr('Geral'), conteudo }],
    aoAplicar: async () => {
      if (antes === null || radioLigado.disabled || radioLigado.checked === antes) return;
      const ligar = radioLigado.checked;
      const r = await comSenhaAdmin(ligar ? tr('Para ligar o firewall, digite a senha de administrador:') : tr('Para desligar o firewall, digite a senha de administrador:'),
        (senha) => retro.firewall.definir(ligar, senha));
      if (r && r.ok) {
        antes = ligar;
        nota.textContent = ligar ? tr('Ligado: ninguém de fora abre conexões com este computador.') : tr('Desligado: outros computadores da rede podem tentar se conectar a este.');
        return;
      }
      radioLigado.checked = antes;
      radioDesligado.checked = !antes;
      if (r && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível mudar o firewall: {erro}', { erro: r.erro || '?' }));
    },
  });
}

/* Disco */

async function dialogoDisco() {
  const raiz = await retro.disco.raiz();
  const esp = await retro.disco.espaco();
  const lixo = await retro.disco.lixeira();
  const usado = esp.total - esp.livre;
  const pct = esp.total ? usado / esp.total : 0;
  const pizza = h('div', { style: { width: '120px', height: '60px', margin: '10px auto', borderRadius: '50%', background: `conic-gradient(#0000ff 0 ${pct * 360}deg, #ff00ff ${pct * 360}deg 360deg)`, boxShadow: '0 6px 0 #555', transform: 'scaleY(0.75)' } });
  const caminho = h('div.campo', { style: { height: 'auto', userSelect: 'text', overflowWrap: 'anywhere', marginBottom: '8px' } }, raiz);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('disco', 32), h('b', tr('Disco local (C:)'))),
    h('hr.sulco'),
    h('div', tr('Pasta no computador principal:')),
    caminho,
    h('div', { style: { display: 'flex', gap: '6px', marginBottom: '10px' } },
      h('button', { on: { click: () => retro.disco.mostrar('') } }, tr('Mostrar a pasta')),
      estado.config.portatil ? null : h('button', { on: { click: trocar } }, tr('Trocar a pasta…'))),
    // No modo portátil, o disco vai junto com o programa (num pendrive, por exemplo).
    estado.config.portatil ? h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginBottom: '10px' } }, tr('Modo portátil: as configurações, os programas e o disco C: ficam na pasta "Retro Computer (dados)", ao lado do programa.')) : null,
    h('hr.sulco'),
    h('div', { style: { display: 'grid', gridTemplateColumns: '14px 100px 1fr', gap: '4px 6px', alignItems: 'center' } },
      h('div', { style: { width: '12px', height: '12px', background: '#0000ff', boxShadow: 'inset 0 0 0 1px #000' } }), tr('Espaço usado:'), tamanho(usado),
      h('div', { style: { width: '12px', height: '12px', background: '#ff00ff', boxShadow: 'inset 0 0 0 1px #000' } }), tr('Espaço livre:'), tamanho(esp.livre),
      h('div'), tr('Capacidade:'), tamanho(esp.total)),
    pizza,
    h('hr.sulco'),
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, img(lixo.length ? 'lixeira-cheia' : 'lixeira', 32),
      h('div', { style: { flex: '1' } }, tr('A Lixeira tem {n} item(ns). Os itens só são apagados de verdade quando você a esvazia.', { n: lixo.length })),
      h('button', { disabled: !lixo.length, on: { click: () => esvaziarLixeira() } }, tr('Esvaziar'))),
    // O que ocupa o disco e a limpeza ficam no programa Discos.
    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
      h('button', { on: { click: () => abrir('discos', { aba: 1 }) } }, tr('Limpeza de disco…'))),
  );
  async function trocar() {
    const ok = await confirmar(tr('O Retro Computer vai passar a usar outra pasta como disco C:.\n\nOs arquivos da pasta atual continuam onde estão; nada é apagado.\n\nDeseja escolher a nova pasta?'), { titulo: tr('Trocar a pasta do disco') });
    if (!ok) return;
    const nova = await retro.disco.trocar().catch((e) => { erro(e.message); return null; });
    if (nova) {
      caminho.textContent = nova;
      await carregarConfig();
      avisar(tr('Disco C: trocado'), nova, { som: null });
      document.dispatchEvent(new CustomEvent('retro-disco-trocado'));
    }
  }
  // A aba do computador principal (fora do modo sistema): as pastas de lá no Meu computador e os
  // caminhos de lá para cá. Os atalhos lá fora só são criados quando o usuário pede.
  const pc = await retro.computador.estado().catch(() => null);
  const abas = [{ titulo: tr('Geral'), conteudo }];
  // A busca pelo conteúdo: o índice dos documentos (só neste computador; desligado, ele é apagado).
  const chkConteudo = h('input', { type: 'checkbox', checked: (estado.config.busca || {}).conteudo !== false });
  const situacaoIndice = h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginTop: '8px' } });
  retro.indice.estado().then((e) => {
    situacaoIndice.textContent = !e.ligado ? '' : e.faltam
      ? tr('{n} documento(s) no índice; faltam {f}.', { n: e.comTexto, f: e.faltam })
      : tr('{n} documento(s) no índice.', { n: e.comTexto });
  }).catch(() => { });
  abas.push({
    titulo: tr('Busca'),
    conteudo: h('div',
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('localizar', 32), h('b', tr('Busca pelo conteúdo'))),
      h('hr.sulco'),
      h('div', { style: { lineHeight: '13px', margin: '8px 0' } }, tr('O Localizar e a caixa de busca da barra de tarefas também procuram dentro dos documentos: textos, Word, OpenDocument, planilhas, apresentações e PDFs. O texto de cada um fica guardado só neste computador, na pasta de dados do Retro Computer.')),
      h('label', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, chkConteudo, rotulo(tr('Procurar também &dentro dos arquivos'))),
      h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginTop: '8px' } }, tr('Desligada, a busca fica só pelos nomes, e o texto guardado é apagado.')),
      situacaoIndice),
  });
  let chkFora = null;
  let chkEnviar = null;
  if (pc && pc.disponivel) {
    chkFora = h('input', { type: 'checkbox', checked: pc.visivel });
    chkEnviar = pc.plataforma === 'win32' ? h('input', { type: 'checkbox', checked: pc.enviarPara }) : null;
    const btAtalho = h('button', { type: 'button', disabled: pc.atalhoMesa }, pc.atalhoMesa ? tr('O atalho já está lá') : rotulo(tr('Criar o a&talho do disco C: na área de trabalho de lá')));
    btAtalho.addEventListener('click', async () => {
      const r = await retro.computador.atalhoMesa().catch((e) => ({ ok: false, erro: e.message }));
      if (r.ok || r.existe) { btAtalho.disabled = true; btAtalho.textContent = tr('O atalho já está lá'); }
      if (r.ok) avisar(tr('Atalho criado'), r.caminho, { icone: 'rede', som: null });
      else if (!r.existe) erro(tr('Não foi possível criar o atalho: {erro}', { erro: r.erro || '?' }));
    });
    const deLa = pc.plataforma === 'win32'
      ? [h('label', chkEnviar, h('span', tr('Mostrar o Retro Computer no "Enviar para" do Windows'))),
        h('div.nota-pc', tr('No Explorador de Arquivos do Windows, botão direito num arquivo › Enviar para › Retro Computer: uma cópia vai para Meus documentos › Recebidos.'))]
      : pc.plataforma === 'darwin'
        ? [h('div.nota-pc', tr('Solte os arquivos no ícone do Retro Computer no Dock, ou use, no Finder, botão direito › Abrir com › Retro Computer: uma cópia vai para Meus documentos › Recebidos.'))]
        : [h('div.nota-pc', tr('Arraste os arquivos para a janela do Retro Computer: uma cópia vai para a pasta em que forem soltos.'))];
    abas.push({
      titulo: tr('Computador principal'),
      conteudo: h('div',
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('rede', 32),
          h('div', { style: { lineHeight: '13px' } }, tr('Os arquivos vão e voltam entre o Retro Computer e o computador principal sempre como cópias: nada é apagado nem gravado por cima, de nenhum dos lados.'))),
        h('fieldset', { style: { margin: '0 0 8px' } }, h('legend', tr('Pastas de lá no Meu computador')),
          h('label', chkFora, h('span', tr('Mostrar a área de trabalho, os documentos e os downloads do computador principal'))),
          h('div.nota-pc', pc.principal
            ? tr('Em Meu computador › Computador principal. Para os outros usuários do Retro Computer, elas começam escondidas.')
            : tr('Em Meu computador › Computador principal. Elas são as pastas do usuário do computador principal, não as suas.'))),
        h('fieldset', { style: { margin: '0' } }, h('legend', tr('De lá para cá')),
          ...deLa,
          h('div', { style: { marginTop: '8px' } }, btAtalho),
          h('div.nota-pc', tr('O atalho abre o disco C: no computador principal, para pôr ou tirar arquivos de lá.')))),
    });
  }
  dialogoBase({
    titulo: tr('Propriedades de Disco local (C:)'), icone: 'disco', larg: 380, abas,
    aoAplicar: async () => {
      if (chkConteudo.checked !== ((estado.config.busca || {}).conteudo !== false)) await definirConfig({ busca: { conteudo: chkConteudo.checked } });
      if (!chkFora) return;
      if (chkFora.checked !== pc.visivel) {
        await definirConfig({ computador: { pastas: chkFora.checked } });
        pc.visivel = chkFora.checked;
        document.dispatchEvent(new CustomEvent('retro-fora-mudou'));
      }
      if (chkEnviar && chkEnviar.checked !== pc.enviarPara) {
        const r = await retro.computador.enviarPara(chkEnviar.checked).catch((e) => ({ ok: false, erro: e.message }));
        if (r.ok) pc.enviarPara = chkEnviar.checked;
        else { chkEnviar.checked = pc.enviarPara; erro(tr('Não foi possível mudar o "Enviar para" do Windows: {erro}', { erro: r.erro || '?' })); }
      }
    },
  });
}

/* Claude */

async function dialogoClaude() {
  const c = await carregarConfig();
  const estadoEl = h('div', tr('Procurando o Claude Code…'));
  const btInstalar = h('button', { hidden: true, on: { click: () => abrir('claude') } }, tr('Instalar…'));
  retro.terminal.acharClaude().then((p) => {
    estadoEl.textContent = p ? tr('Instalado: {caminho}', { caminho: p }) : tr('O Claude Code não está instalado.');
    btInstalar.hidden = !!p;
  });
  const campo = h('input', { type: 'password', placeholder: c.temChave ? tr('•••••••• (guardada)') : 'sk-ant-…', spellcheck: false, style: { width: '100%' } });
  const situacao = h('div', { style: { color: 'var(--texto-fraco)', marginTop: '4px', lineHeight: '13px' } },
    c.chaveiroTrancado
      ? tr('O chaveiro do Linux está trancado: abra-o para guardar ou usar a chave.')
      : c.cofre
      ? (c.temChave ? tr('Há uma chave guardada (cifrada pelo cofre de senhas do sistema).') : tr('Nenhuma chave guardada.'))
      : tr('O cofre de senhas do sistema não está disponível: a chave não pode ser guardada aqui.'));
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' } }, img('claude', 32), h('div', h('b', 'Claude Code'), h('div', tr('O assistente de programação e de trabalho da Anthropic, no Prompt de comando.')))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Programa')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, h('div', { style: { flex: '1', overflowWrap: 'anywhere' } }, estadoEl), btInstalar)),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Chave de API (opcional)')),
      h('p', { style: { marginTop: '0' } }, tr('Com uma chave, o Claude Code a usa direto; sem ela, ele pede para entrar com a conta da sua assinatura do Claude.')),
      campo, situacao,
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' } },
        c.chaveiroTrancado ? h('button', { on: { click: abrirOChaveiro } }, tr('Abrir o chaveiro…')) : h('button', { disabled: !c.cofre, on: { click: guardar } }, tr('Guardar')),
        h('button', { disabled: !c.temChave, on: { click: apagar } }, tr('Apagar a chave')),
        h('button', { on: { click: () => abrirEndereco('https://console.anthropic.com/settings/keys') } }, tr('Obter uma chave…')))),
    h('p', { style: { color: 'var(--texto-fraco)' } }, tr('A chave só é entregue ao Prompt de comando (variável ANTHROPIC_API_KEY); ela não aparece na tela nem vai para o disco C:.')),
  );
  async function guardar() {
    const v = campo.value.trim();
    if (!v) return;
    try {
      await retro.config.gravarChave(v);
      campo.value = '';
      campo.placeholder = tr('•••••••• (guardada)');
      situacao.textContent = tr('Chave guardada (cifrada pelo cofre de senhas do sistema). Vale para os próximos Prompts abertos.');
      await carregarConfig();
    } catch (e) {
      erro(e.message, 'Claude');
    }
  }
  // Aberto o chaveiro, a caixa volta com o cofre pronto (o Guardar no lugar do Abrir o chaveiro).
  async function abrirOChaveiro() {
    if (!(await abrirChaveiro())) return;
    if (jan) jan.fechar();
    dialogoClaude();
  }
  async function apagar() {
    if (!(await confirmar(tr('Apagar a chave de API guardada?'), { titulo: 'Claude' }))) return;
    await retro.config.gravarChave('');
    campo.placeholder = 'sk-ant-…';
    situacao.textContent = tr('Nenhuma chave guardada.');
    await carregarConfig();
  }
  // Os ajustes: o Claude do Prompt muda o próprio Retro Computer (pelo servidor MCP).
  const chkAjustes = h('input', { type: 'checkbox', checked: !(c.claude && c.claude.ajustes === false) });
  const ajustes = h('div.texto-ajuda',
    h('label', { style: { marginBottom: '8px' } }, chkAjustes, h('span', tr('Deixar o Claude ajustar o Retro Computer'))),
    h('p', tr('Pedindo em palavras ("deixe o fundo azul-marinho", "ponha a Calculadora no menu Iniciar", "instale o WordCraft"), o Claude muda a aparência, a barra de tarefas, o menu Iniciar, os sons, os atalhos e os programas, e manda para a Lixeira o que for apagar.')),
    h('p', tr('Ele nunca muda a senha, a chave de API, a pasta do disco nem as atualizações, e o Claude Code pergunta antes de cada ajuste. Vale para os próximos Claude abertos.')));
  const jan = dialogoBase({
    titulo: tr('Propriedades do Claude'), icone: 'claude', larg: 400,
    abas: [{ titulo: tr('Geral'), conteudo }, { titulo: tr('Ajustes'), conteudo: ajustes }],
    aoAplicar: () => definirConfig({ claude: { ajustes: chkAjustes.checked } }),
  });
}

/* Idioma */

function dialogoIdioma() {
  const c = estado.config;
  const atual = c.idioma || 'auto';
  const opcoes = [{ cod: 'auto', nome: tr('Automático (o idioma do sistema)') }, ...IDIOMAS];
  const radios = opcoes.map((o) => {
    const r = h('input', { type: 'radio', name: 'idioma', value: o.cod, checked: o.cod === atual });
    return { o, r };
  });
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('internet', 32), h('div', { style: { lineHeight: '14px' } }, tr('O idioma vale para o Retro Computer e para os programas que têm a interface traduzida (o WordCraft, por exemplo).'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Idioma')),
      radios.map(({ o, r }) => h('div', { style: { margin: '4px 0' } }, h('label', r, h('span', o.nome))))),
    h('p', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } }, tr('As pastas do disco C: continuam com os nomes de quando foram criadas.')),
  );
  // O corretor ortográfico (ortografia.js, no processo principal): ligado e os idiomas dos dicionários.
  const o = { ligada: true, idiomas: [], ...(c.ortografia || {}) };
  const doIdioma = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' }[c.idiomaEfetivo] || 'pt-BR';
  const noMac = c.plataforma === 'darwin';
  const chkOrto = h('input', { type: 'checkbox', checked: o.ligada !== false });
  const dicionarios = [['pt-BR', tr('Português (Brasil)')], ['en-US', tr('Inglês (Estados Unidos)')], ['es-ES', tr('Espanhol')]].map(([cod, nome]) => ({
    cod, chk: h('input', { type: 'checkbox', checked: (o.idiomas && o.idiomas.length ? o.idiomas : [doIdioma]).includes(cod) }), nome,
  }));
  const marcarOrto = () => { for (const d of dicionarios) d.chk.disabled = noMac || !chkOrto.checked; };
  chkOrto.addEventListener('change', marcarOrto);
  marcarOrto();
  const abaOrto = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('bloco', 32), h('label', chkOrto, h('span', tr('Verificar a ortografia enquanto escrevo')))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Idiomas do corretor')),
      dicionarios.map((d) => h('div', { style: { margin: '4px 0' } }, h('label', d.chk, h('span', d.nome))))),
    h('p', { style: { color: 'var(--texto-fraco)', lineHeight: '13px' } }, noMac
      ? tr('No Mac, o corretor é o do próprio sistema, que reconhece o idioma sozinho.')
      : tr('As palavras erradas ficam sublinhadas no Bloco de notas, nas notas, na Agenda e nos programas; o botão direito numa delas mostra as sugestões. Os dicionários vão junto com o Retro Computer: nada vai para a internet.')),
  );
  dialogoBase({
    titulo: tr('Propriedades de Idioma'),
    icone: 'internet',
    larg: 380,
    abas: [{ titulo: tr('Idioma'), conteudo }, { titulo: tr('Ortografia'), conteudo: abaOrto }],
    aoAplicar: async () => {
      // Só o idioma da interface marcado: fica vazio (acompanha o idioma, se ele mudar).
      const marcados = dicionarios.filter((d) => d.chk.checked).map((d) => d.cod);
      const idiomas = marcados.length === 1 && marcados[0] === doIdioma ? [] : marcados;
      await definirConfig({ ortografia: { ligada: chkOrto.checked, idiomas } });
      const escolhido = (radios.find((x) => x.r.checked) || radios[0]).o.cod;
      if (escolhido === (estado.config.idioma || 'auto')) return;
      await definirConfig({ idioma: escolhido });
      const ok = await confirmar(tr('O Retro Computer precisa reiniciar para trocar o idioma.\n\nDeseja reiniciar agora? (Os programas abertos serão fechados.)'), { titulo: tr('Idioma') });
      if (!ok) return;
      for (const j of janelas.slice().reverse()) {
        if (!(await j.fechar())) return;
      }
      retro.sistema.reabrir();
    },
  });
}

/* Sons */

async function dialogoSons(args = {}) {
  const titulo = tr('Propriedades de Sons');
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const c = estado.config;
  const chk = h('input', { type: 'checkbox', checked: !!c.sons });
  const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round((c.volume || 0) * 100), style: { flex: '1' } });
  const teste = (nome, rot) => h('button', { on: { click: async () => { await definirConfig({ sons: chk.checked, volume: vol.value / 100 }); tocar(nome); } } }, rot);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' } }, img('sons', 32), h('label', chk, h('span', tr('Tocar os sons do sistema')))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Volume')), h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, tr('Baixo'), vol, tr('Alto'))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Ouvir')),
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } },
        teste('inicio', tr('Abertura')), teste('desligar', tr('Desligar')), teste('erro', tr('Erro')), teste('aviso', tr('Aviso')),
        teste('pergunta', tr('Pergunta')), teste('lixeira', tr('Lixeira')), teste('foco', tr('Fim do foco')), teste('info', tr('Informação')))),
  );
  const audio = await abaAudio();
  dialogoBase({
    titulo, icone: 'sons', larg: 440, aba: args.aba === 'audio' ? 1 : 0,
    abas: [{ titulo: tr('Sons'), conteudo }, { titulo: tr('Áudio'), conteudo: audio.el }],
    aoAplicar: async () => { await definirConfig({ sons: chk.checked, volume: vol.value / 100 }); await audio.aplicar(); },
  });
}

/** A aba Áudio (como a das Propriedades de Multimídia): a saída de som e o microfone preferidos. */
async function abaAudio() {
  const est = await retro.som.estado().catch(() => ({ disponivel: false }));
  const cabeca = (icone, texto) => h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img(icone, 32), h('div', { style: { lineHeight: '13px' } }, texto));
  if (!est.disponivel) {
    const sistema = est.sistema;
    return {
      el: h('div',
        cabeca('som', sistema
          ? tr('A saída de som e o microfone são os escolhidos no computador principal.')
          : tr('O Linux não respondeu pelo pactl (o PulseAudio ou o PipeWire): a saída de som e o microfone seguem as configurações do Linux.')),
        sistema ? h('div.acoes', h('button', { type: 'button', on: { click: () => retro.som.configuracoesDoSistema().catch(() => { }) } }, tr('Abrir as configurações do sistema…'))) : null),
      aplicar: async () => { },
    };
  }
  const lista = (itens) => {
    const s = h('select', { style: { width: '100%' } }, ...itens.map((x) => h('option', { value: x.id, selected: x.padrao }, x.nome)));
    if (!itens.length) { s.append(h('option', { value: '' }, tr('(Nenhum)'))); s.disabled = true; }
    return s;
  };
  const selSaida = lista(est.saidas);
  const selEntrada = lista(est.entradas);
  const mic = est.microfone || { nivel: 100, mudo: false };
  const numero = h('span', { style: { width: '32px', textAlign: 'right' } }, mic.nivel + '%');
  const nivel = deslizante({ valor: Math.min(100, mic.nivel), min: 0, max: 100, tamanho: 170, passo: 2, passoGrande: 10, rotulo: tr('Volume do microfone'), aoMudar: (n) => { numero.textContent = n + '%'; } });
  const mudo = h('input', { type: 'checkbox', checked: !!mic.mudo });
  const semMic = !est.microfone;
  if (semMic) { nivel.el.style.opacity = '0.5'; mudo.disabled = true; }
  const linhaSel = (rot, sel) => h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '6px' } }, h('span', rot), h('div.select-caixa', { style: { width: '100%', minWidth: '0' } }, sel));
  const el = h('div',
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Reprodução')),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } }, img('som', 32),
        h('div', { style: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' } },
          linhaSel(tr('Aparelho preferido:'), selSaida),
          h('div', { style: { lineHeight: '13px', color: 'var(--texto-meio)' } }, tr('O que está tocando passa para o aparelho escolhido. O volume fica no ícone do alto-falante, na bandeja.')),
          h('div', h('button', { type: 'button', on: { click: async () => { await aplicarSaida(); tocar('info'); } } }, tr('Testar')))))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Gravação')),
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'flex-start' } }, img('microfone', 32),
        h('div', { style: { flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '6px' } },
          linhaSel(tr('Aparelho preferido:'), selEntrada),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, h('span', tr('Volume:')), nivel.el, numero),
          h('label', mudo, h('span', tr('Microfone sem som (mudo)')))))),
  );
  const entradaAntes = selEntrada.value;
  const aplicarSaida = async () => { if (selSaida.value && selSaida.value !== (est.saidas.find((x) => x.padrao) || {}).id) { await retro.som.saida(selSaida.value).catch((e) => erro(e.message)); est.saidas.forEach((x) => { x.padrao = x.id === selSaida.value; }); } };
  return {
    el,
    aplicar: async () => {
      await aplicarSaida();
      if (selEntrada.value && selEntrada.value !== entradaAntes) await retro.som.entrada(selEntrada.value).catch((e) => erro(e.message));
      if (!semMic && (nivel.valor() !== mic.nivel || mudo.checked !== !!mic.mudo)) {
        await retro.som.microfone({ nivel: nivel.valor(), mudo: mudo.checked }).catch((e) => erro(e.message));
        mic.nivel = nivel.valor();
        mic.mudo = mudo.checked;
      }
    },
  };
}

/* Internet */

function dialogoInternet() {
  const n = estado.config.navegador || {};
  const selCorreio = h('select', { style: { width: '100%' } },
    h('option', { value: '' }, tr('(Perguntar na primeira vez)')),
    ...CORREIOS.map((c) => h('option', { value: c.url }, c.nome)));
  const outro = h('input', { type: 'text', spellcheck: false, placeholder: 'https://', value: n.correio && !CORREIOS.some((c) => c.url === n.correio) ? n.correio : '' });
  selCorreio.value = n.correio && CORREIOS.some((c) => c.url === n.correio) ? n.correio : '';
  const selBusca = h('select', { style: { width: '100%' } }, ...Object.entries(BUSCAS).map(([k, b]) => h('option', { value: k }, b.nome)));
  selBusca.value = BUSCAS[n.busca] ? n.busca : 'duckduckgo';
  // O navegador padrão: o Firefox (quando instalado), o daqui ou o do computador principal.
  const links = n.links || 'auto';
  const rFirefox = h('input', { type: 'radio', name: 'links', checked: links === 'auto' || links === 'firefox', disabled: true });
  const rRetro = h('input', { type: 'radio', name: 'links', checked: links === 'retro' });
  const rPrincipal = h('input', { type: 'radio', name: 'links', checked: links === 'principal', disabled: !!estado.config.modoSistema });
  const notaFirefox = h('div', { style: { color: 'var(--texto-fraco)', margin: '2px 0 6px 18px', lineHeight: '13px' } }, tr('Lendo…'));
  const btFirefox = h('button', { type: 'button', hidden: true });
  const lerFirefox = async () => {
    const tem = await conferirFirefox();
    rFirefox.disabled = !tem;
    if (!tem && rFirefox.checked) rRetro.checked = true;
    const linux = estado.config.plataforma === 'linux';
    notaFirefox.textContent = tem
      ? tr('O Firefox do computador, com o visual do Retro Computer e um perfil próprio. Ele toca também os vídeos com proteção (Netflix, Prime Video, Disney+, o Spotify na web).')
      : tr('O Firefox não está instalado neste computador. Sem ele, os vídeos com proteção (Netflix, Prime Video, Disney+) não tocam no Navegador.');
    btFirefox.hidden = tem;
    btFirefox.textContent = linux ? tr('Instalar o Firefox') : tr('Baixar o Firefox…');
  };
  btFirefox.addEventListener('click', async () => {
    if (estado.config.plataforma !== 'linux') return retro.sistema.abrirLink('https://www.mozilla.org/firefox/').catch(() => { });
    btFirefox.disabled = true;
    notaFirefox.textContent = tr('Instalando o Firefox pelo Flathub… (pode levar alguns minutos)');
    const r = await retro.loja.instalar('org.mozilla.firefox').catch((e) => ({ ok: false, erro: e.message }));
    btFirefox.disabled = false;
    if (r && r.ok === false) erro(tr('Não foi possível instalar o Firefox: {erro}', { erro: r.erro || '?' }));
    await lerFirefox();
    if (!rFirefox.disabled) rFirefox.checked = true;
  });
  lerFirefox();
  const linha = (rot, campo) => h('div', { style: { display: 'grid', gridTemplateColumns: '110px 1fr', alignItems: 'center', gap: '6px', marginBottom: '6px' } }, h('span', rot), campo);
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('navegador', 32), h('div', tr('O navegador padrão abre os links e o ícone do Navegador. O E-mail e os sites instalados como programas abrem sempre no Navegador do Retro Computer.'))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('E-mail')),
      linha(tr('Serviço:'), h('div.select-caixa', { style: { width: '100%' } }, selCorreio)),
      linha(tr('Ou o endereço:'), outro)),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Pesquisa')),
      linha(tr('Pesquisar com:'), h('div.select-caixa', { style: { width: '100%' } }, selBusca))),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Navegador padrão')),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('label', rFirefox, h('span', tr('Firefox, com o visual do Retro Computer (recomendado)'))), btFirefox),
      notaFirefox,
      h('div', { style: { marginBottom: '4px' } }, h('label', rRetro, h('span', tr('Navegador do Retro Computer')))),
      h('div', h('label', rPrincipal, h('span', tr('Abrir no navegador do computador principal'))))),
    h('fieldset', { style: { margin: '0' } }, h('legend', tr('Dados de navegação')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('span', { style: { flex: '1' } }, tr('Os cookies, as senhas lembradas pelos sites e os arquivos temporários do Navegador.')),
        h('button', { on: { click: async () => {
          if (!(await confirmar(tr('Apagar os dados de navegação? Você vai sair das contas abertas nos sites (o e-mail, por exemplo).'), { titulo: tr('Internet') }))) return;
          await retro.navegador.limparDados().catch(() => { });
          avisar(tr('Internet'), tr('Dados de navegação apagados.'), { icone: 'navegador', som: null });
        } } }, tr('Apagar…'))),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' } },
        h('span', { style: { flex: '1' } }, tr('As permissões dadas aos sites: a câmera, o microfone, as notificações e a localização.')),
        h('button', { on: { click: async () => {
          if (!(await confirmar(tr('Esquecer as permissões dadas aos sites? Eles vão perguntar de novo.'), { titulo: tr('Internet') }))) return;
          await retro.navegador.esquecerPermissoes().catch(() => { });
          avisar(tr('Internet'), tr('Os sites vão pedir as permissões de novo.'), { icone: 'navegador', som: null });
        } } }, tr('Esquecer…')))),
  );
  // Os sites instalados como programas (Navegador › Arquivo › Instalar como programa).
  const listaApps = h('div.webapps-lista');
  const desenharApps = () => {
    const apps = estado.config.webapps || [];
    listaApps.replaceChildren(...(apps.length ? apps.map((w) => h('div.webapp-linha',
      w.icone ? h('img', { src: w.icone, width: 32, height: 32, alt: '' }) : img('internet', 32),
      h('div', h('b', w.nome), h('div.webapp-endereco', w.url)),
      h('button', { on: { click: () => abrir('webapp:' + w.id) } }, tr('Abrir')),
      h('button', { on: { click: async () => { const m = await import('../webapps.js'); if (await m.removerWebapp(w.id)) desenharApps(); } } }, tr('Desinstalar…'))))
      : [h('div', { style: { padding: '8px' } }, tr('Nenhum site instalado. Para instalar, abra o site no Navegador do Retro Computer e use Arquivo › Instalar como programa.'))]));
  };
  desenharApps();
  const conteudoApps = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('programas-caixa', 32), h('div', tr('Os sites instalados como programas abrem numa janela própria e ficam no menu Iniciar › Programas.'))),
    listaApps);
  // O fundo da página inicial do Navegador do Retro Computer: a cor e o padrão, à parte dos da área de trabalho.
  const fundo = { ...FUNDO_INICIO, ...(n.inicioFundo || {}) };
  const previaInicio = h('div.inicio-previa', h('div.inicio-previa-caixa', h('div'), h('div'), h('div')));
  const pintarPrevia = () => Object.assign(previaInicio.style, fundoCss(fundo));
  pintarPrevia();
  const escolhaInicio = escolhaDeFundo(fundo, pintarPrevia);
  const conteudoInicio = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('navegador', 32), h('div', tr('O plano de fundo da página inicial do Navegador do Retro Computer, a das abas novas.'))),
    previaInicio,
    escolhaInicio.el,
    h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px' } },
      h('button', { on: { click: () => { Object.assign(fundo, FUNDO_INICIO); escolhaInicio.atualizar(); pintarPrevia(); } } }, tr('Restaurar o padrão'))));
  dialogoBase({
    titulo: tr('Propriedades de Internet'), icone: 'navegador', larg: 420,
    abas: [{ titulo: tr('Geral'), conteudo }, { titulo: tr('Página inicial'), conteudo: conteudoInicio }, { titulo: tr('Programas da internet'), conteudo: conteudoApps }],
    aoAplicar: () => {
      const correio = outro.value.trim() ? paraEndereco(outro.value) : (selCorreio.value || null);
      return definirConfig({ navegador: { correio, busca: selBusca.value, links: rPrincipal.checked ? 'principal' : rRetro.checked ? 'retro' : 'firefox', inicioFundo: { cor: fundo.cor, padrao: fundo.padrao } } });
    },
  });
}

/* Impressoras */

function dialogoImpressoras() {
  const lista = h('div.imp-lista', { tabIndex: 0 });
  let impressoras = [];
  let escolhida = null;
  const btPadrao = h('button', { on: { click: async () => {
    if (!escolhida) return;
    const r = await retro.impressoras.padrao(escolhida.nome);
    if (!r.ok) erro(tr('Não foi possível mudar a impressora padrão: {erro}', { erro: r.erro || '?' }));
    carregar();
  } } }, tr('Definir como padrão'));
  const btFila = h('button', { on: { click: () => escolhida && dialogoFila(escolhida) } }, tr('Fila de impressão…'));
  const btTeste = h('button', { on: { click: async () => {
    if (!escolhida) return;
    const { paginaDeTeste } = await import('../impressao.js');
    const r = await paginaDeTeste(escolhida.nome, escolhida.rotulo);
    if (r.ok) avisar(tr('Impressoras'), tr('A página de teste foi enviada para {nome}.', { nome: escolhida.rotulo }), { icone: 'impressora', som: null });
  } } }, tr('Imprimir página de teste'));
  const btAdicionar = h('button', { on: { click: async () => {
    const r = await retro.impressoras.adicionar().catch(() => null);
    if (r && r.como === 'pagina') abrirEndereco(r.url);
  } } }, tr('Adicionar impressora…'));
  const SITUACAO = { pronta: marcar('Pronta'), imprimindo: marcar('Imprimindo'), parada: marcar('Parada') };
  const desenhar = () => {
    lista.replaceChildren(...(impressoras.length ? impressoras.map((p) => {
      const el = h('div.imp-item' + (escolhida && escolhida.nome === p.nome ? '.sel' : ''),
        img('impressora', 32),
        h('div', h('b', p.rotulo + (p.padrao ? ' ' + tr('(padrão)') : '')), h('div', [tr(SITUACAO[p.situacao]), p.descricao, p.local].filter(Boolean).join(' · '))));
      el.addEventListener('mousedown', () => { escolhida = p; desenhar(); });
      el.addEventListener('dblclick', () => dialogoFila(p));
      return el;
    }) : [h('div.imp-vazia', tr('Nenhuma impressora encontrada. As impressoras da rede (Wi-Fi) costumam aparecer sozinhas; se a sua não aparecer, use Adicionar impressora.'))]));
    for (const b of [btPadrao, btFila, btTeste]) b.disabled = !escolhida;
    btPadrao.disabled = !escolhida || escolhida.padrao;
  };
  const carregar = async () => {
    impressoras = await retro.impressoras.listar().catch(() => []);
    escolhida = escolhida ? impressoras.find((p) => p.nome === escolhida.nome) || null : impressoras.find((p) => p.padrao) || impressoras[0] || null;
    desenhar();
  };
  const conteudo = h('div',
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('impressora', 32), h('div', tr('As impressoras do computador. Os programas do Retro Computer imprimem pela caixa de impressão do sistema (Arquivo › Imprimir).'))),
    lista,
    h('div.imp-botoes', btPadrao, btFila, btTeste, btAdicionar));
  dialogoBase({ titulo: tr('Impressoras'), icone: 'impressora', larg: 440, abas: [{ titulo: tr('Impressoras'), conteudo }] });
  carregar();
}

/** A fila de impressão de uma impressora (cancelar o que ainda não saiu). */
async function dialogoFila(p) {
  const j = new Janela({ titulo: tr('Fila de {nome}', { nome: p.rotulo }), icone: 'impressora', largura: 380, altura: 240, minimizavel: false });
  const corpo = h('div.imp-fila');
  const desenhar = async () => {
    const f = await retro.impressoras.fila(p.nome).catch(() => ({ disponivel: false, trabalhos: [] }));
    if (!f.disponivel) {
      corpo.replaceChildren(h('div.imp-vazia', tr('A fila de impressão deste sistema fica no programa de impressoras dele.')));
      return;
    }
    corpo.replaceChildren(...(f.trabalhos.length ? f.trabalhos.map((t) => h('div.imp-trabalho',
      h('span', t.id), h('span', tamanho(t.tamanho)), h('span', t.quando),
      h('button', { on: { click: async () => { const r = await retro.impressoras.cancelar(t.id); if (!r.ok) erro(tr('Não foi possível cancelar: {erro}', { erro: r.erro || '?' })); desenhar(); } } }, tr('Cancelar'))))
      : [h('div.imp-vazia', tr('Nada esperando para imprimir.'))]));
  };
  j.corpo.style.padding = '8px';
  j.corpo.append(corpo, h('div.acoes.direita', h('button', { on: { click: desenhar } }, tr('Atualizar')), h('button.padrao', { on: { click: () => j.fechar() } }, tr('Fechar'))));
  desenhar();
}

/* Data e hora */

/* Opções de acessibilidade */

async function dialogoAcessibilidade() {
  const titulo = tr('Propriedades de Opções de acessibilidade');
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const ac = await import('../acessibilidade.js');
  const linux = await retro.acessibilidade.estado().catch(() => ({ disponivel: false }));
  const a = estado.config.acessibilidade || {};
  const plat = estado.config.plataforma;
  const nota = (texto) => h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginTop: '6px' } }, texto);
  const caixa = (marcado, rot, desligada = false) => {
    const c = h('input', { type: 'checkbox', checked: !!marcado, disabled: desligada });
    return { c, el: h('label', c, h('span', rot)) };
  };
  const grupo = (legenda, ...filhos) => h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', legenda), ...filhos);
  // O que é do Linux (o xkbset): fora do modo sistema, o computador principal cuida disso.
  const doSistema = () => (plat === 'win32' || plat === 'darwin'
    ? [nota(tr('Fora do Retro Computer como sistema, estas opções são as do computador principal.')),
      h('div', { style: { marginTop: '6px' } }, h('button', { type: 'button', on: { click: () => retro.acessibilidade.configuracoesDoSistema().catch(() => { }) } }, tr('Abrir as configurações do sistema…')))]
    : [nota(!estado.config.modoSistema
      ? tr('Fora do Retro Computer como sistema, estas opções são as do computador principal.')
      : tr('O Linux não respondeu pelo xkbset: instale o pacote "xkbset" para usar estas opções.'))]);

  const aderencia = caixa(linux.disponivel && (a.aderencia || linux.aderencia), tr('Usar as teclas de aderência'), !linux.disponivel);
  const abaTeclado = h('div',
    grupo(tr('Teclas de aderência'), aderencia.el,
      nota(tr('Shift, Ctrl, Alt e a tecla do logotipo valem para a próxima tecla, sem precisar segurá-las. Apertada duas vezes, a tecla fica travada até ser apertada de novo.')),
      ...(linux.disponivel ? [] : doSistema())));

  const selAviso = h('select', { style: { width: '100%' } },
    h('option', { value: 'nada' }, tr('Nada')),
    h('option', { value: 'titulo' }, tr('A barra de título da janela ativa')),
    h('option', { value: 'janela' }, tr('A janela ativa')),
    h('option', { value: 'tela' }, tr('A tela inteira')));
  selAviso.value = a.avisoVisual || 'nada';
  const abaSom = h('div',
    grupo(tr('Avisos visuais'),
      h('div', { style: { marginBottom: '6px' } }, tr('Quando o sistema tocar um som, piscar:')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('div.select-caixa', { style: { flex: '1', minWidth: '0' } }, selAviso),
        h('button', { type: 'button', on: { click: () => ac.piscar(selAviso.value) } }, tr('Testar'))),
      nota(tr('Vale também com os sons desligados: os avisos, os erros e as perguntas ficam visíveis.'))));

  const contraste = caixa(a.altoContraste, tr('Usar o alto contraste (fundo escuro e letras claras)'));
  const abaVideo = h('div',
    grupo(tr('Alto contraste'), contraste.el,
      nota(tr('As fotos, os vídeos e os programas continuam com as cores de verdade.'))),
    grupo(tr('Lupa'),
      h('div', { style: { lineHeight: '13px' } }, tr('Logotipo + "+" amplia a tela em volta do ponteiro, logotipo + "-" diminui e logotipo + Esc fecha a lupa.')),
      h('div', { style: { marginTop: '6px', display: 'flex', gap: '6px' } },
        h('button', { type: 'button', on: { click: () => ac.mudarLupa(1) } }, tr('Ampliar')),
        h('button', { type: 'button', on: { click: () => ac.mudarLupa(0) } }, tr('Fechar a lupa')))),
    nota(tr('Para deixar tudo maior de vez: Aparência › Configurações › Tamanho dos pixels.')));

  const cursor = caixa(a.cursorGrande, tr('Usar o cursor grande'));
  const teclasMouse = caixa(linux.disponivel && (a.teclasMouse || linux.teclasMouse), tr('Mover o ponteiro com o teclado numérico'), !linux.disponivel);
  const abaMouse = h('div',
    grupo(tr('Cursor'), h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
      h('img', { src: 'cursores/seta.png', width: 30, height: 42, alt: '', style: { imageRendering: 'pixelated' } }), cursor.el)),
    grupo(tr('Teclas do mouse'), teclasMouse.el,
      nota(tr('Com o Num Lock ligado, as setas do teclado numérico (8, 2, 4, 6 e as diagonais) movem o ponteiro, o 5 clica e o "+" clica duas vezes.')),
      ...(linux.disponivel ? [] : doSistema())));

  dialogoBase({
    titulo, icone: 'acessibilidade', larg: 420,
    abas: [{ titulo: tr('Teclado'), conteudo: abaTeclado }, { titulo: tr('Som'), conteudo: abaSom }, { titulo: tr('Vídeo'), conteudo: abaVideo }, { titulo: tr('Mouse'), conteudo: abaMouse }],
    aoAplicar: async () => {
      if (linux.disponivel) await retro.acessibilidade.aplicar({ aderencia: aderencia.c.checked, teclasMouse: teclasMouse.c.checked });
      await definirConfig({ acessibilidade: { altoContraste: contraste.c.checked, cursorGrande: cursor.c.checked, avisoVisual: selAviso.value } });
    },
  });
}

/* Opções de energia */

// Os tempos das listas, em minutos (0 = nunca), como os do Windows.
const TEMPOS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 30, 45, 60, 120, 180, 300];
const rotuloTempo = (m) => (!m ? tr('Nunca') : m < 60 ? tr('Depois de {n} min', { n: m }) : tr('Depois de {n} h', { n: m / 60 }));

async function dialogoEnergia() {
  const titulo = tr('Propriedades de Opções de energia');
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) return aberta.focar();
  const est = await retro.energia.estado().catch(() => ({ disponivel: false }));
  const cabeca = (texto) => h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('energia', 32), h('div', { style: { lineHeight: '13px' } }, texto));
  if (!est.disponivel) {
    const plat = estado.config.plataforma;
    const botao = plat === 'win32' || plat === 'darwin'
      ? h('div.acoes', h('button', { type: 'button', on: { click: () => retro.energia.configuracoesDoSistema().catch(() => { }) } }, tr('Abrir as configurações do sistema…')))
      : null;
    return dialogoBase({ titulo, icone: 'energia', larg: 380, abas: [{ titulo: tr('Energia'), conteudo: h('div', cabeca(tr('A tela e a suspensão seguem as opções de energia do computador principal.')), botao) }] });
  }
  const o = est.opcoes;
  const lista = (valor) => {
    const tempos = TEMPOS.includes(valor) ? TEMPOS : [...TEMPOS, valor].sort((a, b) => a - b);
    return h('select', { style: { width: '100%' } }, ...tempos.map((m) => h('option', { value: m, selected: m === valor }, rotuloTempo(m))));
  };
  const sel = { telaTomada: lista(o.telaTomada), telaBateria: lista(o.telaBateria), suspenderTomada: lista(o.suspenderTomada), suspenderBateria: lista(o.suspenderBateria) };
  const caixa = (s) => h('div.select-caixa', { style: { width: '100%', minWidth: '0' } }, s);
  const comBateria = est.bateria;
  const grade = h('div', { style: { display: 'grid', gridTemplateColumns: comBateria ? 'auto 1fr 1fr' : 'auto 1fr', alignItems: 'center', gap: '6px 8px' } },
    ...(comBateria ? [h('span'), h('b', tr('Na tomada')), h('b', tr('Na bateria'))] : []),
    h('span', tr('Apagar a tela:')), caixa(sel.telaTomada), comBateria ? caixa(sel.telaBateria) : null,
    h('span', tr('Suspender:')), caixa(sel.suspenderTomada), comBateria ? caixa(sel.suspenderBateria) : null);
  const tampa = h('select', { style: { width: '100%' } },
    h('option', { value: 'suspender' }, tr('Suspender')), h('option', { value: 'nada' }, tr('Não fazer nada')), h('option', { value: 'desligar' }, tr('Desligar')));
  tampa.value = est.tampa;
  const conteudo = h('div',
    cabeca(tr('Com o computador parado, a tela apaga e ele suspende depois do tempo escolhido. Na volta, a senha da tela de bloqueio é pedida (se houver).')),
    h('fieldset', { style: { margin: '0 0 10px' } }, h('legend', tr('Com o computador parado')), grade,
      h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginTop: '8px' } }, tr('Com um som tocando (um vídeo, uma música), o computador não suspende sozinho.'))),
    est.tampaPossivel ? h('fieldset', { style: { margin: '0' } }, h('legend', tr('Tampa do notebook')),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: '8px' } }, h('span', tr('Ao fechar a tampa:')), caixa(tampa))) : null);
  let tampaAntes = est.tampa;
  dialogoBase({
    titulo, icone: 'energia', larg: comBateria ? 460 : 400,
    abas: [{ titulo: tr('Energia'), conteudo }],
    aoAplicar: async () => {
      const opcoes = Object.fromEntries(Object.entries(sel).map(([k, s]) => [k, Number(s.value)]));
      if (!comBateria) { opcoes.telaBateria = opcoes.telaTomada; opcoes.suspenderBateria = opcoes.suspenderTomada; }
      await retro.energia.definir(opcoes);
      if (est.tampaPossivel && tampa.value !== tampaAntes) {
        const r = await comSenhaAdmin(tr('Para mudar o que a tampa faz, digite a senha de administrador do Linux:'), (senha) => retro.energia.tampa(tampa.value, senha));
        if (r && r.ok) {
          tampaAntes = tampa.value;
          if (r.reiniciar) info(tr('A escolha da tampa vale depois de reiniciar o computador.'), tr('Opções de energia'));
        } else if (r && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível mudar o que a tampa faz: {erro}', { erro: r.erro || '?' }));
      }
    },
  });
}

/* Data e hora */

/** O deslocamento de um fuso agora, em minutos ("GMT-3" → -180). */
function deslocamento(fuso, agora = new Date()) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: fuso, timeZoneName: 'longOffset' }).formatToParts(agora).find((x) => x.type === 'timeZoneName');
    const m = /GMT([+-])(\d{2}):(\d{2})/.exec(p ? p.value : '');
    return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
  } catch { return 0; }
}

const rotuloFuso = (fuso, min) => {
  const s = min < 0 ? '-' : '+';
  const a = Math.abs(min);
  return `(GMT${s}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}) ${fuso.replace(/_/g, ' ').replace(/\//g, ' / ')}`;
};

function dialogoData() {
  const relogio = h('canvas', { width: 120, height: 120, style: { width: '120px', height: '120px', display: 'block', margin: '0 auto 8px', imageRendering: 'auto' } });
  const texto = h('div', { style: { textAlign: 'center', fontWeight: 'bold' } });
  const desenhar = () => {
    const d = new Date();
    const ctx = relogio.getContext('2d');
    ctx.clearRect(0, 0, 120, 120);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(60, 60, 54, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#808080'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#000';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.fillRect(60 + Math.sin(a) * 46 - 2, 60 - Math.cos(a) * 46 - 2, 4, 4);
    }
    const ponteiro = (frac, comp, larg, cor) => {
      const a = frac * Math.PI * 2;
      ctx.strokeStyle = cor; ctx.lineWidth = larg; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(60 + Math.sin(a) * comp, 60 - Math.cos(a) * comp); ctx.stroke();
    };
    ponteiro(((d.getHours() % 12) + d.getMinutes() / 60) / 12, 28, 4, '#000080');
    ponteiro((d.getMinutes() + d.getSeconds() / 60) / 60, 40, 3, '#000080');
    ponteiro(d.getSeconds() / 60, 44, 1, '#800000');
    texto.textContent = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' — ' + d.toLocaleTimeString(localidade());
  };
  desenhar();
  const t = setInterval(desenhar, 1000);
  const chkData = h('input', { type: 'checkbox', checked: !!(estado.config.barra && estado.config.barra.data) });
  const barra = h('fieldset', { style: { margin: '8px 0 0' } }, h('legend', tr('Barra de tarefas')),
    h('label', chkData, h('span', tr('Mostrar a data embaixo da hora'))));
  const titulo = tr('Propriedades de Data e hora');
  const aberta = janelas.find((x) => x.titulo === titulo);
  if (aberta) { clearInterval(t); return aberta.focar(); }
  retro.dataHora.estado().catch(() => ({ disponivel: false })).then((dh) => {
    if (!dh.disponivel) {
      // Fora do modo sistema, a data e a hora são as do computador principal.
      const plat = estado.config.plataforma;
      const conteudo = h('div', relogio, texto,
        h('p', { style: { color: 'var(--texto-fraco)', textAlign: 'center', marginTop: '10px' } }, tr('A data e a hora vêm do computador principal.')),
        h('p', { style: { color: 'var(--texto-fraco)', textAlign: 'center' } }, tr('Fuso horário: {fuso}', { fuso: Intl.DateTimeFormat().resolvedOptions().timeZone })),
        plat === 'win32' || plat === 'darwin' ? h('div', { style: { textAlign: 'center' } }, h('button', { type: 'button', on: { click: () => retro.dataHora.configuracoesDoSistema().catch(() => { }) } }, tr('Abrir as configurações do sistema…'))) : null,
        barra);
      const j = dialogoBase({ titulo, icone: 'relogio', larg: 320, abas: [{ titulo: tr('Data e hora'), conteudo }], aoAplicar: () => definirConfig({ barra: { data: chkData.checked } }) });
      if (j) j.ev.on('fechada', () => clearInterval(t)); else clearInterval(t);
      return;
    }
    // No modo sistema: a hora pela internet (ou à mão) e o fuso horário, como no Windows.
    const ntp = h('input', { type: 'checkbox', checked: dh.ntp, disabled: !dh.podeNtp });
    const agora = new Date();
    const dois = (n) => String(n).padStart(2, '0');
    const campoData = h('input', { type: 'date', value: `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}` });
    const campoHora = h('input', { type: 'time', step: 1, value: `${dois(agora.getHours())}:${dois(agora.getMinutes())}:${dois(agora.getSeconds())}` });
    let mexeu = false;
    for (const c of [campoData, campoHora]) c.addEventListener('input', () => { mexeu = true; });
    const travar = () => { campoData.disabled = ntp.checked; campoHora.disabled = ntp.checked; };
    ntp.addEventListener('change', travar);
    travar();
    const sinc = h('div', { style: { color: 'var(--texto-meio)', lineHeight: '13px', marginLeft: '18px' } },
      dh.ntp ? (dh.sincronizado ? tr('A hora está acertada pela internet.') : tr('A hora ainda não foi acertada pela internet (sem conexão?).')) : '');
    const abaHora = h('div', relogio, texto,
      h('fieldset', { style: { margin: '10px 0 0' } }, h('legend', tr('Acertar a hora')),
        h('label', ntp, h('span', tr('Acertar a data e a hora pela internet automaticamente'))), sinc,
        h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' } }, h('span', tr('Data:')), campoData, h('span', tr('Hora:')), campoHora)),
      barra);
    const fusos = dh.fusos.map((f) => ({ f, m: deslocamento(f) })).sort((a, b) => (a.m - b.m) || a.f.localeCompare(b.f));
    const selFuso = h('select', { size: 12, style: { width: '100%' } }, ...fusos.map((x) => h('option', { value: x.f, selected: x.f === dh.fuso }, rotuloFuso(x.f, x.m))));
    const abaFuso = h('div',
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '10px' } }, img('internet', 32), h('div', { style: { lineHeight: '13px' } }, tr('Escolha o fuso horário do lugar onde o computador está. A hora de verão segue o fuso sozinha.'))),
      selFuso);
    requestAnimationFrame(() => { const o = selFuso.selectedOptions[0]; if (o) o.scrollIntoView({ block: 'center' }); });
    const j = dialogoBase({
      titulo, icone: 'relogio', larg: 400,
      abas: [{ titulo: tr('Data e hora'), conteudo: abaHora }, { titulo: tr('Fuso horário'), conteudo: abaFuso }],
      aoAplicar: async () => {
        await definirConfig({ barra: { data: chkData.checked } });
        const pedido = {};
        if (selFuso.value && selFuso.value !== dh.fuso) pedido.fuso = selFuso.value;
        if (dh.podeNtp && ntp.checked !== dh.ntp) pedido.ntp = ntp.checked;
        if (!ntp.checked && mexeu && campoData.value && campoHora.value) pedido.hora = `${campoData.value} ${campoHora.value.length === 5 ? campoHora.value + ':00' : campoHora.value}`;
        if (!Object.keys(pedido).length) return;
        const r = await comSenhaAdmin(tr('Para mudar a data, a hora ou o fuso horário, digite a senha de administrador do Linux:'), (senha) => retro.dataHora.definir(pedido, senha));
        if (r && r.ok) {
          if (pedido.fuso) dh.fuso = pedido.fuso;
          if (pedido.ntp != null) dh.ntp = pedido.ntp;
          mexeu = false;
        } else if (r && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível mudar a data e a hora: {erro}', { erro: r.erro || '?' }));
      },
    });
    if (j) j.ev.on('fechada', () => clearInterval(t)); else clearInterval(t);
  });
}

/* Sobre */

function dialogoSobre() {
  const c = estado.config;
  const sistema = ({ win32: 'Windows', darwin: 'macOS', linux: 'Linux' })[c.plataforma] || c.plataforma;
  const versaoEl = h('div', tr('Versão {versao} · {sistema}', { versao: c.versaoApp, sistema }));
  const novidade = h('div', { style: { color: 'var(--texto-fraco)' } }, tr('Procurando versões novas…'));
  const link = (texto, acao) => h('a', { href: '#', on: { click: (e) => { e.preventDefault(); acao(); } } }, texto);
  // Onde a cópia se atualiza sozinha: baixar, acompanhar e reiniciar; nas outras, a página de download.
  const mostrar = (e) => {
    novidade.style.color = 'var(--sucesso)';
    if (e.etapa === 'disponivel') novidade.replaceChildren(tr('Há uma versão nova: {versao}.', { versao: e.versao }) + ' ', link(tr('Atualizar agora'), () => retro.sistema.atualizacao.baixar().catch(() => { })));
    else if (e.etapa === 'baixando') novidade.textContent = tr('Baixando a versão {versao}… {n}%', { versao: e.versao || '', n: e.progresso || 0 });
    else if (e.etapa === 'baixada') novidade.replaceChildren(tr('A versão {versao} está pronta.', { versao: e.versao }) + ' ', link(tr('Reiniciar e instalar'), () => reiniciarParaAtualizar()));
    else if (e.etapa === 'atual') { novidade.style.color = 'var(--texto-fraco)'; novidade.textContent = tr('Esta é a versão mais recente.'); }
    else if (e.etapa === 'erro') { novidade.style.color = 'var(--alerta)'; novidade.textContent = tr('Não foi possível atualizar: {erro}', { erro: e.erro || '?' }); }
  };
  retro.sistema.atualizacao.info().then(async (inf) => {
    if (inf.sozinho) {
      // O aviso acompanha a atualização enquanto a janela do Sobre estiver aberta.
      const parar = aoMudarAtualizacao((e) => (novidade.isConnected ? mostrar(e) : parar()));
      mostrar(['disponivel', 'baixando', 'baixada'].includes(inf.etapa) ? inf : await retro.sistema.atualizacao.verificar());
      return;
    }
    const v = await retro.sistema.novaVersao(true);
    if (v && v.temAtualizacao) {
      novidade.replaceChildren(tr('Há uma versão nova: {versao}.', { versao: v.nova }) + ' ', link(tr('Baixar'), () => abrirEndereco(v.pagina)));
      novidade.style.color = 'var(--sucesso)';
    } else novidade.textContent = tr('Esta é a versão mais recente.');
  }).catch(() => { novidade.textContent = tr('Não foi possível procurar versões novas.'); });
  const conteudo = h('div.texto-ajuda',
    h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px' } }, img('logo', 32), h('div', h('b', 'Retro Computer'), versaoEl, novidade)),
    h('p', tr('Um computador retrô para produtividade, de código aberto (licença MIT).')),
    h('hr.sulco'),
    h('p', h('b', tr('Créditos'))),
    h('p', tr('Ícones e fontes de sistema: SerenityOS (BSD-2-Clause), com as pastas recoloridas; o computador, o disquete, a caixa, o tomate e a pena são desenhos próprios do projeto.')),
    h('p', tr('Terminal: xterm.js (MIT) e node-pty (MIT). Aplicativo: Electron (MIT).')),
    h('p', tr('DOS: o DOSBox do projeto js-dos (GPL-2.0), sem modificação; o código-fonte está em github.com/js-dos/emulators.')),
    h('p', tr('Os programas Craft são do ArtCraft Team (MIT ou Apache-2.0), baixados dos lançamentos oficiais; os nomes e logotipos são marcas deles.')),
    h('p', tr('Claude e Claude Code são da Anthropic.')),
    h('p', { style: { color: 'var(--texto-fraco)' } }, tr('O visual homenageia os computadores pessoais dos anos 90; nenhum ícone, som ou fonte da Microsoft ou da Apple é usado.')),
  );
  dialogoBase({ titulo: tr('Sobre o Retro Computer'), icone: 'computador', larg: 400, abas: [{ titulo: tr('Geral'), conteudo }] });
}

registrarApp('painel', { nome: 'Painel de controle', icone: 'painel', abrir: abrirPainel });
export { info, caminhoTela, ITENS };
