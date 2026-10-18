'use strict';
/*
 * As janelas dos programas do Linux (no Retro Computer como sistema, com o openbox): a lista
 * vem do wmctrl (o padrão EWMH), a janela ativa do xprop; ativar e fechar pelo wmctrl e
 * minimizar pelo xdotool (ou pelo wmctrl, se faltar). Assim a barra de tarefas do Retro
 * Computer mostra também os programas da Loja e os outros do Linux.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { trocarTeclas } = require('./teclas-linux');

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

/**
 * O rc.xml do Openbox com as margens novas (em pontos da tela): a faixa de cima e a de baixo ficam
 * para as barras do Retro Computer, e as janelas do Linux maximizadas encostam nelas. Só os números
 * das margens mudam; sem o bloco <margins>, ele entra antes do </openbox_config>.
 */
function trocarMargens(xml, { cima = 0, baixo = 0 } = {}) {
  const n = (v) => Math.max(0, Math.min(500, Math.round(Number(v) || 0)));
  const bloco = `<margins><top>${n(cima)}</top><bottom>${n(baixo)}</bottom><left>0</left><right>0</right></margins>`;
  const texto = String(xml);
  if (/<margins>[\s\S]*?<\/margins>/.test(texto)) return texto.replace(/<margins>[\s\S]*?<\/margins>/, () => bloco);
  return texto.replace(/<\/openbox_config>/, () => `  ${bloco}\n</openbox_config>`);
}

/* ---------- O tema do Openbox no tamanho dos pixels (funções puras, testadas em testes/janelas-linux.test.js) ---------- */

// Os desenhos dos botões das janelas do Retro Computer (os de estilo.css), ponto a ponto: o Openbox os pinta
// na cor do tema. O minimizar fica embaixo, como no Retro Computer (as linhas vazias em cima).
const GLIFOS = {
  'close.xbm': ['##....##', '.##..##.', '..####..', '...##...', '..####..', '.##..##.', '##....##'],
  'iconify.xbm': ['......', '......', '......', '......', '......', '......', '......', '######', '######'],
  'max.xbm': ['#########', '#########', '#.......#', '#.......#', '#.......#', '#.......#', '#.......#', '#.......#', '#########'],
  'max_toggled.xbm': ['..######', '..######', '..#....#', '######.#', '######.#', '#....#.#', '#....#..', '#....#..', '######..'],
};

/** Um desenho ampliado (cada ponto vira um quadrado de f × f) no formato XBM do X. */
function xbm(linhas, f) {
  const grandes = linhas.flatMap((l) => Array(f).fill([...l].flatMap((c) => Array(f).fill(c)).join('')));
  const w = grandes[0].length;
  const bytes = [];
  for (const l of grandes) {
    for (let x = 0; x < w; x += 8) {
      let b = 0;
      for (let i = 0; i < 8 && x + i < w; i++) if (l[x + i] === '#') b |= 1 << i;
      bytes.push('0x' + b.toString(16).padStart(2, '0'));
    }
  }
  return `#define b_width ${w}\n#define b_height ${grandes.length}\nstatic unsigned char b_bits[] = {\n  ${bytes.join(', ')} };\n`;
}

/** Os desenhos dos botões no fator f (inteiro: cada ponto do desenho, um quadrado de f × f pontos da tela). */
const glifosXbm = (f) => Object.fromEntries(Object.entries(GLIFOS).map(([nome, linhas]) => [nome, xbm(linhas, f)]));

/**
 * As medidas da moldura num tamanho dos pixels: a fonte do título de 9 pontos (a barra fica com os 18 pontos
 * da barra das janelas do Retro Computer) e as bordas e margens, tudo vezes o tamanho; os desenhos dos
 * botões, num fator inteiro (sem pontos borrados).
 */
function medidasDoTema(escala) {
  const s = Math.round(Math.min(4, Math.max(1, Number(escala) || 1)) * 100) / 100;
  return {
    s, fonte: Math.round(9 * s), borda: Math.max(1, Math.round(s)), margem: Math.round(2 * s),
    alca: Math.round(3 * s), cliente: Math.max(1, Math.round(s)), glifo: Math.max(1, Math.floor(s + 0.25)),
  };
}

