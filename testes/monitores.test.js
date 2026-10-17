'use strict';
/* As contas das duas telas em tela cheia (monitores.js). Rodar: npm test */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uniao, telasNaJanela, monitoresFalsos, spacesJuntos } = require('../src/principal/monitores.js');

test('a união cobre os monitores lado a lado, um em cima do outro e de tamanhos diferentes', () => {
  assert.deepEqual(uniao([{ x: 0, y: 0, width: 1920, height: 1080 }, { x: 1920, y: 0, width: 1280, height: 1024 }]), { x: 0, y: 0, width: 3200, height: 1080 });
  // O segundo à esquerda e mais alto.
  assert.deepEqual(uniao([{ x: 0, y: 0, width: 1440, height: 900 }, { x: -1920, y: -180, width: 1920, height: 1080 }]), { x: -1920, y: -180, width: 3360, height: 1080 });
  assert.equal(uniao([]), null);
});

test('as telas vistas de dentro da janela que cobre as duas', () => {
  const monitores = [{ x: 0, y: 0, width: 1920, height: 1080, principal: true }, { x: 1920, y: 0, width: 1280, height: 1024 }];
  const janela = uniao(monitores);
  assert.deepEqual(telasNaJanela(janela, monitores), [
    { x: 0, y: 0, w: 1920, h: 1080, principal: true },
    { x: 1920, y: 0, w: 1280, h: 1024, principal: false },
  ]);
  // Com o principal à direita e a janela começando no outro.
  const m2 = [{ x: 0, y: 0, width: 1440, height: 900, principal: true }, { x: -1920, y: -180, width: 1920, height: 1080 }];
  assert.deepEqual(telasNaJanela(uniao(m2), m2), [
    { x: 1920, y: 180, w: 1440, h: 900, principal: true },
    { x: 0, y: 0, w: 1920, h: 1080, principal: false },
  ]);
  // A escala da janela (o Windows a 150%): os pontos da página.
  assert.deepEqual(telasNaJanela({ x: 0, y: 0, width: 3000, height: 1000 }, [{ x: 0, y: 0, width: 1500, height: 1000, principal: true }, { x: 1500, y: 0, width: 1500, height: 1000 }], 1.5)[1], { x: 1000, y: 0, w: 1000, h: 1000 * (1 / 1.5), principal: false });
});

test('a janela numa tela só (ou encostando na outra) tem uma tela', () => {
  const monitores = [{ x: 0, y: 0, width: 1920, height: 1080, principal: true }, { x: 1920, y: 0, width: 1280, height: 1024 }];
  assert.equal(telasNaJanela({ x: 0, y: 0, width: 1960, height: 1080 }, monitores).length, 1);
  // Sem a principal entre as cobertas, a maior passa a ser.
  const so = telasNaJanela({ x: 1920, y: 0, width: 1280, height: 1024 }, monitores);
  assert.equal(so.length, 1);
  assert.equal(so[0].principal, true);
});

test('os monitores de mentira e os Spaces do Mac', () => {
  const m = monitoresFalsos('1024x768+0+0,1280x800+1024+0');
  assert.equal(m.length, 2);
  assert.deepEqual([m[0].principal, m[1].principal, m[1].x, m[1].width], [true, false, 1024, 1280]);
  assert.equal(monitoresFalsos('1024x768'), null);
  assert.equal(monitoresFalsos(''), null);
  assert.equal(spacesJuntos('1\n'), true);
  assert.equal(spacesJuntos('0'), false);
  assert.equal(spacesJuntos(''), false);
});
