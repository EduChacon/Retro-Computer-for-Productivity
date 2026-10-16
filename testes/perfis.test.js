'use strict';
// Os vários perfis: o registro, as pastas de cada um, o disco ao lado do principal e a troca de usuário.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Perfis, PRINCIPAL, limparNome, nomeDePasta, VALIDADE_ABERTURA } = require('../src/principal/perfis.js');

const novaBase = () => fs.mkdtempSync(path.join(os.tmpdir(), 'retro-perfis-'));

test('perfis: sem registro, só o principal (o de sempre, na pasta de antes)', () => {
  const base = novaBase();
  const p = new Perfis(base);
  assert.deepEqual(p.lista(), [{ id: PRINCIPAL, nome: '' }]);
  assert.equal(p.pastaDados(PRINCIPAL), base);
  assert.deepEqual(p.inicial(), { perfil: PRINCIPAL, entrou: false, logon: false, reaberto: false });
  // Um registro estragado também vale como "só o principal".
  fs.writeFileSync(path.join(base, 'perfis.json'), '{ isso não é json');
  assert.equal(p.lista().length, 1);
});

test('perfis: os nomes (limpos, sem repetir) e as pastas (que servem em qualquer sistema)', () => {
  assert.equal(limparNome('  Ana\n  Maria  '), 'Ana Maria');
  assert.equal(limparNome('x'.repeat(80)).length, 40);
  assert.equal(nomeDePasta('Ana/Maria: "trabalho"?'), 'AnaMaria trabalho');
  assert.equal(nomeDePasta('con'), '_con');
  assert.equal(nomeDePasta('..'), 'Usuario');
  assert.equal(nomeDePasta('Ana. '), 'Ana');
  const base = novaBase();
  const p = new Perfis(base);
  const padrao = path.join(base, 'Documentos', 'Retro Computer');
  assert.deepEqual(p.criar('   ', padrao), { ok: false, erro: 'nome' });
  const ana = p.criar('Ana', padrao);
  assert.equal(ana.ok, true);
  assert.match(ana.perfil.id, /^u[0-9a-f]{8}$/);
  assert.deepEqual(p.criar('ANA', padrao), { ok: false, erro: 'repetido' });
  // A pasta de dados e o disco do perfil novo.
  assert.equal(p.pastaDados(ana.perfil.id), path.join(base, 'perfis', ana.perfil.id));
  assert.ok(fs.existsSync(p.pastaDados(ana.perfil.id)));
  assert.equal(p.discoPadrao(ana.perfil.id, padrao), path.join(base, 'Documentos', 'Retro Computer - Ana'));
  assert.equal(p.discoPadrao(PRINCIPAL, padrao), padrao);
  // Com mais de um perfil, a tela de entrada aparece (a não ser que o usuário a desligue).
  assert.deepEqual(p.inicial(), { perfil: PRINCIPAL, entrou: false, logon: true, reaberto: false });
  p.definirPerguntar(false);
  assert.equal(p.inicial().logon, false);
});

test('perfis: renomear não muda o disco; tirar não apaga nada; o disco de um perfil tirado não é reaproveitado', () => {
  const base = novaBase();
  const p = new Perfis(base);
  const padrao = path.join(base, 'Docs', 'Retro Computer');
  const ana = p.criar('Ana', padrao).perfil;
  fs.mkdirSync(p.discoPadrao(ana.id, padrao), { recursive: true });
  fs.writeFileSync(path.join(p.discoPadrao(ana.id, padrao), 'carta.txt'), 'oi');
  assert.equal(p.renomear(ana.id, 'Ana Paula').ok, true);
  assert.equal(p.perfil(ana.id).nome, 'Ana Paula');
  assert.equal(p.discoPadrao(ana.id, padrao), path.join(base, 'Docs', 'Retro Computer - Ana'));
  assert.equal(p.renomear(PRINCIPAL, 'Eduardo').ok, true);
  assert.deepEqual(p.renomear(ana.id, 'eduardo'), { ok: false, erro: 'repetido' });
  assert.deepEqual(p.renomear(ana.id, ''), { ok: false, erro: 'nome' });
  // O principal e o perfil em uso não saem.
  assert.equal(p.remover(PRINCIPAL, ana.id).ok, false);
  assert.equal(p.remover(ana.id, ana.id).ok, false);
  p.definirUltimo(ana.id);
  const r = p.remover(ana.id, PRINCIPAL);
  assert.equal(r.ok, true);
  assert.equal(p.ler().ultimo, PRINCIPAL);
  assert.ok(fs.existsSync(path.join(base, 'Docs', 'Retro Computer - Ana', 'carta.txt')));
  assert.ok(fs.existsSync(r.dados));
  // Uma Ana nova ganha outro disco (o da Ana de antes continua com os arquivos dela).
  const nova = p.criar('Ana', padrao).perfil;
  assert.equal(p.discoPadrao(nova.id, padrao), path.join(base, 'Docs', 'Retro Computer - Ana (2)'));
  assert.notEqual(nova.id, ana.id);
});

test('perfis: a troca de usuário vale uma vez só, e logo depois de pedida', () => {
  const base = novaBase();
  const p = new Perfis(base);
  const ana = p.criar('Ana', path.join(base, 'Retro Computer')).perfil;
  p.gravarAbertura({ perfil: ana.id, entrou: true });
  if (process.platform !== 'win32') assert.equal(fs.statSync(p.arquivoAbertura).mode & 0o077, 0);
  assert.deepEqual(p.inicial(), { perfil: ana.id, entrou: true, logon: false, reaberto: true });
  assert.equal(fs.existsSync(p.arquivoAbertura), false);
  // Na abertura seguinte, volta o último usado, com a tela de entrada.
  assert.deepEqual(p.inicial(), { perfil: PRINCIPAL, entrou: false, logon: true, reaberto: false });
  // O logoff: a tela de entrada, começando pelo mesmo usuário.
  p.gravarAbertura({ perfil: ana.id, logon: true });
  assert.deepEqual(p.inicial(), { perfil: ana.id, entrou: false, logon: true, reaberto: true });
  // Velha demais, ou de um perfil que não existe mais: não vale.
  const agora = Date.now();
  p.gravarAbertura({ perfil: ana.id, entrou: true }, agora - VALIDADE_ABERTURA - 1000);
  assert.equal(p.inicial(agora).entrou, false);
  p.gravarAbertura({ perfil: 'u00000000', entrou: true });
  assert.equal(p.inicial().perfil, PRINCIPAL);
});
