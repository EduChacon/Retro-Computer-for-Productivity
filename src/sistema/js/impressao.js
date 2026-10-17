/*
 * Imprimir pelos programas do Retro Computer: o texto (Bloco de notas) e a imagem
 * (Visualizador de imagens) viram uma página HTML pronta para o papel, e o sistema mostra a
 * caixa de impressão (escolher a impressora, as cópias e as páginas). A mesma página também vira um
 * PDF no disco C: (Salvar como PDF), sem impressora nenhuma, nos três sistemas.
 */
import { caixaArquivo, erro } from './dialogos.js';
import { tr } from './idioma.js';
import { nomeDe, paiDe, semExtensao } from './util.js';
import { abrirArquivo, avisar, pastaDocs } from './sistema.js';

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** A página inteira: o título no alto e o corpo. */
export function paginaDeImpressao(titulo, corpo, { estilo = '' } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapar(titulo)}</title><style>
    @page { margin: 18mm 16mm; }
    body { font: 11pt/1.35 sans-serif; color: #000; margin: 0; }
    h1 { font-size: 10pt; font-weight: normal; color: #444; border-bottom: 0.5pt solid #888; padding-bottom: 3pt; margin: 0 0 10pt; }
    ${estilo}
  </style></head><body><h1>${escapar(titulo)}</h1>${corpo}</body></html>`;
}

async function enviar(html, titulo, dispositivo) {
  const r = await retro.impressoras.imprimir(html, { titulo, dispositivo }).catch((e) => ({ ok: false, motivo: e.message }));
  // Cancelar na caixa do sistema não é erro.
  if (!r.ok && r.motivo && !/cancel/i.test(r.motivo)) erro(tr('Não foi possível imprimir: {erro}', { erro: r.motivo }));
  return r;
}

/**
 * A caixa Salvar como, para um PDF: o nome sugerido é o do documento, na pasta dele (ou em Meus
 * documentos). Devolve o caminho no disco C:, sempre terminado em .pdf, ou null.
 */
export async function escolherPdf(titulo, perto = '') {
  // O título de uma página da internet pode ter caracteres que não cabem num nome de arquivo.
  const base = semExtensao(String(titulo || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)) || tr('Sem título');
  const rel = await caixaArquivo({
    modo: 'salvar', titulo: tr('Salvar como PDF'), pasta: (perto && paiDe(perto)) || pastaDocs(),
    nome: base + '.pdf', tipos: [{ rotulo: tr('Documento PDF (*.pdf)'), exts: ['pdf'] }],
  });
  if (!rel) return null;
  return /\.pdf$/i.test(rel) ? rel : rel + '.pdf';
}

/** O aviso do PDF salvo (um clique o abre). */
export function avisarPdf(rel) {
  avisar(tr('Salvo como PDF'), nomeDe(rel), { icone: 'pdf', som: null, aoClicar: () => abrirArquivo(rel) });
}

async function salvarPdf(html, titulo, perto) {
  const rel = await escolherPdf(titulo, perto);
  if (!rel) return null;
  try {
    await retro.impressoras.pdf(html, rel);
  } catch (e) {
    erro(tr('Não foi possível salvar o PDF: {erro}', { erro: e.message }));
    return null;
  }
  avisarPdf(rel);
  return rel;
}

const paginaDoTexto = (titulo, texto, fixa) => paginaDeImpressao(titulo, `<pre>${escapar(texto)}</pre>`,
  { estilo: `pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; font: ${fixa ? '10pt/1.3 monospace' : '11pt/1.35 sans-serif'}; }` });
const paginaDaImagem = (titulo, dataUrl) => paginaDeImpressao(titulo, `<img src="${dataUrl}">`,
  { estilo: 'img { display: block; max-width: 100%; max-height: 240mm; margin: 0 auto; object-fit: contain; }' });

/** Um texto simples (com a letra de largura fixa, se for o caso). */
export function imprimirTexto(titulo, texto, { fixa = false } = {}) {
  return enviar(paginaDoTexto(titulo, texto, fixa), titulo);
}

/** Uma imagem, do tamanho da página (sem passar dela). */
export function imprimirImagem(titulo, dataUrl) {
  return enviar(paginaDaImagem(titulo, dataUrl), titulo);
}

/** O mesmo texto da impressão, num PDF do disco C:. */
export function pdfDoTexto(titulo, texto, { fixa = false, perto = '' } = {}) {
  return salvarPdf(paginaDoTexto(titulo, texto, fixa), titulo, perto);
}

/** A mesma imagem da impressão, num PDF do disco C:. */
export function pdfDaImagem(titulo, dataUrl, { perto = '' } = {}) {
  return salvarPdf(paginaDaImagem(titulo, dataUrl), titulo, perto);
}

/** A página de teste de uma impressora (vai direto, sem a caixa). */
export function paginaDeTeste(nome, rotulo) {
  const agora = new Date().toLocaleString();
  const corpo = `<p>${escapar(tr('Esta é a página de teste do Retro Computer.'))}</p>
    <p>${escapar(tr('Impressora: {nome}', { nome: rotulo }))}<br>${escapar(agora)}</p>
    <div style="display:flex;gap:6mm;margin-top:8mm">${['#000', '#00f', '#f00', '#0a0', '#ff0', '#0ff', '#f0f'].map((c) => `<div style="width:14mm;height:14mm;background:${c};border:0.3mm solid #000"></div>`).join('')}</div>
    <p style="margin-top:8mm;font:9pt monospace">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789 áéíóú ãõ ç</p>`;
  return enviar(paginaDeImpressao(tr('Página de teste'), corpo, { estilo: 'div > div { -webkit-print-color-adjust: exact; print-color-adjust: exact; }' }), tr('Página de teste'), nome);
}
