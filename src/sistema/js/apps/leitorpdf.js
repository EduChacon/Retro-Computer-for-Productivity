/*
 * O Leitor de PDF: mostra as páginas (o pdf.js), seleciona e copia o texto e marca o PDF com
 * destaques (o texto selecionado, em amarelo, verde, azul ou rosa) e notas (o papelzinho com um
 * comentário). As marcas vão para o arquivo como anotações comuns do PDF (o "Highlight" e o "Text"),
 * que os outros leitores também mostram; Salvar grava por cima e guarda a versão anterior.
 *
 * As marcas do arquivo (as de antes e as gravadas aqui) são desenhadas pelo Leitor, e não pelo
 * pdf.js (o "noView" no armazenamento das anotações), para que se possam escolher, mudar e apagar;
 * as outras anotações (os campos, os carimbos, as assinaturas) ficam como o pdf.js as desenha.
 */
import { h, img, nomeDe, paiDe } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, programasPara, adicionarRecente, pastaDocs, abrirNoComputador } from '../sistema.js';
import { caixaArquivo, erro, info, mensagem, simNaoCancelar, entrada, ajustarAoConteudo } from '../dialogos.js';
import { abrirMenu } from '../menus.js';
import { perfilAtual } from '../perfis.js';
import { tr, marcar } from '../idioma.js';

// O 100% é o tamanho do papel (96 pontos da tela por polegada, 72 do PDF).
const PONTO = 96 / 72;
const ZOOMS = [0.25, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];
// As cores das marcas: o nome (o mesmo do processo principal), o rótulo e a cor na tela.
export const CORES = [
  { id: 'amarelo', rotulo: marcar('&Amarelo'), rgb: [255, 235, 59] },
  { id: 'verde', rotulo: marcar('&Verde'), rgb: [143, 227, 107] },
  { id: 'azul', rotulo: marcar('A&zul'), rgb: [120, 199, 255] },
  { id: 'rosa', rotulo: marcar('&Rosa'), rgb: [255, 158, 204] },
];
const NOTA = 20; // o tamanho da nota no PDF, em pontos
const MARGEM = 8; // o espaço entre as páginas, na tela

/** A cor das marcas mais perto de um [r, g, b] (de 0 a 255), para as marcas que vieram de outro programa. */
export function corMaisPerto(rgb) {
  if (!rgb || rgb.length < 3) return 'amarelo';
  let melhor = CORES[0];
  let menor = Infinity;
  for (const c of CORES) {
    const d = (c.rgb[0] - rgb[0]) ** 2 + (c.rgb[1] - rgb[1]) ** 2 + (c.rgb[2] - rgb[2]) ** 2;
    if (d < menor) { menor = d; melhor = c; }
  }
  return melhor.id;
}

/**
 * Os retângulos de uma seleção, juntados por linha: os do mesmo trecho de linha (que se sobrepõem na
 * altura e quase se encostam) viram um só. Recebe e devolve { l, t, r, b }.
 */
export function juntarLinhas(rets) {
  const lista = rets.filter((x) => x.r - x.l > 0.5 && x.b - x.t > 0.5).map((x) => ({ ...x })).sort((a, b) => a.t - b.t || a.l - b.l);
  const saida = [];
  for (const x of lista) {
    const ult = saida[saida.length - 1];
    const alt = Math.min(x.b - x.t, ult ? ult.b - ult.t : Infinity);
    const sobrepoe = ult && Math.min(ult.b, x.b) - Math.max(ult.t, x.t) > alt * 0.5;
    if (ult && sobrepoe && x.l <= ult.r + alt * 0.8 && x.r >= ult.l - alt * 0.8) {
      ult.l = Math.min(ult.l, x.l); ult.r = Math.max(ult.r, x.r);
      ult.t = Math.min(ult.t, x.t); ult.b = Math.max(ult.b, x.b);
    } else {
      saida.push(x);
    }
  }
  return saida;
}

const novoId = (() => { let n = 0; return () => 'm' + (++n); })();
const copiaDe = (lista) => lista.map((m) => ({ ...m, quads: m.quads ? m.quads.map((q) => q.slice()) : undefined }));

