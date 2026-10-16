'use strict';
/*
 * A resolução da tela (no Retro Computer como sistema do Linux, pelo xrandr): os modos do
 * monitor e a troca de um para outro. A escolha fica guardada e volta a cada abertura.
 * Fora do modo sistema, quem cuida da resolução é o próprio sistema do computador.
 *
 * Também a luz noturna do modo sistema: as cores da tela mais quentes (menos azul) pela
 * correção de gama do xrandr, que vale para tudo o que aparece, inclusive os programas do
 * Linux. Fora do modo sistema, a área de trabalho põe um filtro só sobre ela.
 */
const fs = require('node:fs');
const { execFile } = require('node:child_process');

function rodar(args, { timeout = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile('xrandr', args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

const modoValido = (m) => /^\d{3,5}x\d{3,5}i?$/.test(String(m || ''));
const saidaValida = (s) => /^[A-Za-z0-9._-]{1,40}$/.test(String(s || ''));

/**
 * xrandr --query → { saida, atual, preferido, modos: ['1440x900', …] } da tela principal
 * (a marcada como primary; sem ela, a primeira ligada), ou null.
 */
function lerXrandr(texto) {
  const telas = [];
  let tela = null;
  for (const linha of String(texto).split('\n')) {
    const c = /^(\S+) connected( primary)?/.exec(linha);
    if (c) {
      tela = { saida: c[1], principal: !!c[2], atual: null, preferido: null, modos: [] };
      telas.push(tela);
      continue;
    }
    if (/^\S/.test(linha)) { tela = null; continue; }
    const m = tela && /^\s+(\d+x\d+i?)\s+(.*)$/.exec(linha);
    if (!m) continue;
    if (!tela.modos.includes(m[1])) tela.modos.push(m[1]);
    if (m[2].includes('*')) tela.atual = m[1];
    if (m[2].includes('+')) tela.preferido = tela.preferido || m[1];
  }
  const t = telas.find((x) => x.principal) || telas[0];
  if (!t || !t.modos.length) return null;
  delete t.principal;
  return t;
}

/** As saídas ligadas (todos os monitores recebem a luz noturna). */
function lerSaidas(texto) {
  return String(texto).split('\n').map((l) => /^(\S+) connected/.exec(l)).filter(Boolean).map((m) => m[1]);
}

/**
 * A correção de gama da luz noturna: k vai de 0 (as cores de sempre) a 1 (o mais quente).
 * O vermelho fica; o verde e, mais ainda, o azul diminuem (como a luz de uma lâmpada comum).
 */
function gamaDe(k) {
  const n = Math.max(0, Math.min(1, Number(k) || 0));
  const f = (x) => (Math.round(x * 100) / 100).toFixed(2);
  return `1.00:${f(1 - 0.28 * n)}:${f(1 - 0.58 * n)}`;
}

class Tela {
  constructor({ plataforma = process.platform, sistema = false } = {}) {
    this.plataforma = plataforma;
    this.sistema = sistema;
  }

  disponivel() {
    return this.sistema && this.plataforma === 'linux' && !!process.env.DISPLAY && ['/usr/bin/xrandr', '/bin/xrandr'].some((p) => fs.existsSync(p));
  }

  async modos() {
    if (!this.disponivel()) return { disponivel: false };
    try {
      const t = lerXrandr(await rodar(['--query']));
      return t ? { disponivel: true, ...t } : { disponivel: false };
    } catch {
      return { disponivel: false };
    }
  }

  /** A luz noturna em todos os monitores (k = 0 volta às cores de sempre). */
  async luzNoturna(k) {
    if (!this.disponivel()) return { ok: false, erro: 'xrandr' };
    try {
      const saidas = lerSaidas(await rodar(['--query'])).filter(saidaValida);
      for (const s of saidas) await rodar(['--output', s, '--gamma', gamaDe(k)]);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: (e.saida || e.message || '').split('\n').pop() };
    }
  }

  async definir(saida, modo) {
    if (!saidaValida(saida) || !modoValido(modo)) return { ok: false, erro: 'modo' };
    const t = await this.modos();
    if (!t.disponivel || t.saida !== saida || !t.modos.includes(modo)) return { ok: false, erro: 'modo' };
    try {
      await rodar(['--output', saida, '--mode', modo]);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: (e.saida || e.message || '').split('\n').pop() };
    }
  }
}

/** Para os testes e as capturas (RETRO_TELA_FALSA=1): um notebook de 1440 × 900. */
class TelaFalsa extends Tela {
  constructor(o) {
    super(o);
    this.atual = '1440x900';
  }

  disponivel() { return true; }
  async luzNoturna(k) { this.gama = gamaDe(k); return { ok: true }; }
  async modos() { return { disponivel: true, saida: 'eDP-1', atual: this.atual, preferido: '1440x900', modos: ['1440x900', '1366x768', '1280x800', '1024x768', '800x600'] }; }
  async definir(saida, modo) {
    const t = await this.modos();
    if (saida !== t.saida || !t.modos.includes(modo)) return { ok: false, erro: 'modo' };
    this.atual = modo;
    return { ok: true };
  }
}

module.exports = { Tela, TelaFalsa, lerXrandr, lerSaidas, gamaDe, modoValido, saidaValida };
