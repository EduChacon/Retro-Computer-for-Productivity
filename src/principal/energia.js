'use strict';
/*
 * As opções de energia do modo sistema (Painel de controle › Opções de energia), como no Windows,
 * cada uma com um tempo na tomada e outro na bateria:
 *   - desligar a tela depois de tantos minutos parado (o DPMS do X, pelo xset);
 *   - suspender depois de tantos minutos parado (o tempo parado vem do Electron; com um som
 *     tocando, um vídeo ou uma música, o computador espera);
 *   - o que fazer ao fechar a tampa do notebook (um arquivo do logind, gravado como administrador).
 *
 * RETRO_ENERGIA_FALSA=1: nada muda no computador (o xset e o logind só são anotados).
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const PADRAO = { telaTomada: 15, telaBateria: 5, suspenderTomada: 0, suspenderBateria: 30 };
const TAMPA_ARQ = '/etc/systemd/logind.conf.d/50-retro-computer.conf';
const TAMPAS = { suspender: 'suspend', nada: 'ignore', desligar: 'poweroff' };

function rodar(cmd, args, { timeout = 6000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

/* ---------- Funções puras (testadas em testes/energia.test.js) ---------- */

/** As opções com os padrões; os tempos são minutos inteiros (0 = nunca). */
function opcoesDe(c) {
  const r = { ...PADRAO };
  for (const k of Object.keys(PADRAO)) {
    const v = Number(c && c[k]);
    if (Number.isFinite(v) && v >= 0) r[k] = Math.min(24 * 60, Math.round(v));
  }
  return r;
}

/** Os argumentos do xset para apagar a tela depois de tantos minutos (0: nunca). */
function argsDpms(minutos) {
  const s = Math.round(Number(minutos) || 0) * 60;
  return s > 0 ? [['+dpms'], ['dpms', '0', '0', String(s)]] : [['-dpms']];
}

/** "HandleLidSwitch=suspend" no arquivo do logind → 'suspender' (sem o arquivo, o padrão do Linux). */
function lerTampa(texto) {
  const m = /^\s*HandleLidSwitch\s*=\s*(\S+)/m.exec(String(texto || ''));
  const v = m ? m[1].toLowerCase() : 'suspend';
  return Object.keys(TAMPAS).find((k) => TAMPAS[k] === v) || 'suspender';
}

/** O arquivo do logind para a tampa (na bateria e na tomada; com outra tela ligada, nada). */
function textoTampa(acao) {
  const v = TAMPAS[acao] || 'suspend';
  return `# Feito pelo Retro Computer (Painel de controle › Opções de energia).\n[Login]\nHandleLidSwitch=${v}\nHandleLidSwitchExternalPower=${v}\nHandleLidSwitchDocked=ignore\n`;
}

/** "pactl list short sinks": alguma saída tocando agora (RUNNING)? */
function tocandoSom(saida) {
  return String(saida || '').split('\n').some((l) => /\tRUNNING\s*$/.test(l));
}

/** Hora de suspender? (o tempo parado em segundos; com som tocando, não) */
function deveSuspender({ parado, minutos, tocando }) {
  return minutos > 0 && parado >= minutos * 60 && !tocando;
}

class Energia {
  /**
   * @param {object} o
   * @param {() => object} o.config          as configurações (config.obter())
   * @param {object} o.powerMonitor         o do Electron
   * @param {(acao:string) => Promise} o.suspender   o energia('suspender') do sistema-linux
   * @param {Function} o.comoAdmin          o do sistema-linux
   * @param {() => Promise<boolean>} o.temBateria
   * @param {boolean} [o.falso]
   */
  constructor({ config, powerMonitor, suspender, comoAdmin, temBateria, falso = false }) {
    this.config = config;
    this.pm = powerMonitor;
    this.suspender = suspender;
    this.comoAdmin = comoAdmin;
    this.temBateria = temBateria;
    this.falso = falso;
    this.tampaFalsa = 'suspender';
    this.anotado = [];
    this.relogio = null;
    this.suspendendo = false;
  }

