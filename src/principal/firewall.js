'use strict';
/*
 * O firewall do Linux (o ufw, que já vem no Ubuntu e no Linux Mint): ligado, ele recusa as
 * conexões que chegam de outros computadores e deixa sair as do próprio computador (a
 * internet continua como antes). Ligar e desligar pedem a senha de administrador; o estado
 * é lido do arquivo de configuração, que qualquer usuário pode ler (o "ufw status" pede a senha).
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { comoAdmin } = require('./sistema-linux');

const CONF = '/etc/ufw/ufw.conf';
const UFW = ['/usr/sbin/ufw', '/sbin/ufw', '/usr/bin/ufw'];
const ESPERA = ['-o', 'DPkg::Lock::Timeout=120'];

/** ufw.conf → true (ENABLED=yes), false ou null (sem a linha). */
function lerUfwConf(texto) {
  const m = /^\s*ENABLED\s*=\s*"?(yes|no)"?\s*$/im.exec(String(texto || ''));
  return m ? m[1].toLowerCase() === 'yes' : null;
}

class Firewall {
  constructor({ plataforma = process.platform } = {}) {
    this.plataforma = plataforma;
  }

  ufw() {
    return UFW.find((p) => fs.existsSync(p)) || null;
  }

  /** { disponivel (é Linux), instalado, ligado, podeInstalar (há apt-get) } */
  async estado() {
    if (this.plataforma !== 'linux') return { disponivel: false };
    const instalado = !!this.ufw();
    let ligado = false;
    if (instalado) {
      try { ligado = !!lerUfwConf(await fsp.readFile(CONF, 'utf8')); } catch { }
    }
    return { disponivel: true, instalado, ligado, podeInstalar: fs.existsSync('/usr/bin/apt-get') };
  }

  /** Liga (recusando o que chega e deixando sair o que vai) ou desliga; instala o ufw se faltar. */
  async definir(ligar, senha) {
    if (this.plataforma !== 'linux') return { ok: false, erro: 'linux' };
    if (!this.ufw()) {
      if (!ligar) return { ok: true };
      const r = await comoAdmin(senha, 'apt-get', [...ESPERA, 'install', '-y', 'ufw'], { timeout: 10 * 60 * 1000 });
      if (!r.ok) return r;
    }
    const ufw = this.ufw() || 'ufw';
    if (!ligar) return comoAdmin(senha, ufw, ['disable']);
    for (const args of [['default', 'deny', 'incoming'], ['default', 'allow', 'outgoing'], ['--force', 'enable']]) {
      const r = await comoAdmin(senha, ufw, args);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
}

/** Para os testes e as capturas (RETRO_FIREWALL_FALSO=1): a senha certa é "certa". */
class FirewallFalso extends Firewall {
  constructor(o) {
    super(o);
    this.ligado = false;
  }

  async estado() { return { disponivel: true, instalado: true, ligado: this.ligado, podeInstalar: true }; }
  async definir(ligar, senha) {
    if (senha !== 'certa') return { ok: false, senhaErrada: true };
    this.ligado = !!ligar;
    return { ok: true };
  }
}

module.exports = { Firewall, FirewallFalso, lerUfwConf };
