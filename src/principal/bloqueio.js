'use strict';
/*
 * A senha da tela de bloqueio. Fica nas configurações só como o resumo (PBKDF2, com sal);
 * a área de trabalho nunca recebe o resumo, só pergunta se a senha digitada confere.
 * No Linux, a senha de entrada do Linux também desbloqueia (o unix_chkpwd do PAM, que
 * confere a senha do próprio usuário sem precisar de administrador): é o jeito de
 * voltar se a senha do Retro Computer for esquecida.
 */
const crypto = require('node:crypto');
const os = require('node:os');
const { spawn } = require('node:child_process');

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

/**
 * O controle da senha: as tentativas erradas seguidas atrasam a próxima resposta
 * (1 s, 2 s, 4 s… até 30 s), para ninguém ficar tentando senhas.
 */
class Bloqueio {
  constructor(config) {
    this.config = config;
    this.erros = 0;
  }

  guardada() {
    return (this.config.obter().bloqueio || {}).senha || null;
  }

  temSenha() {
    return !!this.guardada();
  }

  async conferir(senha) {
    const ok = (await confere(senha, this.guardada())) || (await confereLinux(senha));
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

/** As configurações como a área de trabalho as vê: sem o resumo da senha, só se há uma. */
function semSegredos(c) {
  const b = c.bloqueio || {};
  const { senha, ...resto } = b;
  return { ...c, bloqueio: { ...resto, temSenha: !!senha } };
}

module.exports = { Bloqueio, resumir, confere, confereLinux, semSegredos };
