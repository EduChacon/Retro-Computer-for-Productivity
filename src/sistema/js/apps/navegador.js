/*
 * O Navegador: páginas da internet numa janela, com os favoritos (o e-mail na
 * web, a agenda…) e uma página inicial com eles. Cada janela é um <webview> da
 * sessão "persist:navegador", separada da área de trabalho e dos programas: só
 * abre endereços http e https, sem acesso ao Node (o processo principal confere).
 * O "E-mail" é o Navegador aberto no e-mail escolhido.
 */
import { h, img, rotulo } from '../util.js';
import { zoomInterface } from '../aparencia.js';
import { Janela } from '../janelas.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, avisar } from '../sistema.js';
import { entrada, confirmar, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar, idiomaAtual } from '../idioma.js';

const SESSAO = 'persist:navegador';

export const BUSCAS = {
  duckduckgo: { nome: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  google: { nome: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { nome: 'Bing', url: 'https://www.bing.com/search?q=' },
};

// Os serviços de e-mail oferecidos na primeira vez que se abre o E-mail.
export const CORREIOS = [
  { nome: 'Gmail', url: 'https://mail.google.com/' },
  { nome: 'Outlook.com', url: 'https://outlook.live.com/mail/' },
  { nome: 'Yahoo Mail', url: 'https://mail.yahoo.com/' },
  { nome: 'Proton Mail', url: 'https://mail.proton.me/' },
  { nome: 'Zoho Mail', url: 'https://mail.zoho.com/' },
];

const WIKIPEDIA = { 'pt-BR': 'https://pt.wikipedia.org/', en: 'https://en.wikipedia.org/', es: 'https://es.wikipedia.org/' };

/** Os favoritos de quem ainda não mexeu neles. */
function favoritosPadrao() {
  return [
    { nome: 'Gmail', url: 'https://mail.google.com/' },
    { nome: 'Outlook.com', url: 'https://outlook.live.com/mail/' },
    { nome: tr('Google Agenda'), url: 'https://calendar.google.com/' },
    { nome: 'Google Drive', url: 'https://drive.google.com/' },
    { nome: tr('Wikipédia'), url: WIKIPEDIA[idiomaAtual()] || WIKIPEDIA.en },
  ];
}

const cfg = () => (estado.config && estado.config.navegador) || {};
export const favoritos = () => cfg().favoritos || favoritosPadrao();
const busca = () => BUSCAS[cfg().busca] || BUSCAS.duckduckgo;
const salvarFavoritos = (lista) => definirConfig({ navegador: { favoritos: lista } });

/** O ícone de um favorito: o envelope para os e-mails, o globo para o resto. */
const iconeDe = (url) => (/mail|outlook\.live|proton\.me/i.test(url) ? 'correio' : 'internet');

/**
 * O que foi digitado na barra de endereço vira um endereço: com "http(s)://",
 * fica como está; com cara de site ("exemplo.com.br/x"), ganha o "https://";
 * o resto vira uma pesquisa.
 */
export function paraEndereco(texto, urlBusca = BUSCAS.duckduckgo.url) {
  const t = String(texto || '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/\S*)?$/i.test(t)) return 'http://' + t;
  if (!/\s/.test(t) && /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(t)) return 'https://' + t;
  return urlBusca + encodeURIComponent(t);
}

const abertos = new Set();

class Navegador {
  /** app: um site instalado como programa (webapps.js): só a página, sem a barra de endereço. */
  constructor({ url, correio = false, app = null } = {}) {
    this.correio = correio;
    this.app = app;
    this.base = app ? app.nome : correio ? tr('E-mail') : tr('Navegador');
    this.zoom = 1;
    this.busca = '';
    const t = document.getElementById('janelas').getBoundingClientRect();
    this.j = new Janela({
      titulo: this.base,
      icone: app ? app.icone || 'internet' : correio ? 'correio' : 'navegador',
      largura: Math.min(1000, Math.round(t.width * 0.86)),
      altura: Math.min(720, Math.round(t.height * 0.88)),
      minLargura: 380,
      minAltura: 240,
      classe: app ? 'navegador webapp' : 'navegador',
      menus: app ? this.menusApp() : this.menus(),
      status: [tr('Pronto'), ''],
    });
    abertos.add(this);
    this.j.ev.on('fechada', () => abertos.delete(this));
    // Os botões laterais do mouse sobre a moldura (sobre a página, quem avisa é o navegador-preload.js).
    this.j.el.addEventListener('mouseup', (e) => {
      if (e.button === 3) { e.preventDefault(); this.voltar(); }
      else if (e.button === 4) { e.preventDefault(); this.avancar(); }
    });

    const bt = (icone, texto, acao, dica) => h('button.ferramenta.grande', { title: dica || texto, on: { click: acao } }, img(icone, 16), h('span', texto));
    this.btVoltar = bt('voltar', tr('Voltar'), () => this.voltar(), tr('Voltar (Alt+Esquerda)'));
    this.btAvancar = bt('avancar', tr('Avançar'), () => this.avancar(), tr('Avançar (Alt+Direita)'));
    this.btParar = bt('parar', tr('Parar'), () => this.wv && this.wv.stop(), tr('Parar (Esc)'));
    this.btAtualizar = bt('atualizar', tr('Atualizar'), () => this.atualizar(), tr('Atualizar (F5)'));
    this.btInicio = bt('inicio', tr('Início'), () => this.mostrarInicio(), tr('Página inicial (Alt+Home)'));
    this.btFavoritos = bt('favoritos', tr('Favoritos'), (e) => this.menuFavoritos(e.currentTarget));
    this.campo = h('input.nav-endereco', { type: 'text', spellcheck: false, placeholder: tr('Digite um endereço ou o que quer pesquisar') });
    this.campo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.ir(this.campo.value); }
      if (e.key === 'Escape') { this.campo.value = this.url || ''; this.campo.select(); }
    });
    // O primeiro clique no campo seleciona o endereço inteiro (como nos navegadores); os seguintes posicionam o cursor.
    this.campo.addEventListener('mousedown', () => { this.cliqueNovo = document.activeElement !== this.campo; });
    this.campo.addEventListener('mouseup', (e) => {
      if (this.cliqueNovo && this.campo.selectionStart === this.campo.selectionEnd) { e.preventDefault(); this.campo.select(); }
      this.cliqueNovo = false;
    });
    const barra = h('div.barra-ferramentas.nav-botoes',
      this.btVoltar, this.btAvancar, this.btParar, this.btAtualizar, this.btInicio, h('div.sep'), this.btFavoritos);
    const linhaEndereco = h('div.barra-ferramentas.nav-linha',
      h('label', { on: { click: () => this.campo.focus() } }, rotulo(tr('En&dereço'))), this.campo,
      h('button.ferramenta', { on: { click: () => this.ir(this.campo.value) } }, tr('Ir')));
    this.area = h('div.nav-area');
    this.inicio = h('div.nav-inicio');
    this.erroEl = h('div.nav-erro', { hidden: true });
    this.area.append(this.inicio, this.erroEl);
    if (app) this.j.corpo.append(this.area);
    else this.j.corpo.append(barra, linhaEndereco, this.area);
    this.j.ev.on('ativada', () => setTimeout(() => (this.wv && !this.wv.hidden ? this.wv.focus() : this.campo.focus()), 0));
    this.desenharInicio();
    this.atualizarBotoes();
    if (url) this.ir(url);
    else this.mostrarInicio();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Nova janela'), atalho: 'Ctrl+N', acao: () => abrirNavegador() },
          { rotulo: tr('&Abrir endereço…'), atalho: 'Ctrl+L', acao: () => this.focarEndereco() },
          { rotulo: tr('Instalar como &programa…'), desativado: !this.visivel(), acao: () => this.instalarComoPrograma() },
          ...(firefoxInstalado ? [{ rotulo: tr('Abrir no Fi&refox'), desativado: !this.visivel(), acao: () => abrirNoFirefox(this.url) }] : []),
          { separador: true },
          { rotulo: tr('&Imprimir…'), atalho: 'Ctrl+P', desativado: !this.visivel(), acao: () => this.wv.print().catch(() => { }) },
          { separador: true },
          { rotulo: tr('&Fechar'), atalho: 'Ctrl+W', acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('Recor&tar'), atalho: 'Ctrl+X', desativado: !this.visivel(), acao: () => this.wv.cut() },
          { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !this.visivel(), acao: () => this.wv.copy() },
          { rotulo: tr('C&olar'), atalho: 'Ctrl+V', desativado: !this.visivel(), acao: () => this.wv.paste() },
          { separador: true },
          { rotulo: tr('Selecionar &tudo'), atalho: 'Ctrl+A', desativado: !this.visivel(), acao: () => this.wv.selectAll() },
          { separador: true },
          { rotulo: tr('&Localizar nesta página…'), atalho: 'Ctrl+F', desativado: !this.visivel(), acao: () => this.localizar(true) },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Parar'), atalho: 'Esc', desativado: !this.carregando, acao: () => this.wv.stop() },
          { rotulo: tr('&Atualizar'), atalho: 'F5', desativado: !this.visivel(), acao: () => this.atualizar() },
          { separador: true },
          { rotulo: tr('A&umentar'), atalho: 'Ctrl++', desativado: !this.visivel(), acao: () => this.mudarZoom(0.1) },
          { rotulo: tr('&Diminuir'), atalho: 'Ctrl+-', desativado: !this.visivel(), acao: () => this.mudarZoom(-0.1) },
          { rotulo: tr('Tamanho &normal'), atalho: 'Ctrl+0', desativado: !this.visivel(), acao: () => this.mudarZoom(0) },
          { separador: true },
          {
            rotulo: tr('Pesquisar &com'), sub: () => Object.entries(BUSCAS).map(([k, b]) => ({
              rotulo: b.nome, radio: true, marcado: busca() === b, acao: () => definirConfig({ navegador: { busca: k } }),
            })),
          },
        ],
      },
      {
        rotulo: tr('&Ir'), itens: () => [
          { rotulo: tr('&Voltar'), atalho: 'Alt+←', desativado: !this.podeVoltar(), acao: () => this.voltar() },
          { rotulo: tr('&Avançar'), atalho: 'Alt+→', desativado: !this.podeAvancar(), acao: () => this.avancar() },
          { separador: true },
          { rotulo: tr('Página &inicial'), atalho: 'Alt+Home', acao: () => this.mostrarInicio() },
          { rotulo: tr('&E-mail'), icone: 'correio', acao: () => abrirCorreio() },
        ],
      },
      {
        rotulo: tr('&Favoritos'), itens: () => this.itensFavoritos(),
      },
    ];
  }

  /** Os menus do site instalado como programa: a página e o tamanho. */
  menusApp() {
    return [
      {
        rotulo: tr('&Página'), itens: () => [
          { rotulo: tr('&Voltar'), atalho: 'Alt+←', desativado: !this.podeVoltar(), acao: () => this.voltar() },
          { rotulo: tr('&Avançar'), atalho: 'Alt+→', desativado: !this.podeAvancar(), acao: () => this.avancar() },
          { rotulo: tr('A&tualizar'), atalho: 'F5', acao: () => this.atualizar() },
          { separador: true },
          { rotulo: tr('&Imprimir…'), atalho: 'Ctrl+P', desativado: !this.visivel(), acao: () => this.wv.print().catch(() => { }) },
          { rotulo: tr('Locali&zar nesta página…'), atalho: 'Ctrl+F', desativado: !this.visivel(), acao: () => this.localizar(true) },
          { separador: true },
          { rotulo: tr('&Copiar o endereço'), desativado: !this.url, acao: () => navigator.clipboard.writeText(this.url).catch(() => { }) },
          { rotulo: tr('Abrir no &Navegador'), desativado: !this.url, acao: () => abrirNavegador({ url: this.url }) },
          { separador: true },
          { rotulo: tr('&Desinstalar {nome}…', { nome: this.app.nome.replace(/&/g, '&&') }), acao: () => this.desinstalar() },
          { separador: true },
          { rotulo: tr('&Fechar'), atalho: 'Ctrl+W', acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('A&umentar'), atalho: 'Ctrl++', desativado: !this.visivel(), acao: () => this.mudarZoom(0.1) },
          { rotulo: tr('&Diminuir'), atalho: 'Ctrl+-', desativado: !this.visivel(), acao: () => this.mudarZoom(-0.1) },
          { rotulo: tr('Tamanho &normal'), atalho: 'Ctrl+0', desativado: !this.visivel(), acao: () => this.mudarZoom(0) },
        ],
      },
    ];
  }

  /** Arquivo › Instalar como programa: lê o nome e o ícone do site e pergunta. */
  async instalarComoPrograma() {
    if (!this.visivel() || !this.url) return;
    this.j.definirStatus([tr('Lendo o site…'), '']);
    const w = await import('../webapps.js');
    const site = await w.descobrirSite(this.wv, this.url);
    this.j.definirStatus([tr('Concluído'), this.textoZoom()]);
    const r = await w.perguntarInstalacao(site);
    if (r) await w.instalarWebapp({ ...site, nome: r.nome }, r);
  }

  async desinstalar() {
    const w = await import('../webapps.js');
    if (await w.removerWebapp(this.app.id)) this.j.fechar();
  }

  /* ---------- Navegar ---------- */

  visivel() {
    return !!(this.wv && !this.wv.hidden && this.pronto);
  }

  podeVoltar() {
    if (!this.visivel()) return false;
    try { return this.wv.canGoBack(); } catch { return false; }
  }

  podeAvancar() {
    if (!this.visivel()) return false;
    try { return this.wv.canGoForward(); } catch { return false; }
  }

  ir(texto) {
    const url = paraEndereco(texto, busca().url);
    if (!url) return;
    this.erroEl.hidden = true;
    this.inicio.hidden = true;
    if (!this.wv) this.criarWebview(url);
    else {
      this.wv.hidden = false;
      this.wv.loadURL(url).catch(() => { });
    }
    this.url = url;
    this.campo.value = url;
    this.wv.focus();
    this.atualizarBotoes();
  }

  criarWebview(url) {
    const wv = document.createElement('webview');
    // A partição antes do endereço: é ela que separa os dados do Navegador.
    wv.setAttribute('partition', SESSAO);
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', url);
    wv.className = 'nav-pagina';
    this.wv = wv;
    wv.addEventListener('dom-ready', () => {
      if (!this.pronto) {
        this.pronto = true;
        if (this.zoom !== 1) wv.setZoomFactor(this.zoom * zoomInterface());
      }
      this.atualizarBotoes();
    });
    wv.addEventListener('focus', () => this.j.focar());
    wv.addEventListener('did-start-loading', () => this.definirCarregando(true));
    wv.addEventListener('did-stop-loading', () => this.definirCarregando(false));
    const navegou = (e) => {
      if (e.isMainFrame === false) return;
      this.url = e.url;
      if (document.activeElement !== this.campo) this.campo.value = e.url;
      this.atualizarBotoes();
    };
    wv.addEventListener('did-navigate', navegou);
    wv.addEventListener('did-navigate-in-page', navegou);
    wv.addEventListener('page-title-updated', (e) => this.j.definirTitulo(e.title ? `${e.title} - ${this.base}` : this.base));
    wv.addEventListener('update-target-url', (e) => this.j.definirStatus([e.url || (this.carregando ? tr('Carregando…') : tr('Concluído')), this.textoZoom()]));
    wv.addEventListener('did-fail-load', async (e) => {
      // -3 é a carga interrompida (outro clique, o botão Parar): não é erro.
      if (e.errorCode === -3 || e.isMainFrame === false) return;
      const url = e.validatedURL || this.url;
      // A versão segura de um http:// não abriu (ou mandou de volta para o http): o aviso, com a escolha.
      const semSeguranca = await retro.navegador.semSeguranca(url).catch(() => null);
      if (semSeguranca) return this.mostrarSemSeguranca(semSeguranca);
      this.mostrarErro(url, e.errorDescription);
    });
    wv.addEventListener('context-menu', (e) => this.menuDaPagina(e.params));
    // Um site em tela cheia: o aviso de como sair, por cima dele (senão ele poderia imitar a tela de bloqueio).
    wv.addEventListener('enter-html-full-screen', () => avisoTelaCheia());
    wv.addEventListener('ipc-message', (e) => { if (e.channel === 'navegador') this.acao(...e.args); });
    wv.addEventListener('found-in-page', (e) => {
      const r = e.result || {};
      if (r.finalUpdate) this.j.definirStatus([r.matches ? tr('{n} de {total}', { n: r.activeMatchOrdinal, total: r.matches }) : tr('Não foi possível localizar "{texto}".', { texto: this.busca }), this.textoZoom()]);
    });
    this.area.append(wv);
  }

  definirCarregando(v) {
    this.carregando = v;
    this.j.el.classList.toggle('carregando-pagina', v);
    this.j.definirStatus([v ? tr('Carregando…') : tr('Concluído'), this.textoZoom()]);
    this.atualizarBotoes();
  }

  atualizarBotoes() {
    this.btVoltar.disabled = !this.podeVoltar();
    this.btAvancar.disabled = !this.podeAvancar();
    this.btParar.disabled = !this.carregando;
    this.btAtualizar.disabled = !this.visivel() && this.erroEl.hidden;
  }

  voltar() {
    if (!this.inicio.hidden && this.wv) return this.mostrarPagina();
    if (this.podeVoltar()) this.wv.goBack();
  }

  avancar() {
    if (this.podeAvancar()) this.wv.goForward();
  }

  atualizar() {
    if (!this.erroEl.hidden && this.url) return this.ir(this.url);
    if (this.visivel()) this.wv.reload();
  }

  focarEndereco() {
    this.campo.focus();
    this.campo.select();
  }

  mostrarPagina() {
    this.inicio.hidden = true;
    this.erroEl.hidden = true;
    if (this.wv) this.wv.hidden = false;
    this.campo.value = this.url || '';
    this.atualizarBotoes();
  }

  mostrarInicio() {
    // No site instalado como programa, o início é o próprio site.
    if (this.app) return this.ir(this.app.url);
    if (this.wv) {
      this.wv.stop();
      this.wv.hidden = true;
    }
    this.erroEl.hidden = true;
    this.desenharInicio();
    this.inicio.hidden = false;
    this.campo.value = '';
    this.j.definirTitulo(this.base);
    this.j.definirStatus([tr('Pronto'), '']);
    this.atualizarBotoes();
    setTimeout(() => this.campo.focus(), 0);
  }

  /** O site não tem conexão segura (Painel › Segurança › Só conexões seguras): abrir só se o usuário quiser. */
  mostrarSemSeguranca(url) {
    if (this.wv) this.wv.hidden = true;
    this.inicio.hidden = true;
    let site = url;
    try { site = new URL(url).host; } catch { }
    const voltar = () => {
      if (this.wv && this.wv.canGoBack()) { this.mostrarPagina(); this.wv.goBack(); } else this.mostrarInicio();
    };
    this.erroEl.replaceChildren(
      h('div.nav-erro-caixa',
        img('msg-aviso', 32),
        h('div',
          h('b', tr('Este site não tem conexão segura.')),
          h('p', url),
          h('p', tr('O Navegador tentou a versão segura (HTTPS) de {site}, e ela não respondeu. Sem ela, o que você envia ao site (senhas, números de cartão) pode ser visto por outras pessoas na rede.', { site })),
          h('div.acoes',
            h('button.padrao', { on: { click: voltar } }, tr('Voltar')),
            h('button', { on: { click: async () => { await retro.navegador.abrirSemSeguranca(url).catch(() => { }); this.ir(url); } } }, tr('Abrir assim mesmo'))))));
    this.erroEl.hidden = false;
    this.url = url;
    if (document.activeElement !== this.campo) this.campo.value = url;
    this.j.definirTitulo(this.base);
    this.j.definirStatus([tr('Sem conexão segura'), '']);
    this.atualizarBotoes();
  }

  mostrarErro(url, descricao) {
    if (this.wv) this.wv.hidden = true;
    this.inicio.hidden = true;
    this.erroEl.replaceChildren(
      h('div.nav-erro-caixa',
        img('msg-aviso', 32),
        h('div',
          h('b', tr('Não foi possível abrir a página.')),
          h('p', url),
          h('p', tr('Verifique o endereço e a conexão com a internet. Detalhe: {erro}', { erro: descricao || '?' })),
          h('div.acoes', h('button.padrao', { on: { click: () => this.ir(url) } }, tr('Tentar de novo')), h('button', { on: { click: () => this.mostrarInicio() } }, tr('Página inicial'))))));
    this.erroEl.hidden = false;
    this.j.definirStatus([tr('Erro'), '']);
    this.atualizarBotoes();
  }

  /** As teclas, os botões do mouse e as notificações que a página repassa (navegador-preload.js). */
  acao(a, ...args) {
    switch (a) {
      case 'notificacao': return this.notificar(...args);
      case 'voltar': return this.voltar();
      case 'avancar': return this.avancar();
      case 'atualizar': return this.atualizar();
      case 'endereco': return this.focarEndereco();
      case 'inicio': return this.mostrarInicio();
      case 'localizar': return this.localizar(true);
      case 'proxima': return this.localizar(false);
      case 'nova': return abrirNavegador();
      case 'fechar': return this.j.fechar();
      case 'favorito': return this.adicionarFavorito();
      case 'imprimir': return this.visivel() && this.wv.print().catch(() => { });
      case 'aumentar': return this.mudarZoom(0.1);
      case 'diminuir': return this.mudarZoom(-0.1);
      case 'zoom100': return this.mudarZoom(0);
      case 'telaCheia': return retro.sistema.telaCheia();
      case 'iniciar': return import('../barra.js').then((m) => m.abrirIniciar());
      default:
    }
  }

  /** A notificação do site vira o balão da barra de tarefas; o clique traz a janela. */
  notificar(titulo, corpo) {
    avisar(String(titulo || nomeDoSite(this.url)), String(corpo || ''), {
      icone: this.app ? this.app.icone || 'internet' : this.correio ? 'correio' : 'navegador', ms: 8000,
      aoClicar: () => { if (!this.j.fechada) this.j.focar(); },
    });
  }

  /* ---------- Zoom e localizar ---------- */

  textoZoom() {
    return this.zoom === 1 ? '' : `${Math.round(this.zoom * 100)}%`;
  }

  mudarZoom(passo) {
    if (!this.visivel()) return;
    this.zoom = passo === 0 ? 1 : Math.min(3, Math.max(0.3, Math.round((this.zoom + passo) * 10) / 10));
    this.wv.setZoomFactor(this.zoom * zoomInterface());
    this.j.definirStatus([tr('Concluído'), this.textoZoom()]);
  }

  async localizar(perguntar) {
    if (!this.visivel()) return;
    if (perguntar || !this.busca) {
      const t = await entrada({ titulo: tr('Localizar'), texto: tr('Localizar nesta página:'), valor: this.busca, icone: 'localizar' });
      if (!t) return;
      this.busca = t;
      this.wv.findInPage(t);
    } else {
      this.wv.findInPage(this.busca, { findNext: true });
    }
  }

  /* ---------- Favoritos ---------- */

  itensFavoritos() {
    const lista = favoritos();
    return [
      { rotulo: tr('&Adicionar aos favoritos…'), atalho: 'Ctrl+D', desativado: !this.visivel(), acao: () => this.adicionarFavorito() },
      { rotulo: tr('&Organizar favoritos'), sub: () => lista.length ? lista.map((f, i) => ({ rotulo: tr('Remover "{nome}"', { nome: f.nome }), acao: () => this.removerFavorito(i) })) : [{ rotulo: tr('(Vazio)'), desativado: true }] },
      { separador: true },
      ...lista.map((f) => ({ rotulo: f.nome.replace(/&/g, '&&'), icone: iconeDe(f.url), acao: () => this.ir(f.url) })),
    ];
  }

  menuFavoritos(botao) {
    const r = botao.getBoundingClientRect();
    abrirMenu(this.itensFavoritos(), { x: r.left, y: r.bottom });
  }

  async adicionarFavorito() {
    if (!this.visivel() || !this.url) return;
    const titulo = (this.wv.getTitle() || this.url).slice(0, 80);
    const nome = await entrada({ titulo: tr('Adicionar aos favoritos'), texto: tr('Nome do favorito:'), valor: titulo, icone: 'favoritos' });
    if (!nome) return;
    await salvarFavoritos([...favoritos(), { nome: nome.trim() || titulo, url: this.url }]);
    this.desenharInicio();
    avisar(tr('Favorito adicionado'), nome, { icone: 'favoritos', som: null, guardar: false });
  }

  async removerFavorito(i) {
    const lista = favoritos();
    if (!lista[i]) return;
    if (!(await confirmar(tr('Remover "{nome}" dos favoritos?', { nome: lista[i].nome }), { titulo: tr('Favoritos') }))) return;
    await salvarFavoritos(lista.filter((_, k) => k !== i));
    this.desenharInicio();
  }

  /* ---------- A página inicial ---------- */

  desenharInicio() {
    const campoBusca = h('input', { type: 'text', spellcheck: false, placeholder: tr('Pesquisar na internet') });
    const pesquisar = () => { if (campoBusca.value.trim()) this.ir(busca().url + encodeURIComponent(campoBusca.value.trim())); };
    campoBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') pesquisar(); });
    const grade = h('div.nav-favoritos', favoritos().map((f, i) => {
      const el = h('button.nav-fav', { title: f.url, on: { click: () => this.ir(f.url) } }, img(iconeDe(f.url), 32), h('span', f.nome));
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        abrirMenu([
          { rotulo: tr('&Abrir'), negrito: true, acao: () => this.ir(f.url) },
          { rotulo: tr('Abrir em &nova janela'), acao: () => abrirNavegador({ url: f.url }) },
          { separador: true },
          { rotulo: tr('&Remover dos favoritos'), acao: () => this.removerFavorito(i) },
        ], { x: e.clientX, y: e.clientY });
      });
      return el;
    }));
    this.inicio.replaceChildren(
      h('div.nav-inicio-caixa',
        h('div.nav-inicio-titulo', img('navegador', 32), h('div', h('b', tr('Página inicial')), h('div', tr('Os seus favoritos e a pesquisa. Para guardar uma página, use Favoritos › Adicionar aos favoritos.')))),
        h('fieldset', h('legend', tr('Pesquisar')), h('div.linha', campoBusca, h('button', { on: { click: pesquisar } }, tr('Pesquisar')))),
        h('fieldset', h('legend', tr('Favoritos')), grade)));
  }

  /* ---------- O menu do botão direito na página ---------- */

  menuDaPagina(p) {
    // As coordenadas vêm na escala da janela do aplicativo; a área de trabalho tem o próprio zoom.
    const x = p.x / zoomInterface();
    const y = p.y / zoomInterface();
    const itens = [];
    if (p.linkURL) {
      itens.push(
        { rotulo: tr('&Abrir o link'), negrito: true, acao: () => this.ir(p.linkURL) },
        { rotulo: tr('Abrir o link em &nova janela'), acao: () => abrirNavegador({ url: p.linkURL }) },
        { rotulo: tr('Copiar o &endereço do link'), acao: () => navigator.clipboard.writeText(p.linkURL).catch(() => { }) },
        { separador: true },
      );
    }
    if (p.isEditable) {
      itens.push(
        { rotulo: tr('Recor&tar'), desativado: !p.editFlags.canCut, acao: () => this.wv.cut() },
        { rotulo: tr('&Copiar'), desativado: !p.editFlags.canCopy, acao: () => this.wv.copy() },
        { rotulo: tr('C&olar'), desativado: !p.editFlags.canPaste, acao: () => this.wv.paste() },
        { separador: true },
        { rotulo: tr('Selecionar &tudo'), acao: () => this.wv.selectAll() },
      );
    } else if (p.selectionText) {
      itens.push(
        { rotulo: tr('&Copiar'), acao: () => this.wv.copy() },
        { rotulo: tr('&Pesquisar "{texto}"', { texto: p.selectionText.trim().slice(0, 24) }), acao: () => this.ir(busca().url + encodeURIComponent(p.selectionText.trim())) },
      );
    } else {
      itens.push(
        { rotulo: tr('&Voltar'), desativado: !this.podeVoltar(), acao: () => this.voltar() },
        { rotulo: tr('&Avançar'), desativado: !this.podeAvancar(), acao: () => this.avancar() },
        { rotulo: tr('A&tualizar'), acao: () => this.atualizar() },
        { separador: true },
        { rotulo: tr('Adicionar aos &favoritos…'), acao: () => this.adicionarFavorito() },
        { rotulo: tr('&Imprimir…'), acao: () => this.wv.print().catch(() => { }) },
      );
    }
    abrirMenu(itens, { x, y });
  }

}

