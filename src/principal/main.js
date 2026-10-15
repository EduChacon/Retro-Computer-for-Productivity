'use strict';
/*
 * Processo principal do Retro Computer (Electron).
 *
 * Endereços:
 *   sistema://retro/…   a área de trabalho (src/sistema)
 *   programa://<id>/…   cada programa instalado (uma origem por programa)
 *
 * A área de trabalho fala com este processo só pela ponte do preload
 * (window.retro); os programas, só pela área de trabalho (postMessage).
 */
const { app, BrowserWindow, protocol, ipcMain, net, session, shell, dialog, safeStorage, Menu, screen, nativeImage, desktopCapturer, globalShortcut, powerMonitor } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

const { Disco } = require('./disco');
const { Config } = require('./config');
const { Programas, mimeDe, compararVersoes, ultimoLancamento, comLimite } = require('./programas');
const { Terminais, acharClaude, comandoInstalarClaude } = require('./terminal');
const { Aplicativos } = require('./aplicativos');
const { Atualizador } = require('./atualizador');
const bandeja = require('./bandeja');
const { Loja, LojaFalsa } = require('./loja');
const sistemaLinux = require('./sistema-linux');
const { Bloqueio, semSegredos } = require('./bloqueio');
const { Unidades, UnidadesFalsas } = require('./unidades');

// O modo sistema: a sessão "Retro Computer" do Linux (sem a área de trabalho do Linux por baixo).
const MODO_SISTEMA = sistemaLinux.ehModoSistema();
const idioma = require('./idioma');
const { tr } = idioma;

const RAIZ_APP = path.join(__dirname, '..', '..');
const PASTA_SISTEMA = path.join(RAIZ_APP, 'src', 'sistema');
const REPO_SISTEMA = 'EduChacon/Retro-Computer-for-Productivity';
const VENDOR = {
  'xterm/xterm.js': path.join(RAIZ_APP, 'node_modules', '@xterm', 'xterm', 'lib', 'xterm.js'),
  'xterm/xterm.css': path.join(RAIZ_APP, 'node_modules', '@xterm', 'xterm', 'css', 'xterm.css'),
  'xterm/addon-fit.js': path.join(RAIZ_APP, 'node_modules', '@xterm', 'addon-fit', 'lib', 'addon-fit.js'),
  'xterm/addon-webgl.js': path.join(RAIZ_APP, 'node_modules', '@xterm', 'addon-webgl', 'lib', 'addon-webgl.js'),
  'xterm/addon-unicode11.js': path.join(RAIZ_APP, 'node_modules', '@xterm', 'addon-unicode11', 'lib', 'addon-unicode11.js'),
};

if (process.env.RETRO_DADOS) app.setPath('userData', path.resolve(process.env.RETRO_DADOS));

// O idioma escolhido vale também para os programas (o WordCraft segue o do navegador).
// No "automático", o Chromium usa o idioma do sistema.
const idiomaEscolhido = (() => {
  if (process.env.RETRO_IDIOMA) return process.env.RETRO_IDIOMA;
  try {
    return JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')).idioma || 'auto';
  } catch {
    return 'auto';
  }
})();
if (idioma.CODIGOS.includes(idiomaEscolhido)) app.commandLine.appendSwitch('lang', idiomaEscolhido);
// Sem placa de vídeo utilizável (máquinas virtuais, computadores antigos), os Craft
// ainda desenham com o WebGL2 por software. Só roda conteúdo local e confiável aqui.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
// Para os testes: câmera e microfone de mentira (o Chromium os gera).
if (process.env.RETRO_MIDIA_FALSA) app.commandLine.appendSwitch('use-fake-device-for-media-stream');

