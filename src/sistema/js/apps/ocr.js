/*
 * Copiar o texto (o botão direito numa imagem ou num PDF, e o Visualizador de imagens): o texto de uma
 * foto, de uma digitalização ou de um PDF, numa janela de onde se copia ou se salva como .txt. Nos
 * PDFs, as páginas que já têm texto dão o texto delas; as digitalizadas são desenhadas aqui e lidas
 * pelo OCR (src/principal/ocr.js), sem internet.
 */
import { h, nomeDe, paiDe, semExtensao, extensao } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { tr, marcar, idiomaAtual } from '../idioma.js';
import { caixaArquivo, erro } from '../dialogos.js';
import { pngDe, EXTS_OCR } from '../pdf.js';
import { abrirPdfDoDisco } from '../visualizar.js';
import { tocar } from '../sons.js';

const DIRETAS = ['png', 'jpg', 'jpeg', 'bmp'];
const PAGINAS_MAX = 200;
const LADO_MAX = 2600; // a página do PDF desenhada para o OCR (cerca de 220 pontos por polegada no A4)
const IDIOMAS = [
  { id: 'por+eng', rotulo: marcar('Português') },
  { id: 'eng', rotulo: marcar('Inglês') },
  { id: 'spa+eng', rotulo: marcar('Espanhol') },
];
const idiomaPadrao = () => ({ en: 'eng', es: 'spa+eng' }[idiomaAtual()] || 'por+eng');

/** O texto de uma página do PDF, quando ela tem (as linhas como o pdf.js as dá). */
async function textoDaPagina(pagina) {
  const c = await pagina.getTextContent();
  return c.items.map((i) => (i.str || '') + (i.hasEOL ? '\n' : '')).join('').replace(/[ \t]+\n/g, '\n').trim();
}

/** A página desenhada em PNG, grande o bastante para o OCR. */
async function pngDaPagina(pagina) {
  const v = pagina.getViewport({ scale: 1 });
  const escala = Math.min(3, LADO_MAX / Math.max(v.width, v.height));
  const vp = pagina.getViewport({ scale: escala });
  const c = document.createElement('canvas');
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  await pagina.render({ canvasContext: g, viewport: vp, canvas: c }).promise;
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/png'));
  c.width = c.height = 0;
  return new Uint8Array(await blob.arrayBuffer());
}

