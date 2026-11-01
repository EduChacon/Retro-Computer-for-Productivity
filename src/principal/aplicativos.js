'use strict';
/*
 * Os programas instalados no computador principal, para abrir pelo Retro
 * Computer (Iniciar › Programas do computador e os atalhos da área de trabalho).
 *
 *   Linux:   os arquivos .desktop dos menus (os do sistema, os do usuário, Flatpak e Snap);
 *   Windows: os atalhos (.lnk) do menu Iniciar;
 *   macOS:   os aplicativos (.app) das pastas Aplicativos.
 *
 * A área de trabalho só conhece o identificador de cada programa; abrir passa
 * sempre por esta lista (nada de comando vindo de fora).
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

/* ---------- Linux: os arquivos .desktop ---------- */

function pastasLinux() {
  const casa = os.homedir();
  const dados = (process.env.XDG_DATA_DIRS || '/usr/local/share:/usr/share').split(':').filter(Boolean);
  return [
    path.join(process.env.XDG_DATA_HOME || path.join(casa, '.local', 'share'), 'applications'),
    ...dados.map((d) => path.join(d, 'applications')),
    '/var/lib/flatpak/exports/share/applications',
    path.join(casa, '.local', 'share', 'flatpak', 'exports', 'share', 'applications'),
    '/var/lib/snapd/desktop/applications',
  ];
}

/**
 * Lê um arquivo .desktop (só a seção [Desktop Entry]). O nome vem no idioma
 * pedido quando houver (Name[pt_BR], Name[pt], Name[es]…).
 */