protocol.registerSchemesAsPrivileged([
  { scheme: 'sistema', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: 'programa', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let janela = null;
let config = null;
let disco = null;
let programas = null;
let terminais = null;
let aplicativos = null;
let atualizador = null;
let sistemaBandeja = null; // o volume, o brilho e a rede do computador (bandeja.js)
let loja = null; // os programas do Linux pelo Flathub (loja.js)
let bloqueio = null; // a senha da tela de bloqueio (bloqueio.js)
let unidades = null; // os pendrives e cartões (unidades.js)
let pararObservar = () => { };

function enviar(canal, ...args) {
  if (!janela || janela.isDestroyed()) return false;
  janela.webContents.send(canal, ...args);
  return true;
}

/** Os nomes das pastas do disco: os que já existem nele ou os do idioma atual. */
function nomesDasPastas(raiz) {
  const c = config.obter();
  if (c.pastas && c.pastas.documentos) return c.pastas;
  const ordem = [idioma.idioma(), ...idioma.CODIGOS.filter((x) => x !== idioma.idioma())];
  for (const cod of ordem) {
    const n = idioma.PASTAS[cod];
    if (fs.existsSync(path.join(raiz, n.documentos))) return n;
  }
  return idioma.PASTAS[idioma.idioma()];
}

async function abrirDisco() {
  let raiz = config.obter().disco;
  if (!raiz) {
    raiz = process.env.RETRO_DISCO || path.join(app.getPath('documents'), 'Retro Computer');
    config.definir({ disco: raiz });
  }
  disco = new Disco(raiz);
  // A primeira vez com este disco: a configuração ainda não sabe os nomes das pastas dele.
  const primeiraVez = !(config.obter().pastas && config.obter().pastas.documentos);
  const pastas = nomesDasPastas(raiz);
  config.definir({ pastas });
  await disco.preparar([pastas.documentos, pastas.mesa]);
  if (primeiraVez && !fs.existsSync(path.join(raiz, pastas.documentos, pastas.leiame))) await criarBoasVindas(pastas);
  pararObservar();
  pararObservar = disco.observar((mudancas) => enviar('disco:mudou', mudancas));
}

async function criarBoasVindas(pastas) {
  const texto = [
    tr('Bem-vindo ao Retro Computer!'),
    '',
    tr('Este é o seu disco C:. Ele é uma pasta comum do seu computador:'),
    `  ${disco.raiz}`,
    '',
    tr('Tudo o que você salvar aqui fica nessa pasta, visível fora do programa.'),
    tr('Para trazer arquivos, arraste-os para uma janela de pasta ou para a área de trabalho.'),
    tr('Para levar, use o botão direito › Enviar para, ou › Mostrar no computador principal.'),
    '',
    tr('Nada se perde: o que você exclui vai para a Lixeira, e cada gravação guarda a versão anterior'),
    tr('(botão direito no arquivo › Versões anteriores).'),
    '',
    tr('Para instalar programas: Iniciar › Configurações › Adicionar ou remover programas.'),
    tr('Para usar o Claude Code: o ícone Claude, na área de trabalho.'),
    tr('Para trocar o idioma: Iniciar › Configurações › Painel de controle › Idioma.'),
    '',
    tr('Bom trabalho!'),
    '',
  ].join('\r\n');
  await disco.gravar(`${pastas.documentos}/${pastas.leiame}`, Buffer.from(texto, 'utf8'), { versao: false });
}

/* ---------- Protocolos ---------- */

function registrarProtocolos() {
  protocol.handle('sistema', async (pedido) => {
    const url = new URL(pedido.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith('/vendor/')) {
      const arquivo = VENDOR[rel.slice('/vendor/'.length)];
      if (!arquivo) return new Response('404', { status: 404 });
      return new Response(await fsp.readFile(arquivo), { headers: { 'Content-Type': mimeDe(arquivo) } });
    }
    if (rel === '/' || rel === '') rel = '/index.html';
    const arquivo = path.resolve(PASTA_SISTEMA, '.' + rel);
    if (!arquivo.startsWith(PASTA_SISTEMA + path.sep) || !fs.existsSync(arquivo)) {
      return new Response('404', { status: 404 });
    }
    return new Response(await fsp.readFile(arquivo), {
      headers: { 'Content-Type': mimeDe(arquivo), 'Cache-Control': 'no-cache' },
    });
  });
  protocol.handle('programa', (pedido) => programas.servir(pedido));
}

/* ---------- A janela ---------- */

function criarJanela() {
  const c = config.obter();
  const area = screen.getPrimaryDisplay().workAreaSize;
  janela = new BrowserWindow({
    width: Math.min(1280, area.width),
    height: Math.min(800, area.height),
    minWidth: 640,
    minHeight: 480,
    fullscreen: MODO_SISTEMA || (!!c.telaCheia && !process.env.RETRO_JANELA),
    backgroundColor: '#000000',
    title: 'Retro Computer',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(RAIZ_APP, 'recursos', 'icone.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
      webviewTag: true, // o Navegador (ver "O Navegador" abaixo)
    },
  });
  janela.once('ready-to-show', () => janela.show());
  // No modo sistema, o Retro Computer é a tela inteira: não há para onde sair.
  if (MODO_SISTEMA) janela.on('leave-full-screen', () => setImmediate(() => janela && !janela.isDestroyed() && janela.setFullScreen(true)));
  janela.loadURL('sistema://retro/index.html' + (process.env.RETRO_RAPIDO ? '?rapido' : ''));

  const wc = janela.webContents;
  // A área de trabalho não navega para fora; links externos abrem no navegador do sistema.
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('sistema://')) e.preventDefault();
  });
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) enviar('sistema:link', url);
    return { action: 'deny' };
  });
  // O Navegador: só a sessão dele, só páginas da internet, sem Node e com o preload próprio.
  wc.on('will-attach-webview', (e, prefs, params) => {
    delete prefs.preloadURL;
    prefs.preload = path.join(__dirname, 'navegador-preload.js');
    prefs.nodeIntegration = false;
    prefs.nodeIntegrationInSubFrames = false;
    prefs.contextIsolation = true;
    prefs.sandbox = true;
    prefs.webSecurity = true;
    prefs.spellcheck = false;
    if (params.partition !== SESSAO_NAVEGADOR || !enderecoDaWeb(params.src || 'about:blank')) e.preventDefault();
  });
  // F11 alterna a tela cheia (também dentro dos programas).
  wc.on('before-input-event', (e, entrada) => {
    if (entrada.type === 'keyDown' && entrada.key === 'F11') {
      e.preventDefault();
      alternarTelaCheia();
    }
  });
  janela.on('enter-full-screen', () => enviar('sistema:telaCheia', true));
  janela.on('leave-full-screen', () => enviar('sistema:telaCheia', false));
  janela.on('close', (e) => {
    if (!janela.__podeFechar) {
      // Fechar pela janela do sistema passa pelo "Desligar" da área de trabalho.
      e.preventDefault();
      enviar('sistema:pedidoDesligar');
    }
  });
  janela.on('closed', () => { janela = null; });
}

