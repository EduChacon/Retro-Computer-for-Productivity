/*
 * O reconhecimento de texto (OCR) de uma imagem, com o tesseract.js (o Tesseract em WebAssembly), sem
 * internet: os dados dos idiomas vêm de uma pasta local (langPath). Roda no processo de trabalho
 * (trabalho-processo.js); o leitor fica pronto entre uma imagem e outra do mesmo idioma.
 */
'use strict';

let atual = null; // { idioma, leitor }

async function leitor(idioma, langPath) {
  if (atual && atual.idioma === idioma) return atual.leitor;
  if (atual) { const velho = atual.leitor; atual = null; await velho.terminate().catch(() => { }); }
  const { createWorker, OEM } = require('tesseract.js');
  const l = await createWorker(idioma.split('+'), OEM.LSTM_ONLY, {
    langPath, gzip: true, cacheMethod: 'none', logger: () => { }, errorHandler: () => { },
  });
  atual = { idioma, leitor: l };
  return l;
}

/** O texto de uma imagem (PNG, JPG ou BMP) no idioma pedido ("por", "eng", "spa" ou "por+eng"). */
async function reconhecer(bytes, idioma, langPath) {
  const l = await leitor(idioma, langPath);
  let data;
  try {
    ({ data } = await l.recognize(Buffer.from(bytes)));
  } catch (e) {
    throw Object.assign(new Error('imagem: ' + (e && e.message)), { codigo: 'imagem' });
  }
  return { texto: String(data.text || '').replace(/\n{3,}/g, '\n\n').trim(), confianca: Math.round(data.confidence || 0) };
}

module.exports = { reconhecer };
