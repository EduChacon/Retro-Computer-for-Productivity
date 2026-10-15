/*
 * O gerenciador de janelas: abrir, focar, arrastar, redimensionar, minimizar,
 * maximizar e fechar, com a barra de tarefas acompanhando.
 */
import { h, img, Eventos, limitar } from './util.js';
import { barraDeMenus, fecharMenus } from './menus.js';

const area = () => document.getElementById('janelas');
export const eventos = new Eventos();
export const lista = [];
let zTopo = 10;
let cascata = 0;
let ativa = null;

export function janelaAtiva() {
  return ativa;
}

export class Janela {
  /**
   * @param {object} o
   * @param {string} o.titulo
   * @param {string} [o.icone]
   * @param {number} [o.largura] [o.altura] [o.x] [o.y]
   * @param {boolean} [o.redimensionavel=true]
   * @param {boolean} [o.maximizavel] [o.minimizavel]
   * @param {Array} [o.menus]  definição da barra de menus
   * @param {boolean} [o.dialogo]  janela modal, sem botão na barra de tarefas
   * @param {Function} [o.aoFechar]  async () => boolean: false impede o fechamento
   */
  constructor(o) {
    this.o = o;
    this.id = o.id || null;
    this.titulo = o.titulo || '';
    this.icone = o.icone || null;
    this.dialogo = !!o.dialogo;
    this.minimizada = false;
    this.maximizada = false;
    this.fechada = false;
    this.ev = new Eventos();

    const redim = o.redimensionavel !== false && !this.dialogo;
    const max = o.maximizavel !== false && redim;
    const min = o.minimizavel !== false && !this.dialogo;

    this.el = h('div.janela' + (this.dialogo ? '.dialogo' : ''), { role: 'dialog' });
    if (!redim) this.el.classList.add('fixa');
    if (o.classe) this.el.classList.add(...o.classe.split(' '));

    this.icoEl = this.icone ? img(this.icone, 16, { className: 'ico' }) : null;
    this.textoEl = h('span.texto', this.titulo);
    const botoes = h('div.botoes');
    if (o.ajuda) botoes.append(h('button.b-ajuda', { title: 'Ajuda', tabIndex: -1, on: { click: () => o.ajuda() } }));
    if (min) botoes.append(this.bMin = h('button.b-min', { title: 'Minimizar', tabIndex: -1, on: { click: () => this.minimizar() } }));
    if (max) botoes.append(this.bMax = h('button.b-max', { title: 'Maximizar', tabIndex: -1, on: { click: () => this.alternarMaximizar() } }));
    botoes.append(h('button.b-fechar', { title: 'Fechar', tabIndex: -1, on: { click: () => this.fechar() } }));
    for (const b of botoes.children) b.addEventListener('mousedown', (e) => e.stopPropagation());
    this.barraTitulo = h('div.titulo', this.icoEl, this.textoEl, botoes);
    this.el.append(this.barraTitulo);

    if (o.menus) {
      this.menubar = barraDeMenus(o.menus);
      this.el.append(this.menubar);
    }
    this.corpo = h('div.corpo');
    if (o.campoBranco) this.corpo.classList.add('campo-branco');
    this.el.append(this.corpo);
    if (o.status) {
      this.statusEl = h('div.status');
      this.el.append(this.statusEl);
      this.definirStatus(o.status);
    }
    if (redim) {
      for (const d of ['n', 's', 'l', 'o', 'ne', 'no', 'se', 'so']) {
        const a = h('div.alca.' + d);
        a.addEventListener('pointerdown', (e) => this.iniciarRedimensionar(e, d));
        this.el.append(a);
      }
      if (o.status) this.el.append(h('div.pegador'));
    }

    this.barraTitulo.addEventListener('pointerdown', (e) => this.iniciarArrasto(e));
    this.barraTitulo.addEventListener('dblclick', (e) => {
      if (max && !e.target.closest('button')) this.alternarMaximizar();
    });
    if (this.icoEl) {
      this.icoEl.addEventListener('dblclick', (e) => { e.stopPropagation(); this.fechar(); });
    }
    this.el.addEventListener('pointerdown', () => this.focar(), true);
    this.el.addEventListener('keydown', (e) => this.teclado(e));

    // Tamanho e posição.
    const t = document.getElementById('janelas').getBoundingClientRect();
    this.minL = o.minLargura || 160;
    this.minA = o.minAltura || 80;
    const w = Math.min(o.largura || 480, t.width - 8);
    const a2 = Math.min(o.altura || 340, t.height - 8);
    let x = o.x;
    let y = o.y;
    if (x == null || y == null) {
      if (this.dialogo || o.centralizar) {
        x = Math.round((t.width - w) / 2);
        y = Math.round((t.height - a2) / 2.4);
      } else {
        x = 30 + (cascata % 8) * 24;
        y = 20 + (cascata % 8) * 24;
        cascata++;
        if (x + w > t.width) x = Math.max(0, t.width - w - 4);
        if (y + a2 > t.height) y = Math.max(0, t.height - a2 - 4);
      }
    }
    this.ret = { x, y, w, h: a2 };
    this.aplicarRet();

    if (this.dialogo) {
      this.bloqueio = h('div.bloqueio', {
        on: {
          mousedown: (e) => { e.preventDefault(); this.piscar(); },
        },
      });
      const cm = document.getElementById('camada-modal');
      cm.append(this.bloqueio, this.el);
    } else {
      area().append(this.el);
    }
    lista.push(this);
    if (o.maximizada) this.maximizar();
    this.focar();
    eventos.emit('mudou');
  }