export function abrirNavegador(args = {}) {
  return new Navegador(args);
}

/** Abre um endereço: numa janela do Navegador já aberta (a última usada) ou numa nova. */
export function abrirEndereco(url) {
  const ultimo = [...abertos].filter((n) => !n.correio).pop();
  if (ultimo && !ultimo.j.fechada) {
    ultimo.j.focar();
    ultimo.ir(url);
    return ultimo;
  }
  return abrirNavegador({ url });
}

/* ---------- O E-mail ---------- */

async function escolherCorreio() {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    const j = new Janela({ titulo: tr('E-mail'), icone: 'correio', dialogo: true, largura: 380, altura: 260, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const outro = h('input', { type: 'text', spellcheck: false, placeholder: 'https://', style: { flex: '1' } });
    const radios = CORREIOS.map((c, i) => h('input', { type: 'radio', name: 'correio', checked: i === 0, value: c.url }));
    const rOutro = h('input', { type: 'radio', name: 'correio', value: '' });
    outro.addEventListener('focus', () => { rOutro.checked = true; });
    const ok = h('button.padrao', { on: { click: () => {
      const escolhido = rOutro.checked ? paraEndereco(outro.value) : (radios.find((r) => r.checked) || {}).value;
      if (escolhido) fim(escolhido);
    } } }, tr('OK'));
    j.corpo.append(
      h('div.mensagem', img('correio', 32), h('div',
        h('div.texto', tr('Qual é o seu e-mail? O Retro Computer o abre no Navegador, como um programa. Dá para trocar depois em Painel de controle › Internet.')),
        h('div.nav-correios', ...CORREIOS.map((c, i) => h('label', radios[i], h('span', c.nome))),
          h('label', rOutro, h('span', tr('Outro endereço:')), outro)))),
      h('div.acoes', ok, h('button', { on: { click: () => fim(null) } }, tr('Cancelar'))),
    );
    ajustarAoConteudo(j, { minLarg: 380 });
    ok.focus();
  });
}

