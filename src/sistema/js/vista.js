/*
 * A vista de ícones, usada pela área de trabalho e pelas janelas de pasta:
 * desenha os itens (ícones grandes, lista ou detalhes), cuida da seleção
 * (clique, Ctrl, Shift, laço), do teclado, de arrastar e de soltar.
 *
 * Item: { chave, rotulo, icone, rel?, pasta?, alvo? (pasta ou '::lixeira' que aceita soltar),
 *         atalho?, arrastavel?, colunas? (vista de detalhes), pos? ([x, y] na área de trabalho),
 *         miniatura? (o endereço da miniatura de uma foto, na vista de miniaturas) }
 */
import { h, img, limitar } from './util.js';
import { TIPO_ARRASTO, aceitaSoltar, soltarEm } from './arquivos.js';

const CEL_L = 75;
const CEL_A = 70;

export class VistaIcones {
  /**
   * @param {HTMLElement} raiz
   * @param {object} o
   * @param {'mesa'|'icones'|'miniaturas'|'lista'|'detalhes'} o.modo
   * @param {Function} o.aoAbrir   (item) => void
   * @param {Function} o.aoMenu    (itensSelecionados, evento) => void (sem itens: menu do fundo)
   * @param {Function} [o.aoRenomear] (item) => void
   * @param {Function} [o.aoExcluir] (itens) => void
   * @param {Function} [o.aoSelecionar] (itens) => void
   * @param {Function} [o.aoMover] (item, [x, y]) => void   (área de trabalho)
   * @param {string}   [o.pastaSoltar]  pasta que recebe o que for solto no fundo
   * @param {Array}    [o.colunas]  cabeçalhos da vista de detalhes
   */
  constructor(raiz, o) {
    this.raiz = raiz;
    this.o = o;
    this.modo = o.modo || 'icones';
    this.itens = [];
    this.els = [];
    this.sel = new Set();
    this.foco = -1;
    this.ancora = -1;
    raiz.tabIndex = 0;
    raiz.addEventListener('keydown', (e) => this.teclado(e));
    // O fundo pelo ponteiro (mouse, caneta e dedo): o laço funciona também no toque.
    raiz.addEventListener('pointerdown', (e) => this.fundoMousedown(e));
    raiz.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.item') || e.target.closest('.rotulo-editor')) return;
      e.preventDefault();
      this.selecionar([]);
      o.aoMenu([], e);
    });
    raiz.addEventListener('dragover', (e) => {
      if (!aceitaSoltar(e) || o.pastaSoltar == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = [...e.dataTransfer.types].includes('Files') ? 'copy' : (e.ctrlKey ? 'copy' : 'move');
    });
    raiz.addEventListener('drop', (e) => {
      if (o.pastaSoltar == null) return;
      if (e.target.closest('.item.alvo')) return;
      e.preventDefault();
      if (this.modo === 'mesa' && [...e.dataTransfer.types].includes(TIPO_ARRASTO) && this.arrastando) {
        // Arrastar um ícone pela própria área de trabalho só o reposiciona.
        this.reposicionar(e);
        return;
      }
      soltarEm(e, o.pastaSoltar);
    });
  }

  definirModo(m) {
    this.modo = m;
    this.desenhar(this.itens);
  }

  selecionados() {
    return [...this.sel].sort((a, b) => a - b).map((i) => this.itens[i]).filter(Boolean);
  }

  /** Desenha os itens, mantendo a seleção pelas chaves. */
  desenhar(itens, { selecionarChaves } = {}) {
    const antes = new Set((selecionarChaves || this.selecionados().map((i) => i.chave)));
    const chaveFoco = this.itens[this.foco] && this.itens[this.foco].chave;
    this.itens = itens;
    this.raiz.className = this.raiz.className.replace(/\bvista-\S+|\bicones\b/g, '').trim();
    if (this.modo === 'icones') this.raiz.classList.add('icones');
    if (this.modo === 'miniaturas') this.raiz.classList.add('icones', 'vista-miniaturas');
    if (this.modo === 'lista') this.raiz.classList.add('vista-lista');
    if (this.modo === 'detalhes') this.raiz.classList.add('vista-detalhes');
    this.els = itens.map((it, i) => this.criarItem(it, i));
    if (this.modo === 'detalhes') {
      const cab = h('div.cab', (this.o.colunas || ['Nome']).map((c) => h('div', c)));
      this.raiz.replaceChildren(h('div.tabela', cab, ...this.els));
    } else {
      this.raiz.replaceChildren(...this.els);
    }
    if (this.modo === 'mesa') this.posicionarMesa();
    this.sel = new Set();
    itens.forEach((it, i) => { if (antes.has(it.chave)) this.sel.add(i); });
    this.foco = Math.max(-1, itens.findIndex((it) => it.chave === chaveFoco));
    this.marcar();
  }

  criarItem(it, i) {
    const tam = this.modo === 'lista' || this.modo === 'detalhes' ? 16 : 32;
    // iconeUrl: o ícone de fora (um programa do computador principal), no lugar dos do sistema.
    const icone = it.iconeUrl
      ? h('div.icone', { style: { '--ico': `url("${it.iconeUrl}")` } }, h('img.de-fora', { src: it.iconeUrl, width: tam, height: tam, alt: '', draggable: 'false' }))
      : h('div.icone', { style: { '--ico': `url(icones/${tam}/${it.icone}.png)` } }, img(it.icone, tam));
    // Na vista de miniaturas, a foto encolhida no quadro (se não carregar, fica o ícone).
    if (this.modo === 'miniaturas' && it.miniatura) {
      const mini = h('img.mini', { src: it.miniatura, alt: '', draggable: 'false', loading: 'lazy', decoding: 'async' });
      mini.addEventListener('error', () => mini.replaceWith(img(it.icone, 32)));
      icone.replaceChildren(mini);
      icone.classList.add('com-foto');
    }
    if (it.atalho && tam === 32) icone.append(h('div.atalho-seta'));
    let el;
    if (this.modo === 'detalhes') {
      const nome = h('div', h('div.item', icone, h('div.rotulo', it.rotulo)));
      el = h('div.linha-item', nome, (it.colunas || []).map((c, k) => h('div' + (k === 0 ? '.num' : ''), c)));
      el.itemEl = nome.firstChild;
    } else {
      el = h('div.item', icone, h('div.rotulo', it.rotulo));
      el.itemEl = el;
    }
    el.dataset.i = i;
    if (it.alvo) el.classList.add('alvo');
    if (it.recortado) el.itemEl.classList.add('recortado');
    el.title = it.dica || '';
    el.addEventListener('mousedown', (e) => this.itemMousedown(e, i));
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('.rotulo-editor')) return;
      this.o.aoAbrir(it, e);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.sel.has(i)) this.selecionar([i]);
      this.o.aoMenu(this.selecionados(), e);
    });
    // Arrastar.
    if (it.arrastavel !== false) {
      el.draggable = true;
      el.addEventListener('dragstart', (e) => {
        if (!this.sel.has(i)) this.selecionar([i]);
        const rels = this.selecionados().filter((x) => x.rel).map((x) => x.rel);
        this.arrastando = { i, x: e.clientX, y: e.clientY, chaves: this.selecionados().map((x) => x.chave) };
        e.dataTransfer.setData(TIPO_ARRASTO, JSON.stringify(rels));
        e.dataTransfer.setData('text/plain', rels.join('\n'));
        e.dataTransfer.effectAllowed = 'copyMove';
        const fantasma = el.itemEl.querySelector('.icone img');
        if (fantasma) e.dataTransfer.setDragImage(fantasma, 16, 16);
      });
      el.addEventListener('dragend', () => { setTimeout(() => { this.arrastando = null; }, 0); });
    }
    // Soltar sobre uma pasta ou a Lixeira.
    if (it.alvo) {
      el.addEventListener('dragover', (e) => {
        if (!aceitaSoltar(e)) return;
        if (this.arrastando && this.arrastando.chaves.includes(it.chave)) return;
        e.preventDefault();
        e.stopPropagation();
        el.itemEl.classList.add('sel');
      });
      el.addEventListener('dragleave', () => { if (!this.sel.has(i)) el.itemEl.classList.remove('sel'); });
      el.addEventListener('drop', (e) => {
        if (this.arrastando && this.arrastando.chaves.includes(it.chave)) return;
        e.preventDefault();
        e.stopPropagation();
        el.itemEl.classList.remove('sel');
        soltarEm(e, it.alvo);
      });
    }
    return el;
  }

  /* ---------- Área de trabalho: posições na grade ---------- */

  posicionarMesa() {
    const alt = this.raiz.clientHeight || 600;
    const linhas = Math.max(1, Math.floor((alt - 4) / CEL_A));
    const ocupado = new Set();
    const livres = [];
    this.itens.forEach((it, i) => {
      if (it.pos) {
        const k = `${it.pos[0]},${it.pos[1]}`;
        if (!ocupado.has(k)) { ocupado.add(k); return; }
      }
      livres.push(i);
    });
    let c = 0;
    let l = 0;
    for (const i of livres) {
      while (ocupado.has(`${c},${l}`)) { l++; if (l >= linhas) { l = 0; c++; } }
      this.itens[i].pos = [c, l];
      ocupado.add(`${c},${l}`);
    }
    this.itens.forEach((it, i) => {
      const [cc, ll] = it.pos;
      this.els[i].style.left = 4 + cc * CEL_L + 'px';
      this.els[i].style.top = 4 + Math.min(ll, linhas - 1) * CEL_A + 'px';
    });
  }

  reposicionar(e) {
    const r = this.raiz.getBoundingClientRect();
    const a = this.arrastando;
    const dx = Math.round((e.clientX - a.x) / CEL_L);
    const dy = Math.round((e.clientY - a.y) / CEL_A);
    if (!dx && !dy) return;
    const maxC = Math.max(0, Math.floor((r.width - 8) / CEL_L) - 1);
    const maxL = Math.max(0, Math.floor((r.height - 4) / CEL_A) - 1);
    const movidos = this.selecionados();
    const ocupado = new Set(this.itens.filter((x) => !movidos.includes(x)).map((x) => `${x.pos[0]},${x.pos[1]}`));
    for (const it of movidos) {
      let c = limitar(it.pos[0] + dx, 0, maxC);
      let l = limitar(it.pos[1] + dy, 0, maxL);
      while (ocupado.has(`${c},${l}`)) { l++; if (l > maxL) { l = 0; c = Math.min(maxC, c + 1); } }
      ocupado.add(`${c},${l}`);
      it.pos = [c, l];
      if (this.o.aoMover) this.o.aoMover(it, it.pos);
    }
    this.posicionarMesa();
  }

  /* ---------- Seleção ---------- */

  selecionar(indices, { foco } = {}) {
    this.sel = new Set(indices);
    if (foco != null) this.foco = foco;
    else if (indices.length) this.foco = indices[indices.length - 1];
    this.marcar();
  }

  marcar() {
    this.els.forEach((el, i) => {
      el.itemEl.classList.toggle('sel', this.sel.has(i));
      el.itemEl.classList.toggle('foco', i === this.foco && document.activeElement === this.raiz);
    });
    if (this.o.aoSelecionar) this.o.aoSelecionar(this.selecionados());
  }

  selecionarChave(chave) {
    const i = this.itens.findIndex((x) => x.chave === chave);
    if (i >= 0) {
      this.selecionar([i]);
      this.els[i].scrollIntoView({ block: 'nearest' });
    }
    return i;
  }

  itemMousedown(e, i) {
    if (e.target.closest('.rotulo-editor')) return;
    this.raiz.focus({ preventScroll: true });
    if (e.button === 2) return;
    if (e.ctrlKey || e.metaKey) {
      if (this.sel.has(i)) this.sel.delete(i); else this.sel.add(i);
      this.foco = i;
      this.ancora = i;
      this.marcar();
    } else if (e.shiftKey && this.ancora >= 0) {
      const [a, b] = [Math.min(this.ancora, i), Math.max(this.ancora, i)];
      this.selecionar(Array.from({ length: b - a + 1 }, (_, k) => a + k), { foco: i });
    } else if (!this.sel.has(i)) {
      this.ancora = i;
      this.selecionar([i]);
    } else {
      this.foco = i;
      this.marcar();
      // Clicar de novo num item já selecionado (sem arrastar) renomeia, como na época.
      const t0 = Date.now();
      const soltar = (ev) => {
        window.removeEventListener('mouseup', soltar);
        if (this.sel.size === 1 && Date.now() - t0 < 400 && ev.target.closest('.rotulo') && this.o.aoRenomear && !this.arrastando) {
          clearTimeout(this.timerRenomear);
          this.timerRenomear = setTimeout(() => this.o.aoRenomear(this.itens[i]), 600);
        }
      };
      window.addEventListener('mouseup', soltar);
    }
  }

  fundoMousedown(e) {
    if (e.target.closest('.item') || e.target.closest('.cab') || e.button !== 0) return;
    if (e.target !== this.raiz && !e.target.classList.contains('linha-item') && !e.target.classList.contains('tabela')) return;
    clearTimeout(this.timerRenomear);
    if (!e.ctrlKey && !e.shiftKey) this.selecionar([]);
    this.laco(e);
  }

  /** A seleção por laço (arrastar no fundo). */
  laco(e) {
    const r = this.raiz.getBoundingClientRect();
    const ox = e.clientX - r.left + this.raiz.scrollLeft;
    const oy = e.clientY - r.top + this.raiz.scrollTop;
    const caixa = h('div', { style: { position: 'absolute', border: '1px dotted ' + (this.modo === 'mesa' ? '#fff' : '#000'), pointerEvents: 'none', zIndex: 5 } });
    const base = new Set(e.ctrlKey ? this.sel : []);
    let mexeu = false;
    const mover = (ev) => {
      const x = ev.clientX - r.left + this.raiz.scrollLeft;
      const y = ev.clientY - r.top + this.raiz.scrollTop;
      if (!mexeu && Math.abs(x - ox) + Math.abs(y - oy) < 4) return;
      if (!mexeu) {
        mexeu = true;
        if (getComputedStyle(this.raiz).position === 'static') this.raiz.style.position = 'relative';
        this.raiz.append(caixa);
      }
      const x0 = Math.min(x, ox), y0 = Math.min(y, oy), x1 = Math.max(x, ox), y1 = Math.max(y, oy);
      Object.assign(caixa.style, { left: x0 + 'px', top: y0 + 'px', width: x1 - x0 + 'px', height: y1 - y0 + 'px' });
      const sel = new Set(base);
      this.els.forEach((el, i) => {
        const q = el.itemEl.getBoundingClientRect();
        const qx = q.left - r.left + this.raiz.scrollLeft;
        const qy = q.top - r.top + this.raiz.scrollTop;
        if (qx < x1 && qx + q.width > x0 && qy < y1 && qy + q.height > y0) sel.add(i);
      });
      this.sel = sel;
      this.marcar();
    };
    const soltar = () => {
      caixa.remove();
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
    };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    // Rolar a lista com o dedo cancela o laço.
    window.addEventListener('pointercancel', soltar);
  }

  /* ---------- Teclado ---------- */

  teclado(e) {
    if (e.target.closest && e.target.closest('.rotulo-editor')) return;
    const n = this.itens.length;
    if (!n && !['F5'].includes(e.key)) return;
    const atual = this.foco >= 0 ? this.foco : -1;
    const passo = this.passoTeclado();
    let novo = null;
    switch (e.key) {
      case 'ArrowRight': novo = atual + passo.dir; break;
      case 'ArrowLeft': novo = atual - passo.dir; break;
      case 'ArrowDown': novo = atual + passo.baixo; break;
      case 'ArrowUp': novo = atual - passo.baixo; break;
      case 'Home': novo = 0; break;
      case 'End': novo = n - 1; break;
      case 'Enter':
        if (this.sel.size) { e.preventDefault(); this.selecionados().forEach((it) => this.o.aoAbrir(it, e)); }
        return;
      case 'Delete':
        if (this.sel.size && this.o.aoExcluir) { e.preventDefault(); this.o.aoExcluir(this.selecionados()); }
        return;
      case 'F2':
        if (this.sel.size === 1 && this.o.aoRenomear) { e.preventDefault(); this.o.aoRenomear(this.selecionados()[0]); }
        return;
      case 'a': case 'A':
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); this.selecionar(this.itens.map((_, i) => i)); }
        return;
      default: {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          // Pular para o primeiro item que começa com a letra.
          const l = e.key.toLowerCase();
          const ordem = [...Array(n).keys()].map((k) => (atual + 1 + k) % n);
          const i = ordem.find((k) => String(this.itens[k].rotulo).toLowerCase().startsWith(l));
          if (i != null) { e.preventDefault(); this.selecionar([i]); this.els[i].scrollIntoView({ block: 'nearest' }); }
        }
        return;
      }
    }
    if (novo == null) return;
    e.preventDefault();
    novo = limitar(novo < 0 && atual < 0 ? 0 : novo, 0, n - 1);
    if (e.shiftKey && this.ancora >= 0) {
      const [a, b] = [Math.min(this.ancora, novo), Math.max(this.ancora, novo)];
      this.selecionar(Array.from({ length: b - a + 1 }, (_, k) => a + k), { foco: novo });
    } else {
      this.ancora = novo;
      this.selecionar([novo]);
    }
    this.els[novo].scrollIntoView({ block: 'nearest' });
  }

  passoTeclado() {
    if (this.modo === 'mesa') {
      const linhas = Math.max(1, Math.floor((this.raiz.clientHeight - 4) / CEL_A));
      return { dir: linhas, baixo: 1 };
    }
    if (this.modo === 'lista') {
      const linhas = Math.max(1, Math.floor((this.raiz.clientHeight - 4) / 18));
      return { dir: linhas, baixo: 1 };
    }
    if (this.modo === 'detalhes') return { dir: 1, baixo: 1 };
    const cols = Math.max(1, Math.floor((this.raiz.clientWidth - 8) / (this.modo === 'miniaturas' ? 112 : 76)));
    return { dir: 1, baixo: cols };
  }

  focoNoRaiz() {
    this.raiz.focus({ preventScroll: true });
    this.marcar();
  }
}
