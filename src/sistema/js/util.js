/* Utilidades da área de trabalho: criar elementos, caminhos, formatos e tipos de arquivo. */

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
  if (bytes < 1024) return `${bytes} bytes`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.ceil(kb).toLocaleString('pt-BR')} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  return `${(mb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`;
}

export function dataHora(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/* ---------- Tipos de arquivo ---------- */

const TIPOS = {
  txt: ['texto', 'Documento de texto'], log: ['texto', 'Documento de texto'], ini: ['texto', 'Configurações'],
  md: ['markdown', 'Texto Markdown'], markdown: ['markdown', 'Texto Markdown'],
  doc: ['documento', 'Documento'], docx: ['documento', 'Documento'], dotx: ['documento', 'Modelo de documento'],
  odt: ['documento', 'Documento OpenDocument'], rtf: ['documento', 'Rich Text'],
  xls: ['planilha', 'Planilha'], xlsx: ['planilha', 'Planilha'], xlsm: ['planilha', 'Planilha'], ods: ['planilha', 'Planilha OpenDocument'],
  csv: ['planilha', 'Valores separados por vírgula'], tsv: ['planilha', 'Valores separados por tabulação'],
  ppt: ['apresentacao', 'Apresentação'], pptx: ['apresentacao', 'Apresentação'], odp: ['apresentacao', 'Apresentação OpenDocument'],
  pdf: ['pdf', 'Documento PDF'],
  png: ['imagem', 'Imagem PNG'], jpg: ['imagem', 'Imagem JPEG'], jpeg: ['imagem', 'Imagem JPEG'], gif: ['imagem', 'Imagem GIF'],
  webp: ['imagem', 'Imagem WebP'], bmp: ['imagem', 'Imagem de bitmap'], tif: ['imagem', 'Imagem TIFF'], tiff: ['imagem', 'Imagem TIFF'],
  svg: ['imagem', 'Desenho vetorial'], psd: ['imagem', 'Imagem com camadas'], ico: ['imagem', 'Ícone'],
  dng: ['imagem', 'Foto RAW'], cr2: ['imagem', 'Foto RAW'], nef: ['imagem', 'Foto RAW'], arw: ['imagem', 'Foto RAW'],
  mp3: ['som', 'Som MP3'], wav: ['som', 'Som WAV'], flac: ['som', 'Som FLAC'], ogg: ['som', 'Som OGG'], m4a: ['som', 'Som'], aiff: ['som', 'Som AIFF'],
  mp4: ['video', 'Vídeo'], mov: ['video', 'Vídeo'], mkv: ['video', 'Vídeo'], webm: ['video', 'Vídeo'], avi: ['video', 'Vídeo'],
  zip: ['compactado', 'Pasta compactada'], rar: ['compactado', 'Arquivo compactado'], '7z': ['compactado', 'Arquivo compactado'], gz: ['compactado', 'Arquivo compactado'],
  htm: ['html', 'Página da internet'], html: ['html', 'Página da internet'], url: ['html', 'Atalho da internet'],
  js: ['codigo', 'Código JavaScript'], ts: ['codigo', 'Código TypeScript'], json: ['json', 'Dados JSON'], py: ['python', 'Código Python'],
  sh: ['shell', 'Roteiro do shell'], bat: ['shell', 'Arquivo de lote'], ps1: ['shell', 'Roteiro do PowerShell'],
  ttf: ['fonte', 'Fonte TrueType'], otf: ['fonte', 'Fonte OpenType'], woff2: ['fonte', 'Fonte da web'],
  exe: ['executavel', 'Programa'], msi: ['executavel', 'Instalador'], dmg: ['executavel', 'Imagem de disco'], app: ['executavel', 'Programa'],
  ics: ['calendario-arq', 'Calendário'], dxf: ['arquivo', 'Desenho CAD'], dwg: ['arquivo', 'Desenho CAD'],
};

export function tipoDe(nome, pasta) {
  if (pasta) return { icone: 'pasta', descricao: 'Pasta de arquivos' };
  const ext = extensao(nome);
  const t = TIPOS[ext];
  if (t) return { icone: t[0], descricao: t[1], ext };
  return { icone: 'arquivo', descricao: ext ? `Arquivo ${ext.toUpperCase()}` : 'Arquivo', ext };
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
