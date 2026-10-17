'use strict';
/*
 * A senha da tela de bloqueio. Fica nas configurações só como o resumo (PBKDF2, com sal);
 * a área de trabalho nunca recebe o resumo, só pergunta se a senha digitada confere.
 * No Linux, a senha de entrada do Linux também desbloqueia (o unix_chkpwd do PAM, que
 * confere a senha do próprio usuário sem precisar de administrador): é o jeito de
 * voltar se a senha do Retro Computer for esquecida. No modo sistema, ela basta para
 * bloquear (ao fechar a tampa, ao suspender), como num computador comum, desde que a
 * conta do Linux tenha uma senha (o passwd -S diz; sem ela, ninguém ficaria preso fora).
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const { spawn, execFile } = require('node:child_process');

const VOLTAS = 210000;

function resumir(senha, sal = crypto.randomBytes(16).toString('hex')) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(String(senha), sal, VOLTAS, 32, 'sha256', (erro, chave) => (erro ? reject(erro) : resolve({ sal, hash: chave.toString('hex') })));
  });
}

async function confere(senha, guardada) {
  if (!guardada || !guardada.sal || !guardada.hash) return false;
  const { hash } = await resumir(senha, guardada.sal);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(guardada.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** A senha de entrada do Linux (só a do próprio usuário). */
function confereLinux(senha, plataforma = process.platform) {
  if (plataforma !== 'linux' || !senha) return Promise.resolve(false);
  return new Promise((resolve) => {
    for (const cmd of ['/usr/sbin/unix_chkpwd', '/sbin/unix_chkpwd']) {
      try {
        const p = spawn(cmd, [os.userInfo().username, 'nonull'], { stdio: ['pipe', 'ignore', 'ignore'] });
        p.on('error', () => resolve(false));
        p.on('close', (codigo) => resolve(codigo === 0));
        p.stdin.on('error', () => { });
        p.stdin.end(String(senha) + '\0');
        return;
      } catch { }
    }
    resolve(false);
  });
}

/** "passwd -S" (do próprio usuário): "nome P …" com senha; "NP" sem senha; "L" travada. */
function lerPasswdS(texto) {
  const m = /^\S+\s+(\S+)/.exec(String(texto || '').trim());
  return m ? m[1].toUpperCase() : null;
}

