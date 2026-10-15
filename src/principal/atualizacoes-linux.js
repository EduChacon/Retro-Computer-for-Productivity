'use strict';
/*
 * As atualizações do Linux (Debian, Ubuntu e derivados, pelo apt) e dos programas do Flathub
 * instalados pela Loja. Ver o que há não precisa de senha (a lista que o próprio Linux
 * atualiza todo dia); procurar de novo e instalar pedem a senha de administrador (sudo).
 *
 * "upgrade" nunca remove pacotes; as configurações mudadas pelo usuário ficam como estão
 * (--force-confold). As atualizações de segurança automáticas são as do unattended-upgrades.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { comoAdmin } = require('./sistema-linux');

const AUTO = '/etc/apt/apt.conf.d/20auto-upgrades';
const REINICIAR = '/var/run/reboot-required';
// Espera a vez quando o próprio Linux está atualizando (em vez de falhar na hora).
const ESPERA = ['-o', 'DPkg::Lock::Timeout=120'];

function rodar(cmd, args, { timeout = 60000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 16 << 20, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/** apt list --upgradable → [{ nome, versao, de, seguranca }] */
function lerAptList(texto) {
  const r = [];
  for (const linha of String(texto).split('\n')) {
    const m = /^([^\s/]+)\/(\S+)\s+(\S+)\s+\S+\s+\[upgradable from:\s*([^\]]+)\]/.exec(linha.trim());
    if (m) r.push({ nome: m[1], versao: m[3], de: m[4].trim(), seguranca: /security/i.test(m[2]) });
  }
  return r;
}

/** flatpak remote-ls --updates --columns=application,version → [{ nome, versao }] */
function lerFlatpak(texto) {
  return String(texto).split('\n').map((l) => l.trim().split('\t')).filter((p) => p[0] && /\./.test(p[0])).map((p) => ({ nome: p[0], versao: p[1] || '' }));
}

/** O arquivo do apt das atualizações automáticas → ligadas? */
function lerAutomaticas(texto) {
  return /APT::Periodic::Unattended-Upgrade\s+"1"/.test(String(texto || ''));
}

function textoAutomaticas(ligar) {
  return `// Feito pelo Retro Computer (Painel de controle › Atualizações do Linux).\nAPT::Periodic::Update-Package-Lists "1";\nAPT::Periodic::Unattended-Upgrade "${ligar ? 1 : 0}";\n`;
}

/** O erro do apt numa frase curta (a trava de outra atualização tem nome próprio). */
function erroApt(r) {
  const texto = String((r && (r.erro || r.saida)) || '');
  if (/lock|Could not get lock|is held by/i.test(texto)) return { ...r, ocupado: true };
  return r;
}

class AtualizacoesLinux {
  constructor({ plataforma = process.platform, aoAndar = () => { } } = {}) {
    this.plataforma = plataforma;
    this.aoAndar = aoAndar;
  }

  disponivel() {
    return this.plataforma === 'linux' && fs.existsSync('/usr/bin/apt-get');
  }

  async listar() {
    if (!this.disponivel()) return { disponivel: false };
    let apt = [];
    let flatpak = [];
    try { apt = lerAptList(await rodar('apt', ['list', '--upgradable'])); } catch { }
    if (fs.existsSync('/usr/bin/flatpak')) {
      try { flatpak = lerFlatpak(await rodar('flatpak', ['remote-ls', '--user', '--updates', '--columns=application,version'])); } catch { }
    }
    let automaticas = false;
    try { automaticas = lerAutomaticas(await fsp.readFile(AUTO, 'utf8')); } catch { }
    return { disponivel: true, apt, flatpak, reiniciar: fs.existsSync(REINICIAR), automaticas, temUnattended: fs.existsSync('/usr/bin/unattended-upgrade') };
  }