export async function abrirCorreio() {
  let url = cfg().correio;
  if (!url) {
    url = await escolherCorreio();
    if (!url) return null;
    await definirConfig({ navegador: { correio: url } });
  }
  const aberto = [...abertos].find((n) => n.correio && !n.j.fechada);
  if (aberto) { aberto.j.focar(); return aberto; }
  return new Navegador({ url, correio: true });
}

/* ---------- O Firefox como navegador padrão ---------- */

// O Firefox do computador, aberto com o visual do Retro Computer (firefox.js do processo principal):
// o padrão quando instalado (Painel › Internet), porque toca os vídeos com proteção. O Navegador
// daqui continua para os sites instalados como programas, o E-mail e quando não há Firefox.
let firefoxInstalado = false;
export async function conferirFirefox() {
  firefoxInstalado = !!(await retro.firefox.estado().catch(() => ({}))).instalado;
  return firefoxInstalado;
}
conferirFirefox();

/** Os links e o ícone do Navegador vão para o Firefox? ('auto': quando ele existe) */
export function usaFirefox() {
  const l = cfg().links || 'auto';
  return firefoxInstalado && (l === 'auto' || l === 'firefox');
}

/** A página inicial do Firefox: a do serviço de pesquisa escolhido. */
const inicioFirefox = () => { try { return new URL(busca().url).origin + '/'; } catch { return ''; } };

