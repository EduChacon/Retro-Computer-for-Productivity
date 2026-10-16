'use strict';
// O tamanho automático dos pixels da interface (aparencia.js da área de trabalho).
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const aparencia = () => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/aparencia.js')).href);

test('o tamanho automático segue a escala do sistema sem deixar a área da tela pequena demais', async () => {
  const { pixelsAutomaticos } = await aparencia();
  // Um notebook de 1920 × 1080 a 150%: o 2 deixaria 960 × 540; fica no 1.
  assert.equal(pixelsAutomaticos({ escala: 1.5, w: 1920, h: 1080 }), 1);
  // A 100% e a 125%, o 1.
  assert.equal(pixelsAutomaticos({ escala: 1, w: 1920, h: 1080 }), 1);
  assert.equal(pixelsAutomaticos({ escala: 1.25, w: 1920, h: 1080 }), 1);
  // Um monitor de 2560 × 1440 a 150%: 1280 × 720.
  assert.equal(pixelsAutomaticos({ escala: 1.5, w: 2560, h: 1440 }), 2);
  // 4K a 150% e a 200%: 1920 × 1080; o Retina do Mac (2880 × 1800): 1440 × 900.
  assert.equal(pixelsAutomaticos({ escala: 1.5, w: 3840, h: 2160 }), 2);
  assert.equal(pixelsAutomaticos({ escala: 2, w: 3840, h: 2160 }), 2);
  assert.equal(pixelsAutomaticos({ escala: 2, w: 2880, h: 1800 }), 2);
  // 4K a 300%: o 3 deixa 1280 × 720, que ainda cabe.
  assert.equal(pixelsAutomaticos({ escala: 3, w: 3840, h: 2160 }), 3);
  // Sem saber o monitor, só a escala.
  assert.equal(pixelsAutomaticos({ escala: 2 }), 2);
});
