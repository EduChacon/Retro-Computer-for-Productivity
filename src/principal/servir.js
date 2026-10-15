'use strict';
/*
 * Os arquivos do disco C: para o Visualizador de imagens e o Reprodutor de mídia
 * (sistema://retro/disco/<caminho>). Só leitura; aceita os pedidos de um trecho
 * ("Range"), para o vídeo poder pular para qualquer ponto sem ler o arquivo inteiro.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');

const MIME_MIDIA = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.bmp': 'image/bmp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.avif': 'image/avif',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.mov': 'video/quicktime',
  '.ogv': 'video/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.weba': 'audio/webm',
  '.vtt': 'text/vtt; charset=utf-8', '.srt': 'text/plain; charset=utf-8',
};

const mimeMidia = (arquivo) => MIME_MIDIA[path.extname(arquivo).toLowerCase()] || 'application/octet-stream';

/**
 * "bytes=100-199", "bytes=100-" ou "bytes=-500" → { inicio, fim } (fim incluído), ou null se
 * não for um trecho só; { invalido: true } se o trecho não cabe no arquivo.
 */
function lerTrecho(cabecalho, tamanho) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(cabecalho || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let inicio;
  let fim;
  if (m[1] === '') {
    const ultimos = Number(m[2]);
    if (!ultimos) return { invalido: true };
    inicio = Math.max(0, tamanho - ultimos);
    fim = tamanho - 1;
  } else {
    inicio = Number(m[1]);
    fim = m[2] === '' ? tamanho - 1 : Math.min(Number(m[2]), tamanho - 1);
  }
  if (inicio >= tamanho || fim < inicio) return { invalido: true };
  return { inicio, fim };
}

/** A resposta para um arquivo (o inteiro ou o trecho pedido). */
async function servirArquivo(arquivo, cabecalhoTrecho) {
  let st;
  try {
    st = await fsp.stat(arquivo);
  } catch {
    return new Response('404', { status: 404 });
  }
  if (!st.isFile()) return new Response('404', { status: 404 });
  const base = { 'Content-Type': mimeMidia(arquivo), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
  const trecho = lerTrecho(cabecalhoTrecho, st.size);
  if (trecho && trecho.invalido) {
    return new Response(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${st.size}` } });
  }
  if (trecho) {
    const corpo = Readable.toWeb(fs.createReadStream(arquivo, { start: trecho.inicio, end: trecho.fim }));
    return new Response(corpo, {
      status: 206,
      headers: { ...base, 'Content-Length': String(trecho.fim - trecho.inicio + 1), 'Content-Range': `bytes ${trecho.inicio}-${trecho.fim}/${st.size}` },
    });
  }
  return new Response(Readable.toWeb(fs.createReadStream(arquivo)), { status: 200, headers: { ...base, 'Content-Length': String(st.size) } });
}

/*
 * As miniaturas do Explorador: a foto encolhida (192 pontos no lado maior), guardada num cache
 * pela data e pelo tamanho do arquivo (o original nunca é tocado). O Windows e o macOS fazem a
 * miniatura pelo sistema; no Linux, o Electron lê PNG e JPEG. Os outros formatos pequenos vão
 * como estão (a área de trabalho encolhe); os grandes ficam com o ícone.
 */
const LADO_MINIATURA = 192;
const feitas = new Map(); // a mesma miniatura pedida duas vezes ao mesmo tempo: um trabalho só

async function miniatura(arquivo, pastaCache, nativeImage) {
  let st;
  try { st = await fsp.stat(arquivo); } catch { return new Response('404', { status: 404 }); }
  if (!st.isFile()) return new Response('404', { status: 404 });
  const chave = crypto.createHash('sha1').update(`${arquivo}|${st.size}|${st.mtimeMs}`).digest('hex');
  const destino = path.join(pastaCache, chave + '.png');
  const cabecalhos = { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=3600' };
  if (fs.existsSync(destino)) return new Response(await fsp.readFile(destino), { headers: cabecalhos });
  if (!feitas.has(chave)) {
    feitas.set(chave, (async () => {
      let im = null;
      try { im = await nativeImage.createThumbnailFromPath(arquivo, { width: LADO_MINIATURA, height: LADO_MINIATURA }); } catch { }
      if (!im || im.isEmpty()) {
        im = nativeImage.createFromPath(arquivo);
        if (!im.isEmpty()) {
          const { width, height } = im.getSize();
          const esc = Math.min(1, LADO_MINIATURA / Math.max(width, height));
          if (esc < 1) im = im.resize({ width: Math.max(1, Math.round(width * esc)), height: Math.max(1, Math.round(height * esc)), quality: 'good' });
        }
      }
      if (im.isEmpty()) return null;
      const png = im.toPNG();
      await fsp.mkdir(pastaCache, { recursive: true });
      await fsp.writeFile(destino, png);
      return png;
    })().finally(() => setTimeout(() => feitas.delete(chave), 1000)));
  }
  const png = await feitas.get(chave).catch(() => null);
  if (png) return new Response(png, { headers: cabecalhos });
  // O Electron não lê este formato (GIF, WebP, SVG no Linux): os pequenos vão como estão.
  if (st.size <= 3 * 1024 * 1024) return servirArquivo(arquivo, null);
  return new Response('404', { status: 404 });
}

module.exports = { servirArquivo, lerTrecho, mimeMidia, miniatura };
