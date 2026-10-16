/*
 * O Visualizador de imagens: mostra as fotos e os desenhos do disco, passa para a próxima da
 * mesma pasta, amplia, gira (só na tela) e faz a apresentação de slides. Não grava nada no
 * arquivo: para editar, "Abrir com" o PhotoCraft.
 */
import { h, img, nomeDe, paiDe, juntar, extensao, tamanho, urlDoDisco } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, programasPara, adicionarRecente, pastaDocs, abrirNoComputador } from '../sistema.js';
import { caixaArquivo, erro, info, propriedades } from '../dialogos.js';
import { excluir } from '../arquivos.js';
import { tr, marcar } from '../idioma.js';

export const TIPOS_IMAGEM = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif'];
const ZOOMS = [0.05, 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8, 12, 16];
const SLIDE_MS = 5000;

const ordenarNomes = (a, b) => nomeDe(a).localeCompare(nomeDe(b), undefined, { numeric: true, sensitivity: 'base' });

/** Os arquivos da mesma pasta que a ferramenta abre (para a próxima e a anterior), por nome. */
export async function irmaos(rel, tipos) {
  const pai = paiDe(rel);
  const lista = await retro.disco.listar(pai).catch(() => []);
  return lista.filter((i) => !i.pasta && tipos.includes(extensao(i.nome))).map((i) => i.rel || juntar(pai, i.nome)).sort(ordenarNomes);
}

/** O zoom seguinte (ou o anterior) da escada de zooms. */
export function proximoZoom(atual, sentido) {
  if (sentido > 0) return ZOOMS.find((z) => z > atual + 1e-6) || ZOOMS[ZOOMS.length - 1];
  return [...ZOOMS].reverse().find((z) => z < atual - 1e-6) || ZOOMS[0];
}

/** A escala para caber na área sem ampliar (as imagens pequenas ficam no tamanho real). */
export function escalaAjustada(w, h, areaW, areaH) {
  if (!w || !h) return 1;
  return Math.min(1, areaW / w, areaH / h);
}

