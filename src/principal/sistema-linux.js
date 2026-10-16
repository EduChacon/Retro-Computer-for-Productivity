'use strict';
/*
 * O Retro Computer como o sistema do computador (o modo sistema, no Linux) e o que vale
 * em qualquer sistema para abrir junto com o computador:
 *
 *   - energia: desligar, reiniciar e suspender o computador (systemctl, pelo logind:
 *     a sessão aberta pode, sem senha) e sair da sessão (volta à tela de entrada);
 *   - abrir ao entrar: o início automático do sistema (Windows e macOS) ou o
 *     ~/.config/autostart (Linux);
 *   - entrar direto: o LightDM entra sozinho na sessão "Retro Computer" (com a senha de
 *     administrador, pedida pela área de trabalho e passada ao sudo).
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

const SESSAO = '/usr/share/xsessions/retro-computer.desktop';
const LIGHTDM = '/etc/lightdm/lightdm.conf.d/50-retro-computer.conf';

/** O modo sistema: a sessão "Retro Computer" do Linux (sessao.sh passa --sistema). */
function ehModoSistema(argv = process.argv, env = process.env, plataforma = process.platform) {
  return plataforma === 'linux' && (argv.includes('--sistema') || !!env.RETRO_SISTEMA);
}

function rodar(cmd, args, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/* ---------- Energia ---------- */

const ACOES = { desligar: 'poweroff', reiniciar: 'reboot', suspender: 'suspend' };

/**
 * Desliga, reinicia ou suspende o computador. RETRO_ENERGIA_FALSA=1 (os testes): só anota.
 * @returns {Promise<{ok:boolean, erro?:string, falso?:boolean}>}
 */
async function energia(acao) {
  const cmd = ACOES[acao];
  if (!cmd) return { ok: false, erro: 'acao' };
  if (process.env.RETRO_ENERGIA_FALSA) return { ok: true, falso: true, acao };
  try {
    await rodar('systemctl', [cmd]);
    return { ok: true };
  } catch (e) {
    // Sem o systemd: o loginctl faz o mesmo pelo logind.
    try {
      await rodar('loginctl', [cmd]);
      return { ok: true };
    } catch {
      return { ok: false, erro: String(e.saida || e.message).split('\n')[0].slice(0, 300) };
    }
  }
}

/* ---------- Abrir ao entrar no computador ---------- */

const autostart = () => path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'autostart', 'retro-computer.desktop');

/** O comando que abre esta cópia (o AppImage, o instalado em /usr/bin ou o próprio executável). */
function comandoDoApp() {
  if (process.env.APPIMAGE) return process.env.APPIMAGE;
  if (fs.existsSync('/usr/bin/retro-computer')) return '/usr/bin/retro-computer';
  return process.execPath;
}

function abrirAoEntrar(app, plataforma = process.platform) {
  if (plataforma === 'linux') return fs.existsSync(autostart());
  return !!app.getLoginItemSettings().openAtLogin;
}

async function definirAbrirAoEntrar(app, ligar, plataforma = process.platform) {
  if (plataforma !== 'linux') {
    app.setLoginItemSettings({ openAtLogin: !!ligar });
    return abrirAoEntrar(app, plataforma);
  }
  const arq = autostart();
  if (!ligar) {
    await fsp.rm(arq, { force: true });
    return false;
  }
  await fsp.mkdir(path.dirname(arq), { recursive: true });
  const cmd = comandoDoApp();
  await fsp.writeFile(arq, [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Retro Computer',
    `Exec="${cmd.replace(/"/g, '\\"')}"`,
    'X-GNOME-Autostart-enabled=true',
    // Na própria sessão "Retro Computer" ele já abre: não abre de novo.
    'NotShowIn=RetroComputer;',
    '',
  ].join('\n'));
  return true;
}

/* ---------- A senha de administrador (sudo) ---------- */

/**
 * Roda um comando como administrador, com a senha digitada na área de trabalho (sudo -S).
 * A senha só passa pela entrada do sudo; não é guardada.
 * @returns {Promise<{ok:boolean, senhaErrada?:boolean, erro?:string, saida?:string}>}
 */
