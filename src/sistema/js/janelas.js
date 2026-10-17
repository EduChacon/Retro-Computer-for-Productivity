/*
 * O gerenciador de janelas: abrir, focar, arrastar, redimensionar, minimizar,
 * maximizar e fechar, com a barra de tarefas acompanhando.
 */
import { h, img, icone, Eventos, limitar } from './util.js';
import { barraDeMenus, fecharMenus } from './menus.js';
import { tr } from './idioma.js';
import { variasTelas, telaDoPonto, telaPrincipal, areaUtil, aoMudarTelas, listaTelas } from './telas.js';
import { temaMac, aoMudarTema } from './tema.js';

const area = () => document.getElementById('janelas');

/*
 * As duas telas em tela cheia (telas.js): o lugar de uma janela é a tela em que ela está, sem a
 * barra de tarefas na principal. As contas são feitas na página (como o getBoundingClientRect); as
 * janelas ficam na área das janelas, que fica na tela principal. Com uma tela só, a área de cada
 * tela é a própria área das janelas, como sempre.
 */
function areaDaTela(px, py) {
  if (!variasTelas()) return area().getBoundingClientRect();
  return areaUtil(telaDoPonto(px, py));
}

/** Um retângulo da página nas coordenadas da área das janelas. */
function naArea(r) {
  const a = area().getBoundingClientRect();
  return { x: Math.round(r.x - a.left), y: Math.round(r.y - a.top), w: Math.round(r.w), h: Math.round(r.h) };
}

/** O retângulo de um encaixe na tela t (da página), nas coordenadas da área das janelas. */
function encaixeNaTela(nome, t) {
  const r = retDoEncaixe(nome, t);
  return naArea({ x: r.x + t.left, y: r.y + t.top, w: r.w, h: r.h });
}

/** Até onde uma janela pode ir ao ser arrastada: as telas todas, nas coordenadas da área. */
function limitesDoArrasto() {
  const a = area().getBoundingClientRect();
  if (!variasTelas()) return { x0: 0, y0: 0, x1: a.width, y1: a.height };
  const ts = listaTelas().map(areaUtil);
  return {
    x0: Math.min(...ts.map((r) => r.left)) - a.left, y0: Math.min(...ts.map((r) => r.top)) - a.top,
    x1: Math.max(...ts.map((r) => r.right)) - a.left, y1: Math.max(...ts.map((r) => r.bottom)) - a.top,
  };
}
export const eventos = new Eventos();
export const lista = [];
let zTopo = 10;
let cascata = 0;
let ativa = null;
// O programa que está abrindo agora (sistema.abrir): as janelas criadas nesse instante são dele,
// para a barra de tarefas agrupar e fixar.
let programaAbrindo = null;
// A ordem em que as janelas foram usadas (a mais recente no fim), para o Alt+Tab.
export const recentes = [];
// As áreas de trabalho (como as do Windows de hoje): cada janela é de uma; só as da área de agora
// ficam à vista, na barra de tarefas e no Alt+Tab. As caixas de diálogo ficam sempre à vista.
export const MAX_AREAS = 8;
let areaAgora = 0;
let totalAreas = 1;
export const areaAtual = () => areaAgora;
export const numAreas = () => totalAreas;
/** A janela é da área de agora? (Os diálogos e as janelas do Linux, sempre.) */
export const daAreaAtual = (j) => !!(j.nativa || j.dialogo || (j.area || 0) === areaAgora);
// Os cantos magnéticos: arrastar a janela até a borda encaixa (Painel › Aparência › Configurações).
export const opcoes = { encaixe: true };

