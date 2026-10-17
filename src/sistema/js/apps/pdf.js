/*
 * Ferramentas de PDF (Iniciar › Programas › Acessórios, e o botão direito do Explorador): a lista de
 * PDFs e imagens, na ordem que se quiser, vira um PDF só; com um PDF escolhido, separar as páginas,
 * extrair algumas ou girá-las. O trabalho é do processo principal (src/principal/pdf.js).
 */
import { h, img, caminhoTela, nomeDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { tr, marcar } from '../idioma.js';
import { caixaArquivo, erro } from '../dialogos.js';
import { TIPO_ARRASTO, caminhosSoltos, relsDoArrasto } from '../arquivos.js';
import { combinar, separar, extrair, girar, ehPdf, entraNoPdf, EXTS_DIRETAS, EXTS_DESENHADAS } from '../pdf.js';
import { tocar } from '../sons.js';

let aberta = null;

class FerramentasPdf {
  constructor(arquivos = []) {
    this.itens = [];
    this.sel = -1;
    this.ocupado = false;
    this.j = new Janela({ id: 'pdf', titulo: tr('Ferramentas de PDF'), icone: 'pdf', largura: 500, altura: 380, status: [''] });
    this.lista = h('div.pdf-lista.campo', {
      tabIndex: 0,
      on: {
        keydown: (e) => this.tecla(e),
        // Os arquivos arrastados do Explorador (ou da área de trabalho) entram no fim da lista.
        dragenter: (e) => this.aceitar(e), dragover: (e) => this.aceitar(e),
        drop: (e) => this.soltar(e),
      },
    });
    const bt = (texto, acao) => h('button', { on: { click: acao } }, texto);
    this.btAdicionar = bt(tr('Adicionar…'), () => this.escolher());
    this.btRemover = bt(tr('Remover'), () => this.remover());
    this.btSubir = bt(tr('Subir'), () => this.mover(-1));
    this.btDescer = bt(tr('Descer'), () => this.mover(1));
    this.btSeparar = bt(tr('Separar as páginas'), () => this.comUm(separar));
    this.btExtrair = bt(tr('Extrair páginas…'), () => this.comUm(extrair));
    this.btDireita = bt(tr('Girar à direita'), () => this.comUm((rel) => girar(rel, 90)));
    this.btEsquerda = bt(tr('Girar à esquerda'), () => this.comUm((rel) => girar(rel, -90)));
    this.btCombinar = h('button.padrao', { on: { click: () => this.combinar() } }, tr('Combinar em um PDF…'));
    this.j.corpo.classList.add('pdf-corpo');
    this.j.corpo.append(
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, img('pdf', 32),
        h('div', { style: { lineHeight: '13px' } }, tr('Junte PDFs e imagens num PDF só, na ordem da lista. Com um PDF escolhido, separe, extraia ou gire as páginas. Os originais não mudam; só o Girar grava por cima, e o de antes fica em Versões anteriores.'))),
      h('div.pdf-meio', this.lista, h('div.pdf-lado', this.btAdicionar, this.btRemover, h('div', { style: { height: '8px' } }), this.btSubir, this.btDescer)),
      h('fieldset.pdf-um', h('legend', tr('PDF escolhido')), this.btSeparar, this.btExtrair, this.btDireita, this.btEsquerda),
      h('div.acoes', this.btCombinar, h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
    );
    this.j.ev.on('fechada', () => { aberta = null; });
    this.adicionar(arquivos);
  }

  /** Acrescenta os arquivos do disco que entram num PDF (os outros são deixados de lado, com aviso). */
  async adicionar(rels) {
    const bons = rels.filter((r) => entraNoPdf(r));
    if (bons.length < rels.length) erro(tr('Só entram PDFs e imagens (JPG, PNG, GIF, WebP, BMP e AVIF).'), tr('Ferramentas de PDF'));
    const novos = bons.map((rel) => ({ rel, paginas: undefined }));
    this.itens.push(...novos);
    if (this.sel < 0 && this.itens.length) this.sel = 0;
    this.desenhar();
    const info = await retro.pdf.info(novos.filter((n) => ehPdf(n.rel)).map((n) => n.rel)).catch(() => []);
    for (const i of info) {
      const it = novos.find((n) => n.rel === i.rel);
      if (it) Object.assign(it, { paginas: i.paginas, senha: i.senha, erro: i.erro });
    }
    this.desenhar();
  }

  aceitar(e) {
    const tipos = e.dataTransfer ? [...e.dataTransfer.types] : [];
    if (!tipos.includes(TIPO_ARRASTO) && !tipos.includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  async soltar(e) {
    e.preventDefault();
    let rels = null;
    try { rels = JSON.parse(e.dataTransfer.getData(TIPO_ARRASTO) || 'null'); } catch { }
    if (!rels) rels = await relsDoArrasto(caminhosSoltos(e));
    if (!rels) return erro(tr('Só entram aqui os arquivos do disco C:. Traga-os antes para uma pasta do Explorador.'), tr('Ferramentas de PDF'));
    this.adicionar(rels);
  }

  async escolher() {
    const rel = await caixaArquivo({
      modo: 'abrir', titulo: tr('Adicionar à lista'), varios: true,
      tipos: [{ rotulo: tr('PDFs e imagens'), exts: [...EXTS_DIRETAS, ...EXTS_DESENHADAS] }],
    });
    if (rel) this.adicionar(Array.isArray(rel) ? rel : [rel]);
  }

  remover() {
    if (this.sel < 0) return;
    this.itens.splice(this.sel, 1);
    this.sel = Math.min(this.sel, this.itens.length - 1);
    this.desenhar();
  }

  mover(d) {
    const i = this.sel;
    const k = i + d;
    if (i < 0 || k < 0 || k >= this.itens.length) return;
    [this.itens[i], this.itens[k]] = [this.itens[k], this.itens[i]];
    this.sel = k;
    this.desenhar();
  }

  tecla(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (e.altKey) this.mover(e.key === 'ArrowUp' ? -1 : 1);
      else { this.sel = Math.max(0, Math.min(this.itens.length - 1, this.sel + (e.key === 'ArrowUp' ? -1 : 1))); this.desenhar(); }
    } else if (e.key === 'Delete') { e.preventDefault(); this.remover(); }
  }

  /** O que aparece ao lado do nome: as páginas, "imagem" ou o problema. */
  detalhe(it) {
    if (!ehPdf(it.rel)) return tr('imagem');
    if (it.paginas === undefined) return '…';
    if (it.senha) return tr('protegido');
    if (it.erro) return tr('não abre');
    return tr('{n} pág.', { n: it.paginas });
  }

  desenhar() {
    this.lista.replaceChildren(...this.itens.map((it, i) => h('div.pdf-item' + (i === this.sel ? '.sel' : '') + (it.senha || it.erro ? '.ruim' : ''), {
      title: caminhoTela(it.rel),
      on: { mousedown: () => { this.sel = i; this.desenhar(); this.lista.focus(); } },
    }, img(ehPdf(it.rel) ? 'pdf' : 'imagem', 16), h('span.pdf-nome', nomeDe(it.rel)), h('span.pdf-pag', this.detalhe(it)))));
    if (!this.itens.length) this.lista.append(h('div.pdf-vazio', tr('Clique em Adicionar… ou arraste para cá os arquivos do Explorador.')));
    const it = this.itens[this.sel];
    const umPdf = !!(it && ehPdf(it.rel) && it.paginas && !it.senha && !it.erro);
    for (const b of [this.btSeparar, this.btExtrair, this.btDireita, this.btEsquerda]) b.disabled = this.ocupado || !umPdf;
    this.btRemover.disabled = this.ocupado || !it;
    this.btSubir.disabled = this.ocupado || this.sel <= 0;
    this.btDescer.disabled = this.ocupado || this.sel < 0 || this.sel >= this.itens.length - 1;
    this.btCombinar.disabled = this.ocupado || !this.itens.length || this.itens.some((x) => x.senha || x.erro);
    const paginas = this.itens.reduce((s, x) => s + (ehPdf(x.rel) ? (x.paginas || 0) : 1), 0);
    const ruim = this.itens.some((x) => x.senha || x.erro);
    this.j.definirStatus(this.ocupado ? tr('Trabalhando…')
      : ruim ? tr('Tire da lista o que está em vermelho para combinar.')
        : (this.itens.length ? tr('{n} arquivo(s), {p} página(s) no total', { n: this.itens.length, p: paginas }) : ''));
  }

  async ocupar(f) {
    this.ocupado = true;
    this.desenhar();
    try { return await f(); } finally { this.ocupado = false; this.desenhar(); }
  }

  async comUm(f) {
    const it = this.itens[this.sel];
    if (!it) return;
    const r = await this.ocupar(() => f(it.rel));
    if (r) tocar('info');
  }

  async combinar() {
    const r = await this.ocupar(() => combinar(this.itens.map((x) => x.rel)));
    if (r) tocar('info');
  }
}

function abrirPdf(args = {}) {
  const arquivos = Array.isArray(args.arquivos) ? args.arquivos : [];
  if (aberta) {
    aberta.j.focar();
    if (arquivos.length) aberta.adicionar(arquivos);
    return aberta.j;
  }
  aberta = new FerramentasPdf(arquivos);
  return aberta.j;
}

registrarApp('pdf', { nome: marcar('Ferramentas de PDF'), icone: 'pdf', abrir: abrirPdf });
