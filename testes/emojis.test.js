'use strict';
// Os emojis (ferramentas/emojis.py): a fonte Noto Color Emoji em fatias, com a licença junto, depois
// da Katica nas fontes da página, e a lista do painel.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SISTEMA = path.join(__dirname, '..', 'src', 'sistema');

test('emojis: cada fatia da fonte existe, é WOFF2 e vem com a licença OFL', () => {
  const css = fs.readFileSync(path.join(SISTEMA, 'estilo.css'), 'utf8');
  const bloco = css.slice(css.indexOf('/* emojis: início'), css.indexOf('/* emojis: fim */'));
  const fatias = [...bloco.matchAll(/font-family: 'Retro Emoji'; src: url\('([^']+)'\) format\('woff2'\);[^}]*unicode-range: ([^;]+);/g)];
  assert.ok(fatias.length >= 10, `fatias: ${fatias.length}`);
  for (const [, url, faixa] of fatias) {
    const bytes = fs.readFileSync(path.join(SISTEMA, url));
    assert.equal(bytes.subarray(0, 4).toString('latin1'), 'wOF2', url);
    assert.match(faixa, /^U\+[0-9a-f]+(-[0-9a-f]+)?(,U\+[0-9a-f]+(-[0-9a-f]+)?)*$/i, url);
  }
  const ofl = fs.readFileSync(path.join(SISTEMA, 'fontes', 'emoji', 'OFL.txt'), 'utf8');
  assert.match(ofl, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.match(ofl, /Copyright 20\d\d Google Inc\./);
});

test('emojis: a fonte dos emojis vem depois da da época (o texto fica na Katica e na Csilla)', () => {
  const css = fs.readFileSync(path.join(SISTEMA, 'estilo.css'), 'utf8');
  assert.match(css, /font: 10px\/13px 'Katica', 'Retro Emoji', sans-serif;/);
  assert.equal((css.match(/font: 10px\/13px 'Csilla', 'Retro Emoji', monospace;/g) || []).length, 2);
  assert.match(css, /span\.emoji \{[^}]*'Retro Emoji'/);
});

test('emojis: a lista do painel tem os nomes nos três idiomas e as categorias', async () => {
  const { EMOJIS, FONTE } = await import('../src/sistema/js/emojis-dados.js');
  assert.equal(FONTE, 'Retro Emoji');
  assert.ok(EMOJIS.length > 1800, `emojis: ${EMOJIS.length}`);
  const grupos = new Set();
  const vistos = new Set();
  for (const [c, g, pt, en, es] of EMOJIS) {
    assert.ok(c && pt && en && es, JSON.stringify(c));
    assert.ok(!vistos.has(c), `repetido: ${c}`);
    vistos.add(c);
    grupos.add(g);
  }
  assert.deepEqual([...grupos].sort((a, b) => a - b), [0, 1, 3, 4, 5, 6, 7, 8, 9]);
  // O emojibase põe o FE0F (a forma de emoji) em alguns, como o 👍️.
  for (const c of ['😀', '❤️', '🇧🇷', '👍']) assert.ok(vistos.has(c) || vistos.has(c + '\uFE0F'), c);
});