function alternarTelaCheia() {
  if (!janela || MODO_SISTEMA) return;
  const nova = !janela.isFullScreen();
  janela.setFullScreen(nova);
  config.definir({ telaCheia: nova });
}

function menuDoSistema() {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }
  // No macOS, Copiar e Colar dependem dos itens do menu.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Retro Computer', submenu: [{ role: 'about', label: tr('Sobre o Retro Computer') }, { type: 'separator' }, { role: 'hide', label: tr('Ocultar') }, { role: 'quit', label: tr('Sair') }] },
    { label: tr('Editar'), submenu: [{ role: 'undo', label: tr('Desfazer') }, { role: 'redo', label: tr('Refazer') }, { type: 'separator' }, { role: 'cut', label: tr('Recortar') }, { role: 'copy', label: tr('Copiar') }, { role: 'paste', label: tr('Colar') }, { role: 'selectAll', label: tr('Selecionar tudo') }] },
    { label: tr('Janela'), submenu: [{ role: 'togglefullscreen', label: tr('Tela cheia') }, { role: 'minimize', label: tr('Minimizar') }] },
  ]));
}

/* ---------- Permissões e downloads ---------- */

const SESSAO_NAVEGADOR = 'persist:navegador';
const enderecoDaWeb = (url) => /^https?:\/\//i.test(url) || url === 'about:blank';

/** Os downloads vão para "Meus documentos/Recebidos" (com um nome livre) e avisam a área de trabalho. */
function receberDownloads(s) {
  s.on('will-download', (_e, item) => {
    try {
      const p = config.obter().pastas || idioma.PASTAS[idioma.idioma()];
      const relPasta = `${p.documentos}/${p.recebidos || idioma.PASTAS[idioma.idioma()].recebidos}`;
      const pasta = disco.real(relPasta);
      fs.mkdirSync(pasta, { recursive: true });
      const nome = item.getFilename() || 'arquivo';
      let alvo = path.join(pasta, nome);
      for (let i = 2; fs.existsSync(alvo); i++) {
        const ext = path.extname(nome);
        alvo = path.join(pasta, `${path.basename(nome, ext)} (${i})${ext}`);
      }
      item.setSavePath(alvo);
      item.once('done', (_ev, estado) => {
        if (estado === 'completed') enviar('sistema:recebido', `${relPasta}/${path.basename(alvo)}`);
      });
    } catch {
      item.cancel();
    }
  });
}

/**
 * O Navegador: uma sessão separada da área de trabalho e dos programas.
 * Ele se apresenta como o Chrome, sem os nomes do Electron e do aplicativo (o login do Google,
 * por exemplo, recusa navegadores "embutidos"); câmera, microfone, localização e notificações
 * ficam recusados.
 */
// As respostas às permissões dadas sem "lembrar": valem até o Retro Computer fechar.
let destaVez = {};

