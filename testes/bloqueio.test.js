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
  assert.deepStrictEqual(visto.bloqueio, { aoVoltar: true, temSenha: true, senhaLinux: false });
  assert.ok(!JSON.stringify(visto).includes(c.bloqueio.senha.hash));
  assert.deepStrictEqual(semSegredos({}).bloqueio, { temSenha: false, senhaLinux: false });
});

test('bloqueio: a senha do Linux basta no modo sistema só com a conta com senha (o passwd -S)', async () => {
  const { lerPasswdS, Bloqueio: B, semSegredos: sem, lerTampa, arquivoDaTampa } = require('../src/principal/bloqueio.js');
  assert.strictEqual(lerPasswdS('eduardo P 2026-10-17 0 99999 7 -1\n'), 'P');
  assert.strictEqual(lerPasswdS('eduardo NP 2026-10-17 0 99999 7 -1'), 'NP');
  assert.strictEqual(lerPasswdS('eduardo L 2026-10-17 0 99999 7 -1'), 'L');
  assert.strictEqual(lerPasswdS(''), null);
  // Fora do modo sistema, só a senha do Retro Computer bloqueia.
  const b = new B(configDeMentira());
  assert.strictEqual(await b.prepararLinux(false), false);
  assert.strictEqual(b.podeBloquear(), false);
  // A senha do Linux de mentira (as capturas): bloqueia e desbloqueia, e a errada não.
  const f = new B(configDeMentira(), { falsaLinux: 'certa' });
  assert.strictEqual(f.podeBloquear(), true);
  assert.strictEqual(await f.conferir('certa'), true);
  f.erros = 10; // sem o atraso das tentativas erradas
  const t0 = Date.now();
  assert.strictEqual(await Promise.race([f.conferir(''), new Promise((r) => setTimeout(() => r('esperou'), 50))]), 'esperou');
  assert.ok(Date.now() - t0 < 1000);
  // A tela sabe se a senha do Linux vale, sem receber nada da senha.
  assert.deepStrictEqual(sem({ bloqueio: { senha: { sal: 'a', hash: 'b' } } }, { senhaLinux: true }).bloqueio, { temSenha: true, senhaLinux: true });
  assert.deepStrictEqual(sem({}).bloqueio, { temSenha: false, senhaLinux: false });
  // A tampa do notebook.
  assert.strictEqual(lerTampa('state:      closed\n'), true);
  assert.strictEqual(lerTampa('state:      open\n'), false);
  assert.strictEqual(lerTampa(''), null);
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-tampa-'));
  assert.strictEqual(arquivoDaTampa(path.join(raiz, 'nao-existe')), null);
  fs.mkdirSync(path.join(raiz, 'LID0'));
  assert.strictEqual(arquivoDaTampa(raiz), path.join(raiz, 'LID0', 'state'));
});

test('bloqueio: a trava do sono pega uma vez só e sai ao soltar', { skip: process.platform === 'win32' }, async () => {
  const { TravaDoSono } = require('../src/principal/bloqueio.js');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  assert.strictEqual(new TravaDoSono({ existe: () => false }).pegar(), false);
  // Um systemd-inhibit de mentira: pula as opções e roda o comando (o "cat", que espera a entrada).
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-inibir-'));
  fs.writeFileSync(path.join(pasta, 'systemd-inhibit'), '#!/bin/sh\nwhile [ "${1#--}" != "$1" ]; do shift; done\nexec "$@"\n', { mode: 0o755 });
  const antes = process.env.PATH;
  process.env.PATH = `${pasta}${path.delimiter}${antes}`;
  try {
    const t = new TravaDoSono({ existe: () => true });
    assert.strictEqual(t.pegar(), true);
    const f = t.filho;
    assert.strictEqual(t.pegar(), false); // já segura
    const saiu = new Promise((r) => f.once('exit', r));
    t.soltar();
    await saiu;
    assert.strictEqual(t.filho, null);
    // Sem o Retro Computer (a entrada fechada), o "cat" termina sozinho.
    assert.strictEqual(t.pegar(), true);
    const outro = t.filho;
    const fim = new Promise((r) => outro.once('exit', (codigo) => r(codigo)));
    outro.stdin.end();
    assert.strictEqual(await fim, 0);
  } finally {
    process.env.PATH = antes;
  }
});
