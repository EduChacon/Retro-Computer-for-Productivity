'use strict';
// A senha da tela de bloqueio: só o resumo fica guardado, a atual é pedida para trocar,
// e a área de trabalho nunca recebe o resumo.
const test = require('node:test');
const assert = require('node:assert');
const { Bloqueio, resumir, confere, semSegredos } = require('../src/principal/bloqueio.js');

function configDeMentira() {
  let dados = { bloqueio: { aoVoltar: true } };
  return {
    obter: () => dados,
    definir: (parte) => {
      const b = { ...dados.bloqueio, ...(parte.bloqueio || {}) };
      if (parte.bloqueio && parte.bloqueio.senha === null) delete b.senha;
      dados = { ...dados, bloqueio: b };
      return dados;
    },
  };
}

test('bloqueio: o resumo confere só com a senha certa', async () => {
  const r = await resumir('segredo1');
  assert.ok(r.sal && r.hash && !JSON.stringify(r).includes('segredo1'));
  assert.strictEqual(await confere('segredo1', r), true);
  assert.strictEqual(await confere('segredo2', r), false);
  assert.strictEqual(await confere('qualquer', null), false);
});

test('bloqueio: criar, trocar (com a atual) e tirar a senha', async () => {
  const c = configDeMentira();
  const b = new Bloqueio(c);
  assert.strictEqual(b.temSenha(), false);
  assert.deepStrictEqual(await b.definir('', 'abc'), { ok: false, curta: true });
  assert.deepStrictEqual(await b.definir('', 'abcd1234'), { ok: true, temSenha: true });
  assert.strictEqual(await b.conferir('abcd1234'), true);
  assert.deepStrictEqual(await b.definir('errada', 'outra123'), { ok: false, senhaErrada: true });
  assert.deepStrictEqual(await b.definir('abcd1234', ''), { ok: true, temSenha: false });
  assert.strictEqual(b.temSenha(), false);
});

test('bloqueio: a área de trabalho vê só se há senha', async () => {
  const c = { bloqueio: { aoVoltar: true, senha: await resumir('x1y2z3') }, sons: true };
  const visto = semSegredos(c);
  assert.deepStrictEqual(visto.bloqueio, { aoVoltar: true, temSenha: true });
  assert.ok(!JSON.stringify(visto).includes(c.bloqueio.senha.hash));
  assert.deepStrictEqual(semSegredos({}).bloqueio, { temSenha: false });
});