export function comPrograma(id, fn) {
  const antes = programaAbrindo;
  programaAbrindo = id;
  try { return fn(); } finally { programaAbrindo = antes; }
}

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
    this.programa = o.programa || programaAbrindo || null;
    // A área de trabalho: a de agora (o Reabrir ao ligar pode pôr a janela na área em que ela estava).
    this.area = !this.dialogo && Number.isInteger(o.area) && o.area >= 0 && o.area < totalAreas ? o.area : areaAgora;
    this.minimizada = false;
    this.maximizada = false;
    this.fechada = false;
    this.ev = new Eventos();

    const redim = o.redimensionavel !== false && !this.dialogo;
    const max = o.maximizavel !== false && redim;
    this.redim = redim;
    this.encaixe = null;
    const min = o.minimizavel !== false && !this.dialogo;

    this.el = h('div.janela' + (this.dialogo ? '.dialogo' : ''), { role: 'dialog' });
    if (!redim) this.el.classList.add('fixa');
    if (o.classe) this.el.classList.add(...o.classe.split(' '));

    this.icoEl = this.icone ? img(this.icone, 16, { className: 'ico' }) : null;
    this.textoEl = h('span.texto', this.titulo);
    const botoes = h('div.botoes');
    if (o.ajuda) botoes.append(h('button.b-ajuda', { title: tr('Ajuda'), tabIndex: -1, on: { click: () => o.ajuda() } }));
    if (min) botoes.append(this.bMin = h('button.b-min', { title: dicaMin(), tabIndex: -1, on: { click: () => (temaMac() ? this.alternarRecolher() : this.minimizar()) } }));
    if (max) botoes.append(this.bMax = h('button.b-max', { title: tr('Maximizar'), tabIndex: -1, on: { click: () => this.alternarMaximizar() } }));
    botoes.append(h('button.b-fechar', { title: tr('Fechar'), tabIndex: -1, on: { click: () => this.fechar() } }));
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
    // O duplo clique no título: no tema Mac, recolhe a janela (como na época); no PC, maximiza.
    this.barraTitulo.addEventListener('dblclick', (e) => {
      if (e.target.closest('button')) return;
      if (temaMac()) { if (min || this.redim) this.alternarRecolher(); } else if (max) this.alternarMaximizar();
    });
    if (this.icoEl) {
      this.icoEl.addEventListener('dblclick', (e) => { if (temaMac()) return; e.stopPropagation(); this.fechar(); });
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
    acompanharArea();
    if (o.maximizada) this.maximizar();
    if (daAreaAtual(this)) this.focar();
    else this.el.classList.add('outra-area');
    eventos.emit('mudou');
  }

  aplicarRet() {
    const { x, y, w, h: a } = this.ret;
    Object.assign(this.el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: a + 'px' });
  }

  /** A área da tela em que a janela está (pelo alto do meio dela, onde fica a barra de título). */
  areaAtual() {
    const a = area().getBoundingClientRect();
    return areaDaTela(a.left + this.ret.x + this.ret.w / 2, a.top + this.ret.y + 10);
  }

  /** A tela em que a janela está (telas.js): a da maximizada, a do encaixe ou a do alto da janela. */
  tela() {
    if (!variasTelas()) return telaPrincipal();
    const p = this.maximizada && this.pontoMax ? this.pontoMax : this.encaixe && this.pontoEncaixe ? this.pontoEncaixe : null;
    if (p) return telaDoPonto(p.x, p.y);
    const a = area().getBoundingClientRect();
    return telaDoPonto(a.left + this.ret.x + this.ret.w / 2, a.top + this.ret.y + 10);
  }

  /** A área da tela do encaixe (guardada pelo meio dela, que vale também depois de os monitores mudarem). */
  areaDoEncaixe() {
    return this.pontoEncaixe ? areaDaTela(this.pontoEncaixe.x, this.pontoEncaixe.y) : this.areaAtual();
  }

  /** Maximizada, com as duas telas: a tela inteira em que ela está. */
  aplicarMaximizada() {
    if (!variasTelas()) { Object.assign(this.el.style, { left: '0px', top: '0px', width: '100%', height: '100%' }); return; }
    const t = this.pontoMax ? areaDaTela(this.pontoMax.x, this.pontoMax.y) : this.areaAtual();
    this.pontoMax = { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    const r = naArea({ x: t.left, y: t.top, w: t.width, h: t.height });
    Object.assign(this.el.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  }

  definirTitulo(t) {
    this.titulo = t;
    this.textoEl.textContent = t;
    eventos.emit('mudou');
  }

  definirIcone(n) {
    this.icone = n;
    if (this.icoEl) this.icoEl.src = icone(n, 16);
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
    // A janela de outra área de trabalho leva para ela (como no Windows).
    if (!daAreaAtual(this)) irParaArea(this.area, { focar: false });
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
    if (!this.dialogo) {
      const i = recentes.indexOf(this);
      if (i >= 0) recentes.splice(i, 1);
      recentes.push(this);
    }
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
      const prox = [...lista].reverse().find((j) => j !== this && !j.minimizada && !j.fechada && daAreaAtual(j));
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

  /** Recolhe a janela (só a barra de título fica à vista) ou a abre de novo: o tema Mac clássico. */
  alternarRecolher(v = !this.recolhida) {
    if (this.fechada || !!v === !!this.recolhida) return;
    this.recolhida = !!v;
    this.el.classList.toggle('recolhida', this.recolhida);
    this.ev.emit('tamanho');
    eventos.emit('lugar', this);
  }

  maximizar() {
    if (this.recolhida) this.alternarRecolher(false);
    if (this.maximizada) return;
    this.maximizada = true;
    this.retAntes = { ...this.ret };
    this.pontoMax = null;
    this.el.classList.add('maximizada');
    this.aplicarMaximizada();
    if (this.bMax) { this.bMax.className = 'b-restaurar'; this.bMax.dataset.dica = tr('Restaurar'); }
    this.ev.emit('tamanho');
    eventos.emit('lugar', this);
  }

  restaurar() {
    if (!this.maximizada) return;
    this.maximizada = false;
    this.el.classList.remove('maximizada');
    this.ret = this.retAntes || this.ret;
    // Maximizada a partir de um encaixe, volta ao encaixe (a tela pode ter mudado de tamanho).
    if (this.encaixe) this.ret = encaixeNaTela(this.encaixe, this.areaDoEncaixe());
    this.aplicarRet();
    if (this.bMax) { this.bMax.className = 'b-max'; this.bMax.dataset.dica = tr('Maximizar'); }
    this.ev.emit('tamanho');
    eventos.emit('lugar', this);
  }

  /**
   * Encaixa numa metade ('esq', 'dir') ou num quarto da tela ('no', 'ne', 'so', 'se'); 'max' maximiza.
   * t é a área da tela (com as duas telas, a de onde o ponteiro soltou; sem ela, a da janela).
   */
  encaixar(nome, t = null) {
    if (!this.redim || !nome) return;
    if (this.recolhida) this.alternarRecolher(false);
    if (nome === 'max') { this.maximizar(); return; }
    const tela = t || (this.maximizada && this.pontoMax ? areaDaTela(this.pontoMax.x, this.pontoMax.y) : this.areaAtual());
    if (this.maximizada) this.restaurar();
    if (!this.encaixe) this.retLivre = { ...this.ret };
    this.encaixe = nome;
    this.pontoEncaixe = { x: tela.left + tela.width / 2, y: tela.top + tela.height / 2 };
    this.ret = encaixeNaTela(nome, tela);
    this.el.classList.add('encaixada');
    this.aplicarRet();
    this.ev.emit('tamanho');
    eventos.emit('lugar', this);
  }

  /** Sai do encaixe e volta ao tamanho e ao lugar de antes. */
  desencaixar() {
    if (!this.encaixe) return;
    this.encaixe = null;
    this.el.classList.remove('encaixada');
    if (this.retLivre) this.ret = { ...this.retLivre };
    this.aplicarRet();
    this.ev.emit('tamanho');
  }

  /** As teclas do logotipo + setas, como no Windows (a seta e o estado de agora dizem o próximo). */
  encaixarPorSeta(seta) {
    if (this.dialogo) return;
    const estadoAgora = this.maximizada ? 'max' : this.encaixe || 'livre';
    const destino = (SETAS[estadoAgora] || SETAS.livre)[seta];
    if (!destino) return;
    if (destino === 'minimizar') this.minimizar();
    else if (destino === 'restaurar') { if (this.maximizada) this.restaurar(); else this.desencaixar(); }
    else if (destino === 'livre') this.desencaixar();
    else this.encaixar(destino);
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
    const r = recentes.indexOf(this);
    if (r >= 0) recentes.splice(r, 1);
    this.ev.emit('fechada');
    if (ativa === this) {
      ativa = null;
      const prox = [...lista].reverse().find((j) => !j.minimizada && !j.fechada && daAreaAtual(j));
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
    if (this.maximizada && !this.redim) return;
    e.preventDefault();
    const ini = { px: e.clientX, py: e.clientY, x: this.ret.x, y: this.ret.y };
    const t = area().getBoundingClientRect();
    // Até onde a janela vai: a área das janelas (com as duas telas, as duas).
    const lim = limitesDoArrasto();
    // Maximizada ou encaixada, a janela só sai do lugar depois de o ponteiro andar um pouco.
    let preso = this.maximizada || !!this.encaixe;
    let zona = null;
    let telaZona = null;
    document.body.classList.add('arrastando');
    const mover = (ev) => {
      if (preso) {
        if (Math.abs(ev.clientX - ini.px) + Math.abs(ev.clientY - ini.py) < 6) return;
        // Volta ao tamanho livre com a barra de título embaixo do ponteiro, na mesma proporção.
        const re = this.el.getBoundingClientRect();
        const prop = limitar((ini.px - re.left) / re.width, 0.05, 0.95);
        if (this.maximizada) this.restaurar();
        this.desencaixar();
        ini.x = Math.round(ini.px - t.left - prop * this.ret.w);
        ini.y = Math.max(lim.y0, Math.round(ini.py - t.top - 9));
        preso = false;
      }
      this.ret.x = Math.round(limitar(ini.x + ev.clientX - ini.px, lim.x0 + 40 - this.ret.w, lim.x1 - 40));
      this.ret.y = Math.round(limitar(ini.y + ev.clientY - ini.py, lim.y0, lim.y1 - 20));
      this.aplicarRet();
      telaZona = areaDaTela(ev.clientX, ev.clientY);
      zona = opcoes.encaixe && this.redim ? zonaDoPonteiro(ev.clientX, ev.clientY, telaZona) : null;
      mostrarPrevia(zona, telaZona);
    };
    const soltar = () => {
      document.body.classList.remove('arrastando');
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      mostrarPrevia(null);
      if (zona) this.encaixar(zona, telaZona);
      this.ev.emit('movida');
      // A barra de tarefas da outra tela fica sabendo (barra.js).
      eventos.emit('lugar', this);
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
    // O alto e o pé da tela em que a janela está (com uma tela só, os da área das janelas).
    const tela = this.areaAtual();
    const topo = Math.round(tela.top - t.top);
    const pe = Math.round(tela.bottom - t.top);
    document.body.classList.add('arrastando');
    document.body.style.cursor = getComputedStyle(e.target).cursor;
    // Redimensionar à mão tira do encaixe (o tamanho novo passa a ser o livre).
    if (this.encaixe) { this.encaixe = null; this.el.classList.remove('encaixada'); }
    const mover = (ev) => {
      const dx = ev.clientX - ini.px;
      const dy = ev.clientY - ini.py;
      let { x, y, w, h: a } = ini;
      if (dir.includes('l')) w = Math.max(this.minL, ini.w + dx);
      if (dir.includes('s')) a = Math.max(this.minA, ini.h + dy);
      if (dir.includes('o')) { w = Math.max(this.minL, ini.w - dx); x = ini.x + ini.w - w; }
      if (dir.includes('n')) { a = Math.max(this.minA, ini.h - dy); y = ini.y + ini.h - a; }
      if (y < topo) { a += y - topo; y = topo; }
      a = Math.min(a, pe - y);
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

/*
 * Com uma caixa modal aberta, o foco fica nela. Um programa por baixo que pega o foco de volta um
 * instante depois de outra caixa fechar (o "ativada" com setTimeout do Explorador) não leva as teclas
 * da caixa nova: o Enter dela abriria o arquivo escolhido no Explorador.
 */
document.addEventListener('focusin', (e) => {
  const caixa = [...lista].reverse().find((j) => j.dialogo && !j.fechada);
  if (!caixa) return;
  if (caixa.el.contains(e.target)) { caixa.ultimoFoco = e.target; return; }
  // Os menus, a tela de bloqueio e a de entrada ficam por cima de tudo e guardam o foco delas.
  if (e.target.closest && e.target.closest('.menu, #camada-menus, #bloqueio, #entrada')) return;
  const alvo = caixa.ultimoFoco && caixa.el.contains(caixa.ultimoFoco)
    ? caixa.ultimoFoco
    : caixa.el.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]');
  if (alvo) alvo.focus();
});

/* ---------- Os cantos magnéticos ---------- */

const BORDA = 6;   // a distância da borda que conta como encostar
const CANTO = 56;  // e a do canto, para encaixar num quarto

/** Onde o ponteiro encosta: 'esq', 'dir', 'max' (o alto) ou um canto ('no', 'ne', 'so', 'se'). */
export function zonaDoPonteiro(x, y, t) {
  const esq = x <= t.left + BORDA;
  const dir = x >= t.right - BORDA - 1;
  const alto = y <= t.top + BORDA;
  const perto = (v, a) => Math.abs(v - a) < CANTO;
  if (esq) return perto(y, t.top) ? 'no' : perto(y, t.bottom) || y > t.bottom ? 'so' : 'esq';
  if (dir) return perto(y, t.top) ? 'ne' : perto(y, t.bottom) || y > t.bottom ? 'se' : 'dir';
  if (alto) return perto(x, t.left) ? 'no' : perto(x, t.right) ? 'ne' : 'max';
  return null;
}

/** O retângulo de cada encaixe, dentro da área das janelas (sem a barra de tarefas). */
export function retDoEncaixe(nome, t) {
  const W = Math.floor(t.width);
  const H = Math.floor(t.height);
  const w2 = Math.floor(W / 2);
  const h2 = Math.floor(H / 2);
  return {
    esq: { x: 0, y: 0, w: w2, h: H },
    dir: { x: w2, y: 0, w: W - w2, h: H },
    no: { x: 0, y: 0, w: w2, h: h2 },
    ne: { x: w2, y: 0, w: W - w2, h: h2 },
    so: { x: 0, y: h2, w: w2, h: H - h2 },
    se: { x: w2, y: h2, w: W - w2, h: H - h2 },
    max: { x: 0, y: 0, w: W, h: H },
  }[nome];
}

// Logotipo + seta: do estado de agora (livre, maximizada ou um encaixe) para o próximo.
const SETAS = {
  livre: { ArrowLeft: 'esq', ArrowRight: 'dir', ArrowUp: 'max', ArrowDown: 'minimizar' },
  max: { ArrowLeft: 'esq', ArrowRight: 'dir', ArrowDown: 'restaurar' },
  esq: { ArrowRight: 'livre', ArrowUp: 'no', ArrowDown: 'so' },
  dir: { ArrowLeft: 'livre', ArrowUp: 'ne', ArrowDown: 'se' },
  no: { ArrowRight: 'ne', ArrowUp: 'max', ArrowDown: 'esq' },
  ne: { ArrowLeft: 'no', ArrowUp: 'max', ArrowDown: 'dir' },
  so: { ArrowRight: 'se', ArrowUp: 'esq', ArrowDown: 'minimizar' },
  se: { ArrowLeft: 'so', ArrowUp: 'dir', ArrowDown: 'minimizar' },
};

// O contorno quadriculado do lugar onde a janela vai encaixar (como o arrastar das janelas da época).
let previa = null;
function mostrarPrevia(zona, t) {
  if (!zona) { if (previa) previa.hidden = true; return; }
  if (!previa) {
    previa = h('div.previa-encaixe', { hidden: true });
    area().append(previa);
  }
  const r = encaixeNaTela(zona, t);
  Object.assign(previa.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
  previa.hidden = false;
}

// A área muda de tamanho (a resolução, a barra de tarefas com a data): os encaixes acompanham.
let observador = null;
function acompanharArea() {
  if (observador || !area() || typeof ResizeObserver === 'undefined') return;
  observador = new ResizeObserver(() => ajustarAsTelas());
  observador.observe(area());
}

/** As telas mudaram (o tamanho, um monitor a mais ou a menos): os encaixes, as maximizadas e as perdidas. */
function ajustarAsTelas() {
  if (document.fullscreenElement) return; // um vídeo em tela cheia: a janela volta a ser como era
  for (const j of lista) {
    if (j.fechada) continue;
    if (j.maximizada) { j.aplicarMaximizada(); j.ev.emit('tamanho'); continue; }
    if (j.encaixe) { j.ret = encaixeNaTela(j.encaixe, j.areaDoEncaixe()); j.aplicarRet(); j.ev.emit('tamanho'); continue; }
    trazerParaAVista(j);
  }
}

/**
 * A janela cuja barra de título ficou fora de todas as telas (um monitor desligado) volta para a
 * principal. Basta um pedaço de 40 pontos dela à vista para ficar onde está (o mesmo que o arrastar deixa).
 */
function trazerParaAVista(j) {
  const a = area().getBoundingClientRect();
  const x0 = a.left + j.ret.x;
  const x1 = x0 + j.ret.w;
  const y = a.top + j.ret.y + 10;
  const telas = variasTelas() ? listaTelas().map(areaUtil) : [a];
  if (telas.some((r) => Math.min(x1, r.right) - Math.max(x0, r.left) >= 40 && y >= r.top - 10 && y < r.bottom)) return;
  j.ret.w = Math.min(j.ret.w, Math.max(j.minL, a.width - 8));
  j.ret.h = Math.min(j.ret.h, Math.max(j.minA, a.height - 8));
  j.ret.x = Math.max(0, Math.min(Math.round((a.width - j.ret.w) / 2), a.width - j.ret.w));
  j.ret.y = Math.max(0, Math.min(Math.round((a.height - j.ret.h) / 3), a.height - j.ret.h));
  j.aplicarRet();
  j.ev.emit('tamanho');
}

aoMudarTelas(() => { if (area()) { ajustarAsTelas(); eventos.emit('lugar'); } });

/** A dica da caixa da direita do título: recolher (tema Mac) ou minimizar. */
const dicaMin = () => (temaMac() ? tr('Recolher') : tr('Minimizar'));

// O tema mudou: as dicas da caixa da direita, e as janelas recolhidas abrem de novo no tema do PC.
aoMudarTema(() => {
  for (const j of lista) {
    if (j.bMin) { j.bMin.dataset.dica = dicaMin(); j.bMin.removeAttribute('title'); }
    if (!temaMac() && j.recolhida) j.alternarRecolher(false);
  }
  if (area()) ajustarAsTelas();
});

/** Refaz as maximizadas e os encaixes (a barra de tarefas apareceu ou sumiu na outra tela). */
export function reajustarJanelas() { if (area()) ajustarAsTelas(); }

const soltarEncaixe = (j) => { j.encaixe = null; j.el.classList.remove('encaixada'); };

/** Organizar as janelas (menu da barra de tarefas). */
export function emCascata() {
  let i = 0;
  for (const j of lista) {
    if (j.dialogo || j.minimizada || !daAreaAtual(j)) continue;
    j.restaurar();
    soltarEncaixe(j);
    j.ret.x = 10 + i * 24;
    j.ret.y = 10 + i * 24;
    j.aplicarRet();
    j.ev.emit('tamanho');
    j.focar();
    i++;
  }
}

export function lado(vertical) {
  const vis = lista.filter((j) => !j.dialogo && !j.minimizada && daAreaAtual(j));
  if (!vis.length) return;
  const t = area().getBoundingClientRect();
  vis.forEach((j, i) => {
    j.restaurar();
    soltarEncaixe(j);
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
  for (const j of lista) if (!j.dialogo && daAreaAtual(j)) j.minimizar();
}

/**
 * A área de trabalho vai para a frente (o clique na mesa, no tema Mac clássico): nenhuma janela fica
 * ativa, e a barra de menus do alto mostra os menus da área de trabalho. Com um diálogo aberto, nada muda.
 */
export function desativarJanelas() {
  if (!ativa || ativa.dialogo || lista.some((j) => j.dialogo && !j.fechada)) return;
  ativa.el.classList.remove('ativa');
  ativa = null;
  eventos.emit('mudou');
}

// Logotipo+D: a primeira vez mostra a área de trabalho; a segunda devolve as mesmas janelas.
let escondidas = null;
export function mostrarAreaDeTrabalho() {
  const abertas = lista.filter((j) => !j.dialogo && !j.minimizada && daAreaAtual(j));
  if (!abertas.length && escondidas) {
    const voltar = escondidas.filter((j) => !j.fechada);
    escondidas = null;
    for (const j of voltar) j.focar();
    return 'restaurou';
  }
  escondidas = abertas;
  for (const j of abertas) j.minimizar();
  return 'escondeu';
}

/* ---------- As áreas de trabalho ---------- */

function mostrarDaArea() {
  for (const j of lista) j.el.classList.toggle('outra-area', !daAreaAtual(j));
}

/** Tira a janela da frente quando ela sai da área à vista, e põe na frente a mais recente da área. */
function acertarAtiva(focar = true) {
  if (ativa && !daAreaAtual(ativa)) {
    ativa.el.classList.remove('ativa');
    ativa.ev.emit('desativada');
    ativa = null;
  }
  if (!ativa && focar) {
    const prox = [...recentes].reverse().find((j) => daAreaAtual(j) && !j.minimizada && !j.fechada);
    if (prox) prox.focar();
  }
}

/** Avisa a barra (e, quando a área à vista trocou, quem mostra o nome dela no meio da tela). */
function avisarAreas(trocou = false) {
  if (trocou) eventos.emit('area', areaAgora);
  eventos.emit('mudou');
}

/** Vai para a área n (0 é a primeira): as janelas dela aparecem, as outras somem. */
export function irParaArea(n, { focar = true } = {}) {
  const alvo = Math.max(0, Math.min(totalAreas - 1, Math.trunc(Number(n)) || 0));
  if (alvo === areaAgora) return;
  areaAgora = alvo;
  escondidas = null;
  mostrarDaArea();
  acertarAtiva(focar);
  avisarAreas(true);
}

/** Uma área nova, no fim (com ir, vai para ela). Devolve o número dela, ou null no limite. */
export function novaArea({ ir = true } = {}) {
  if (totalAreas >= MAX_AREAS) return null;
  totalAreas++;
  if (ir) irParaArea(totalAreas - 1);
  else avisarAreas();
  return totalAreas - 1;
}

/** Fecha a área n: as janelas dela vão para a da esquerda (as da primeira, para a seguinte), como no Windows. */
export function fecharArea(n = areaAgora) {
  if (totalAreas <= 1 || !Number.isInteger(n) || n < 0 || n >= totalAreas) return false;
  const destino = Math.max(0, n - 1);
  for (const j of lista) {
    if ((j.area || 0) === n) j.area = destino;
    else if ((j.area || 0) > n) j.area--;
  }
  totalAreas--;
  const via = areaAgora === n;
  if (via) areaAgora = destino;
  else if (areaAgora > n) areaAgora--;
  escondidas = null;
  mostrarDaArea();
  acertarAtiva();
  avisarAreas(via);
  return true;
}

/** Leva a janela para a área n ('nova': uma área nova, sem ir para ela). */
export function moverParaArea(j, n) {
  if (!j || j.dialogo || j.fechada || j.nativa) return;
  const alvo = n === 'nova' ? novaArea({ ir: false }) : n;
  if (alvo == null) return;
  const k = Math.max(0, Math.min(totalAreas - 1, Math.trunc(Number(alvo)) || 0));
  if ((j.area || 0) === k) return;
  j.area = k;
  mostrarDaArea();
  acertarAtiva();
  avisarAreas();
}

/** As áreas que o Reabrir ao ligar devolve (só aumenta o número, até o limite). */
export function garantirAreas(n) {
  const k = Math.min(MAX_AREAS, Math.trunc(Number(n)) || 1);
  if (k <= totalAreas) return;
  totalAreas = k;
  avisarAreas();
}