class Leitor {
  constructor({ arquivo } = {}) {
    this.rel = null;
    this.doc = null;
    this.tarefa = null;
    this.paginas = [];
    this.zoom = 'largura'; // ou um número (1 = 100%)
    this.escala = 1;
    this.modo = 'selecionar';
    this.cor = 'amarelo';
    this.marcas = [];
    this.removidas = [];
    this.desfazer = [];
    this.escolhida = null;
    this.sujo = false;
    this.protegido = false;
    this.assinado = false;
    this.mostrarPainel = false;
    this.vez = 0;
    this.area = h('div.lp-area', { tabIndex: 0 });
    this.folhas = h('div.lp-folhas');
    this.area.append(this.folhas);
    this.lista = h('div.lp-lista');
    this.painel = h('div.lp-painel', h('div.lp-painel-titulo', tr('Marcas')), this.lista);
    this.painel.hidden = true;
    this.j = new Janela({
      titulo: tr('Leitor de PDF'),
      icone: 'leitor-pdf',
      largura: 720,
      altura: 520,
      classe: 'leitor-pdf',
      menus: this.menus(),
      aoFechar: () => this.podeFechar(),
      status: [{ texto: '', largura: 120, fixo: true }, { texto: '', largura: 60, fixo: true }, { texto: '', largura: 110, fixo: true }, ''],
    });
    this.j.reabrir = () => (this.rel ? { arquivo: this.rel } : {});
    this.j.ev.on('fechada', () => this.soltar());
    this.bt = {};
    const bt = (id, icone, dica, acao) => (this.bt[id] = h('button.ferramenta', { type: 'button', title: dica, dataset: { ferr: id }, on: { click: acao } }, img(icone, 16)));
    const sep = () => h('span.sep');
    this.amostras = CORES.map((c) => h('button.ferramenta.lp-cor', {
      type: 'button', title: tr(c.rotulo).replace('&', ''), dataset: { cor: c.id },
      on: { click: () => this.escolherCor(c.id) },
    }, h('span.lp-amostra', { style: { background: `rgb(${c.rgb.join(',')})` } })));
    this.barra = h('div.barra-ferramentas',
      bt('abrir', 'pasta-aberta', tr('Abrir (Ctrl+O)'), () => this.abrirOutro()),
      bt('salvar', 'disco', tr('Salvar as marcas (Ctrl+S)'), () => this.salvar()),
      sep(),
      bt('selecionar', 'selecao', tr('Selecionar o texto'), () => this.mudarModo('selecionar')),
      bt('destacar', 'destacar', tr('Destacar: selecione o texto com o mouse'), () => this.mudarModo('destacar')),
      bt('nota', 'notas', tr('Nota: clique no lugar da nota'), () => this.mudarModo('nota')),
      ...this.amostras,
      sep(),
      bt('anterior', 'anterior', tr('Página anterior (Page Up)'), () => this.irPara(this.paginaAtual() - 1)),
      bt('proximo', 'proximo', tr('Próxima página (Page Down)'), () => this.irPara(this.paginaAtual() + 1)),
      sep(),
      bt('ampliar', 'ampliar', tr('Ampliar (Ctrl++)'), () => this.ampliar(1)),
      bt('reduzir', 'reduzir', tr('Reduzir (Ctrl+-)'), () => this.ampliar(-1)),
      bt('largura', 'ajustar', tr('Largura da página (Ctrl+0)'), () => this.definirZoom('largura')),
      bt('real', 'tamanho-real', tr('Tamanho real (Ctrl+1)'), () => this.definirZoom(1)));
    this.j.corpo.append(this.barra, h('div.lp-corpo', this.painel, this.area));
    this.area.addEventListener('keydown', (e) => this.teclas(e));
    this.area.addEventListener('wheel', (e) => this.roda(e), { passive: false });
    this.area.addEventListener('scroll', () => this.rolou());
    this.area.addEventListener('pointerdown', (e) => this.apertou(e));
    this.area.addEventListener('contextmenu', (e) => this.menuDaMarca(e));
    this.area.addEventListener('dblclick', (e) => { const n = e.target.closest('.lp-nota'); if (n) this.editarNota(n.dataset.id); });
    this.soltouFora = (e) => this.soltou(e);
    document.addEventListener('pointerup', this.soltouFora);
    this.medir = new ResizeObserver(() => { if (this.zoom === 'largura' && this.doc) this.aplicarZoom(); });
    this.medir.observe(this.area);
    this.vigia = new IntersectionObserver((itens) => this.vistas(itens), { root: this.area, rootMargin: '600px 0px' });
    this.j.ev.on('ativada', () => setTimeout(() => { if (!this.j.el.contains(document.activeElement) || document.activeElement === this.j.el) this.area.focus(); }, 0));
    this.atualizar();
    if (arquivo) this.carregar(arquivo);
    this.area.focus();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Abrir…'), atalho: 'Ctrl+O', acao: () => this.abrirOutro() },
          { rotulo: tr('Abrir c&om'), desativado: !this.rel, sub: () => this.itensAbrirCom() },
          { separador: true },
          { rotulo: tr('&Salvar'), atalho: 'Ctrl+S', desativado: !this.doc || !this.sujo, acao: () => this.salvar() },
          { rotulo: tr('Salvar &como…'), desativado: !this.doc, acao: () => this.salvar(true) },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('&Desfazer'), atalho: 'Ctrl+Z', desativado: !this.desfazer.length, acao: () => this.voltar() },
          { separador: true },
          { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !this.textoSelecionado(), acao: () => this.copiar() },
          { rotulo: tr('Apagar a &marca'), atalho: 'Del', desativado: !this.escolhida, acao: () => this.apagar(this.escolhida) },
          { separador: true },
          { rotulo: tr('&Ir para a página…'), atalho: 'Ctrl+G', desativado: !this.doc, acao: () => this.perguntarPagina() },
        ],
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Largura da página'), atalho: 'Ctrl+0', radio: true, marcado: this.zoom === 'largura', acao: () => this.definirZoom('largura') },
          { rotulo: tr('&Tamanho real'), atalho: 'Ctrl+1', radio: true, marcado: this.zoom === 1, acao: () => this.definirZoom(1) },
          { rotulo: tr('Am&pliar'), atalho: 'Ctrl++', acao: () => this.ampliar(1) },
          { rotulo: tr('&Reduzir'), atalho: 'Ctrl+-', acao: () => this.ampliar(-1) },
          { separador: true },
          { rotulo: tr('A lista das &marcas'), marcado: this.mostrarPainel, acao: () => this.alternarPainel() },
        ],
      },
      {
        rotulo: tr('&Marcar'), itens: () => [
          { rotulo: tr('&Selecionar o texto'), radio: true, marcado: this.modo === 'selecionar', acao: () => this.mudarModo('selecionar') },
          { rotulo: tr('&Destacar'), radio: true, marcado: this.modo === 'destacar', acao: () => this.mudarModo('destacar') },
          { rotulo: tr('&Nota'), radio: true, marcado: this.modo === 'nota', acao: () => this.mudarModo('nota') },
          { separador: true },
          { rotulo: tr('Destacar o &texto selecionado'), atalho: 'Ctrl+H', desativado: !this.textoSelecionado() || this.protegido, acao: () => this.destacarSelecao() },
          { separador: true },
          ...CORES.map((c) => ({ rotulo: tr(c.rotulo), radio: true, marcado: this.cor === c.id, acao: () => this.escolherCor(c.id) })),
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          { rotulo: tr('&Sobre o Leitor de PDF'), acao: () => info(tr('Leitor de PDF') + '\n\n' + tr('Mostra os PDFs do disco C:, copia o texto e marca o PDF com destaques e notas, que os outros leitores de PDF também mostram. Salvar grava as marcas no arquivo e guarda a versão anterior (botão direito › Versões anteriores).'), tr('Sobre o Leitor de PDF')) },
        ],
      },
    ];
  }

  itensAbrirCom() {
    const outros = programasPara(nomeDe(this.rel)).filter((p) => p.id !== 'leitorpdf');
    return [
      ...outros.map((p) => ({ rotulo: p.nome, icone: p.icone, acao: () => abrir(p.id, { arquivo: this.rel }) })),
      ...(outros.length ? [{ separador: true }] : []),
      { rotulo: tr('Programa do computador principal'), icone: 'computador', acao: () => abrirNoComputador(this.rel).catch((e) => erro(e.message)) },
    ];
  }

  /* ---------- Abrir ---------- */

  soltar() {
    document.removeEventListener('pointerup', this.soltouFora);
    if (this.medir) this.medir.disconnect();
    if (this.vigia) this.vigia.disconnect();
    this.fecharDoc();
  }

  fecharDoc() {
    for (const p of this.paginas) this.vigia.unobserve(p.el);
    this.paginas = [];
    this.folhas.replaceChildren();
    if (this.tarefa) { try { this.tarefa.destroy().catch(() => { }); } catch { } }
    this.tarefa = null;
    this.doc = null;
  }

  async abrirOutro() {
    if (!(await this.podeFechar())) return;
    const rel = await caixaArquivo({ modo: 'abrir', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), tipos: [{ rotulo: tr('Documento PDF (*.pdf)'), exts: ['pdf'] }] });
    if (rel) this.carregar(rel);
  }

  /** Abre o PDF (de novo, depois de salvar, na mesma página). */
  async carregar(rel, { pagina = 0 } = {}) {
    const vez = ++this.vez;
    this.fecharDoc();
    this.rel = rel;
    this.marcas = [];
    this.removidas = [];
    this.desfazer = [];
    this.escolhida = null;
    this.sujo = false;
    this.aviso(tr('Abrindo…'));
    this.atualizar();
    adicionarRecente(rel);
    const [infoArq, infoPdf] = await Promise.all([
      retro.disco.info(rel).catch(() => null),
      retro.pdf.info([rel]).then((l) => l[0]).catch(() => null),
    ]);
    if (vez !== this.vez) return;
    this.protegido = !!(infoPdf && infoPdf.senha);
    this.assinado = !!(infoPdf && infoPdf.assinado);
    this.tamanhoArq = infoArq && infoArq.tamanho;
    try {
      const { abrirPdfDoDisco } = await import('../visualizar.js');
      this.tarefa = await abrirPdfDoDisco(rel, infoArq && infoArq.modificado);
      this.tarefa.onPassword = (responder, motivo) => this.pedirSenha(responder, motivo);
      const doc = await this.tarefa.promise;
      if (vez !== this.vez) { doc.destroy(); return; }
      this.doc = doc;
    } catch (e) {
      if (vez !== this.vez) return;
      this.aviso(e && e.name === 'PasswordException'
        ? tr('O PDF {nome} pede uma senha.', { nome: nomeDe(rel) })
        : tr('Não foi possível mostrar {nome}. O arquivo pode estar danificado ou não ser um PDF.', { nome: nomeDe(rel) }));
      this.atualizar();
      return;
    }
    this.aviso('');
    const primeira = await this.doc.getPage(1);
    const base = primeira.getViewport({ scale: 1 });
    for (let i = 0; i < this.doc.numPages; i++) {
      const el = h('div.lp-pagina', { dataset: { n: i } });
      const p = { n: i, el, w: base.width, h: base.height, pagina: i === 0 ? primeira : null, anots: null, desenhada: 0 };
      el._p = p;
      this.paginas.push(p);
      this.folhas.append(el);
    }
    this.aplicarZoom({ topo: true });
    for (const p of this.paginas) this.vigia.observe(p.el);
    if (pagina) this.irPara(pagina, false);
    this.atualizar();
    // As marcas de todas as páginas (para a lista), uma página por vez, sem pressa.
    this.lerTodas(vez);
  }

  pedirSenha(responder, motivo) {
    const errada = motivo === 2;
    entrada({ titulo: tr('Leitor de PDF'), tipo: 'password', icone: 'cadeado', texto: errada ? tr('A senha está errada. Digite a senha do PDF:') : tr('Este PDF tem senha. Digite a senha para abrir:') })
      .then((s) => { if (s == null) { try { this.tarefa.destroy(); } catch { } } else responder(s); });
  }

  aviso(texto) {
    if (!this.avisoEl) this.avisoEl = h('div.lp-aviso');
    this.avisoEl.textContent = texto;
    if (texto) this.area.append(this.avisoEl);
    else this.avisoEl.remove();
  }

  async paginaPdf(p) {
    if (!p.pagina) p.pagina = await this.doc.getPage(p.n + 1);
    return p.pagina;
  }

  /** As marcas da página que já estavam no arquivo (lidas uma vez), escondidas do desenho do pdf.js. */
  anotacoes(p) {
    if (!p.anots) {
      p.anots = this.paginaPdf(p).then(async (pg) => {
        const vp = pg.getViewport({ scale: 1 });
        if (Math.abs(vp.width - p.w) > 0.5 || Math.abs(vp.height - p.h) > 0.5) { p.w = vp.width; p.h = vp.height; this.tamanho(p); }
        const lista = await pg.getAnnotations({ intent: 'display' }).catch(() => []);
        for (const a of lista) {
          const m = this.daAnotacao(a, p.n);
          if (!m) continue;
          this.doc.annotationStorage.setValue(a.id, { noView: true });
          this.marcas.push(m);
        }
        this.desenharMarcas(p);
        this.atualizarLista();
      });
    }
    return p.anots;
  }

  /** Uma marca do Leitor a partir de uma anotação do pdf.js (só os destaques e as notas). */
  daAnotacao(a, pagina) {
    if (!a || !a.id) return null;
    const rgb = a.color && a.color.length >= 3 ? [a.color[0], a.color[1], a.color[2]] : null;
    const texto = (a.contentsObj && a.contentsObj.str) || '';
    if (a.subtype === 'Highlight' && a.quadPoints && a.quadPoints.length >= 8) {
      const quads = [];
      for (let i = 0; i + 8 <= a.quadPoints.length; i += 8) quads.push(Array.from(a.quadPoints.slice(i, i + 8)));
      return { id: novoId(), ref: a.id, pagina, tipo: 'destaque', cor: corMaisPerto(rgb), rgb, quads, texto };
    }
    if (a.subtype === 'Text' && a.rect) {
      const [x1, y1, x2, y2] = a.rect;
      return { id: novoId(), ref: a.id, pagina, tipo: 'nota', cor: corMaisPerto(rgb), rgb, x: Math.min(x1, x2), y: Math.max(y1, y2), w: Math.abs(x2 - x1) || NOTA, h: Math.abs(y2 - y1) || NOTA, texto };
    }
    return null;
  }

  async lerTodas(vez) {
    for (const p of this.paginas) {
      if (vez !== this.vez || !this.doc) return;
      await this.anotacoes(p).catch(() => { });
    }
  }

  /* ---------- Desenhar ---------- */

  /** A escala da tela (pontos da tela por ponto do PDF). */
  calcularEscala() {
    if (this.zoom !== 'largura') return this.zoom * PONTO;
    const largura = Math.max(...this.paginas.slice(0, 50).map((p) => p.w), 1);
    return Math.max(0.1, (this.area.clientWidth - 2 * MARGEM - 18) / largura);
  }

  /** O zoom de agora em todas as páginas, com o ponto do meio da área no lugar (ou, ao abrir, o alto). */
  aplicarZoom({ topo = false } = {}) {
    if (!this.doc) return;
    const rola = !topo && this.area.scrollHeight > this.area.clientHeight;
    const centro = rola ? (this.area.scrollTop + this.area.clientHeight / 2) / this.area.scrollHeight : 0;
    this.escala = this.calcularEscala();
    for (const p of this.paginas) this.tamanho(p);
    this.area.scrollTop = rola ? centro * this.area.scrollHeight - this.area.clientHeight / 2 : 0;
    // As páginas à vista são desenhadas de novo (as outras, quando chegarem).
    for (const p of this.paginas) if (p.visivel) this.desenhar(p);
    this.atualizarStatus();
  }

  tamanho(p) {
    p.el.style.width = Math.floor(p.w * this.escala) + 'px';
    p.el.style.height = Math.floor(p.h * this.escala) + 'px';
  }

  vistas(itens) {
    for (const it of itens) {
      const p = it.target._p;
      if (!p) continue;
      p.visivel = it.isIntersecting;
      if (p.visivel) this.desenhar(p);
      else this.apagarDesenho(p);
    }
  }

  apagarDesenho(p) {
    if (p.tarefaDesenho) { try { p.tarefaDesenho.cancel(); } catch { } }
    p.tarefaDesenho = null;
    if (p.canvas) { p.canvas.width = 0; p.canvas.height = 0; }
    p.el.replaceChildren();
    p.canvas = null;
    p.camada = null;
    p.marcasEl = null;
    p.notasEl = null;
    p.desenhada = 0;
  }

  async desenhar(p) {
    if (!this.doc || p.desenhada === this.escala) return;
    const escala = this.escala;
    p.desenhada = escala;
    const doc = this.doc;
    try {
      await this.anotacoes(p);
      const pg = await this.paginaPdf(p);
      if (doc !== this.doc || p.desenhada !== escala) return;
      const vp = pg.getViewport({ scale: escala });
      p.vp = vp;
      const dpr = window.devicePixelRatio || 1;
      const canvas = h('canvas.lp-canvas');
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = Math.floor(vp.width) + 'px';
      canvas.style.height = Math.floor(vp.height) + 'px';
      const { AnnotationMode, TextLayer } = await import(new URL('../../vendor/pdfjs/build/pdf.min.mjs', import.meta.url).href);
      if (p.tarefaDesenho) { try { p.tarefaDesenho.cancel(); } catch { } }
      p.tarefaDesenho = pg.render({
        canvas, canvasContext: canvas.getContext('2d'), viewport: vp,
        transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null,
        annotationMode: AnnotationMode.ENABLE_STORAGE,
      });
      await p.tarefaDesenho.promise;
      if (doc !== this.doc || p.desenhada !== escala) { canvas.width = 0; return; }
      // A camada do texto (transparente, para selecionar), as marcas por baixo dela e as notas por cima.
      const camada = h('div.textLayer');
      p.el.style.setProperty('--scale-factor', String(escala));
      p.marcasEl = h('div.lp-marcas');
      p.notasEl = h('div.lp-notas');
      if (p.canvas) { p.canvas.width = 0; }
      p.el.replaceChildren(canvas, p.marcasEl, camada, p.notasEl);
      p.canvas = canvas;
      p.camada = camada;
      this.desenharMarcas(p);
      const texto = new TextLayer({ textContentSource: pg.streamTextContent({ includeMarkedContent: true, disableNormalization: true }), container: camada, viewport: vp });
      await texto.render().catch(() => { });
      camada.append(h('div.endOfContent'));
    } catch (e) {
      if (e && e.name === 'RenderingCancelledException') return;
      p.desenhada = 0;
    }
  }

  /** O retângulo de um trecho (os quatro cantos no PDF) na tela da página: { l, t, w, h }. */
  naTela(p, q) {
    // Os quatro cantos, um a um (a página girada vira o retângulo de lado).
    const xs = [];
    const ys = [];
    for (let i = 0; i < 8; i += 2) {
      const [x, y] = p.vp.convertToViewportPoint(q[i], q[i + 1]);
      xs.push(x);
      ys.push(y);
    }
    const l = Math.min(...xs);
    const t = Math.min(...ys);
    return { l, t, w: Math.max(...xs) - l, h: Math.max(...ys) - t };
  }

  retNota(p, m) {
    const w = m.w || NOTA;
    const a = m.h || NOTA;
    return this.naTela(p, [m.x, m.y, m.x + w, m.y, m.x, m.y - a, m.x + w, m.y - a]);
  }

  rgbDe(m) {
    return m.rgb && !m.nova ? m.rgb : CORES.find((c) => c.id === m.cor).rgb;
  }

  desenharMarcas(p) {
    if (!p.marcasEl || !p.vp) return;
    const destaques = [];
    const notas = [];
    for (const m of this.marcas) {
      if (m.pagina !== p.n) continue;
      const rgb = `rgb(${this.rgbDe(m).join(',')})`;
      const escolhida = m.id === this.escolhida;
      if (m.tipo === 'destaque') {
        for (const q of m.quads) {
          const r = this.naTela(p, q);
          destaques.push(h('div.lp-destaque' + (escolhida ? '.escolhida' : ''), { dataset: { id: m.id }, style: { left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px', background: rgb } }));
        }
      } else {
        const r = this.retNota(p, m);
        notas.push(h('div.lp-nota' + (escolhida ? '.escolhida' : ''), {
          dataset: { id: m.id }, title: m.texto || tr('(nota vazia)'),
          style: { left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px', backgroundColor: rgb },
        }));
      }
    }
    p.marcasEl.replaceChildren(...destaques);
    p.notasEl.replaceChildren(...notas);
  }

  redesenharMarcas() {
    for (const p of this.paginas) this.desenharMarcas(p);
    this.atualizarLista();
    this.atualizar();
  }

  /* ---------- A lista das marcas ---------- */

  alternarPainel() {
    this.mostrarPainel = !this.mostrarPainel;
    this.painel.hidden = !this.mostrarPainel;
    this.atualizarLista();
    if (this.zoom === 'largura') this.aplicarZoom();
  }

  atualizarLista() {
    if (!this.mostrarPainel) return;
    const lista = this.marcas.slice().sort((a, b) => a.pagina - b.pagina || (b.y || (b.quads && b.quads[0][1]) || 0) - (a.y || (a.quads && a.quads[0][1]) || 0));
    if (!lista.length) { this.lista.replaceChildren(h('div.lp-vazia', tr('Nenhuma marca. Use Destacar ou Nota na barra de ferramentas.'))); return; }
    this.lista.replaceChildren(...lista.map((m) => {
      const rgb = `rgb(${this.rgbDe(m).join(',')})`;
      const el = h('div.lp-item' + (m.id === this.escolhida ? '.escolhida' : ''), { dataset: { id: m.id }, title: m.texto || '' },
        h('span.lp-item-cor' + (m.tipo === 'nota' ? '.nota' : ''), { style: { background: rgb } }),
        h('div.lp-item-texto',
          h('b', tr('Página {n}', { n: m.pagina + 1 })),
          h('span', m.texto ? m.texto.slice(0, 120) : (m.tipo === 'nota' ? tr('(nota vazia)') : tr('Destaque')))));
      el.addEventListener('click', () => this.mostrarMarca(m.id));
      el.addEventListener('dblclick', () => { if (m.tipo === 'nota') this.editarNota(m.id); });
      return el;
    }));
  }

  /** Vai até a marca e a escolhe. */
  mostrarMarca(id) {
    const m = this.marcas.find((x) => x.id === id);
    if (!m) return;
    this.escolher(id);
    const p = this.paginas[m.pagina];
    if (!p) return;
    const topo = p.el.offsetTop;
    let dentro = 0;
    const vp = p.vp || (p.pagina && p.pagina.getViewport({ scale: this.escala }));
    if (vp) {
      const ponto = m.tipo === 'nota' ? [m.x, m.y] : [m.quads[0][0], m.quads[0][1]];
      dentro = vp.convertToViewportPoint(ponto[0], ponto[1])[1];
    }
    this.area.scrollTop = topo + dentro - this.area.clientHeight / 3;
  }

  /* ---------- As páginas ---------- */

  paginaAtual() {
    const meio = this.area.scrollTop + this.area.clientHeight / 2;
    let atual = 0;
    for (const p of this.paginas) {
      if (p.el.offsetTop <= meio) atual = p.n;
      else break;
    }
    return atual;
  }

  irPara(n, foco = true) {
    if (!this.paginas.length) return;
    const p = this.paginas[Math.max(0, Math.min(this.paginas.length - 1, n))];
    this.area.scrollTop = p.el.offsetTop - MARGEM;
    if (foco) this.area.focus();
    this.atualizarStatus();
  }

  async perguntarPagina() {
    if (!this.doc) return;
    const v = await entrada({ titulo: tr('Ir para a página'), texto: tr('O número da página (de 1 a {total}):', { total: this.doc.numPages }), valor: String(this.paginaAtual() + 1), larg: 300 });
    const n = parseInt(v, 10);
    if (Number.isFinite(n)) this.irPara(n - 1);
  }

  rolou() {
    if (this.rolando) return;
    this.rolando = requestAnimationFrame(() => { this.rolando = null; this.atualizarStatus(); });
  }

  /* ---------- Zoom ---------- */

  definirZoom(z) {
    if (!this.doc) return;
    this.zoom = z;
    this.aplicarZoom();
    this.atualizar();
  }

  ampliar(sentido) {
    if (!this.doc) return;
    const atual = this.escala / PONTO;
    const z = sentido > 0 ? (ZOOMS.find((x) => x > atual + 1e-3) || ZOOMS[ZOOMS.length - 1]) : ([...ZOOMS].reverse().find((x) => x < atual - 1e-3) || ZOOMS[0]);
    this.definirZoom(z);
  }

  roda(e) {
    if (!(e.ctrlKey || e.metaKey) || !this.doc) return;
    e.preventDefault();
    this.ampliar(e.deltaY < 0 ? 1 : -1);
  }

  /* ---------- Marcar ---------- */

  mudarModo(modo) {
    this.modo = modo;
    if (modo !== 'selecionar') this.escolher(null);
    // Com um texto já selecionado, o Destacar o marca na hora.
    if (modo === 'destacar' && this.textoSelecionado()) this.destacarSelecao();
    this.atualizar();
    this.area.focus();
  }

  escolherCor(cor) {
    this.cor = cor;
    // Com uma marca escolhida, a cor nova vale para ela.
    const m = this.marcas.find((x) => x.id === this.escolhida);
    if (m && m.cor !== cor) this.mudarMarca(m, { cor });
    else if (this.modo === 'selecionar' && this.textoSelecionado()) this.destacarSelecao();
    this.atualizar();
  }

  /** Guarda o estado de agora para o Desfazer (no máximo 100 passos). */
  guardar() {
    this.desfazer.push({ marcas: copiaDe(this.marcas), removidas: this.removidas.map((r) => ({ ...r })), sujo: this.sujo });
    if (this.desfazer.length > 100) this.desfazer.shift();
  }

  voltar() {
    const e = this.desfazer.pop();
    if (!e) return;
    this.marcas = e.marcas;
    this.removidas = e.removidas;
    this.sujo = e.sujo;
    this.escolhida = null;
    this.redesenharMarcas();
  }

  marcarSujo() {
    this.sujo = true;
    this.atualizar();
  }

  podeMarcar() {
    if (!this.protegido) return true;
    erro(tr('"{nome}" tem senha ou está protegido contra mudanças, e não pode ser mudado aqui.', { nome: nomeDe(this.rel) }), tr('Leitor de PDF'));
    return false;
  }

  textoSelecionado() {
    const s = window.getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) return '';
    const r = s.getRangeAt(0);
    if (!this.folhas.contains(r.commonAncestorContainer)) return '';
    return s.toString();
  }

  /** O texto selecionado vira um destaque em cada página que ele toca. */
  destacarSelecao() {
    const s = window.getSelection();
    const texto = this.textoSelecionado();
    if (!texto || !this.podeMarcar()) return false;
    const rets = [...s.getRangeAt(0).getClientRects()];
    const porPagina = new Map();
    for (const r of rets) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const p = this.paginas.find((x) => {
        if (!x.vp || !x.camada) return false;
        const b = x.el.getBoundingClientRect();
        return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
      });
      if (!p) continue;
      const b = p.el.getBoundingClientRect();
      if (!porPagina.has(p)) porPagina.set(p, []);
      porPagina.get(p).push({ l: r.left - b.left, t: r.top - b.top, r: r.right - b.left, b: r.bottom - b.top });
    }
    const novas = [];
    for (const [p, lista] of porPagina) {
      const quads = juntarLinhas(lista).map((x) => {
        const tl = p.vp.convertToPdfPoint(x.l, x.t);
        const tr_ = p.vp.convertToPdfPoint(x.r, x.t);
        const bl = p.vp.convertToPdfPoint(x.l, x.b);
        const br = p.vp.convertToPdfPoint(x.r, x.b);
        return [tl[0], tl[1], tr_[0], tr_[1], bl[0], bl[1], br[0], br[1]];
      });
      if (quads.length) novas.push({ id: novoId(), ref: null, nova: true, pagina: p.n, tipo: 'destaque', cor: this.cor, quads: quads.slice(0, 400), texto: texto.replace(/\s+/g, ' ').trim().slice(0, 2000) });
    }
    if (!novas.length) return false;
    this.guardar();
    this.marcas.push(...novas);
    s.removeAllRanges();
    this.marcarSujo();
    this.redesenharMarcas();
    return true;
  }

  async novaNota(p, ev) {
    if (!this.podeMarcar()) return;
    const b = p.el.getBoundingClientRect();
    const [x, y] = p.vp.convertToPdfPoint(ev.clientX - b.left, ev.clientY - b.top);
    const texto = await this.caixaNota('', tr('Nova nota'));
    this.mudarModo('selecionar');
    if (texto == null) return;
    this.guardar();
    const m = { id: novoId(), ref: null, nova: true, pagina: p.n, tipo: 'nota', cor: this.cor, x, y, texto: texto.slice(0, 20000) };
    this.marcas.push(m);
    this.escolhida = m.id;
    this.marcarSujo();
    this.redesenharMarcas();
  }

  async editarNota(id) {
    const m = this.marcas.find((x) => x.id === id);
    if (!m || m.tipo !== 'nota') return;
    this.escolher(id);
    const texto = await this.caixaNota(m.texto, tr('Nota da página {n}', { n: m.pagina + 1 }));
    if (texto == null || texto === m.texto) return;
    if (!this.podeMarcar()) return;
    this.mudarMarca(m, { texto: texto.slice(0, 20000) });
  }

  /** Uma marca mudada: a do arquivo sai e entra a nova (com a cor ou o texto de agora). */
  mudarMarca(m, mudanca) {
    if (!this.podeMarcar()) return;
    this.guardar();
    if (m.ref) this.removidas.push({ pagina: m.pagina, id: m.ref });
    Object.assign(m, mudanca, { ref: null, nova: true });
    this.marcarSujo();
    this.redesenharMarcas();
  }

  apagar(id) {
    const m = this.marcas.find((x) => x.id === id);
    if (!m || !this.podeMarcar()) return;
    this.guardar();
    if (m.ref) this.removidas.push({ pagina: m.pagina, id: m.ref });
    this.marcas = this.marcas.filter((x) => x !== m);
    if (this.escolhida === id) this.escolhida = null;
    this.marcarSujo();
    this.redesenharMarcas();
  }

  /** Escolhe a marca (o contorno pontilhado), sem desenhar as marcas de novo (a nota pode estar sendo arrastada). */
  escolher(id) {
    if (this.escolhida === id) return;
    this.escolhida = id;
    for (const el of this.j.corpo.querySelectorAll('.lp-destaque, .lp-nota, .lp-item')) el.classList.toggle('escolhida', el.dataset.id === id);
    this.atualizar();
  }

  /** A caixa do texto da nota (várias linhas, com o corretor). Devolve o texto ou null. */
  caixaNota(valor, titulo) {
    return new Promise((resolve) => {
      let feito = false;
      const j = new Janela({ titulo, icone: 'notas', dialogo: true, largura: 380, altura: 240, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
      const campo = h('textarea.lp-texto-nota', { rows: 7, spellcheck: true, maxLength: 20000 }, valor || '');
      const fim = (ok) => {
        if (feito) return;
        feito = true;
        j.fechar(true);
        resolve(ok ? campo.value : null);
      };
      const ok = h('button.padrao', { type: 'button', on: { click: () => fim(true) } }, tr('OK'));
      const cancelar = h('button', { type: 'button', on: { click: () => fim(false) } }, tr('Cancelar'));
      campo.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fim(true); } });
      j.corpo.append(h('div.lp-caixa-nota', h('div', tr('O texto da nota (Ctrl+Enter para terminar):')), campo), h('div.acoes.direita', ok, cancelar));
      ajustarAoConteudo(j, { largura: 380 });
      campo.focus();
    });
  }

  /** A marca debaixo do ponto (os destaques ficam por baixo do texto e não pegam o clique). */
  marcaEm(p, ev) {
    if (!p.vp) return null;
    const b = p.el.getBoundingClientRect();
    const x = ev.clientX - b.left;
    const y = ev.clientY - b.top;
    for (const m of [...this.marcas].reverse()) {
      if (m.pagina !== p.n || m.tipo !== 'destaque') continue;
      if (m.quads.some((q) => { const r = this.naTela(p, q); return x >= r.l && x <= r.l + r.w && y >= r.t && y <= r.t + r.h; })) return m;
    }
    return null;
  }

  apertou(e) {
    if (e.button !== 0) return;
    this.apertado = { x: e.clientX, y: e.clientY, alvo: e.target };
    const nota = e.target.closest('.lp-nota');
    if (nota && this.modo !== 'nota') {
      e.preventDefault();
      this.escolher(nota.dataset.id);
      this.arrastarNota(e, nota);
      return;
    }
    const camada = e.target.closest('.textLayer');
    if (camada) camada.classList.add('selecting');
  }

  soltou(e) {
    for (const c of this.folhas.querySelectorAll('.textLayer.selecting')) c.classList.remove('selecting');
    const ap = this.apertado;
    this.apertado = null;
    if (!ap || !this.doc || e.button !== 0) return;
    const parado = Math.abs(e.clientX - ap.x) < 3 && Math.abs(e.clientY - ap.y) < 3;
    const paginaEl = ap.alvo && ap.alvo.closest && ap.alvo.closest('.lp-pagina');
    const p = paginaEl && paginaEl._p;
    if (this.modo === 'destacar' && this.textoSelecionado()) { this.destacarSelecao(); return; }
    if (this.modo === 'nota' && parado && p && p.vp && !ap.alvo.closest('.lp-nota')) { this.novaNota(p, e); return; }
    if (this.modo === 'selecionar' && parado && p && !ap.alvo.closest('.lp-nota')) {
      const m = this.marcaEm(p, e);
      this.escolher(m ? m.id : null);
    }
  }

  /** Arrastar uma nota para outro lugar da mesma página. */
  arrastarNota(e, el) {
    const m = this.marcas.find((x) => x.id === el.dataset.id);
    const p = m && this.paginas[m.pagina];
    if (!m || !p || !p.vp) return;
    const ini = { x: e.clientX, y: e.clientY, l: el.offsetLeft, t: el.offsetTop };
    let moveu = false;
    try { el.setPointerCapture(e.pointerId); } catch { /* o arrastar continua pelo movimento sobre a nota */ }
    const mover = (ev) => {
      const dx = ev.clientX - ini.x;
      const dy = ev.clientY - ini.y;
      if (!moveu && Math.abs(dx) + Math.abs(dy) < 4) return;
      moveu = true;
      el.style.left = Math.max(0, Math.min(p.el.clientWidth - el.offsetWidth, ini.l + dx)) + 'px';
      el.style.top = Math.max(0, Math.min(p.el.clientHeight - el.offsetHeight, ini.t + dy)) + 'px';
    };
    const soltar = () => {
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      if (!moveu) return;
      if (this.protegido) { this.podeMarcar(); this.desenharMarcas(p); return; }
      const [x, y] = p.vp.convertToPdfPoint(el.offsetLeft, el.offsetTop);
      this.mudarMarca(m, { x, y });
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  menuDaMarca(e) {
    const paginaEl = e.target.closest('.lp-pagina');
    const p = paginaEl && paginaEl._p;
    if (!p) return;
    const notaEl = e.target.closest('.lp-nota');
    const m = notaEl ? this.marcas.find((x) => x.id === notaEl.dataset.id) : this.marcaEm(p, e);
    const texto = this.textoSelecionado();
    if (!m && !texto) return;
    e.preventDefault();
    if (m) this.escolher(m.id);
    const itens = m ? [
      ...(m.tipo === 'nota' ? [{ rotulo: tr('&Editar a nota…'), acao: () => this.editarNota(m.id) }, { separador: true }] : []),
      ...CORES.map((c) => ({ rotulo: tr(c.rotulo), radio: true, marcado: m.cor === c.id, acao: () => { this.cor = c.id; if (m.cor !== c.id) this.mudarMarca(m, { cor: c.id }); } })),
      { separador: true },
      { rotulo: tr('Apagar a &marca'), icone: 'excluir', acao: () => this.apagar(m.id) },
    ] : [
      { rotulo: tr('&Copiar'), icone: 'copiar', acao: () => this.copiar() },
      { rotulo: tr('&Destacar'), icone: 'destacar', desativado: this.protegido, acao: () => this.destacarSelecao() },
    ];
    abrirMenu(itens, { x: e.clientX, y: e.clientY });
  }

  async copiar() {
    const t = this.textoSelecionado();
    if (t) await navigator.clipboard.writeText(t).catch(() => { });
  }

  /* ---------- Salvar ---------- */

  async podeFechar() {
    if (!this.sujo) return true;
    const r = await simNaoCancelar(tr('As marcas de {nome} mudaram.\n\nDeseja salvar as alterações?', { nome: nomeDe(this.rel) }), tr('Leitor de PDF'));
    if (r === null) return false;
    if (r === 'sim') return this.salvar();
    return true;
  }

  /** Grava as marcas no PDF (ou, com o Salvar como, num outro). Devolve true se gravou. */
  async salvar(como = false) {
    if (!this.doc || this.salvando) return false;
    if (!como && !this.sujo) return true;
    if (this.protegido) { this.podeMarcar(); return false; }
    if (!como && this.assinado) {
      const v = await mensagem({
        titulo: tr('Leitor de PDF'), tipo: 'aviso',
        texto: tr('{nome} tem uma assinatura digital. Gravar as marcas por cima faz a assinatura deixar de valer (a versão anterior, assinada, fica guardada).\n\nSalvar as marcas numa cópia?', { nome: nomeDe(this.rel) }),
        botoes: [{ texto: tr('Salvar uma &cópia…'), valor: 'copia', padrao: true }, { texto: tr('&Gravar por cima'), valor: 'cima' }, { texto: tr('Cancelar'), valor: null }],
      });
      if (v === 'copia') como = true;
      else if (v !== 'cima') return false;
    }
    let destino = null;
    if (como) {
      const base = nomeDe(this.rel).replace(/\.pdf$/i, '');
      destino = await caixaArquivo({ modo: 'salvar', pasta: paiDe(this.rel), nome: tr('{nome} (marcado)', { nome: base }) + '.pdf', tipos: [{ rotulo: tr('Documento PDF (*.pdf)'), exts: ['pdf'] }] });
      if (!destino) return false;
      if (!/\.pdf$/i.test(destino)) destino += '.pdf';
      if (destino === this.rel) destino = null;
    }
    const marcas = {
      adicionar: this.marcas.filter((m) => m.nova).map((m) => (m.tipo === 'destaque'
        ? { tipo: 'destaque', pagina: m.pagina, quads: m.quads, cor: m.cor, texto: m.texto }
        : { tipo: 'nota', pagina: m.pagina, x: m.x, y: m.y, cor: m.cor, texto: m.texto })),
      remover: this.removidas,
      autor: (perfilAtual() && perfilAtual().nome) || '',
    };
    this.salvando = true;
    this.atualizarStatus(tr('Salvando…'));
    try {
      await retro.pdf.marcar(this.rel, marcas, destino);
    } catch (e) {
      this.salvando = false;
      this.atualizarStatus();
      erro(tr('Não foi possível salvar as marcas: {erro}', { erro: e.message || String(e) }), tr('Leitor de PDF'));
      return false;
    }
    this.salvando = false;
    // O arquivo gravado abre de novo, na mesma página: as marcas passam a ser as dele.
    await this.carregar(destino || this.rel, { pagina: this.paginaAtual() });
    return true;
  }

  /* ---------- A barra, o título e o status ---------- */

  atualizar() {
    const nome = this.rel ? nomeDe(this.rel) : '';
    this.j.definirTitulo(nome ? `${this.sujo ? '*' : ''}${nome} - ${tr('Leitor de PDF')}` : tr('Leitor de PDF'));
    const tem = !!this.doc;
    for (const k of ['anterior', 'proximo', 'ampliar', 'reduzir', 'largura', 'real', 'selecionar', 'destacar', 'nota']) this.bt[k].disabled = !tem;
    this.bt.salvar.disabled = !tem || !this.sujo;
    for (const k of ['selecionar', 'destacar', 'nota']) this.bt[k].classList.toggle('apertado', tem && this.modo === k);
    for (const a of this.amostras) {
      a.disabled = !tem;
      a.classList.toggle('apertado', tem && a.dataset.cor === this.cor);
    }
    this.area.dataset.modo = this.modo;
    this.atualizarStatus();
  }

  atualizarStatus(extra) {
    const n = this.doc ? this.doc.numPages : 0;
    const novas = this.marcas.filter((m) => m.nova).length + this.removidas.length;
    const modo = { selecionar: tr('Selecionar'), destacar: tr('Destacar'), nota: tr('Nota') }[this.modo];
    this.j.definirStatus([
      { texto: n ? tr('Página {n} de {total}', { n: this.paginaAtual() + 1, total: n }) : '', largura: 120, fixo: true },
      { texto: n ? Math.round((this.escala / PONTO) * 100) + '%' : '', largura: 60, fixo: true },
      { texto: n ? modo : '', largura: 110, fixo: true },
      extra || (this.sujo && novas ? (novas === 1 ? tr('Uma mudança nas marcas, ainda não salva') : tr('{n} mudanças nas marcas, ainda não salvas', { n: novas })) : (this.assinado ? tr('Com assinatura digital') : '')),
    ]);
  }

  teclas(e) {
    if (e.target.closest('.menubar, input, textarea')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    let feito = true;
    if (ctrl && k.toLowerCase() === 'o') this.abrirOutro();
    else if (ctrl && k.toLowerCase() === 's') this.salvar();
    else if (ctrl && k.toLowerCase() === 'z') this.voltar();
    else if (ctrl && k.toLowerCase() === 'h') this.destacarSelecao();
    else if (ctrl && k.toLowerCase() === 'g') this.perguntarPagina();
    else if (ctrl && k.toLowerCase() === 'c') { if (!this.textoSelecionado()) feito = false; else this.copiar(); }
    else if (ctrl && (k === '+' || k === '=')) this.ampliar(1);
    else if (ctrl && k === '-') this.ampliar(-1);
    else if (ctrl && k === '0') this.definirZoom('largura');
    else if (ctrl && k === '1') this.definirZoom(1);
    else if (ctrl || e.altKey) feito = false;
    else if (k === 'Delete' && this.escolhida) this.apagar(this.escolhida);
    else if (k === 'Escape' && (this.escolhida || this.modo !== 'selecionar')) { this.escolher(null); this.mudarModo('selecionar'); }
    else if (k === 'Home') this.irPara(0);
    else if (k === 'End') this.irPara(this.paginas.length - 1);
    else feito = false;
    if (feito) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
}

function abrirLeitor(args = {}) {
  return new Leitor(args).j;
}

registrarApp('leitorpdf', { nome: marcar('Leitor de PDF'), icone: 'leitor-pdf', abrir: abrirLeitor, tipos: ['pdf'] });
