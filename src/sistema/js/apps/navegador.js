/*
 * O Navegador: páginas da internet numa janela com abas, com a barra de favoritos
 * (com os ícones dos sites) e uma página inicial com eles. Cada aba é um <webview>
 * da sessão "persist:navegador", separada da área de trabalho e dos programas: só
 * abre endereços http e https, sem acesso ao Node (o processo principal confere).
 * O "E-mail" é o Navegador aberto no e-mail escolhido; um site instalado como
 * programa é uma janela de uma aba só, sem as barras.
 */
import { h, img, rotulo, barraAdaptavel } from '../util.js';
import { zoomInterface, fundoCss, FUNDO_INICIO } from '../aparencia.js';
import { Janela } from '../janelas.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, estado, definirConfig, avisar, eventos, abrir } from '../sistema.js';
import { entrada, confirmar, mensagem, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar, idiomaAtual } from '../idioma.js';
import { luzPorCima } from '../luz-noturna.js';
import { variasTelas, telaDoRet } from '../telas.js';
import { reorganizavel, arrastando } from '../reorganizar.js';
import { ehPasta, itensDe, todosFavoritos, favoritoEm, lugarDe, semFavorito, comFavorito, moverFavorito, comPasta, semPasta, reordenada, reordenadaNaPasta, comIcone } from '../favoritos.js';

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

/* ---------- Os ícones dos sites ---------- */

// Os ícones dos sites (o favicon), guardados enquanto o Retro Computer está aberto: o endereço do
// ícone → a imagem já reduzida a 16 × 16. O processo principal os baixa com a sessão do Navegador
// (a área de trabalho não carrega nada de fora), e a redução num PNG tira o que não é imagem (um SVG).
const icones = new Map();
function iconeDoSite(url) {
  if (!url || !/^https?:\/\//i.test(url)) return Promise.resolve(null);
  if (!icones.has(url)) icones.set(url, retro.navegador.baixarIcone(url).then((r) => reduzirIcone(r.dados)).catch(() => null));
  return icones.get(url);
}

function reduzirIcone(dados) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(im, 0, 0, 16, 16);
        resolve(c.toDataURL('image/png'));
      } catch { resolve(null); }
    };
    im.onerror = () => resolve(null);
    im.src = dados;
  });
}

const origemDe = (url) => { try { return new URL(url).origin; } catch { return ''; } };

// Os favoritos sem ícone: o /favicon.ico do site é procurado uma vez por abertura do Retro Computer.
const procurados = new Set();
function completarIcones() {
  const faltam = todosFavoritos(favoritos()).map((x) => x.f).filter((f) => !f.icone && origemDe(f.url) && !procurados.has(origemDe(f.url)));
  for (const f of faltam) {
    const origem = origemDe(f.url);
    procurados.add(origem);
    iconeDoSite(origem + '/favicon.ico').then((icone) => { if (icone) guardarIcone(origem, icone); });
  }
}

/** Guarda o ícone nos favoritos do site que ainda não têm um. */
function guardarIcone(origem, icone) {
  const lista = favoritos();
  if (!todosFavoritos(lista).some((x) => !x.f.icone && origemDe(x.f.url) === origem)) return;
  salvarFavoritos(comIcone(lista, (url) => origemDe(url) === origem, icone)).catch(() => { });
}

/** O nome de um favorito num menu (o & não vira a letra sublinhada). */
const rotuloMenu = (nome) => String(nome || '').replace(/&/g, '&&');

/** Os favoritos mudaram (por aqui, por outra janela ou pelo Claude): a barra e a página inicial de todas as janelas. */
eventos.on('config', (_c, parte) => {
  if (parte && parte.navegador && 'favoritos' in parte.navegador) redesenharFavoritos();
  if (parte && parte.navegador && 'inicioFundo' in parte.navegador) for (const n of abertos) if (!n.j.fechada) n.abas.forEach(pintarFundo);
});

/** O fundo da página inicial (e da de erro, que tem o mesmo jeito): a cor e o padrão de Painel › Internet. */
function pintarFundo(aba) {
  const css = fundoCss({ ...FUNDO_INICIO, ...(cfg().inicioFundo || {}) });
  Object.assign(aba.inicio.style, css);
  Object.assign(aba.erroEl.style, css);
}
function redesenharFavoritos() {
  for (const n of abertos) {
    if (n.j.fechada) continue;
    n.desenharLinks();
    for (const a of n.abas) n.desenharInicio(a);
    n.atualizarEstrela();
  }
}

/** O ícone de um favorito (o do site ou o desenho do Retro Computer) e o de uma aba. */
const imgFavorito = (f) => (f.icone ? h('img', { src: f.icone, width: 16, height: 16, alt: '' }) : img(iconeDe(f.url), 16));

/* ---------- Uma aba ---------- */

/**
 * Uma aba do Navegador: a página (o webview), a página inicial e o aviso de erro, com o endereço,
 * o título, o ícone, o zoom e a busca de cada uma. Só a aba da frente fica à vista; as outras
 * continuam carregando e tocando por trás.
 */
class Aba {
  constructor() {
    this.wv = null;
    this.url = '';
    this.pronto = false;
    this.carregando = false;
    this.zoom = 1;
    this.busca = '';
    this.titulo = '';
    this.icone = null;
    this.inicio = h('div.nav-inicio');
    this.erroEl = h('div.nav-erro', { hidden: true });
    this.el = h('div.nav-conteudo', this.inicio, this.erroEl);
    this.botao = null;
  }

  /** O nome na aba: o título da página, o site ou "Nova aba". */
  nome() {
    if (this.titulo) return this.titulo;
    if (this.url && this.inicio.hidden) { try { return new URL(this.url).host || this.url; } catch { return this.url; } }
    return tr('Nova aba');
  }
}

class Navegador {
  /** app: um site instalado como programa (webapps.js): só a página, sem as abas e a barra de endereço. */
  constructor({ url, correio = false, app = null } = {}) {
    this.correio = correio;
    this.app = app;
    this.base = app ? app.nome : correio ? tr('E-mail') : tr('Navegador');
    this.abas = [];
    this.aba = null;
    this.fechadas = []; // os endereços das abas fechadas (Ctrl+Shift+T reabre)
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
    this.j.navegador = this; // para os roteiros de capturas (testes/capturas.mjs)
    this.j.ev.on('fechada', () => { abertos.delete(this); if (this.cheia) this.sairTelaCheia(this.cheia); });
    // Os botões laterais do mouse sobre a moldura (sobre a página, quem avisa é o navegador-preload.js).
    this.j.el.addEventListener('mouseup', (e) => {
      if (e.button === 3) { e.preventDefault(); this.voltar(); }
      else if (e.button === 4) { e.preventDefault(); this.avancar(); }
    });
    // As teclas com o foco fora da página (no endereço, nas abas); as da página vêm do navegador-preload.js.
    this.j.el.addEventListener('keydown', (e) => {
      const a = atalhoDoNavegador(e);
      if (!a || (a === 'endereco' && e.target === this.campo)) return;
      e.preventDefault();
      this.acao(this.aba, a);
    });

    // A linha de navegação: os botões, o endereço e a estrela dos favoritos.
    const bt = (icone, dica, acao) => h('button.ferramenta.nav-bt', { type: 'button', title: dica, on: { click: acao } }, img(icone, 16));
    this.btVoltar = bt('voltar', tr('Voltar (Alt+Esquerda)'), () => this.voltar());
    this.btAvancar = bt('avancar', tr('Avançar (Alt+Direita)'), () => this.avancar());
    this.btAtualizar = bt('atualizar', tr('Atualizar (F5)'), () => (this.carregando ? this.wv && this.wv.stop() : this.atualizar()));
    this.btInicio = bt('inicio', tr('Página inicial (Alt+Home)'), () => { if (this.aba) this.aba.pastaInicio = null; this.mostrarInicio(); });
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
    this.btEstrela = bt('favoritos', tr('Adicionar aos favoritos (Ctrl+D)'), () => this.alternarFavorito());
    this.btEstrela.classList.add('nav-estrela');
    const linha = h('div.barra-ferramentas.nav-linha', this.btVoltar, this.btAvancar, this.btAtualizar, this.btInicio,
      h('div.nav-campo', this.campo, this.btEstrela));

    // As abas, no alto (como nos navegadores de hoje), e a barra de favoritos, embaixo do endereço.
    this.listaAbas = h('div.nav-abas-lista');
    this.btNovaAba = h('button.nav-aba-nova', { type: 'button', title: tr('Nova aba (Ctrl+T)'), on: { click: () => this.novaAba() } }, '+');
    const faixa = h('div.nav-abas', this.listaAbas, this.btNovaAba);
    faixa.addEventListener('dblclick', (e) => { if (e.target === faixa || e.target === this.listaAbas) this.novaAba(); });
    this.links = h('div.nav-links');
    this.btMaisLinks = h('button.ferramenta.nav-mais', { type: 'button', title: tr('Mais favoritos'), hidden: true }, '»');
    this.btMaisLinks.addEventListener('click', () => {
      const r = this.btMaisLinks.getBoundingClientRect();
      abrirMenu(this.itensDoMenu(favoritos()).filter((_, i) => this.escondidos.includes(i)), { x: r.left, y: r.bottom });
    });
    this.escondidos = [];
    this.barraLinks = h('div.nav-barra-links', this.links, this.btMaisLinks);
    this.barraLinks.addEventListener('contextmenu', (e) => { if (!e.target.closest('button')) { e.preventDefault(); this.menuDoFundoFavoritos(e); } });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => this.ajustarLinks()).observe(this.barraLinks);