function configurarNavegador() {
  const s = session.fromPartition(SESSAO_NAVEGADOR);
  s.setUserAgent(s.getUserAgent().replace(/\s(Electron|Retro-?Computer)\/\S+/gi, ''));
  // Sempre: copiar e a tela cheia. Perguntando ao usuário (e lembrando por site): a câmera e o
  // microfone, as notificações, ler a área de transferência e a localização. O resto, nunca.
  const sempre = new Set(['clipboard-sanitized-write', 'fullscreen']);
  const perguntar = new Set(['media', 'notifications', 'clipboard-read', 'geolocation']);
  const lembradas = () => (config.obter().navegador || {}).permissoes || {};
  const resposta = (origem, k) => {
    const salva = (lembradas()[origem] || {})[k];
    return typeof salva === 'boolean' ? salva : (destaVez[origem] || {})[k];
  };
  const chave = (permissao, tipos) => (permissao === 'media' ? `media:${[...(tipos || [])].sort().join('+') || 'audio+video'}` : permissao);
  s.setPermissionRequestHandler((_wc, permissao, responder, detalhes) => {
    if (sempre.has(permissao)) return responder(true);
    if (!perguntar.has(permissao)) return responder(false);
    let origem;
    try { origem = new URL(detalhes.requestingUrl).origin; } catch { return responder(false); }
    const k = chave(permissao, detalhes.mediaTypes);
    const ja = resposta(origem, k);
    if (typeof ja === 'boolean') return responder(ja);
    pedirAoUsuario('navegador:permissao', { origem, permissao: k }).then((r) => {
      // Sem resposta (a caixa fechada, o tempo esgotado): "não", sem guardar.
      if (r && r.lembrar) config.definir({ navegador: { permissoes: { [origem]: { [k]: !!r.permitir } } } });
      else if (r) (destaVez[origem] = destaVez[origem] || {})[k] = !!r.permitir;
      responder(!!(r && r.permitir));
    });
  });
  s.setPermissionCheckHandler((_wc, permissao, origem, detalhes) => {
    if (sempre.has(permissao)) return true;
    let o;
    try { o = new URL(origem).origin; } catch { return false; }
    const salvas = { ...(destaVez[o] || {}), ...(lembradas()[o] || {}) };
    if (permissao === 'media') return Object.keys(salvas).some((k) => k.startsWith('media:') && k.includes(detalhes.mediaType || '') && salvas[k]);
    return salvas[permissao] === true;
  });
  // Compartilhar a tela: o usuário escolhe a tela ou a janela numa caixa da área de trabalho.
  s.setDisplayMediaRequestHandler(async (pedido, responder) => {
    try {
      const buscar = () => desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 160, height: 100 } });
      // A primeira consulta às vezes volta vazia (o X11 ainda preparando a captura): mais uma tentativa.
      let fontes = await buscar();
      if (!fontes.length) fontes = await new Promise((r) => setTimeout(r, 400)).then(buscar);
      let origem = '';
      try { origem = new URL(pedido.frame.url).origin; } catch { }
      const lista = fontes.map((f) => ({ id: f.id, nome: f.name, miniatura: f.thumbnail.isEmpty() ? null : f.thumbnail.toDataURL(), tela: f.id.startsWith('screen:') }));
      const r = await pedirAoUsuario('navegador:tela', { origem, fontes: lista });
      const escolhida = r && fontes.find((f) => f.id === r.id);
      responder(escolhida ? { video: escolhida } : {});
    } catch {
      responder({});
    }
  });
  receberDownloads(s);
  // As páginas do Navegador (os webview e as janelinhas de login que eles abrem) seguem as mesmas regras.
  app.on('web-contents-created', (_e, wc) => {
    if (wc.session !== s) return;
    // Os links com target abrem noutra janela do Navegador. As janelinhas do window.open (os
    // logins "Entrar com Google/Microsoft") precisam continuar ligadas ao site que as abriu
    // (window.opener): elas abrem numa janela própria, presa à do Retro Computer.
    wc.setWindowOpenHandler(({ url, disposition, features }) => {
      if (!enderecoDaWeb(url)) return { action: 'deny' };
      if (disposition === 'new-window') {
        const medida = (nome, padrao) => { const m = new RegExp(`${nome}=(\\d+)`).exec(features || ''); return m ? Math.min(Math.max(Number(m[1]), 320), 1400) : padrao; };
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            parent: janela, width: medida('width', 520), height: medida('height', 680), center: true,
            autoHideMenuBar: true, backgroundColor: '#ffffff', title: 'Retro Computer',
            webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, spellcheck: false },
          },
        };
      }
      enviar('navegador:janela', url);
      return { action: 'deny' };
    });
    wc.on('will-navigate', (e, url) => { if (!enderecoDaWeb(url)) e.preventDefault(); });
    wc.on('will-redirect', (e, url) => { if (!enderecoDaWeb(url)) e.preventDefault(); });
  });
}

/**
 * Uma pergunta à área de trabalho, com resposta (as permissões e a escolha da tela do Navegador).
 * Sem resposta em 2 minutos, vale "não".
 */
const perguntas = new Map();
let numeroPergunta = 0;
function pedirAoUsuario(canal, dados) {
  return new Promise((resolve) => {
    const id = ++numeroPergunta;
    const t = setTimeout(() => { perguntas.delete(id); resolve(null); }, 120000);
    perguntas.set(id, (r) => { clearTimeout(t); perguntas.delete(id); resolve(r); });
    if (!enviar(canal, { id, ...dados })) { perguntas.get(id)(null); }
  });
}

/**
 * As teclas do computador no modo sistema (sem a área de trabalho do Linux, ninguém mais
 * cuida delas): a tecla do logotipo sozinha abre o Iniciar; as de volume e de brilho do
 * teclado mudam o som e a tela. As de volume valem mesmo com um programa do Linux na frente.
 */