function comoAdmin(senha, cmd, args = [], { timeout = 30 * 60 * 1000, aoAndar } = {}) {
  return new Promise((resolve) => {
    const p = spawn('sudo', ['-S', '-k', '-p', '', '--', cmd, ...args], { env: { ...process.env, LC_ALL: 'C', DEBIAN_FRONTEND: 'noninteractive' } });
    let saida = '';
    let erros = '';
    const t = setTimeout(() => p.kill('SIGTERM'), timeout);
    p.stdout.on('data', (d) => { saida = (saida + d).slice(-50000); if (aoAndar) aoAndar(String(d)); });
    p.stderr.on('data', (d) => { erros = (erros + d).slice(-20000); });
    p.on('error', (e) => { clearTimeout(t); resolve({ ok: false, erro: e.code === 'ENOENT' ? 'sudo' : e.message }); });
    p.on('close', (codigo) => {
      clearTimeout(t);
      if (codigo === 0) return resolve({ ok: true, saida });
      const senhaErrada = /incorrect password|Sorry, try again|no password was provided|a password is required/i.test(erros);
      const naoPode = /is not in the sudoers|not allowed to execute/i.test(erros);
      resolve({ ok: false, senhaErrada, naoPode, erro: erros.split('\n').map((x) => x.trim()).filter(Boolean).pop() || `código ${codigo}`, saida });
    });
    p.stdin.on('error', () => { });
    p.stdin.end(String(senha || '') + '\n');
  });
}

/* ---------- A sessão "Retro Computer" no Linux ---------- */

function lerArquivo(arq) {
  try { return fs.readFileSync(arq, 'utf8'); } catch { return ''; }
}

/** O que a área de trabalho mostra em Painel de controle › Inicialização. */
function infoSessao() {
  const lightdm = fs.existsSync('/usr/sbin/lightdm') || fs.existsSync('/etc/lightdm');
  return {
    instalada: fs.existsSync(SESSAO),
    lightdm,
    entrarDireto: /autologin-session\s*=\s*retro-computer/.test(lerArquivo(LIGHTDM)),
    usuario: os.userInfo().username,
  };
}

/**
 * Um arquivo temporário para o "install" do administrador copiar para o sistema: numa pasta nova,
 * só do usuário (outra conta do computador não consegue trocá-lo no meio). Devolve o caminho e o
 * jeito de apagá-lo.
 */
async function temporario(nome, conteudo) {
  const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-'));
  const arquivo = path.join(pasta, nome);
  await fsp.writeFile(arquivo, conteudo, { flag: 'wx', mode: 0o600 });
  return { arquivo, apagar: () => fsp.rm(pasta, { recursive: true, force: true }).catch(() => { }) };
}

/** Liga ou desliga a entrada direta (o LightDM entra sozinho na sessão "Retro Computer"). */
async function definirEntrarDireto(ligar, senha) {
  const usuario = os.userInfo().username;
  if (!/^[a-z_][a-z0-9_.-]*$/i.test(usuario)) return { ok: false, erro: 'usuario' };
  if (!ligar) return comoAdmin(senha, 'rm', ['-f', LIGHTDM]);
  const tmp = await temporario('lightdm.conf', `# Feito pelo Retro Computer (Painel de controle › Inicialização).\n[Seat:*]\nautologin-user=${usuario}\nautologin-session=retro-computer\n`);
  try {
    return await comoAdmin(senha, 'install', ['-D', '-m', '0644', tmp.arquivo, LIGHTDM]);
  } finally {
    tmp.apagar();
  }
}

/* ---------- O layout do teclado (modo sistema) ---------- */

/** "layout: us\nvariant: intl" (setxkbmap -query) → { layout, variante } */
function lerQuery(s) {
  const campo = (n) => { const m = new RegExp('^' + n + ':\\s*(\\S+)', 'm').exec(s); return m ? m[1] : ''; };
  return { layout: campo('layout').split(',')[0], variante: campo('variant').split(',')[0] };
}

async function lerTeclado() {
  try { return lerQuery(await rodar('setxkbmap', ['-query'], { timeout: 4000 })); } catch { return null; }
}

/** Troca o layout na hora (setxkbmap, sem senha: vale para a sessão). */
async function aplicarTeclado(layout, variante = '') {
  if (!/^[a-z]{2,8}$/.test(layout || '') || !/^[a-z0-9_]{0,24}$/.test(variante || '')) return { ok: false, erro: 'layout' };
  if (process.env.RETRO_ENERGIA_FALSA) return { ok: true, falso: true };
  try {
    await rodar('setxkbmap', ['-layout', layout, ...(variante ? ['-variant', variante] : [])], { timeout: 4000 });
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: String(e.saida || e.message).split('\n')[0] };
  }
}

module.exports = { lerQuery, lerTeclado, aplicarTeclado, ehModoSistema, energia, abrirAoEntrar, definirAbrirAoEntrar, comoAdmin, infoSessao, definirEntrarDireto, comandoDoApp, temporario };