  aplicarRet() {
    const { x, y, w, h: a } = this.ret;
    Object.assign(this.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: a + 'px' });
  }

  definirTitulo(t) {
    this.titulo = t;
    this.textoEl.textContent = t;
    eventos.emit('mudou');
  }

  definirIcone(n) {
    this.icone = n;
    if (this.icoEl) this.icoEl.src = `icones/16/${n}.png`;
    eventos.emit('mudou');
  }

  definirStatus(partes) {
    if (!this.statusEl) return;
    this.statusEl.replaceChildren(...[].concat(partes).map((p) => {
      if (p instanceof Node) return p;
      if (typeof p === 'object' && p) return h('div' + (p.fixo ? '.fixo' : ''), { style: p.largura ? { width: p.largura + 'px' } : null }, p.texto);
      return h('div', p);
    }));
  }

  focar() {
    if (this.fechada) return;
    if (this.minimizada) this.restaurarDoMinimizado();
    if (ativa === this) {
      this.el.style.zIndex = this.dialogo ? 800001 + lista.indexOf(this) : this.el.style.zIndex;
      return;
    }
    if (ativa && ativa !== this) {
      ativa.el.classList.remove('ativa');
      ativa.ev.emit('desativada');
    }
    ativa = this;
    this.el.classList.add('ativa');
    if (!this.dialogo) this.el.style.zIndex = ++zTopo;
    this.ev.emit('ativada');
    eventos.emit('mudou');
  }

  piscar() {
    let n = 0;
    const t = setInterval(() => {
      this.el.classList.toggle('ativa');
      if (++n >= 6) { clearInterval(t); this.el.classList.add('ativa'); }
    }, 70);
  }

  minimizar() {
    if (this.dialogo) return;
    this.minimizada = true;
    this.el.classList.add('minimizada');
    if (ativa === this) {
      ativa = null;
      this.el.classList.remove('ativa');
      const prox = [...lista].reverse().find((j) => j !== this && !j.minimizada && !j.fechada);
      if (prox) prox.focar();
    }
    this.ev.emit('minimizada');
    eventos.emit('mudou');
  }

  restaurarDoMinimizado() {
    this.minimizada = false;
    this.el.classList.remove('minimizada');
    eventos.emit('mudou');
  }

  maximizar() {
    if (this.maximizada) return;
    this.maximizada = true;
    this.retAntes = { ...this.ret };
    this.el.classList.add('maximizada');
    Object.assign(this.el.style, { left: '0px', top: '0px', width: '100%', height: '100%' });
    if (this.bMax) { this.bMax.className = 'b-restaurar'; this.bMax.title = 'Restaurar'; }
    this.ev.emit('tamanho');
  }

  restaurar() {
    if (!this.maximizada) return;
    this.maximizada = false;
    this.el.classList.remove('maximizada');
    this.ret = this.retAntes || this.ret;
    this.aplicarRet();
    if (this.bMax) { this.bMax.className = 'b-max'; this.bMax.title = 'Maximizar'; }
    this.ev.emit('tamanho');
  }

  alternarMaximizar() {
    if (this.maximizada) this.restaurar();
    else this.maximizar();
  }

  async fechar(forcar = false) {
    if (this.fechada) return true;
    if (!forcar && this.o.aoFechar) {
      const pode = await this.o.aoFechar();
      if (pode === false) return false;
    }
    this.fechada = true;
    fecharMenus();
    this.el.remove();
    if (this.bloqueio) this.bloqueio.remove();
    const i = lista.indexOf(this);
    if (i >= 0) lista.splice(i, 1);
    this.ev.emit('fechada');
    if (ativa === this) {
      ativa = null;
      const prox = [...lista].reverse().find((j) => !j.minimizada && !j.fechada);
      if (prox) prox.focar();
      else document.getElementById('mesa').focus();
    }
    eventos.emit('mudou');
    return true;
  }

  teclado(e) {
    if (e.key === 'F10' || (e.altKey && e.key.length === 1)) {
      if (this.menubar && e.altKey && this.menubar.abrirPorLetra(e.key.toLowerCase())) {
        e.preventDefault();
      }
    }
    if (this.dialogo && e.key === 'Escape') {
      e.preventDefault();
      this.ev.emit('escape');
      if (!this.o.semEscape) this.fechar();
    }
  }

  /* ---------- Arrastar e redimensionar ---------- */

  iniciarArrasto(e) {
    if (e.button !== 0 || e.target.closest('button')) return;
    this.focar();
    if (this.maximizada) return;
    e.preventDefault();
    const ini = { px: e.clientX, py: e.clientY, x: this.ret.x, y: this.ret.y };
    const t = area().getBoundingClientRect();
    document.body.classList.add('arrastando');
    const mover = (ev) => {
      this.ret.x = Math.round(limitar(ini.x + ev.clientX - ini.px, 40 - this.ret.w, t.width - 40));
      this.ret.y = Math.round(limitar(ini.y + ev.clientY - ini.py, 0, t.height - 20));
      this.aplicarRet();
    };
    const soltar = () => {
      document.body.classList.remove('arrastando');
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      this.ev.emit('movida');
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  iniciarRedimensionar(e, dir) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    this.focar();
    const ini = { px: e.clientX, py: e.clientY, ...this.ret };
    const t = area().getBoundingClientRect();
    document.body.classList.add('arrastando');
    document.body.style.cursor = getComputedStyle(e.target).cursor;
    const mover = (ev) => {
      const dx = ev.clientX - ini.px;
      const dy = ev.clientY - ini.py;
      let { x, y, w, h: a } = ini;
      if (dir.includes('l')) w = Math.max(this.minL, ini.w + dx);
      if (dir.includes('s')) a = Math.max(this.minA, ini.h + dy);
      if (dir.includes('o')) { w = Math.max(this.minL, ini.w - dx); x = ini.x + ini.w - w; }
      if (dir.includes('n')) { a = Math.max(this.minA, ini.h - dy); y = ini.y + ini.h - a; }
      if (y < 0) { a += y; y = 0; }
      a = Math.min(a, t.height - y);
      this.ret = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(a) };
      this.aplicarRet();
      this.ev.emit('tamanho');
    };
    const soltar = () => {
      document.body.classList.remove('arrastando');
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      this.ev.emit('tamanho');
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
  }
}

