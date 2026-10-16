'use strict';
/*
 * A data, a hora e o fuso horário do modo sistema (Painel de controle › Data e hora), pelo
 * timedatectl do systemd: o fuso, acertar a hora pela internet (o NTP) e, com ele desligado,
 * a data e a hora à mão. Mudar pede a senha de administrador (o sudo), porque a sessão
 * "Retro Computer" não tem a janela de senha do sistema.
 *
 * RETRO_DATAHORA_FALSA=1: um computador de mentira (a senha de teste é "certa").
 */
const { execFile } = require('node:child_process');

function rodar(cmd, args, { timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 4 << 20, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

/* ---------- Funções puras (testadas em testes/datahora.test.js) ---------- */

/** "timedatectl show": { fuso, ntp, sincronizado, podeNtp }. */
function lerShow(s) {
  const v = {};
  for (const linha of String(s).split('\n')) {
    const i = linha.indexOf('=');
    if (i > 0) v[linha.slice(0, i).trim()] = linha.slice(i + 1).trim();
  }
  return { fuso: v.Timezone || '', ntp: v.NTP === 'yes', sincronizado: v.NTPSynchronized === 'yes', podeNtp: v.CanNTP !== 'no' };
}

/** Um nome de fuso que o timedatectl aceita (o formato do banco de fusos: Regiao/Cidade). */
const fusoValido = (f) => typeof f === 'string' && f.length < 64 && /^[A-Za-z0-9_+-]+(\/[A-Za-z0-9_+-]+)*$/.test(f);

/** "2026-10-16 14:05:00": a data e a hora à mão, conferidas antes de ir para o sudo. */
function horaValida(t) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(t || ''));
  if (!m) return false;
  const [a, me, d, h, mi, s] = m.slice(1).map((x) => Number(x || 0));
  return a >= 2000 && a <= 2100 && me >= 1 && me <= 12 && d >= 1 && d <= 31 && h <= 23 && mi <= 59 && s <= 59;
}

class DataHora {
  constructor({ comoAdmin }) {
    this.comoAdmin = comoAdmin;
    this.fusos = null;
  }

  async estado() {
    try {
      const e = lerShow(await rodar('timedatectl', ['show']));
      if (!this.fusos) this.fusos = (await rodar('timedatectl', ['list-timezones']).catch(() => '')).split('\n').map((x) => x.trim()).filter(fusoValido);
      return { disponivel: true, ...e, fusos: this.fusos };
    } catch {
      return { disponivel: false };
    }
  }

  /** Muda o que veio (fuso, ntp, hora), na ordem certa: a hora à mão só com o NTP desligado. */
  async definir({ fuso, ntp, hora } = {}, senha) {
    if (fuso != null) {
      if (!fusoValido(fuso)) return { ok: false, erro: 'fuso' };
      const r = await this.comoAdmin(senha, 'timedatectl', ['set-timezone', fuso]);
      if (!r.ok) return r;
    }
    if (ntp != null) {
      const r = await this.comoAdmin(senha, 'timedatectl', ['set-ntp', ntp ? 'true' : 'false']);
      if (!r.ok) return r;
    }
    if (hora != null) {
      if (!horaValida(hora)) return { ok: false, erro: 'hora' };
      const r = await this.comoAdmin(senha, 'timedatectl', ['set-time', hora]);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
}

class DataHoraFalsa {
  constructor() {
    this.e = { fuso: 'America/Sao_Paulo', ntp: true, sincronizado: true, podeNtp: true };
    this.feito = [];
  }

  async estado() {
    return { disponivel: true, ...this.e, fusos: ['America/Manaus', 'America/New_York', 'America/Sao_Paulo', 'Europe/Lisbon', 'Europe/Madrid', 'UTC'] };
  }

  async definir(o = {}, senha) {
    if (senha !== 'certa') return { ok: false, senhaErrada: true };
    if (o.fuso != null) this.e.fuso = o.fuso;
    if (o.ntp != null) this.e.ntp = !!o.ntp;
    if (o.hora != null) this.feito.push(o.hora);
    return { ok: true };
  }
}

module.exports = { DataHora, DataHoraFalsa, lerShow, fusoValido, horaValida };
