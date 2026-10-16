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

/**
 * O user.js do perfil: o visual (o userChrome.css ligado, a barra de título do sistema, os
 * botões compactos), sem as boas-vindas e a telemetria, e as escolhas do Retro Computer.
 */
function userJs({ downloads, soHttps = true, limparAoFechar = false, idioma = 'pt-BR', inicio = '', escala = 1 }) {
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
    // O tamanho dos pixels do Retro Computer (Painel › Aparência), para o Firefox não ficar miúdo.
    pref('layout.css.devPixelsPerPx', escala > 1 ? Number(escala).toFixed(2).replace(/0$/, '') : '-1.0'), // 2.0, 1.5, 1.25
  ];
  if (downloads) p.push(pref('browser.download.dir', downloads));
  if (inicio) p.push(pref('browser.startup.homepage', inicio), pref('browser.startup.page', 1));
  return p.join('\n') + '\n';
}

/*
 * O visual da época, por cima do tema claro do Firefox: tudo cinza, as bordas em relevo, o
 * campo de endereço afundado, as abas retas como as fichas das caixas de propriedades e a
 * fonte Katica (copiada para o perfil, que o Firefox lê). Só a moldura muda; as páginas não.
 */
const USER_CHROME = `/* Gerado pelo Retro Computer a cada abertura do Firefox: as mudanças aqui se perdem. */
@font-face { font-family: "Katica"; src: url("katica.woff2") format("woff2"); font-weight: normal; }
@font-face { font-family: "Katica"; src: url("katica-negrito.woff2") format("woff2"); font-weight: bold; }

:root {
  --retro-face: #c0c0c0; --retro-luz: #ffffff; --retro-luz2: #dfdfdf; --retro-sombra: #808080; --retro-escuro: #0a0a0a;
  --retro-relevo: inset -1px -1px var(--retro-escuro), inset 1px 1px var(--retro-luz), inset -2px -2px var(--retro-sombra), inset 2px 2px var(--retro-luz2);
  --retro-raso: inset -1px -1px var(--retro-sombra), inset 1px 1px var(--retro-luz);
  --retro-afundado: inset -1px -1px var(--retro-luz), inset 1px 1px var(--retro-sombra), inset -2px -2px var(--retro-luz2), inset 2px 2px var(--retro-escuro);
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
  --tab-border-radius: 0px !important;
  --toolbarbutton-border-radius: 0px !important;
  --urlbar-icon-border-radius: 0px !important;
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
  --toolbarbutton-outer-padding: 1px !important;
  --focus-outline-color: #000 !important;
}
/* A fonte da época em toda a moldura (os menus, as abas, o endereço), no tamanho dela. */
* { font-family: "Katica", sans-serif !important; font-size: 10px !important; }

#navigator-toolbox { background: var(--retro-face) !important; border-bottom: 1px solid var(--retro-sombra) !important; }
#TabsToolbar, #nav-bar, #PersonalToolbar { background: var(--retro-face) !important; color: #000 !important; }
#nav-bar { box-shadow: var(--retro-raso) !important; border-top: none !important; }

/* As abas como as fichas das caixas de propriedades: a escolhida mais alta, ligada à barra. */
.tabbrowser-tab { padding-inline: 0 !important; }
.tab-background {
  border-radius: 0 !important; margin-block: 3px 0 !important; outline: none !important;
  background: var(--retro-face) !important;
  box-shadow: inset 1px 1px var(--retro-luz), inset -1px 0 var(--retro-escuro), inset -2px 0 var(--retro-sombra) !important;
}
.tabbrowser-tab[selected] .tab-background, .tabbrowser-tab[multiselected] .tab-background { margin-top: 1px !important; }
.tab-label { color: #000 !important; }
.tabbrowser-tab[selected] .tab-label { font-weight: bold !important; }
#tabbrowser-tabs { border-inline-start: none !important; }

/* Os botões: chatos, em relevo ao passar o mouse e afundados ao apertar (os da época). */
toolbarbutton .toolbarbutton-icon, toolbarbutton .toolbarbutton-badge-stack, toolbarbutton .toolbarbutton-text { border-radius: 0 !important; }
toolbar .toolbarbutton-1:not([disabled]):hover > .toolbarbutton-icon,
toolbar .toolbarbutton-1:not([disabled]):hover > .toolbarbutton-badge-stack { background: transparent !important; box-shadow: var(--retro-raso) !important; }
toolbar .toolbarbutton-1:not([disabled]):is([open], [checked], :hover:active) > .toolbarbutton-icon,
toolbar .toolbarbutton-1:not([disabled]):is([open], [checked], :hover:active) > .toolbarbutton-badge-stack { background: transparent !important; box-shadow: inset 1px 1px var(--retro-sombra), inset -1px -1px var(--retro-luz) !important; }

/* O campo de endereço afundado, branco, com a fonte da época. */
.urlbar-background, #urlbar-background, #searchbar { border-radius: 0 !important; background: #fff !important; border: none !important; box-shadow: var(--retro-afundado) !important; outline: none !important; }
#urlbar[focused] .urlbar-background, #urlbar[open] .urlbar-background { box-shadow: var(--retro-afundado) !important; outline: none !important; }
#urlbar-input, .urlbar-input { color: #000 !important; }
#urlbar .urlbarView { background: #fff !important; }
.urlbarView-row[selected] { background: #000080 !important; color: #fff !important; border-radius: 0 !important; }

/* Os menus e os painéis: cinza, com a borda em relevo e a escolha em azul-marinho. */
menupopup, panel { --panel-padding: 2px !important; }
menupopup::part(content), panel::part(content) { border-radius: 0 !important; box-shadow: var(--retro-relevo) !important; background: var(--retro-face) !important; color: #000 !important; border: none !important; }
menupopup menuitem, menupopup menu { border-radius: 0 !important; }
menupopup menuitem[_moz-menuactive], menupopup menu[_moz-menuactive] { background-color: #000080 !important; color: #fff !important; }
.subviewbutton:hover, .subviewbutton[open] { background-color: #000080 !important; color: #fff !important; border-radius: 0 !important; }
menubar, #toolbar-menubar { background: var(--retro-face) !important; color: #000 !important; }

/* O que não é da época (a conta da Mozilla, o Firefox View, a lista de abas) fica escondido. */
#fxa-toolbar-menu-button, #firefox-view-button, #alltabs-button { display: none !important; }
`;

class Firefox {
  constructor({ plataforma = process.platform, dados, fontes }) {
    this.plataforma = plataforma;
    this.dados = dados;     // a pasta das configurações do Retro Computer
    this.fontes = fontes;   // a pasta das fontes da área de trabalho (Katica)
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
    await fsp.writeFile(path.join(perfil, 'user.js'), userJs(opcoes), 'utf8');
    await fsp.writeFile(path.join(chrome, 'userChrome.css'), USER_CHROME, 'utf8');
    for (const f of ['katica.woff2', 'katica-negrito.woff2']) {
      try { await fsp.writeFile(path.join(chrome, f), await fsp.readFile(path.join(this.fontes, f))); } catch { }
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

module.exports = { Firefox, userJs, USER_CHROME, pastaPerfil, tipoDe, candidatos, CLASSE, FLATPAK };
