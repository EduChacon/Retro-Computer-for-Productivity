/*
 * O OCR do lado do disco: prepara os dados dos idiomas (uma cópia dos que vêm com o programa, numa
 * pasta só, porque o tesseract.js lê todos de um lugar), lê a imagem do disco C: com o limite de
 * tamanho e manda o reconhecimento para o processo de trabalho (ocr-ops.js). Nada vai para a internet.
 */
'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { tr } = require('./idioma');

const IDIOMAS = ['por', 'eng', 'spa'];
const MAX_IMAGEM = 60 * 1024 * 1024;
const TIPOS = new Set(['.png', '.jpg', '.jpeg', '.bmp']);

/** O idioma pedido ("por", "por+eng"…), só com os que o programa traz; o resto vira inglês. */
function idiomaValido(id) {
  const lista = [...new Set(String(id || '').split('+').filter((l) => IDIOMAS.includes(l)))];
  return lista.length ? lista.join('+') : 'eng';
}

/** O arquivo de dados de um idioma, dentro do pacote @tesseract.js-data (a versão "best_int"). */
const origemDe = (l) => path.join(path.dirname(require.resolve(`@tesseract.js-data/${l}/package.json`)), '4.0.0_best_int', `${l}.traineddata.gz`);

class Ocr {
  constructor({ disco, trabalhos, pasta }) {
    this.disco = disco;
    this.trabalhos = trabalhos;
    this.pasta = pasta;
    this.pronta = null;
  }

  /** A pasta com os três idiomas (copiados uma vez; de novo só se o tamanho mudar numa atualização). */
  preparar() {
    if (!this.pronta) {
      this.pronta = (async () => {
        await fsp.mkdir(this.pasta, { recursive: true });
        for (const l of IDIOMAS) {
          const dados = await fsp.readFile(origemDe(l));
          const destino = path.join(this.pasta, `${l}.traineddata.gz`);
          const st = await fsp.stat(destino).catch(() => null);
          if (st && st.size === dados.length) continue;
          const tmp = destino + '.tmp';
          await fsp.writeFile(tmp, dados);
          await fsp.rename(tmp, destino);
        }
        return this.pasta;
      })().catch((e) => { this.pronta = null; throw e; });
    }
    return this.pronta;
  }

  /**
   * O texto de uma imagem: { rel } do disco C: (PNG, JPG ou BMP) ou { png } (a página de um PDF ou
   * uma imagem de outro tipo, desenhada em PNG pela tela).
   */
  async imagem(item, idioma) {
    let bytes;
    let nome = '';
    if (item && item.png) {
      bytes = Buffer.from(item.png);
    } else {
      const n = this.disco.normalizar(String((item && item.rel) || ''));
      nome = path.posix.basename(n);
      if (!TIPOS.has(path.posix.extname(n).toLowerCase())) throw new Error(tr('A imagem "{nome}" não pôde ser lida.', { nome }));
      const i = await this.disco.info(n);
      if (i.pasta || i.tamanho > MAX_IMAGEM) throw new Error(tr('"{nome}" é grande demais (o limite é de {max} MB).', { nome, max: MAX_IMAGEM / 1048576 }));
      bytes = await this.disco.ler(n);
    }
    if (bytes.length > MAX_IMAGEM) throw new Error(tr('"{nome}" é grande demais (o limite é de {max} MB).', { nome, max: MAX_IMAGEM / 1048576 }));
    const langPath = await this.preparar();
    try {
      return await this.trabalhos.executar('ocr:reconhecer', { bytes, idioma: idiomaValido(idioma), langPath }, { tempo: 5 * 60 * 1000 });
    } catch (e) {
      if (e.codigo === 'imagem') throw new Error(tr('A imagem "{nome}" não pôde ser lida.', { nome }));
      if (e.codigo === 'demorou') throw new Error(tr('O trabalho demorou demais e foi interrompido.'));
      if (e.codigo === 'caiu') throw new Error(tr('O trabalho parou no meio: o arquivo pode estar danificado ou ser grande demais.'));
      throw e;
    }
  }
}

module.exports = { Ocr, idiomaValido, IDIOMAS };
