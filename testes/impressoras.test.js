'use strict';
// As impressoras: a fila do CUPS (lpstat -o), o resumo de cada uma e os nomes aceitos.
const test = require('node:test');
const assert = require('node:assert');
const imp = require('../src/principal/impressoras.js');

test('impressoras: a fila do lpstat e o estado de cada uma', () => {
  assert.deepStrictEqual(imp.lerFila('Escritorio-12         eduardo          20480   Thu 15 Oct 2026 10:12:00 AM -03\nCasa_Epson-3  eduardo  1024  Thu 15 Oct 2026 11:00:00\nlixo\n'), [
    { id: 'Escritorio-12', impressora: 'Escritorio', usuario: 'eduardo', tamanho: 20480, quando: 'Thu 15 Oct 2026 10:12:00 AM -03' },
    { id: 'Casa_Epson-3', impressora: 'Casa_Epson', usuario: 'eduardo', tamanho: 1024, quando: 'Thu 15 Oct 2026 11:00:00' },
  ]);
  assert.deepStrictEqual(imp.resumo({ name: 'HP', displayName: 'HP Sala', description: '', isDefault: true, options: { 'printer-state': '5', 'printer-make-and-model': 'HP LaserJet', 'printer-location': 'Sala' } }),
    { nome: 'HP', rotulo: 'HP Sala', descricao: 'HP LaserJet', local: 'Sala', padrao: true, situacao: 'parada' });
  assert.strictEqual(imp.situacao({ options: { 'printer-state': '4' } }), 'imprimindo');
  assert.strictEqual(imp.situacao({}), 'pronta');
});

test('impressoras: só nomes simples vão para os comandos do sistema', async () => {
  assert.ok(imp.nomeValido('Escritorio_HP-2'));
  for (const n of ['', 'a b', 'a/b', "x'; rm -rf", 'a$b', 'a`b', 42]) assert.strictEqual(imp.nomeValido(n), false, String(n));
  const i = new imp.Impressoras({ plataforma: 'linux' });
  assert.deepStrictEqual(await i.definirPadrao('a b'), { ok: false, erro: 'nome' });
  assert.deepStrictEqual(await i.cancelar('x; rm'), { ok: false, erro: 'id' });
});
