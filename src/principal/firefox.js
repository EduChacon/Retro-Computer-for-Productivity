'use strict';
/*
 * O Firefox como navegador do Retro Computer: o do computador (sem modificação), aberto com
 * um perfil próprio (o do usuário no Firefox de sempre fica como está) e com o visual da época
 * (o userChrome.css daqui: o cinza, as bordas em relevo, a fonte Katica e as abas retas). Ele
 * é o padrão quando instalado porque traz o que o Navegador interno não tem: o Widevine, para
 * os vídeos com proteção (Netflix, Prime Video, Disney+, o Spotify na web).
 *
 * As escolhas do Painel de controle vão junto, pelo user.js do perfil (regravado a cada
 * abertura): os downloads em Meus documentos › Recebidos, só conexões seguras e apagar os
 * dados ao fechar. No Linux, a janela leva a classe RetroNavegador, e a barra de tarefas a
 * mostra com o ícone do Navegador.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');

const CLASSE = 'RetroNavegador';
const FLATPAK = 'org.mozilla.firefox';

/** Os lugares de costume do Firefox em cada sistema (o PATH vem antes, no Linux). */
function candidatos(plataforma, env = process.env) {
  if (plataforma === 'win32') {
    const pf = [env.ProgramFiles, env['ProgramFiles(x86)'], env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Programs')].filter(Boolean);
    return pf.map((p) => path.win32.join(p, 'Mozilla Firefox', 'firefox.exe'));
  }
  if (plataforma === 'darwin') return ['/Applications/Firefox.app/Contents/MacOS/firefox', path.join(os.homedir(), 'Applications/Firefox.app/Contents/MacOS/firefox')];
  return ['/usr/bin/firefox', '/usr/lib/firefox/firefox', '/usr/local/bin/firefox', '/opt/firefox/firefox', '/snap/bin/firefox', path.join(os.homedir(), '.local/bin/firefox')];
}

/** Como o Firefox foi instalado: o pacote comum, o snap ou o flatpak (cada um guarda o perfil num lugar). */
function tipoDe(caminho) {
  if (caminho === 'flatpak') return 'flatpak';
  if (/(^|\/)snap\//.test(caminho)) return 'snap';
  return 'comum';
}

/**
 * A pasta do perfil. O snap e o flatpak só enxergam pastas deles (ou as de fora da pasta
 * pessoal oculta): o perfil vai para a pasta que cada um pode usar.
 */
function pastaPerfil(tipo, dados, casa = os.homedir()) {
  // O snap e o flatpak só existem no Linux: os caminhos são sempre com "/".
  if (tipo === 'snap') return path.posix.join(casa, 'snap', 'firefox', 'common', 'retro-computer');
  if (tipo === 'flatpak') return path.posix.join(casa, '.var', 'app', FLATPAK, 'retro-computer');
  return path.join(dados, 'firefox');
}

/** Uma preferência do user.js (os textos com as aspas e as barras escapadas). */
const pref = (k, v) => `user_pref(${JSON.stringify(k)}, ${typeof v === 'string' ? JSON.stringify(v) : String(v)});`;

const IDIOMAS = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' };

/** A escala do layout.css.devPixelsPerPx: "1.0", "1.25", "1.5", "2.0" (entre 0,5 e 8; sem número, a do sistema). */
function textoEscala(escala) {
  const e = Number(escala);
  if (!Number.isFinite(e) || e <= 0) return '-1.0';
  return Math.min(8, Math.max(0.5, e)).toFixed(2).replace(/0$/, '');
}

/**
 * O user.js do perfil: o visual (o userChrome.css ligado, a barra de título do sistema, os
 * botões compactos), sem as boas-vindas e a telemetria, e as escolhas do Retro Computer.
 */
function userJs({ downloads, soHttps = true, limparAoFechar = false, idioma = 'pt-BR', inicio = '', escala = 1, favoritosAVista = false }) {
  const p = [
    '// Gerado pelo Retro Computer a cada abertura do Firefox: as mudanças aqui se perdem.',
    '// As preferências escolhidas no próprio Firefox ficam no prefs.js e continuam valendo.',
    pref('toolkit.legacyUserProfileCustomizations.stylesheets', true),
    pref('browser.tabs.inTitlebar', 0),
    pref('browser.uidensity', 1),
    pref('browser.compactmode.show', true),
    pref('browser.theme.toolbar-theme', 1),
    pref('browser.theme.content-theme', 1),
    pref('browser.aboutwelcome.enabled', false),
    pref('browser.startup.homepage_override.mstone', 'ignore'),
    pref('startup.homepage_welcome_url', ''),
    pref('startup.homepage_welcome_url.additional', ''),
    pref('browser.shell.checkDefaultBrowser', false),
    pref('browser.rights.3.shown', true),
    pref('browser.startup.couldRestoreSession.count', 2),
    pref('datareporting.policy.dataSubmissionPolicyBypassNotification', true),
    pref('datareporting.healthreport.uploadEnabled', false),
    pref('datareporting.policy.dataSubmissionEnabled', false),
    pref('toolkit.telemetry.enabled', false),
    pref('app.shield.optoutstudies.enabled', false),
    pref('browser.newtabpage.activity-stream.showSponsored', false),
    pref('browser.newtabpage.activity-stream.showSponsoredTopSites', false),
    pref('browser.newtabpage.activity-stream.feeds.section.topstories', false),
    pref('extensions.pocket.enabled', false),
    // Os vídeos com proteção (o motivo do Firefox): o Widevine liga e é baixado sozinho.
    pref('media.eme.enabled', true),
    pref('media.gmp-widevinecdm.enabled', true),
    pref('media.gmp-widevinecdm.visible', true),
    // Os downloads no disco C:, sem perguntar.
    pref('browser.download.folderList', 2),
    pref('browser.download.useDownloadDir', true),
    pref('browser.download.always_ask_before_handling_new_types', false),
    pref('intl.locale.requested', IDIOMAS[idioma] || 'pt-BR'),
    pref('dom.security.https_only_mode', !!soHttps),
    pref('privacy.sanitize.sanitizeOnShutdown', !!limparAoFechar),
    pref('privacy.clearOnShutdown_v2.cookiesAndStorage', !!limparAoFechar),
    pref('privacy.clearOnShutdown_v2.cache', !!limparAoFechar),
    pref('privacy.clearOnShutdown.cookies', !!limparAoFechar),
    pref('privacy.clearOnShutdown.cache', !!limparAoFechar),
    pref('privacy.clearOnShutdown.offlineApps', !!limparAoFechar),
    // O tamanho dos pixels do Retro Computer (Painel › Aparência), exato: um ponto do Firefox é um da área de trabalho.
    pref('layout.css.devPixelsPerPx', textoEscala(escala)), // 1.0, 1.25, 1.5, 2.0
  ];
  if (downloads) p.push(pref('browser.download.dir', downloads));
  // A barra de favoritos à vista, como a do Navegador (só até o usuário escolher outra coisa no Firefox).
  if (favoritosAVista) p.push(pref('browser.toolbars.bookmarks.visibility', 'always'));
  if (inicio) p.push(pref('browser.startup.homepage', inicio), pref('browser.startup.page', 1));
  return p.join('\n') + '\n';
}

/*
 * O visual do Navegador do Retro Computer, por cima do tema claro do Firefox: a barra de menus, as abas
 * como as fichas das caixas de propriedades, os botões de 16 pontos com os mesmos ícones (copiados para
 * o perfil), o campo de endereço afundado, a barra de favoritos e a página numa moldura afundada, nas
 * mesmas medidas, com a fonte Katica. Só a moldura muda; as páginas não. O tamanho é o dos pixels do
 * Retro Computer (o layout.css.devPixelsPerPx do user.js): um ponto daqui é um ponto de lá.
 */
// Os ícones de 16 pontos da área de trabalho que o visual usa (copiados para a pasta chrome do perfil).
const ICONES = ['voltar', 'avancar', 'atualizar', 'parar', 'inicio', 'favoritos', 'pasta', 'pasta-recebidos', 'configuracoes', 'programas-caixa'];

// O "×" de fechar a aba e o "+" da aba nova, os mesmos desenhos ponto a ponto do Navegador.
const SVG_FECHAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='7' shape-rendering='crispEdges'%3E%3Cpath d='M0 0h2v1h1v1h2V1h1V0h2v1H7v1H6v1H5v1h1v1h1v1h1v1H6V6H5V5H3v1H2v1H0V6h1V5h1V4h1V3H2V2H1V1H0z'/%3E%3C/svg%3E";
const SVG_MAIS = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' shape-rendering='crispEdges'%3E%3Cpath d='M7 5h2v2h2v2H9v2H7V9H5V7h2z'/%3E%3C/svg%3E";

const USER_CHROME = `/* Gerado pelo Retro Computer a cada abertura do Firefox: as mudanças aqui se perdem. */
@font-face { font-family: "Katica"; src: url("katica.woff2") format("woff2"); font-weight: normal; }
@font-face { font-family: "Katica"; src: url("katica-negrito.woff2") format("woff2"); font-weight: bold; }

:root {
  --retro-face: #c0c0c0; --retro-luz: #ffffff; --retro-luz2: #dfdfdf; --retro-sombra: #808080; --retro-escuro: #0a0a0a;
  --retro-relevo: inset -1px -1px var(--retro-escuro), inset 1px 1px var(--retro-luz), inset -2px -2px var(--retro-sombra), inset 2px 2px var(--retro-luz2);
  --retro-campo: inset -1px -1px var(--retro-luz), inset 1px 1px var(--retro-sombra), inset -2px -2px var(--retro-luz2), inset 2px 2px var(--retro-escuro);
  --retro-raso: inset -1px -1px var(--retro-luz), inset 1px 1px var(--retro-sombra);
  --retro-raso-alto: inset -1px -1px var(--retro-sombra), inset 1px 1px var(--retro-luz);
  --toolbar-bgcolor: var(--retro-face) !important;
  --toolbar-color: #000 !important;
  --toolbar-field-background-color: #fff !important;
  --toolbar-field-focus-background-color: #fff !important;
  --toolbar-field-color: #000 !important;
  --toolbar-field-focus-color: #000 !important;
  --toolbar-field-border-color: transparent !important;
  --toolbar-field-focus-border-color: transparent !important;
  --lwt-accent-color: var(--retro-face) !important;
  --lwt-text-color: #000 !important;
  --tab-selected-bgcolor: var(--retro-face) !important;
  --tab-border-radius: 3px !important;
  --tab-min-height: 21px !important;
  --tab-block-margin: 0px !important;
  --tab-inline-padding: 6px !important;
  --toolbarbutton-border-radius: 0px !important;
  --toolbarbutton-inner-padding: 3px !important;
  --toolbarbutton-outer-padding: 1px !important;
  --toolbar-start-end-padding: 4px !important;
  --urlbar-min-height: 22px !important;
  --urlbar-container-height: 28px !important;
  --urlbar-icon-border-radius: 0px !important;
  --urlbar-icon-padding: 3px !important;
  --arrowpanel-border-radius: 0px !important;
  --arrowpanel-background: var(--retro-face) !important;
  --arrowpanel-color: #000 !important;
  --arrowpanel-border-color: var(--retro-escuro) !important;
  --panel-border-radius: 0px !important;
  --panel-background: var(--retro-face) !important;
  --panel-color: #000 !important;
  --button-border-radius: 0px !important;
  --urlbar-border-radius: 0px !important;
  --urlbar-background-border-radius: 0px !important;
  --urlbarview-border-radius: 0px !important;
  --bookmark-block-padding: 3px !important;
  --focus-outline-color: #000 !important;
}
/* A fonte da época em toda a moldura (os menus, as abas, o endereço), no tamanho da área de trabalho. */
* { font-family: "Katica", sans-serif !important; font-size: 10px !important; }
image, .toolbarbutton-icon, .tab-icon-image, .bookmark-item > .toolbarbutton-icon { image-rendering: pixelated !important; }

#navigator-toolbox { background: var(--retro-face) !important; border-bottom: none !important; }
#TabsToolbar, #nav-bar, #PersonalToolbar, #titlebar { background: var(--retro-face) !important; color: #000 !important; }

/* A barra de menus (Arquivo, Editar, Exibir…), sempre à vista como a do Navegador. */
#toolbar-menubar { min-height: 20px !important; padding: 0 !important; }
#main-menubar > menu { padding: 1px 6px 2px !important; margin: 0 !important; border-radius: 0 !important; color: #000 !important; }
#main-menubar > menu[_moz-menuactive], #main-menubar > menu[open] { background: #000080 !important; color: #fff !important; }

/* As abas como as fichas: a escolhida mais alta e ligada à barra de baixo, com o "×" e o "+" da época. */
#TabsToolbar { padding-inline: 6px 4px !important; }
#TabsToolbar-customization-target { min-height: 24px !important; align-items: flex-end !important; }
#tabbrowser-tabs { border-inline-start: none !important; min-height: 24px !important; --tab-min-height: 21px !important; }
.tabbrowser-tab { padding: 0 !important; margin-inline-end: -1px !important; }
.tabbrowser-tab:not([pinned]) { max-width: 190px !important; min-width: 52px !important; }
.tabbrowser-tab .tab-stack { min-height: 21px !important; }
.tab-background {
  border-radius: 3px 3px 0 0 !important; margin-block: 3px 0 !important; outline: none !important;
  background: var(--retro-face) !important; background-image: none !important;
  box-shadow: inset 1px 1px var(--retro-luz), inset -1px 0 var(--retro-escuro), inset -2px 0 var(--retro-sombra) !important;
}
.tabbrowser-tab[selected] .tab-background, .tabbrowser-tab[multiselected] .tab-background { margin-block: 0 0 !important; }
.tab-content { padding-inline: 6px 2px !important; gap: 4px !important; }
.tabbrowser-tab[selected] .tab-content { padding-inline: 8px 4px !important; padding-top: 3px !important; }
.tab-icon-image, .tab-throbber, .tab-icon-pending { width: 16px !important; height: 16px !important; margin-inline-end: 0 !important; }
.tab-label { color: #000 !important; }
.tab-label-container { height: auto !important; }
.tab-close-button {
  width: 16px !important; height: 14px !important; padding: 0 !important; margin: 0 !important; border-radius: 0 !important;
  list-style-image: none !important; background: transparent url("${SVG_FECHAR}") no-repeat 4px 3px !important; opacity: 1 !important;
}
.tab-close-button > .toolbarbutton-icon { display: none !important; }
.tab-close-button:hover { box-shadow: var(--retro-raso-alto) !important; background-color: var(--retro-face) !important; }
.tab-close-button:hover:active { box-shadow: var(--retro-raso) !important; background-position: 5px 4px !important; }
#tabs-newtab-button, #new-tab-button { list-style-image: url("${SVG_MAIS}") !important; }
#tabs-newtab-button > .toolbarbutton-icon { width: 22px !important; height: 19px !important; padding: 2px 3px 1px !important; margin-bottom: 1px !important; }

/* A barra dos botões: os ícones do Navegador, chatos, em relevo ao passar o mouse e afundados ao apertar. */
#nav-bar { box-shadow: inset 1px 1px var(--retro-luz), inset -1px 0 var(--retro-sombra) !important; border-top: none !important; padding: 2px 4px 1px !important; margin: 0 2px !important; }
#back-button { list-style-image: url("voltar.png") !important; }
#forward-button { list-style-image: url("avancar.png") !important; }
#reload-button { list-style-image: url("atualizar.png") !important; }
#stop-button { list-style-image: url("parar.png") !important; }
#home-button { list-style-image: url("inicio.png") !important; }
#downloads-button { list-style-image: url("pasta-recebidos.png") !important; }
#downloads-button .toolbarbutton-badge-stack image { list-style-image: url("pasta-recebidos.png") !important; }
#unified-extensions-button { list-style-image: url("programas-caixa.png") !important; }
#PanelUI-menu-button { list-style-image: url("configuracoes.png") !important; }
#reload-button > .toolbarbutton-icon, #stop-button > .toolbarbutton-icon { fill: currentColor !important; }
toolbar .toolbarbutton-1 { --toolbarbutton-hover-background: transparent !important; --toolbarbutton-active-background: transparent !important; }
toolbarbutton .toolbarbutton-icon, toolbarbutton .toolbarbutton-badge-stack, toolbarbutton .toolbarbutton-text { border-radius: 0 !important; }
toolbar .toolbarbutton-1 > .toolbarbutton-icon, toolbar .toolbarbutton-1 > .toolbarbutton-badge-stack { width: 24px !important; height: 22px !important; padding: 3px 4px !important; }
toolbar .toolbarbutton-1:not([disabled]):hover > .toolbarbutton-icon,
toolbar .toolbarbutton-1:not([disabled]):hover > .toolbarbutton-badge-stack { background: transparent !important; box-shadow: var(--retro-raso-alto) !important; }
toolbar .toolbarbutton-1:not([disabled]):is([open], [checked], :hover:active) > .toolbarbutton-icon,
toolbar .toolbarbutton-1:not([disabled]):is([open], [checked], :hover:active) > .toolbarbutton-badge-stack { background: transparent !important; box-shadow: var(--retro-raso) !important; padding: 4px 3px 2px 5px !important; }
toolbar .toolbarbutton-1[disabled] > .toolbarbutton-icon { opacity: .4 !important; filter: grayscale(1) !important; }
/* O que não é do Navegador da época (a barra lateral, a conta da Mozilla, o Firefox View, a lista de abas, a IA) fica escondido. */
#sidebar-button, #fxa-toolbar-menu-button, #firefox-view-button, #alltabs-button, #ai-action-button { display: none !important; }
/* O campo de endereço logo depois dos botões, como no Navegador (sem os espaços elásticos dos lados). */
#nav-bar toolbarspring { display: none !important; }

/* O campo de endereço afundado, branco, com a estrela dos favoritos cinza até a página entrar neles. */
#urlbar-container { padding-block: 0 !important; margin-inline: 4px 2px !important; }
#urlbar { min-height: 22px !important; }
.urlbar-background, #urlbar-background, #searchbar { border-radius: 0 !important; background: #fff !important; border: none !important; box-shadow: var(--retro-campo) !important; outline: none !important; }
#urlbar[focused] .urlbar-background, #urlbar[open] .urlbar-background { box-shadow: var(--retro-campo) !important; outline: none !important; }
#urlbar-input, .urlbar-input { color: #000 !important; }
.urlbar-input-container { padding: 2px !important; min-height: 22px !important; }
#urlbar .urlbarView { background: #fff !important; }
.urlbarView-row[selected] { background: #000080 !important; color: #fff !important; border-radius: 0 !important; }
#star-button { list-style-image: url("favoritos.png") !important; fill: currentColor !important; }
#star-button:not([starred]) { filter: grayscale(1) !important; opacity: .55 !important; }
#identity-box, #tracking-protection-icon-container, .urlbar-page-action, #star-button-box { border-radius: 0 !important; }
#urlbar-zoom-button { border-radius: 0 !important; background: var(--retro-face) !important; box-shadow: var(--retro-raso-alto) !important; color: #000 !important; }

/* A barra de favoritos: o ícone e o nome, como os atalhos do Navegador, e a pasta da área de trabalho. */
#PersonalToolbar { min-height: 26px !important; padding: 1px 4px 3px !important; margin: 0 2px !important; box-shadow: inset 1px 0 var(--retro-luz), inset -1px 0 var(--retro-sombra) !important; }
#PersonalToolbar .toolbarbutton-1, #PlacesToolbarItems > .bookmark-item { height: 22px !important; padding: 0 6px 0 4px !important; margin: 0 1px 0 0 !important; border-radius: 0 !important; color: #000 !important; }
#PlacesToolbarItems > .bookmark-item > .toolbarbutton-icon { width: 16px !important; height: 16px !important; margin-inline-end: 5px !important; padding: 0 !important; }
#PlacesToolbarItems > .bookmark-item:hover { background: transparent !important; box-shadow: var(--retro-raso-alto) !important; }
#PlacesToolbarItems > .bookmark-item:hover:active, #PlacesToolbarItems > .bookmark-item[open] { background: transparent !important; box-shadow: var(--retro-raso) !important; }
.bookmark-item[container] { list-style-image: url("pasta.png") !important; }

/* A página numa moldura afundada, como a área do Navegador. */
#tabbrowser-tabbox { background: var(--retro-face) !important; padding: 2px !important; margin: 0 2px 2px !important; box-shadow: var(--retro-campo) !important; }
#tabbrowser-tabpanels { background: #fff !important; }
/* Na tela cheia (a do vídeo e a do F11), a página vai até a borda da tela, sem a moldura. */
:root[inFullscreen] #tabbrowser-tabbox, :root[inDOMFullscreen] #tabbrowser-tabbox { padding: 0 !important; margin: 0 !important; box-shadow: none !important; }
:root[inDOMFullscreen] #tabbrowser-tabpanels { background: #000 !important; }

/* Os menus e os painéis: cinza, com a borda em relevo e a escolha em azul-marinho. */
menupopup, panel { --panel-padding: 2px !important; }
menupopup::part(content), panel::part(content) { border-radius: 0 !important; box-shadow: var(--retro-relevo) !important; background: var(--retro-face) !important; color: #000 !important; border: none !important; }
menupopup menuitem, menupopup menu { border-radius: 0 !important; min-height: 17px !important; padding-block: 1px !important; }
menupopup menuitem[_moz-menuactive], menupopup menu[_moz-menuactive] { background-color: #000080 !important; color: #fff !important; }
.subviewbutton:hover, .subviewbutton[open] { background-color: #000080 !important; color: #fff !important; border-radius: 0 !important; }
menubar, #toolbar-menubar { background: var(--retro-face) !important; color: #000 !important; }
`;

/**
 * A barra de menus à vista (o xulstore.json do perfil, que o próprio Firefox grava): só quando ainda não
 * há uma escolha, para quem a esconder pelo Firefox (Exibir › Barras de ferramentas) não a ver voltar.
 */
async function mostrarMenus(perfil) {
  const arq = path.join(perfil, 'xulstore.json');
  let dados = {};
  try { dados = JSON.parse(await fsp.readFile(arq, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') return; }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return;
  const janela = (dados['chrome://browser/content/browser.xhtml'] = dados['chrome://browser/content/browser.xhtml'] || {});
  const menus = (janela['toolbar-menubar'] = janela['toolbar-menubar'] || {});
  if ('autohide' in menus) return;
  menus.autohide = 'false';
  await fsp.writeFile(arq, JSON.stringify(dados), 'utf8');
}

class Firefox {
  constructor({ plataforma = process.platform, dados, fontes, icones }) {
    this.plataforma = plataforma;
    this.dados = dados;     // a pasta das configurações do Retro Computer
    this.fontes = fontes;   // a pasta das fontes da área de trabalho (Katica)
    this.icones = icones;   // a pasta dos ícones da área de trabalho (os de 16 pontos ficam em 16/)
    this.achado = undefined;
  }

  /** O caminho do Firefox (ou 'flatpak'), ou null. Guardado depois da primeira busca. */
  async achar(refazer = false) {
    if (this.achado !== undefined && !refazer) return this.achado;
    // RETRO_FIREFOX: um Firefox de outro lugar (os testes e as capturas usam o baixado do site).
    let r = process.env.RETRO_FIREFOX || null;
    if (!r && this.plataforma === 'linux') r = await new Promise((ok) => execFile('sh', ['-c', 'command -v firefox'], { timeout: 4000 }, (e, s) => ok(!e && String(s).trim() ? String(s).trim().split('\n')[0] : null)));
    if (!r) r = candidatos(this.plataforma).find((c) => { try { return fs.statSync(c).isFile(); } catch { return false; } }) || null;
    if (!r && this.plataforma === 'linux') {
      r = await new Promise((ok) => execFile('flatpak', ['info', FLATPAK], { timeout: 6000 }, (e) => ok(e ? null : 'flatpak')));
    }
    this.achado = r;
    return r;
  }

  async estado() {
    const c = await this.achar(true);
    return { instalado: !!c, tipo: c ? tipoDe(c) : null };
  }

  /** O perfil pronto: a pasta, o user.js, o userChrome.css e as fontes. */
  async preparar(caminho, opcoes) {
    const perfil = pastaPerfil(tipoDe(caminho), this.dados);
    const chrome = path.join(perfil, 'chrome');
    await fsp.mkdir(chrome, { recursive: true });
    // A barra de favoritos começa à vista; quem a escondeu no Firefox (o prefs.js já tem a escolha) fica como está.
    const prefs = await fsp.readFile(path.join(perfil, 'prefs.js'), 'utf8').catch(() => '');
    const favoritosAVista = !prefs.includes('"browser.toolbars.bookmarks.visibility"');
    await fsp.writeFile(path.join(perfil, 'user.js'), userJs({ ...opcoes, favoritosAVista }), 'utf8');
    await fsp.writeFile(path.join(chrome, 'userChrome.css'), USER_CHROME, 'utf8');
    await mostrarMenus(perfil);
    for (const f of ['katica.woff2', 'katica-negrito.woff2']) {
      try { await fsp.writeFile(path.join(chrome, f), await fsp.readFile(path.join(this.fontes, f))); } catch { }
    }
    for (const nome of ICONES) {
      try { await fsp.writeFile(path.join(chrome, nome + '.png'), await fsp.readFile(path.join(this.icones, '16', nome + '.png'))); } catch { }
    }
    return perfil;
  }

  /** Os argumentos de cada jeito de abrir (o flatpak também precisa ver a pasta dos downloads). */
  comando(caminho, perfil, url) {
    const args = ['--profile', perfil];
    if (this.plataforma === 'linux') args.push('--class', CLASSE, '--name', CLASSE);
    if (url) args.push(url);
    if (caminho === 'flatpak') return { arquivo: 'flatpak', args: ['run', FLATPAK, ...args] };
    return { arquivo: caminho, args };
  }

  /** Abre o endereço (ou a página inicial) no Firefox do Retro Computer. */
  async abrir(url, opcoes) {
    const caminho = await this.achar();
    if (!caminho) return { ok: false, erro: 'semFirefox' };
    const perfil = await this.preparar(caminho, opcoes);
    if (caminho === 'flatpak' && opcoes.downloads) {
      // O flatpak só grava fora da pasta dele com a permissão (dada só para a pasta dos downloads).
      await new Promise((ok) => execFile('flatpak', ['override', '--user', `--filesystem=${opcoes.downloads}`, FLATPAK], { timeout: 8000 }, () => ok()));
    }
    const { arquivo, args } = this.comando(caminho, perfil, url);
    const p = spawn(arquivo, args, { detached: true, stdio: 'ignore', env: { ...process.env, MOZ_CRASHREPORTER_DISABLE: '1' } });
    p.on('error', () => { });
    p.unref();
    return { ok: true };
  }
}

module.exports = { Firefox, userJs, USER_CHROME, ICONES, textoEscala, mostrarMenus, pastaPerfil, tipoDe, candidatos, CLASSE, FLATPAK };
