/*
 * O painel de visualização do Explorador (Exibir › Painel de visualização, Alt+P, como no
 * Windows): o arquivo escolhido, sem abrir o programa. O Word (.docx) vira texto para ler (o
 * mammoth, no processo principal), as planilhas (.xlsx, .ods, .csv) mostram a primeira folha, o
 * .odt mostra o texto, o PDF mostra as páginas (o pdf.js), e os textos, as imagens,
 * os vídeos, as músicas e as páginas da internet salvas aparecem como são. As páginas e os
 * documentos ficam numa moldura sem scripts e sem a internet. Embaixo, o nome, o tipo, o
 * tamanho e a data, como no painel de detalhes da época.
 */
import { h, img, tipoDe, extensao, urlDoDisco, ehTexto, paiDe } from './util.js';
import { tr } from './idioma.js';

const IMAGENS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif']);
const VIDEOS = new Set(['mp4', 'webm', 'ogv', 'mov', 'm4v', 'mkv']);
const AUDIOS = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'flac', 'aac', 'opus', 'weba']);
const LIMITE_TEXTO = 1024 * 1024;
const PAGINAS_MAX = 40;
const LINHAS_CSV = 200;
const COLUNAS_CSV = 40;
// Os números ficam à direita, como na planilha.
const NUMERO = /^[-+−]?[\d.,]+%?$/;

let pdfjs = null;
async function carregarPdfjs() {
  if (!pdfjs) {
    pdfjs = await import(new URL('../vendor/pdfjs/build/pdf.min.mjs', import.meta.url).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/build/pdf.worker.min.mjs', import.meta.url).href;
  }
  return pdfjs;
}

/** Uma moldura sem scripts (o sandbox sem permissões) para um documento ou uma página salva. */
function moldura(html, estilo = '') {
  const doc = `<!doctype html><html><head><meta charset="utf-8"><style>
    html { background: #fff; } body { margin: 14px; color: #000; font: 13px/1.45 serif; overflow-wrap: break-word; }
    img { max-width: 100%; height: auto; } table { border-collapse: collapse; } td, th { border: 1px solid #999; padding: 2px 4px; vertical-align: top; }
    ${estilo}</style></head><body>${html}</body></html>`;
  return h('iframe.vis-moldura', { sandbox: '', srcdoc: doc, title: tr('Visualização') });
}

/** As linhas de um CSV (com aspas, como o das planilhas); o separador é o que mais aparece na 1ª linha. */
export function lerCsv(texto, sep) {
  const t = String(texto).replace(/^\uFEFF/, '');
  if (!sep) {
    const primeira = t.split(/\r?\n/, 1)[0];
    const conta = (c) => primeira.split(c).length;
    sep = [';', ',', '\t'].sort((a, b) => conta(b) - conta(a))[0];
  }
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  let mais = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"' && campo === '') aspas = true;
    else if (c === sep) { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); campo = ''; linhas.push(linha.slice(0, COLUNAS_CSV)); linha = [];
      if (linhas.length >= LINHAS_CSV) { mais = i < t.length - 1; break; }
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha.slice(0, COLUNAS_CSV)); }
  return { linhas, mais };
}

export class PainelVisualizacao {
  constructor() {
    this.el = h('div.vis');
    this.vez = 0;
    this.vazio();
  }

  vazio(texto = tr('Selecione um arquivo para visualizar.')) {
    this.limpar();
    this.el.replaceChildren(h('div.vis-vazio', texto));
  }

  limpar() {
    if (this.observador) this.observador.disconnect();
    this.observador = null;
    // O PDF aberto é solto pela tarefa que o carregou (ela também para o trabalhador do pdf.js).
    if (this.tarefaPdf) { try { this.tarefaPdf.destroy().catch(() => { }); } catch { } }
    this.tarefaPdf = null;
    // O vídeo e a música param ao trocar de arquivo.
    for (const m of this.el.querySelectorAll('video, audio')) { m.pause(); m.removeAttribute('src'); m.load(); }
  }

  /** O rodapé com os dados do arquivo (as colunas do modo Detalhes: tamanho, tipo, data). */
  rodape(it) {
    const [tam, tipo, data] = it.colunas || [];
    return h('div.vis-dados', img(it.icone || 'documento', 32),
      h('div', h('b', it.rotulo), h('div', tipo || ''), tam ? h('div', tam) : null, data ? h('div', tr('Modificado em: {data}', { data })) : null));
  }