export async function abrirNoFirefox(url = '') {
  const escala = Math.round(zoomInterface() * (window.devicePixelRatio || 1));
  const r = await retro.firefox.abrir(url, { inicio: inicioFirefox(), escala }).catch(() => null);
  if (r && r.ok) return true;
  if (r && r.erro === 'semFirefox') firefoxInstalado = false;
  return false;
}

registrarApp('navegador', {
  nome: 'Navegador', icone: 'navegador',
  abrir: async (args = {}) => {
    // "interno": o Navegador daqui de propósito (Iniciar › Internet › Navegador do Retro Computer).
    if (!args.interno && usaFirefox() && await abrirNoFirefox(args.url || '')) return null;
    return args.reaproveitar ? abrirEndereco(args.url) : abrirNavegador(args);
  },
});
registrarApp('correio', { nome: 'E-mail', icone: 'correio', abrir: () => abrirCorreio() });

// As janelas novas pedidas pelas páginas (window.open, links com target).
retro.navegador.aoJanela((url) => { abrirNavegador({ url }); });
// O site cuja versão segura manda de volta para o http (Só conexões seguras): o aviso, na janela da página.
retro.navegador.aoSemSeguranca(({ id, url }) => {
  for (const n of abertos) {
    let dela = false;
    try { dela = !!n.wv && n.wv.getWebContentsId() === id; } catch { }
    if (dela) n.mostrarSemSeguranca(url);
  }
});

