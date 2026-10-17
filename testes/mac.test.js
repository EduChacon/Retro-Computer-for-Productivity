'use strict';
// O Mac Plus: a ROM pelo tamanho, o Disk Copy 4.2 de ida e volta, a ordem das unidades, o
// pce-config.cfg e a volta dos discos ao disco (só os que mudaram, com a versão de antes guardada).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Disco } = require('../src/principal/disco.js');
const {
  Mac, modeloDaRom, lerDc42, somaDc42, montarDc42, ehDiscoRigido, ordenarDiscos, configuracao,
} = require('../src/principal/macintosh.js');

const novoDisco = () => new Disco(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-mac-')), 'C'));

/** Um disquete do Disk Copy 4.2 de mentira: o cabeçalho, os dados e as etiquetas. */
function dc42(dados, etiquetas = Buffer.alloc(0), nome = 'Teste') {
  const cab = Buffer.alloc(84);
  cab[0] = nome.length;
  cab.write(nome, 1, 'latin1');
  cab.writeUInt32BE(dados.length, 0x40);
  cab.writeUInt32BE(etiquetas.length, 0x44);
  cab.writeUInt32BE(somaDc42(dados), 0x48);
  cab[0x50] = 1; // 800 KB
  cab[0x51] = 0x22;
  cab[0x52] = 0x01;
  cab[0x53] = 0x00;
  return Buffer.concat([cab, dados, etiquetas]);
}

test('mac: o modelo pela ROM (o tamanho) e o .rom do próprio PCE de fora', () => {
  assert.equal(modeloDaRom('Mac Plus.rom', 131072), 'mac-plus');
  assert.equal(modeloDaRom('se.ROM', 262144), 'mac-se');
  assert.equal(modeloDaRom('classic.rom', 524288), 'mac-classic');
  assert.equal(modeloDaRom('macplus-pcex.rom', 131072), null);
  assert.equal(modeloDaRom('outra.rom', 1024), null);
  assert.equal(modeloDaRom('plus.bin', 131072), null);
});

test('mac: o Disk Copy 4.2 de ida e volta (a soma refeita, as etiquetas de antes)', () => {
  const dados = Buffer.alloc(819200);
  for (let i = 0; i < dados.length; i++) dados[i] = (i * 7) & 255;
  const etiquetas = Buffer.alloc(1600 * 12, 9);
  const arq = dc42(dados, etiquetas);
  const lido = lerDc42(arq);
  assert.ok(lido);
  assert.equal(lido.dados.length, 819200);
  assert.equal(lido.etiquetas.length, etiquetas.length);
  // Um arquivo cru não é do Disk Copy.
  assert.equal(lerDc42(dados), null);
  assert.equal(lerDc42(Buffer.alloc(10)), null);
  // O Mac gravou: o arquivo volta com a soma nova e as mesmas etiquetas.
  const novos = Buffer.from(dados);
  novos[1024] ^= 0xff;
  const volta = montarDc42(arq, novos);
  const relido = lerDc42(volta);
  assert.ok(relido);
  assert.deepEqual(Buffer.from(relido.dados), novos);
  assert.deepEqual(Buffer.from(relido.etiquetas), etiquetas);
  assert.equal(volta.readUInt32BE(0x48), somaDc42(novos));
  assert.notEqual(volta.readUInt32BE(0x48), arq.readUInt32BE(0x48));
  assert.equal(volta.subarray(0, 0x40).toString('latin1'), arq.subarray(0, 0x40).toString('latin1'));
  // A soma conhecida: cada palavra somada e girada um bit para a direita.
  assert.equal(somaDc42(Buffer.from([0x00, 0x02])), 1);
  assert.equal(somaDc42(Buffer.from([0x00, 0x01])), 0x80000000);
});

test('mac: os discos rígidos (com o mapa de partições) e a ordem das unidades', () => {
  const hd = Buffer.alloc(2 * 1024 * 1024);
  hd.write('ER', 0, 'latin1');
  assert.equal(ehDiscoRigido(hd), true);
  assert.equal(ehDiscoRigido(Buffer.alloc(2 * 1024 * 1024)), false); // um volume sem partições vai na unidade de disquete
  assert.equal(ehDiscoRigido(Buffer.from('ER')), false);
  const itens = [
    { caminho: 'Mac/SimAnt.dsk', nome: 'SimAnt.dsk' },
    { caminho: 'Mac/Arkanoid.dsk', nome: 'Arkanoid.dsk' },
    { caminho: 'Mac/System 6.0.8.dsk', nome: 'System 6.0.8.dsk' },
  ];
  assert.deepEqual(ordenarDiscos(itens).map((i) => i.nome), ['System 6.0.8.dsk', 'Arkanoid.dsk', 'SimAnt.dsk']);
  // O aberto com dois cliques vem logo depois do de partida.
  assert.deepEqual(ordenarDiscos(itens, 'Mac/SimAnt.dsk').map((i) => i.nome), ['System 6.0.8.dsk', 'SimAnt.dsk', 'Arkanoid.dsk']);
});

test('mac: o pce-config.cfg (a máquina, a tela, os discos e o escape fora do Esc)', () => {
  const c = configuracao({ modelo: 'mac-plus', disquetes: 2, discos: 1 });
  assert.match(c, /model = "mac-plus"/);
  assert.match(c, /file = "mac\.rom"[\s\S]*?size = 256K/);
  assert.match(c, /file = "macplus-pcex\.rom"/);
  assert.match(c, /escape = "ScrollLock"/);
  assert.match(c, /min_h = 342/);
  assert.match(c, /drive = 1\n\ttype = "image"\n\tfile = "d1\.img"/);
  assert.match(c, /drive = 2\n\ttype = "image"\n\tfile = "d2\.img"/);
  assert.doesNotMatch(c, /d3\.img/);
  assert.match(c, /id = 6\n\t\tdrive = 128/);
  assert.match(c, /drive = 128\n\ttype = "image"\n\tfile = "h1\.img"/);
  assert.match(configuracao({ modelo: 'mac-classic', disquetes: 1 }), /size = 512K/);
  // Nunca mais de três de cada.
  const muitos = configuracao({ disquetes: 9, discos: 9 });
  assert.equal((muitos.match(/file = "d\d\.img"/g) || []).length, 3);
  assert.equal((muitos.match(/file = "h\d\.img"/g) || []).length, 3);
});

test('mac: abrir (o que falta, a ROM, os discos) e guardar (só o que mudou, a versão de antes)', async () => {
  const disco = novoDisco();
  const mac = new Mac({ disco });
  // Sem nada: a pasta C:\Mac é criada e falta a ROM.
  let u = await mac.abrir();
  assert.deepEqual([u.ok, u.semRom], [false, true]);
  assert.ok(fs.existsSync(disco.real('Mac')));
  // Com a ROM e sem discos: falta o disco.
  await disco.gravar('Mac/Mac Plus.rom', Buffer.alloc(131072, 0x11));
  u = await mac.abrir();
  assert.deepEqual([u.ok, u.semDisco], [false, true]);
  // O Sistema em Disk Copy 4.2 e um jogo cru.
  const sistema = Buffer.alloc(819200, 1);
  const jogo = Buffer.alloc(409600, 2);
  await disco.gravar('Mac/System Tools.image', dc42(sistema, Buffer.alloc(800 * 12)));
  await disco.gravar('Mac/SimAnt.dsk', jogo);
  await disco.gravar('Mac/LEIAME.txt', Buffer.from('nada'));
  u = await mac.abrir();
  assert.equal(u.ok, true);
  assert.equal(u.modelo, 'mac-plus');
  assert.equal(u.rom.conteudo.length, 131072);
  assert.deepEqual(u.discos.map((d) => [d.nome, d.interno, d.dc42]), [['System Tools.image', 'd1.img', true], ['SimAnt.dsk', 'd2.img', false]]);
  assert.equal(u.discos[0].conteudo.length, 819200); // sem o cabeçalho do Disk Copy
  assert.match(u.conf, /file = "d2\.img"/);
  // Um disco de outra pasta, aberto com dois cliques, entra depois do Sistema.
  await disco.gravar('Jogos/Lode Runner.dsk', Buffer.alloc(409600, 3));
  const u2 = await mac.abrir('Jogos/Lode Runner.dsk');
  assert.deepEqual(u2.discos.map((d) => d.nome), ['System Tools.image', 'Lode Runner.dsk', 'SimAnt.dsk']);

  // O Mac gravou nos dois: o Disk Copy volta com a soma nova; o cru, como está.
  const sistema2 = Buffer.from(sistema);
  sistema2[0] = 0x99;
  const jogo2 = Buffer.from(jogo);
  jogo2[5] = 0x77;
  let r = await mac.guardar(u.foto, [{ caminho: 'Mac/System Tools.image', conteudo: sistema2 }, { caminho: 'Mac/SimAnt.dsk', conteudo: jogo2 }]);
  assert.equal(r.gravados, 2);
  const volta = lerDc42(fs.readFileSync(disco.real('Mac/System Tools.image')));
  assert.ok(volta);
  assert.equal(volta.dados[0], 0x99);
  assert.equal(volta.etiquetas.length, 800 * 12);
  assert.equal(fs.readFileSync(disco.real('Mac/SimAnt.dsk'))[5], 0x77);
  assert.equal((await disco.versoes('Mac/SimAnt.dsk')).length, 1);
  // De novo, sem mudanças: nada; com mudanças: grava, mas a versão de antes de ligar continua a única.
  r = await mac.guardar(r.foto, [{ caminho: 'Mac/SimAnt.dsk', conteudo: jogo2 }]);
  assert.equal(r.gravados, 0);
  const jogo3 = Buffer.from(jogo2);
  jogo3[6] = 0x55;
  r = await mac.guardar(r.foto, [{ caminho: 'Mac/SimAnt.dsk', conteudo: jogo3 }]);
  assert.equal(r.gravados, 1);
  assert.equal(fs.readFileSync(disco.real('Mac/SimAnt.dsk'))[6], 0x55);
  assert.equal((await disco.versoes('Mac/SimAnt.dsk')).length, 1);
  // Só voltam os discos que foram para o emulador; nenhum caminho sai do disco.
  r = await mac.guardar(r.foto, [{ caminho: 'Mac/LEIAME.txt', conteudo: Buffer.from('x') }, { caminho: '../fora.dsk', conteudo: Buffer.from('x') }]);
  assert.equal(r.gravados, 0);
  assert.equal(fs.readFileSync(disco.real('Mac/LEIAME.txt'), 'utf8'), 'nada');
});

test('mac: o emulador em mac://emulador (só a página e a biblioteca, sem internet)', async () => {
  const { arquivoDoEmulador, servirEmulador, CSP_EMULADOR } = require('../src/principal/macintosh.js');
  const raiz = path.join(__dirname, '..');
  assert.equal(arquivoDoEmulador('mac://emulador/', raiz), path.join(raiz, 'src', 'mac', 'emulador.html'));
  assert.equal(arquivoDoEmulador('mac://emulador/pce-macplus.wasm', raiz), path.join(raiz, 'node_modules', 'pcejs-macplus', 'pce-macplus.wasm'));
  for (const u of ['mac://emulador/pce-macplus.wasm.map', 'mac://emulador/../package.json', 'mac://emulador/%2e%2e/main.js',
    'mac://emulador/lib/pcejs-macplus.js', 'mac://outro/emulador.js', 'dos://emulador/emulador.js']) {
    assert.equal(arquivoDoEmulador(u, raiz), null, u);
  }
  assert.match(CSP_EMULADOR, /connect-src mac:;/);
  assert.match(CSP_EMULADOR, /frame-ancestors sistema:/);
  assert.match(CSP_EMULADOR, /default-src 'none'/);
  assert.doesNotMatch(CSP_EMULADOR, /'unsafe-eval'/); // o PCE.js não avalia código: só o .wasm
  const r = await servirEmulador({ url: 'mac://emulador/' }, raiz);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-security-policy'), CSP_EMULADOR);
  assert.equal((await servirEmulador({ url: 'mac://emulador/pcejs-macplus.umd.js' }, raiz)).status, 200);
  assert.equal((await servirEmulador({ url: 'mac://emulador/nada.js' }, raiz)).status, 404);
});