function teclasDoSistema() {
  if (!MODO_SISTEMA) return;
  const globais = new Set();
  for (const [tecla, acao] of [['VolumeUp', 'volume+'], ['VolumeDown', 'volume-'], ['VolumeMute', 'mudo']]) {
    try { if (globalShortcut.register(tecla, () => enviar('sistema:tecla', acao))) globais.add(acao); } catch { }
  }
  const DO_TECLADO = { AudioVolumeUp: 'volume+', AudioVolumeDown: 'volume-', AudioVolumeMute: 'mudo', BrightnessUp: 'brilho+', BrightnessDown: 'brilho-', LaunchCalculator: 'calculadora', LaunchApplication2: 'calculadora' };
  // O layout escolhido em Painel › Teclado (por cima do da instalação do Linux).
  const t = config.obter().teclado;
  if (t && t.layout) sistemaLinux.aplicarTeclado(t.layout, t.variante).catch(() => { });
  let logotipoSozinho = false;
  app.on('web-contents-created', (_e, wc) => {
    wc.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown') {
        logotipoSozinho = input.key === 'Meta' && !input.isAutoRepeat;
        // A tecla do logotipo com L bloqueia (como no Windows).
        if (input.meta && (input.key === 'l' || input.key === 'L')) {
          e.preventDefault();
          enviar('sistema:tecla', 'bloquear');
          return;
        }
        const acao = DO_TECLADO[input.key];
        if (acao && !globais.has(acao)) {
          e.preventDefault();
          enviar('sistema:tecla', acao);
        }
      } else if (input.type === 'keyUp' && input.key === 'Meta' && logotipoSozinho) {
        logotipoSozinho = false;
        enviar('sistema:tecla', 'iniciar');
      }
    });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
}

/**
 * Avisa a área de trabalho quando um pendrive chega ou sai (e, no modo sistema, monta o que
 * chega). No Windows, a consulta é mais cara (o PowerShell): mais espaçada.
 */
function vigiarUnidades() {
  let antes = null;
  const olhar = async () => {
    try {
      if (MODO_SISTEMA) await unidades.montarNovas();
      const lista = await unidades.listar();
      const assinatura = lista.map((u) => u.id + (u.montada ? '+' : '-')).sort().join('|');
      if (antes !== null && assinatura !== antes) enviar('unidades:mudou', lista);
      antes = assinatura;
    } catch { }
  };
  olhar();
  setInterval(olhar, process.platform === 'win32' ? 8000 : 4000).unref();
}