  semVisualizacao(texto = tr('Este tipo de arquivo não tem visualização. Abra-o com dois cliques.')) {
    return h('div.vis-vazio', texto);
  }

  /** Mostra um item da vista (ou nada). */
  async mostrar(it) {
    const vez = ++this.vez;
    this.limpar();
    if (!it) return this.vazio();
    const corpo = h('div.vis-corpo');
    this.el.replaceChildren(corpo, this.rodape(it));
    if (!it.rel || it.pasta) {
      // O disco, a Lixeira e os pendrives mostram o que a dica deles diz (o espaço livre, o local original).
      if (it.dica && !it.rel) corpo.append(h('div.vis-vazio', it.dica));
      else corpo.append(this.semVisualizacao(it.pasta ? tr('Pasta de arquivos. Abra-a com dois cliques para ver o que há dentro.') : tr('Sem visualização para este item.')));
      return;
    }
    const nome = it.nome || it.rotulo;
    const ext = extensao(nome);
    try {
      if (IMAGENS.has(ext)) corpo.append(h('img.vis-imagem', { src: urlDoDisco(it.rel) + '?v=' + Date.now(), alt: '' }));
      else if (VIDEOS.has(ext)) corpo.append(h('video.vis-video', { src: urlDoDisco(it.rel), controls: true, preload: 'metadata' }));
      else if (AUDIOS.has(ext)) corpo.append(h('div.vis-som', img(tipoDe(nome).icone, 32), h('audio', { src: urlDoDisco(it.rel), controls: true, preload: 'metadata' })));
      else if (ext === 'pdf') await this.pdf(it, corpo, vez);
      else if (ext === 'docx') await this.docx(it, corpo, vez);
      else if (ext === 'odt') await this.odt(it, corpo, vez);
      else if (ext === 'xlsx' || ext === 'xlsm' || ext === 'ods') await this.planilha(it, corpo, vez);
      else if (ext === 'csv' || ext === 'tsv') await this.csv(it, corpo, vez, ext);
      else if (ext === 'html' || ext === 'htm') await this.pagina(it, corpo, vez);
      else if (ehTexto(nome) && ext !== 'url') await this.texto(it, corpo, vez);
      else corpo.append(this.semVisualizacao());
    } catch {
      if (vez === this.vez) corpo.replaceChildren(this.semVisualizacao(tr('Não foi possível visualizar este arquivo.')));
    }
  }

  async texto(it, corpo, vez) {
    if ((it.tamanho || 0) > LIMITE_TEXTO) return corpo.append(this.semVisualizacao(tr('O arquivo é grande demais para a visualização. Abra-o com dois cliques.')));
    const t = await retro.disco.lerTexto(it.rel);
    if (vez !== this.vez) return;
    corpo.append(h('pre.vis-texto', t));
  }

  async pagina(it, corpo, vez) {
    if ((it.tamanho || 0) > LIMITE_TEXTO) return corpo.append(this.semVisualizacao(tr('O arquivo é grande demais para a visualização. Abra-o com dois cliques.')));
    const t = await retro.disco.lerTexto(it.rel);
    if (vez !== this.vez) return;
    // Os endereços relativos (as imagens da página) partem da pasta dela; a internet fica de fora.
    const pasta = urlDoDisco(paiDe(it.rel));
    const base = new URL(pasta.endsWith('/') ? pasta : pasta + '/', location.href).href;
    corpo.append(moldura(`<base href="${base.replace(/"/g, '%22')}">` + t.replace(/<!doctype[^>]*>/i, '')));
  }

  async docx(it, corpo, vez) {
    corpo.append(h('div.vis-vazio', tr('Lendo…')));
    const html = await retro.visualizar.docx(it.rel);
    if (vez !== this.vez) return;
    corpo.replaceChildren(moldura(html || `<p>${tr('(Documento vazio)')}</p>`, 'body { margin: 18px 22px; } p { margin: 0 0 8px; text-align: justify; }'));
  }