export function criarJanela(o) {
  return new Janela(o);
}

/** A janela que contém um elemento (um iframe, por exemplo). */
export function janelaDe(el) {
  return lista.find((j) => j.el.contains(el)) || null;
}

/** Um clique dentro de um programa (iframe) tira o foco da página: a janela dele vem para a frente. */
window.addEventListener('blur', () => {
  setTimeout(() => {
    const a = document.activeElement;
    if (a && a.tagName === 'IFRAME') {
      const j = janelaDe(a);
      if (j && ativa !== j) j.focar();
    }
  }, 0);
});

/** Organizar as janelas (menu da barra de tarefas). */
export function emCascata() {
  let i = 0;
  for (const j of lista) {
    if (j.dialogo || j.minimizada) continue;
    j.restaurar();
    j.ret.x = 10 + i * 24;
    j.ret.y = 10 + i * 24;
    j.aplicarRet();
    j.ev.emit('tamanho');
    j.focar();
    i++;
  }
}

export function lado(vertical) {
  const vis = lista.filter((j) => !j.dialogo && !j.minimizada);
  if (!vis.length) return;
  const t = area().getBoundingClientRect();
  vis.forEach((j, i) => {
    j.restaurar();
    if (vertical) {
      const w = Math.floor(t.width / vis.length);
      j.ret = { x: i * w, y: 0, w, h: Math.floor(t.height) };
    } else {
      const a = Math.floor(t.height / vis.length);
      j.ret = { x: 0, y: i * a, w: Math.floor(t.width), h: a };
    }
    j.aplicarRet();
    j.ev.emit('tamanho');
  });
}

export function minimizarTodas() {
  for (const j of lista) if (!j.dialogo) j.minimizar();
}