/* ---------- As permissões dos sites e a escolha da tela ---------- */

// Cada pedido numa frase inteira (a ordem das palavras muda de um idioma para outro).
const PEDIDOS = {
  'media:audio': marcar('O site {site} quer usar o microfone.'),
  'media:video': marcar('O site {site} quer usar a câmera.'),
  'media:audio+video': marcar('O site {site} quer usar a câmera e o microfone.'),
  notifications: marcar('O site {site} quer mostrar notificações.'),
  'clipboard-read': marcar('O site {site} quer ler o que você copiou (a área de transferência).'),
  geolocation: marcar('O site {site} quer saber a sua localização.'),
  outra: marcar('O site {site} pede uma permissão.'),
};

function nomeDoSite(endereco) {
  try { return new URL(endereco).host || endereco; } catch { return endereco || '?'; }
}

/** O aviso de como sair da tela cheia de um site: um balão por cima de tudo (a camada do topo). */
function avisoTelaCheia() {
  const el = h('div.nav-aviso-cheia', tr('O site está em tela cheia. Pressione Esc para sair.'));
  el.popover = 'manual';
  document.body.append(el);
  try { el.showPopover(); } catch { }
  setTimeout(() => { try { el.hidePopover(); } catch { } el.remove(); }, 4500);
}