class JanelaTexto {
  constructor(rel) {
    this.rel = rel;
    this.vez = 0;
    this.j = new Janela({ titulo: tr('Texto de {nome}', { nome: nomeDe(rel) }), icone: 'texto', largura: 540, altura: 420, status: [''] });
    this.idioma = h('select', IDIOMAS.map((i) => h('option', { value: i.id }, tr(i.rotulo))));
    this.idioma.value = idiomaPadrao();
    this.idioma.addEventListener('change', () => this.ler());
    this.texto = h('textarea.ocr-texto', { spellcheck: false });
    this.btCopiar = h('button.padrao', { on: { click: () => this.copiar() } }, tr('Copiar tudo'));
    this.btSalvar = h('button', { on: { click: () => this.salvar() } }, tr('Salvar como texto…'));
    this.j.corpo.classList.add('ocr-corpo');
    this.j.corpo.append(
      h('div.ocr-topo', h('label', tr('Idioma do texto:')), h('div.select-caixa', this.idioma)),
      this.texto,
      h('div.acoes', this.btCopiar, this.btSalvar, h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
    );
    this.j.ev.on('fechada', () => { this.vez++; });
    this.ler();
  }

  situacao(t) { this.j.definirStatus(t); }

  ocupado(v) {
    for (const b of [this.btCopiar, this.btSalvar, this.idioma]) b.disabled = v;
  }

  async ler() {
    const vez = ++this.vez;
    const idioma = this.idioma.value;
    this.texto.value = '';
    this.ocupado(true);
    try {
      const r = extensao(this.rel) === 'pdf' ? await this.lerPdf(vez, idioma) : await this.lerImagem(vez, idioma);
      if (vez !== this.vez) return;
      this.texto.value = r.texto;
      this.situacao(!r.texto ? tr('Nenhum texto encontrado.')
        : r.ocr ? tr('Texto reconhecido (confiança de {c}%). Confira antes de usar.', { c: r.confianca })
          : tr('Texto tirado do próprio PDF.'));
      tocar('info');
    } catch (e) {
      if (vez !== this.vez) return;
      this.situacao('');
      erro(tr('Não foi possível ler o texto: {erro}', { erro: e.message }), tr('Copiar o texto'));
    } finally {
      if (vez === this.vez) this.ocupado(false);
    }
  }

  async lerImagem(vez, idioma) {
    this.situacao(tr('Lendo o texto da imagem…'));
    const item = DIRETAS.includes(extensao(this.rel)) ? { rel: this.rel } : { png: await pngDe(this.rel) };
    const r = await retro.ocr.imagem(item, idioma);
    return { texto: r.texto, confianca: r.confianca, ocr: true };
  }

  async lerPdf(vez, idioma) {
    this.situacao(tr('Abrindo o PDF…'));
    const tarefa = await abrirPdfDoDisco(this.rel);
    let doc;
    try { doc = await tarefa.promise; } catch (e) {
      throw new Error(/password/i.test(e && e.name + e.message) ? tr('"{nome}" tem senha ou está protegido contra mudanças, e não pode ser mudado aqui.', { nome: nomeDe(this.rel) }) : (e.message || String(e)));
    }
    try {
      const n = Math.min(doc.numPages, PAGINAS_MAX);
      const partes = [];
      let ocr = 0;
      let soma = 0;
      for (let i = 1; i <= n; i++) {
        if (vez !== this.vez) return { texto: '' };
        this.situacao(tr('Lendo a página {i} de {n}…', { i, n }));
        const pagina = await doc.getPage(i);
        let t = await textoDaPagina(pagina);
        // Uma página sem texto é uma digitalização: vai para o OCR.
        if (t.replace(/\s/g, '').length < 3) {
          const r = await retro.ocr.imagem({ png: await pngDaPagina(pagina) }, idioma);
          t = r.texto;
          ocr++;
          soma += r.confianca;
        }
        pagina.cleanup();
        partes.push(t);
        this.texto.value = partes.filter(Boolean).join('\n\n');
      }
      let texto = partes.filter(Boolean).join('\n\n');
      if (doc.numPages > n) texto += '\n\n' + tr('(Só as primeiras {n} páginas.)', { n });
      return { texto, ocr: ocr > 0, confianca: ocr ? Math.round(soma / ocr) : 100 };
    } finally {
      tarefa.destroy();
    }
  }

  async copiar() {
    try {
      await navigator.clipboard.writeText(this.texto.value);
      this.situacao(tr('Texto copiado.'));
    } catch (e) { erro(e.message); }
  }

  async salvar() {
    const rel = await caixaArquivo({
      modo: 'salvar', titulo: tr('Salvar como texto'), pasta: paiDe(this.rel), nome: semExtensao(nomeDe(this.rel)) + '.txt',
      tipos: [{ rotulo: tr('Documentos de texto (*.txt)'), exts: ['txt'] }],
    });
    if (!rel) return;
    try {
      await retro.disco.gravar(/\.[^./]+$/.test(nomeDe(rel)) ? rel : rel + '.txt', new TextEncoder().encode(this.texto.value));
      this.situacao(tr('Salvo em {nome}.', { nome: nomeDe(rel) }));
    } catch (e) { erro(e.message); }
  }
}

registrarApp('ocr', { nome: marcar('Copiar o texto'), icone: 'texto', abrir: ({ arquivo } = {}) => (arquivo && EXTS_OCR.includes(extensao(arquivo)) ? new JanelaTexto(arquivo).j : null) });
