'use strict';
// O mouse e o touchpad do modo sistema: a leitura do xinput, o que mudar em cada aparelho e
// as escolhas que voltam a cada abertura (também nos aparelhos ligados depois).
const test = require('node:test');
const assert = require('node:assert');
const { lerLista, lerPropriedades, aparelhoDe, ajustesPara, limparEscolhas, MouseFalso, PROPS } = require('../src/principal/mouse');

// A saída de verdade do xinput num notebook com um mouse sem fio (libinput 1.25).
const LISTA = `⎡ Virtual core pointer                    \tid=2\t[master pointer  (3)]
⎜   ↳ Virtual core XTEST pointer              \tid=4\t[slave  pointer  (2)]
⎜   ↳ Logitech Wireless Mouse PID:4038        \tid=11\t[slave  pointer  (2)]
⎜   ↳ ELAN0718:00 04F3:30FD Touchpad          \tid=13\t[slave  pointer  (2)]
⎣ Virtual core keyboard                   \tid=3\t[master keyboard (2)]
    ↳ Virtual core XTEST keyboard             \tid=5\t[slave  keyboard (3)]
    ↳ AT Translated Set 2 keyboard            \tid=14\t[slave  keyboard (3)]
∼ Wacom Pen                                  \tid=20\t[floating slave]
`;

const TOUCHPAD = `Device 'ELAN0718:00 04F3:30FD Touchpad':
\tDevice Enabled (147):\t1
\tCoordinate Transformation Matrix (149):\t1.000000, 0.000000, 0.000000, 0.000000, 1.000000, 0.000000, 0.000000, 0.000000, 1.000000
\tlibinput Tapping Enabled (302):\t0
\tlibinput Tapping Enabled Default (303):\t0
\tlibinput Natural Scrolling Enabled (284):\t0
\tlibinput Natural Scrolling Enabled Default (285):\t0
\tlibinput Disable While Typing Enabled (318):\t1
\tlibinput Scroll Methods Available (288):\t1, 1, 0
\tlibinput Scroll Method Enabled (289):\t1, 0, 0
\tlibinput Click Methods Available (292):\t1, 1
\tlibinput Click Method Enabled (293):\t1, 0
\tlibinput Accel Speed (297):\t0.000000
\tlibinput Accel Speed Default (298):\t0.000000
\tlibinput Accel Profiles Available (299):\t1, 1, 1
\tlibinput Accel Profile Enabled (300):\t1, 0, 0
\tlibinput Left Handed Enabled (301):\t0
\tlibinput Send Events Modes Available (269):\t1, 1
\tlibinput Send Events Mode Enabled (270):\t0, 0
\tDevice Node (271):\t"/dev/input/event6"
`;

const MOUSE = `Device 'Logitech Wireless Mouse PID:4038':
\tDevice Enabled (147):\t1
\tlibinput Natural Scrolling Enabled (284):\t0
\tlibinput Scroll Methods Available (288):\t0, 0, 1
\tlibinput Scroll Method Enabled (289):\t0, 0, 0
\tlibinput Accel Speed (297):\t-0.250000
\tlibinput Accel Profiles Available (299):\t1, 1
\tlibinput Accel Profile Enabled (300):\t0, 1
\tlibinput Left Handed Enabled (301):\t0
\tlibinput Send Events Modes Available (269):\t1, 0
\tlibinput Send Events Mode Enabled (270):\t0, 0
`;

test('mouse: a lista do xinput tem só os aparelhos de apontar de verdade', () => {
  assert.deepStrictEqual(lerLista(LISTA), [{ id: 11, nome: 'Logitech Wireless Mouse PID:4038' }, { id: 13, nome: 'ELAN0718:00 04F3:30FD Touchpad' }]);
});

