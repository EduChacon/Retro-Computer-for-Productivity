'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Disco } = require('../src/principal/disco');
const { tiposNovos, criarDocumento } = require('../src/principal/documentos-novos');
const { extrair } = require('../src/principal/extrair-texto');

test('Novo: modelos de Office abrem no leitor real e novos arquivos não substituem existentes', async (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-novos-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const disco = new Disco(pasta); await disco.preparar();
  const tipos = tiposNovos();
  for (const tipo of tipos) {
    const r = await criarDocumento(disco, 'Meus documentos', tipo.id), b = await disco.ler(r.rel);
    assert.equal(path.extname(r.rel), '.' + tipo.ext);
    if (['docx', 'xlsx', 'pptx'].includes(tipo.ext)) { assert.equal(b.subarray(0, 2).toString(), 'PK'); assert.equal(await extrair(b, tipo.ext), ''); }
    if (tipo.ext === 'json') assert.deepEqual(JSON.parse(b.toString()), {});
  }
  const a = await criarDocumento(disco, '', 'texto'); await disco.gravar(a.rel, Buffer.from('Não substituir'));
  const criados = await Promise.all(Array.from({ length: 5 }, () => criarDocumento(disco, '', 'texto')));
  assert.equal(new Set(criados.map((r) => r.rel)).size, 5); assert.equal((await disco.ler(a.rel)).toString(), 'Não substituir');
  await assert.rejects(criarDocumento(disco, '../fora', 'texto'));
  await assert.rejects(criarDocumento(disco, '', '../../comando.exe'));
});