    this.area = h('div.nav-area');
    // Sem a barra de status, o endereço do link sob o mouse aparece num quadrinho no canto da página.
    this.dicaLink = h('div.nav-dica-link', { hidden: true });
    this.area.append(this.dicaLink);
    if (app) this.j.corpo.append(this.area);
    else this.j.corpo.append(faixa, linha, this.barraLinks, this.area);
    this.mostrarBarraStatus();
    this.mostrarBarraLinks();
    this.desenharLinks();
    this.j.ev.on('ativada', () => setTimeout(() => this.focarPagina(), 0));
    this.novaAba(url);
  }

  /* ---------- As abas ---------- */

  /** Uma aba nova (com o endereço, ou com a página inicial); frente: false a abre por trás. */
  novaAba(url, { frente = true, depoisDe = null } = {}) {
    const aba = new Aba();
    if (this.app) aba.el.classList.add('so-pagina');
    aba.botao = this.criarBotaoAba(aba);
    const i = depoisDe ? this.abas.indexOf(depoisDe) + 1 : this.abas.length;
    this.abas.splice(i, 0, aba);
    this.listaAbas.insertBefore(aba.botao, this.listaAbas.children[i] || null);
    aba.el.classList.add('escondida');
    this.area.append(aba.el);
    this.desenharInicio(aba);
    if (frente || !this.aba) this.escolherAba(aba);
    if (url) this.ir(url, aba);
    else this.mostrarInicio(aba);
    return aba;
  }

  criarBotaoAba(aba) {
    const icone = h('span.nav-aba-icone', img('internet', 16));
    const nome = h('span.nav-aba-nome');
    const fechar = h('button.nav-aba-fechar', { type: 'button', title: tr('Fechar a aba (Ctrl+W)') });
    fechar.addEventListener('click', (e) => { e.stopPropagation(); this.fecharAba(aba); });
    const el = h('div.nav-aba', icone, nome, fechar);
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) { e.preventDefault(); return; }
      if (e.button === 0 && e.target !== fechar) this.escolherAba(aba);
    });
    // O botão do meio fecha a aba (como nos navegadores).
    el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); this.fecharAba(aba); } });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      abrirMenu([
        { rotulo: tr('Nova a&ba'), acao: () => this.novaAba(null, { depoisDe: aba }) },
        { rotulo: tr('A&tualizar'), desativado: !aba.wv || !aba.pronto, acao: () => aba.wv && aba.wv.reload() },
        { rotulo: tr('&Duplicar'), desativado: !aba.url, acao: () => this.novaAba(aba.url, { depoisDe: aba }) },
        { separador: true },
        { rotulo: tr('&Fechar a aba'), acao: () => this.fecharAba(aba) },
        { rotulo: tr('Fechar as &outras abas'), desativado: this.abas.length < 2, acao: () => this.abas.filter((x) => x !== aba).forEach((x) => this.fecharAba(x)) },
        { rotulo: tr('&Reabrir a aba fechada'), desativado: !this.fechadas.length, acao: () => this.reabrirAba() },
      ], { x: e.clientX, y: e.clientY });
    });
    // Arrastar muda a ordem das abas (o clique de soltar não troca de aba nem a fecha).
    reorganizavel(el, this.listaAbas, (els) => this.reordenarAbas(els), { seletor: '.nav-aba' });
    aba.nomeEl = nome;
    aba.iconeEl = icone;
    return el;
  }

  /** A ordem nova das abas, depois de arrastar uma (vale para o Ctrl+Tab e o Ctrl+1 a 9). */
  reordenarAbas(els) {
    const nova = els.map((el) => this.abas.find((a) => a.botao === el)).filter(Boolean);
    if (nova.length === this.abas.length) this.abas = nova;
  }

  /** O nome e o ícone da aba (e o título da janela, se for a da frente). */
  desenharAba(aba) {
    if (!aba.botao) return;
    aba.nomeEl.textContent = aba.nome();
    aba.botao.title = aba.nome();
    aba.iconeEl.replaceChildren(aba.icone && !aba.carregando
      ? h('img', { src: aba.icone, width: 16, height: 16, alt: '' })
      : img(aba.carregando ? 'atualizar' : (aba.inicio.hidden ? 'internet' : 'navegador'), 16));
    aba.botao.classList.toggle('carregando', aba.carregando);
    if (aba === this.aba) this.j.definirTitulo(aba.titulo ? `${aba.titulo} - ${this.base}` : this.base);
  }

  escolherAba(aba) {
    if (!aba || aba === this.aba) return;
    if (this.aba) this.aba.el.classList.add('escondida');
    this.aba = aba;
    aba.el.classList.remove('escondida');
    for (const a of this.abas) a.botao.classList.toggle('ativa', a === aba);
    aba.botao.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (document.activeElement !== this.campo || !this.campo.value) this.campo.value = aba.inicio.hidden ? aba.url || '' : '';
    this.desenharAba(aba);
    this.j.definirStatus([aba.carregando ? tr('Carregando…') : aba.pronto ? tr('Concluído') : tr('Pronto'), this.textoZoom()]);
    this.atualizarBotoes();
    this.atualizarEstrela();
    setTimeout(() => this.focarPagina(), 0);
  }

  fecharAba(aba) {
    const i = this.abas.indexOf(aba);
    if (i < 0) return;
    if (aba.url && aba.inicio.hidden) this.fechadas.push(aba.url);
    if (this.fechadas.length > 20) this.fechadas.shift();
    // A última aba fecha a janela.
    if (this.abas.length === 1) { this.j.fechar(); return; }
    this.abas.splice(i, 1);
    aba.botao.remove();
    if (aba.wv) { try { aba.wv.stop(); } catch { } }
    aba.el.remove();
    if (aba === this.aba) {
      this.aba = null;
      this.escolherAba(this.abas[Math.min(i, this.abas.length - 1)]);
    }
  }

  reabrirAba() {
    const url = this.fechadas.pop();
    if (url) this.novaAba(url);
  }

  /** Ctrl+Tab e Ctrl+Shift+Tab; Ctrl+1 a Ctrl+8 vão para a aba, Ctrl+9 para a última. */
  passarAba(passo) {
    if (this.abas.length < 2) return;
    const i = this.abas.indexOf(this.aba);
    this.escolherAba(this.abas[(i + passo + this.abas.length) % this.abas.length]);
  }

  irParaAba(n) {
    this.escolherAba(n >= 9 ? this.abas[this.abas.length - 1] : this.abas[n - 1]);
  }

  /** A aba do webview (pelo identificador da página), nesta janela. */
  abaDaPagina(id) {
    return this.abas.find((a) => { try { return !!a.wv && a.wv.getWebContentsId() === id; } catch { return false; } }) || null;
  }

  focarPagina() {
    const a = this.aba;
    if (!a) return;
    if (a.wv && !a.wv.hidden && a.inicio.hidden) a.wv.focus();
    else if (!this.app) this.campo.focus();
  }

  // O estado da aba da frente (os nomes de antes, usados em todo o resto).
  get wv() { return this.aba ? this.aba.wv : null; }
  get url() { return this.aba ? this.aba.url : ''; }
  get pronto() { return !!(this.aba && this.aba.pronto); }
  get carregando() { return !!(this.aba && this.aba.carregando); }
  get zoom() { return this.aba ? this.aba.zoom : 1; }
  get busca() { return this.aba ? this.aba.busca : ''; }
  set busca(v) { if (this.aba) this.aba.busca = v; }

  /* ---------- Os menus ---------- */

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('Nova a&ba'), atalho: 'Ctrl+T', acao: () => this.novaAba() },
          { rotulo: tr('&Nova janela'), atalho: 'Ctrl+N', acao: () => abrirNavegador() },
          { rotulo: tr('&Abrir endereço…'), atalho: 'Ctrl+L', acao: () => this.focarEndereco() },
          { rotulo: tr('Instalar como &programa…'), desativado: !this.visivel(), acao: () => this.instalarComoPrograma() },
          ...(firefoxInstalado ? [{ rotulo: tr('Abrir no Fi&refox'), desativado: !this.visivel(), acao: () => abrirNoFirefox(this.url) }] : []),
          { separador: true },
          { rotulo: tr('&Imprimir…'), atalho: 'Ctrl+P', desativado: !this.visivel(), acao: () => this.wv.print().catch(() => { }) },
          { separador: true },
          { rotulo: tr('F&echar a aba'), atalho: 'Ctrl+W', acao: () => this.fecharAba(this.aba) },
          { rotulo: tr('&Fechar'), atalho: 'Alt+F4', acao: () => this.j.fechar() },
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
          { rotulo: tr('Barra de &favoritos'), atalho: 'Ctrl+Shift+B', marcado: barraLinksLigada(), acao: () => alternarBarraLinks() },
          { rotulo: tr('Barra de &status'), marcado: barraStatusLigada(), acao: () => alternarBarraStatus() },
          { separador: true },
          { rotulo: tr('Vídeo em janela flu&tuante'), atalho: 'Ctrl+Shift+P', desativado: !this.visivel(), acao: () => this.videoFlutuante() },
          { separador: true },
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
          { rotulo: tr('Próxima a&ba'), atalho: 'Ctrl+Tab', desativado: this.abas.length < 2, acao: () => this.passarAba(1) },
          { rotulo: tr('Aba an&terior'), atalho: 'Ctrl+Shift+Tab', desativado: this.abas.length < 2, acao: () => this.passarAba(-1) },
          { rotulo: tr('&Reabrir a aba fechada'), atalho: 'Ctrl+Shift+T', desativado: !this.fechadas.length, acao: () => this.reabrirAba() },
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
          { rotulo: tr('Barra de &status'), marcado: barraStatusLigada(), acao: () => alternarBarraStatus() },
          { rotulo: tr('Vídeo em janela flu&tuante'), atalho: 'Ctrl+Shift+P', desativado: !this.visivel(), acao: () => this.videoFlutuante() },
          { separador: true },
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

  visivel(aba = this.aba) {
    return !!(aba && aba.wv && !aba.wv.hidden && aba.pronto && aba.inicio.hidden && aba.erroEl.hidden);
  }

  podeVoltar() {
    if (!this.visivel()) return false;
    try { return this.wv.canGoBack(); } catch { return false; }
  }

  podeAvancar() {
    if (!this.visivel()) return false;
    try { return this.wv.canGoForward(); } catch { return false; }
  }

  ir(texto, aba = this.aba) {
    const url = paraEndereco(texto, busca().url);
    if (!url || !aba) return;
    aba.erroEl.hidden = true;
    aba.inicio.hidden = true;
    // Outro site: o título e o ícone do de antes saem da aba.
    if (origemDe(url) !== origemDe(aba.url)) { aba.icone = null; aba.titulo = ''; }
    if (!aba.wv) this.criarWebview(url, aba);
    else {
      aba.wv.hidden = false;
      aba.wv.loadURL(url).catch(() => { });
    }
    aba.url = url;
    if (aba === this.aba) {
      this.campo.value = url;
      aba.wv.focus();
      this.atualizarBotoes();
      this.atualizarEstrela();
    }
    this.desenharAba(aba);
  }

  criarWebview(url, aba) {
    const wv = document.createElement('webview');
    // A partição antes do endereço: é ela que separa os dados do Navegador.
    wv.setAttribute('partition', SESSAO);
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('src', url);
    wv.className = 'nav-pagina';
    aba.wv = wv;
    const daFrente = () => aba === this.aba;
    wv.addEventListener('dom-ready', () => {
      if (!aba.pronto) {
        aba.pronto = true;
        if (aba.zoom !== 1) wv.setZoomFactor(aba.zoom * zoomInterface());
      }
      if (daFrente()) this.atualizarBotoes();
    });
    wv.addEventListener('focus', () => this.j.focar());
    wv.addEventListener('did-start-loading', () => this.definirCarregando(true, aba));
    wv.addEventListener('did-stop-loading', () => this.definirCarregando(false, aba));
    const navegou = (e) => {
      if (e.isMainFrame === false) return;
      if (origemDe(e.url) !== origemDe(aba.url)) { aba.icone = null; this.tirarAvisoDrm(aba); }
      aba.url = e.url;
      if (daFrente()) {
        if (document.activeElement !== this.campo) this.campo.value = e.url;
        this.atualizarBotoes();
        this.atualizarEstrela();
      }
      this.desenharAba(aba);
    };
    wv.addEventListener('did-navigate', navegou);
    wv.addEventListener('did-navigate-in-page', navegou);
    wv.addEventListener('page-title-updated', (e) => { aba.titulo = e.title || ''; this.desenharAba(aba); });
    // O ícone do site: na aba e nos favoritos do site que ainda não têm um.
    wv.addEventListener('page-favicon-updated', (e) => {
      const lista = (e.favicons || []).filter((u) => /^https?:\/\//i.test(u));
      if (!lista.length) return;
      const pagina = aba.url;
      iconeDoSite(lista[0]).then((icone) => {
        if (!icone || aba.url !== pagina) return;
        aba.icone = icone;
        this.desenharAba(aba);
        guardarIcone(origemDe(pagina), icone);
      });
    });
    wv.addEventListener('update-target-url', (e) => {
      if (!daFrente()) return;
      this.j.definirStatus([e.url || (aba.carregando ? tr('Carregando…') : tr('Concluído')), this.textoZoom()]);
      this.mostrarDicaLink(e.url);
    });
    wv.addEventListener('did-fail-load', async (e) => {
      // -3 é a carga interrompida (outro clique, o botão Parar): não é erro.
      if (e.errorCode === -3 || e.isMainFrame === false) return;
      const endereco = e.validatedURL || aba.url;
      // A versão segura de um http:// não abriu (ou mandou de volta para o http): o aviso, com a escolha.
      const semSeguranca = await retro.navegador.semSeguranca(endereco).catch(() => null);
      if (semSeguranca) return this.mostrarSemSeguranca(semSeguranca, aba);
      this.mostrarErro(endereco, e.errorDescription, aba);
    });
    wv.addEventListener('context-menu', (e) => this.menuDaPagina(e.params));
    // Um site em tela cheia: o aviso de como sair, por cima dele (senão ele poderia imitar a tela de bloqueio).
    wv.addEventListener('enter-html-full-screen', () => { avisoTelaCheia(); this.entrarTelaCheia(wv); });
    wv.addEventListener('leave-html-full-screen', () => this.sairTelaCheia(wv));
    wv.addEventListener('ipc-message', (e) => { if (e.channel === 'navegador') this.acao(aba, ...e.args); });
    wv.addEventListener('found-in-page', (e) => {
      const r = e.result || {};
      if (r.finalUpdate && daFrente()) this.j.definirStatus([r.matches ? tr('{n} de {total}', { n: r.activeMatchOrdinal, total: r.matches }) : tr('Não foi possível localizar "{texto}".', { texto: aba.busca }), this.textoZoom()]);
    });
    aba.el.append(wv);
  }

  /**
   * O site pediu vídeo protegido (DRM), que o Navegador daqui não toca (não tem o Widevine): a faixa
   * amarela de informação, como a da época, por cima da página, com o caminho que toca: o Firefox
   * (o perfil do Retro Computer tem o Widevine) ou, sem ele, o navegador do computador principal.
   * Um site pode pedir só para saber se há o recurso: por isso a faixa diz "se o vídeo não abrir" e
   * deixa não avisar mais naquele site.
   */
  avisarDrm(aba) {
    const origem = origemDe(aba.url);
    if (!origem || aba.drmEl || (cfg().semAvisoDrm || []).includes(origem)) return;
    const url = aba.url;
    const fechar = () => this.tirarAvisoDrm(aba);
    const botoes = [];
    if (firefoxInstalado) {
      botoes.push(h('button', { on: { click: async () => { fechar(); if (!(await abrirNoFirefox(url))) this.avisarSemFirefox(); } } }, tr('Abrir no Firefox')));
    } else if (!estado.config.modoSistema) {
      botoes.push(h('button', { on: { click: () => { fechar(); retro.sistema.abrirLink(url).catch(() => { }); } } }, tr('Abrir no navegador do computador')));
    } else {
      botoes.push(h('button', { on: { click: () => { fechar(); abrir('painel', { secao: 'internet' }); } } }, tr('Instalar o Firefox…')));
    }
    botoes.push(h('button', { on: { click: () => { fechar(); definirConfig({ navegador: { semAvisoDrm: [...(cfg().semAvisoDrm || []), origem] } }); } } }, tr('Não avisar neste site')));
    aba.drmEl = h('div.nav-faixa-info', { role: 'alert' },
      img('seguranca', 16),
      h('span', firefoxInstalado ? tr('Este site usa vídeo protegido (DRM), que o Navegador do Retro Computer não toca. Se o vídeo não abrir, abra o site no Firefox.')
        : !estado.config.modoSistema ? tr('Este site usa vídeo protegido (DRM), que o Navegador do Retro Computer não toca. Se o vídeo não abrir, abra o site no navegador do computador.')
          : tr('Este site usa vídeo protegido (DRM), que o Navegador do Retro Computer não toca. Se o vídeo não abrir, instale o Firefox, que toca.')),
      ...botoes,
      h('button.nav-faixa-fechar', { title: tr('Fechar'), on: { click: fechar } }));
    aba.el.append(aba.drmEl);
  }

  tirarAvisoDrm(aba) {
    if (aba.drmEl) { aba.drmEl.remove(); aba.drmEl = null; }
  }

  avisarSemFirefox() {
    mensagem({ titulo: tr('Navegador'), tipo: 'info', texto: tr('O Firefox não foi achado neste computador. Para os vídeos protegidos, instale o Firefox e escolha-o em Painel de controle › Internet.'), botoes: [{ texto: tr('OK'), valor: null, padrao: true }] });
  }

  /**
   * A tela cheia de um site. A da página inteira o Chromium já faz (o webview vai para a camada de
   * cima da tela). A de um quadro de outro site dentro da página (o vídeo do Vimeo numa página de
   * curso) ele não faz: o quadro só enche o webview. Aí o webview vai sozinho para a camada de cima
   * (como um popover), cobrindo a tela inteira, e a janela do Retro Computer fica em tela cheia.
   */
  entrarTelaCheia(wv) {
    setTimeout(() => {
      if (!wv.isConnected || document.fullscreenElement === wv || this.cheia === wv) return;
      this.cheia = wv;
      wv.classList.add('nav-tela-cheia');
      // Com as duas telas, o vídeo fica na tela da janela do Navegador (e não partido entre os monitores).
      if (variasTelas()) {
        const s = telaDoRet(this.j.el.getBoundingClientRect());
        Object.assign(wv.style, { inset: 'auto', left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px' });
      }
      try { wv.popover = 'manual'; wv.showPopover(); } catch { }
      luzPorCima();
      retro.navegador.telaCheia(true).catch(() => { });
    }, 150);
  }

  sairTelaCheia(wv) {
    if (this.cheia !== wv) return;
    this.cheia = null;
    try { wv.hidePopover(); } catch { }
    wv.removeAttribute('popover');
    wv.classList.remove('nav-tela-cheia');
    for (const p of ['inset', 'left', 'top', 'width', 'height']) wv.style.removeProperty(p);
    retro.navegador.telaCheia(false).catch(() => { });
  }

  definirCarregando(v, aba = this.aba) {
    aba.carregando = v;
    this.desenharAba(aba);
    if (aba !== this.aba) return;
    this.j.el.classList.toggle('carregando-pagina', v);
    this.j.definirStatus([v ? tr('Carregando…') : tr('Concluído'), this.textoZoom()]);
    this.atualizarBotoes();
  }

  atualizarBotoes() {
    const a = this.aba;
    this.btVoltar.disabled = !this.podeVoltar() && !(a && !a.inicio.hidden && a.wv);
    this.btAvancar.disabled = !this.podeAvancar();
    // Carregando, o Atualizar vira o Parar (como nos navegadores de hoje).
    const parar = this.carregando;
    this.btAtualizar.replaceChildren(img(parar ? 'parar' : 'atualizar', 16));
    this.btAtualizar.title = parar ? tr('Parar (Esc)') : tr('Atualizar (F5)');
    this.btAtualizar.disabled = !parar && !this.visivel() && !(a && !a.erroEl.hidden);
    // A estrela depende de a página estar pronta (o dom-ready chega depois do ir).
    this.atualizarEstrela();
  }

  voltar() {
    const a = this.aba;
    if (a && !a.inicio.hidden && a.wv) return this.mostrarPagina();
    if (this.podeVoltar()) this.wv.goBack();
  }

  avancar() {
    if (this.podeAvancar()) this.wv.goForward();
  }

  atualizar() {
    const a = this.aba;
    if (a && !a.erroEl.hidden && a.url) return this.ir(a.url);
    if (this.visivel()) this.wv.reload();
  }

  focarEndereco() {
    if (this.app) return;
    this.campo.focus();
    this.campo.select();
  }

  mostrarPagina(aba = this.aba) {
    aba.inicio.hidden = true;
    aba.erroEl.hidden = true;
    if (aba.wv) aba.wv.hidden = false;
    if (aba === this.aba) {
      this.campo.value = aba.url || '';
      this.atualizarBotoes();
      this.atualizarEstrela();
    }
    this.desenharAba(aba);
  }

  mostrarInicio(aba = this.aba) {
    // No site instalado como programa, o início é o próprio site.
    if (this.app) return this.ir(this.app.url, aba);
    if (aba.wv) {
      aba.wv.stop();
      aba.wv.hidden = true;
    }
    aba.erroEl.hidden = true;
    aba.titulo = '';
    this.desenharInicio(aba);
    aba.inicio.hidden = false;
    this.desenharAba(aba);
    if (aba !== this.aba) return;
    this.campo.value = '';
    this.j.definirStatus([tr('Pronto'), '']);
    this.atualizarBotoes();
    this.atualizarEstrela();
    setTimeout(() => this.campo.focus(), 0);
  }

  /** O site não tem conexão segura (Painel › Segurança › Só conexões seguras): abrir só se o usuário quiser. */
  mostrarSemSeguranca(url, aba = this.aba) {
    if (aba.wv) aba.wv.hidden = true;
    aba.inicio.hidden = true;
    let site = url;
    try { site = new URL(url).host; } catch { }
    const voltar = () => {
      if (aba.wv && aba.wv.canGoBack()) { this.mostrarPagina(aba); aba.wv.goBack(); } else this.mostrarInicio(aba);
    };
    aba.erroEl.replaceChildren(
      h('div.nav-erro-caixa',
        img('msg-aviso', 32),
        h('div',
          h('b', tr('Este site não tem conexão segura.')),
          h('p', url),
          h('p', tr('O Navegador tentou a versão segura (HTTPS) de {site}, e ela não respondeu. Sem ela, o que você envia ao site (senhas, números de cartão) pode ser visto por outras pessoas na rede.', { site })),
          h('div.acoes',
            h('button.padrao', { on: { click: voltar } }, tr('Voltar')),
            h('button', { on: { click: async () => { await retro.navegador.abrirSemSeguranca(url).catch(() => { }); this.ir(url, aba); } } }, tr('Abrir assim mesmo'))))));
    aba.erroEl.hidden = false;
    aba.url = url;
    aba.titulo = '';
    this.desenharAba(aba);
    if (aba !== this.aba) return;
    if (document.activeElement !== this.campo) this.campo.value = url;
    this.j.definirStatus([tr('Sem conexão segura'), '']);
    this.atualizarBotoes();
  }

  mostrarErro(url, descricao, aba = this.aba) {
    if (aba.wv) aba.wv.hidden = true;
    aba.inicio.hidden = true;
    aba.erroEl.replaceChildren(
      h('div.nav-erro-caixa',
        img('msg-aviso', 32),
        h('div',
          h('b', tr('Não foi possível abrir a página.')),
          h('p', url),
          h('p', tr('Verifique o endereço e a conexão com a internet. Detalhe: {erro}', { erro: descricao || '?' })),
          h('div.acoes', h('button.padrao', { on: { click: () => this.ir(url, aba) } }, tr('Tentar de novo')), h('button', { on: { click: () => this.mostrarInicio(aba) } }, tr('Página inicial'))))));
    aba.erroEl.hidden = false;
    this.desenharAba(aba);
    if (aba !== this.aba) return;
    this.j.definirStatus([tr('Erro'), '']);
    this.atualizarBotoes();
  }

  /** As teclas, os botões do mouse e as notificações que a página repassa (navegador-preload.js). */
  acao(aba, a, ...args) {
    if (a === 'notificacao') return this.notificar(aba, ...args);
    if (a === 'drm') return this.avisarDrm(aba);
    // As teclas só valem na aba da frente (a de trás não tem o foco).
    if (aba && aba !== this.aba) return;
    if (/^aba:\d$/.test(a)) return this.irParaAba(Number(a.slice(4)));
    switch (a) {
      case 'voltar': return this.voltar();
      case 'avancar': return this.avancar();
      case 'atualizar': return this.atualizar();
      case 'parar': return this.carregando && this.wv && this.wv.stop();
      case 'endereco': return this.focarEndereco();
      case 'inicio': return this.mostrarInicio();
      case 'localizar': return this.localizar(true);
      case 'proxima': return this.localizar(false);
      case 'nova': return abrirNavegador();
      case 'novaAba': return this.app ? null : this.novaAba();
      case 'fechar': return this.app ? this.j.fechar() : this.fecharAba(this.aba);
      case 'proximaAba': return this.passarAba(1);
      case 'abaAnterior': return this.passarAba(-1);
      case 'reabrirAba': return this.reabrirAba();
      case 'barraFavoritos': return this.app ? null : alternarBarraLinks();
      case 'favorito': return this.adicionarFavorito();
      case 'imprimir': return this.visivel() && this.wv.print().catch(() => { });
      case 'videoFlutuante': return this.videoFlutuante();
      case 'aumentar': return this.mudarZoom(0.1);
      case 'diminuir': return this.mudarZoom(-0.1);
      case 'zoom100': return this.mudarZoom(0);
      case 'telaCheia': return retro.sistema.telaCheia();
      case 'iniciar': return import('../barra.js').then((m) => m.abrirIniciar());
      default:
    }
  }

  /** A notificação do site vira o balão da barra de tarefas; o clique traz a janela e a aba. */
  notificar(aba, titulo, corpo) {
    avisar(String(titulo || nomeDoSite(aba ? aba.url : this.url)), String(corpo || ''), {
      icone: this.app ? this.app.icone || 'internet' : this.correio ? 'correio' : 'navegador', ms: 8000,
      aoClicar: () => { if (!this.j.fechada) { this.j.focar(); if (aba && this.abas.includes(aba)) this.escolherAba(aba); } },
    });
  }

  /* ---------- Zoom e localizar ---------- */

  textoZoom() {
    return this.zoom === 1 ? '' : `${Math.round(this.zoom * 100)}%`;
  }

  mudarZoom(passo) {
    if (!this.visivel()) return;
    const a = this.aba;
    a.zoom = passo === 0 ? 1 : Math.min(3, Math.max(0.3, Math.round((a.zoom + passo) * 10) / 10));
    a.wv.setZoomFactor(a.zoom * zoomInterface());
    this.j.definirStatus([tr('Concluído'), this.textoZoom()]);
  }

  async localizar(perguntar) {
    if (!this.visivel()) return;
    const a = this.aba;
    if (perguntar || !a.busca) {
      const t = await entrada({ titulo: tr('Localizar'), texto: tr('Localizar nesta página:'), valor: a.busca, icone: 'localizar' });
      if (!t) return;
      a.busca = t;
      a.wv.findInPage(t);
    } else {
      a.wv.findInPage(a.busca, { findNext: true });
    }
  }

  /* ---------- Favoritos ---------- */

  itensFavoritos() {
    const lista = favoritos();
    return [
      { rotulo: tr('&Adicionar aos favoritos…'), atalho: 'Ctrl+D', desativado: !this.visivel(), acao: () => this.adicionarFavorito() },
      { rotulo: tr('Nova &pasta…'), acao: () => this.novaPasta() },
      { rotulo: tr('&Organizar favoritos'), sub: () => this.itensOrganizar() },
      { rotulo: tr('Barra de &favoritos'), marcado: barraLinksLigada(), acao: () => alternarBarraLinks() },
      { separador: true },
      ...this.itensDoMenu(lista),
    ];
  }

  /** Os favoritos num menu: as pastas viram submenus. */
  itensDoMenu(lista) {
    return lista.map((f, i) => (ehPasta(f)
      ? { rotulo: rotuloMenu(f.nome), icone: 'pasta', sub: () => this.itensDaPasta(i) }
      : { rotulo: rotuloMenu(f.nome), icone: f.icone || iconeDe(f.url), acao: () => this.ir(f.url) }));
  }

  /** O menu de uma pasta: os favoritos dela e "Abrir tudo em abas". */
  itensDaPasta(i) {
    const itens = itensDe(favoritos()[i]);
    if (!itens.length) return [{ rotulo: tr('(Vazio)'), desativado: true }];
    return [
      ...itens.map((g) => ({ rotulo: rotuloMenu(g.nome), icone: g.icone || iconeDe(g.url), acao: () => this.ir(g.url) })),
      { separador: true },
      { rotulo: tr('Abrir &tudo em abas'), acao: () => this.abrirPasta(i) },
    ];
  }

  /** Favoritos › Organizar: tirar um favorito ou uma pasta. */
  itensOrganizar() {
    const lista = favoritos();
    if (!lista.length) return [{ rotulo: tr('(Vazio)'), desativado: true }];
    return lista.map((f, i) => (ehPasta(f)
      ? {
        rotulo: rotuloMenu(f.nome), icone: 'pasta', sub: () => [
          ...itensDe(f).map((g, j) => ({ rotulo: tr('Remover "{nome}"', { nome: rotuloMenu(g.nome) }), acao: () => this.removerFavorito([i, j]) })),
          ...(itensDe(f).length ? [{ separador: true }] : []),
          { rotulo: tr('&Excluir a pasta…'), acao: () => this.excluirPasta(i) },
        ],
      }
      : { rotulo: tr('Remover "{nome}"', { nome: rotuloMenu(f.nome) }), acao: () => this.removerFavorito([i]) }));
  }

  /** O endereço da aba da frente está nos favoritos (também numa pasta)? O lugar dele, ou null. */
  lugarFavorito() {
    if (!this.url || !this.aba || !this.aba.inicio.hidden) return null;
    return lugarDe(favoritos(), this.url);
  }

  atualizarEstrela() {
    if (!this.btEstrela) return;
    const c = this.lugarFavorito();
    this.btEstrela.classList.toggle('apertado', !!c);
    this.btEstrela.title = c ? tr('Esta página está nos favoritos (clique para tirar)') : tr('Adicionar aos favoritos (Ctrl+D)');
    this.btEstrela.disabled = !this.visivel() && !c;
  }

  /** A estrela do endereço: guarda a página nos favoritos ou a tira deles. */
  alternarFavorito() {
    const c = this.lugarFavorito();
    if (c) return this.removerFavorito(c);
    return this.adicionarFavorito();
  }

  async adicionarFavorito() {
    if (!this.visivel() || !this.url) return;
    const a = this.aba;
    const titulo = (a.wv.getTitle() || a.url).slice(0, 80);
    const nome = await entrada({ titulo: tr('Adicionar aos favoritos'), texto: tr('Nome do favorito:'), valor: titulo, icone: 'navegador' });
    if (!nome) return;
    await salvarFavoritos([...favoritos(), { nome: nome.trim() || titulo, url: a.url, ...(a.icone ? { icone: a.icone } : {}) }]);
    avisar(tr('Favorito adicionado'), nome, { icone: 'navegador', som: null, guardar: false });
  }

  async removerFavorito(c) {
    const lista = favoritos();
    const f = favoritoEm(lista, c);
    if (!f || ehPasta(f)) return;
    if (!(await confirmar(tr('Remover "{nome}" dos favoritos?', { nome: f.nome }), { titulo: tr('Favoritos') }))) return;
    await salvarFavoritos(semFavorito(favoritos(), c));
  }

  /** Renomeia um favorito ou uma pasta. */
  async renomearFavorito(c) {
    const f = favoritoEm(favoritos(), c);
    if (!f) return;
    const pasta = ehPasta(f);
    const nome = await entrada({ titulo: pasta ? tr('Renomear a pasta') : tr('Renomear o favorito'), texto: pasta ? tr('Nome da pasta:') : tr('Nome do favorito:'), valor: f.nome, icone: pasta ? 'pasta' : 'navegador' });
    if (!nome || !nome.trim()) return;
    await salvarFavoritos(comFavorito(favoritos(), c, (x) => ({ ...x, nome: nome.trim() })));
  }

  /** Uma pasta nova no fim da barra; com c, o favorito desse lugar já entra nela. */
  async novaPasta(c = null) {
    const nome = await entrada({ titulo: tr('Nova pasta'), texto: tr('Nome da pasta:'), valor: tr('Nova pasta'), icone: 'pasta' });
    if (!nome || !nome.trim()) return;
    const lista = comPasta(favoritos(), nome.trim());
    await salvarFavoritos(c ? moverFavorito(lista, c, lista.length - 1) : lista);
  }

  /** Tira a pasta; os favoritos dela ficam na barra, no lugar dela. */
  async excluirPasta(i) {
    const p = favoritos()[i];
    if (!ehPasta(p)) return;
    const texto = itensDe(p).length
      ? tr('Excluir a pasta "{nome}"? Os favoritos dela ficam na barra de favoritos.', { nome: p.nome })
      : tr('Excluir a pasta "{nome}"?', { nome: p.nome });
    if (!(await confirmar(texto, { titulo: tr('Favoritos') }))) return;
    await salvarFavoritos(semPasta(favoritos(), i));
  }

  /** Os favoritos da pasta, cada um numa aba (a primeira fica na frente). */
  abrirPasta(i) {
    itensDe(favoritos()[i]).forEach((g, k) => this.novaAba(g.url, { frente: k === 0 }));
  }

  /** Leva o favorito do lugar c para a pasta p (ou, com p null, para a barra). */
  moverPara(c, p) {
    const lista = favoritos();
    const nova = moverFavorito(lista, c, p);
    if (nova === lista) { this.desenharLinks(); return Promise.resolve(); }
    return salvarFavoritos(nova).catch(() => this.desenharLinks());
  }

  /** Os destinos de "Mover para": a barra (para o que está numa pasta), as outras pastas e uma pasta nova. */
  destinosDe(c) {
    const lista = favoritos();
    const r = [];
    if (c.length === 2) r.push({ rotulo: tr('Barra de favoritos'), icone: 'favoritos', acao: () => this.moverPara(c, null) });
    lista.forEach((p, i) => { if (ehPasta(p) && !(c.length === 2 && c[0] === i)) r.push({ rotulo: rotuloMenu(p.nome), icone: 'pasta', acao: () => this.moverPara(c, i) }); });
    if (r.length) r.push({ separador: true });
    r.push({ rotulo: tr('Nova &pasta…'), acao: () => this.novaPasta(c) });
    return r;
  }

  /** O menu de um favorito (na barra, na página inicial e dentro de uma pasta dela). */
  menuFavorito(f, c, e) {
    abrirMenu([
      { rotulo: tr('&Abrir'), negrito: true, acao: () => this.ir(f.url) },
      { rotulo: tr('Abrir em nova a&ba'), acao: () => this.novaAba(f.url) },
      { rotulo: tr('Abrir em &nova janela'), acao: () => abrirNavegador({ url: f.url }) },
      { separador: true },
      { rotulo: tr('Mo&ver para'), sub: () => this.destinosDe(c) },
      { rotulo: tr('&Renomear…'), acao: () => this.renomearFavorito(c) },
      { rotulo: tr('Re&mover dos favoritos'), acao: () => this.removerFavorito(c) },
    ], { x: e.clientX, y: e.clientY });
  }

  /** O menu de uma pasta (na barra e na página inicial). */
  menuPasta(i, e) {
    abrirMenu([
      { rotulo: tr('&Abrir'), negrito: true, acao: () => this.mostrarPastaNoInicio(i) },
      { rotulo: tr('Abrir &tudo em abas'), desativado: !itensDe(favoritos()[i]).length, acao: () => this.abrirPasta(i) },
      { separador: true },
      { rotulo: tr('&Renomear…'), acao: () => this.renomearFavorito([i]) },
      { rotulo: tr('&Excluir a pasta…'), acao: () => this.excluirPasta(i) },
    ], { x: e.clientX, y: e.clientY });
  }

  /** O menu do fundo da barra de favoritos e da página inicial. */
  menuDoFundoFavoritos(e) {
    abrirMenu([{ rotulo: tr('Nova &pasta…'), acao: () => this.novaPasta() }], { x: e.clientX, y: e.clientY });
  }

  /* ---------- A barra de favoritos ---------- */

  mostrarBarraLinks() {
    this.barraLinks.hidden = !!this.app || !barraLinksLigada();
    this.ajustarLinks();
  }

  /** A barra de status embaixo da janela (escondida por padrão: Exibir › Barra de status). */
  mostrarBarraStatus() {
    const ligada = barraStatusLigada();
    if (this.j.statusEl) this.j.statusEl.hidden = !ligada;
    this.j.el.classList.toggle('sem-status', !ligada);
    if (ligada) this.mostrarDicaLink('');
  }

  mostrarDicaLink(url) {
    const mostrar = !!url && !barraStatusLigada();
    this.dicaLink.hidden = !mostrar;
    if (mostrar) this.dicaLink.textContent = url;
  }

  desenharLinks() {
    // No meio de um arrasto na barra, ela só é refeita depois de soltar (o botão arrastado sumiria).
    if (arrastando(this.links)) { this.linksDepois = true; return; }
    const lista = favoritos();
    this.links.replaceChildren(...(lista.length ? lista.map((f, i) => {
      let el;
      if (ehPasta(f)) {
        // A pasta abre o menu com os favoritos dela, logo abaixo, como as da barra de Links da época.
        el = h('button.ferramenta.nav-link.nav-pasta', { type: 'button', title: f.nome }, img('pasta', 16), h('span', f.nome));
        el.addEventListener('click', () => { const r = el.getBoundingClientRect(); abrirMenu(this.itensDaPasta(i), { x: r.left, y: r.bottom }); });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.menuPasta(i, e); });
      } else {
        el = h('button.ferramenta.nav-link', { type: 'button', title: `${f.nome}\n${f.url}` }, imgFavorito(f), h('span', f.nome));
        el.addEventListener('click', (e) => { if (e.ctrlKey || e.metaKey) this.novaAba(f.url, { frente: false }); else this.ir(f.url); });
        // O botão do meio abre numa aba nova, por trás (como nos navegadores).
        el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); this.novaAba(f.url, { frente: false }); } });
        el.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.menuFavorito(f, [i], e); });
      }
      el.dataset.i = i;
      // Arrastar muda a ordem (os que estão no », por não caberem, continuam no fim); solto no
      // miolo de uma pasta, o favorito entra nela.
      reorganizavel(el, this.links, (bs) => this.reordenarFavoritos(bs.map((b) => Number(b.dataset.i))), {
        dentro: (alvo, peca) => alvo.classList.contains('nav-pasta') && !peca.classList.contains('nav-pasta'),
        aoEntrar: (peca, alvo) => this.moverPara([Number(peca.dataset.i)], Number(alvo.dataset.i)),
        depois: (soltou) => { if (this.linksDepois || !soltou) { this.linksDepois = false; this.desenharLinks(); } },
      });
      return el;
    }) : [h('span.nav-links-vazio', tr('Para pôr uma página aqui, clique na estrela do endereço.'))]));
    completarIcones();
    this.ajustarLinks();
  }

  /** A ordem nova dos favoritos, pelos índices dos botões à vista; os do » ficam no fim, na ordem deles. */
  reordenarFavoritos(ordem) {
    const lista = favoritos();
    const nova = reordenada(lista, ordem);
    if (nova.every((f, i) => f === lista[i])) return this.desenharLinks();
    salvarFavoritos(nova).catch(() => this.desenharLinks());
  }

  /** Os favoritos que não cabem na barra vão para o » (como nos navegadores). */
  ajustarLinks() {
    if (this.barraLinks.hidden) return;
    const botoes = [...this.links.querySelectorAll('.nav-link')];
    for (const b of botoes) b.hidden = false;
    this.btMaisLinks.hidden = true;
    const largura = this.barraLinks.clientWidth;
    if (!largura || this.links.scrollWidth <= this.links.clientWidth + 1) { this.escondidos = []; return; }
    this.btMaisLinks.hidden = false;
    const limite = this.links.getBoundingClientRect().right;
    this.escondidos = [];
    for (const b of botoes) {
      if (b.getBoundingClientRect().right > limite + 0.5) { b.hidden = true; this.escondidos.push(Number(b.dataset.i)); }
    }
  }

  /* ---------- A página inicial ---------- */

  desenharInicio(aba) {
    pintarFundo(aba);
    // No meio de um arrasto entre os ícones, a página só é refeita depois de soltar.
    if (aba.gradeInicio && arrastando(aba.gradeInicio)) { aba.inicioDepois = true; return; }
    const campoBusca = h('input', { type: 'text', spellcheck: false, placeholder: tr('Pesquisar na internet') });
    const pesquisar = () => { if (campoBusca.value.trim()) this.ir(busca().url + encodeURIComponent(campoBusca.value.trim()), aba); };
    campoBusca.addEventListener('keydown', (e) => { if (e.key === 'Enter') pesquisar(); });
    const lista = favoritos();
    // Uma pasta aberta na página inicial mostra os favoritos dela, com o ícone de voltar no começo.
    if (aba.pastaInicio != null && !ehPasta(lista[aba.pastaInicio])) aba.pastaInicio = null;
    const p = aba.pastaInicio;
    const itens = p != null ? itensDe(lista[p]) : lista;
    const grade = h('div.nav-favoritos');
    aba.gradeInicio = grade;
    const lugar = (k) => (p != null ? [p, k] : [k]);
    const pecas = itens.map((f, k) => {
      let el;
      if (ehPasta(f)) {
        el = h('button.nav-fav.nav-fav-pasta', { title: f.nome, on: { click: () => { aba.pastaInicio = k; this.desenharInicio(aba); } } }, img('pasta', 32), h('span', f.nome));
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); this.menuPasta(k, e); });
      } else {
        el = h('button.nav-fav', { title: f.url, on: { click: () => this.ir(f.url, aba) } },
          f.icone ? h('img', { src: f.icone, width: 32, height: 32, alt: '', className: 'nav-fav-site' }) : img(iconeDe(f.url), 32), h('span', f.nome));
        el.addEventListener('auxclick', (e) => { if (e.button === 1) { e.preventDefault(); this.novaAba(f.url, { frente: false }); } });
        el.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); this.menuFavorito(f, lugar(k), e); });
      }
      el.dataset.i = k;
      // Arrastar muda a ordem (a mesma da barra); solto no miolo de uma pasta, o favorito entra
      // nela, e solto no ícone de voltar, sai da pasta para a barra.
      reorganizavel(el, grade, (bs) => this.reordenarNoInicio(p, bs.filter((b) => b.dataset.i != null).map((b) => Number(b.dataset.i))), {
        seletor: 'button.nav-fav',
        grade: true,
        dentro: (alvo, peca) => alvo.classList.contains('nav-fav-voltar') || (alvo.classList.contains('nav-fav-pasta') && !peca.classList.contains('nav-fav-pasta')),
        aoEntrar: (peca, alvo) => this.moverPara(lugar(Number(peca.dataset.i)), alvo.classList.contains('nav-fav-voltar') ? null : Number(alvo.dataset.i)),
        depois: (soltou) => { if (aba.inicioDepois || !soltou) { aba.inicioDepois = false; this.desenharInicio(aba); } },
      });
      return el;
    });
    if (p != null) {
      const voltar = h('button.nav-fav.nav-fav-voltar', { title: tr('Voltar aos favoritos'), on: { click: () => { aba.pastaInicio = null; this.desenharInicio(aba); } } }, img('pasta-aberta', 32), h('span', tr('Voltar')));
      grade.append(voltar);
    }
    grade.append(...pecas);
    if (!itens.length) grade.append(h('div.nav-favoritos-vazio', p != null ? tr('Esta pasta está vazia. Arraste um favorito para ela, ou use o botão direito nele › Mover para.') : tr('Para guardar uma página, clique na estrela do endereço (ou Ctrl+D).')));
    const legenda = p != null ? `${tr('Favoritos')} › ${lista[p].nome}` : tr('Favoritos');
    const quadro = h('fieldset', h('legend', legenda), grade);
    quadro.addEventListener('contextmenu', (e) => { if (!e.target.closest('button')) { e.preventDefault(); this.menuDoFundoFavoritos(e); } });
    aba.inicio.replaceChildren(
      h('div.nav-inicio-caixa',
        h('div.nav-inicio-titulo', img('navegador', 32), h('div', h('b', tr('Página inicial')), h('div', tr('Os seus favoritos e a pesquisa. Para guardar uma página, clique na estrela do endereço (ou Ctrl+D).')))),
        h('fieldset', h('legend', tr('Pesquisar')), h('div.linha', campoBusca, h('button', { on: { click: pesquisar } }, tr('Pesquisar')))),
        quadro));
  }

  /** A pasta i aberta na página inicial da aba da frente (o "Abrir" do menu de uma pasta). */
  mostrarPastaNoInicio(i) {
    if (!this.aba || this.app) return;
    this.aba.pastaInicio = i;
    this.mostrarInicio(this.aba);
  }

  /** A ordem nova dos ícones da página inicial (na barra ou dentro da pasta p). */
  reordenarNoInicio(p, ordem) {
    const lista = favoritos();
    const nova = p != null ? reordenadaNaPasta(lista, p, ordem) : reordenada(lista, ordem);
    if (JSON.stringify(nova) === JSON.stringify(lista)) { for (const a of this.abas) this.desenharInicio(a); return; }
    salvarFavoritos(nova).catch(() => { for (const a of this.abas) this.desenharInicio(a); });
  }

  /* ---------- O menu do botão direito na página ---------- */

  /**
   * O vídeo em janela flutuante (o "picture-in-picture" do Chromium): uma janelinha que fica por
   * cima da área de trabalho, também com o Navegador minimizado. Vale o vídeo sob o ponteiro (no
   * botão direito) ou o que está tocando; com um já flutuando, ele volta para a página.
   */
  async videoFlutuante(x, y) {
    const aba = this.aba;
    if (!aba || !aba.wv || !this.visivel()) return;
    const ponto = x != null ? `document.elementFromPoint(${Number(x) || 0}, ${Number(y) || 0})` : 'null';
    const codigo = `(async () => {
      if (document.pictureInPictureElement) { await document.exitPictureInPicture(); return 'saiu'; }
      const el = ${ponto};
      let v = el && el.closest ? el.closest('video') : null;
      if (!v) {
        const vs = [...document.querySelectorAll('video')].filter((e) => e.readyState >= 1);
        v = vs.find((e) => !e.paused) || vs.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      }
      if (!v) return 'nenhum';
      v.disablePictureInPicture = false;
      await v.requestPictureInPicture();
      return 'ok';
    })().catch((e) => 'erro:' + e.message)`;
    const r = await aba.wv.executeJavaScript(codigo, true).catch(() => 'erro');
    if (r === 'nenhum') mensagem({ titulo: tr('Vídeo em janela flutuante'), tipo: 'info', texto: tr('Esta página não tem um vídeo para assistir em janela flutuante. Comece o vídeo e tente de novo.') });
    else if (String(r).startsWith('erro')) mensagem({ titulo: tr('Vídeo em janela flutuante'), tipo: 'aviso', texto: tr('Este site não deixou o vídeo sair da página.') });
  }

  menuDaPagina(p) {
    // As coordenadas vêm na escala da janela do aplicativo; a área de trabalho tem o próprio zoom.
    const x = p.x / zoomInterface();
    const y = p.y / zoomInterface();
    const itens = [];
    // Sobre um vídeo: assistir numa janelinha que fica por cima de tudo (também com o Navegador minimizado).
    if (p.mediaType === 'video') {
      const z = (this.aba && this.aba.zoom) || 1;
      itens.push({ rotulo: tr('Assistir em janela flu&tuante'), negrito: !p.linkURL, acao: () => this.videoFlutuante(p.x / z, p.y / z) }, { separador: true });
    }
    if (p.linkURL) {
      itens.push(
        { rotulo: tr('&Abrir o link'), negrito: true, acao: () => this.ir(p.linkURL) },
        ...(this.app ? [] : [{ rotulo: tr('Abrir o link em nova a&ba'), acao: () => this.novaAba(p.linkURL, { frente: false, depoisDe: this.aba }) }]),
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
        { rotulo: tr('&Pesquisar "{texto}"', { texto: p.selectionText.trim().slice(0, 24) }), acao: () => (this.app ? this.ir(busca().url + encodeURIComponent(p.selectionText.trim())) : this.novaAba(busca().url + encodeURIComponent(p.selectionText.trim()), { depoisDe: this.aba })) },
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

/* ---------- A barra de favoritos ligada ou não (Exibir › Barra de favoritos, Ctrl+Shift+B) ---------- */

const barraLinksLigada = () => cfg().barraFavoritos !== false;
const barraStatusLigada = () => cfg().barraStatus === true;
async function alternarBarraStatus() {
  await definirConfig({ navegador: { barraStatus: !barraStatusLigada() } });
  for (const n of abertos) if (!n.j.fechada) n.mostrarBarraStatus();
}
async function alternarBarraLinks() {
  await definirConfig({ navegador: { barraFavoritos: !barraLinksLigada() } });
  for (const n of abertos) if (!n.j.fechada) n.mostrarBarraLinks();
}

/** As teclas do Navegador com o foco fora da página (as de dentro dela: navegador-preload.js). */
function atalhoDoNavegador(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (ctrl && e.key === 'Tab') return e.shiftKey ? 'abaAnterior' : 'proximaAba';
  if (ctrl && e.shiftKey && k === 't') return 'reabrirAba';
  if (ctrl && e.shiftKey && k === 'b') return 'barraFavoritos';
  if (ctrl && e.shiftKey && k === 'p') return 'videoFlutuante';
  if (ctrl && /^[1-9]$/.test(e.key)) return 'aba:' + e.key;
  if (ctrl && k === 't') return 'novaAba';
  if (ctrl && k === 'w') return 'fechar';
  if (ctrl && k === 'n') return 'nova';
  if (ctrl && k === 'd') return 'favorito';
  if (ctrl && k === 'l') return 'endereco';
  if (e.key === 'F5' || (ctrl && k === 'r')) return 'atualizar';
  if (e.altKey && e.key === 'ArrowLeft') return 'voltar';
  if (e.altKey && e.key === 'ArrowRight') return 'avancar';
  if (e.altKey && e.key === 'Home') return 'inicio';
  return null;
}

export function abrirNavegador(args = {}) {
  return new Navegador(args);
}

/** Abre um endereço numa aba nova da janela do Navegador usada por último (ou numa janela nova). */
export function abrirEndereco(url) {
  const ultimo = [...abertos].filter((n) => !n.correio && !n.app && !n.j.fechada).pop();
  if (ultimo) {
    ultimo.j.focar();
    ultimo.novaAba(url);
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

// Os links com target e o window.open sem medidas (o Ctrl+clique e o botão do meio também): numa
// aba nova da janela da página (por trás, no botão do meio), como nos navegadores de hoje.
retro.navegador.aoJanela((url, id, disposicao) => {
  for (const n of abertos) {
    const aba = id != null && !n.j.fechada && n.abaDaPagina(id);
    if (!aba) continue;
    if (n.app) break;
    n.novaAba(url, { frente: disposicao !== 'background-tab', depoisDe: aba });
    return;
  }
  abrirNavegador({ url });
});
// O site cuja versão segura manda de volta para o http (Só conexões seguras): o aviso, na aba da página.
retro.navegador.aoSemSeguranca(({ id, url }) => {
  for (const n of abertos) {
    const aba = n.abaDaPagina(id);
    if (aba) n.mostrarSemSeguranca(url, aba);
  }
});

// O Google recusou o login dos dois jeitos (login-google.js): o caminho é o Firefox de verdade.
let avisandoLogin = false;
retro.navegador.aoLoginRecusado(async () => {
  if (avisandoLogin) return;
  avisandoLogin = true;
  const v = await mensagem({
    titulo: tr('Login do Google'),
    tipo: 'aviso',
    texto: tr('O Google recusou o login neste Navegador. Para entrar na sua conta do Google, use o Firefox como navegador padrão: com ele instalado no computador, o ícone do Navegador abre o Firefox, com o visual do Retro Computer.'),
    botoes: [{ texto: tr('Abrir as opções da Internet'), valor: 'painel', padrao: true }, { texto: tr('Fechar'), valor: null }],
  }).finally(() => { avisandoLogin = false; });
  if (v === 'painel') abrir('painel', { secao: 'internet' });
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

/** Traz para a frente a janela e a aba do Navegador que mostram o site (a pergunta é sobre elas). */
function focarSite(origem) {
  for (const n of [...abertos].reverse()) {
    if (n.j.fechada) continue;
    const aba = n.aba && origemDe(n.aba.url) === origem ? n.aba : n.abas.find((a) => origemDe(a.url) === origem);
    if (!aba) continue;
    n.j.focar();
    n.escolherAba(aba);
    return;
  }
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