function configurarSessao() {
  const s = session.defaultSession;
  const permitidas = new Set(['clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'local-fonts']);
  s.setPermissionRequestHandler((_wc, permissao, responder, detalhes) => {
    const origem = String(detalhes.requestingUrl || '');
    responder(permitidas.has(permissao) && /^(sistema|programa):\/\//.test(origem));
  });
  s.setPermissionCheckHandler((_wc, permissao, origem) => {
    return permitidas.has(permissao) && /^(sistema|programa):\/\//.test(String(origem || ''));
  });
  // Um download que escapar do adaptador vai para "Meus documentos/Recebidos".
  receberDownloads(s);
}

/* ---------- Ponte com a área de trabalho ---------- */

function tratar(canal, fn) {
  ipcMain.handle(canal, async (e, ...args) => {
    if (!janela || e.sender !== janela.webContents) throw new Error('origem');
    try {
      return { ok: true, valor: await fn(...args) };
    } catch (erro) {
      return { ok: false, erro: erro.message || String(erro), codigo: erro.codigo };
    }
  });
}

function registrarPonte() {
  // Configurações
  tratar('config:obter', () => ({
    ...semSegredos(config.obter()),
    plataforma: process.platform,
    modoSistema: MODO_SISTEMA,
    versaoApp: app.getVersion(),
    temChave: config.temChave(),
    cofre: config.cofreDisponivel(),
    telaCheiaAgora: janela ? janela.isFullScreen() : false,
    idiomaEfetivo: idioma.idioma(),
    idiomaSistema: app.getLocale(),
  }));
  tratar('config:definir', (parte) => {
    const proibidas = ['disco', 'versao', 'pastas'];
    for (const k of proibidas) delete parte[k];
    // A senha da tela de bloqueio só muda por bloqueio:definir (conferindo a atual).
    if (parte.bloqueio && typeof parte.bloqueio === 'object') { delete parte.bloqueio.senha; delete parte.bloqueio.temSenha; }
    return semSegredos(config.definir(parte));
  });
  // Os pendrives: listar, abrir, trazer para o C:, levar do C: e remover com segurança.
  tratar('unidades:listar', () => unidades.listar());
  tratar('unidades:pasta', (id, rel) => unidades.listarPasta(String(id), String(rel || '')));
  tratar('unidades:montar', (id) => unidades.montar(String(id)));
  tratar('unidades:ejetar', (id) => unidades.ejetar(String(id)));
  tratar('unidades:trazer', (id, rels, destino) => unidades.trazer(String(id), (rels || []).map(String), String(destino || '')));
  tratar('unidades:levar', (id, rels, destino) => unidades.levar(String(id), (rels || []).map(String), String(destino || '')));
  tratar('bloqueio:conferir', (senha) => bloqueio.conferir(String(senha || '')));
  tratar('bloqueio:definir', (atual, nova) => bloqueio.definir(String(atual || ''), String(nova || '')));
  tratar('config:chave', (chave) => config.gravarChave(chave));

  // Disco
  tratar('disco:raiz', () => disco.raiz);
  tratar('disco:listar', (rel, o) => disco.listar(rel, o));
  tratar('disco:info', (rel) => disco.info(rel));
  tratar('disco:existe', (rel) => disco.existe(rel));
  tratar('disco:ler', (rel) => disco.ler(rel).then((b) => new Uint8Array(b)));
  tratar('disco:lerTexto', (rel) => disco.ler(rel).then((b) => b.toString('utf8')));
  tratar('disco:gravar', (rel, dados, o) => disco.gravar(rel, dados, o));
  tratar('disco:criarPasta', (pai, nome) => disco.criarPasta(pai, nome));
  tratar('disco:nomeLivre', (pai, nome) => disco.nomeLivre(pai, nome));
  tratar('disco:renomear', (rel, nome) => disco.renomear(rel, nome));
  tratar('disco:mover', (rel, destino) => disco.mover(rel, destino));
  tratar('disco:copiar', (rel, destino) => disco.copiar(rel, destino));
  tratar('disco:importar', (caminhos, destino) => disco.importar(caminhos, destino));
  tratar('disco:paraLixeira', (rel) => disco.paraLixeira(rel));
  tratar('disco:lixeira', () => disco.listarLixeira());
  tratar('disco:restaurar', (id) => disco.restaurar(id));
  tratar('disco:apagarDaLixeira', (id) => disco.apagarDaLixeira(id));
  tratar('disco:esvaziarLixeira', () => disco.esvaziarLixeira());
  tratar('disco:versoes', (rel) => disco.versoes(rel));
  tratar('disco:restaurarVersao', (rel, id) => disco.restaurarVersao(rel, id));
  tratar('disco:espaco', () => disco.espaco());
  tratar('disco:mostrar', (rel) => {
    const r = disco.real(rel || '');
    if (!rel) return shell.openPath(r);
    shell.showItemInFolder(r);
  });
  tratar('disco:abrirFora', (rel) => shell.openPath(disco.real(rel)));
  tratar('disco:buscar', (termo, o) => disco.buscar(termo, o));
  tratar('disco:exportar', async (rels, onde) => {
    let pasta = onde === 'downloads' ? app.getPath('downloads') : onde === 'desktop' ? app.getPath('desktop') : null;
    if (!pasta) {
      const r = await dialog.showOpenDialog(janela, { title: tr('Levar para qual pasta do computador principal?'), properties: ['openDirectory', 'createDirectory'] });
      if (r.canceled || !r.filePaths[0]) return null;
      pasta = r.filePaths[0];
    }
    return disco.exportar(rels, pasta);
  });
  tratar('disco:importarEscolhendo', async (destino) => {
    const r = await dialog.showOpenDialog(janela, { title: tr('Trazer arquivos do computador principal'), properties: ['openFile', 'multiSelections'] });
    if (r.canceled || !r.filePaths.length) return [];
    return disco.importar(r.filePaths, destino);
  });
  tratar('disco:trocar', async () => {
    const r = await dialog.showOpenDialog(janela, {
      title: tr('Escolha a pasta do disco C:'),
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: disco.raiz,
    });
    if (r.canceled || !r.filePaths[0]) return null;
    config.definir({ disco: r.filePaths[0], pastas: null });
    await abrirDisco();
    return disco.raiz;
  });

  // Programas
  tratar('programas:catalogo', () => programas.catalogo());
  tratar('programas:instalados', () => programas.instalados());
  tratar('programas:instalar', (id, opcoes) => programas.instalar(id, (p) => enviar('programas:progresso', id, p), opcoes || {}));
  tratar('programas:instalarArquivo', async () => {
    const r = await dialog.showOpenDialog(janela, {
      title: tr('Instalar programa de um arquivo .zip'),
      filters: [{ name: tr('Pacote para navegador (.zip)'), extensions: ['zip'] }],
      properties: ['openFile'],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    return programas.instalarZip(r.filePaths[0]);
  });
  tratar('programas:remover', (id) => programas.remover(id));
  tratar('programas:verificar', (id, o) => programas.verificar(id, o));
  tratar('programas:verificarTodos', (o) => programas.verificarTodos(o));

  // Terminal
  tratar('terminal:disponivel', () => terminais.disponivel());
  tratar('terminal:criar', (o) => {
    const env = {};
    const chave = config.lerChave();
    if (chave && o.comChave !== false) env.ANTHROPIC_API_KEY = chave;
    const cwd = o.pasta != null ? disco.real(o.pasta) : disco.raiz;
    return terminais.criar({ cols: o.cols, rows: o.rows, cwd, comando: o.comando, env });
  });
  tratar('terminal:escrever', (id, dados) => terminais.escrever(id, dados));
  tratar('terminal:redimensionar', (id, c, l) => terminais.redimensionar(id, c, l));
  tratar('terminal:fechar', (id) => terminais.fechar(id));
  tratar('terminal:acharClaude', () => acharClaude());
  tratar('terminal:instalarClaude', () => comandoInstalarClaude());

  // Sistema
  // Os programas instalados no computador principal (abrir só pelo identificador da lista).
  tratar('nativos:listar', (atualizar) => aplicativos.listar(!!atualizar));
  tratar('nativos:icone', (id) => aplicativos.icone(String(id)));
  tratar('nativos:abrir', (id) => aplicativos.abrir(String(id)));
  tratar('navegador:responder', (id, resposta) => { const f = perguntas.get(id); if (f) f(resposta); return !!f; });
  tratar('navegador:esquecerPermissoes', () => {
    destaVez = {};
    config.definir({ navegador: { permissoes: null } });
    return true;
  });
  tratar('navegador:limparDados', () => session.fromPartition(SESSAO_NAVEGADOR).clearStorageData().then(() => session.fromPartition(SESSAO_NAVEGADOR).clearCache()));
  tratar('sistema:telaCheia', (v) => {
    if (MODO_SISTEMA) return true;
    if (v == null) alternarTelaCheia();
    else if (janela) { janela.setFullScreen(!!v); config.definir({ telaCheia: !!v }); }
    return janela ? janela.isFullScreen() : false;
  });
  tratar('sistema:abrirLink', (url) => {
    if (!/^https?:\/\//i.test(String(url))) throw new Error(tr('Endereço inválido.'));
    return shell.openExternal(url);
  });
  // A loja dos programas do Linux (loja.js).
  tratar('loja:info', () => loja.info());
  tratar('loja:buscar', (o) => loja.buscar(o || {}));
  tratar('loja:detalhes', (id, idioma) => loja.detalhes(String(id), String(idioma || 'en')));
  tratar('loja:imagem', (url) => loja.imagem(url));
  tratar('loja:instalados', () => loja.instalados());
  tratar('loja:atualizacoes', () => loja.atualizacoes());
  const andamento = (id) => (a) => enviar('loja:andamento', id, a);
  tratar('loja:instalar', (id) => loja.instalar(String(id), andamento(id)));
  tratar('loja:atualizar', (id) => loja.atualizar(id ? String(id) : '', andamento(id)));
  tratar('loja:remover', (id) => loja.remover(String(id), andamento(id)));
  tratar('loja:cancelar', () => loja.cancelar());
  tratar('loja:abrir', (id) => loja.abrir(String(id)));
  // A bandeja: o volume, o brilho e a rede do computador (bandeja.js).
  tratar('bandeja:bateria', () => sistemaBandeja.bateria());
  tratar('bandeja:aparelhos', () => sistemaBandeja.aparelhos());
  tratar('bandeja:volume', () => sistemaBandeja.volume.ler());
  tratar('bandeja:definirVolume', (o) => sistemaBandeja.volume.definir(o || {}));
  tratar('bandeja:brilho', () => sistemaBandeja.brilho.ler());
  tratar('bandeja:definirBrilho', (n) => sistemaBandeja.brilho.definir(n));
  tratar('bandeja:rede', () => sistemaBandeja.rede.estado());
  tratar('bandeja:redes', (procurar) => sistemaBandeja.rede.redes(!!procurar));
  tratar('bandeja:conectar', (ssid, senha) => sistemaBandeja.rede.conectar(String(ssid), senha ? String(senha) : ''));
  tratar('bandeja:desconectar', () => sistemaBandeja.rede.desconectar());
  tratar('bandeja:ligarWifi', (v) => sistemaBandeja.rede.ligarWifi(!!v));
  tratar('bandeja:configuracoesRede', () => sistemaBandeja.rede.configuracoes());
  // A atualização do próprio Retro Computer (atualizador.js).
  tratar('atualizacao:info', () => atualizador.info());
  tratar('atualizacao:verificar', () => atualizador.verificar());
  tratar('atualizacao:baixar', () => atualizador.baixar());
  tratar('atualizacao:instalar', () => atualizador.instalar());
  // O computador inteiro (só no modo sistema): desligar, reiniciar, suspender e sair da sessão.
  tratar('sistema:energia', async (acao) => {
    if (!MODO_SISTEMA) throw new Error('modo sistema');
    if (acao === 'suspender') return sistemaLinux.energia('suspender');
    terminais.fecharTodos();
    if (acao === 'sair') {
      if (janela) janela.__podeFechar = true;
      setTimeout(() => app.exit(0), 50);
      return { ok: true };
    }
    const r = await sistemaLinux.energia(acao);
    if (r.ok && janela) janela.__podeFechar = true;
    return r;
  });
  tratar('sistema:abrirAoEntrar', (ligar) => (ligar == null ? sistemaLinux.abrirAoEntrar(app) : sistemaLinux.definirAbrirAoEntrar(app, !!ligar)));
  tratar('sistema:sessao', () => sistemaLinux.infoSessao());
  tratar('sistema:teclado', async (layout, variante) => {
    if (layout == null) return sistemaLinux.lerTeclado();
    if (!MODO_SISTEMA) throw new Error('modo sistema');
    const r = await sistemaLinux.aplicarTeclado(String(layout), String(variante || ''));
    if (r.ok) config.definir({ teclado: { layout: String(layout), variante: String(variante || '') } });
    return r;
  });
  tratar('sistema:entrarDireto', (ligar, senha) => sistemaLinux.definirEntrarDireto(!!ligar, String(senha || '')));
  tratar('sistema:desligar', () => {
    terminais.fecharTodos();
    if (janela) janela.__podeFechar = true;
    setTimeout(() => app.quit(), 50);
  });
  tratar('sistema:reiniciar', () => {
    terminais.fecharTodos();
    if (janela) janela.webContents.reload();
  });
  // Reabre o aplicativo inteiro (para trocar o idioma, que vale também para os programas).
  tratar('sistema:reabrir', () => {
    terminais.fecharTodos();
    if (janela) janela.__podeFechar = true;
    app.relaunch();
    setTimeout(() => app.exit(0), 50);
  });
  tratar('sistema:escalaTela', () => (janela ? screen.getDisplayMatching(janela.getBounds()).scaleFactor : 1));
  tratar('sistema:zoom', (fator) => {
    if (janela && fator > 0.2 && fator < 6) janela.webContents.setZoomFactor(fator);
  });
  // Há uma versão nova do próprio Retro Computer? (no máximo uma vez por dia)
  tratar('sistema:novaVersao', async (forcar) => {
    const c = config.obter();
    const b = c.buscaSistema || {};
    if (!forcar && b.em && Date.now() - b.em < 24 * 3600 * 1000) {
      return { atual: app.getVersion(), nova: b.versao, pagina: b.pagina, temAtualizacao: compararVersoes(b.versao, app.getVersion()) > 0 };
    }
    const ult = await comLimite(ultimoLancamento((u, o) => net.fetch(u, o), REPO_SISTEMA), 8000);
    config.definir({ buscaSistema: { em: Date.now(), versao: ult.versao, pagina: ult.pagina } });
    return { atual: app.getVersion(), nova: ult.versao, pagina: ult.pagina, temAtualizacao: compararVersoes(ult.versao, app.getVersion()) > 0 };
  });
}

/* ---------- Início ---------- */

app.on('second-instance', () => {
  if (janela) {
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  }
});

app.whenReady().then(async () => {
  config = new Config(app.getPath('userData'), safeStorage);
  idioma.definir(idioma.resolver(idiomaEscolhido, app.getLocale()));
  programas = new Programas(path.join(app.getPath('userData'), 'programas'), (url, o) => net.fetch(url, o));
  terminais = new Terminais((id, d) => enviar('terminal:dados', id, d), (id, c) => enviar('terminal:saiu', id, c));
  aplicativos = new Aplicativos({ shell, nativeImage, app, idioma: () => idioma.idioma() });
  bloqueio = new Bloqueio(config);
  // A tela bloqueia antes de o computador dormir (e quando o próprio sistema bloqueia):
  // na volta, a senha é pedida.
  const bloquear = () => {
    const b = config.obter().bloqueio || {};
    if (bloqueio.temSenha() && b.aoVoltar !== false) enviar('bloqueio:bloquear');
  };
  powerMonitor.on('suspend', bloquear);
  powerMonitor.on('lock-screen', bloquear);
  // Depois de instalar ou remover um programa do Linux, a lista dos programas do computador é refeita.
  loja = new (process.env.RETRO_LOJA_FALSA ? LojaFalsa : Loja)({ fetch: (u, o) => net.fetch(u, o), aoInstalar: () => { try { aplicativos.listar(true); } catch { } } });
  atualizador = new Atualizador({ app, enviar, antesDeSair: () => { terminais.fecharTodos(); if (janela) janela.__podeFechar = true; } });
  if (process.env.RETRO_BANDEJA_FALSA) {
    sistemaBandeja = bandeja.bandejaFalsa();
  } else {
    const volume = new bandeja.Volume();
    let bateria = null;
    sistemaBandeja = {
      volume, brilho: new bandeja.Brilho({ volume }), rede: new bandeja.Rede({ shell }),
      // A bateria não aparece nem some com o computador ligado: basta perguntar uma vez.
      bateria: async () => (bateria = bateria || bandeja.temBateria(process.platform, volume).then((existe) => ({ existe }))),
      aparelhos: async () => (process.platform === 'linux' ? bandeja.lerAparelhos() : []),
    };
  }
  await abrirDisco();
  // Os pendrives e cartões (RETRO_UNIDADES_FALSAS: uma pasta comum, para os testes).
  unidades = process.env.RETRO_UNIDADES_FALSAS
    ? new UnidadesFalsas({ disco: () => disco }, process.env.RETRO_UNIDADES_FALSAS)
    : new Unidades({ disco: () => disco, sistema: MODO_SISTEMA });
  vigiarUnidades();
  menuDoSistema();
  configurarSessao();
  configurarNavegador();
  registrarProtocolos();
  registrarPonte();
  teclasDoSistema();
  criarJanela();
});

app.on('window-all-closed', () => {
  pararObservar();
  if (terminais) terminais.fecharTodos();
  if (sistemaBandeja) sistemaBandeja.volume.fechar();
  app.quit();
});