class Visualizador {
  constructor({ arquivo } = {}) {
    this.rel = null;
    this.lista = [];
    this.zoom = null; // null: ajustar à janela
    this.giro = 0;
    this.natural = { w: 0, h: 0 };
    this.info = null;
    this.imagem = h('img.vis-img', { alt: '', draggable: false });
    this.palco = h('div.vis-palco', this.imagem);
    this.aviso = h('div.vis-aviso');
    this.area = h('div.vis-area', { tabIndex: 0 }, this.palco, this.aviso);
    this.j = new Janela({
      titulo: tr('Visualizador de imagens'),
      icone: 'imagens',
      largura: 580,
      altura: 460,
      classe: 'visualizador',
      menus: this.menus(),
      status: [{ texto: '', largura: 90, fixo: true }, { texto: '', largura: 140, fixo: true }, { texto: '', largura: 60, fixo: true }, ''],
    });
    this.bt = {};
    const bt = (id, icone, dica, acao) => (this.bt[id] = h('button.ferramenta', { title: dica, on: { click: acao } }, img(icone, 16)));
    const sep = () => h('span.sep');
    this.barra = h('div.barra-ferramentas',
      bt('anterior', 'anterior', tr('Imagem anterior (←)'), () => this.ir(-1)),
      bt('proximo', 'proximo', tr('Próxima imagem (→)'), () => this.ir(1)),
      sep(),
      bt('ampliar', 'ampliar', tr('Ampliar (+)'), () => this.ampliar(1)),
      bt('reduzir', 'reduzir', tr('Reduzir (-)'), () => this.ampliar(-1)),
      bt('ajustar', 'ajustar', tr('Ajustar à janela (0)'), () => this.definirZoom(null)),
      bt('real', 'tamanho-real', tr('Tamanho real (1)'), () => this.definirZoom(1)),
      sep(),
      bt('girarEsq', 'girar-esq', tr('Girar à esquerda'), () => this.girar(-90)),
      bt('girarDir', 'girar-dir', tr('Girar à direita'), () => this.girar(90)),
      sep(),
      bt('slides', 'tela-cheia', tr('Apresentação de slides (F5)'), () => this.apresentacao()),
      sep(),
      bt('excluir', 'excluir', tr('Excluir (Del)'), () => this.excluir()));
    this.j.corpo.append(this.barra, this.area);
    this.imagem.addEventListener('load', () => this.carregou());
    this.imagem.addEventListener('error', () => this.falhou());
    this.area.addEventListener('keydown', (e) => this.teclas(e));
    this.area.addEventListener('wheel', (e) => this.roda(e), { passive: false });
    this.area.addEventListener('pointerdown', (e) => this.arrastar(e));
    this.area.addEventListener('dblclick', () => this.definirZoom(this.zoom === null ? 1 : null));
    new ResizeObserver(() => { if (this.zoom === null) this.desenhar(); }).observe(this.area);
    this.j.ev.on('ativada', () => setTimeout(() => this.area.focus(), 0));
    if (arquivo) this.mostrar(arquivo);
    else this.atualizarTudo();
    this.area.focus();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Abrir…'), atalho: 'Ctrl+O', acao: () => this.abrirOutra() },
          { rotulo: tr('Abrir c&om'), desativado: !this.rel, sub: () => this.itensAbrirCom() },
          { separador: true },
          { rotulo: tr('&Imprimir…'), atalho: 'Ctrl+P', desativado: !this.natural.w, acao: () => this.imprimir() },
          { rotulo: tr('&Excluir'), atalho: 'Del', desativado: !this.rel, acao: () => this.excluir() },
          { rotulo: tr('&Propriedades'), desativado: !this.rel, acao: () => propriedades(this.rel) },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !this.natural.w, acao: () => this.copiar() },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Ajustar à janela'), atalho: '0', radio: true, marcado: this.zoom === null, acao: () => this.definirZoom(null) },
          { rotulo: tr('&Tamanho real'), atalho: '1', radio: true, marcado: this.zoom === 1, acao: () => this.definirZoom(1) },
          { rotulo: tr('Am&pliar'), atalho: '+', acao: () => this.ampliar(1) },
          { rotulo: tr('&Reduzir'), atalho: '-', acao: () => this.ampliar(-1) },
          { separador: true },
          { rotulo: tr('Girar à &esquerda'), atalho: 'Ctrl+,', acao: () => this.girar(-90) },
          { rotulo: tr('Girar à &direita'), atalho: 'Ctrl+.', acao: () => this.girar(90) },
          { separador: true },
          { rotulo: tr('Apresentação de &slides'), atalho: 'F5', desativado: !this.lista.length, acao: () => this.apresentacao() },
        ],
      },
      {
        rotulo: tr('&Ir'), itens: () => [
          { rotulo: tr('Imagem &anterior'), atalho: '←', desativado: this.lista.length < 2, acao: () => this.ir(-1) },
          { rotulo: tr('&Próxima imagem'), atalho: '→', desativado: this.lista.length < 2, acao: () => this.ir(1) },
          { separador: true },
          { rotulo: tr('P&rimeira imagem'), atalho: 'Home', desativado: this.lista.length < 2, acao: () => this.irPara(0) },
          { rotulo: tr('Ú&ltima imagem'), atalho: 'End', desativado: this.lista.length < 2, acao: () => this.irPara(this.lista.length - 1) },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          { rotulo: tr('&Sobre o Visualizador de imagens'), acao: () => info(tr('Visualizador de imagens') + '\n\n' + tr('Mostra as imagens do disco C: (PNG, JPEG, GIF, WebP, BMP, ícones e SVG). Girar e ampliar mudam só a tela; o arquivo fica como está.\nPara editar, use Arquivo › Abrir com.'), tr('Sobre o Visualizador de imagens')) },
        ],
      },
    ];
  }

  itensAbrirCom() {
    const nome = nomeDe(this.rel);
    const outros = programasPara(nome).filter((p) => p.id !== 'imagens');
    return [
      ...outros.map((p) => ({ rotulo: p.nome, icone: p.icone, acao: () => abrir(p.id, { arquivo: this.rel }) })),
      ...(outros.length ? [{ separador: true }] : []),
      { rotulo: tr('Programa do computador principal'), icone: 'computador', acao: () => abrirNoComputador(this.rel).catch((e) => erro(e.message)) },
    ];
  }

  /* ---------- Mostrar ---------- */

  async mostrar(rel) {
    this.rel = rel;
    this.giro = 0;
    this.zoom = null; // cada imagem começa ajustada à janela
    this.natural = { w: 0, h: 0 };
    this.aviso.textContent = '';
    this.area.classList.remove('com-aviso');
    this.palco.hidden = true;
    adicionarRecente(rel);
    this.info = await retro.disco.info(rel).catch(() => null);
    this.imagem.src = urlDoDisco(rel) + '?v=' + Math.round((this.info && this.info.modificado) || 0);
    this.lista = await irmaos(rel, TIPOS_IMAGEM);
    if (!this.lista.includes(rel)) this.lista.push(rel);
    this.atualizarTudo();
    // A próxima já fica pronta (passar de uma para outra sem esperar).
    const i = this.lista.indexOf(rel);
    if (this.lista.length > 1) new Image().src = urlDoDisco(this.lista[(i + 1) % this.lista.length]);
  }

  carregou() {
    this.natural = { w: this.imagem.naturalWidth || 0, h: this.imagem.naturalHeight || 0 };
    // Os SVG sem tamanho: um tamanho padrão.
    if (!this.natural.w || !this.natural.h) this.natural = { w: 512, h: 512 };
    this.palco.hidden = false;
    this.desenhar();
    this.atualizarTudo();
  }

  falhou() {
    if (!this.rel) return;
    this.palco.hidden = true;
    this.natural = { w: 0, h: 0 };
    this.area.classList.add('com-aviso');
    this.aviso.textContent = tr('Não foi possível mostrar {nome}. O arquivo pode estar danificado ou num formato que o Visualizador não conhece.', { nome: nomeDe(this.rel) });
    this.atualizarTudo();
  }

  /** O tamanho na tela, com o giro e o zoom. */
  desenhar() {
    const { w, h: a } = this.natural;
    if (!w) return;
    const deitada = this.giro % 180 !== 0;
    const ew = deitada ? a : w;
    const eh = deitada ? w : a;
    const esc = this.zoom === null ? escalaAjustada(ew, eh, this.area.clientWidth - 8, this.area.clientHeight - 8) : this.zoom;
    this.escala = esc;
    Object.assign(this.palco.style, { width: Math.max(1, Math.round(ew * esc)) + 'px', height: Math.max(1, Math.round(eh * esc)) + 'px' });
    Object.assign(this.imagem.style, {
      width: Math.round(w * esc) + 'px',
      height: Math.round(a * esc) + 'px',
      transform: `translate(-50%, -50%) rotate(${this.giro}deg)`,
    });
    // Ampliadas, as imagens pequenas (pixel art, ícones) ficam com os pontos nítidos.
    this.imagem.classList.toggle('pixelada', esc >= 2);
    this.area.classList.toggle('rola', this.palco.offsetWidth > this.area.clientWidth || this.palco.offsetHeight > this.area.clientHeight);
    this.atualizarStatus();
  }

  atualizarTudo() {
    const nome = this.rel ? nomeDe(this.rel) : '';
    this.j.definirTitulo(nome ? `${nome} - ${tr('Visualizador de imagens')}` : tr('Visualizador de imagens'));
    const tem = !!this.natural.w;
    const varias = this.lista.length > 1;
    this.bt.anterior.disabled = !varias;
    this.bt.proximo.disabled = !varias;
    for (const k of ['ampliar', 'reduzir', 'ajustar', 'real', 'girarEsq', 'girarDir']) this.bt[k].disabled = !tem;
    this.bt.slides.disabled = !this.lista.length;
    this.bt.excluir.disabled = !this.rel;
    this.atualizarStatus();
  }

  atualizarStatus() {
    const i = this.lista.indexOf(this.rel);
    this.j.definirStatus([
      { texto: this.rel && i >= 0 ? tr('{n} de {total}', { n: i + 1, total: this.lista.length }) : '', largura: 90, fixo: true },
      { texto: this.natural.w ? tr('{w} × {h} pontos', { w: this.natural.w, h: this.natural.h }) : '', largura: 140, fixo: true },
      { texto: this.natural.w ? Math.round((this.escala || 1) * 100) + '%' : '', largura: 60, fixo: true },
      this.info ? tamanho(this.info.tamanho) : '',
    ]);
  }

  /* ---------- Ações ---------- */

  async abrirOutra() {
    const rel = await caixaArquivo({ modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), tipos: [{ rotulo: tr('Imagens'), exts: TIPOS_IMAGEM }] });
    if (rel) this.mostrar(rel);
  }

  ir(passo) {
    if (this.lista.length < 2) return;
    const i = this.lista.indexOf(this.rel);
    this.irPara((i + passo + this.lista.length) % this.lista.length);
  }

  irPara(i) {
    if (this.lista[i] && this.lista[i] !== this.rel) this.mostrar(this.lista[i]);
  }

  definirZoom(z) {
    if (!this.natural.w) return;
    this.zoom = z;
    this.desenhar();
  }

  /** Amplia ou reduz mantendo no lugar o ponto do meio (ou o do ponteiro). */
  ampliar(sentido, ponto) {
    if (!this.natural.w) return;
    const a = this.area;
    const px = ponto ? ponto.x : a.clientWidth / 2;
    const py = ponto ? ponto.y : a.clientHeight / 2;
    const fx = (a.scrollLeft + px) / Math.max(1, a.scrollWidth);
    const fy = (a.scrollTop + py) / Math.max(1, a.scrollHeight);
    this.zoom = proximoZoom(this.escala || 1, sentido);
    this.desenhar();
    a.scrollLeft = fx * a.scrollWidth - px;
    a.scrollTop = fy * a.scrollHeight - py;
  }

  girar(graus) {
    if (!this.natural.w) return;
    this.giro = (this.giro + graus + 360) % 360;
    this.desenhar();
  }

  async excluir() {
    if (!this.rel) return;
    const i = this.lista.indexOf(this.rel);
    if (!(await excluir([this.rel]))) return;
    const resto = this.lista.filter((r) => r !== this.rel);
    if (!resto.length) {
      this.rel = null;
      this.lista = [];
      this.natural = { w: 0, h: 0 };
      this.imagem.removeAttribute('src');
      this.palco.hidden = true;
      this.info = null;
      this.atualizarTudo();
      return;
    }
    this.mostrar(resto[Math.min(i, resto.length - 1)]);
  }

  /** Imprime a imagem como está na tela (com o giro). */
  async imprimir() {
    if (!this.natural.w) return;
    const c = document.createElement('canvas');
    const deitada = this.giro % 180 !== 0;
    c.width = deitada ? this.natural.h : this.natural.w;
    c.height = deitada ? this.natural.w : this.natural.h;
    const g = c.getContext('2d');
    g.translate(c.width / 2, c.height / 2);
    g.rotate((this.giro * Math.PI) / 180);
    g.drawImage(this.imagem, -this.natural.w / 2, -this.natural.h / 2, this.natural.w, this.natural.h);
    const { imprimirImagem } = await import('../impressao.js');
    imprimirImagem(nomeDe(this.rel), c.toDataURL('image/png'));
  }

  async copiar() {
    try {
      const c = document.createElement('canvas');
      const deitada = this.giro % 180 !== 0;
      c.width = deitada ? this.natural.h : this.natural.w;
      c.height = deitada ? this.natural.w : this.natural.h;
      const g = c.getContext('2d');
      g.translate(c.width / 2, c.height / 2);
      g.rotate((this.giro * Math.PI) / 180);
      g.drawImage(this.imagem, -this.natural.w / 2, -this.natural.h / 2, this.natural.w, this.natural.h);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch (e) {
      erro(tr('Não foi possível copiar a imagem: {erro}', { erro: e.message }));
    }
  }

  teclas(e) {
    if (e.target.closest('.menubar')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    let feito = true;
    if (ctrl && k.toLowerCase() === 'o') this.abrirOutra();
    else if (ctrl && k.toLowerCase() === 'c') this.copiar();
    else if (ctrl && k.toLowerCase() === 'p') this.imprimir();
    else if (ctrl && k === ',') this.girar(-90);
    else if (ctrl && k === '.') this.girar(90);
    else if (ctrl && (k === '+' || k === '=')) this.ampliar(1);
    else if (ctrl && k === '-') this.ampliar(-1);
    else if (ctrl && k === '0') this.definirZoom(null);
    else if (ctrl || e.altKey) feito = false;
    else if ((k === 'ArrowLeft' || k === 'PageUp') && !this.area.classList.contains('rola')) this.ir(-1);
    else if ((k === 'ArrowRight' || k === 'PageDown' || k === ' ') && !this.area.classList.contains('rola')) this.ir(1);
    else if (k === 'PageUp') this.ir(-1);
    else if (k === 'PageDown') this.ir(1);
    else if (k === 'Home') this.irPara(0);
    else if (k === 'End') this.irPara(this.lista.length - 1);
    else if (k === '+' || k === '=') this.ampliar(1);
    else if (k === '-') this.ampliar(-1);
    else if (k === '0') this.definirZoom(null);
    else if (k === '1') this.definirZoom(1);
    else if (k === 'Delete') this.excluir();
    else if (k === 'F5') this.apresentacao();
    else feito = false;
    if (feito) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  roda(e) {
    if (!(e.ctrlKey || e.metaKey) || !this.natural.w) return;
    e.preventDefault();
    const r = this.area.getBoundingClientRect();
    this.ampliar(e.deltaY < 0 ? 1 : -1, { x: e.clientX - r.left, y: e.clientY - r.top });
  }

  /** Arrastar a imagem ampliada (a mão). */
  arrastar(e) {
    if (e.button !== 0 || !this.area.classList.contains('rola')) return;
    e.preventDefault();
    this.area.focus();
    const ini = { x: e.clientX, y: e.clientY, l: this.area.scrollLeft, t: this.area.scrollTop };
    this.area.classList.add('arrastando');
    this.area.setPointerCapture(e.pointerId);
    const mover = (ev) => {
      this.area.scrollLeft = ini.l - (ev.clientX - ini.x);
      this.area.scrollTop = ini.t - (ev.clientY - ini.y);
    };
    const soltar = () => {
      this.area.classList.remove('arrastando');
      this.area.removeEventListener('pointermove', mover);
      this.area.removeEventListener('pointerup', soltar);
      this.area.removeEventListener('pointercancel', soltar);
    };
    this.area.addEventListener('pointermove', mover);
    this.area.addEventListener('pointerup', soltar);
    this.area.addEventListener('pointercancel', soltar);
  }

  /** A apresentação de slides: a tela inteira, uma imagem a cada 5 segundos. */
  apresentacao() {
    if (!this.lista.length) return;
    let i = Math.max(0, this.lista.indexOf(this.rel));
    let pausada = false;
    let t = null;
    const foto = h('img', { alt: '', draggable: false });
    const dica = h('div.slides-dica', tr('Esc: sair   Espaço: próxima   P: pausar'));
    const tela = h('div#apresentacao', foto, dica);
    document.body.append(tela);
    const mostrarFoto = () => {
      foto.src = urlDoDisco(this.lista[i]);
      new Image().src = urlDoDisco(this.lista[(i + 1) % this.lista.length]);
    };
    const agendar = () => {
      clearTimeout(t);
      if (!pausada) t = setTimeout(() => passar(1), SLIDE_MS);
    };
    const passar = (p) => {
      i = (i + p + this.lista.length) % this.lista.length;
      mostrarFoto();
      agendar();
    };
    const mostrarDica = (texto) => {
      dica.textContent = texto;
      dica.classList.add('visivel');
      clearTimeout(dica.t);
      dica.t = setTimeout(() => dica.classList.remove('visivel'), 2500);
    };
    // Enquanto passa, a proteção de tela não entra.
    const ativo = setInterval(() => document.dispatchEvent(new Event('retro-atividade')), 20000);
    const sair = () => {
      clearTimeout(t);
      clearInterval(ativo);
      window.removeEventListener('keydown', tecla, true);
      tela.remove();
      // A janela fica na última imagem vista.
      if (this.lista[i] && this.lista[i] !== this.rel) this.mostrar(this.lista[i]);
      this.area.focus();
    };
    const tecla = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape' || e.key === 'F5') sair();
      else if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) passar(1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) passar(-1);
      else if (e.key.toLowerCase() === 'p') {
        pausada = !pausada;
        mostrarDica(pausada ? tr('Pausada') : tr('Continuando'));
        agendar();
      }
    };
    window.addEventListener('keydown', tecla, true);
    tela.addEventListener('click', () => passar(1));
    tela.addEventListener('contextmenu', (e) => { e.preventDefault(); sair(); });
    tela.addEventListener('pointermove', () => mostrarDica(tr('Esc: sair   Espaço: próxima   P: pausar')));
    mostrarFoto();
    mostrarDica(dica.textContent);
    agendar();
  }
}

function abrirVisualizador(args = {}) {
  return new Visualizador(args);
}

registrarApp('imagens', { nome: marcar('Visualizador de imagens'), icone: 'imagens', abrir: abrirVisualizador, tipos: TIPOS_IMAGEM });
