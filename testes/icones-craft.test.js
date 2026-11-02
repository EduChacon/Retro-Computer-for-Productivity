'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const modulo = () => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/icones-craft.js')).href);

test('Craft: desenhos próprios distintos, locais e nos dois tamanhos; próximos apps recebem monogramas', async () => {
  const { iconeCraft } = await modulo();
  for (const tam of [16, 32]) {
    const ids = ['texturecraft', 'craft-anything', 'solidcraft', 'novocraft', 'outrocraft'];
    const urls = ids.map((id) => iconeCraft('craft-auto-' + id, tam)); assert.equal(new Set(urls).size, ids.length);
    for (const [i, url] of urls.entries()) {
      assert.match(url, /^data:image\/svg\+xml,/); const svg = decodeURIComponent(url.split(',')[1]);
      assert.match(svg, new RegExp('width="' + tam + '"')); assert.match(svg, new RegExp('height="' + tam + '"'));
      assert.doesNotMatch(svg, /<script|<foreignObject|<image|href=|onload=|<text/i);
      assert.equal(url, iconeCraft('craft-auto-' + ids[i], tam));
    }
  }
});
test('Craft: o caminho de ícones recusa identificadores, tamanhos e conteúdo externos', async () => {
  const { iconeCraft } = await modulo();
  for (const id of ['programa', 'craft-auto-../invasor', 'craft-auto-a" onload="alert(1)', 'https://outro.example/icone.svg']) assert.equal(iconeCraft(id), null);
  assert.equal(iconeCraft('craft-auto-solidcraft', 128), null);
});
