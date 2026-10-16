// As várias telas do modo sistema: a leitura do xrandr e os comandos de cada arranjo.
const test = require('node:test');
const assert = require('node:assert');
const { lerTodas, arranjoDe, comandoArranjo } = require('../src/principal/tela');

const Q = `Screen 0: minimum 8 x 8, current 3360 x 1080, maximum 32767 x 32767
eDP-1 connected primary 1440x900+0+0 (normal left inverted right x axis y axis) 300mm x 190mm
   1440x900      60.00*+
   1280x800      59.81
   1024x768      60.00
HDMI-1 connected 1920x1080+1440+0 (normal left inverted right x axis y axis) 527mm x 296mm
   1920x1080     60.00*+  50.00
   1280x800      59.91
   1024x768      60.00
DP-1 disconnected (normal left inverted right x axis y axis)
`;

test('as telas ligadas, com a posição, e o arranjo de agora', () => {
  const telas = lerTodas(Q);
  assert.deepStrictEqual(telas.map((x) => [x.saida, x.principal, x.ligada, x.x, x.w]), [['eDP-1', true, true, 0, 1440], ['HDMI-1', false, true, 1440, 1920]]);
  assert.strictEqual(arranjoDe(telas), 'estender');
  assert.strictEqual(arranjoDe(lerTodas(Q.replace('1920x1080+1440+0', '1280x800+0+0'))), 'duplicar');
  assert.strictEqual(arranjoDe(lerTodas(Q.replace('HDMI-1 connected 1920x1080+1440+0', 'HDMI-1 connected'))), 'so:eDP-1');
  assert.strictEqual(arranjoDe([telas[0]]), null);
});

test('os comandos: estender à direita, duplicar no maior modo comum, uma tela só', () => {
  const telas = lerTodas(Q);
  assert.deepStrictEqual(comandoArranjo('estender', telas), ['--output', 'eDP-1', '--auto', '--primary', '--pos', '0x0', '--output', 'HDMI-1', '--auto', '--right-of', 'eDP-1']);
  assert.deepStrictEqual(comandoArranjo('duplicar', telas), ['--output', 'eDP-1', '--mode', '1280x800', '--primary', '--pos', '0x0', '--output', 'HDMI-1', '--mode', '1280x800', '--same-as', 'eDP-1']);
  assert.deepStrictEqual(comandoArranjo('so:HDMI-1', telas), ['--output', 'HDMI-1', '--auto', '--primary', '--pos', '0x0', '--output', 'eDP-1', '--off']);
  assert.strictEqual(comandoArranjo('so:VGA-9', telas), null);
  assert.strictEqual(comandoArranjo('estender', [telas[0]]), null);
  assert.strictEqual(comandoArranjo('estender', [{ ...telas[0], saida: 'eDP-1; reboot' }, telas[1]]), null);
});
