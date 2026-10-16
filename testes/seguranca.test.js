'use strict';
// A Central de segurança: só conexões seguras no Navegador (http:// vira https://, menos os
// aparelhos da rede de casa e os sites liberados pelo usuário).
const test = require('node:test');
const assert = require('node:assert');
const { ehRedeLocal, paraHttps, Subidos } = require('../src/principal/https');

test('https: a rede de casa fica de fora', () => {
  for (const h of ['localhost', 'app.localhost', 'impressora.local', 'nas.lan', 'roteador', '192.168.0.1', '10.0.0.138', '172.16.5.4', '172.31.255.1', '127.0.0.1', '169.254.1.1', '[::1]', 'fd12:3456::1', 'casa.home.arpa']) {
    assert.strictEqual(ehRedeLocal(h), true, h);
  }
  for (const h of ['example.com', 'www.google.com', '172.32.0.1', '8.8.8.8', '192.169.0.1', 'a.local.example.com']) {
    assert.strictEqual(ehRedeLocal(h), false, h);
  }
});

test('https: a troca do endereço', () => {
  assert.strictEqual(paraHttps('http://example.com/a?b=1#c'), 'https://example.com/a?b=1#c');
  assert.strictEqual(paraHttps('http://example.com:80/'), 'https://example.com/');
  assert.strictEqual(paraHttps('http://example.com:8080/x'), 'https://example.com:8080/x');
  assert.strictEqual(paraHttps('https://example.com/'), null);
  assert.strictEqual(paraHttps('http://192.168.1.1/'), null);
  assert.strictEqual(paraHttps('ftp://example.com/'), null);
  assert.strictEqual(paraHttps('não é endereço'), null);
  // O site que o usuário escolheu abrir sem segurança fica como é.
  assert.strictEqual(paraHttps('http://Velho.example.com/pagina', new Set(['velho.example.com'])), null);
});

test('https: lembra de onde veio e percebe a volta para o http', () => {
  let t = 1000;
  const s = new Subidos({ agora: () => t });
  s.guardar('https://example.com/', 'http://example.com/');
  assert.strictEqual(s.deOnde('https://example.com/'), 'http://example.com/');
  assert.strictEqual(s.deOnde('https://outro.com/'), null);
  // O site mandou de volta para o http logo depois: voltas sem fim, o Navegador avisa.
  t += 2000;
  assert.strictEqual(s.voltou('http://example.com/'), true);
  t += 20000;
  assert.strictEqual(s.voltou('http://example.com/'), false);
  t += 60000;
  assert.strictEqual(s.deOnde('https://example.com/'), null);
});
