'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { acaoDaTecla, GLOBAIS } = require('../src/principal/atalhos');

const tecla = (key, mods = {}, code) => ({ type: 'keyDown', key, code: code || '', alt: false, control: false, shift: false, meta: false, ...mods });

test('atalhos: Alt+F4, Alt+Tab e Alt+Esc em qualquer sistema', () => {
  for (const plataforma of ['linux', 'win32', 'darwin']) {
    assert.strictEqual(acaoDaTecla(tecla('F4', { alt: true }), { plataforma }), 'fechar-janela');
    assert.strictEqual(acaoDaTecla(tecla('Tab', { alt: true }), { plataforma }), 'alternar');
    assert.strictEqual(acaoDaTecla(tecla('Tab', { alt: true, shift: true }), { plataforma }), 'alternar-volta');
    assert.strictEqual(acaoDaTecla(tecla('Escape', { alt: true }), { plataforma }), 'alternar-cancelar');
  }
  // Ctrl+Alt+F4 e o Tab sozinho ficam com quem estiver na frente.
  assert.strictEqual(acaoDaTecla(tecla('F4', { alt: true, control: true }), { plataforma: 'linux' }), null);
  assert.strictEqual(acaoDaTecla(tecla('Tab'), { plataforma: 'linux' }), null);
  assert.strictEqual(acaoDaTecla({ ...tecla('F4', { alt: true }), type: 'keyUp' }), null);
});

test('atalhos: a tecla do logotipo com letras, números e setas', () => {
  const p = { plataforma: 'linux' };
  assert.strictEqual(acaoDaTecla(tecla('e', { meta: true }), p), 'explorador');
  assert.strictEqual(acaoDaTecla(tecla('E', { meta: true }), p), 'explorador');
  assert.strictEqual(acaoDaTecla(tecla('d', { meta: true }), p), 'area-de-trabalho');
  assert.strictEqual(acaoDaTecla(tecla('l', { meta: true }), p), 'bloquear');
  assert.strictEqual(acaoDaTecla(tecla('v', { meta: true }), p), 'area-transferencia');
  assert.strictEqual(acaoDaTecla(tecla('S', { meta: true, shift: true }), p), 'captura-regiao');
  assert.strictEqual(acaoDaTecla(tecla('3', { meta: true }, 'Digit3'), p), 'fixado:3');
  // Num teclado francês, o 3 sem Shift é ": o número vem do código da tecla.
  assert.strictEqual(acaoDaTecla(tecla('"', { meta: true }, 'Digit3'), p), 'fixado:3');
  assert.strictEqual(acaoDaTecla(tecla('ArrowLeft', { meta: true }), p), 'encaixe:ArrowLeft');
  assert.strictEqual(acaoDaTecla(tecla('ArrowDown', { meta: true }), p), 'encaixe:ArrowDown');
  // Com Ctrl ou Alt junto, não é atalho do logotipo.
  assert.strictEqual(acaoDaTecla(tecla('e', { meta: true, control: true }), p), null);
  assert.strictEqual(acaoDaTecla(tecla('x', { meta: true }), p), null);
});

test('atalhos: no Mac, a tecla do logotipo é o Cmd dos programas', () => {
  assert.strictEqual(acaoDaTecla(tecla('e', { meta: true }), { plataforma: 'darwin' }), null);
  assert.strictEqual(acaoDaTecla(tecla('ArrowLeft', { meta: true }), { plataforma: 'darwin' }), null);
  assert.strictEqual(acaoDaTecla(tecla('e', { meta: true }), { plataforma: 'win32' }), 'explorador');
});

test('atalhos: os globais do modo sistema usam as mesmas ações', () => {
  const acoes = new Map(GLOBAIS);
  assert.strictEqual(acoes.get('Alt+Tab'), 'alternar');
  assert.strictEqual(acoes.get('Super+E'), 'explorador');
  assert.strictEqual(acoes.get('Super+Left'), 'encaixe:ArrowLeft');
  assert.strictEqual(acoes.get('Super+9'), 'fixado:9');
  // Nenhuma tecla repetida.
  assert.strictEqual(new Set(GLOBAIS.map(([k]) => k)).size, GLOBAIS.length);
});
