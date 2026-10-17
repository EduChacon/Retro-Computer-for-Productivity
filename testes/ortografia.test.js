'use strict';
// O corretor ortográfico (ortografia.js): os idiomas, os dicionários copiados sem internet e as palavras aceitas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const o = require('../src/principal/ortografia');

test('ortografia: os idiomas escolhidos (só os que têm dicionário) ou o da interface', () => {
  assert.deepEqual(o.idiomasDe({}, 'pt-BR'), ['pt-BR']);
  assert.deepEqual(o.idiomasDe({ idiomas: [] }, 'en'), ['en-US']);
  assert.deepEqual(o.idiomasDe(null, 'es'), ['es-ES']);
  assert.deepEqual(o.idiomasDe({ idiomas: ['en-US', 'pt-BR', 'en-US', 'xx', '__proto__'] }, 'es'), ['en-US', 'pt-BR']);
  assert.deepEqual(o.idiomasDe({ idiomas: 'pt-BR' }, 'zz'), ['pt-BR']);
});

test('ortografia: os dicionários vão para a pasta do Chromium uma vez só, inteiros', () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-orto-'));
  try {
    const copiados = o.prepararDicionarios(dados);
    assert.deepEqual(copiados.sort(), Object.values(o.DICIONARIOS).sort());
    for (const arquivo of Object.values(o.DICIONARIOS)) {
      const original = fs.readFileSync(path.join(__dirname, '..', 'src', 'principal', 'dicionarios', arquivo));
      assert.ok(original.length > 100000, arquivo);
      assert.ok(original.equals(fs.readFileSync(path.join(dados, 'Dictionaries', arquivo))), arquivo);
    }
    assert.deepEqual(o.prepararDicionarios(dados), [], 'a segunda vez não copia nada');
    assert.ok(!fs.readdirSync(path.join(dados, 'Dictionaries')).some((n) => n.endsWith('.tmp')));
  } finally {
    fs.rmSync(dados, { recursive: true, force: true });
  }
});

test('ortografia: a sessão recebe os idiomas e o endereço que não existe (nada é baixado)', () => {
  const feito = {};
  const sessao = {
    setSpellCheckerEnabled: (v) => { feito.ligada = v; },
    setSpellCheckerLanguages: (l) => { feito.idiomas = l; },
    setSpellCheckerDictionaryDownloadURL: (u) => { feito.url = u; },
  };
  assert.deepEqual(o.aplicarOrtografia(sessao, { ligada: true, idiomas: ['es-ES'] }, 'pt-BR', 'linux'), { ligada: true, idiomas: ['es-ES'] });
  assert.equal(feito.ligada, true);
  assert.deepEqual(feito.idiomas, ['es-ES']);
  assert.match(feito.url, /^https:\/\/[a-z]+\.invalid\/$/);
  const mac = {};
  o.aplicarOrtografia({ setSpellCheckerEnabled: (v) => { mac.ligada = v; }, setSpellCheckerLanguages: () => { mac.idiomas = true; }, setSpellCheckerDictionaryDownloadURL: () => { mac.url = true; } }, { ligada: false }, 'pt-BR', 'darwin');
  assert.deepEqual(mac, { ligada: false }, 'no Mac, só ligar ou desligar (o corretor é o do sistema)');
});

test('ortografia: só palavras de verdade vão para o dicionário e para a troca', () => {
  assert.ok(o.palavraValida('exceção'));
  assert.ok(!o.palavraValida('duas palavras'));
  assert.ok(!o.palavraValida(''));
  assert.ok(!o.palavraValida('a'.repeat(65)));
  assert.ok(!o.palavraValida('linha\nnova'));
  assert.ok(!o.palavraValida(42));
  assert.ok(o.trocaValida('em cima'));
  assert.ok(!o.trocaValida('com\u0007controle'));
});