function lerDesktop(texto, idioma = 'pt-BR') {
  const campos = {};
  let naSecao = false;
  for (const bruta of String(texto).split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha || linha.startsWith('#')) continue;
    if (linha.startsWith('[')) { naSecao = linha === '[Desktop Entry]'; continue; }
    if (!naSecao) continue;
    const i = linha.indexOf('=');
    if (i > 0) campos[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  if (campos.Type !== 'Application' || !campos.Exec) return null;
  if (/^true$/i.test(campos.NoDisplay || '') || /^true$/i.test(campos.Hidden || '')) return null;
  const loc = idioma.replace('-', '_');
  const curto = loc.split('_')[0];
  const nome = campos[`Name[${loc}]`] || campos[`Name[${curto}]`] || campos.Name;
  if (!nome) return null;
  return {
    nome,
    exec: campos.Exec,
    icone: campos.Icon || null,
    terminal: /^true$/i.test(campos.Terminal || ''),
    pasta: campos.Path || null,
    categorias: (campos.Categories || '').split(';').filter(Boolean),
    wmClass: campos.StartupWMClass || null,
  };
}

/** Tira os códigos de campo do Exec (%f, %U…), que pedem arquivos que aqui não há. */
function limparExec(exec) {
  return String(exec)
    .replace(/%[fFuUdDnNvmk]/g, '')
    .replace(/%i/g, '')
    .replace(/%c/g, '')
    .replace(/%%/g, '%')
    .replace(/\s+/g, ' ')
    .trim();
}

function listarLinux(idioma) {
  const vistos = new Map();
  for (const pasta of pastasLinux()) {
    let nomes = [];
    try { nomes = fs.readdirSync(pasta); } catch { continue; }
    for (const arq of nomes) {
      if (!arq.endsWith('.desktop') || vistos.has(arq)) continue;
      let entrada = null;
      try { entrada = lerDesktop(fs.readFileSync(path.join(pasta, arq), 'utf8'), idioma); } catch { }
      // O primeiro que aparece vale (o do usuário vem antes do do sistema), mesmo escondido.
      vistos.set(arq, entrada && { id: arq, ...entrada, arquivo: path.join(pasta, arq) });
    }
  }
  return [...vistos.values()].filter(Boolean);
}

/** Acha o arquivo do ícone de um .desktop no tema de ícones (hicolor, Adwaita) ou em pixmaps. */
function iconeLinux(nome) {
  if (!nome) return null;
  if (path.isAbsolute(nome)) return fs.existsSync(nome) ? nome : null;
  const casa = os.homedir();
  const bases = [path.join(casa, '.local', 'share', 'icons'), path.join(casa, '.icons'), '/usr/local/share/icons', '/usr/share/icons',
    '/var/lib/flatpak/exports/share/icons', path.join(casa, '.local', 'share', 'flatpak', 'exports', 'share', 'icons')];
  for (const tema of ['hicolor', 'Adwaita']) {
    for (const tam of ['32x32', '48x48', '64x64', '128x128', '256x256', 'scalable']) {
      for (const base of bases) {
        for (const ext of ['.png', '.svg']) {
          const p = path.join(base, tema, tam, 'apps', nome + ext);
          if (fs.existsSync(p)) return p;
        }
      }
    }
  }
  for (const ext of ['.png', '.svg']) {
    const p = path.join('/usr/share/pixmaps', nome + ext);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* ---------- Windows: os atalhos do menu Iniciar ---------- */

function listarWindows() {
  const pastas = [
    process.env.ProgramData && path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
  ].filter(Boolean);
  const r = new Map();
  const andar = (pasta, prof) => {
    let itens = [];
    try { itens = fs.readdirSync(pasta, { withFileTypes: true }); } catch { return; }
    for (const it of itens) {
      const p = path.join(pasta, it.name);
      if (it.isDirectory() && prof < 3) andar(p, prof + 1);
      else if (it.isFile() && it.name.toLowerCase().endsWith('.lnk')) {
        const nome = it.name.slice(0, -4);
        // Os desinstaladores e os leia-me não interessam aqui.
        if (/uninstall|desinstal|readme|leia-me|help$/i.test(nome)) continue;
        if (!r.has(nome.toLowerCase())) r.set(nome.toLowerCase(), { id: 'win:' + p, nome, arquivo: p });
      }
    }
  };
  for (const p of pastas) andar(p, 0);
  return [...r.values()];
}

/* ---------- macOS: os aplicativos ---------- */

function listarMac() {
  const pastas = ['/Applications', '/Applications/Utilities', '/System/Applications', '/System/Applications/Utilities', path.join(os.homedir(), 'Applications')];
  const r = new Map();
  for (const pasta of pastas) {
    let nomes = [];
    try { nomes = fs.readdirSync(pasta); } catch { continue; }
    for (const n of nomes) {
      if (!n.endsWith('.app')) continue;
      const nome = n.slice(0, -4);
      if (!r.has(nome)) r.set(nome, { id: 'mac:' + path.join(pasta, n), nome, arquivo: path.join(pasta, n) });
    }
  }
  return [...r.values()];
}

/* ---------- O ícone de verdade de um programa, de um atalho ou de um arquivo ---------- */

/** As variáveis do Windows num caminho (%SystemRoot%, %ProgramFiles%…), como o Explorer as lê. */
function expandirVariaveis(p, env = process.env) {
  return String(p || '').replace(/%([^%]+)%/g, (m, k) => {
    const chave = Object.keys(env).find((x) => x.toLowerCase() === k.toLowerCase());
    return chave ? env[chave] : m;
  });
}

/** O IconFile de um atalho da internet (.url), um arquivo .ini pequeno. */
function iconeDoUrl(texto) {
  const m = /^\s*IconFile\s*=\s*(.+?)\s*$/im.exec(String(texto || ''));
  return m ? m[1] : null;
}

/**
 * De onde vem o ícone de um arquivo do Windows. O Chromium só lê o ícone de dentro do .exe, do .dll
 * e do .ico; para o resto (o .lnk e o .url), ele devolve o genérico da extensão (a folha com a seta).
 * Por isso o atalho é lido: o ícone escolhido nele ou, sem ele, o do programa para onde aponta.
 * Os atalhos dos programas da Microsoft Store (sem um .exe) e os que usam um ícone do meio de um
 * .dll (o Painel de controle do Windows) ficam com o genérico.
 */
function origemDoIcone(arquivo, { shell, existe = fs.existsSync, ler = (p) => fs.readFileSync(p, 'utf8'), env = process.env } = {}) {
  const ext = path.extname(arquivo).toLowerCase();
  const serve = (p) => !!p && /\.(exe|dll|ico)$/i.test(p) && existe(p);
  if (ext === '.lnk') {
    let l;
    try { l = shell.readShortcutLink(arquivo); } catch { return null; }
    const icone = expandirVariaveis(l.icon, env);
    const alvo = expandirVariaveis(l.target, env);
    // O Electron só lê o primeiro ícone de um .exe ou .dll: com outro número, vale o do programa.
    if (serve(icone) && (/\.ico$/i.test(icone) || !l.iconIndex)) return icone;
    if (serve(alvo)) return alvo;
    return null;
  }
  if (ext === '.url') {
    let icone = null;
    try { icone = expandirVariaveis(iconeDoUrl(ler(arquivo)), env); } catch { }
    return serve(icone) ? icone : null;
  }
  return /\.(exe|ico)$/i.test(ext) ? arquivo : null;
}

/** O ícone (32 pontos, em data: URL) de um programa, de um atalho ou de um .exe; null se não houver. */
async function iconeDoArquivo(arquivo, { app, shell, nativeImage, plataforma = process.platform } = {}) {
  let fonte = arquivo;
  if (plataforma === 'win32') {
    fonte = origemDoIcone(arquivo, { shell });
    if (!fonte) return null;
    if (/\.ico$/i.test(fonte)) {
      const im = nativeImage.createFromPath(fonte);
      return im.isEmpty() ? null : im.resize({ width: 32, height: 32, quality: 'best' }).toDataURL();
    }
  }
  const im = await app.getFileIcon(fonte, { size: 'normal' });
  const url = im && !im.isEmpty() ? im.toDataURL() : null;
  return url === 'data:image/png;base64,' ? null : url;
}

/**
 * O programa da lista com o nome de um pacote da loja (o "Mozilla Firefox" do winget é o atalho
 * "Firefox" do menu Iniciar): o mesmo nome, sem acento e sem maiúsculas; senão, um nome dentro do outro.
 */
function acharPorNome(lista, nome) {
  const n = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9+]+/g, ' ').trim();
  const alvo = n(nome);
  if (!alvo) return null;
  const l = (lista || []).filter((a) => !a.terminal && n(a.nome));
  return l.find((a) => n(a.nome) === alvo)
    || l.filter((a) => alvo.includes(n(a.nome)) && n(a.nome).length >= 3).sort((a, b) => b.nome.length - a.nome.length)[0]
    || l.filter((a) => n(a.nome).startsWith(alvo + ' ')).sort((a, b) => a.nome.length - b.nome.length)[0]
    || null;
}

/* ---------- Comum ---------- */

class Aplicativos {
  constructor({ shell, nativeImage, app, idioma = () => 'pt-BR', plataforma = process.platform } = {}) {
    this.shell = shell;
    this.nativeImage = nativeImage;
    this.app = app;
    this.idioma = idioma;
    this.plataforma = plataforma;
    this.lista = null;
    this.icones = new Map();
  }

  /** A lista em ordem alfabética: [{ id, nome, terminal? }]. */
  listar(atualizar = false) {
    if (!this.lista || atualizar) {
      let l = [];
      if (this.plataforma === 'linux') l = listarLinux(this.idioma());
      else if (this.plataforma === 'win32') l = listarWindows();
      else if (this.plataforma === 'darwin') l = listarMac();
      this.lista = l.sort((a, b) => a.nome.localeCompare(b.nome, this.idioma()));
    }
    return this.lista.map(({ id, nome, terminal }) => ({ id, nome, terminal: !!terminal }));
  }

  /**
   * O programa (o id do .desktop) de uma janela do Linux, pela classe dela: o StartupWMClass,
   * o nome do arquivo .desktop ou o fim dele (org.gnome.Calculator), sem diferenciar maiúsculas.
   */
  idPorJanela({ classe = '', instancia = '' } = {}) {
    if (this.plataforma !== 'linux') return null;
    if (!this.lista) this.listar();
    const nomes = [classe, instancia].filter(Boolean).map((s) => s.toLowerCase());
    if (!nomes.length) return null;
    const base = (id) => id.replace(/\.desktop$/, '').toLowerCase();
    const a = this.lista.find((x) => x.wmClass && nomes.includes(x.wmClass.toLowerCase()))
      || this.lista.find((x) => nomes.includes(base(x.id)))
      || this.lista.find((x) => nomes.includes(base(x.id).split('.').pop()))
      || this.lista.find((x) => nomes.includes(x.nome.toLowerCase()));
    return a ? a.id : null;
  }

  achar(id) {
    if (!this.lista) this.listar();
    return this.lista.find((a) => a.id === id) || null;
  }

  /** A integração só recebe um alvo da lista local, nunca um executável escolhido pela página. */
  alvoIntegracao(id) {
    const a = this.achar(id); if (!a || a.terminal) return null;
    if (this.plataforma === 'darwin') return a.arquivo;
    if (this.plataforma === 'win32') {
      try { const alvo = this.shell.readShortcutLink(a.arquivo).target; return path.win32.isAbsolute(alvo) && /\.exe$/i.test(alvo) && fs.existsSync(alvo) ? alvo : null; } catch { return null; }
    }
    return null;
  }

  /** O ícone do programa como data: URL (32 pontos), ou null. */
  async icone(id) {
    if (this.icones.has(id)) return this.icones.get(id);
    const a = this.achar(id);
    let url = null;
    try {
      if (a && this.plataforma === 'linux') {
        const p = iconeLinux(a.icone);
        if (p && p.endsWith('.svg')) url = 'data:image/svg+xml;base64,' + fs.readFileSync(p).toString('base64');
        else if (p) url = this.nativeImage.createFromPath(p).resize({ width: 32, height: 32, quality: 'best' }).toDataURL();
      } else if (a) {
        url = await iconeDoArquivo(a.arquivo, { app: this.app, shell: this.shell, nativeImage: this.nativeImage, plataforma: this.plataforma });
      }
    } catch { url = null; }
    if (url === 'data:image/png;base64,') url = null;
    this.icones.set(id, url);
    return url;
  }

  /**
   * Abre o programa. Os de terminal (Terminal=true no Linux) voltam o comando,
   * para a área de trabalho abri-lo no Prompt de comando.
   */
  async abrir(id) {
    const a = this.achar(id);
    if (!a) throw new Error('programa desconhecido');
    if (this.plataforma === 'linux') {
      const cmd = limparExec(a.exec);
      if (a.terminal) return { terminal: cmd };
      // O programa não herda as variáveis do Electron nem as do AppImage.
      const env = { ...process.env };
      for (const k of Object.keys(env)) if (/^(ELECTRON_|RETRO_)/.test(k) || ['APPDIR', 'APPIMAGE', 'ARGV0', 'OWD'].includes(k)) delete env[k];
      const filho = spawn('/bin/sh', ['-c', cmd], { detached: true, stdio: 'ignore', cwd: a.pasta || os.homedir(), env });
      filho.on('error', () => { });
      filho.unref();
      return { ok: true };
    }
    const erro = await this.shell.openPath(a.arquivo);
    if (erro) throw new Error(erro);
    return { ok: true };
  }
}

module.exports = { Aplicativos, acharPorNome, lerDesktop, limparExec, iconeLinux, iconeDoArquivo, origemDoIcone, iconeDoUrl, expandirVariaveis };