/** O themerc do tema "Retro" com as medidas de um tamanho (as cores ficam as do arquivo). */
function themercDoTamanho(base, m) {
  const valores = {
    'border.width': m.borda, 'padding.width': m.margem, 'padding.height': m.margem, 'window.handle.width': m.alca,
    'window.client.padding.width': m.cliente, 'window.client.padding.height': m.cliente, 'menu.border.width': m.borda, 'osd.border.width': m.borda,
  };
  return String(base).replace(/^([a-z.]+):[ \t]*\d+[ \t]*$/gm, (linha, chave) => (chave in valores ? `${chave}: ${valores[chave]}` : linha));
}

const textoXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** O rc.xml com o tema numa pasta (pelo caminho completo, que o Openbox aceita) e as fontes do tamanho. */
function trocarTema(xml, pasta, fonte) {
  let t = String(xml).replace(/(<theme>\s*<name>)[^<]*(<\/name>)/, (_, a, b) => a + textoXml(pasta) + b);
  t = t.replace(/<theme>[\s\S]*?<\/theme>/, (bloco) => bloco.replace(/<size>\d+<\/size>/g, `<size>${Math.max(6, Math.min(48, Math.round(fonte)))}</size>`));
  return t;
}

/** Os ids de janela comparáveis (o wmctrl põe zeros à esquerda: 0x03a00007; o xprop, não). */
const normalizar = (id) => '0x' + String(id || '').replace(/^0x0*/i, '').toLowerCase();

