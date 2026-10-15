'use strict';
// O Bluetooth: a leitura do bluetoothctl (o controlador, os aparelhos, a bateria) e as
// perguntas do pareamento.
const test = require('node:test');
const assert = require('node:assert');
const bt = require('../src/principal/bluetooth.js');

test('bluetooth: o controlador, a lista e a informação de cada aparelho', () => {
  assert.deepStrictEqual(bt.lerShow('Controller 00:1A:7D:DA:71:13 (public)\n\tName: notebook\n\tAlias: notebook\n\tPowered: yes\n\tDiscovering: no\n'), { existe: true, ligado: true, procurando: false, nome: 'notebook' });
  assert.strictEqual(bt.lerShow('No default controller available\n').existe, false);
  assert.deepStrictEqual(bt.lerDevices('Device F4:73:35:12:AB:CD MX Master 3S\nDevice e4:17:d8:00:11:22 8BitDo Retro Keyboard\nlixo\n'), [
    { mac: 'F4:73:35:12:AB:CD', nome: 'MX Master 3S' }, { mac: 'E4:17:D8:00:11:22', nome: '8BitDo Retro Keyboard' },
  ]);
  const info = bt.lerInfo('Device F4:73:35:12:AB:CD (random)\n\tName: MX Master 3S\n\tAlias: MX Master 3S\n\tIcon: input-mouse\n\tPaired: yes\n\tTrusted: yes\n\tConnected: yes\n\tBattery Percentage: 0x55 (85)\n');
  assert.deepStrictEqual(info, { nome: 'MX Master 3S', tipo: 'mouse', pareado: true, conectado: true, confiavel: true, bateria: 85 });
  assert.strictEqual(bt.lerInfo('\tIcon: input-keyboard\n\tPaired: no\n').tipo, 'teclado');
  assert.strictEqual(bt.lerInfo('\tIcon: audio-headset\n').bateria, null);
});

test('bluetooth: as perguntas e o fim do pareamento', () => {
  assert.deepStrictEqual(bt.lerLinhaPareamento('\x1b[0;94m[agent]\x1b[0m Passkey: 482913'), { pergunta: 'digitar', codigo: '482913' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('[agent] Passkey: 4829'), { pergunta: 'digitar', codigo: '004829' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('[agent] Confirm passkey 123456 (yes/no): '), { pergunta: 'confirmar', codigo: '123456' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('[agent] Enter PIN code: '), { pergunta: 'pin' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('Pairing successful'), { fim: 'pareado' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('Connection successful'), { fim: 'conectado' });
  assert.deepStrictEqual(bt.lerLinhaPareamento('Failed to pair: org.bluez.Error.AuthenticationFailed'), { fim: 'falhou', erro: 'org.bluez.Error.AuthenticationFailed' });
  assert.strictEqual(bt.lerLinhaPareamento('[CHG] Device F4:73:35:12:AB:CD RSSI: -60'), null);
  assert.ok(bt.macValido('F4:73:35:12:AB:CD') && !bt.macValido('F4:73:35:12:AB') && !bt.macValido('x; rm'));
});

test('bluetooth: nada vai para o bluetoothctl sem um endereço válido', async () => {
  const b = new bt.Bluetooth({ plataforma: 'linux' });
  assert.deepStrictEqual(await b.conectar('x; rm -rf /'), { ok: false, erro: 'endereco' });
  assert.deepStrictEqual(await b.parear('nada'), { ok: false, erro: 'endereco' });
  assert.deepStrictEqual(await new bt.Bluetooth({ plataforma: 'win32' }).estado(), { existe: false, sistema: 'win32' });
});
