'use strict';
// O bloqueio de propagandas e rastreadores do Navegador (propaganda.js): as redes conhecidas
// bloqueadas, a página principal e os sites de fora nunca, e o CSS dos espaços dos anúncios.
const test = require('node:test');
const assert = require('node:assert');
const { DOMINIOS, CSS_ESCONDER, siteDe, ehPropaganda, permitido, bloquear } = require('../src/principal/propaganda');

test('propaganda: as redes de anúncios e os rastreadores, com os subdomínios', () => {
  for (const u of [
    'https://securepubads.g.doubleclick.net/tag/js/gpt.js',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://www.google-analytics.com/analytics.js',
    'https://cdn.taboola.com/libtrc/estadao/loader.js',
    'https://widgets.outbrain.com/outbrain.js',
    'https://c.amazon-adsystem.com/aax2/apstag.js',
    'https://sb.scorecardresearch.com/beacon.js',
    'http://ib.adnxs.com/ut/v3',
    'wss://rt.example.hotjar.com/socket',
    'https://www.youtube.com/pagead/viewthroughconversion/123',
    'https://www.youtube.com/api/stats/ads?ver=2',
    'https://www.facebook.com/tr?id=1&ev=PageView',
    'https://mc.yandex.ru/metrika/tag.js',
    'https://yandex.ru/ads/system/context.js',
  ]) assert.strictEqual(ehPropaganda(u), true, u);
});

test('propaganda: o que os sites usam para funcionar fica de fora', () => {
  for (const u of [
    'https://www.google.com/search?q=retro',
    'https://www.gstatic.com/recaptcha/releases/x/recaptcha__pt_br.js',
    'https://www.googletagmanager.com/gtm.js?id=GTM-X',
    'https://imasdk.googleapis.com/js/sdkloader/ima3.js',
    'https://accounts.google.com/ServiceLogin',
    'https://connect.facebook.net/pt_BR/sdk.js',
    'https://www.youtube.com/watch?v=abc',
    'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    'https://fonts.googleapis.com/css2?family=Inter',
    'https://cdn.jsdelivr.net/npm/react@18.3.1/index.js',
    'https://esaj.tjsp.jus.br/cjsg/consultaCompleta.do',
    'https://notdoubleclick.net/x.js', // só o domínio e os subdomínios, não o nome parecido
    'https://yandex.ru/search/?text=ads',
    'https://example.com/ad/estilo.css',
    'file:///C:/doubleclick.net/x.js',
    'não é endereço',
  ]) assert.strictEqual(ehPropaganda(u), false, u);
});

test('propaganda: a página principal nunca é bloqueada', () => {
  const url = 'https://ad.doubleclick.net/ddm/clk/123';
  assert.strictEqual(bloquear({ url, tipo: 'mainFrame', pagina: '' }), false);
  assert.strictEqual(bloquear({ url, tipo: 'script', pagina: 'https://www.estadao.com.br/' }), true);
  assert.strictEqual(bloquear({ url, tipo: 'subFrame', pagina: 'https://www.estadao.com.br/' }), true);
});

test('propaganda: desligado ou com o site de fora, nada é bloqueado', () => {
  const url = 'https://cdn.taboola.com/libtrc/loader.js';
  const pagina = 'https://www.folha.uol.com.br/mercado/';
  assert.strictEqual(bloquear({ url, tipo: 'script', pagina }, { ligado: false }), false);
  assert.strictEqual(bloquear({ url, tipo: 'script', pagina }, { permitidos: ['folha.uol.com.br'] }), false);
  // O site de cima vale para os de baixo.
  assert.strictEqual(bloquear({ url, tipo: 'script', pagina }, { permitidos: ['uol.com.br'] }), false);
  // Outro site continua bloqueado; sem a página (um service worker), vale o bloqueio.
  assert.strictEqual(bloquear({ url, tipo: 'script', pagina: 'https://www.estadao.com.br/' }, { permitidos: ['folha.uol.com.br'] }), true);
  assert.strictEqual(bloquear({ url, tipo: 'xhr', pagina: '' }, { permitidos: ['folha.uol.com.br'] }), true);
});

test('propaganda: o nome do site e a lista dos de fora', () => {
  assert.strictEqual(siteDe('https://www.Estadao.com.br/politica'), 'estadao.com.br');
  assert.strictEqual(siteDe('https://m.folha.uol.com.br/'), 'm.folha.uol.com.br');
  assert.strictEqual(siteDe('nada'), '');
  assert.strictEqual(permitido('m.folha.uol.com.br', ['folha.uol.com.br']), true);
  assert.strictEqual(permitido('folha.uol.com.br', ['m.folha.uol.com.br']), false);
  assert.strictEqual(permitido('', ['']), false);
  // "com.br" sozinho não entra na conta (o laço para antes do último pedaço).
  assert.strictEqual(permitido('estadao.com.br', ['br']), false);
});

test('propaganda: a lista e o CSS', () => {
  for (const d of DOMINIOS) assert.match(d, /^[a-z0-9.-]+\.[a-z]{2,}(\/[a-z]+)?$/, d);
  assert.match(CSS_ESCONDER, /ins\.adsbygoogle/);
  assert.match(CSS_ESCONDER, /\{ display: none !important; \}\n$/);
  // O CSS não esconde as fichas de classificados ("anúncio" também é o de quem vende).
  assert.ok(!/\.anuncio\b/.test(CSS_ESCONDER));
});
