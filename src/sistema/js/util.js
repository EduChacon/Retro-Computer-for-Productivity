/* Utilidades da área de trabalho: criar elementos, caminhos, formatos e tipos de arquivo. */
import { tr, marcar, localidade } from './idioma.js';

/** Cria um elemento: h('div.classe#id', { atributos, on: { click } }, filhos…) */
export function h(seletor, props, ...filhos) {
  const m = seletor.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
  const el = document.createElement((m && m[1]) || 'div');
  if (m && m[2]) {
    for (const parte of m[2].match(/[.#][\w-]+/g)) {
      if (parte[0] === '.') el.classList.add(parte.slice(1));
      else el.id = parte.slice(1);
    }
  }
  if (props && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
    filhos.unshift(props);
    props = null;
  }
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'className' || k === 'class') el.className = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f == null || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

/** Rótulo com a letra de atalho sublinhada: "&Arquivo" → A sublinhado. */
export function rotulo(texto) {
  const i = texto.indexOf('&');
  if (i < 0) return document.createTextNode(texto);
  const s = h('span');
  s.append(texto.slice(0, i), h('u.atalho', texto[i + 1]), texto.slice(i + 2));
  return s;
}
export const semAtalho = (t) => String(t).replace('&', '');
export const letraAtalho = (t) => { const i = t.indexOf('&'); return i >= 0 ? t[i + 1].toLowerCase() : null; };

/* ---------- Caminhos ---------- */

/** "Meus documentos/carta.txt" → "C:\Meus documentos\carta.txt" */
export function caminhoTela(rel) {
  return 'C:\\' + String(rel || '').split('/').filter(Boolean).join('\\');
}

/** "C:\Meus documentos\carta.txt" (ou "Meus documentos/carta.txt") → "Meus documentos/carta.txt" */
export function caminhoInterno(texto) {
  let t = String(texto || '').trim().replace(/\\/g, '/');
  t = t.replace(/^[a-z]:\/?/i, '');
  return t.split('/').filter((p) => p && p !== '.').join('/');
}

export const nomeDe = (rel) => String(rel || '').split('/').filter(Boolean).pop() || '';
export const paiDe = (rel) => String(rel || '').split('/').filter(Boolean).slice(0, -1).join('/');
export const juntar = (pai, nome) => (pai ? `${pai}/${nome}` : nome);
export function extensao(nome) {
  const m = String(nome).match(/\.([^.\/]+)$/);
  return m ? m[1].toLowerCase() : '';
}
export function semExtensao(nome) {
  return String(nome).replace(/\.[^.\/]+$/, '');
}

/* ---------- Formatos ---------- */

export function tamanho(bytes) {
  if (bytes == null) return '';
  const loc = localidade();
  if (bytes < 1024) return tr('{n} bytes', { n: bytes.toLocaleString(loc) });
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.ceil(kb).toLocaleString(loc)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toLocaleString(loc, { maximumFractionDigits: 1 })} MB`;
  return `${(mb / 1024).toLocaleString(loc, { maximumFractionDigits: 1 })} GB`;
}

export function dataHora(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString(localidade()) + ' ' + d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Tipos de arquivo ---------- */

const TIPOS = {
  txt: ['texto', marcar('Documento de texto')], log: ['texto', marcar('Documento de texto')], ini: ['texto', marcar('Configurações')],
  md: ['markdown', marcar('Texto Markdown')], markdown: ['markdown', marcar('Texto Markdown')],
  doc: ['documento', marcar('Documento')], docx: ['documento', marcar('Documento')], dotx: ['documento', marcar('Modelo de documento')],
  odt: ['documento', marcar('Documento OpenDocument')], rtf: ['documento', marcar('Rich Text')],
  xls: ['planilha', marcar('Planilha')], xlsx: ['planilha', marcar('Planilha')], xlsm: ['planilha', marcar('Planilha')], ods: ['planilha', marcar('Planilha OpenDocument')],
  csv: ['planilha', marcar('Valores separados por vírgula')], tsv: ['planilha', marcar('Valores separados por tabulação')],
  ppt: ['apresentacao', marcar('Apresentação')], pptx: ['apresentacao', marcar('Apresentação')], odp: ['apresentacao', marcar('Apresentação OpenDocument')],
  pdf: ['pdf', marcar('Documento PDF')],
  png: ['imagem', marcar('Imagem PNG')], jpg: ['imagem', marcar('Imagem JPEG')], jpeg: ['imagem', marcar('Imagem JPEG')], gif: ['imagem', marcar('Imagem GIF')],
  webp: ['imagem', marcar('Imagem WebP')], bmp: ['imagem', marcar('Imagem de bitmap')], tif: ['imagem', marcar('Imagem TIFF')], tiff: ['imagem', marcar('Imagem TIFF')],
  svg: ['imagem', marcar('Desenho vetorial')], psd: ['imagem', marcar('Imagem com camadas')], ico: ['imagem', marcar('Ícone')],
  dng: ['imagem', marcar('Foto RAW')], cr2: ['imagem', marcar('Foto RAW')], nef: ['imagem', marcar('Foto RAW')], arw: ['imagem', marcar('Foto RAW')],
  mp3: ['som', marcar('Som MP3')], wav: ['som', marcar('Som WAV')], flac: ['som', marcar('Som FLAC')], ogg: ['som', marcar('Som OGG')], m4a: ['som', marcar('Som')], aiff: ['som', marcar('Som AIFF')],
  mp4: ['video', marcar('Vídeo')], mov: ['video', marcar('Vídeo')], mkv: ['video', marcar('Vídeo')], webm: ['video', marcar('Vídeo')], avi: ['video', marcar('Vídeo')],
  zip: ['compactado', marcar('Pasta compactada')], rar: ['compactado', marcar('Arquivo compactado')], '7z': ['compactado', marcar('Arquivo compactado')], gz: ['compactado', marcar('Arquivo compactado')],
  htm: ['html', marcar('Página da internet')], html: ['html', marcar('Página da internet')], url: ['html', marcar('Atalho da internet')],
  js: ['codigo', marcar('Código JavaScript')], ts: ['codigo', marcar('Código TypeScript')], json: ['json', marcar('Dados JSON')], py: ['python', marcar('Código Python')],
  sh: ['shell', marcar('Roteiro do shell')], bat: ['shell', marcar('Arquivo de lote')], ps1: ['shell', marcar('Roteiro do PowerShell')],
  ttf: ['fonte', marcar('Fonte TrueType')], otf: ['fonte', marcar('Fonte OpenType')], woff2: ['fonte', marcar('Fonte da web')],
  exe: ['executavel', marcar('Programa')], msi: ['executavel', marcar('Instalador')], dmg: ['executavel', marcar('Imagem de disco')], app: ['executavel', marcar('Programa')],
  ics: ['calendario-arq', marcar('Calendário')], dxf: ['arquivo', marcar('Desenho CAD')], dwg: ['arquivo', marcar('Desenho CAD')],
};

export function tipoDe(nome, pasta) {
  if (pasta) return { icone: 'pasta', descricao: tr('Pasta de arquivos') };
  const ext = extensao(nome);
  const t = TIPOS[ext];
  if (t) return { icone: t[0], descricao: tr(t[1]), ext };
  return { icone: 'arquivo', descricao: ext ? tr('Arquivo {ext}', { ext: ext.toUpperCase() }) : tr('Arquivo'), ext };
}

export const ehTexto = (nome) => ['txt', 'log', 'ini', 'md', 'markdown', 'csv', 'tsv', 'json', 'js', 'ts', 'py', 'sh', 'bat', 'ps1', 'css', 'xml', 'yml', 'yaml', 'toml', 'html', 'htm', 'url'].includes(extensao(nome));

/** Ícone: icone('pasta', 16) → "icones/16/pasta.png" */
export function icone(nome, tam = 32) {
  return `icones/${tam}/${nome || 'arquivo'}.png`;
}

export function img(nome, tam = 32, props = {}) {
  return h('img', { src: icone(nome, tam), width: tam, height: tam, alt: '', draggable: 'false', ...props });
}

/* ---------- Diversos ---------- */

export function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function limitar(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Pequeno barramento de eventos. */
export class Eventos {
  constructor() { this.ouvintes = new Map(); }
  on(ev, fn) {
    if (!this.ouvintes.has(ev)) this.ouvintes.set(ev, new Set());
    this.ouvintes.get(ev).add(fn);
    return () => this.ouvintes.get(ev).delete(fn);
  }
  emit(ev, ...args) {
    for (const fn of this.ouvintes.get(ev) || []) {
      try { fn(...args); } catch (e) { console.error(e); }
    }
  }
}

export const ehMac = navigator.platform.toLowerCase().includes('mac');
