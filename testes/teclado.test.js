'use strict';
// Os acentos no Linux como no Windows (teclado.js): a tabela do EUA internacional e a escolha da regra.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { composeWindows, modoAcentos, gravarCompose } = require('../src/principal/teclado.js');

test('teclado: a tabela faz o que o Windows faz no EUA internacional', () => {
  const t = composeWindows();
  const regra = (seq) => { const m = new RegExp('^' + seq.replace(/[<>]/g, (c) => c) + ' : (".*")$', 'm').exec(t); return m && JSON.parse(m[1]); };
  // As letras do português.
  assert.equal(regra('<dead_acute> <a>'), 'á');
  assert.equal(regra('<dead_acute> <c>'), 'ç');
  assert.equal(regra('<dead_acute> <C>'), 'Ç');
  assert.equal(regra('<dead_tilde> <o>'), 'õ');
  assert.equal(regra('<dead_circumflex> <E>'), 'Ê');
  assert.equal(regra('<dead_grave> <a>'), 'à');
  assert.equal(regra('<dead_diaeresis> <u>'), 'ü');
  // As aspas e o apóstrofo antes de uma consoante ou de um número, e os sinais sozinhos.
  assert.equal(regra('<dead_diaeresis> <B>'), '"B');
  assert.equal(regra('<dead_acute> <t>'), "'t");
  assert.equal(regra('<dead_acute> <s>'), "'s");
  assert.equal(regra('<dead_circumflex> <2>'), '^2');
  assert.equal(regra('<dead_diaeresis> <space>'), '"');
  assert.equal(regra('<dead_acute> <backslash>'), "'\\");
  assert.equal(regra('<dead_acute> <dead_acute>'), "''");
  // A tabela do idioma vem antes (a tecla Compose continua valendo).
  assert.match(t, /^include "%L"$/m);
});

test('teclado: a regra pelo layout (e o IBus, o Fcitx e o Wayland ficam como estão)', () => {
  const tem = () => true;
  assert.equal(modoAcentos({ env: {}, layout: 'us', variante: 'intl', arquivo: '/x/Compose', temModulo: tem }).modo, 'windows');
  assert.deepEqual(modoAcentos({ env: {}, layout: 'us', variante: 'intl', arquivo: '/x/Compose', temModulo: tem }).env, { GTK_IM_MODULE: 'xim', XMODIFIERS: '@im=none', XCOMPOSEFILE: '/x/Compose' });
  // O ABNT2 (o ´ e o ¨ são as teclas mortas): o cedilla basta.
  assert.equal(modoAcentos({ env: {}, layout: 'br', variante: 'abnt2', arquivo: '/x/Compose', temModulo: tem }).modo, 'cedilla');
  // Sem o módulo xim do GTK, o cedilla.
  assert.equal(modoAcentos({ env: {}, layout: 'us', variante: 'intl', arquivo: '/x/Compose', temModulo: (m) => m !== 'xim' }).modo, 'cedilla');
  for (const env of [{ GTK_IM_MODULE: 'ibus' }, { GTK_IM_MODULE: 'fcitx' }, { WAYLAND_DISPLAY: 'wayland-0' }, { XDG_SESSION_TYPE: 'wayland' }]) {
    assert.deepEqual(modoAcentos({ env, layout: 'us', variante: 'intl', arquivo: '/x/Compose', temModulo: tem }), { modo: 'sistema', env: {} }, JSON.stringify(env));
  }
  // O XIM de outro método de entrada (XMODIFIERS=@im=ibus) não é trocado: fica o cedilla.
  assert.equal(modoAcentos({ env: { XMODIFIERS: '@im=ibus' }, layout: 'us', variante: 'intl', arquivo: '/x/Compose', temModulo: tem }).modo, 'cedilla');
});

test('teclado: a tabela é gravada na pasta de dados (e só de novo quando muda)', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-teclado-'));
  const arquivo = gravarCompose(pasta);
  assert.equal(fs.readFileSync(arquivo, 'utf8'), composeWindows());
  const antes = fs.statSync(arquivo).mtimeMs;
  gravarCompose(pasta);
  assert.equal(fs.statSync(arquivo).mtimeMs, antes);
});