  async odt(it, corpo, vez) {
    corpo.append(h('div.vis-vazio', tr('Lendo…')));
    const paragrafos = await retro.visualizar.odt(it.rel);
    if (vez !== this.vez) return;
    const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).replace(/\n/g, '<br>');
    const html = paragrafos.map((p) => (p.titulo ? `<h2>${esc(p.texto)}</h2>` : `<p>${esc(p.texto) || '&nbsp;'}</p>`)).join('');
    corpo.replaceChildren(moldura(html || `<p>${tr('(Documento vazio)')}</p>`, 'body { margin: 18px 22px; } p { margin: 0 0 8px; } h2 { font-size: 17px; }'));
  }

  async planilha(it, corpo, vez) {
    corpo.append(h('div.vis-vazio', tr('Lendo…')));
    const r = await retro.visualizar.planilha(it.rel);
    if (vez !== this.vez) return;
    corpo.replaceChildren(this.tabela(r.linhas, r.mais, r.folha));
  }

  async csv(it, corpo, vez, ext) {
    if ((it.tamanho || 0) > LIMITE_TEXTO) return corpo.append(this.semVisualizacao(tr('O arquivo é grande demais para a visualização. Abra-o com dois cliques.')));
    const t = await retro.disco.lerTexto(it.rel);
    if (vez !== this.vez) return;
    const { linhas, mais } = lerCsv(t, ext === 'tsv' ? '\t' : null);
    corpo.replaceChildren(this.tabela(linhas, mais));
  }

  /** Uma folha como a da planilha: as letras das colunas em cima e os números das linhas ao lado. */
  tabela(linhas, mais, folha) {
    if (!linhas.length) return h('div.vis-vazio', tr('(Documento vazio)'));
    const largura = Math.max(...linhas.map((l) => l.length));
    const letra = (n) => { let s = ''; for (n++; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
    const cab = h('tr', h('th'), Array.from({ length: largura }, (_, k) => h('th', letra(k))));
    const corpo = linhas.map((l, i) => h('tr', h('th', String(i + 1)), Array.from({ length: largura }, (_, k) => h('td' + (NUMERO.test(l[k] || '') ? '.num' : ''), l[k] || ''))));
    return h('div.vis-folha-calc',
      folha ? h('div.vis-aba', folha) : null,
      h('table.vis-tabela', h('thead', cab), h('tbody', corpo)),
      mais ? h('div.vis-vazio', tr('A visualização mostra só o começo da planilha.')) : null);
  }

  /** As páginas do PDF, desenhadas à medida que aparecem (as primeiras na hora). */
  async pdf(it, corpo, vez) {
    const lib = await carregarPdfjs();
    const base = new URL('../vendor/pdfjs/', import.meta.url).href;
    const tarefa = lib.getDocument({
      url: new URL(urlDoDisco(it.rel), location.href).href,
      isEvalSupported: false,
      standardFontDataUrl: base + 'standard_fonts/',
      cMapUrl: base + 'cmaps/',
      wasmUrl: base + 'wasm/',
      iccUrl: base + 'iccs/',
    });
    if (vez !== this.vez) { tarefa.destroy(); return; }
    this.tarefaPdf = tarefa;
    const doc = await tarefa.promise;
    if (vez !== this.vez) return;
    // As folhas ocupam a largura do painel (a altura segue a proporção da folha): enquanto não
    // são desenhadas, todas têm a medida da primeira, que é a de quase todo PDF.
    const p1 = await doc.getPage(1);
    if (vez !== this.vez) return;
    const v1 = p1.getViewport({ scale: 1 });
    const folhas = h('div.vis-pdf');
    corpo.append(folhas);
    const n = Math.min(doc.numPages, PAGINAS_MAX);
    const desenhar = async (i, canvas) => {
      if (canvas.dataset.feito) return;
      canvas.dataset.feito = '1';
      const pagina = await doc.getPage(i);
      if (vez !== this.vez) return;
      const v = pagina.getViewport({ scale: 1 });
      const largura = Math.max(120, canvas.clientWidth || corpo.clientWidth - 20);
      const vp = pagina.getViewport({ scale: (largura / v.width) * (window.devicePixelRatio || 1) });
      canvas.width = Math.round(vp.width);
      canvas.height = Math.round(vp.height);
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vp, canvas }).promise.catch(() => { });
    };
    this.observador = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) desenhar(Number(e.target.dataset.pagina), e.target);
    }, { root: corpo, rootMargin: '200px' });
    for (let i = 1; i <= n; i++) {
      const canvas = h('canvas.vis-folha', { width: Math.round(v1.width), height: Math.round(v1.height), dataset: { pagina: i } });
      folhas.append(canvas);
      this.observador.observe(canvas);
    }
    if (doc.numPages > n) folhas.append(h('div.vis-vazio', tr('Mais {n} página(s): abra o PDF para ver todas.', { n: doc.numPages - n })));
  }
}