  opcoes() { return opcoesDe(this.config().energia); }

  naBateria() {
    try { return !!this.pm.isOnBatteryPower(); } catch { return false; }
  }

  async estado() {
    const tampaPossivel = this.falso || fs.existsSync('/proc/acpi/button/lid');
    let tampa = this.tampaFalsa;
    if (!this.falso) tampa = lerTampa(await fsp.readFile(TAMPA_ARQ, 'utf8').catch(() => ''));
    return { opcoes: this.opcoes(), bateria: this.falso ? true : await this.temBateria().catch(() => false), naBateria: this.naBateria(), tampaPossivel, tampa };
  }

  /** Aplica o tempo da tela (o da bateria ou o da tomada). */
  async aplicarTela() {
    const o = this.opcoes();
    const minutos = this.naBateria() ? o.telaBateria : o.telaTomada;
    for (const args of argsDpms(minutos)) {
      if (this.falso) this.anotado.push(['xset', ...args]);
      else await rodar('xset', args).catch(() => { });
    }
  }

  /** Começa a vigiar: a tela na hora e quando a fonte muda; a suspensão a cada meio minuto. */
  iniciar() {
    this.aplicarTela();
    for (const ev of ['on-ac', 'on-battery']) this.pm.on(ev, () => this.aplicarTela());
    // Ao voltar da suspensão, o tempo parado recomeça (e o X pode ter esquecido o DPMS).
    this.pm.on('resume', () => { this.suspendendo = false; this.aplicarTela(); });
    this.relogio = setInterval(() => this.vigiar().catch(() => { }), 30 * 1000);
    if (this.relogio.unref) this.relogio.unref();
  }

  async vigiar() {
    if (this.suspendendo) return;
    const o = this.opcoes();
    const minutos = this.naBateria() ? o.suspenderBateria : o.suspenderTomada;
    if (!minutos) return;
    const parado = this.pm.getSystemIdleTime();
    if (parado < minutos * 60) return;
    const tocando = this.falso ? false : tocandoSom(await rodar('pactl', ['list', 'short', 'sinks']).catch(() => ''));
    if (!deveSuspender({ parado, minutos, tocando })) return;
    this.suspendendo = true;
    await this.suspender();
    // Se não suspendeu (sem permissão), tenta de novo só depois de mais um período.
    setTimeout(() => { this.suspendendo = false; }, minutos * 60 * 1000).unref?.();
  }

  /** Grava o que a tampa faz (como administrador) e avisa o logind. */
  async definirTampa(acao, senha) {
    if (!TAMPAS[acao]) return { ok: false, erro: 'acao' };
    if (this.falso) {
      if (senha !== 'certa') return { ok: false, senhaErrada: true };
      this.tampaFalsa = acao;
      return { ok: true };
    }
    const tmp = path.join(os.tmpdir(), `retro-logind-${process.pid}.conf`);
    await fsp.writeFile(tmp, textoTampa(acao));
    try {
      const r = await this.comoAdmin(senha, 'install', ['-D', '-m', '0644', tmp, TAMPA_ARQ]);
      if (!r.ok) return r;
      // O logind relê as configurações com o HUP (sem fechar a sessão); se não der, vale depois de reiniciar.
      const hup = await this.comoAdmin(senha, 'systemctl', ['kill', '-s', 'HUP', 'systemd-logind']);
      return { ok: true, reiniciar: !hup.ok };
    } finally {
      fsp.rm(tmp, { force: true }).catch(() => { });
    }
  }

  parar() { if (this.relogio) clearInterval(this.relogio); }
}

module.exports = { Energia, PADRAO, opcoesDe, argsDpms, lerTampa, textoTampa, tocandoSom, deveSuspender, TAMPA_ARQ };
