'use strict';
/*
 * Os cantos magnéticos das janelas dos programas do Linux (no Retro Computer como sistema): o
 * Openbox não os tem. O xev da raiz avisa cada movimento das molduras; com o botão do mouse
 * apertado (o xinput, aparelho por aparelho: o ponteiro principal não responde), é a pessoa
 * arrastando uma janela. Enquanto ela arrasta, o ponteiro na borda da tela mostra o contorno de onde
 * a janela vai ficar, como nas janelas do Retro Computer (janelas.js); ao soltar, ela encaixa: metade
 * da tela, um quarto (nos cantos) ou maximizada (no alto). Arrastada para fora do encaixe, ela volta
 * ao tamanho de antes ao soltar (no meio do arrasto, o Openbox desfaz a mudança de tamanho no movimento
 * seguinte). Nada daqui lê o teclado.
 */
const fs = require('node:fs');
const { execFile, spawn } = require('node:child_process');

const BORDA = 6; // a distância da borda que conta como encostar (nos pontos do Retro Computer, como em janelas.js)
const CANTO = 56; // e a do canto, para encaixar num quarto
const PASSO = 70; // de quanto em quanto tempo o ponteiro é lido durante o arrasto (ms)

function rodar(cmd, args, { timeout = 3000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

const existe = (cmd) => ['/usr/bin/', '/bin/', '/usr/local/bin/'].some((p) => fs.existsSync(p + cmd));
const normalizar = (id) => '0x' + String(id || '').replace(/^0x0*/i, '').toLowerCase();

/**
 * Onde o ponteiro encosta, numa área { x, y, w, h } da tela: 'esq', 'dir', 'max' (o alto) ou um canto
 * ('no', 'ne', 'so', 'se'); fora das bordas, null. k é o tamanho dos pixels do Retro Computer.
 */
function zonaNaArea(px, py, a, k = 1) {
  if (!a) return null;
  const borda = BORDA * k;
  const canto = CANTO * k;
  const esq = px <= a.x + borda;
  const dir = px >= a.x + a.w - 1 - borda;
  const alto = py <= a.y + borda;
  const perto = (v, alvo) => Math.abs(v - alvo) < canto;
  const fim = a.y + a.h;
  if (esq) return perto(py, a.y) ? 'no' : perto(py, fim) || py > fim ? 'so' : 'esq';
  if (dir) return perto(py, a.y) ? 'ne' : perto(py, fim) || py > fim ? 'se' : 'dir';
  if (alto) return perto(px, a.x) ? 'no' : perto(px, a.x + a.w) ? 'ne' : 'max';
  return null;
}

/** O retângulo de cada encaixe (a moldura inteira), dentro da área. */
function retDaZona(zona, a) {
  if (!a) return null;
  const w2 = Math.floor(a.w / 2);
  const h2 = Math.floor(a.h / 2);
  const r = {
    esq: [0, 0, w2, a.h], dir: [w2, 0, a.w - w2, a.h],
    no: [0, 0, w2, h2], ne: [w2, 0, a.w - w2, h2], so: [0, h2, w2, a.h - h2], se: [w2, h2, a.w - w2, a.h - h2],
    max: [0, 0, a.w, a.h],
  }[zona];
  return r ? { x: a.x + r[0], y: a.y + r[1], w: r[2], h: r[3] } : null;
}

/** A área da tela do ponto: o monitor em que ele está, sem as barras (a área útil do Openbox). */
function areaDoPonto(px, py, telas, util) {
  const t = (telas || []).find((m) => px >= m.x && px < m.x + m.w && py >= m.y && py < m.y + m.h) || (telas || [])[0];
  if (!t) return util || null;
  if (!util) return t;
  const x = Math.max(t.x, util.x);
  const y = Math.max(t.y, util.y);
  const w = Math.min(t.x + t.w, util.x + util.w) - x;
  const h = Math.min(t.y + t.h, util.y + util.h) - y;
  return w > 0 && h > 0 ? { x, y, w, h } : t;
}

/**
 * As linhas do xev da raiz (-event substructure): os ConfigureNotify das molduras, como
 * { janela, x, y, w, h }. O evento vem em três linhas; os números ficam na segunda.
 */
function leitorDoXev(aoMover) {
  let resto = '';
  let noEvento = false;
  return (pedaco) => {
    resto += String(pedaco);
    let i;
    while ((i = resto.indexOf('\n')) >= 0) {
      const linha = resto.slice(0, i);
      resto = resto.slice(i + 1);
      if (/^ConfigureNotify event/.test(linha)) { noEvento = true; continue; }
      if (noEvento) {
        noEvento = false;
        const m = /^\s+event 0x[0-9a-f]+, window (0x[0-9a-f]+), \((-?\d+),(-?\d+)\), width (\d+), height (\d+)/i.exec(linha);
        if (m) aoMover({ janela: normalizar(m[1]), x: Number(m[2]), y: Number(m[3]), w: Number(m[4]), h: Number(m[5]) });
      }
    }
    if (resto.length > 4096) resto = '';
  };
}

/** xinput list --short → os ids dos aparelhos de apontar (o mouse, o touchpad, o de teste). */
function lerPonteiros(texto) {
  return [...String(texto).matchAll(/id=(\d+)\s+\[slave\s+pointer/g)].map((m) => m[1]);
}

/** xinput query-state → o botão esquerdo está apertado? */
const botaoApertado = (texto) => /button\[1\]=down/.test(String(texto));

/** xdotool getmouselocation --shell → { x, y }, ou null. */
function lerLocal(texto) {
  const x = /^X=(-?\d+)/m.exec(String(texto));
  const y = /^Y=(-?\d+)/m.exec(String(texto));
  return x && y ? { x: Number(x[1]), y: Number(y[1]) } : null;
}

/**
 * Pelo xprop da janela (_NET_WM_STATE, _NET_WM_WINDOW_TYPE e WM_NORMAL_HINTS): ela encaixa? Só as
 * janelas comuns que mudam de tamanho; as sempre visíveis (o vídeo em janela flutuante), as caixas e
 * as de tamanho fixo, não.
 */
function encaixavel(texto) {
  const t = String(texto);
  if (/_NET_WM_STATE_(ABOVE|STICKY|FULLSCREEN|SKIP_TASKBAR)/.test(t)) return false;
  const tipo = /_NET_WM_WINDOW_TYPE\(ATOM\) = ([^\n]+)/.exec(t);
  if (tipo && !/_NET_WM_WINDOW_TYPE_NORMAL/.test(tipo[1])) return false;
  const min = /minimum size: (\d+) by (\d+)/.exec(t);
  const max = /maximum size: (\d+) by (\d+)/.exec(t);
  if (min && max && min[1] === max[1] && min[2] === max[2]) return false;
  return true;
}

class CantosLinux {
  /**
   * janelas: o JanelasLinux (a lista das janelas do Linux, o encaixe e o tamanho de antes);
   * ligado(): a opção de Painel › Aparência; telas(): os monitores, em pontos da tela;
   * previa(ret | null): mostra ou esconde o contorno.
   */
  constructor({ janelas, ligado = () => true, telas = () => [], previa = () => { } } = {}) {
    this.janelas = janelas;
    this.ligado = ligado;
    this.telas = telas;
    this.previa = previa;
    this.geo = new Map(); // a última geometria de cada moldura
    this.arrasto = null;
    this.conferindo = false;
    this.ponteiros = [];
  }

  disponivel() {
    return ['xev', 'xinput', 'xdotool', 'wmctrl', 'xprop', 'stdbuf'].every(existe);
  }

  iniciar() {
    if (!this.disponivel() || this.xev) return false;
    try {
      const p = spawn('stdbuf', ['-oL', 'xev', '-root', '-event', 'substructure'], { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, LC_ALL: 'C' } });
      p.stdout.on('data', leitorDoXev((ev) => this.aoMover(ev)));
      p.on('error', () => { this.xev = null; });
      p.on('exit', () => { this.xev = null; });
      process.once('exit', () => { try { p.kill(); } catch { } });
      this.xev = p;
      return true;
    } catch {
      return false;
    }
  }

  /** Uma moldura mudou: só um movimento (sem mudar o tamanho) pode ser alguém arrastando. */
  aoMover(ev) {
    const antes = this.geo.get(ev.janela);
    if (this.geo.size > 400) this.geo.clear();
    this.geo.set(ev.janela, ev);
    if (!antes || this.arrasto || this.conferindo) return;
    const moveu = (antes.x !== ev.x || antes.y !== ev.y) && antes.w === ev.w && antes.h === ev.h;
    if (moveu && this.ligado()) this.comecar().catch(() => { this.arrasto = null; this.conferindo = false; });
  }

  async botao() {
    const r = await Promise.all(this.ponteiros.map((id) => rodar('xinput', ['query-state', id]).catch(() => '')));
    return r.some(botaoApertado);
  }

  async local() {
    return lerLocal(await rodar('xdotool', ['getmouselocation', '--shell']).catch(() => ''));
  }

  async comecar() {
    this.conferindo = true;
    try {
      this.ponteiros = lerPonteiros(await rodar('xinput', ['list', '--short']).catch(() => ''));
      if (!(await this.botao())) return; // um movimento de programa (o wmctrl, um encaixe)
      const ativa = await rodar('xdotool', ['getactivewindow']).catch(() => '');
      const id = /^\d+/.test(ativa.trim()) ? normalizar(Number(ativa.trim()).toString(16)) : null;
      const doLinux = !!id && (this.janelas.lista || []).some((j) => normalizar(j.id) === id);
      const ok = doLinux && encaixavel(await rodar('xprop', ['-id', id, '_NET_WM_STATE', '_NET_WM_WINDOW_TYPE', 'WM_NORMAL_HINTS']).catch(() => ''));
      const util = this.janelas.lerAreaUtil ? await this.janelas.lerAreaUtil().catch(() => null) : null;
      // Uma janela que não encaixa (o Retro Computer, o vídeo flutuante) só é acompanhada até soltar.
      this.arrasto = { id: ok ? id : null, zona: null, util, encaixada: ok && this.janelas.antesDoEncaixe.has(id) };
    } finally {
      this.conferindo = false;
    }
    if (this.arrasto) this.passo();
  }

  /** Durante o arrasto: o contorno segue o ponteiro; ao soltar, a janela encaixa. */
  passo() {
    setTimeout(async () => {
      const a = this.arrasto;
      if (!a) return;
      try {
        const [apertado, p] = await Promise.all([this.botao(), this.local()]);
        const k = this.janelas.escala || 1;
        const area = p ? areaDoPonto(p.x, p.y, this.telas(), a.util) : null;
        const zona = a.id && p && this.ligado() ? zonaNaArea(p.x, p.y, area, k) : null;
        if (zona !== a.zona) { a.zona = zona; this.previa(zona ? retDaZona(zona, area) : null); }
        if (apertado) { this.passo(); return; }
        this.arrasto = null;
        if (a.zona) {
          this.previa(null);
          await this.janelas.encaixarNaArea(a.id, a.zona, area);
        } else if (a.encaixada) {
          await this.janelas.voltarDoEncaixe(a.id);
        }
      } catch {
        this.arrasto = null;
        this.previa(null);
      }
    }, PASSO);
  }

  parar() {
    if (this.xev) { try { this.xev.kill(); } catch { } }
    this.xev = null;
    this.arrasto = null;
    this.previa(null);
  }
}

module.exports = { CantosLinux, zonaNaArea, retDaZona, areaDoPonto, leitorDoXev, lerPonteiros, botaoApertado, lerLocal, encaixavel, BORDA, CANTO };
