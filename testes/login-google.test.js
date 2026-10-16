'use strict';
// O login do Google no Navegador: os dois jeitos de se apresentar e a troca quando o Google recusa.
const test = require('node:test');
const assert = require('node:assert');
const g = require('../src/principal/login-google.js');

test('login do Google: a página de recusa e as de login', () => {
  assert.ok(g.RECUSADO.test('https://accounts.google.com/v3/signin/rejected?continue=x'));
  assert.ok(g.RECUSADO.test('https://accounts.google.com/signin/rejected'));
  assert.ok(!g.RECUSADO.test('https://accounts.google.com/v3/signin/identifier?flowName=GlifWebSignIn'));
  assert.ok(!g.RECUSADO.test('https://www.google.com/search?q=rejected'));
  assert.ok(g.LOGIN_GOOGLE.test('https://accounts.google.com/ServiceLogin'));
  assert.ok(!g.LOGIN_GOOGLE.test('https://mail.google.com/'));
});

test('login do Google: o jeito do Firefox, sem as client hints', () => {
  const cab = g.cabecalhosLogin({ 'User-Agent': 'x Electron/44', 'sec-ch-ua': '"Chromium";v="152"', 'sec-ch-ua-platform': '"Windows"', Accept: '*/*' }, 'firefox', { versao: '152.0.7000.50', plataforma: 'win32', arq: 'x64' });
  assert.deepStrictEqual(cab, { Accept: '*/*', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0' });
  assert.match(g.scriptLogin('firefox', '152.0.7000.50'), /userAgentData', \{ get: \(\) => undefined/);
});

test('login do Google: o jeito do Chrome, com a marca dele e a mesma versão do Chromium', () => {
  const cab = g.cabecalhosLogin({ 'user-agent': 'x Electron/44', 'sec-ch-ua': '"Chromium";v="152"', 'sec-ch-ua-full-version-list': '"Chromium";v="152.0.7000.50"', 'sec-ch-ua-mobile': '?0' }, 'chrome', { versao: '152.0.7000.50', plataforma: 'darwin' });
  assert.strictEqual(cab['User-Agent'], 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  assert.strictEqual(cab['user-agent'], undefined);
  assert.strictEqual(cab['sec-ch-ua'], '"Chromium";v="152", "Not?A_Brand";v="24", "Google Chrome";v="152"');
  assert.strictEqual(cab['sec-ch-ua-full-version-list'], '"Chromium";v="152.0.7000.50", "Not?A_Brand";v="24.0.0.0", "Google Chrome";v="152.0.7000.50"');
  assert.strictEqual(cab['sec-ch-ua-mobile'], '?0');
  assert.strictEqual(g.agenteChrome('152.0.7000.50', 'linux'), 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36');
  // A regra das marcas é a do Chromium: a do Electron 44 (Chromium 152) é a que o Navegador manda por si.
  assert.deepStrictEqual(g.marcasChromium('152.0.7977.149'), [{ brand: 'Not?A_Brand', version: '24' }, { brand: 'Chromium', version: '152' }]);
  // O roteiro da página é JavaScript válido.
  assert.doesNotThrow(() => new Function(g.scriptLogin('chrome', '152.0.7000.50')));
});

test('login do Google: recusado, o outro jeito do começo; recusado nos dois, para', () => {
  const f = new g.FluxoLogin();
  f.navegou('https://mail.google.com/');
  f.navegou('https://accounts.google.com/ServiceLogin?service=mail');
  f.navegou('https://accounts.google.com/v3/signin/identifier');
  assert.strictEqual(f.inicio, 'https://accounts.google.com/ServiceLogin?service=mail');
  assert.strictEqual(f.recusado('firefox'), 'chrome');
  f.navegou('https://accounts.google.com/ServiceLogin?service=mail');
  assert.strictEqual(f.recusado('chrome'), null);
  // Saindo do login, recomeça a conta.
  f.navegou('https://www.google.com/');
  assert.strictEqual(f.inicio, null);
  assert.strictEqual(g.modoValido('outro'), 'firefox');
  assert.strictEqual(g.outroModo('chrome'), 'firefox');
});
