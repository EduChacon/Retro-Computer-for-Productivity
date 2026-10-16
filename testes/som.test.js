// As saídas de som e os microfones: a leitura do pactl (o PulseAudio ou o PipeWire).
const test = require('node:test');
const assert = require('node:assert');
const { lerLista, lerInfo, lerCurtos, montarEstado, SomFalso } = require('../src/principal/som');

const SINKS = `Sink #47
	State: RUNNING
	Name: alsa_output.pci-0000_00_1f.3.analog-stereo
	Description: Built-in Audio Analog Stereo
	Driver: PipeWire
	Sample Specification: s32le 2ch 48000Hz
	Channel Map: front-left,front-right
	Owner Module: 4294967295
	Mute: no
	Volume: front-left: 42597 /  65% / -11.23 dB,   front-right: 42597 /  65% / -11.23 dB
	        balance 0.00
	Base Volume: 65536 / 100% / 0.00 dB
	Monitor Source: alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
	Latency: 0 usec, configured 0 usec
	Flags: HARDWARE HW_MUTE_CTRL HW_VOLUME_CTRL DECIBEL_VOLUME LATENCY
	Properties:
		alsa.card = "0"
		device.description = "Built-in Audio"
	Ports:
		analog-output-speaker: Speakers (type: Speaker, priority: 10000, availability unknown)
		analog-output-headphones: Headphones (type: Headphones, priority: 9900, not available)
	Active Port: analog-output-speaker
	Formats:
		pcm

Sink #63
	State: SUSPENDED
	Name: bluez_output.00_1B_66_A1_B2_C3.1
	Description: Fone sem fio
	Mute: yes
	Volume: front-left: 32768 /  50% / -18.06 dB,   front-right: 32768 /  50% / -18.06 dB
	Monitor Source: bluez_output.00_1B_66_A1_B2_C3.1.monitor
`;

const SOURCES = `Source #48
	State: SUSPENDED
	Name: alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
	Description: Monitor of Built-in Audio Analog Stereo
	Mute: no
	Volume: front-left: 65536 / 100% / 0.00 dB,   front-right: 65536 / 100% / 0.00 dB
	Monitor of Sink: alsa_output.pci-0000_00_1f.3.analog-stereo
	Properties:
		Description: isto não é a descrição de primeiro nível

Source #49
	State: RUNNING
	Name: alsa_input.pci-0000_00_1f.3.analog-stereo
	Description: Built-in Audio Analog Stereo
	Mute: no
	Volume: front-left: 45875 /  70% / -9.29 dB,   front-right: 45875 /  70% / -9.29 dB
	Monitor of Sink: n/a
`;

const INFO = `Server String: /run/user/1000/pulse/native
Library Protocol Version: 35
Server Name: PulseAudio (on PipeWire 1.0.5)
Default Sink: bluez_output.00_1B_66_A1_B2_C3.1
Default Source: alsa_input.pci-0000_00_1f.3.analog-stereo
Cookie: 1234:abcd
`;

test('a lista do pactl: o nome, a descrição, o volume e o mudo', () => {
  const s = lerLista(SINKS);
  assert.strictEqual(s.length, 2);
  assert.deepStrictEqual(s[0], { indice: 47, nome: 'alsa_output.pci-0000_00_1f.3.analog-stereo', descricao: 'Built-in Audio Analog Stereo', monitorDe: '', mudo: false, volume: 65 });
  assert.strictEqual(s[1].mudo, true);
  assert.strictEqual(s[1].volume, 50);
  const f = lerLista(SOURCES);
  assert.strictEqual(f[0].monitorDe, 'alsa_output.pci-0000_00_1f.3.analog-stereo');
  assert.strictEqual(f[0].descricao, 'Monitor of Built-in Audio Analog Stereo');
  assert.strictEqual(f[1].monitorDe, '');
});

test('as padrão e o que está tocando', () => {
  assert.deepStrictEqual(lerInfo(INFO), { saida: 'bluez_output.00_1B_66_A1_B2_C3.1', entrada: 'alsa_input.pci-0000_00_1f.3.analog-stereo' });
  assert.deepStrictEqual(lerCurtos('12\t47\t89\tPipeWire\tfloat32le 2ch 48000Hz\n15\t47\t90\tPipeWire\ts16le 2ch 44100Hz\n'), ['12', '15']);
  assert.deepStrictEqual(lerCurtos(''), []);
});

test('o estado para a tela: sem os monitores, com o microfone padrão', () => {
  const e = montarEstado(lerLista(SINKS), lerLista(SOURCES), lerInfo(INFO));
  assert.deepStrictEqual(e.saidas.map((x) => [x.nome, x.padrao]), [['Built-in Audio Analog Stereo', false], ['Fone sem fio', true]]);
  assert.deepStrictEqual(e.entradas.map((x) => x.id), ['alsa_input.pci-0000_00_1f.3.analog-stereo']);
  assert.deepStrictEqual(e.microfone, { nivel: 70, mudo: false });
});

test('a versão de mentira troca a saída e o microfone', async () => {
  const s = new SomFalso();
  let e = await s.escolherSaida('bluez_output.00_1B_66_A1_B2_C3.1');
  assert.strictEqual(e.saidas.find((x) => x.padrao).nome, 'Wireless Headphones');
  e = await s.microfone({ nivel: 130, mudo: true });
  assert.deepStrictEqual(e.microfone, { nivel: 100, mudo: true });
  e = await s.escolherSaida('não existe');
  assert.strictEqual(e.saidas.find((x) => x.padrao).nome, 'Wireless Headphones');
});
