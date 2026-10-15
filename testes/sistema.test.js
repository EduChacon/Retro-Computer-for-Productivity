'use strict';
// O modo sistema: quando vale, a energia de mentira dos testes e o "abrir ao entrar" do Linux.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const s = require('../src/principal/sistema-linux.js');

test('modo sistema: só no Linux, com --sistema ou RETRO_SISTEMA', () => {
  assert.strictEqual(s.ehModoSistema(['electron', '.', '--sistema'], {}, 'linux'), true);
  assert.strictEqual(s.ehModoSistema(['electron', '.'], { RETRO_SISTEMA: '1' }, 'linux'), true);
  assert.strictEqual(s.ehModoSistema(['electron', '.'], {}, 'linux'), false);
  assert.strictEqual(s.ehModoSistema(['electron', '.', '--sistema'], {}, 'win32'), false);
});

test('energia: com RETRO_ENERGIA_FALSA nada é desligado; ação desconhecida é recusada', async () => {
  const antes = process.env.RETRO_ENERGIA_FALSA;
  process.env.RETRO_ENERGIA_FALSA = '1';
  try {
    assert.deepStrictEqual(await s.energia('desligar'), { ok: true, falso: true, acao: 'desligar' });
    assert.deepStrictEqual(await s.energia('formatar'), { ok: false, erro: 'acao' });
  } finally {
    if (antes == null) delete process.env.RETRO_ENERGIA_FALSA; else process.env.RETRO_ENERGIA_FALSA = antes;
  }
});

test('abrir ao entrar (Linux): o arquivo do autostart vai e volta', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-autostart-'));
  const antes = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = pasta;
  try {
    assert.strictEqual(s.abrirAoEntrar(null, 'linux'), false);
    assert.strictEqual(await s.definirAbrirAoEntrar(null, true, 'linux'), true);
    const arq = path.join(pasta, 'autostart', 'retro-computer.desktop');
    const texto = fs.readFileSync(arq, 'utf8');
    assert.match(texto, /^\[Desktop Entry\]/);
    assert.match(texto, /NotShowIn=RetroComputer;/);
    assert.strictEqual(s.abrirAoEntrar(null, 'linux'), true);
    assert.strictEqual(await s.definirAbrirAoEntrar(null, false, 'linux'), false);
    assert.ok(!fs.existsSync(arq));
  } finally {
    if (antes == null) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = antes;
    fs.rmSync(pasta, { recursive: true, force: true });
  }
});

test('abrir ao entrar (Windows e macOS): pelo início automático do sistema', async () => {
  let ligado = false;
  const app = { getLoginItemSettings: () => ({ openAtLogin: ligado }), setLoginItemSettings: (o) => { ligado = o.openAtLogin; } };
  assert.strictEqual(await s.definirAbrirAoEntrar(app, true, 'win32'), true);
  assert.strictEqual(s.abrirAoEntrar(app, 'darwin'), true);
});
