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
const { app, BrowserWindow, protocol, ipcMain, net, session, shell, dialog, safeStorage, Menu, screen, nativeImage, desktopCapturer, globalShortcut, powerMonitor, clipboard, ClipboardItem, webContents, utilityProcess } = require('electron');
const fs = require('node:fs');
const { spawn, execFile, execFileSync } = require('node:child_process');
const fsp = require('node:fs/promises');
const path = require('node:path');

const { Disco } = require('./disco');
const { Config } = require('./config');
const { Programas, mimeDe, compararVersoes, ultimoLancamento, comLimite } = require('./programas');
const { Terminais, acharClaude, comandoInstalarClaude, comandoClaude, ajustesClaude, configuracoesDoClaude } = require('./terminal');
const { Aplicativos, iconeDoArquivo, acharPorNome } = require('./aplicativos');
const { Atualizador } = require('./atualizador');
const bandeja = require('./bandeja');
const { Loja, LojaFalsa } = require('./loja');
const loginGoogle = require('./login-google');
const { LojaWinget, LojaBrew, LojaWingetFalsa, LojaBrewFalsa } = require('./lojas');
const { PapeisDeParede } = require('./papel');
const monitoresMod = require('./monitores');
const sistemaLinux = require('./sistema-linux');
const { Bloqueio, semSegredos, confere: confereSenha, confereLinux } = require('./bloqueio');
const { Unidades, UnidadesFalsas, PastasDoComputador, noDisco, caminhosDaLinha } = require('./unidades');
const { Discos, DiscosFalsos } = require('./discos');
const { servirArquivo, miniatura } = require('./servir');
const compactados = require('./compactados');
const { Monitor } = require('./monitor');
const { Impressoras, ImpressorasFalsas, papelDoPais } = require('./impressoras');
const { Trabalhos } = require('./trabalho');
const { FerramentasPdf } = require('./pdf');
const { Bluetooth, BluetoothFalso } = require('./bluetooth');
const { AtualizacoesLinux, AtualizacoesFalsas } = require('./atualizacoes-linux');
const { JanelasLinux, JanelasFalsas } = require('./janelas-linux');
const { acaoDaTecla, trazORetro, GLOBAIS: GLOBAIS_DO_WINDOWS } = require('./atalhos');
const { Tela, TelaFalsa } = require('./tela');
const { Mouse, MouseFalso, limparEscolhas } = require('./mouse');
const { Diario } = require('./diario');
const { CopiaSeguranca, destinoValido, venceu } = require('./copia');
const { Firefox, CLASSE: CLASSE_FIREFOX } = require('./firefox');
const { Visualizador } = require('./visualizar');
const { pastaPortatil, caminhosPortateis } = require('./portatil');
const { Som, SomFalso } = require('./som');
const { Energia } = require('./energia');
const { DataHora, DataHoraFalsa } = require('./datahora');
const { AcessibilidadeLinux } = require('./acessibilidade');
const { Antivirus } = require('./antivirus');
const { Wine } = require('./wine');
const { Dos, servirEmulador } = require('./dos');
const { Mac, servirEmulador: servirEmuladorMac } = require('./macintosh');
const { ServidorMcp, filtrarConfig } = require('./mcp');
const { dentro: dentroDaUnidade } = require('./unidades');
const { HistoricoTransferencia } = require('./transferencia');
const { Firewall, FirewallFalso } = require('./firewall');
const { paraHttps, Subidos } = require('./https');
const { Perfis, PRINCIPAL } = require('./perfis');
const { ehExecutavel } = require('./executaveis');
const { modoAcentos, gravarCompose } = require('./teclado');

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
// As pastas de bibliotecas servidas inteiras (o pdf.js do painel de visualização: o código, as
// fontes padrão, os mapas de caracteres e os decodificadores), só as subpastas listadas.
const VENDOR_PASTAS = {
  'pdfjs/': { raiz: path.join(RAIZ_APP, 'node_modules', 'pdfjs-dist'), sub: ['build', 'cmaps', 'standard_fonts', 'wasm', 'iccs'] },
};

/** O arquivo de uma biblioteca (vendor/…), ou null. */
function arquivoVendor(rel) {
  if (VENDOR[rel]) return VENDOR[rel];
  for (const [prefixo, p] of Object.entries(VENDOR_PASTAS)) {
    if (!rel.startsWith(prefixo)) continue;
    const resto = rel.slice(prefixo.length);
    if (!p.sub.includes(resto.split('/')[0])) return null;
    const arquivo = path.resolve(p.raiz, resto);
    return arquivo.startsWith(p.raiz + path.sep) ? arquivo : null;
  }
  return null;
}

// O modo portátil: uma pasta "Retro Computer (dados)" ao lado do programa guarda tudo (portatil.js).
const PORTATIL = process.env.RETRO_DADOS ? null : pastaPortatil({ env: process.env, exe: app.getPath('exe'), plataforma: process.platform });
if (process.env.RETRO_DADOS) app.setPath('userData', path.resolve(process.env.RETRO_DADOS));
else if (PORTATIL) {
  fs.mkdirSync(caminhosPortateis(PORTATIL).dados, { recursive: true });
  app.setPath('userData', caminhosPortateis(PORTATIL).dados);
}

// Os vários perfis (perfis.js): a pasta de dados de cada usuário fica dentro da principal, e os
// programas instalados ficam na principal, para todos.
const BASE_DADOS = app.getPath('userData');
const perfis = new Perfis(BASE_DADOS);
// Um Retro Computer aberto por vez, qualquer que seja o usuário: a trava fica na pasta principal.
const TRAVA = app.requestSingleInstanceLock();
// Quem entra: o da troca de usuário ou do logoff (a "próxima abertura"), ou o último usado.
const INICIO = TRAVA ? perfis.inicial() : { perfil: PRINCIPAL, entrou: false, logon: false, reaberto: false };
const PERFIL = INICIO.perfil;
if (PERFIL !== PRINCIPAL) {
  fs.mkdirSync(perfis.pastaDados(PERFIL), { recursive: true });
  app.setPath('userData', perfis.pastaDados(PERFIL));
}