/** Traz para a frente a janela do Navegador que mostra o site (a pergunta é sobre ela). */
function focarSite(origem) {
  const nav = [...abertos].reverse().find((n) => {
    if (n.j.fechada) return false;
    try { return new URL(n.url).origin === origem; } catch { return false; }
  });
  if (nav) nav.j.focar();
}

// Uma pergunta de cada vez, na ordem em que chegam.
let filaPerguntas = Promise.resolve();
const naFila = (f) => { filaPerguntas = filaPerguntas.then(f, f); return filaPerguntas; };

function perguntarPermissao({ origem, permissao, programa }) {
  if (!programa) focarSite(origem);
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    // Um programa Craft (código de fora) também pergunta antes de ler o que o usuário copiou.
    const j = new Janela({ titulo: programa ? tr('Permissão do programa') : tr('Permissão do site'), icone: programa ? 'programa' : 'navegador', dialogo: true, largura: 380, altura: 160, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const lembrar = h('input', { type: 'checkbox' });
    const permitir = h('button.padrao', { type: 'button', on: { click: () => fim({ permitir: true, lembrar: lembrar.checked }) } }, tr('Permitir'));
    j.corpo.append(
      h('div.mensagem', img('msg-pergunta', 32), h('div',
        h('div.texto', programa ? tr('O {programa} quer ler o que você copiou (a área de transferência).', { programa }) : tr(PEDIDOS[permissao] || PEDIDOS.outra, { site: nomeDoSite(origem) })),
        h('label.nav-lembrar', lembrar, h('span', programa ? tr('Lembrar a resposta para este programa') : tr('Lembrar a resposta para este site'))))),
      h('div.acoes', permitir, h('button', { type: 'button', on: { click: () => fim({ permitir: false, lembrar: lembrar.checked }) } }, tr('Bloquear'))),
    );
    ajustarAoConteudo(j, { minLarg: 380 });
    tocar('pergunta');
    permitir.focus();
  });
}

