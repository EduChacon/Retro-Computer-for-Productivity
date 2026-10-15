'use strict';
// A bandeja do lado do computador: a leitura das saídas do wpctl, pactl, amixer, osascript,
// nmcli e netsh; no Windows, o PowerShell do volume tem que compilar e responder.
const test = require('node:test');
const assert = require('node:assert');
const b = require('../src/principal/bandeja.js');

test('volume: wpctl, pactl, amixer e osascript', () => {
  assert.deepStrictEqual(b.lerWpctl('Volume: 0.40\n'), { nivel: 40, mudo: false });
  assert.deepStrictEqual(b.lerWpctl('Volume: 1.00 [MUTED]\n'), { nivel: 100, mudo: true });
  assert.strictEqual(b.lerWpctl('erro'), null);
  assert.deepStrictEqual(b.lerPactl('Volume: front-left: 26214 /  40% / -23.88 dB,   front-right: 26214 /  40% / -23.88 dB\n        balance 0.00', 'Mute: no'), { nivel: 40, mudo: false });
  assert.deepStrictEqual(b.lerPactl('Volume: mono: 65536 / 100% / 0.00 dB', 'Mute: yes'), { nivel: 100, mudo: true });
  assert.deepStrictEqual(b.lerAmixer("Simple mixer control 'Master',0\n  Mono: Playback 40 [63%] [-15.00dB] [on]\n"), { nivel: 63, mudo: false });
  assert.deepStrictEqual(b.lerAmixer('  Front Left: Playback 0 [0%] [-inf] [off]'), { nivel: 0, mudo: true });
  assert.deepStrictEqual(b.lerMac('output volume:50, input volume:75, alert volume:100, output muted:false'), { nivel: 50, mudo: false });
  assert.strictEqual(b.lerMac('output volume:missing value, output muted:missing value'), null);
});

test('rede: os campos do nmcli, com dois-pontos e barras dentro dos nomes', () => {
  assert.deepStrictEqual(b.camposNmcli('*:Casa\\: 5G:80:WPA2'), ['*', 'Casa: 5G', '80', 'WPA2']);
  assert.deepStrictEqual(b.camposNmcli(' :A\\\\B::'), [' ', 'A\\B', '', '']);
  const d = b.lerDispositivos('wlan0:wifi:connected:Casa\neth0:ethernet:unavailable:\nlo:loopback:connected (externally):lo\n');
  assert.deepStrictEqual(d[0], { dispositivo: 'wlan0', tipo: 'wifi', estado: 'connected', conexao: 'Casa' });
  assert.strictEqual(d[1].conexao, '');
});

test('rede: a lista do Wi-Fi junta os pontos de acesso do mesmo nome e põe a rede em uso primeiro', () => {
  const r = b.lerRedesWifi([
    ' :Vizinho:90:WPA2',
    ' :Casa:40:WPA1 WPA2',
    '*:Casa:70:WPA1 WPA2',
    ' ::55:WPA2',
    ' :Café Aberto:30:',
    ' :Biblioteca:30:--',
  ].join('\n'));
  assert.deepStrictEqual(r.map((x) => x.ssid), ['Casa', 'Vizinho', 'Biblioteca', 'Café Aberto']);
  assert.strictEqual(r[0].emUso, true);
  assert.strictEqual(r[0].sinal, 70);
  assert.strictEqual(r[0].protegida, true);
  assert.strictEqual(r.find((x) => x.ssid === 'Café Aberto').protegida, false);
  assert.strictEqual(r.find((x) => x.ssid === 'Biblioteca').protegida, false);
});

test('rede: netsh em qualquer idioma do Windows', () => {
  const pt = 'Há 1 interface no sistema:\n\n    Nome                   : Wi-Fi\n    Estado                 : conectado\n    SSID                   : Casa\n    BSSID                  : aa:bb:cc:dd:ee:ff\n    Tipo de rádio          : 802.11ac\n    Sinal                  : 87%\n    Perfil                 : Casa\n';
  assert.deepStrictEqual(b.lerNetsh(pt), { ssid: 'Casa', sinal: 87 });
  assert.strictEqual(b.lerNetsh('    Name                   : Wi-Fi\n    State                  : disconnected\n'), null);
});

test('rede: a mensagem de erro do nmcli', () => {
  assert.strictEqual(b.erroCurto({ saida: 'Error: Connection activation failed: Secrets were required, but not provided.\n' }), 'Connection activation failed: Secrets were required, but not provided.');
});

test('volume no Windows: o PowerShell compila a interface de áudio e responde', { skip: process.platform !== 'win32' }, async () => {
  const v = new b.VolumeWindows();
  await v.abrir();
  // Sem placa de som (as máquinas do GitHub), a resposta é um erro do Windows, mas veio.
  const r = await v.pedir('ler').then((x) => ({ ok: true, ...x }), (e) => ({ ok: false, erro: e.message }));
  if (r.ok) assert.ok(r.nivel >= 0 && r.nivel <= 100);
  else assert.notStrictEqual(r.erro, 'fechado');
  v.fechar();
});

test('aparelhos sem fio: a bateria do mouse (com a porcentagem ou só o nível)', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-power-'));
  const poe = (n, dados) => { fs.mkdirSync(path.join(raiz, n)); for (const [k, v] of Object.entries(dados)) fs.writeFileSync(path.join(raiz, n, k), v + '\n'); };
  poe('BAT0', { type: 'Battery', scope: 'System', capacity: '57' });
  poe('hidpp_battery_0', { type: 'Battery', scope: 'Device', model_name: 'MX Master 3S', capacity: '80', status: 'Discharging' });
  poe('hidpp_battery_1', { type: 'Battery', scope: 'Device', model_name: 'MX Keys', capacity_level: 'Low', status: 'Charging' });
  poe('AC', { type: 'Mains' });
  const l = b.lerAparelhos(raiz).sort((x, y) => x.nome.localeCompare(y.nome));
  assert.deepStrictEqual(l, [
    { nome: 'MX Keys', nivel: 20, carregando: true },
    { nome: 'MX Master 3S', nivel: 80, carregando: false },
  ]);
  fs.rmSync(raiz, { recursive: true, force: true });
});
