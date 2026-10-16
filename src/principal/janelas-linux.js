'use strict';
/*
 * As janelas dos programas do Linux (no Retro Computer como sistema, com o openbox): a lista
 * vem do wmctrl (o padrão EWMH), a janela ativa do xprop; ativar e fechar pelo wmctrl e
 * minimizar pelo xdotool (ou pelo wmctrl, se faltar). Assim a barra de tarefas do Retro
 * Computer mostra também os programas da Loja e os outros do Linux.
 */
const fs = require('node:fs');
const { execFile } = require('node:child_process');

function rodar(cmd, args, { timeout = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

const existe = (cmd) => ['/usr/bin/', '/bin/', '/usr/local/bin/'].some((p) => fs.existsSync(p + cmd));
const idValido = (id) => /^0x[0-9a-f]{1,10}$/i.test(String(id || ''));

/** wmctrl -lpx → [{ id, mesa, pid, instancia, classe, titulo }] (sem as fixas, como os painéis). */
function lerWmctrl(texto) {
  const r = [];
  for (const linha of String(texto).split('\n')) {
    const m = /^(0x[0-9a-f]+)\s+(-?\d+)\s+(\d+)\s+(\S+)\s+\S+\s?(.*)$/i.exec(linha);
    if (!m || m[2] === '-1') continue;
    const [instancia, ...resto] = m[4] === 'N/A' ? ['', ''] : m[4].split('.');
    r.push({ id: m[1].toLowerCase(), mesa: Number(m[2]), pid: Number(m[3]), instancia, classe: resto.join('.') || instancia, titulo: m[5].trim() });
  }
  return r;
}

/** xprop -root _NET_ACTIVE_WINDOW → '0x…' (ou null). */
function lerAtiva(texto) {
  const m = /window id # (0x[0-9a-f]+)/i.exec(String(texto));
  return m && !/^0x0+$/.test(m[1]) ? m[1].toLowerCase() : null;
}

/** xprop -root _NET_WORKAREA → { x, y, w, h } (a área sem a barra de tarefas), ou null. */
function lerAreaUtil(texto) {
  const m = /=\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/.exec(String(texto));
  return m ? { x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) } : null;
}

/** xprop -id … _NET_FRAME_EXTENTS → a moldura de cada lado { e, d, c, b } (esquerda, direita, cima, baixo). */
function lerMoldura(texto) {
  const m = /=\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/.exec(String(texto));
  return m ? { e: Number(m[1]), d: Number(m[2]), c: Number(m[3]), b: Number(m[4]) } : { e: 0, d: 0, c: 0, b: 0 };
}

/** Os ids de janela comparáveis (o wmctrl põe zeros à esquerda: 0x03a00007; o xprop, não). */
const normalizar = (id) => '0x' + String(id || '').replace(/^0x0*/i, '').toLowerCase();

class JanelasLinux {
  /**
   * pidsProprios(): os pids do Retro Computer (as janelas dele não entram);
   * programaDe(janela): o id do .desktop do programa (para o ícone e para fixar), ou null.
   */
  constructor({ pidsProprios = () => new Set([process.pid]), programaDe = () => null, aoMudar = () => { }, areaPadrao = () => null } = {}) {
    this.pidsProprios = pidsProprios;
    this.areaPadrao = areaPadrao;
    this.programaDe = programaDe;
    this.aoMudar = aoMudar;
    this.assinatura = '';
    this.lista = [];
  }

  disponivel() {
    return existe('wmctrl');
  }

  async listar() {
    if (!this.disponivel()) return { lista: [], retroAtivo: true };
    let janelas = [];
    let ativa = null;
    try { janelas = lerWmctrl(await rodar('wmctrl', ['-lpx'])); } catch { return { lista: this.lista, retroAtivo: true }; }
    try { ativa = lerAtiva(await rodar('xprop', ['-root', '_NET_ACTIVE_WINDOW'])); } catch { }
    const proprios = this.pidsProprios();
    let retroAtivo = true;
    const lista = [];
    for (const j of janelas) {
      const nossa = proprios.has(j.pid) || /retro-computer|electron/i.test(j.classe + ' ' + j.instancia);
      const eAtiva = !!ativa && normalizar(ativa) === normalizar(j.id);
      if (nossa) continue;
      if (eAtiva) retroAtivo = false;
      lista.push({ id: j.id, titulo: j.titulo || j.classe, classe: j.classe, programa: this.programaDe(j), ativa: eAtiva });
    }
    this.lista = lista;
    return { lista, retroAtivo };
  }

  async ativar(id) {
    if (!idValido(id)) return false;
    await rodar('wmctrl', ['-ia', id]).catch(() => { });
    return true;
  }

  async minimizar(id) {
    if (!idValido(id)) return false;
    if (existe('xdotool')) await rodar('xdotool', ['windowminimize', String(parseInt(id, 16))]).catch(() => { });
    else await rodar('wmctrl', ['-ir', id, '-b', 'add,hidden']).catch(() => { });
    return true;
  }

  async fechar(id) {
    if (!idValido(id)) return false;
    await rodar('wmctrl', ['-ic', id]).catch(() => { });
    return true;
  }

  /**
   * A tecla do logotipo + seta numa janela do Linux: à esquerda ou à direita, metade da tela;
   * para cima, maximiza; para baixo, restaura (se estava maximizada) ou minimiza.
   */
  async encaixar(id, seta) {
    if (!idValido(id) || !/^Arrow(Left|Right|Up|Down)$/.test(seta)) return false;
    const max = ['-ir', id, '-b', 'add,maximized_vert,maximized_horz'];
    const tirarMax = ['-ir', id, '-b', 'remove,maximized_vert,maximized_horz'];
    if (seta === 'ArrowUp') { await rodar('wmctrl', max).catch(() => { }); return true; }
    if (seta === 'ArrowDown') {
      const estado = await rodar('xprop', ['-id', id, '_NET_WM_STATE']).catch(() => '');
      if (/MAXIMIZED/.test(estado)) await rodar('wmctrl', tirarMax).catch(() => { });
      else await this.minimizar(id);
      return true;
    }
    const area = lerAreaUtil(await rodar('xprop', ['-root', '_NET_WORKAREA']).catch(() => '')) || this.areaPadrao();
    if (!area) return false;
    const mold = lerMoldura(await rodar('xprop', ['-id', id, '_NET_FRAME_EXTENTS']).catch(() => ''));
    const metade = Math.floor(area.w / 2);
    const x = seta === 'ArrowLeft' ? area.x : area.x + metade;
    const w = (seta === 'ArrowLeft' ? metade : area.w - metade) - mold.e - mold.d;
    const h = area.h - mold.c - mold.b;
    await rodar('wmctrl', tirarMax).catch(() => { });
    await rodar('wmctrl', ['-ir', id, '-e', `0,${x},${area.y},${Math.max(100, w)},${Math.max(100, h)}`]).catch(() => { });
    return true;
  }

  /** O Ctrl+V na janela da frente (o histórico da área de transferência num programa do Linux). */
  async colar() {
    if (!existe('xdotool')) return false;
    await rodar('xdotool', ['key', '--clearmodifiers', 'ctrl+v']).catch(() => { });
    return true;
  }

  /** Antes da tela de bloqueio: nenhuma janela do Linux fica por cima dela. */
  async minimizarTodas() {
    const { lista } = await this.listar();
    for (const j of lista) await this.minimizar(j.id);
    return lista.length;
  }

  /** Olha de tempos em tempos e avisa quando a lista (ou a ativa) muda. */
  vigiar(ms = 1500) {
    if (!this.disponivel()) return;
    const olhar = async () => {
      const r = await this.listar();
      const ass = JSON.stringify([r.retroAtivo, r.lista.map((j) => [j.id, j.titulo, j.ativa])]);
      if (ass !== this.assinatura) {
        this.assinatura = ass;
        this.aoMudar(r);
      }
    };
    olhar();
    setInterval(olhar, ms).unref();
  }
}

/** Para os testes e as capturas (RETRO_JANELAS_FALSAS=1): dois programas do Linux abertos. */
class JanelasFalsas extends JanelasLinux {
  constructor(o) {
    super(o);
    this.falsas = [
      { id: '0x03a00007', titulo: 'Documento sem título - LibreOffice Writer', classe: 'libreoffice-writer', programa: null, ativa: false },
      { id: '0x04c00003', titulo: 'Calculadora', classe: 'Gnome-calculator', programa: null, ativa: false },
    ];
  }

  disponivel() { return true; }
  async listar() { return { lista: this.falsas.map((j) => ({ ...j })), retroAtivo: !this.falsas.some((j) => j.ativa) }; }
  async ativar(id) { for (const j of this.falsas) j.ativa = j.id === id; this.avisar(); return true; }
  async minimizar(id) { const j = this.falsas.find((x) => x.id === id); if (j) j.ativa = false; this.avisar(); return true; }
  async fechar(id) { this.falsas = this.falsas.filter((j) => j.id !== id); this.avisar(); return true; }
  async encaixar(id, seta) { (this.encaixes = this.encaixes || []).push([id, seta]); return true; }
  async colar() { this.colados = (this.colados || 0) + 1; return true; }
  avisar() { this.listar().then((r) => this.aoMudar(r)); }
}

module.exports = { JanelasLinux, JanelasFalsas, lerWmctrl, lerAtiva, normalizar, lerAreaUtil, lerMoldura };