  /** Busca a lista nova (apt-get update) e devolve o que há. */
  async procurar(senha) {
    const r = await comoAdmin(senha, 'apt-get', [...ESPERA, 'update'], { timeout: 10 * 60 * 1000, aoAndar: (s) => this.aoAndar(s) });
    if (!r.ok) return erroApt(r);
    return { ok: true, ...(await this.listar()) };
  }

  /** Instala tudo: o Linux (apt-get upgrade) e os programas do Flathub. */
  async instalar(senha) {
    const r = await comoAdmin(senha, 'apt-get', [...ESPERA, '-y', '-o', 'Dpkg::Options::=--force-confdef', '-o', 'Dpkg::Options::=--force-confold', 'upgrade'], {
      timeout: 60 * 60 * 1000, aoAndar: (s) => this.aoAndar(s),
    });
    if (!r.ok) return erroApt(r);
    if (fs.existsSync('/usr/bin/flatpak')) {
      await new Promise((resolve) => {
        const p = spawn('flatpak', ['update', '--user', '-y', '--noninteractive'], { env: { ...process.env, LC_ALL: 'C' } });
        p.stdout.on('data', (d) => this.aoAndar(String(d)));
        p.on('error', resolve);
        p.on('close', resolve);
      });
    }
    return { ok: true, reiniciar: fs.existsSync(REINICIAR) };
  }

  /** Liga ou desliga as atualizações de segurança automáticas (instala o unattended-upgrades se faltar). */
  async definirAutomaticas(ligar, senha) {
    if (ligar && !fs.existsSync('/usr/bin/unattended-upgrade')) {
      const r = await comoAdmin(senha, 'apt-get', [...ESPERA, 'install', '-y', 'unattended-upgrades'], { timeout: 10 * 60 * 1000, aoAndar: (s) => this.aoAndar(s) });
      if (!r.ok) return erroApt(r);
    }
    const tmp = path.join(os.tmpdir(), `retro-auto-upgrades-${process.pid}`);
    await fsp.writeFile(tmp, textoAutomaticas(ligar));
    try {
      return await comoAdmin(senha, 'install', ['-m', '0644', tmp, AUTO]);
    } finally {
      fsp.rm(tmp, { force: true }).catch(() => { });
    }
  }
}

/** Para os testes e as capturas (RETRO_ATUALIZACOES_FALSAS=1). */
class AtualizacoesFalsas extends AtualizacoesLinux {
  constructor(o) {
    super(o);
    this.lista = [
      { nome: 'firefox-esr', versao: '128.4.0esr-1~deb12u1', de: '128.3.1esr-1~deb12u1', seguranca: true },
      { nome: 'openssl', versao: '3.0.15-1~deb12u1', de: '3.0.14-1~deb12u2', seguranca: true },
      { nome: 'tzdata', versao: '2024b-0+deb12u1', de: '2024a-0+deb12u1', seguranca: false },
    ];
    this.auto = false;
  }

  disponivel() { return true; }
  async listar() { return { disponivel: true, apt: this.lista, flatpak: [{ nome: 'org.libreoffice.LibreOffice', versao: '24.8.2' }], reiniciar: false, automaticas: this.auto, temUnattended: true }; }
  async procurar(senha) { return senha === 'certa' ? { ok: true, ...(await this.listar()) } : { ok: false, senhaErrada: true }; }
  async instalar(senha) {
    if (senha !== 'certa') return { ok: false, senhaErrada: true };
    for (const p of this.lista) this.aoAndar(`Unpacking ${p.nome} (${p.versao}) over (${p.de}) ...\n`);
    this.lista = [];
    return { ok: true, reiniciar: true };
  }
  async definirAutomaticas(ligar, senha) { if (senha !== 'certa') return { ok: false, senhaErrada: true }; this.auto = ligar; return { ok: true }; }
}

module.exports = { AtualizacoesLinux, AtualizacoesFalsas, lerAptList, lerFlatpak, lerAutomaticas, textoAutomaticas, erroApt };
