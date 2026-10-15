'use strict';
/* Os idiomas: todo texto da interface tem tradução em inglês e em espanhol. Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { conferir, IDIOMAS } = require('../ferramentas/textos.js');
const idioma = require('../src/principal/idioma.js');

const { chaves, r } = conferir();

test('acha os textos do código', () => {
  assert.ok(chaves.size > 400, `só ${chaves.size} textos`);
  assert.ok(chaves.has('Meu computador'));
  assert.ok(chaves.has('O nome "{nome}" não é válido.'));
});

for (const cod of IDIOMAS) {
  test(`${cod}: nenhum texto sem tradução`, () => {
    assert.deepEqual(r[cod].faltam, [], `faltam em ${cod}.json (rode node ferramentas/textos.js)`);
  });
  test(`${cod}: nenhuma tradução sobrando`, () => {
    assert.deepEqual(r[cod].sobram, []);
  });
  test(`${cod}: as {variáveis} são as mesmas da chave`, () => {
    assert.deepEqual(r[cod].variaveis, []);
  });
}

test('o catálogo dos programas tem os três idiomas', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'catalogo', 'programas.json'), 'utf8'));
  for (const p of cat.programas) {
    for (const campo of ['categoria', 'descricao']) {
      for (const cod of idioma.CODIGOS) assert.ok(p[campo][cod], `${p.id}.${campo}.${cod}`);
    }
  }
});

test('escolhe o idioma pelo sistema quando é automático', () => {
  assert.equal(idioma.resolver('auto', 'pt-BR'), 'pt-BR');
  assert.equal(idioma.resolver('auto', 'pt-PT'), 'pt-BR');
  assert.equal(idioma.resolver('auto', 'es-419'), 'es');
  assert.equal(idioma.resolver('auto', 'de-DE'), 'en');
  assert.equal(idioma.resolver('es', 'pt-BR'), 'es');
});

test('traduz no processo principal, com as {variáveis}', () => {
  try {
    idioma.definir('en');
    assert.equal(idioma.tr('O nome "{nome}" não é válido.', { nome: 'a/b' }), 'The name "a/b" is not valid.');
    idioma.definir('es');
    assert.equal(idioma.tr('Lixeira'), 'Papelera');
    assert.equal(idioma.tr('texto que não existe'), 'texto que não existe');
  } finally {
    idioma.definir('pt-BR');
  }
  assert.equal(idioma.tr('Lixeira'), 'Lixeira');
});

test('as pastas do disco têm nome em cada idioma', () => {
  for (const cod of idioma.CODIGOS) {
    const p = idioma.PASTAS[cod];
    assert.ok(p.documentos && p.mesa && p.recebidos && p.leiame, cod);
  }
});