// Os acentos no Linux como no Windows (teclado.js): no EUA internacional, a tabela com as regras do
// Windows (" + B = "B, ´ + c = ç); nos outros layouts, o "cedilla" do GTK. A regra é escolhida ao abrir,
// pelo layout (o de Painel › Teclado no modo sistema; senão, o do X), antes de o GTK ler a variável.
// O IBus e o Fcitx de quem os usa ficam como estão. Os programas abertos pelo Retro Computer herdam.
const IM_ORIGINAL = { GTK_IM_MODULE: process.env.GTK_IM_MODULE, XMODIFIERS: process.env.XMODIFIERS, WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY, XDG_SESSION_TYPE: process.env.XDG_SESSION_TYPE };
const ehIntl = (l) => !!l && l.layout === 'us' && l.variante === 'intl';
let ACENTOS = { modo: 'sistema', env: {} };
if (process.platform === 'linux') {
  // RETRO_TECLADO=us:intl finge o layout (para os testes: o Xvfb não aplica a variante).
  let layout = process.env.RETRO_TECLADO ? { layout: process.env.RETRO_TECLADO.split(':')[0], variante: process.env.RETRO_TECLADO.split(':')[1] || '' } : null;
  if (!layout) {
    try {
      const t = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')).teclado;
      if (MODO_SISTEMA && t && t.layout) layout = { layout: t.layout, variante: t.variante || '' };
    } catch { }
  }
  if (!layout && process.env.DISPLAY) {
    try { layout = sistemaLinux.lerQuery(execFileSync('setxkbmap', ['-query'], { timeout: 2000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { }
  }
  const arquivo = ehIntl(layout) && !IM_ORIGINAL.GTK_IM_MODULE ? gravarCompose(BASE_DADOS) : '';
  ACENTOS = modoAcentos({ env: IM_ORIGINAL, ...(layout || {}), arquivo });
  Object.assign(process.env, ACENTOS.env);
}

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
// As duas telas com escalas diferentes no Windows (o notebook a 150% e o monitor a 100%): a janela que
// cobre as duas só fica no lugar medida em pixels de verdade, com a mesma escala nas duas. O Tamanho
// dos pixels do Painel já é contado em pixels de verdade, e o automático usa a escala guardada.
const ESCALA_UNICA = (() => {
  if (process.platform !== 'win32' && !process.env.RETRO_ESCALA_UNICA) return false;
  try {
    const t = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'config.json'), 'utf8')).tela || {};
    return !!(t.duas && t.escalaUnica);
  } catch { return false; }
})();
if (ESCALA_UNICA) app.commandLine.appendSwitch('force-device-scale-factor', '1');
// Sem placa de vídeo utilizável (máquinas virtuais, computadores antigos), os Craft
// ainda desenham com o WebGL2 por software. Só roda conteúdo local e confiável aqui.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');
// Para os testes: câmera e microfone de mentira (o Chromium os gera).
if (process.env.RETRO_MIDIA_FALSA) app.commandLine.appendSwitch('use-fake-device-for-media-stream');
// No modo sistema, o Chromium não reconhece a sessão "Retro Computer" e guardaria os cookies do
// Navegador e a chave do Claude só embaralhados (o "basic_text"): com o GNOME Keyring instalado
// (o Ubuntu e o Linux Mint o trazem), o chaveiro do Linux, aberto pela senha de entrada, guarda a chave.
if (MODO_SISTEMA && !app.commandLine.hasSwitch('password-store') && fs.existsSync('/usr/bin/gnome-keyring-daemon')) {
  app.commandLine.appendSwitch('password-store', 'gnome-libsecret');
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'sistema', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  { scheme: 'programa', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
  // O DOS (dos.js): o emulador numa origem só dele.
  { scheme: 'dos', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  // O Mac Plus (macintosh.js): o emulador também numa origem só dele.
  { scheme: 'mac', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (!TRAVA) {
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
let trabalhos = null; // o processo de trabalho (trabalho.js): as ferramentas de PDF
let cheiaPeloSite = false; // a janela entrou em tela cheia por um site do Navegador
let loja = null; // a loja de programas: o Flathub no Linux (loja.js), o winget no Windows e o Homebrew no Mac (lojas.js)
let bloqueio = null; // a senha da tela de bloqueio (bloqueio.js)
let energiaOpcoes = null; // as opções de energia do modo sistema (energia.js)
let acessLinux = null; // as teclas de aderência e as do mouse do modo sistema (acessibilidade.js)
let unidades = null; // os pendrives e cartões (unidades.js)
let pastasFora = null; // as pastas do computador principal no Meu computador (unidades.js)
let discos = null; // os discos externos inteiros: formatar e gravar imagens (discos.js)
let janelasLinux = null; // as janelas dos programas do Linux na barra de tarefas (modo sistema)
let tela = null; // a resolução da tela (modo sistema, pelo xrandr)
let mouse = null; // o mouse e o touchpad (modo sistema, pelo xinput)
let diario = null; // o Diário de trabalho (diario.js)
let copia = null; // a cópia de segurança do disco C: (copia.js)
let firefox = null; // o Firefox com o visual do Retro Computer (firefox.js)
let historico = null; // o histórico da área de transferência (transferencia.js)
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

/** O disco C: padrão do perfil principal (os dos outros perfis ficam ao lado dele). */
function discoPadraoPrincipal() {
  if (PORTATIL) return caminhosPortateis(PORTATIL).disco;
  return process.env.RETRO_DISCO || path.join(app.getPath('documents'), 'Retro Computer');
}

async function abrirDisco() {
  let raiz = config.obter().disco;
  // No modo portátil, o disco é sempre o da pasta (o caminho do pendrive muda de um computador para outro).
  if (PORTATIL) raiz = perfis.discoPadrao(PERFIL, discoPadraoPrincipal());
  if (!raiz) {
    raiz = perfis.discoPadrao(PERFIL, discoPadraoPrincipal());
    config.definir({ disco: raiz });
  }
  disco = new Disco(raiz);
  disco.aoExportar = copiarMarcas;
  // A primeira vez com este disco: a configuração ainda não sabe os nomes das pastas dele.
  const primeiraVez = !(config.obter().pastas && config.obter().pastas.documentos);
  const pastas = nomesDasPastas(raiz);
  config.definir({ pastas });
  await disco.preparar([pastas.documentos, pastas.mesa]);
  if (primeiraVez && !fs.existsSync(path.join(raiz, pastas.documentos, pastas.leiame))) await criarBoasVindas(pastas);
  pararObservar();
  pararObservar = disco.observar((mudancas) => enviar('disco:mudou', mudancas), (rel) => { if (diario) diario.arquivoMudou(rel).catch(() => { }); });
}

/** O nome da pasta da cópia de segurança dentro do destino (guardado, como o do diário). */
function pastaCopia() {
  if (!(config.obter().pastas || {}).copia) config.definir({ pastas: { copia: idioma.tr('Cópia do Retro Computer') } });
  return config.obter().pastas.copia;
}

/** Faz a cópia de segurança e guarda o resultado (a hora só conta quando deu certo). */
async function fazerCopia(destino, { manual = false } = {}) {
  const c = config.obter().copia || {};
  const r = await copia.fazer({ destino: destino || c.destino, pasta: pastaCopia(), aoProgresso: (p) => enviar('copia:progresso', p) });
  const resumo = { em: Date.now(), ok: r.ok, erro: r.erro || null, copiados: r.copiados || 0, iguais: r.iguais || 0, erros: (r.erros || []).length };
  config.definir({ copia: { ...(r.ok ? { ultima: resumo.em } : {}), resultado: resumo } });
  enviar('copia:fim', { ...r, manual });
  return r;
}

/** De dez em dez minutos: se a cópia automática venceu, ela é feita (sem o destino à mão, fica para a próxima). */
function agendarCopia() {
  const conferir = () => {
    const c = config.obter().copia || {};
    if (!c.ligada || !c.destino || copia.rodando || !venceu(c.ultima, c.quando)) return;
    if (!fs.existsSync(c.destino)) return;
    fazerCopia(c.destino).catch(() => { });
  };
  setTimeout(conferir, 2 * 60 * 1000).unref();
  setInterval(conferir, 10 * 60 * 1000).unref();
}

/** A pasta do Diário de trabalho (o nome fica guardado: trocar de idioma não cria outra). */
function pastaDiario() {
  if (!(config.obter().pastas || {}).diario) config.definir({ pastas: { diario: idioma.tr('Diário de trabalho') } });
  const p = config.obter().pastas;
  return `${p.documentos}/${p.diario}`;
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

/**
 * Um arquivo do disco é só conteúdo: aberto como página (um .svg ou um .html com script, num quadro
 * de um programa), ele fica numa caixa de areia, sem script e sem a origem da área de trabalho, e
 * só a própria área de trabalho o embute.
 */
function soConteudo(resp) {
  try {
    resp.headers.set('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'");
    resp.headers.set('X-Content-Type-Options', 'nosniff');
    resp.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  } catch { }
  return resp;
}

// Os papéis de parede, na pasta de dados do usuário em uso (perfis.js troca o userData logo na abertura).
let papeisDeParede = null;
const papeis = () => papeisDeParede || (papeisDeParede = new PapeisDeParede(path.join(app.getPath('userData'), 'papeis-de-parede')));

function registrarProtocolos() {
  protocol.handle('sistema', async (pedido) => {
    const url = new URL(pedido.url);
    let rel = decodeURIComponent(url.pathname);
    if (rel.startsWith('/vendor/')) {
      const arquivo = arquivoVendor(rel.slice('/vendor/'.length));
      if (!arquivo || !fs.existsSync(arquivo)) return new Response('404', { status: 404 });
      return new Response(await fsp.readFile(arquivo), { headers: { 'Content-Type': mimeDe(arquivo) } });
    }
    // Os arquivos do disco C: (o Visualizador de imagens e o Reprodutor de mídia), só para ler.
    if (rel.startsWith('/disco/')) {
      let arquivo;
      try { arquivo = disco.real(rel.slice('/disco/'.length)); } catch { return new Response('404', { status: 404 }); }
      return soConteudo(await servirArquivo(arquivo, pedido.headers.get('range')));
    }
    // As miniaturas das fotos no Explorador (num cache dos dados do programa).
    if (rel.startsWith('/miniatura/')) {
      let arquivo;
      try { arquivo = disco.real(rel.slice('/miniatura/'.length)); } catch { return new Response('404', { status: 404 }); }
      return soConteudo(await miniatura(arquivo, path.join(app.getPath('userData'), 'miniaturas'), nativeImage));
    }
    // Os papéis de parede do usuário (as cópias em papeis-de-parede, nos dados de cada usuário).
    if (rel.startsWith('/papel/')) return soConteudo(await papeis().servir(rel.slice('/papel/'.length)));
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
  protocol.handle('dos', (pedido) => servirEmulador(pedido, RAIZ_APP));
  protocol.handle('mac', (pedido) => servirEmuladorMac(pedido, RAIZ_APP));
}

/* ---------- A janela ---------- */

function criarJanela() {
  const c = config.obter();
  // No Mac, as duas telas usam a tela cheia "simples" (a nativa fica num monitor só): a janela abre
  // sem a nativa e se espalha logo depois de aparecer.
  const espalharAoAbrir = !MODO_SISTEMA && !!c.telaCheia && !process.env.RETRO_JANELA && querDuasTelas();
  // O monitor escolhido em Painel › Aparência (fora do modo sistema), se ainda estiver ligado.
  const monitor = (!MODO_SISTEMA && c.tela && c.tela.monitor != null && screen.getAllDisplays().find((d) => d.id === c.tela.monitor)) || screen.getPrimaryDisplay();
  const area = monitor.workArea;
  const largura = Math.min(1280, area.width);
  const altura = Math.min(800, area.height);
  janela = new BrowserWindow({
    x: area.x + Math.round((area.width - largura) / 2),
    y: area.y + Math.round((area.height - altura) / 2),
    width: largura,
    height: altura,
    minWidth: 640,
    minHeight: 480,
    fullscreen: MODO_SISTEMA || (!!c.telaCheia && !process.env.RETRO_JANELA && !(espalharAoAbrir && process.platform === 'darwin')),
    enableLargerThanScreen: process.platform === 'darwin', // no Mac, para a janela poder cobrir dois monitores
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
  janela.once('ready-to-show', () => { janela.show(); if (espalharAoAbrir) setTimeout(() => espalhar().catch(() => { }), 300); });
  if (MODO_SISTEMA) for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, () => setTimeout(ajustarNaPrincipal, 300));
  else for (const ev of ['display-added', 'display-removed', 'display-metrics-changed']) screen.on(ev, () => setTimeout(monitoresMudaram, 400));
  // A área de trabalho fica sabendo onde está cada tela dentro da janela.
  let esperaTelas = null;
  const telasDepois = () => { clearTimeout(esperaTelas); esperaTelas = setTimeout(() => avisarTelas(), 150); };
  janela.on('resize', telasDepois);
  janela.on('move', telasDepois);
  // No Windows, a janela espalhada fica por cima das barras de tarefas do sistema só enquanto está em
  // foco (o Windows só esconde a barra do monitor em que a janela "está"); ao trocar de programa, solta.
  if (process.platform === 'win32') {
    janela.on('focus', () => { if (espalhada && !cheiaDoVideo) janela.setAlwaysOnTop(true, 'screen-saver'); });
    janela.on('blur', () => { if (janela.isAlwaysOnTop()) janela.setAlwaysOnTop(false); });
  }
  // No modo sistema, o Retro Computer é a tela inteira: não há para onde sair.
  if (MODO_SISTEMA) janela.on('leave-full-screen', () => setImmediate(() => janela && !janela.isDestroyed() && janela.setFullScreen(true)));
  janela.loadURL('sistema://retro/index.html' + (process.env.RETRO_RAPIDO ? '?rapido' : ''));

  const wc = janela.webContents;
  // A área de trabalho não navega para fora; links externos abrem no navegador do sistema.
  wc.on('will-navigate', (e, url) => {
    if (!PAGINA_SISTEMA.test(url)) e.preventDefault();
  });
  // Um quadro dentro dela (um programa Craft, o DOS) nunca abre uma página de sistema://: ela
  // teria a origem da área de trabalho e alcançaria a ponte.
  wc.on('will-frame-navigate', (d) => {
    if (!d.isMainFrame && /^sistema:/i.test(String(d.url || ''))) d.preventDefault();
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
  // F11 alterna a tela cheia (também dentro dos programas); Ctrl+Shift+Esc abre o Monitor do sistema.
  wc.on('before-input-event', (e, entrada) => {
    if (entrada.type === 'keyDown' && entrada.key === 'F11') {
      e.preventDefault();
      alternarTelaCheia();
    } else if (entrada.type === 'keyDown' && entrada.key === 'Escape' && entrada.control && entrada.shift && !MODO_SISTEMA) {
      e.preventDefault();
      enviar('sistema:tecla', 'monitor');
    }
  });
  janela.on('enter-full-screen', () => enviar('sistema:telaCheia', true));
  janela.on('leave-full-screen', () => enviar('sistema:telaCheia', false));
  // Um vídeo em tela cheia, com as duas telas: ele fica no monitor do ponteiro (e não partido entre
  // os dois); ao sair, a janela volta a cobrir os monitores.
  wc.on('enter-html-full-screen', () => {
    if (!espalhada) return;
    cheiaDoVideo = true;
    janela.setBounds(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).bounds);
  });
  wc.on('leave-html-full-screen', () => {
    if (!cheiaDoVideo) return;
    cheiaDoVideo = false;
    setTimeout(() => { if (espalhada) espalhar().catch(() => { }); }, 300);
  });
  janela.on('close', (e) => {
    if (!janela.__podeFechar) {
      // Fechar pela janela do sistema passa pelo "Desligar" da área de trabalho.
      e.preventDefault();
      enviar('sistema:pedidoDesligar');
    }
  });
  janela.on('closed', () => { janela = null; });
}

/** Leva a janela para um monitor (na tela cheia, ela sai e volta nele). */
function levarParaMonitor(d) {
  const cheia = janela.isFullScreen();
  const ir = () => {
    const a = d.workArea;
    const w = Math.min(janela.getBounds().width, a.width);
    const hh = Math.min(janela.getBounds().height, a.height);
    janela.setBounds({ x: a.x + Math.round((a.width - w) / 2), y: a.y + Math.round((a.height - hh) / 2), width: w, height: hh });
    if (cheia) janela.setFullScreen(true);
  };
  if (cheia) { janela.once('leave-full-screen', () => setTimeout(ir, 50)); janela.setFullScreen(false); } else ir();
}

/* ---------- As duas telas em tela cheia (fora do modo sistema) ---------- */

// Os monitores ligados (ou os de mentira dos testes, RETRO_MONITORES_FALSOS), nos pontos do sistema.
function monitoresLigados() {
  const falsos = monitoresMod.monitoresFalsos(process.env.RETRO_MONITORES_FALSOS);
  if (falsos) return falsos;
  const p = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d) => ({ id: d.id, ...d.bounds, principal: d.id === p.id, escala: d.scaleFactor }));
}

let espalhada = false; // a janela cobre todos os monitores agora
let cheiaDoVideo = false; // um vídeo em tela cheia levou a janela para um monitor só

/** A opção de Painel › Aparência está ligada, e há mais de um monitor? */
function querDuasTelas() {
  return !MODO_SISTEMA && !!(config.obter().tela || {}).duas && monitoresLigados().length > 1;
}

/** A janela está em tela cheia (no Mac, também a "simples", a das duas telas)? */
function emTelaCheia() {
  if (!janela || janela.isDestroyed()) return false;
  return janela.isFullScreen() || (process.platform === 'darwin' && janela.isSimpleFullScreen());
}

/** No Mac, a janela só aparece nos dois monitores sem os Spaces separados por monitor. */
function spacesJuntosNoMac() {
  if (process.platform !== 'darwin') return Promise.resolve(true);
  return new Promise((ok) => execFile('defaults', ['read', 'com.apple.spaces', 'spans-displays'], (e, saida) => ok(!e && monitoresMod.spacesJuntos(saida))));
}

/**
 * A janela cobre todos os monitores. No Windows (e no Linux fora do modo sistema), ela entra na tela
 * cheia de sempre e cresce para a união deles; no Mac, a tela cheia nativa fica num monitor só, e a
 * "simples" (sem Space próprio) é a que cresce. Devolve se conseguiu.
 */
async function espalhar() {
  if (!janela || janela.isDestroyed() || !querDuasTelas() || !(await spacesJuntosNoMac())) return false;
  const u = monitoresMod.uniao(monitoresLigados());
  if (process.platform === 'darwin') {
    if (janela.isFullScreen()) await new Promise((ok) => { janela.once('leave-full-screen', () => setTimeout(ok, 300)); janela.setFullScreen(false); setTimeout(ok, 2000); });
    if (!janela.isSimpleFullScreen()) janela.setSimpleFullScreen(true);
  } else if (!janela.isFullScreen()) {
    await new Promise((ok) => { janela.once('enter-full-screen', ok); janela.setFullScreen(true); setTimeout(ok, 1500); });
  }
  espalhada = true;
  janela.setBounds(u);
  if (process.platform === 'win32' && janela.isFocused()) janela.setAlwaysOnTop(true, 'screen-saver');
  avisarTelas();
  conferirEspalhada(u);
  return true;
}

/**
 * A janela ficou onde foi pedida? A tela cheia que termina depois (o Windows, o X sem gerenciador de
 * janelas) pode devolvê-la a um monitor só ou à posição de antes: ela volta ao lugar, até duas vezes.
 */
function conferirEspalhada(u, vezes = 2) {
  setTimeout(() => {
    if (!espalhada || cheiaDoVideo || !janela || janela.isDestroyed()) return;
    const b = janela.getBounds();
    const longe = Math.abs(b.x - u.x) > 2 || Math.abs(b.y - u.y) > 2 || Math.abs(b.width - u.width) > 2 || Math.abs(b.height - u.height) > 2;
    if (!longe) return;
    janela.setBounds(u);
    avisarTelas();
    if (vezes > 1) conferirEspalhada(u, vezes - 1);
  }, 500);
}

/** Volta para um monitor só: a tela cheia de sempre no principal ou, com sairDaCheia, a janela. */
function juntar({ sairDaCheia = false } = {}) {
  if (!janela || janela.isDestroyed()) return;
  const estava = espalhada;
  espalhada = false;
  if (janela.isAlwaysOnTop()) janela.setAlwaysOnTop(false);
  if (process.platform === 'darwin') {
    if (janela.isSimpleFullScreen()) janela.setSimpleFullScreen(false);
    if (!sairDaCheia) janela.setFullScreen(true);
  } else if (sairDaCheia) {
    janela.setFullScreen(false);
  } else if (estava) {
    janela.setBounds(screen.getPrimaryDisplay().bounds);
  }
  avisarTelas();
}

/** Entra ou sai da tela cheia (F11, Painel › Aparência): com as duas telas, espalhada. */
async function definirTelaCheia(v) {
  if (!janela || janela.isDestroyed()) return;
  if (!v) { if (espalhada) juntar({ sairDaCheia: true }); else janela.setFullScreen(false); return; }
  if (!(await espalhar())) janela.setFullScreen(true);
}

/** Um monitor entrou, saiu ou mudou: a janela se espalha de novo, ou volta para um só. */
function monitoresMudaram() {
  if (!janela || janela.isDestroyed() || cheiaDoVideo) return;
  if (espalhada && !querDuasTelas()) juntar();
  else if (querDuasTelas() && emTelaCheia()) espalhar().catch(() => { });
  avisarTelas('monitores');
}

/** As telas vistas de dentro da janela, para a área de trabalho (os pontos da janela, sem o zoom da página). */
function telasDaJanela() {
  if (!janela || janela.isDestroyed()) return { telas: [], largura: 0, altura: 0 };
  const b = janela.getContentBounds();
  const telas = espalhada ? monitoresMod.telasNaJanela(b, monitoresLigados()) : [];
  return { telas: telas.length > 1 ? telas : [], largura: b.width, altura: b.height };
}

function avisarTelas(motivo = '') {
  if (cheiaDoVideo) return;
  enviar('sistema:telas', { ...telasDaJanela(), motivo });
}

/** No modo sistema, a janela fica sempre na tela principal, inteira (também depois de uma troca de telas). */
function ajustarNaPrincipal() {
  if (!janela || janela.isDestroyed()) return;
  const b = screen.getPrimaryDisplay().bounds;
  const j = janela.getBounds();
  if (j.x === b.x && j.y === b.y && j.width === b.width && j.height === b.height) return;
  janela.setFullScreen(false);
  janela.setBounds(b);
  janela.setFullScreen(true);
}

/** No modo sistema, a outra tela (estendida) mostra a cor da área de trabalho, e não o preto do X. */
function fundoDaRaiz() {
  const cor = String((config.obter().papel || {}).cor || '#008080');
  if (!/^#[0-9a-f]{6}$/i.test(cor) || process.env.RETRO_ENERGIA_FALSA) return;
  require('node:child_process').execFile('xsetroot', ['-solid', cor], () => { });
}

function alternarTelaCheia() {
  if (!janela || MODO_SISTEMA) return;
  const nova = !emTelaCheia();
  config.definir({ telaCheia: nova });
  definirTelaCheia(nova).catch(() => { });
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

/** Baixa um arquivo pequeno de um site com a sessão do Navegador (o ícone, o manifesto). */
async function baixarDoSite(url, limite, como) {
  if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('endereco');
  const s = session.fromPartition(SESSAO_NAVEGADOR);
  const r = await comLimite(s.fetch(String(url)), 15000);
  if (!r.ok) throw new Error(String(r.status));
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > limite) throw new Error('grande');
  if (como === 'json') return JSON.parse(buf.toString('utf8'));
  return { tipo: (r.headers.get('content-type') || '').split(';')[0].trim(), dados: 'data:' + ((r.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()) + ';base64,' + buf.toString('base64') };
}
const enderecoDaWeb = (url) => /^https?:\/\//i.test(url) || url === 'about:blank';

/** A pasta dos downloads: Meus documentos › Recebidos (o caminho interno). */
function pastaRecebidos() {
  const p = config.obter().pastas || idioma.PASTAS[idioma.idioma()];
  return `${p.documentos}/${p.recebidos || idioma.PASTAS[idioma.idioma()].recebidos}`;
}

/** Os downloads vão para "Meus documentos/Recebidos" (com um nome livre) e avisam a área de trabalho. */
function receberDownloads(s, { deProgramas = false } = {}) {
  s.on('will-download', (_e, item) => {
    try {
      const nome = path.basename(String(item.getFilename() || '').replace(/\\/g, '/')) || 'arquivo';
      // Um programa Craft não tem por que baixar um programa ou um roteiro.
      if (deProgramas && ehExecutavel(nome)) { item.cancel(); return; }
      const relPasta = pastaRecebidos();
      const pasta = disco.real(relPasta);
      fs.mkdirSync(pasta, { recursive: true });
      let alvo = path.join(pasta, nome);
      for (let i = 2; fs.existsSync(alvo); i++) {
        const ext = path.extname(nome);
        alvo = path.join(pasta, `${path.basename(nome, ext)} (${i})${ext}`);
      }
      item.setSavePath(alvo);
      item.once('done', (_ev, estado) => {
        if (estado !== 'completed') return;
        marcarDaInternet(alvo, item.getURL());
        enviar('sistema:recebido', `${relPasta}/${path.basename(alvo)}`);
      });
    } catch {
      item.cancel();
    }
  });
}

/**
 * A marca de "veio da internet", que o computador principal confere ao abrir o arquivo (o
 * SmartScreen do Windows, o Gatekeeper do macOS): o Zone.Identifier no Windows e o atributo de
 * quarentena no macOS.
 */
function marcarDaInternet(arquivo, url) {
  try {
    const origem = /^https?:\/\//i.test(String(url || '')) ? String(url).replace(/[\r\n]/g, '') : '';
    if (process.platform === 'win32') {
      fs.writeFileSync(arquivo + ':Zone.Identifier', `[ZoneTransfer]\r\nZoneId=3\r\n${origem ? `HostUrl=${origem}\r\n` : ''}`);
    } else if (process.platform === 'darwin') {
      const quando = Math.floor(Date.now() / 1000).toString(16);
      spawn('xattr', ['-w', 'com.apple.quarantine', `0081;${quando};Retro Computer;`, arquivo], { stdio: 'ignore' }).on('error', () => { });
    }
  } catch { }
}

/**
 * A marca de "baixado da internet" vai junto quando um arquivo sai do disco C: (para o computador
 * principal ou um pendrive): o sistema de lá continua avisando antes de abrir um programa baixado.
 * O Windows guarda a marca no fluxo Zone.Identifier; o Mac, no atributo com.apple.quarantine.
 */
async function copiarMarcas(origem, destino) {
  try {
    if (process.platform === 'win32') {
      let n = 0;
      const andar = async (o, d) => {
        if (++n > 20000) return;
        const st = await fsp.stat(o);
        if (st.isDirectory()) {
          for (const nome of await fsp.readdir(o)) await andar(path.join(o, nome), path.join(d, nome));
          return;
        }
        let marca = null;
        try { marca = await fsp.readFile(o + ':Zone.Identifier'); } catch { return; }
        await fsp.writeFile(d + ':Zone.Identifier', marca).catch(() => { });
      };
      await andar(origem, destino);
    } else if (process.platform === 'darwin') {
      const xattr = (args) => new Promise((resolve) => execFile('xattr', args, { maxBuffer: 16 << 20 }, (e, s) => resolve(e && !s ? '' : String(s || ''))));
      const pasta = (await fsp.stat(origem)).isDirectory();
      const marcas = [];
      if (!pasta) {
        const v = (await xattr(['-p', 'com.apple.quarantine', origem])).trim();
        if (v) marcas.push([destino, v]);
      } else {
        // "caminho: valor" para cada arquivo marcado (o valor não tem ": ").
        for (const linha of (await xattr(['-r', '-p', 'com.apple.quarantine', origem])).split('\n')) {
          const i = linha.lastIndexOf(': ');
          if (i < 0) continue;
          const rel = path.relative(origem, linha.slice(0, i));
          if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
          marcas.push([path.join(destino, rel), linha.slice(i + 2).trim()]);
        }
      }
      for (const [d, v] of marcas.slice(0, 20000)) await xattr(['-w', 'com.apple.quarantine', v, d]);
    }
  } catch { }
}

/**
 * O Navegador: uma sessão separada da área de trabalho e dos programas.
 * Ele se apresenta como o Chrome, sem os nomes do Electron e do aplicativo (o login do Google,
 * por exemplo, recusa navegadores "embutidos"); câmera, microfone, localização e notificações
 * ficam recusados.
 */
// As respostas às permissões dadas sem "lembrar": valem até o Retro Computer fechar.
let destaVez = {};
// Só conexões seguras (https.js): os endereços trocados para https, os sites que o usuário
// escolheu abrir sem segurança (até fechar) e os que mandam de volta para o http.
const subidos = new Subidos();
const liberadosHttp = new Set();
const recusadosHttp = new Set();

/** Apaga os cookies, os dados dos sites e os arquivos temporários do Navegador. */
function limparNavegador() {
  const s = session.fromPartition(SESSAO_NAVEGADOR);
  return s.clearStorageData().then(() => s.clearCache());
}

/**
 * O login do Google recusa os navegadores embutidos num aplicativo ("Esse navegador ou app pode não
 * ser seguro"). Nas páginas de login dele, o Navegador se apresenta como o Firefox ou como o Chrome
 * (login-google.js) e, se o Google recusar, troca de jeito e recomeça o login; no resto da
 * navegação, ele continua como o Chrome de sempre, sem o "Electron".
 */
const modoLoginGoogle = () => loginGoogle.modoValido((config.obter().navegador || {}).loginGoogle);

function configurarNavegador() {
  const s = session.fromPartition(SESSAO_NAVEGADOR);
  s.setUserAgent(s.getUserAgent().replace(/\s(Electron|Retro-?Computer)\/\S+/gi, ''));
  const agenteChrome = s.getUserAgent();
  const versao = process.versions.chrome;
  const agenteDoLogin = () => loginGoogle.agenteLogin(modoLoginGoogle(), { versao });
  s.webRequest.onBeforeSendHeaders({ urls: ['https://accounts.google.com/*'] }, (d, cb) => {
    cb({ requestHeaders: loginGoogle.cabecalhosLogin(d.requestHeaders, modoLoginGoogle(), { versao }) });
  });
  // O navigator.userAgent da página acompanha (a página de login também confere por ele); o
  // navigator.userAgentData vem do navegador-preload.js, que pergunta o jeito (navegador:loginGoogle).
  app.on('web-contents-created', (_e, wc) => {
    if (wc.session !== s) return;
    const fluxo = new loginGoogle.FluxoLogin();
    wc.on('did-start-navigation', (ev, urlAntiga, _mesmoDoc, principalAntigo) => {
      const url = (ev && ev.url) || urlAntiga || '';
      const principal = ev && typeof ev.isMainFrame === 'boolean' ? ev.isMainFrame : principalAntigo;
      if (!principal || (ev && ev.isSameDocument)) return;
      fluxo.navegou(url);
      const ua = loginGoogle.LOGIN_GOOGLE.test(url) ? agenteDoLogin() : agenteChrome;
      try { if (wc.getUserAgent() !== ua) wc.setUserAgent(ua); } catch { }
    });
    // Recusado: o outro jeito, do começo do login; recusado nos dois, a sugestão do Firefox.
    wc.on('did-navigate', (_ev, url) => {
      if (!loginGoogle.RECUSADO.test(url || '')) return;
      const proximo = fluxo.recusado(modoLoginGoogle());
      if (!proximo) return enviar('navegador:loginRecusado');
      config.definir({ navegador: { loginGoogle: proximo } });
      try { wc.setUserAgent(loginGoogle.agenteLogin(proximo, { versao })); wc.loadURL(fluxo.inicio); } catch { }
    });
  });
  ipcMain.on('navegador:loginGoogle', (e) => {
    e.returnValue = e.sender.session === s ? loginGoogle.scriptLogin(modoLoginGoogle(), versao) : '';
  });
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
  // Só conexões seguras (Painel › Segurança, ligado por padrão): o http:// das páginas vira https://.
  s.webRequest.onBeforeRequest({ urls: ['http://*/*'] }, (d, cb) => {
    if (d.resourceType !== 'mainFrame' || (config.obter().navegador || {}).soHttps === false) return cb({});
    const seguro = paraHttps(d.url, liberadosHttp);
    if (!seguro) return cb({});
    // A versão segura mandou de volta para o http: o site não tem HTTPS de verdade. A carga é
    // cancelada (sem o did-fail-load), e a janela do Navegador daquela página mostra o aviso.
    if (subidos.voltou(d.url)) {
      recusadosHttp.add(d.url);
      enviar('navegador:semSeguranca', { id: d.webContentsId, url: d.url });
      return cb({ cancel: true });
    }
    subidos.guardar(seguro, d.url);
    cb({ redirectURL: seguro });
  });
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
      // Os links com target, o Ctrl+clique e o botão do meio: uma aba nova na janela da página.
      enviar('navegador:janela', url, wc.id, disposition);
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

// A tecla do logotipo apertada e solta sozinha abre o Iniciar (no modo sistema).
let logotipoSozinho = false;

/**
 * Os atalhos do Windows, em todas as janelas (também dentro do Navegador e dos programas):
 * Alt+F4, Alt+Tab e a tecla do logotipo com uma letra, um número ou uma seta (atalhos.js).
 */
function atalhosDoWindows() {
  app.on('web-contents-created', (_e, wc) => {
    wc.on('before-input-event', (e, input) => {
      if (input.type === 'keyUp') {
        if (input.key === 'Alt') enviar('sistema:tecla', 'alternar-fim');
        return;
      }
      const acao = acaoDaTecla(input, { plataforma: process.platform, sistema: MODO_SISTEMA });
      if (!acao) return;
      e.preventDefault();
      enviar('sistema:tecla', acao);
    });
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
  // Também valem com um programa do Linux em foco: o volume, a Captura de tela (Print Screen:
  // a tela; Alt: a janela; Shift: um pedaço), o Monitor do sistema (Ctrl+Shift+Esc) e os atalhos
  // do Windows (Alt+Tab, Alt+F4 e a tecla do logotipo com uma letra, um número ou uma seta).
  for (const [tecla, acao] of [['VolumeUp', 'volume+'], ['VolumeDown', 'volume-'], ['VolumeMute', 'mudo'],
    ['PrintScreen', 'captura'], ['Alt+PrintScreen', 'captura-janela'], ['Shift+PrintScreen', 'captura-regiao'], ['Control+Shift+Escape', 'monitor'],
    ...GLOBAIS_DO_WINDOWS]) {
    try {
      const ok = globalShortcut.register(tecla, () => {
        // A tecla do logotipo já foi usada: soltá-la não abre o Iniciar.
        logotipoSozinho = false;
        // O Alt+Tab (e o que abre algo do Retro Computer) o traz para a frente: o resto das teclas
        // (e o soltar do Alt) chega a ele.
        if (trazORetro(acao) && janela && !janela.isDestroyed()) janela.focus();
        enviar('sistema:tecla', acao);
      });
      if (ok) globais.add(acao);
    } catch { }
  }
  const DO_TECLADO = { AudioVolumeUp: 'volume+', AudioVolumeDown: 'volume-', AudioVolumeMute: 'mudo', BrightnessUp: 'brilho+', BrightnessDown: 'brilho-', LaunchCalculator: 'calculadora', LaunchApplication2: 'calculadora' };
  // O layout escolhido em Painel › Teclado (por cima do da instalação do Linux).
  const t = config.obter().teclado;
  if (t && t.layout) sistemaLinux.aplicarTeclado(t.layout, t.variante).catch(() => { });
  app.on('web-contents-created', (_e, wc) => {
    wc.on('before-input-event', (e, input) => {
      if (input.type === 'keyDown') {
        logotipoSozinho = input.key === 'Meta' && !input.isAutoRepeat;
        let acao = DO_TECLADO[input.key];
        if (input.key === 'PrintScreen') acao = input.alt ? 'captura-janela' : input.shift ? 'captura-regiao' : 'captura';
        if (input.key === 'Escape' && input.control && input.shift) acao = 'monitor';
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
  app.on('will-quit', () => { globalShortcut.unregisterAll(); if (servidorMcp) servidorMcp.fechar(); });
}

/** O cache das miniaturas do Explorador não cresce sem fim: passando de 3000, saem as 1000 mais antigas. */
function podarMiniaturas() {
  const pasta = path.join(app.getPath('userData'), 'miniaturas');
  setTimeout(async () => {
    try {
      const nomes = await fsp.readdir(pasta);
      if (nomes.length <= 3000) return;
      const lista = await Promise.all(nomes.map(async (n) => ({ n, t: (await fsp.stat(path.join(pasta, n))).mtimeMs })));
      lista.sort((a, b) => a.t - b.t);
      for (const { n } of lista.slice(0, 1000)) await fsp.rm(path.join(pasta, n), { force: true });
    } catch { }
  }, 30000).unref();
}

/* ---------- O espaço do disco C: e a limpeza (o programa Discos) ---------- */

const pastaMiniaturas = () => path.join(app.getPath('userData'), 'miniaturas');

/** O tamanho dos arquivos de uma pasta (sem seguir os links). */
async function tamanhoPasta(pasta) {
  let total = 0;
  const pilha = [pasta];
  while (pilha.length) {
    const atual = pilha.pop();
    let itens = [];
    try { itens = await fsp.readdir(atual, { withFileTypes: true }); } catch { continue; }
    for (const d of itens) {
      const c = path.join(atual, d.name);
      if (d.isDirectory()) pilha.push(c);
      else { try { total += (await fsp.lstat(c)).size; } catch { } }
    }
  }
  return total;
}

/** O cache do Navegador e o da área de trabalho: as páginas guardadas para abrir mais rápido. */
const sessoesCache = () => [session.fromPartition(SESSAO_NAVEGADOR), session.defaultSession];

async function usoDoDisco() {
  let cache = 0;
  for (const s of sessoesCache()) { try { cache += await s.getCacheSize(); } catch { } }
  return { ...(await disco.uso()), espaco: await disco.espaco(), cache, miniaturas: await tamanhoPasta(pastaMiniaturas()) };
}

/**
 * Apaga o que o usuário marcou na limpeza: a Lixeira, as versões anteriores com mais de 30 dias, o
 * cache do Navegador e as miniaturas do Explorador (que voltam a ser feitas quando precisar).
 */
async function limparDisco(itens) {
  const antes = await usoDoDisco();
  if (itens.includes('lixeira')) await disco.esvaziarLixeira();
  if (itens.includes('versoes')) await disco.apagarVersoesAntigas(30);
  if (itens.includes('cache')) for (const s of sessoesCache()) { try { await s.clearCache(); } catch { } }
  if (itens.includes('miniaturas')) {
    const pasta = pastaMiniaturas();
    for (const n of await fsp.readdir(pasta).catch(() => [])) await fsp.rm(path.join(pasta, n), { recursive: true, force: true }).catch(() => { });
  }
  const depois = await usoDoDisco();
  const soma = (u) => u.lixeira + u.antigas + u.cache + u.miniaturas;
  return { liberado: Math.max(0, soma(antes) - soma(depois)), uso: depois };
}

/**
 * Avisa a área de trabalho quando um pendrive chega ou sai (e, no modo sistema, monta o que
 * chega). No Windows, a consulta é mais cara (o PowerShell): mais espaçada.
 */
function vigiarUnidades() {
  let antes = null;
  const olhar = async () => {
    try {
      // Gravando uma imagem, as partições que aparecem no pendrive não são montadas no meio.
      if (MODO_SISTEMA && !(discos && discos.ocupado)) await unidades.montarNovas();
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
  // Ler o que o usuário copiou: a área de trabalho, sempre; um programa Craft (código de fora),
  // só depois de perguntar (a resposta lembrada por programa, em permissoesProgramas).
  const idDoPrograma = (url) => { const m = /^programa:\/\/([a-z0-9-]{2,40})(?:[/?#]|$)/.exec(String(url || '')); return m ? m[1] : null; };
  const salvaDoPrograma = (id) => ((config.obter().permissoesProgramas || {})[id] || {})['clipboard-read'];
  s.setPermissionRequestHandler((_wc, permissao, responder, detalhes) => {
    const origem = String(detalhes.requestingUrl || '');
    if (!permitidas.has(permissao) || !/^(sistema|programa):\/\//.test(origem)) return responder(false);
    const id = idDoPrograma(origem);
    if (permissao !== 'clipboard-read' || !id) return responder(true);
    const salva = salvaDoPrograma(id);
    if (typeof salva === 'boolean') return responder(salva);
    const inst = programas && programas.instalado(id);
    pedirAoUsuario('navegador:permissao', { origem: `programa://${id}`, permissao: 'clipboard-read', programa: (inst && inst.nome) || id }).then((r) => {
      if (r && r.lembrar) config.definir({ permissoesProgramas: { [id]: { 'clipboard-read': !!r.permitir } } });
      responder(!!(r && r.permitir));
    });
  });
  s.setPermissionCheckHandler((_wc, permissao, origem) => {
    if (!permitidas.has(permissao) || !/^(sistema|programa):\/\//.test(String(origem || ''))) return false;
    const id = idDoPrograma(origem);
    return permissao !== 'clipboard-read' || !id || salvaDoPrograma(id) === true;
  });
  // Um download que escapar do adaptador vai para "Meus documentos/Recebidos".
  receberDownloads(s, { deProgramas: true });
}

/* ---------- Ponte com a área de trabalho ---------- */

/**
 * Só a própria área de trabalho chama o processo principal: a janela do Retro Computer e, nela,
 * o quadro principal em sistema://retro (os programas Craft rodam em quadros dentro dela e falam
 * só por mensagens; as páginas do Navegador ficam noutro webContents).
 */
// A página da área de trabalho (com o "?rapido" e a âncora, se houver).
const PAGINA_SISTEMA = /^sistema:\/\/retro\/(index\.html)?([?#].*)?$/;

function deQuemPode(e) {
  if (!janela || janela.isDestroyed() || e.sender !== janela.webContents) return false;
  const q = e.senderFrame;
  return !!q && !q.parent && PAGINA_SISTEMA.test(q.url || '');
}

function tratar(canal, fn) {
  ipcMain.handle(canal, async (e, ...args) => {
    if (!deQuemPode(e)) throw new Error('origem');
    try {
      return { ok: true, valor: await fn(...args) };
    } catch (erro) {
      return { ok: false, erro: erro.message || String(erro), codigo: erro.codigo };
    }
  });
}

/* ---------- O Claude ajusta o Retro Computer (o servidor MCP, mcp.js) ---------- */

let servidorMcp = null;
const pendentesMcp = new Map();
let nMcp = 0;

/** O mcp-retro.js fora do app.asar (o Electron como Node o lê do disco, desempacotado). */
const scriptMcp = () => path.join(__dirname, 'mcp-retro.js').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);

function arquivosMcp() {
  if (!servidorMcp) return null;
  try { return servidorMcp.arquivos({ executavel: process.execPath, script: scriptMcp(), raiz: disco.raiz }); } catch { return null; }
}

/** Uma ferramenta que a área de trabalho resolve (os programas, os atalhos, os avisos). */
function pedirTela(nome, args) {
  return new Promise((resolve, reject) => {
    const id = ++nMcp;
    pendentesMcp.set(id, { resolve, reject });
    if (!enviar('mcp:pedido', { id, nome, args })) { pendentesMcp.delete(id); reject(new Error(tr('A área de trabalho não está aberta.'))); return; }
    setTimeout(() => { if (pendentesMcp.delete(id)) reject(new Error(tr('A área de trabalho não respondeu.'))); }, 60000);
  });
}

/** Um caminho do disco C: como o Claude escreve: a pasta de verdade, "C:\\Meus documentos\\x" ou o relativo. */
function caminhoDoDisco(c) {
  let s = String(c || '').trim();
  // A pasta de verdade do disco (o terminal do Claude começa nela).
  if (s === disco.raiz || s.startsWith(disco.raiz + path.sep)) return path.relative(disco.raiz, s).split(path.sep).join('/');
  // "C:\\…" ou "C:/…", como o disco aparece no Retro Computer.
  s = s.replace(/^[a-z]:[\\/]?/i, '');
  if (path.isAbsolute(s)) throw new Error(tr('Caminho fora do disco.'));
  return s.replace(/\\/g, '/');
}

async function executarMcp(nome, a) {
  switch (nome) {
    case 'estado': {
      const tela = await pedirTela('estado', {}).catch(() => ({}));
      return {
        versao: app.getVersion(), plataforma: process.platform, modoSistema: MODO_SISTEMA, portatil: !!PORTATIL,
        idioma: idioma.idioma(), discoC: disco.raiz,
        craftInstalados: programas.instalados().map((p) => ({ id: p.id, nome: p.nome, versao: p.versao })),
        ...tela,
      };
    }
    case 'ler_configuracoes': {
      const { disco: _d, ...resto } = semSegredos(config.obter());
      return resto;
    }
    case 'mudar_configuracoes': {
      const { aceitas, recusadas } = filtrarConfig(a.configuracoes);
      if (!Object.keys(aceitas).length) throw new Error(tr('Nenhuma das chaves pode ser mudada pelo Claude: {chaves}', { chaves: recusadas.join(', ') || '?' }));
      config.definir(aceitas);
      enviar('config:mudou', aceitas);
      return { aplicadas: Object.keys(aceitas), recusadas, ...(aceitas.idioma ? { aviso: tr('O idioma novo vale depois de reabrir o Retro Computer.') } : {}) };
    }
    case 'instalar_programa': {
      const id = String(a.programa || '').replace(/^craft:/, '');
      // Um programa já instalado só sobe de versão (nunca volta atrás nem troca o que veio de um .zip).
      const r = await programas.instalar(id, (p) => enviar('programas:progresso', id, p), { atualizar: !!programas.instalado(id) });
      await pedirTela('programasMudaram', {}).catch(() => { });
      return r;
    }
    case 'mover_para_lixeira': {
      const rel = caminhoDoDisco(a.caminho);
      if (!rel) throw new Error(tr('Não dá para excluir o disco.'));
      await disco.paraLixeira(rel);
      return { naLixeira: rel };
    }
    default:
      return pedirTela(nome, a);
  }
}

function registrarPonte() {
  tratar('mcp:resposta', (id, r) => {
    const p = pendentesMcp.get(id);
    if (!p) return false;
    pendentesMcp.delete(id);
    if (r && r.erro) p.reject(new Error(String(r.erro))); else p.resolve(r ? r.valor : null);
    return true;
  });
  // Configurações
  tratar('config:obter', () => ({
    ...semSegredos(config.obter()),
    plataforma: process.platform,
    modoSistema: MODO_SISTEMA,
    portatil: PORTATIL,
    versaoApp: app.getVersion(),
    temChave: config.temChave(),
    cofre: config.cofreDisponivel(),
    telaCheiaAgora: emTelaCheia(),
    idiomaEfetivo: idioma.idioma(),
    idiomaSistema: app.getLocale(),
    // O arrastar do sistema (para soltar fora do Retro Computer). No Linux sem um idioma UTF-8, o
    // Chromium perde os nomes com acento ("Área de trabalho" chega como "/"): fica o de dentro.
    arrastoSistema: process.platform !== 'linux' || /utf-?8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || ''),
  }));
  tratar('config:definir', (parte) => {
    const proibidas = ['disco', 'versao', 'pastas'];
    for (const k of proibidas) delete parte[k];
    // A senha da tela de bloqueio só muda por bloqueio:definir (conferindo a atual).
    if (parte.bloqueio && typeof parte.bloqueio === 'object') { delete parte.bloqueio.senha; delete parte.bloqueio.temSenha; }
    else if ('bloqueio' in parte) delete parte.bloqueio;
    // As permissões dos programas só mudam pela pergunta (ou pelo Painel, que as tira com null).
    if (parte.permissoesProgramas && typeof parte.permissoesProgramas !== 'object') delete parte.permissoesProgramas;
    // As pastas do computador principal: só ligar ou desligar.
    if ('computador' in parte && !(parte.computador && typeof parte.computador === 'object' && typeof parte.computador.pastas === 'boolean')) delete parte.computador;
    // Os programas padrão: a extensão → o identificador do programa (ou null, o de sempre).
    if ('abrirCom' in parte) {
      const a = parte.abrirCom;
      const ok = a && typeof a === 'object' && !Array.isArray(a) && Object.entries(a).every(([ext, v]) => /^[a-z0-9_-]{1,12}$/.test(ext) && (v === null || (typeof v === 'string' && /^[a-z0-9:_-]{1,80}$/i.test(v))));
      if (!ok) delete parte.abrirCom;
    }
    const r = config.definir(parte);
    if (parte.transferencia && historico) historico.ligar(r.transferencia.historico !== false);
    if (parte.papel && MODO_SISTEMA) fundoDaRaiz();
    return semSegredos(r);
  });
  // Os pendrives: listar, abrir, trazer para o C:, levar do C: e remover com segurança.
  tratar('unidades:listar', () => unidades.listar());
  tratar('unidades:pasta', (id, rel) => unidadeDe(id).listarPasta(String(id), String(rel || '')));
  tratar('unidades:montar', (id) => unidadeDe(id).montar(String(id)));
  tratar('unidades:ejetar', (id) => unidades.ejetar(String(id)));
  tratar('unidades:trazer', (id, rels, destino) => unidadeDe(id).trazer(String(id), (rels || []).map(String), String(destino || '')));
  tratar('unidades:levar', (id, rels, destino) => unidadeDe(id).levar(String(id), (rels || []).map(String), String(destino || '')));
  registrarComputador();
  // Formatar o pendrive (no Linux, com a senha de administrador; no Windows e no Mac, com a
  // confirmação do próprio sistema) e gravar uma imagem nele, pelo programa Discos. Nunca o disco
  // que guarda o disco C:, os dados ou o próprio programa (o modo portátil), nem o do sistema.
  const opcoesFormatar = (o) => ({ sistema: String((o && o.sistema) || 'exfat'), rotulo: String((o && o.rotulo) || ''), inteiro: !!(o && o.inteiro) });
  const alvoDisco = (a) => (a && a.disco ? { disco: String(a.disco) } : { volume: String((a && a.volume) || '') });
  tratar('unidades:formatar', (id, opcoes, senha) => {
    if (String(id).startsWith('pc:')) return { ok: false, naoExterno: true };
    return discos.formatar({ volume: String(id) }, opcoesFormatar(opcoes), String(senha || ''));
  });
  tratar('discos:listar', async () => ({ discos: await discos.listar(), erro: discos.erro }));
  tratar('discos:formatar', (alvo, opcoes, senha) => discos.formatar(alvoDisco(alvo), opcoesFormatar(opcoes), String(senha || '')));
  tratar('discos:gravar', (id, rel, senha) => discos.gravar(String(id), disco.real(String(rel || '')), String(senha || ''), (a) => enviar('discos:andamento', a)));
  tratar('discos:parar', () => discos.parar());
  // O que ocupa o disco C: e a limpeza (só o que o usuário marcou, depois da confirmação na tela).
  tratar('discos:uso', () => usoDoDisco());
  tratar('discos:limpar', (itens) => limparDisco((Array.isArray(itens) ? itens : []).map(String)));
  // A ferramenta de discos do próprio sistema (o Gerenciamento de disco do Windows, o Utilitário de
  // Disco do Mac, o Discos do GNOME), para o que o programa Discos não faz (partições, RAID…).
  tratar('unidades:formatarNoSistema', async () => {
    if (process.platform === 'darwin') return (await shell.openPath('/System/Applications/Utilities/Disk Utility.app')) === '';
    if (process.platform === 'win32') return (await shell.openPath(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'diskmgmt.msc'))) === '';
    return new Promise((resolve) => {
      const p = spawn('gnome-disks', [], { detached: true, stdio: 'ignore' });
      p.on('error', () => resolve(false));
      p.on('spawn', () => { p.unref(); resolve(true); });
    });
  });
  // Os programas do Windows no Linux, pelo WINE (o do sistema ou o do Flathub).
  // Os programas do Windows, como os outros, são de todos os perfis.
  const wine = new Wine({ dados: BASE_DADOS, falso: !!process.env.RETRO_WINE_FALSO });
  // O DOS: a unidade C: (a pasta C:\DOS ou a do programa) vai para o emulador e volta ao guardar.
  const dos = new Dos({ disco });
  tratar('dos:abrir', (rel) => dos.abrir(String(rel || '')));
  tratar('dos:guardar', (pasta, foto, arquivos, pastas) => dos.guardar(String(pasta || ''), foto, arquivos, pastas));
  tratar('dos:tipo', (rel) => dos.tipo(String(rel || '')));
  // O Mac Plus: a ROM e os discos da pasta C:\Mac vão para o emulador; os discos que mudaram voltam.
  const mac = new Mac({ disco });
  tratar('mac:abrir', (rel) => mac.abrir(String(rel || '')));
  tratar('mac:guardar', (foto, discos) => mac.guardar(foto || {}, discos || []));
  tratar('wine:estado', () => wine.estado());
  tratar('wine:abrir', (rel) => wine.abrir(disco.real(String(rel || ''))));
  tratar('wine:programas', () => wine.programas().map((p) => ({ id: p.id, nome: p.nome })));
  tratar('wine:abrirPrograma', (id) => wine.abrirPrograma(String(id || '')));
  // O antivírus sob demanda (o ClamAV no Linux, o Microsoft Defender no Windows).
  const antivirus = new Antivirus({ comoAdmin: sistemaLinux.comoAdmin, falso: !!process.env.RETRO_ANTIVIRUS_FALSO });
  tratar('antivirus:estado', () => antivirus.estado());
  tratar('antivirus:verificar', async (alvo = {}) => {
    let abs;
    if (alvo.tipo === 'unidade') abs = dentroDaUnidade((await unidadeDe(alvo.id).unidade(String(alvo.id))).raiz, String(alvo.rel || ''));
    else abs = disco.real(String(alvo.rel || ''));
    // O que fica dentro do disco C: volta como caminho interno (para a Lixeira); o resto, como está.
    const relDe = (arq) => {
      const r = path.relative(disco.raiz, arq);
      return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : null;
    };
    let ultimo = 0;
    const r = await antivirus.verificar(abs, {
      aoAndar: (x) => { const agora = Date.now(); if (agora - ultimo > 150 || x.n === x.total) { ultimo = agora; enviar('antivirus:andamento', { n: x.n, total: x.total, arquivo: relDe(x.arquivo) || x.arquivo }); } },
      aoAchar: (x) => enviar('antivirus:achou', { arquivo: x.arquivo, rel: relDe(x.arquivo), ameaca: x.ameaca }),
    });
    return { ...r, achados: r.achados.map((x) => ({ arquivo: x.arquivo, rel: relDe(x.arquivo), ameaca: x.ameaca })) };
  });
  tratar('antivirus:parar', () => { antivirus.parar(); return true; });
  tratar('antivirus:instalar', (senha) => antivirus.instalar(String(senha || ''), (s) => enviar('antivirus:instalando', String(s).slice(-2000))));
  tratar('antivirus:atualizar', (senha) => antivirus.atualizar(String(senha || '')));
  tratar('bloqueio:conferir', (senha) => bloqueio.conferir(String(senha || '')));
  registrarPerfis();
  tratar('bloqueio:definir', (atual, nova) => bloqueio.definir(String(atual || ''), String(nova || '')));
  tratar('config:chave', (chave) => config.gravarChave(chave));

  // Disco
  tratar('disco:raiz', () => disco.raiz);
  // Arrastar para fora (para o computador principal, um site do Navegador ou outro programa): o
  // arrastar do próprio sistema, com os arquivos de verdade. O sistema só recebe cópias (o Electron
  // oferece copiar ou criar um atalho, nunca mover), e nada sai do disco C:.
  tratar('disco:arrastar', (rels, icone) => {
    if (!janela || !Array.isArray(rels) || !rels.length) return false;
    const files = rels.slice(0, 500).map((r) => disco.real(String(r))).filter((p) => fs.existsSync(p));
    if (!files.length) return false;
    const pasta = path.join(__dirname, '..', 'sistema', 'icones', '32');
    const nome = /^[a-z0-9-]+$/.test(String(icone || '')) ? String(icone) : 'documento';
    let img = nativeImage.createFromPath(path.join(pasta, nome + '.png'));
    if (img.isEmpty()) img = nativeImage.createFromPath(path.join(pasta, 'documento.png'));
    janela.webContents.startDrag({ files, icon: img });
    return true;
  });
  // O que veio de volta numa soltura: o caminho de cada arquivo no disco C: (null para o de fora).
  tratar('disco:relDe', (caminhos) => (Array.isArray(caminhos) ? caminhos : []).slice(0, 500).map((c) => {
    const p = path.resolve(String(c || ''));
    if (!noDisco(disco.raiz, p) || p === disco.raiz) return null;
    return path.relative(disco.raiz, p).split(path.sep).join('/');
  }));
  tratar('disco:listar', (rel, o) => disco.listar(rel, o));
  tratar('disco:info', (rel) => disco.info(rel));
  tratar('disco:existe', (rel) => disco.existe(rel));
  tratar('disco:ler', (rel) => disco.ler(rel).then((b) => new Uint8Array(b)));
  tratar('disco:lerAtalho', (rel) => disco.lerAtalho(String(rel)));
  tratar('disco:criarAtalho', (pai, nome, chave) => disco.criarAtalho(String(pai), String(nome), String(chave)));
  tratar('papel:adicionar', (rel) => papeis().adicionar(disco.real(String(rel)), { tr }));
  tratar('papel:remover', (arquivo) => papeis().remover(String(arquivo)));
  tratar('disco:lerTexto', (rel) => disco.ler(rel).then((b) => b.toString('utf8')));
  tratar('disco:gravar', (rel, dados, o) => disco.gravar(rel, dados, o));
  tratar('disco:criarPasta', (pai, nome) => disco.criarPasta(pai, nome));
  tratar('disco:nomeLivre', (pai, nome) => disco.nomeLivre(pai, nome));
  tratar('disco:renomear', (rel, nome) => disco.renomear(rel, nome));
  tratar('disco:mover', (rel, destino) => disco.mover(rel, destino));
  tratar('disco:copiar', (rel, destino) => disco.copiar(rel, destino));
  tratar('disco:importar', (caminhos, destino) => disco.importar(caminhos, destino));
  tratar('disco:paraLixeira', (rel) => disco.paraLixeira(rel));
  // O Diário de trabalho: uma linha (o foco concluído, uma nota) e a pasta dele.
  tratar('diario:anotar', (texto, o) => diario.anotar(String(texto || ''), { sempre: !!(o && o.sempre) }));
  tratar('diario:pasta', async () => {
    const pasta = pastaDiario();
    await fsp.mkdir(disco.real(pasta), { recursive: true });
    return { pasta, hoje: diario.arquivoDeHoje() };
  });
  tratar('diario:hoje', () => diario.garantirHoje());
  // O painel de visualização do Explorador: o Word, as planilhas e o texto do OpenDocument.
  const vis = new Visualizador();
  tratar('visualizar:docx', (rel) => vis.docx(disco.real(String(rel || ''))));
  tratar('visualizar:planilha', (rel) => vis.planilha(disco.real(String(rel || '')), path.extname(String(rel || '')).slice(1).toLowerCase()));
  tratar('visualizar:odt', (rel) => vis.odt(disco.real(String(rel || ''))));
  // O Firefox com o visual do Retro Computer (o navegador padrão quando instalado).
  tratar('firefox:estado', () => firefox.estado());
  tratar('firefox:abrir', async (url, o = {}) => {
    const n = config.obter().navegador || {};
    const downloads = disco.real(pastaRecebidos());
    await fsp.mkdir(downloads, { recursive: true }).catch(() => { });
    const endereco = typeof url === 'string' && enderecoDaWeb(url) ? url : '';
    const inicio = typeof o.inicio === 'string' && enderecoDaWeb(o.inicio) ? o.inicio : '';
    return firefox.abrir(endereco, { downloads, soHttps: n.soHttps !== false, limparAoFechar: !!n.limparAoFechar, idioma: idioma.idioma(), inicio, escala: Number(o.escala) || 1 });
  });
  // A cópia de segurança (Painel › Cópia de segurança).
  tratar('copia:escolher', async () => {
    const r = await dialog.showOpenDialog(janela, { title: tr('Copiar o disco C: para qual pasta?'), properties: ['openDirectory', 'createDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    return { destino: r.filePaths[0], valido: destinoValido(disco.raiz, r.filePaths[0]) };
  });
  tratar('copia:fazer', (destino) => fazerCopia(destino ? String(destino) : null, { manual: true }));
  tratar('copia:estado', () => ({ rodando: !!copia.rodando, pasta: pastaCopia() }));
  tratar('copia:abrir', async () => {
    const c = config.obter().copia || {};
    const alvo = c.destino ? path.join(c.destino, pastaCopia()) : '';
    if (!alvo || !fs.existsSync(alvo)) return false;
    return (await shell.openPath(alvo)) === '';
  });
  // A versão de agora de um arquivo, antes de outro programa (o Claude Code) gravar nele.
  tratar('disco:guardarVersao', async (rel) => { const n = disco.normalizar(rel); if ((await disco.info(n)).pasta) return false; await disco.guardarVersao(n); return true; });
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
  // As pastas compactadas (.zip; os .tar só para extrair).
  tratar('compactados:listar', (rel) => compactados.listarZip(disco.real(rel)));
  tratar('compactados:extrair', async (rel, { apenas = null } = {}) => {
    const n = disco.normalizar(rel);
    const pai = path.posix.dirname(n) === '.' ? '' : path.posix.dirname(n);
    const juntar = (nome) => (pai ? `${pai}/${nome}` : nome);
    // Extrai numa pasta escondida e só no fim dá o nome: o pacote que já traz uma pasta só
    // ("Projeto.zip" › "Projeto") vira só ela, sem outra por fora.
    const provisoria = juntar(`.extraindo-${process.pid}-${Date.now()}`);
    await fsp.mkdir(disco.real(provisoria));
    try {
      if (compactados.ehTar(n)) await compactados.extrairTar(disco.real(n), disco.real(provisoria));
      else await compactados.extrairZip(disco.real(n), disco.real(provisoria), { apenas });
    } catch (e) {
      await fsp.rm(disco.real(provisoria), { recursive: true, force: true }); // só o que esta extração gravou
      throw e;
    }
    const dentro = await fsp.readdir(disco.real(provisoria), { withFileTypes: true });
    if (dentro.length === 1 && dentro[0].isDirectory()) {
      const pasta = juntar(await disco.nomeLivre(pai, dentro[0].name));
      await fsp.rename(disco.real(`${provisoria}/${dentro[0].name}`), disco.real(pasta));
      await fsp.rmdir(disco.real(provisoria)); // já vazia
      return { pasta, retirada: dentro[0].name };
    }
    const pasta = juntar(await disco.nomeLivre(pai, compactados.semExtensao(path.posix.basename(n))));
    await fsp.rename(disco.real(provisoria), disco.real(pasta));
    return { pasta, retirada: '' };
  });
  tratar('compactados:compactar', async (rels) => {
    const lista = (rels || []).map((r) => disco.normalizar(r)).filter(Boolean);
    if (!lista.length) throw new Error('vazio');
    const pai = path.posix.dirname(lista[0]) === '.' ? '' : path.posix.dirname(lista[0]);
    const primeiro = path.posix.basename(lista[0]);
    const base = (await disco.info(lista[0])).pasta ? primeiro : primeiro.replace(/\.[^.]+$/, '') || primeiro;
    const nome = await disco.nomeLivre(pai, base + '.zip');
    const zip = pai ? `${pai}/${nome}` : nome;
    await compactados.compactar(lista.map((r) => ({ abs: disco.real(r), nome: path.posix.basename(r) })), disco.real(zip));
    return zip;
  });
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
    if (PORTATIL) throw new Error(tr('No modo portátil, o disco C: é sempre a pasta "Disco C" ao lado do programa.'));
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
    let comando = o.comando;
    if (o.claude) {
      const pedido = typeof o.claude.pedido === 'string' ? o.claude.pedido.slice(0, 4000) : '';
      if (pedido) env.RETRO_PEDIDO = pedido;
      // O Claude que ajusta o Retro Computer: o servidor MCP e o texto que explica onde ele está.
      const arqs = (config.obter().claude || {}).ajustes !== false ? arquivosMcp() : null;
      if (arqs) { env.RETRO_CLAUDE_MCP = arqs.mcp; env.RETRO_CLAUDE_SISTEMA = arqs.sistema; }
      // O tema que combina com as cores da janela e o idioma do Retro Computer (só nesta sessão).
      const aj = ajustesClaude({ tema: o.claude.tema === 'claro' ? 'claro' : 'escuro', idioma: idioma.idioma(), doUsuario: configuracoesDoClaude() });
      let configuracoes = false;
      if (Object.keys(aj).length) {
        try {
          const pasta = path.join(app.getPath('userData'), 'claude');
          fs.mkdirSync(pasta, { recursive: true });
          const arq = path.join(pasta, 'configuracoes.json');
          fs.writeFileSync(arq, JSON.stringify(aj, null, 1), { mode: 0o600 });
          env.RETRO_CLAUDE_AJUSTES = arq;
          configuracoes = true;
        } catch { }
      }
      comando = comandoClaude({ pedido: !!pedido, ajustes: !!arqs, configuracoes });
    }
    return terminais.criar({ cols: o.cols, rows: o.rows, cwd, comando, env });
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
  // As janelas dos programas do Linux (modo sistema): a barra de tarefas mostra e comanda.
  tratar('janelasLinux:listar', () => (janelasLinux ? janelasLinux.listar() : { lista: [], retroAtivo: true }));
  tratar('janelasLinux:ativar', (id) => janelasLinux && janelasLinux.ativar(String(id)));
  tratar('janelasLinux:minimizar', (id) => janelasLinux && janelasLinux.minimizar(String(id)));
  tratar('janelasLinux:fechar', (id) => janelasLinux && janelasLinux.fechar(String(id)));
  tratar('tela:modos', () => tela.modos());
  tratar('tela:definir', (saida, modo) => tela.definir(String(saida), String(modo)));
  tratar('tela:luzNoturna', (k) => tela.luzNoturna(Number(k) || 0));
  // As várias telas: no modo sistema, o arranjo pelo xrandr; fora dele, em qual monitor o Retro Computer fica.
  tratar('tela:telas', () => tela.telas());
  tratar('tela:arranjo', (modo) => tela.definirArranjo(String(modo || '')));
  tratar('tela:monitores', () => {
    // Os de mentira das capturas (a janela fica na principal).
    const falsos = monitoresMod.monitoresFalsos(process.env.RETRO_MONITORES_FALSOS);
    if (falsos) return falsos.map((m) => ({ id: m.id, w: m.width, h: m.height, principal: m.principal, atual: m.principal }));
    const p = screen.getPrimaryDisplay();
    const atual = janela ? screen.getDisplayMatching(janela.getBounds()) : p;
    return screen.getAllDisplays().map((d) => ({ id: d.id, w: Math.round(d.size.width * d.scaleFactor), h: Math.round(d.size.height * d.scaleFactor), principal: d.id === p.id, atual: d.id === atual.id }));
  });
  // As duas telas em tela cheia (Painel › Aparência › Configurações).
  tratar('tela:naJanela', () => telasDaJanela());
  tratar('tela:duasTelas', async () => ({
    possivel: !MODO_SISTEMA && monitoresLigados().length > 1,
    ligada: !!(config.obter().tela || {}).duas,
    espalhada,
    spacesSeparados: process.platform === 'darwin' ? !(await spacesJuntosNoMac()) : false,
  }));
  // Ligar com monitores de escalas diferentes, no Windows, pede para abrir de novo (o.reabrir confirma).
  tratar('tela:usarDuasTelas', async (v, o = {}) => {
    if (MODO_SISTEMA) return { ok: false };
    if (v && process.platform === 'win32' && !ESCALA_UNICA && new Set(screen.getAllDisplays().map((d) => d.scaleFactor)).size > 1) {
      if (!o || !o.reabrir) return { ok: false, precisaReabrir: true };
      config.definir({ telaCheia: true, tela: { duas: true, escalaUnica: true, escalaReal: screen.getPrimaryDisplay().scaleFactor } });
      reabrirApp();
      return { ok: true, reabrindo: true };
    }
    config.definir({ tela: { duas: !!v, ...(v ? {} : { escalaUnica: false }) } });
    if (v && emTelaCheia()) return { ok: await espalhar() };
    if (!v && espalhada) juntar();
    return { ok: true, escalaVoltaAoAbrir: !v && ESCALA_UNICA };
  });
  tratar('tela:usarMonitor', (id) => {
    const d = screen.getAllDisplays().find((x) => x.id === Number(id));
    if (!d || !janela || MODO_SISTEMA) return false;
    levarParaMonitor(d);
    config.definir({ tela: { monitor: d.id } });
    return true;
  });
  // O mouse e o touchpad (Painel › Mouse): as escolhas ficam guardadas e voltam a cada abertura.
  tratar('mouse:estado', () => mouse.estado());
  tratar('mouse:aplicar', async (escolhas) => {
    config.definir({ mouse: limparEscolhas(escolhas) });
    return mouse.aplicar(config.obter().mouse);
  });
  // As opções de energia (só no modo sistema; fora dele, as do computador principal).
  tratar('energia:estado', async () => (energiaOpcoes ? { disponivel: true, ...(await energiaOpcoes.estado()) } : { disponivel: false }));
  tratar('energia:definir', async (opcoes) => {
    if (!energiaOpcoes) return { ok: false };
    const { opcoesDe } = require('./energia');
    config.definir({ energia: opcoesDe(opcoes) });
    await energiaOpcoes.aplicarTela();
    return { ok: true, opcoes: energiaOpcoes.opcoes() };
  });
  tratar('energia:tampa', (acao, senha) => (energiaOpcoes ? energiaOpcoes.definirTampa(String(acao || ''), String(senha || '')) : { ok: false }));
  tratar('energia:configuracoesDoSistema', () => {
    if (process.platform === 'win32') return shell.openExternal('ms-settings:powersleep').then(() => true);
    if (process.platform === 'darwin') return shell.openExternal('x-apple.systempreferences:com.apple.preference.battery').then(() => true);
    return false;
  });
  // A acessibilidade do teclado e do mouse (só no modo sistema, pelo xkbset); o resto é da tela.
  tratar('acessibilidade:estado', () => (acessLinux ? acessLinux.estado() : { disponivel: false }));
  tratar('acessibilidade:aplicar', async (escolhas = {}) => {
    const e = { aderencia: !!escolhas.aderencia, teclasMouse: !!escolhas.teclasMouse };
    config.definir({ acessibilidade: e });
    return acessLinux ? acessLinux.aplicar(e) : { ok: false };
  });
  tratar('acessibilidade:configuracoesDoSistema', () => {
    if (process.platform === 'win32') return shell.openExternal('ms-settings:easeofaccess-keyboard').then(() => true);
    if (process.platform === 'darwin') return shell.openExternal('x-apple.systempreferences:com.apple.preference.universalaccess').then(() => true);
    return false;
  });
  // A data, a hora e o fuso (só no modo sistema, pelo timedatectl).
  const dataHora = MODO_SISTEMA ? (process.env.RETRO_DATAHORA_FALSA ? new DataHoraFalsa() : new DataHora({ comoAdmin: sistemaLinux.comoAdmin })) : null;
  tratar('datahora:estado', () => (dataHora ? dataHora.estado() : { disponivel: false }));
  tratar('datahora:definir', (o, senha) => (dataHora ? dataHora.definir(o || {}, String(senha || '')) : { ok: false }));
  tratar('datahora:configuracoesDoSistema', () => {
    if (process.platform === 'win32') return shell.openExternal('ms-settings:dateandtime').then(() => true);
    if (process.platform === 'darwin') return shell.openExternal('x-apple.systempreferences:com.apple.preference.datetime').then(() => true);
    return false;
  });
  // As saídas de som e os microfones (Painel › Sons); fora do Linux, as configurações do sistema.
  const som = process.env.RETRO_SOM_FALSO ? new SomFalso() : new Som();
  tratar('som:estado', () => som.estado());
  tratar('som:saida', (id) => som.escolherSaida(String(id || '')));
  tratar('som:entrada', (id) => som.escolherEntrada(String(id || '')));
  tratar('som:microfone', (o) => som.microfone(o || {}));
  tratar('som:configuracoesDoSistema', () => {
    if (process.platform === 'win32') return shell.openExternal('ms-settings:sound').then(() => true);
    if (process.platform === 'darwin') return shell.openExternal('x-apple.systempreferences:com.apple.preference.sound').then(() => true);
    return false;
  });
  tratar('mouse:configuracoesDoSistema', () => {
    if (process.platform === 'win32') return shell.openExternal('ms-settings:mousetouchpad').then(() => true);
    if (process.platform === 'darwin') return shell.openExternal('x-apple.systempreferences:com.apple.preference.mouse').then(() => true);
    return false;
  });
  // O histórico da área de transferência (logotipo + V).
  tratar('transferencia:listar', () => historico.listar());
  tratar('transferencia:usar', (id) => historico.usar(id));
  tratar('transferencia:escrever', async (texto) => { await clipboard.writeText(String(texto).slice(0, 1e6)); return true; });
  tratar('transferencia:apagar', (id) => historico.apagar(id));
  tratar('transferencia:fixar', (id, v) => historico.fixar(id, !!v));
  tratar('transferencia:limpar', () => historico.limpar());
  tratar('transferencia:colar', async (id, nativa) => {
    if (!(await historico.usar(id))) return false;
    // Num programa do Linux (modo sistema): ele volta para a frente e recebe o Ctrl+V.
    if (nativa && janelasLinux) {
      await janelasLinux.ativar(String(nativa));
      await new Promise((ok) => setTimeout(ok, 150));
      return janelasLinux.colar();
    }
    // No Retro Computer: cola na posição do cursor (a área de trabalho já devolveu o foco).
    const wc = webContents.getFocusedWebContents() || (janela && janela.webContents);
    if (wc && !wc.isDestroyed()) wc.paste();
    return true;
  });
  // O firewall do Linux (o ufw).
  const firewall = new (process.env.RETRO_FIREWALL_FALSO ? FirewallFalso : Firewall)();
  tratar('firewall:estado', () => firewall.estado());
  tratar('firewall:definir', (ligar, senha) => firewall.definir(!!ligar, String(senha || '')));
  tratar('janelasLinux:encaixar', (id, seta) => janelasLinux && janelasLinux.encaixar(String(id), String(seta)));
  tratar('janelasLinux:minimizarTodas', async () => {
    const n = janelasLinux ? await janelasLinux.minimizarTodas() : 0;
    if (janela && !janela.isDestroyed()) janela.focus();
    return n;
  });
  tratar('navegador:responder', (id, resposta) => { const f = perguntas.get(id); if (f) f(resposta); return !!f; });
  tratar('navegador:esquecerPermissoes', () => {
    destaVez = {};
    config.definir({ navegador: { permissoes: null } });
    return true;
  });
  // Os sites instalados como programas: o manifesto e os ícones do site, buscados pela sessão do
  // Navegador (só http e https, até 1 MB). A área de trabalho escolhe e converte o ícone.
  tratar('navegador:baixarIcone', (url) => baixarDoSite(url, 1 << 20, 'binario'));
  tratar('navegador:manifesto', (url) => baixarDoSite(url, 256 << 10, 'json'));
  tratar('navegador:limparDados', () => limparNavegador());
  // A tela cheia de um site do Navegador: a janela fica em tela cheia enquanto ele estiver, e volta
  // a como estava depois (sem mudar a escolha do Painel › Aparência).
  tratar('navegador:telaCheia', (v) => {
    if (!janela || janela.isDestroyed()) return false;
    if (v && !janela.isFullScreen()) { cheiaPeloSite = true; janela.setFullScreen(true); }
    else if (!v && cheiaPeloSite) { cheiaPeloSite = false; janela.setFullScreen(false); }
    return true;
  });
  // A página que não abriu era a versão segura de um http:// (ou um http:// recusado)? Devolve o endereço sem segurança.
  tratar('navegador:semSeguranca', (url) => {
    const u = String(url || '');
    return subidos.deOnde(u) || (recusadosHttp.has(u) ? u : null);
  });
  // O usuário escolheu abrir o site sem segurança: até fechar o Retro Computer, aquele site fica como é.
  tratar('navegador:abrirSemSeguranca', (url) => {
    try {
      const u = new URL(String(url));
      if (u.protocol !== 'http:') return false;
      liberadosHttp.add(u.host.toLowerCase());
      recusadosHttp.delete(u.toString());
      return true;
    } catch { return false; }
  });
  // A Central de segurança: como a chave do Claude está guardada (o cofre do sistema).
  tratar('seguranca:estado', () => ({
    temChave: config.temChave(),
    cofre: config.cofreDisponivel(),
    // No Linux, sem um chaveiro (o GNOME Keyring ou a carteira do KDE), o "cofre" é só um texto embaralhado.
    chaveiro: process.platform === 'linux' ? (() => { try { return safeStorage.getSelectedStorageBackend(); } catch { return 'unknown'; } })() : null,
  }));
  tratar('sistema:telaCheia', async (v) => {
    if (MODO_SISTEMA) return true;
    if (v == null) alternarTelaCheia();
    else if (janela) { config.definir({ telaCheia: !!v }); await definirTelaCheia(!!v); }
    return emTelaCheia();
  });
  tratar('sistema:abrirLink', (url) => {
    if (!/^https?:\/\//i.test(String(url))) throw new Error(tr('Endereço inválido.'));
    return shell.openExternal(url);
  });
  // A loja de programas (loja.js e lojas.js).
  tratar('loja:info', () => loja.info());
  tratar('loja:buscar', (o) => loja.buscar(o || {}));
  tratar('loja:detalhes', (id, idioma) => loja.detalhes(String(id), String(idioma || 'en')));
  tratar('loja:imagem', (url) => loja.imagem(url));
  tratar('loja:icone', (id, idioma) => (loja.icone ? loja.icone(String(id), String(idioma || 'en')) : null));
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
  tratar('bandeja:perfil', () => sistemaBandeja.perfil.ler());
  tratar('bandeja:definirPerfil', (p) => sistemaBandeja.perfil.definir(String(p)));
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
    // A regra dos acentos (a do Windows no EUA internacional) só muda ao abrir de novo.
    if (r.ok && ACENTOS.modo !== 'sistema') {
      const novo = modoAcentos({ env: IM_ORIGINAL, layout: String(layout), variante: String(variante || ''), arquivo: 'x' }).modo;
      r.reabrir = novo !== ACENTOS.modo;
    }
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
  // Reabre o aplicativo inteiro (para trocar o idioma, que vale também para os programas), no mesmo usuário.
  tratar('sistema:reabrir', () => {
    perfis.gravarAbertura({ perfil: PERFIL, entrou: true });
    reabrirApp();
  });
  tratar('sistema:escalaTela', () => (janela ? screen.getDisplayMatching(janela.getBounds()).scaleFactor : 1));
  // O monitor da janela em pixels de verdade (para o tamanho automático dos pixels da interface).
  tratar('sistema:telaFisica', () => {
    if (!janela) return null;
    // Com as duas telas, vale a principal (a da barra de tarefas e das caixas).
    const d = espalhada ? screen.getPrimaryDisplay() : screen.getDisplayMatching(janela.getBounds());
    // escala: a da página; escalaSistema: a do Windows, para o Tamanho dos pixels automático.
    const escalaSistema = ESCALA_UNICA ? Number((config.obter().tela || {}).escalaReal) || 1 : d.scaleFactor;
    return { escala: d.scaleFactor, escalaSistema, w: Math.round(d.size.width * d.scaleFactor), h: Math.round(d.size.height * d.scaleFactor) };
  });
  // As impressoras (RETRO_IMPRESSORAS_FALSAS: duas de mentira, para os testes).
  const impressoras = new (process.env.RETRO_IMPRESSORAS_FALSAS ? ImpressorasFalsas : Impressoras)({ webContents: () => janela && janela.webContents, BrowserWindow, shell });
  tratar('impressoras:listar', () => impressoras.listar());
  tratar('impressoras:padrao', (nome) => impressoras.definirPadrao(String(nome)));
  tratar('impressoras:fila', (nome) => impressoras.fila(nome ? String(nome) : null));
  tratar('impressoras:cancelar', (id) => impressoras.cancelar(String(id)));
  tratar('impressoras:adicionar', () => impressoras.adicionar());
  tratar('impressoras:imprimir', (html, o) => impressoras.imprimirHtml(String(html), o || {}));
  // Salvar como PDF: a página da impressão (o Bloco de notas, o Visualizador) ou a página do
  // Navegador vira um PDF no disco C: (com a versão de antes guardada, como sempre).
  const destinoPdf = (rel) => {
    const n = disco.normalizar(String(rel || ''));
    if (!/\.pdf$/i.test(n)) throw new Error(tr('O nome do arquivo precisa terminar em .pdf.'));
    return n;
  };
  const papel = () => papelDoPais(app.getLocaleCountryCode());
  tratar('impressoras:pdf', async (html, rel) => disco.gravar(destinoPdf(rel), await impressoras.pdfDeHtml(String(html), { pagina: papel() })));
  tratar('navegador:pdf', async (id, rel) => {
    // Só uma página do Navegador desta janela (um webview dela), nunca outra coisa do Electron.
    const wc = webContents.fromId(Number(id));
    if (!wc || wc.isDestroyed() || wc.getType() !== 'webview' || !janela || wc.hostWebContents !== janela.webContents) throw new Error(tr('A página não está mais aberta.'));
    return disco.gravar(destinoPdf(rel), await wc.printToPDF({ printBackground: true, pageSize: papel() }));
  });
  // As ferramentas de PDF (combinar, separar, extrair e girar): o trabalho com os arquivos de fora
  // fica no processo de trabalho, longe deste e da janela.
  trabalhos = new Trabalhos({ utilityProcess });
  const ferramentasPdf = new FerramentasPdf({ disco, trabalhos, papel });
  tratar('pdf:info', (rels) => ferramentasPdf.info(rels));
  tratar('pdf:combinar', (itens, destino) => ferramentasPdf.combinar(itens, destino));
  tratar('pdf:extrair', (rel, intervalo, destino) => ferramentasPdf.extrair(rel, intervalo, destino));
  tratar('pdf:separar', (rel) => ferramentasPdf.separar(rel));
  tratar('pdf:girar', (rel, graus) => ferramentasPdf.girar(rel, graus));
  // O Bluetooth (no Linux, pelo bluetoothctl; no Windows e no macOS, as configurações do sistema).
  const bluetooth = new (process.env.RETRO_BLUETOOTH_FALSO ? BluetoothFalso : Bluetooth)({ aoPergunta: (p) => enviar('bluetooth:pergunta', p) });
  tratar('bluetooth:estado', () => bluetooth.estado());
  tratar('bluetooth:ligar', (v) => bluetooth.ligar(!!v));
  tratar('bluetooth:aparelhos', () => bluetooth.aparelhos());
  tratar('bluetooth:procurar', () => bluetooth.procurar(12));
  tratar('bluetooth:conectar', (mac) => bluetooth.conectar(String(mac)));
  tratar('bluetooth:desconectar', (mac) => bluetooth.desconectar(String(mac)));
  tratar('bluetooth:esquecer', (mac) => bluetooth.esquecer(String(mac)));
  tratar('bluetooth:parear', (mac) => bluetooth.parear(String(mac)));
  tratar('bluetooth:responder', (r) => { bluetooth.responder(String(r).slice(0, 16)); return true; });
  tratar('bluetooth:cancelar', () => { bluetooth.cancelar(); return true; });
  tratar('bluetooth:configuracoesDoSistema', () => shell.openExternal(process.platform === 'win32' ? 'ms-settings:bluetooth' : 'x-apple.systempreferences:com.apple.BluetoothSettings'));
  // As atualizações do Linux (o apt e o Flathub); o andamento vai para a janela, linha a linha.
  const atualizacoesLinux = new (process.env.RETRO_ATUALIZACOES_FALSAS ? AtualizacoesFalsas : AtualizacoesLinux)({ aoAndar: (s) => enviar('atualizacoesLinux:andamento', String(s).slice(-4000)) });
  tratar('atualizacoesLinux:listar', () => atualizacoesLinux.listar());
  tratar('atualizacoesLinux:procurar', (senha) => atualizacoesLinux.procurar(String(senha || '')));
  tratar('atualizacoesLinux:instalar', (senha) => atualizacoesLinux.instalar(String(senha || '')));
  tratar('atualizacoesLinux:automaticas', (ligar, senha) => atualizacoesLinux.definirAutomaticas(!!ligar, String(senha || '')));
  // O Monitor do sistema.
  const monitor = new Monitor({ app });
  tratar('monitor:amostra', () => monitor.amostra());
  tratar('monitor:processos', () => monitor.processos());
  tratar('monitor:finalizar', (pid, forcar) => monitor.finalizar(pid, !!forcar));
  // A Captura de tela: no modo sistema, a tela inteira (com os programas do Linux por cima);
  // nos outros, o conteúdo da janela do Retro Computer.
  tratar('captura:tirar', async () => {
    if (MODO_SISTEMA) {
      try {
        const d = screen.getDisplayMatching(janela.getBounds());
        const tamanho = { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) };
        const fontes = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: tamanho });
        const f = fontes.find((s) => String(s.display_id) === String(d.id)) || fontes[0];
        if (f && !f.thumbnail.isEmpty()) return new Uint8Array(f.thumbnail.toPNG());
      } catch { }
    }
    return new Uint8Array((await janela.webContents.capturePage()).toPNG());
  });
  tratar('captura:copiar', async (png) => {
    // Desde o Electron 44, a área de transferência recebe itens como os do navigator.clipboard.
    await clipboard.write([new ClipboardItem({ 'image/png': new Blob([Buffer.from(png)], { type: 'image/png' }) })]);
    return true;
  });
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

/* ---------- Os perfis (usuários) ---------- */

/**
 * Fecha e abre de novo (a troca de idioma ou de usuário, o logoff). Na sessão do Linux, quem abre
 * de novo é a própria sessão (o código 75 do sessao.sh): o app.relaunch abriria fora dela, e a
 * sessão terminaria com o código 0.
 */
/**
 * A loja de cada sistema: o Flathub no Linux, o winget no Windows e o Homebrew no Mac.
 * RETRO_LOJA_FALSA=1 é o Flathub de mentira; =winget e =brew, as outras (para as capturas).
 * Depois de instalar ou remover, a lista dos programas do computador é refeita.
 */
function criarLoja() {
  const falsa = process.env.RETRO_LOJA_FALSA;
  const qual = falsa === 'winget' ? 'win32' : falsa === 'brew' ? 'darwin' : falsa ? 'linux' : process.platform;
  const comum = { fetch: (u, o) => net.fetch(u, o), aoInstalar: () => { try { aplicativos.listar(true); } catch { } } };
  if (qual === 'win32') {
    // O winget não abre programas: vale o atalho do menu Iniciar com o nome do pacote.
    const abrirPrograma = async (nome) => {
      const a = acharPorNome(aplicativos.listar(true), nome);
      if (!a) return false;
      await aplicativos.abrir(a.id);
      return true;
    };
    // O ícone de um programa instalado é o do atalho dele no menu Iniciar.
    const iconeLocal = async (nome) => {
      const a = acharPorNome(aplicativos.listar(), nome);
      return a ? aplicativos.icone(a.id) : null;
    };
    return new (falsa ? LojaWingetFalsa : LojaWinget)({ ...comum, abrirPrograma, iconeLocal, pastaDados: app.getPath('userData') });
  }
  if (qual === 'darwin') {
    // O de um aplicativo da pasta Aplicativos é o do próprio .app.
    const iconeLocal = (caminho) => iconeDoArquivo(caminho, { app, shell, nativeImage });
    return new (falsa ? LojaBrewFalsa : LojaBrew)({ ...comum, iconeLocal, pastaDados: app.getPath('userData') });
  }
  return new (falsa ? LojaFalsa : Loja)(comum);
}

function reabrirApp() {
  if (terminais) terminais.fecharTodos();
  if (servidorMcp) servidorMcp.fechar();
  if (janela) janela.__podeFechar = true;
  if (process.env.RETRO_SEM_RELANCAR || (MODO_SISTEMA && process.argv.includes('--sistema'))) {
    setTimeout(() => app.exit(75), 50);
    return;
  }
  app.relaunch();
  setTimeout(() => app.exit(0), 50);
}

/** O config.json de outro perfil (só para ler o resumo da senha e o disco dele). */
function configDoPerfil(id) {
  if (id === PERFIL) return config.obter();
  try { return JSON.parse(fs.readFileSync(path.join(perfis.pastaDados(id), 'config.json'), 'utf8')) || {}; } catch { return {}; }
}

function registrarPerfis() {
  const senhaDe = (id) => (configDoPerfil(id).bloqueio || {}).senha || null;
  const discoDe = (id) => configDoPerfil(id).disco || perfis.discoPadrao(id, discoPadraoPrincipal());
  const estadoPerfis = () => {
    const r = perfis.ler();
    return {
      atual: PERFIL, perguntar: r.perguntar, logon: INICIO.logon, entrou: INICIO.entrou, reaberto: INICIO.reaberto,
      lista: r.perfis.map((p) => ({ id: p.id, nome: p.nome, atual: p.id === PERFIL, temSenha: !!senhaDe(p.id) })),
    };
  };
  // As senhas erradas seguidas atrasam a próxima resposta, como na tela de bloqueio.
  let erros = 0;
  tratar('perfis:estado', () => estadoPerfis());
  // A tela de entrada: confere a senha do usuário escolhido (a dele ou, no Linux, a de entrada).
  // O mesmo usuário continua; outro abre o Retro Computer de novo, já com a senha conferida.
  tratar('perfis:entrar', async (id, senha) => {
    id = String(id || '');
    if (!perfis.perfil(id)) return { ok: false };
    const guardada = senhaDe(id);
    if (guardada) {
      const s = String(senha || '');
      if (!((await confereSenha(s, guardada)) || (await confereLinux(s)))) {
        erros++;
        await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** Math.min(erros - 1, 5))));
        return { ok: false, senhaErrada: true };
      }
    }
    erros = 0;
    perfis.definirUltimo(id);
    if (id === PERFIL) {
      INICIO.logon = false;
      INICIO.entrou = true;
      return { ok: true };
    }
    perfis.gravarAbertura({ perfil: id, entrou: true });
    reabrirApp();
    return { ok: true, reabrindo: true };
  });
  // O logoff: tudo fecha, e a tela de entrada aparece (começando por este usuário).
  tratar('perfis:logoff', () => {
    perfis.gravarAbertura({ perfil: PERFIL, logon: true });
    reabrirApp();
    return true;
  });
  tratar('perfis:criar', (nome) => {
    const r = perfis.criar(String(nome || ''), discoPadraoPrincipal());
    return r.ok ? { ok: true, id: r.perfil.id, disco: discoDe(r.perfil.id), estado: estadoPerfis() } : r;
  });
  tratar('perfis:renomear', (id, nome) => {
    const r = perfis.renomear(String(id || ''), String(nome || ''));
    return r.ok ? { ok: true, estado: estadoPerfis() } : r;
  });
  // Tirar um perfil não apaga nada: a pasta de dados e o disco ficam onde estão (e o usuário sabe onde).
  tratar('perfis:remover', (id) => {
    id = String(id || '');
    const disco = perfis.perfil(id) ? discoDe(id) : null;
    const r = perfis.remover(id, PERFIL);
    return r.ok ? { ok: true, disco, dados: r.dados, estado: estadoPerfis() } : r;
  });
  tratar('perfis:perguntar', (sim) => { perfis.definirPerguntar(!!sim); return estadoPerfis(); });
  tratar('perfis:disco', (id) => (perfis.perfil(String(id || '')) ? discoDe(String(id)) : null));
}

/* ---------- O computador principal (fora do modo sistema) ---------- */

/**
 * As pastas do computador principal ficam à vista do usuário principal (os outros usuários do
 * Retro Computer não são uma barreira de segurança: cada um liga as dele, se quiser), nunca no
 * modo sistema, e só a área de trabalho as alcança (a ponte não atende os programas nem o Navegador).
 */
function foraVisivel() {
  if (MODO_SISTEMA || !pastasFora) return false;
  const c = (config.obter().computador || {}).pastas;
  return typeof c === 'boolean' ? c : PERFIL === PRINCIPAL;
}

/** Os ids 'pc:…' são as pastas do computador principal; os outros, os pendrives. */
function unidadeDe(id) {
  if (!String(id).startsWith('pc:')) return unidades;
  if (!foraVisivel()) throw new Error('unidade');
  return pastasFora;
}

// Os arquivos mandados de fora (o "Enviar para" do Windows e soltar no ícone do programa, pela linha
// de comando; o ícone do Dock e o "Abrir com" do Mac, pelo open-file) esperam a área de trabalho
// ficar pronta (depois da tela de entrada). Uma cópia vai para Meus documentos › Recebidos (o que já
// está no disco C: só é mostrado); nada abre sozinho.
const foraEsperando = [];
let foraPronta = false;
const proprios = () => [process.execPath, app.getAppPath(), RAIZ_APP, process.resourcesPath];

function receberDeFora(caminhos) {
  if (!caminhos || !caminhos.length) return;
  foraEsperando.push(...caminhos);
  if (foraPronta) entregarFora().catch(() => { });
}

async function entregarFora() {
  const lista = foraEsperando.splice(0, foraEsperando.length);
  if (!lista.length || !disco) return;
  const destino = pastaRecebidos();
  const doDisco = lista.filter((p) => noDisco(disco.raiz, p)).map((p) => path.relative(disco.raiz, path.resolve(p)).split(path.sep).join('/'));
  const deFora = lista.filter((p) => !noDisco(disco.raiz, p));
  let rels = [];
  let erro = null;
  try {
    fs.mkdirSync(disco.real(destino), { recursive: true });
    if (deFora.length) rels = (await disco.importar(deFora, destino)).map((f) => f.rel);
  } catch (e) {
    erro = String(e.message || e);
  }
  enviar('computador:recebidos', { pasta: destino, rels, doDisco, erro });
  if (janela) {
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  }
}

// O Mac entrega os arquivos soltos no ícone do Dock (e o "Abrir com" do Finder) por este evento,
// às vezes antes de o aplicativo ficar pronto.
app.on('open-file', (e, caminho) => {
  e.preventDefault();
  receberDeFora([String(caminho)]);
});

// O nome dos atalhos no computador principal (sem ":", que o Windows não aceita em nomes).
const nomeAtalhoDisco = () => tr('Disco C do Retro Computer');
const atalhoEnviarPara = () => path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'SendTo', 'Retro Computer.lnk');
const atalhoMesa = () => path.join(app.getPath('desktop'), nomeAtalhoDisco() + (process.platform === 'win32' ? '.lnk' : ''));
const existeLink = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };

// Os ícones de verdade dos atalhos e dos programas nas pastas do computador principal (o .lnk, o .url
// e o .exe no Windows; o .app no Mac), guardados pelo caminho e pela data do arquivo.
const iconesFora = new Map();
const COM_ICONE = { win32: /\.(lnk|url|exe)$/i, darwin: /\.app$/i };

async function iconesDoComputador(id, rels) {
  const filtro = COM_ICONE[process.platform];
  if (!filtro || !String(id).startsWith('pc:') || !Array.isArray(rels)) return [];
  const u = await unidadeDe(id).unidade(String(id));
  return Promise.all(rels.slice(0, 300).map(async (rel) => {
    rel = String(rel || '');
    if (!filtro.test(rel)) return null;
    try {
      const p = dentroDaUnidade(u.raiz, rel);
      const chave = p + '|' + fs.statSync(p).mtimeMs;
      if (!iconesFora.has(chave)) iconesFora.set(chave, await iconeDoArquivo(p, { app, shell, nativeImage }).catch(() => null));
      return iconesFora.get(chave);
    } catch { return null; }
  }));
}

function registrarComputador() {
  tratar('computador:pastas', () => (foraVisivel() ? pastasFora.listar() : []));
  tratar('computador:icones', (id, rels) => iconesDoComputador(id, rels));
  tratar('computador:estado', () => ({
    disponivel: !MODO_SISTEMA, visivel: foraVisivel(), principal: PERFIL === PRINCIPAL, plataforma: process.platform,
    atalhoMesa: !MODO_SISTEMA && existeLink(atalhoMesa()),
    enviarPara: process.platform === 'win32' && existeLink(atalhoEnviarPara()),
  }));
  // Mostrar uma das pastas no gerenciador de arquivos de lá (só pastas: nada é aberto como programa).
  tratar('computador:mostrar', async (id, rel) => {
    const u = await unidadeDe(String(id)).unidade(String(id));
    const p = dentroDaUnidade(u.raiz, String(rel || ''));
    if (!fs.statSync(p).isDirectory()) throw new Error('pasta');
    return shell.openPath(p);
  });
  // A área de trabalho ficou pronta: entrega o que chegou de fora até agora.
  tratar('computador:pronto', () => { foraPronta = true; entregarFora().catch(() => { }); return true; });
  // Um atalho do disco C: na área de trabalho do computador principal (só quando o usuário pede).
  tratar('computador:atalhoMesa', () => {
    if (MODO_SISTEMA) return { ok: false };
    const alvo = atalhoMesa();
    if (existeLink(alvo)) return { ok: false, existe: true, caminho: alvo };
    try {
      if (process.platform === 'win32') {
        if (!shell.writeShortcutLink(alvo, 'create', { target: disco.raiz, description: tr('O disco C: do Retro Computer') })) return { ok: false };
      } else {
        fs.symlinkSync(disco.raiz, alvo, 'dir');
      }
      return { ok: true, caminho: alvo };
    } catch (e) {
      return { ok: false, erro: String(e.message || e) };
    }
  });
  // O Retro Computer no "Enviar para" do Windows: os arquivos mandados são copiados para Recebidos.
  // Tirar o atalho o manda para a Lixeira do Windows.
  tratar('computador:enviarPara', async (ligar) => {
    if (process.platform !== 'win32') return { ok: false };
    const lnk = atalhoEnviarPara();
    try {
      if (ligar) {
        const args = app.isPackaged ? '' : `"${app.getAppPath()}"`;
        const ok = shell.writeShortcutLink(lnk, existeLink(lnk) ? 'replace' : 'create', {
          target: process.execPath, args, description: tr('Copia para Meus documentos › Recebidos, no Retro Computer'), icon: process.execPath, iconIndex: 0,
        });
        return { ok };
      }
      if (existeLink(lnk)) await shell.trashItem(lnk);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: String(e.message || e) };
    }
  });
}

/* ---------- Início ---------- */

app.on('second-instance', (_e, argv) => {
  if (janela) {
    if (janela.isMinimized()) janela.restore();
    janela.focus();
  }
  receberDeFora(caminhosDaLinha(argv, { proprios: proprios() }));
});

app.whenReady().then(async () => {
  config = new Config(app.getPath('userData'), safeStorage);
  idioma.definir(idioma.resolver(idiomaEscolhido, app.getLocale()));
  programas = new Programas(path.join(BASE_DADOS, 'programas'), (url, o) => net.fetch(url, o));
  terminais = new Terminais((id, d) => enviar('terminal:dados', id, d), (id, c) => enviar('terminal:saiu', id, c));
  aplicativos = new Aplicativos({ shell, nativeImage, app, idioma: () => idioma.idioma() });
  if (MODO_SISTEMA || process.env.RETRO_JANELAS_FALSAS) {
    janelasLinux = new (process.env.RETRO_JANELAS_FALSAS ? JanelasFalsas : JanelasLinux)({
      pidsProprios: () => new Set([process.pid, ...app.getAppMetrics().map((m) => m.pid)]),
      // As janelas do Firefox do Retro Computer são as do Navegador (o mesmo botão e o mesmo ícone).
      programaDe: (j) => { if (j.classe === CLASSE_FIREFOX) return 'retro:navegador'; try { return aplicativos.idPorJanela(j); } catch { return null; } },
      aoMudar: (r) => enviar('janelasLinux:mudou', r),
      // Sem o _NET_WORKAREA, a área da tela do Electron (já sem a barra de tarefas do Openbox).
      areaPadrao: () => { const a = screen.getPrimaryDisplay().workArea; return { x: a.x, y: a.y, w: a.width, h: a.height }; },
    });
  }
  bloqueio = new Bloqueio(config);
  // A tela bloqueia antes de o computador dormir (e quando o próprio sistema bloqueia):
  // na volta, a senha é pedida.
  const bloquear = () => {
    const b = config.obter().bloqueio || {};
    if (bloqueio.temSenha() && b.aoVoltar !== false) enviar('bloqueio:bloquear');
  };
  powerMonitor.on('suspend', bloquear);
  powerMonitor.on('lock-screen', bloquear);
  loja = criarLoja();
  atualizador = new Atualizador({ app, enviar, antesDeSair: () => { terminais.fecharTodos(); if (janela) janela.__podeFechar = true; } });
  if (process.env.RETRO_BANDEJA_FALSA) {
    sistemaBandeja = bandeja.bandejaFalsa();
  } else {
    const volume = new bandeja.Volume();
    let bateria = null;
    sistemaBandeja = {
      volume, brilho: new bandeja.Brilho({ volume }), rede: new bandeja.Rede({ shell }), perfil: new bandeja.PerfilEnergia(),
      // A bateria não aparece nem some com o computador ligado: basta perguntar uma vez.
      bateria: async () => (bateria = bateria || bandeja.temBateria(process.platform, volume).then((existe) => ({ existe }))),
      aparelhos: async () => (process.platform === 'linux' ? bandeja.lerAparelhos() : []),
    };
  }
  // As opções de energia do modo sistema: a tela e a suspensão (na tomada e na bateria) e a tampa.
  if (MODO_SISTEMA) {
    energiaOpcoes = new Energia({
      config: () => config.obter(), powerMonitor, comoAdmin: sistemaLinux.comoAdmin,
      suspender: () => sistemaLinux.energia('suspender'),
      temBateria: () => sistemaBandeja.bateria().then((b) => !!(b && b.existe)),
      falso: !!process.env.RETRO_ENERGIA_FALSA,
    });
    energiaOpcoes.iniciar();
    // As teclas de aderência e as do mouse escolhidas voltam a cada entrada (o X as esquece).
    acessLinux = new AcessibilidadeLinux({ falso: !!process.env.RETRO_ACESSIBILIDADE_FALSA });
    const a = config.obter().acessibilidade || {};
    if (a.aderencia || a.teclasMouse) acessLinux.aplicar(a).catch(() => { });
  }
  await abrirDisco();
  // Os pendrives e cartões (RETRO_UNIDADES_FALSAS: uma pasta comum, para os testes).
  unidades = process.env.RETRO_UNIDADES_FALSAS
    ? new UnidadesFalsas({ disco: () => disco }, process.env.RETRO_UNIDADES_FALSAS)
    : new Unidades({ disco: () => disco, sistema: MODO_SISTEMA });
  // Os discos inteiros: os mesmos de mentira, ou os de verdade, sem o que não pode ser apagado.
  discos = process.env.RETRO_UNIDADES_FALSAS
    ? new DiscosFalsos({ comoAdmin: sistemaLinux.comoAdmin }, process.env.RETRO_UNIDADES_FALSAS)
    : new Discos({ comoAdmin: sistemaLinux.comoAdmin, protegidos: () => [disco && disco.raiz, app.getPath('userData'), BASE_DADOS, path.dirname(process.execPath), app.getAppPath()] });
  // As pastas do computador principal (RETRO_COMPUTADOR_FALSO: uma pasta com desktop, documents… dentro).
  const casaFalsa = process.env.RETRO_COMPUTADOR_FALSO;
  pastasFora = new PastasDoComputador({ caminho: (n) => (casaFalsa ? path.join(casaFalsa, n) : app.getPath(n)), disco: () => disco });
  receberDeFora(caminhosDaLinha(process.argv, { proprios: proprios() }));
  vigiarUnidades();
  podarMiniaturas();
  menuDoSistema();
  configurarSessao();
  configurarNavegador();
  // Se o computador desligou antes de terminar a limpeza do fechamento, ela é feita agora.
  if ((config.obter().navegador || {}).limparAoFechar) await limparNavegador().catch(() => { });
  registrarProtocolos();
  registrarPonte();
  // O servidor do Claude (o MCP): um soquete local, com um código novo a cada abertura.
  servidorMcp = new ServidorMcp({ dados: app.getPath('userData'), executar: executarMcp });
  servidorMcp.iniciar().then(() => arquivosMcp()).catch(() => { servidorMcp = null; });
  atalhosDoWindows();
  teclasDoSistema();
  // O histórico da área de transferência: só na memória, lido de tempos em tempos.
  historico = new HistoricoTransferencia({ clipboard, parado: () => powerMonitor.getSystemIdleTime(), aoMudar: () => enviar('transferencia:mudou') });
  historico.ligar((config.obter().transferencia || {}).historico !== false);
  copia = new CopiaSeguranca({ origem: () => disco.raiz });
  firefox = new Firefox({ dados: app.getPath('userData'), fontes: path.join(RAIZ_APP, 'src', 'sistema', 'fontes') });
  agendarCopia();
  diario = new Diario({
    disco: () => disco, pasta: pastaDiario, ligado: () => !!(config.obter().diario || {}).ligado,
    tr: idioma.tr, localidade: () => idioma.idioma(),
  });
  // A resolução escolhida em Painel › Aparência volta antes de a janela abrir (modo sistema).
  tela = new (process.env.RETRO_TELA_FALSA ? TelaFalsa : Tela)({ sistema: MODO_SISTEMA });
  const t = config.obter().tela;
  // O arranjo das várias telas (duplicar, estender, uma só) volta antes da resolução da principal.
  if (MODO_SISTEMA && t && t.arranjo) {
    const e = await tela.telas().catch(() => ({ disponivel: false }));
    if (e.disponivel && e.telas.length > 1 && e.arranjo !== t.arranjo) await tela.definirArranjo(t.arranjo).catch(() => { });
  }
  if (MODO_SISTEMA && t && t.modo) await tela.definir(t.saida, t.modo).catch(() => { });
  if (MODO_SISTEMA) fundoDaRaiz();
  // As escolhas do mouse e do touchpad (modo sistema), também para os aparelhos ligados depois.
  mouse = new (process.env.RETRO_MOUSE_FALSO ? MouseFalso : Mouse)({ sistema: MODO_SISTEMA });
  if (config.obter().mouse) mouse.aplicar(config.obter().mouse).catch(() => { });
  mouse.vigiar(() => config.obter().mouse);
  criarJanela();
  if (janelasLinux) janela.webContents.once('did-finish-load', () => janelasLinux.vigiar());
});

// "Apagar os dados de navegação ao fechar" (Painel › Segurança): antes de sair, com um prazo.
let limpouAoSair = false;
app.on('will-quit', (e) => {
  if (limpouAoSair || !config || !(config.obter().navegador || {}).limparAoFechar) return;
  e.preventDefault();
  limpouAoSair = true;
  Promise.race([limparNavegador(), new Promise((ok) => setTimeout(ok, 4000))]).catch(() => { }).finally(() => app.quit());
});

app.on('window-all-closed', () => {
  pararObservar();
  if (trabalhos) trabalhos.encerrar();
  if (terminais) terminais.fecharTodos();
  if (sistemaBandeja) sistemaBandeja.volume.fechar();
  app.quit();
});
