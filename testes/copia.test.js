'use strict';
// A cópia de segurança do disco C:: só acrescenta e atualiza, nunca apaga na cópia.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { CopiaSeguranca, destinoValido, mudou, venceu } = require('../src/principal/copia');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'retro-copia-'));
const escrever = (p, t) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };

test('cópia: o destino fora do disco C:, e a hora da próxima', () => {
  assert.ok(destinoValido('/casa/disco', '/media/pendrive'));
  assert.ok(!destinoValido('/casa/disco', '/casa/disco/Meus documentos'));
  assert.ok(!destinoValido('/casa/disco', '/casa'));
  assert.ok(!destinoValido('/casa/disco', '/casa/disco'));
  assert.ok(!destinoValido('/casa/disco', 'relativo'));
  assert.ok(destinoValido('/casa/disco', '/casa/disco-copia'));
  const agora = Date.now();
  assert.ok(venceu(0, 'diaria', agora));
  assert.ok(!venceu(agora - 3600e3, 'diaria', agora));
  assert.ok(venceu(agora - 25 * 3600e3, 'diaria', agora));
  assert.ok(!venceu(agora - 25 * 3600e3, 'semanal', agora));
  assert.ok(mudou({ size: 1, mtimeMs: 10 }, null));
  assert.ok(!mudou({ size: 1, mtimeMs: 10 }, { size: 1, mtimeMs: 10 }));
  assert.ok(mudou({ size: 2, mtimeMs: 10 }, { size: 1, mtimeMs: 10 }));
});

test('cópia: copia tudo (também .lixeira e .versoes), depois só o que mudou, e não apaga nada na cópia', async () => {
  const origem = tmp();
  const destino = tmp();
  escrever(path.join(origem, 'Meus documentos', 'carta.txt'), 'um');
  escrever(path.join(origem, '.versoes', 'Meus documentos', 'carta.txt', 'v1.txt'), 'zero');
  escrever(path.join(origem, '.lixeira', 'x', 'velho.txt'), 'lixo');
  const c = new CopiaSeguranca({ origem: () => origem });
  let r = await c.fazer({ destino, pasta: 'Cópia' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.copiados, 3);
  const alvo = path.join(destino, 'Cópia');
  assert.strictEqual(fs.readFileSync(path.join(alvo, 'Meus documentos', 'carta.txt'), 'utf8'), 'um');
  assert.ok(fs.existsSync(path.join(alvo, '.versoes', 'Meus documentos', 'carta.txt', 'v1.txt')));
  // De novo: nada a copiar.
  r = await c.fazer({ destino, pasta: 'Cópia' });
  assert.deepStrictEqual([r.copiados, r.iguais], [0, 3]);
  // Mudou um, apagou outro: o mudado é atualizado; o apagado continua na cópia.
  fs.writeFileSync(path.join(origem, 'Meus documentos', 'carta.txt'), 'dois, maior');
  fs.rmSync(path.join(origem, '.lixeira', 'x', 'velho.txt'));
  r = await c.fazer({ destino, pasta: 'Cópia' });
  assert.strictEqual(r.copiados, 1);
  assert.strictEqual(fs.readFileSync(path.join(alvo, 'Meus documentos', 'carta.txt'), 'utf8'), 'dois, maior');
  assert.ok(fs.existsSync(path.join(alvo, '.lixeira', 'x', 'velho.txt')));
  // Nenhum arquivo provisório fica para trás.
  const sobras = [];
  const varrer = (p) => { for (const n of fs.readdirSync(p)) { const q = path.join(p, n); if (fs.statSync(q).isDirectory()) varrer(q); else if (n.endsWith('.retro-parcial')) sobras.push(q); } };
  varrer(alvo);
  assert.deepStrictEqual(sobras, []);
});

test('cópia: o destino dentro do disco C: e o destino que sumiu são recusados', async () => {
  const origem = tmp();
  escrever(path.join(origem, 'a.txt'), 'a');
  const c = new CopiaSeguranca({ origem: () => origem });
  assert.strictEqual((await c.fazer({ destino: path.join(origem, 'dentro'), pasta: 'C' })).erro, 'destino');
  assert.strictEqual((await c.fazer({ destino: path.join(os.tmpdir(), 'nao-existe-' + Date.now()), pasta: 'C' })).erro, 'semDestino');
});