/** A conta do Linux tem uma senha que o unix_chkpwd confere? (Sem certeza, não.) */
function linuxTemSenha(plataforma = process.platform) {
  if (plataforma !== 'linux' || !['/usr/sbin/unix_chkpwd', '/sbin/unix_chkpwd'].some((c) => fs.existsSync(c))) return Promise.resolve(false);
  return new Promise((resolve) => {
    execFile('passwd', ['-S'], { timeout: 4000, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => resolve(!erro && lerPasswdS(saida) === 'P'));
  });
}

/**
 * O controle da senha: as tentativas erradas seguidas atrasam a próxima resposta
 * (1 s, 2 s, 4 s… até 30 s), para ninguém ficar tentando senhas.
 */
class Bloqueio {
  /** falsaLinux: a senha do Linux de mentira (RETRO_SENHA_LINUX_FALSA, para os testes e as capturas). */
  constructor(config, { falsaLinux = null } = {}) {
    this.config = config;
    this.erros = 0;
    this.falsaLinux = falsaLinux;
    this.linux = !!falsaLinux; // a senha do Linux basta para bloquear (o modo sistema, com a conta com senha)
  }

  /** No modo sistema, confere se a senha de entrada do Linux pode bloquear sozinha. */
  async prepararLinux(modoSistema) {
    if (this.falsaLinux) return this.linux;
    this.linux = !!modoSistema && (await linuxTemSenha());
    return this.linux;
  }

  /** Há uma senha que desbloqueia (a do Retro Computer ou, no modo sistema, a do Linux)? */
  podeBloquear() {
    return this.temSenha() || this.linux;
  }

  guardada() {
    return (this.config.obter().bloqueio || {}).senha || null;
  }

  temSenha() {
    return !!this.guardada();
  }

  async conferir(senha) {
    const linux = this.falsaLinux ? !!senha && senha === this.falsaLinux : await confereLinux(senha);
    const ok = (await confere(senha, this.guardada())) || linux;
    if (ok) {
      this.erros = 0;
      return true;
    }
    this.erros++;
    await new Promise((r) => setTimeout(r, Math.min(30000, 1000 * 2 ** Math.min(this.erros - 1, 5))));
    return false;
  }

  /** Troca a senha (vazia: tira). Com uma senha já guardada, a atual precisa conferir. */
  async definir(atual, nova) {
    if (this.temSenha() && !(await this.conferir(atual))) return { ok: false, senhaErrada: true };
    if (!nova) {
      this.config.definir({ bloqueio: { senha: null } });
      return { ok: true, temSenha: false };
    }
    if (String(nova).length < 4) return { ok: false, curta: true };
    this.config.definir({ bloqueio: { senha: await resumir(nova) } });
    return { ok: true, temSenha: true };
  }
}

/**
 * As configurações como a área de trabalho as vê: sem o resumo da senha, só se há uma (e se a
 * senha do Linux também bloqueia).
 */
function semSegredos(c, { senhaLinux = false } = {}) {
  const b = c.bloqueio || {};
  const { senha, ...resto } = b;
  return { ...c, bloqueio: { ...resto, temSenha: !!senha, senhaLinux: !!senhaLinux } };
}

/**
 * Segura a suspensão por um instante (a trava "delay" do logind, pelo systemd-inhibit): o
 * computador só dorme depois de a tela de bloqueio aparecer; sem ela, ao abrir a tampa, a
 * área de trabalho aparecia por um momento antes da senha.
 */
class TravaDoSono {
  constructor({ existe = (c) => ['/usr/bin/', '/bin/'].some((p) => fs.existsSync(p + c)) } = {}) {
    this.existe = existe;
    this.filho = null;
    process.once('exit', () => this.soltar());
  }

  pegar() {
    if (this.filho || !this.existe('systemd-inhibit')) return false;
    try {
      // O "cat" lê a entrada até o fim: se o Retro Computer cair, o cano fecha e a trava sai junto
      // (com o "sleep infinity", ela ficaria segurando cada suspensão pelos segundos do logind).
      const f = spawn('systemd-inhibit', ['--what=sleep', '--mode=delay', '--who=Retro Computer', '--why=Bloquear a tela antes de suspender', 'cat'], { stdio: ['pipe', 'ignore', 'ignore'] });
      f.on('error', () => { if (this.filho === f) this.filho = null; });
      f.on('exit', () => { if (this.filho === f) this.filho = null; });
      f.stdin.on('error', () => { });
      this.filho = f;
      return true;
    } catch {
      return false;
    }
  }

  soltar() {
    if (!this.filho) return;
    try { this.filho.kill(); } catch { }
    this.filho = null;
  }
}

/** /proc/acpi/button/lid/…/state: "state:      closed" → true; "open" → false; sem o arquivo, null. */
function lerTampa(texto) {
  const m = /state:\s*(\w+)/i.exec(String(texto || ''));
  return m ? m[1].toLowerCase() === 'closed' : null;
}

/** O arquivo da tampa do notebook (o primeiro de /proc/acpi/button/lid), ou null. */
function arquivoDaTampa(raiz = '/proc/acpi/button/lid') {
  try {
    const d = fs.readdirSync(raiz).sort()[0];
    return d ? `${raiz}/${d}/state` : null;
  } catch {
    return null;
  }
}

module.exports = { Bloqueio, resumir, confere, confereLinux, semSegredos, lerPasswdS, linuxTemSenha, TravaDoSono, lerTampa, arquivoDaTampa };