class JanelasLinux {
  /**
   * pidsProprios(): os pids do Retro Computer (as janelas dele não entram);
   * programaDe(janela): o id do .desktop do programa (para o ícone e para fixar), ou null.
   */
  constructor({ pidsProprios = () => new Set([process.pid]), programaDe = () => null, aoMudar = () => { }, areaPadrao = () => null, rcOpenbox = process.env.RETRO_OPENBOX_RC, temaBase = null } = {}) {
    // A cópia do rc.xml que a sessão deu ao Openbox (sessao.sh), para as margens seguirem a barra.
    this.rcOpenbox = rcOpenbox && path.isAbsolute(rcOpenbox) && /\.xml$/i.test(rcOpenbox) ? rcOpenbox : null;
    this.margemAtual = '';
    this.temaBase = temaBase; // o themerc do tema "Retro" do pacote, a base dos temas de cada tamanho dos pixels
    this.editando = Promise.resolve(); // as mudanças no rc.xml, uma depois da outra (as margens e as teclas)
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

  /**
   * As margens das janelas do Linux (a altura das barras do Retro Computer, em pontos da tela): o
   * rc.xml da sessão muda, e o Openbox lê de novo (as janelas maximizadas acompanham). Com a margem
   * fixa, a barra de 28 pontos deixava uma fresta embaixo do Firefox.
   */
  async margens({ cima = 0, baixo = 0, escala = 0 } = {}) {
    if (!this.rcOpenbox || !existe('openbox')) return false;
    // Com o tamanho dos pixels, a moldura das janelas do Linux também cresce (a barra de título e os botões).
    const m = escala ? medidasDoTema(escala) : null;
    const chave = `${Math.round(cima)},${Math.round(baixo)},${m ? m.s : ''}`;
    if (chave === this.margemAtual) return true;
    const pasta = m ? await this.temaDoTamanho(m).catch(() => null) : null;
    const ok = await this.editarRc((xml) => {
      const x = trocarMargens(xml, { cima, baixo });
      return pasta ? trocarTema(x, pasta, m.fonte) : x;
    });
    if (ok) this.margemAtual = chave;
    return ok;
  }

  /** O tema do Openbox num tamanho dos pixels, numa pasta ao lado da cópia do rc.xml (a da sessão, só do usuário). */
  async temaDoTamanho(m) {
    if (!this.temaBase) return null;
    const base = await fs.promises.readFile(this.temaBase, 'utf8');
    const pasta = path.join(path.dirname(this.rcOpenbox), 'tema-' + String(m.s).replace('.', '_'));
    const dir = path.join(pasta, 'openbox-3');
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
    const arquivos = { themerc: themercDoTamanho(base, m), ...glifosXbm(m.glifo) };
    for (const [nome, texto] of Object.entries(arquivos)) await fs.promises.writeFile(path.join(dir, nome), texto, { mode: 0o600 });
    return pasta;
  }

  /**
   * As teclas do computador (teclas-linux.js): os atalhos do Openbox que escrevem na fila do Retro
   * Computer. Postos na cópia do rc.xml a cada abertura, valem logo depois da atualização, sem sair da sessão.
   */
  async teclas(fila) {
    if (!this.rcOpenbox || !existe('openbox')) return false;
    return this.editarRc((xml) => trocarTeclas(xml, fila));
  }

  /** Muda a cópia do rc.xml (gravada por inteiro, por cima) e pede ao Openbox que a leia de novo. */
  editarRc(mudar) {
    const vez = this.editando.then(async () => {
      let xml;
      try { xml = await fs.promises.readFile(this.rcOpenbox, 'utf8'); } catch { return false; }
      const novo = mudar(xml);
      if (novo !== xml) {
        const tmp = `${this.rcOpenbox}.${process.pid}.tmp`;
        await fs.promises.writeFile(tmp, novo, { mode: 0o600 });
        await fs.promises.rename(tmp, this.rcOpenbox);
        await rodar('openbox', ['--reconfigure']).catch(() => { });
      }
      return true;
    });
    this.editando = vez.catch(() => false);
    return vez.catch(() => false);
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

  /**
   * Avisa quando a lista (ou a ativa) muda. O "xprop -spy" conta na hora quando uma janela abre,
   * fecha ou vem para a frente, sem abrir dois programas a cada segundo e meio (o que pesa num
   * computador antigo); os títulos, que mudam sem aviso na raiz, são conferidos a cada 4 segundos.
   * Sem o xprop (ou se ele parar), a lista é lida de tempos em tempos, como antes.
   */
  vigiar(ms = 1500) {
    if (!this.disponivel()) return;
    let lendo = false;
    let deNovo = false;
    const olhar = async () => {
      if (lendo) { deNovo = true; return; }
      lendo = true;
      try {
        const r = await this.listar();
        const ass = JSON.stringify([r.retroAtivo, r.lista.map((j) => [j.id, j.titulo, j.ativa])]);
        if (ass !== this.assinatura) {
          this.assinatura = ass;
          this.aoMudar(r);
        }
      } finally {
        lendo = false;
        if (deNovo) { deNovo = false; olhar(); }
      }
    };
    let espera = null;
    const logo = () => { clearTimeout(espera); espera = setTimeout(olhar, 80); };
    let relogio = setInterval(olhar, existe('xprop') ? 4000 : ms);
    relogio.unref();
    if (existe('xprop')) {
      this.espiar(logo, () => { clearInterval(relogio); relogio = setInterval(olhar, ms); relogio.unref(); });
    }
    olhar();
  }

  /** O xprop que fica ouvindo as mudanças da raiz (a lista e a janela ativa). */
  espiar(aoMudar, aoParar) {
    try {
      const p = spawn('xprop', ['-root', '-spy', '_NET_CLIENT_LIST', '_NET_ACTIVE_WINDOW'], { stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, LC_ALL: 'C' } });
      p.stdout.on('data', aoMudar);
      p.on('error', aoParar);
      p.on('exit', aoParar);
      process.once('exit', () => { try { p.kill(); } catch { } });
      this.espiao = p;
      return true;
    } catch {
      aoParar();
      return false;
    }
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
  async margens(m) { this.margensPedidas = m; return true; }
  async teclas(fila) { this.filaDasTeclas = fila; return !this.rcOpenbox || super.teclas(fila); }
  avisar() { this.listar().then((r) => this.aoMudar(r)); }
}

module.exports = { JanelasLinux, JanelasFalsas, lerWmctrl, lerAtiva, normalizar, lerAreaUtil, lerMoldura, trocarMargens, GLIFOS, xbm, glifosXbm, medidasDoTema, themercDoTamanho, trocarTema };
