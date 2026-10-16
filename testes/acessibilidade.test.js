// A acessibilidade: o xkbset (as teclas de aderência e as do mouse) e as teclas da lupa.
const test = require('node:test');
const assert = require('node:assert');
const { lerXkbset, comandosXkbset, AcessibilidadeLinux } = require('../src/principal/acessibilidade');
const { acaoDaTecla } = require('../src/principal/atalhos');

const Q = `Audible Bell = On
Mouse-Keys = On
Mouse-Keys Default Button = 1
Accessibility Features (AccessX) = Off
Sticky-Keys = Off
Two Keys Mask = On
Latch to Lock Mask = On
`;

test('o xkbset: ler o que está ligado e os comandos de cada escolha', () => {
  assert.deepStrictEqual(lerXkbset(Q), { aderencia: false, teclasMouse: true });
  assert.deepStrictEqual(lerXkbset(Q.replace('Sticky-Keys = Off', 'Sticky-Keys = On')), { aderencia: true, teclasMouse: true });
  assert.deepStrictEqual(lerXkbset(''), { aderencia: false, teclasMouse: false });
  assert.deepStrictEqual(comandosXkbset({ aderencia: true, teclasMouse: false }), [['sticky', '-twokey', 'latchlock'], ['-m'], ['exp', '=sticky', '=mousekeys']]);
  assert.deepStrictEqual(comandosXkbset({ aderencia: false, teclasMouse: true })[0], ['-sticky']);
});

test('a versão de mentira guarda as escolhas', async () => {
  const a = new AcessibilidadeLinux({ falso: true });
  assert.deepStrictEqual(await a.estado(), { disponivel: true, aderencia: false, teclasMouse: false });
  await a.aplicar({ aderencia: 1, teclasMouse: 0 });
  assert.deepStrictEqual(await a.estado(), { disponivel: true, aderencia: true, teclasMouse: false });
});

test('a lupa: logotipo + "+" (com ou sem Shift), "-" e Esc', () => {
  const t = (o) => acaoDaTecla({ type: 'keyDown', meta: true, ...o }, { plataforma: 'linux' });
  assert.strictEqual(t({ key: '=', code: 'Equal' }), 'lupa+');
  assert.strictEqual(t({ key: '+', code: 'Equal', shift: true }), 'lupa+');
  assert.strictEqual(t({ key: '+', code: 'NumpadAdd' }), 'lupa+');
  assert.strictEqual(t({ key: '-', code: 'Minus' }), 'lupa-');
  assert.strictEqual(t({ key: 'Escape', code: 'Escape' }), 'lupa-sair');
  // Sem o logotipo, nada.
  assert.strictEqual(acaoDaTecla({ type: 'keyDown', key: '=', code: 'Equal' }, { plataforma: 'linux' }), null);
});
