'use strict';
/*
 * Os papéis de parede do usuário: as imagens que ele escolhe no disco C: (Painel › Aparência ›
 * Procurar…, ou o botão direito numa imagem › Usar como papel de parede). Cada uma é copiada para a
 * pasta de dados dele (a de cada usuário), com o nome pelo resumo do conteúdo: o fundo continua se
 * o arquivo do disco for movido ou apagado, e a mesma imagem escolhida duas vezes é uma só. Tirar
 * da lista apaga só a cópia; o arquivo do disco C: fica como está.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_PAPEL = 50 * 1024 * 1024;
const NOME_COPIA = /^[0-9a-f]{16}\.(png|jpg|gif|webp|bmp)$/;
const MIME = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };

/** A extensão da imagem pelos primeiros bytes (o nome do arquivo pode mentir), ou null. */
function extensaoDaImagem(buf) {
  const b = buf.subarray(0, 16);
  if (b.length >= 4 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.toString('latin1', 0, 4) === 'GIF8') return 'gif';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (b.toString('latin1', 0, 2) === 'BM' && b.length >= 14) return 'bmp';
  return null;
}

/** O nome que aparece na lista: o do arquivo, sem a extensão. */
function nomeDoPapel(arquivo) {
  const base = path.basename(String(arquivo));
  const i = base.lastIndexOf('.');
  return (i > 0 ? base.slice(0, i) : base).slice(0, 120);
}

class PapeisDeParede {
  constructor(pasta) {
    this.pasta = pasta;
  }

  /** Copia a imagem (o caminho real, já conferido pelo disco) e diz o nome da cópia e o da lista. */
  async adicionar(real, { tr = (t) => t } = {}) {
    const info = await fsp.stat(real);
    if (!info.isFile()) throw Object.assign(new Error(tr('Escolha um arquivo de imagem.')), { codigo: 'tipo' });
    if (info.size > MAX_PAPEL) throw Object.assign(new Error(tr('A imagem é grande demais para o papel de parede (o limite é de 50 MB).')), { codigo: 'grande' });
    const buf = await fsp.readFile(real);
    const ext = extensaoDaImagem(buf);
    if (!ext) throw Object.assign(new Error(tr('Este arquivo não é uma imagem que o papel de parede aceite (PNG, JPEG, GIF, WebP ou BMP).')), { codigo: 'tipo' });
    const arquivo = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 16) + '.' + ext;
    await fsp.mkdir(this.pasta, { recursive: true });
    const destino = path.join(this.pasta, arquivo);
    if (!fs.existsSync(destino)) {
      const temp = destino + '.parcial';
      await fsp.writeFile(temp, buf);
      await fsp.rename(temp, destino);
    }
    return { arquivo, nome: nomeDoPapel(real) };
  }

  /** O caminho de uma cópia, só se o nome for de uma cópia (nada fora da pasta), ou null. */
  caminho(arquivo) {
    const a = String(arquivo || '');
    if (!NOME_COPIA.test(a)) return null;
    return path.join(this.pasta, a);
  }

  /** Apaga a cópia (o arquivo do disco C: fica). */
  async remover(arquivo) {
    const c = this.caminho(arquivo);
    if (!c) return false;
    await fsp.rm(c, { force: true });
    return true;
  }

  /** A resposta de sistema://retro/papel/<arquivo>. */
  async servir(arquivo) {
    const c = this.caminho(arquivo);
    if (!c || !fs.existsSync(c)) return new Response('404', { status: 404 });
    return new Response(await fsp.readFile(c), { headers: { 'Content-Type': MIME[path.extname(c).slice(1)], 'Cache-Control': 'max-age=31536000, immutable' } });
  }
}

module.exports = { PapeisDeParede, extensaoDaImagem, nomeDoPapel, MAX_PAPEL };