test('mouse: as propriedades viram valores, e o tipo vem do tocar para clicar', () => {
  const p = lerPropriedades(TOUCHPAD);
  assert.deepStrictEqual(p.get(PROPS.rolagens), [1, 1, 0]);
  assert.deepStrictEqual(p.get('Device Node'), ['"/dev/input/event6"']);
  const t = aparelhoDe(p);
  assert.strictEqual(t.tipo, 'touchpad');
  assert.deepStrictEqual(t.valores, { velocidade: 0, aceleracao: true, natural: false, canhoto: false, tocar: false, digitando: true, doisDedos: true, cliqueDedos: false, comMouse: false });
  assert.ok(t.pode.tocar && t.pode.doisDedos && t.pode.cliqueDedos && t.pode.comMouse && t.pode.aceleracao);
  const m = aparelhoDe(lerPropriedades(MOUSE));
  assert.strictEqual(m.tipo, 'mouse');
  assert.strictEqual(m.valores.velocidade, -0.25);
  assert.strictEqual(m.valores.aceleracao, false);
  assert.ok(!m.pode.tocar && !m.pode.doisDedos && !m.pode.comMouse);
  // Sem o libinput (o controlador synaptics antigo, os aparelhos do Xvfb), nada a ajustar.
  assert.strictEqual(aparelhoDe(lerPropriedades("Device 'Xvfb mouse':\n\tDevice Enabled (112):\t1\n")), null);
});

test('mouse: só muda o que é diferente, com o número de campos de cada propriedade', () => {
  const t = aparelhoDe(lerPropriedades(TOUCHPAD));
  const m = aparelhoDe(lerPropriedades(MOUSE));
  const escolhas = { canhoto: true, mouse: { velocidade: 0.5, aceleracao: true, natural: false }, touchpad: { velocidade: 0, tocar: true, doisDedos: false, cliqueDedos: true, comMouse: true, aceleracao: true } };
  assert.deepStrictEqual(ajustesPara(m, escolhas), [
    [PROPS.velocidade, ['0.50']], [PROPS.perfil, ['1', '0']], [PROPS.canhoto, ['1']],
  ]);
  assert.deepStrictEqual(ajustesPara(t, escolhas), [
    [PROPS.canhoto, ['1']], [PROPS.tocar, ['1']], [PROPS.rolagem, ['0', '1', '0']], [PROPS.clique, ['0', '1']], [PROPS.evento, ['0', '1']],
  ]);
  // O que o aparelho não tem fica de fora (o mouse não desliga com outro mouse ligado).
  assert.deepStrictEqual(ajustesPara(m, { mouse: { comMouse: true, tocar: true } }), []);
  assert.deepStrictEqual(ajustesPara(null, escolhas), []);
});

test('mouse: as escolhas que chegam da área de trabalho ficam nos limites', () => {
  assert.deepStrictEqual(limparEscolhas({ canhoto: 'sim', mouse: { velocidade: 7, natural: true, '__proto__': 1 }, touchpad: { tocar: false, velocidade: NaN, outra: true } }),
    { mouse: { velocidade: 1, natural: true }, touchpad: { tocar: false } });
  assert.deepStrictEqual(limparEscolhas(null), { mouse: {}, touchpad: {} });
});

test('mouse: a versão de mentira lê e ajusta pelo mesmo caminho, e o aparelho novo recebe as escolhas', async () => {
  const f = new MouseFalso({ sistema: true });
  const e = await f.estado();
  assert.strictEqual(e.disponivel, true);
  assert.deepStrictEqual(e.aparelhos.map((a) => a.tipo), ['mouse', 'touchpad']);
  assert.deepStrictEqual(await f.aplicar({ canhoto: true, mouse: { velocidade: -0.3 }, touchpad: { tocar: false } }), { ok: true });
  const depois = await f.estado();
  assert.strictEqual(depois.aparelhos[0].valores.velocidade, -0.3);
  assert.strictEqual(depois.aparelhos[1].valores.tocar, false);
  assert.ok(depois.aparelhos.every((a) => a.valores.canhoto));
  // De novo, nada muda (não há o que ajustar).
  f.feitos.length = 0;
  await f.aplicar({ canhoto: true, mouse: { velocidade: -0.3 }, touchpad: { tocar: false } });
  assert.deepStrictEqual(f.feitos, []);
  // Um mouse ligado depois: só ele recebe as escolhas.
  f.props[15] = { nome: 'Outro mouse', p: { ...f.props[10].p, [PROPS.canhoto]: [0], [PROPS.velocidade]: [0] } };
  await f.aplicar({ canhoto: true, mouse: { velocidade: -0.3 } }, [15]);
  assert.deepStrictEqual(f.feitos.map((x) => x[0]), [15, 15]);
});