/** O site quer ver a tela: o usuário escolhe uma tela inteira ou uma janela. */
function escolherTela({ origem, fontes }) {
  focarSite(origem);
  return new Promise((resolve) => {
    let feito = false;
    let escolhida = null;
    const fim = (v) => { if (!feito) { feito = true; j.fechar(true); resolve(v); } };
    const j = new Janela({ titulo: tr('Compartilhar a tela'), icone: 'navegador', dialogo: true, largura: 520, altura: 360, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const ok = h('button.padrao', { type: 'button', disabled: true, on: { click: () => escolhida && fim({ id: escolhida }) } }, tr('Compartilhar'));
    const itens = [];
    const opcao = (f) => {
      const el = h('button.nav-fonte', { type: 'button', title: f.nome },
        f.miniatura ? h('img', { src: f.miniatura, alt: '' }) : h('div.nav-fonte-vazia', img(f.tela ? 'computador' : 'programa', 32)),
        h('span', f.nome));
      el.addEventListener('click', () => {
        escolhida = f.id;
        itens.forEach((x) => x.classList.toggle('escolhida', x === el));
        ok.disabled = false;
      });
      el.addEventListener('dblclick', () => fim({ id: f.id }));
      itens.push(el);
      return el;
    };
    const telas = fontes.filter((f) => f.tela);
    const janelasFonte = fontes.filter((f) => !f.tela);
    const grupo = (titulo, lista) => (lista.length ? h('fieldset', h('legend', titulo), h('div.nav-fontes', lista.map(opcao))) : null);
    j.corpo.append(
      h('div.mensagem', img('msg-pergunta', 32), h('div.texto', tr('O site {site} quer ver a sua tela. Escolha o que compartilhar:', { site: nomeDoSite(origem) }))),
      h('div.nav-fontes-caixa',
        grupo(tr('Telas inteiras'), telas),
        grupo(tr('Janelas'), janelasFonte),
        fontes.length ? null : h('div', { style: { padding: '8px' } }, tr('Não há nada para compartilhar.'))),
      h('div.acoes', ok, h('button', { type: 'button', on: { click: () => fim(null) } }, tr('Cancelar'))),
    );
    ajustarAoConteudo(j, { largura: 520 });
    tocar('pergunta');
    (itens[0] || ok).focus();
  });
}

retro.navegador.aoPermissao((p) => naFila(async () => {
  const r = await perguntarPermissao(p);
  await retro.navegador.responder(p.id, r).catch(() => { });
}));
retro.navegador.aoTela((p) => naFila(async () => {
  const r = await escolherTela(p);
  await retro.navegador.responder(p.id, r).catch(() => { });
}));

export { marcar };
