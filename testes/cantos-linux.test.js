'use strict';
// Os cantos magnéticos das janelas do Linux (cantos-linux.js): as zonas, os encaixes e a leitura das ferramentas.
const test = require('node:test');
const assert = require('node:assert');
const c = require('../src/principal/cantos-linux.js');
const { lerTamanho } = require('../src/principal/janelas-linux.js');

const AREA = { x: 0, y: 0, w: 1366, h: 738 }; // um notebook com a barra de tarefas de 30 pontos embaixo

test('cantos do Linux: a zona de cada borda e de cada canto, como nas janelas do Retro Computer', () => {
  assert.strictEqual(c.zonaNaArea(0, 300, AREA), 'esq');
  assert.strictEqual(c.zonaNaArea(1365, 300, AREA), 'dir');
  assert.strictEqual(c.zonaNaArea(600, 0, AREA), 'max');
  assert.strictEqual(c.zonaNaArea(0, 0, AREA), 'no');
  assert.strictEqual(c.zonaNaArea(1365, 10, AREA), 'ne');
  assert.strictEqual(c.zonaNaArea(0, 730, AREA), 'so');
  // Abaixo da área útil (o ponteiro sobre a barra de tarefas), na borda: o canto de baixo.
  assert.strictEqual(c.zonaNaArea(1365, 760, AREA), 'se');
  assert.strictEqual(c.zonaNaArea(600, 300, AREA), null);
  assert.strictEqual(c.zonaNaArea(7, 300, AREA), null);
  // Com os pixels em 2, a borda e o canto também dobram.
  assert.strictEqual(c.zonaNaArea(12, 300, AREA, 2), 'esq');
  assert.strictEqual(c.zonaNaArea(0, 100, AREA, 2), 'no');
  assert.strictEqual(c.zonaNaArea(0, 100, null), null);
});

test('cantos do Linux: o retângulo de cada encaixe (a moldura inteira, dentro da área útil)', () => {
  assert.deepStrictEqual(c.retDaZona('esq', AREA), { x: 0, y: 0, w: 683, h: 738 });
  assert.deepStrictEqual(c.retDaZona('dir', AREA), { x: 683, y: 0, w: 683, h: 738 });
  assert.deepStrictEqual(c.retDaZona('se', AREA), { x: 683, y: 369, w: 683, h: 369 });
  assert.deepStrictEqual(c.retDaZona('max', { x: 0, y: 20, w: 1280, h: 752 }), { x: 0, y: 20, w: 1280, h: 752 });
  // Com a barra no alto (o tema Mac), a área começa embaixo dela.
  assert.deepStrictEqual(c.retDaZona('no', { x: 0, y: 20, w: 1280, h: 780 }), { x: 0, y: 20, w: 640, h: 390 });
  assert.strictEqual(c.retDaZona('outra', AREA), null);
});

test('cantos do Linux: a área do monitor do ponteiro, sem as barras', () => {
  const telas = [{ x: 0, y: 0, w: 1366, h: 768 }, { x: 1366, y: 0, w: 1920, h: 1080 }];
  const util = { x: 0, y: 0, w: 3286, h: 738 };
  assert.deepStrictEqual(c.areaDoPonto(100, 100, telas, util), { x: 0, y: 0, w: 1366, h: 738 });
  assert.deepStrictEqual(c.areaDoPonto(2000, 100, telas, util), { x: 1366, y: 0, w: 1920, h: 738 });
  assert.deepStrictEqual(c.areaDoPonto(100, 100, [], util), util);
  assert.deepStrictEqual(c.areaDoPonto(100, 100, telas, null), telas[0]);
});

test('cantos do Linux: o xev da raiz, com os eventos partidos entre os pedaços', () => {
  const vistos = [];
  const ler = c.leitorDoXev((ev) => vistos.push(ev));
  ler('ConfigureNotify event, serial 18, synthetic NO, window 0x21f,\n    event 0x21f, window 0x200179, (140,210), width 30');
  ler('4, height 227,\n    border_width 0, above 0x0, override NO\n\nMapNotify event, serial 19, synthetic NO, window 0x21f,\n    event 0x21f, window 0x0400005, override NO\n');
  ler('ConfigureNotify event, serial 20, synthetic NO, window 0x21f,\n    event 0x21f, window 0x0400005, (-12,0), width 1281, height 800,\n');
  assert.deepStrictEqual(vistos, [
    { janela: '0x200179', x: 140, y: 210, w: 304, h: 227 },
    { janela: '0x400005', x: -12, y: 0, w: 1281, h: 800 },
  ]);
});

test('cantos do Linux: o botão pelos aparelhos de apontar, o ponteiro e as janelas que encaixam', () => {
  const lista = [
    '⎡ Virtual core pointer                    \tid=2\t[master pointer  (3)]',
    '⎜   ↳ Virtual core XTEST pointer              \tid=4\t[slave  pointer  (2)]',
    '⎜   ↳ SynPS/2 Synaptics TouchPad              \tid=12\t[slave  pointer  (2)]',
    '⎣ Virtual core keyboard                   \tid=3\t[master keyboard (2)]',
    '    ↳ AT Translated Set 2 keyboard            \tid=11\t[slave  keyboard (3)]',
  ].join('\n');
  assert.deepStrictEqual(c.lerPonteiros(lista), ['4', '12']);
  assert.strictEqual(c.botaoApertado('2 classes :\nButtonClass\n\tbutton[1]=down\n\tbutton[2]=up\n'), true);
  assert.strictEqual(c.botaoApertado('ButtonClass\n\tbutton[1]=up\n'), false);
  assert.deepStrictEqual(c.lerLocal('X=1365\nY=300\nSCREEN=0\nWINDOW=4194307\n'), { x: 1365, y: 300 });
  assert.strictEqual(c.lerLocal(''), null);
  const normal = '_NET_WM_STATE(ATOM) = \n_NET_WM_WINDOW_TYPE(ATOM) = _NET_WM_WINDOW_TYPE_NORMAL\nWM_NORMAL_HINTS(WM_SIZE_HINTS):\n\t\tprogram specified minimum size: 450 by 120\n';
  assert.strictEqual(c.encaixavel(normal), true);
  // O vídeo em janela flutuante (sempre visível), uma caixa e uma janela de tamanho fixo, não.
  assert.strictEqual(c.encaixavel('_NET_WM_STATE(ATOM) = _NET_WM_STATE_ABOVE\n'), false);
  assert.strictEqual(c.encaixavel('_NET_WM_WINDOW_TYPE(ATOM) = _NET_WM_WINDOW_TYPE_DIALOG\n'), false);
  assert.strictEqual(c.encaixavel('WM_NORMAL_HINTS(WM_SIZE_HINTS):\n\t\tprogram specified minimum size: 300 by 200\n\t\tprogram specified maximum size: 300 by 200\n'), false);
  assert.deepStrictEqual(lerTamanho('  Absolute upper-left X:  0\n  Width: 640\n  Height: 751\n'), { w: 640, h: 751 });
  assert.strictEqual(lerTamanho(''), null);
});
