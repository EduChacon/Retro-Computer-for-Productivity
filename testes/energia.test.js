// As opções de energia e a data e a hora do modo sistema: as regras e a leitura das saídas.
const test = require('node:test');
const assert = require('node:assert');
const { EventEmitter } = require('node:events');
const { Energia, opcoesDe, argsDpms, lerTampa, textoTampa, tocandoSom, deveSuspender, PADRAO } = require('../src/principal/energia');
const { lerShow, fusoValido, horaValida, DataHoraFalsa } = require('../src/principal/datahora');

test('as opções: os padrões, os números arredondados e os inválidos ignorados', () => {
  assert.deepStrictEqual(opcoesDe(undefined), PADRAO);
  assert.deepStrictEqual(opcoesDe({ telaTomada: '7.6', telaBateria: -3, suspenderTomada: 99999, suspenderBateria: 'x' }), { telaTomada: 8, telaBateria: PADRAO.telaBateria, suspenderTomada: 1440, suspenderBateria: PADRAO.suspenderBateria });
});

test('o xset: apagar depois de tantos minutos, ou nunca', () => {
  assert.deepStrictEqual(argsDpms(10), [['+dpms'], ['dpms', '0', '0', '600']]);
  assert.deepStrictEqual(argsDpms(0), [['-dpms']]);
});

test('a tampa: o arquivo do logind, de ida e de volta', () => {
  assert.strictEqual(lerTampa(''), 'suspender');
  for (const a of ['suspender', 'nada', 'desligar']) assert.strictEqual(lerTampa(textoTampa(a)), a);
  assert.match(textoTampa('nada'), /^HandleLidSwitchExternalPower=ignore$/m);
  assert.match(textoTampa('desligar'), /^HandleLidSwitchDocked=ignore$/m);
});

test('suspender: só parado o bastante e sem som tocando', () => {
  const sinks = '47\talsa_output.pci.analog-stereo\tPipeWire\ts32le 2ch 48000Hz\tSUSPENDED\n63\tbluez_output.1\tPipeWire\ts16le 2ch 48000Hz\tRUNNING\n';
  assert.strictEqual(tocandoSom(sinks), true);
  assert.strictEqual(tocandoSom(sinks.replace('RUNNING', 'IDLE')), false);
  assert.strictEqual(deveSuspender({ parado: 1800, minutos: 30, tocando: false }), true);
  assert.strictEqual(deveSuspender({ parado: 1799, minutos: 30, tocando: false }), false);
  assert.strictEqual(deveSuspender({ parado: 9999, minutos: 30, tocando: true }), false);
  assert.strictEqual(deveSuspender({ parado: 9999, minutos: 0, tocando: false }), false);
});

test('a versão de mentira: a tela segue a fonte de energia e a suspensão espera o tempo da bateria', async () => {
  const pm = new EventEmitter();
  let bateria = false;
  let parado = 0;
  let suspensoes = 0;
  pm.isOnBatteryPower = () => bateria;
  pm.getSystemIdleTime = () => parado;
  const e = new Energia({ config: () => ({ energia: { telaTomada: 15, telaBateria: 5, suspenderTomada: 0, suspenderBateria: 10 } }), powerMonitor: pm, suspender: async () => { suspensoes++; }, comoAdmin: null, temBateria: async () => true, falso: true });
  await e.aplicarTela();
  assert.deepStrictEqual(e.anotado.pop(), ['xset', 'dpms', '0', '0', '900']);
  bateria = true;
  await e.aplicarTela();
  assert.deepStrictEqual(e.anotado.pop(), ['xset', 'dpms', '0', '0', '300']);
  parado = 599;
  await e.vigiar();
  assert.strictEqual(suspensoes, 0);
  parado = 600;
  await e.vigiar();
  await e.vigiar(); // a segunda vez espera (já suspendendo)
  assert.strictEqual(suspensoes, 1);
  bateria = false;
  e.suspendendo = false;
  await e.vigiar(); // na tomada, nunca
  assert.strictEqual(suspensoes, 1);
  assert.deepStrictEqual(await e.definirTampa('nada', 'errada'), { ok: false, senhaErrada: true });
  assert.deepStrictEqual(await e.definirTampa('nada', 'certa'), { ok: true });
  assert.strictEqual((await e.estado()).tampa, 'nada');
});

test('o timedatectl: o fuso, o NTP e as entradas conferidas', async () => {
  const s = 'Timezone=America/Sao_Paulo\nLocalRTC=no\nCanNTP=yes\nNTP=yes\nNTPSynchronized=no\nTimeUSec=Fri 2026-10-16 15:00:00 -03\n';
  assert.deepStrictEqual(lerShow(s), { fuso: 'America/Sao_Paulo', ntp: true, sincronizado: false, podeNtp: true });
  assert.strictEqual(fusoValido('America/Argentina/Buenos_Aires'), true);
  assert.strictEqual(fusoValido('Etc/GMT+3'), true);
  assert.strictEqual(fusoValido('../../etc/passwd'), false);
  assert.strictEqual(fusoValido('America/Sao Paulo; rm -rf'), false);
  assert.strictEqual(horaValida('2026-10-16 14:05'), true);
  assert.strictEqual(horaValida('2026-10-16 14:05:59'), true);
  assert.strictEqual(horaValida('2026-13-01 10:00'), false);
  assert.strictEqual(horaValida('amanhã'), false);
  const f = new DataHoraFalsa();
  assert.deepStrictEqual(await f.definir({ fuso: 'UTC' }, 'x'), { ok: false, senhaErrada: true });
  await f.definir({ fuso: 'UTC', ntp: false }, 'certa');
  const e = await f.estado();
  assert.strictEqual(e.fuso, 'UTC');
  assert.strictEqual(e.ntp, false);
});
