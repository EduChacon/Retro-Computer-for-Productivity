'use strict';
// As teclas de função do computador portátil no modo sistema (teclas-linux.js): os atalhos do Openbox,
// a fila que eles escrevem, o controle de mídia (o MPRIS) e a luz do teclado (bandeja.js).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TECLAS, trocarTeclas, temTeclas, blocoTeclas, leitorDeLinhas, FilaDeTeclas, lerTocadores, lerEstadoTocador, escolherTocador, MidiaFalsa } = require('../src/principal/teclas-linux.js');
const { trocarMargens } = require('../src/principal/janelas-linux.js');
const { LuzTeclado, escolherLuzTeclado } = require('../src/principal/bandeja.js');

const RC = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'linux', 'openbox', 'rc.xml'), 'utf8');
const SO_LINUX = process.platform !== 'linux';

test('teclas: os atalhos entram no rc.xml da sessão sem mexer nas margens', () => {
  const fila = '/run/user/1000/retro-computer/teclas';
  const com = trocarTeclas(trocarMargens(RC, { baixo: 56 }), fila);
  for (const [tecla] of TECLAS) assert.match(com, new RegExp(`<keybind key="${tecla}">`));
  assert.match(com, /<bottom>56<\/bottom>/);
  assert.ok(temTeclas(com, fila));
  assert.ok(!temTeclas(RC, fila));
  // Trocar de novo não duplica, e as margens mudadas depois guardam os atalhos.
  assert.strictEqual(trocarTeclas(com, fila), com);
  const depois = trocarMargens(com, { baixo: 28 });
  assert.ok(temTeclas(depois, fila));
  assert.strictEqual((depois.match(/<keyboard>/g) || []).length, 1);
  // O ">" do comando vai escapado (o XML continua válido) e o caminho da fila entre aspas.
  assert.match(blocoTeclas(fila), /printf "%s\\n" "\$0" &gt; "\$1"' luz-teclado\+ "\/run\/user\/1000\/retro-computer\/teclas"/);
  // Sem o bloco <keyboard>, ou com ele vazio por "/>", o bloco entra assim mesmo.
  assert.ok(temTeclas(trocarTeclas('<openbox_config></openbox_config>', fila), fila));
  assert.ok(temTeclas(trocarTeclas('<openbox_config><keyboard/></openbox_config>', fila), fila));
  // Um caminho com aspas ou barra invertida quebraria o comando: recusado.
  assert.throws(() => blocoTeclas('/tmp/a"b'), /fila/);
  assert.throws(() => blocoTeclas('relativo/teclas'), /fila/);
});

test('teclas: a fila entrega só as ações conhecidas, em pedaços ou não', () => {
  const vistas = [];
  const ler = leitorDeLinhas((a) => vistas.push(a));
  ler('luz-teclado+\nmidia-to');
  ler('car\nrm -rf /\n');
  ler('x'.repeat(400));
  ler('\nligar\n');
  assert.deepStrictEqual(vistas, ['luz-teclado+', 'midia-tocar', 'ligar']);
});

test('teclas: o comando do atalho escreve na fila (o Retro Computer lê)', { skip: SO_LINUX }, async () => {
  const pasta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-teclas-')), 'com espaço');
  const vistas = [];
  const fila = new FilaDeTeclas({ pasta, aoAcao: (a) => vistas.push(a) });
  try {
    assert.ok(await fila.abrir());
    assert.ok(fs.statSync(fila.caminho).isFIFO());
    assert.strictEqual(fs.statSync(pasta).mode & 0o777, 0o700);
    // O comando de dois atalhos, como o Openbox o separa (aqui, pelo sh: as mesmas aspas).
    const bloco = blocoTeclas(fila.caminho);
    for (const tecla of ['XF86KbdBrightnessUp', 'XF86PowerOff']) {
      const cmd = new RegExp(`key="${tecla}"><action name="Execute"><command>([^<]*)<`).exec(bloco)[1].replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
      execFileSync('sh', ['-c', cmd]);
    }
    await new Promise((r) => setTimeout(r, 200));
    assert.deepStrictEqual(vistas, ['luz-teclado+', 'ligar']);
  } finally {
    fila.fechar();
  }
});

test('teclas: a fila não abre numa pasta aberta aos outros nem por cima de um arquivo comum', { skip: SO_LINUX }, async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-teclas-'));
  const aberta = path.join(raiz, 'aberta');
  fs.mkdirSync(aberta, { mode: 0o700 });
  fs.chmodSync(aberta, 0o777);
  assert.strictEqual(await new FilaDeTeclas({ pasta: aberta }).abrir(), false);
  const comum = path.join(raiz, 'comum');
  fs.mkdirSync(comum, { mode: 0o700 });
  fs.writeFileSync(path.join(comum, 'teclas'), 'meu arquivo');
  assert.strictEqual(await new FilaDeTeclas({ pasta: comum }).abrir(), false);
  // O arquivo fica como estava.
  assert.strictEqual(fs.readFileSync(path.join(comum, 'teclas'), 'utf8'), 'meu arquivo');
});

test('teclas: a mídia vai para o programa que está tocando', () => {
  const saida = 'as 4 "org.freedesktop.DBus" ":1.7" "org.mpris.MediaPlayer2.firefox.instance_1_34" "org.mpris.MediaPlayer2.chromium.instance2328"\n';
  assert.deepStrictEqual(lerTocadores(saida), ['org.mpris.MediaPlayer2.firefox.instance_1_34', 'org.mpris.MediaPlayer2.chromium.instance2328']);
  assert.strictEqual(lerEstadoTocador('s "Playing"\n'), 'Playing');
  assert.strictEqual(lerEstadoTocador(''), null);
  const a = { nome: 'a', estado: 'Paused' };
  const b = { nome: 'b', estado: 'Playing' };
  const c = { nome: 'c', estado: 'Stopped' };
  assert.strictEqual(escolherTocador([a, b, c], 'c'), 'b');
  // Nada tocando: o último que recebeu a tecla (para tocar de novo o que foi pausado), depois um pausado.
  assert.strictEqual(escolherTocador([a, c], 'c'), 'c');
  assert.strictEqual(escolherTocador([c, a], null), 'a');
  assert.strictEqual(escolherTocador([], 'a'), null);
});

test('teclas: o tocador de mentira das capturas', async () => {
  const m = new MidiaFalsa();
  assert.strictEqual(await m.comando('midia-tocar'), true);
  assert.strictEqual(m.estado, 'Paused');
  assert.strictEqual(await m.comando('midia-proxima'), true);
  assert.strictEqual(await m.comando('apagar'), false);
  assert.deepStrictEqual(m.pedidos, ['PlayPause', 'Next']);
});

// Os nomes com "::" não valem no Windows.
test('luz do teclado: a do sistema, lida e mudada em porcentagem', { skip: process.platform === 'win32' }, async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-leds-'));
  const criar = (nome, max, atual) => {
    fs.mkdirSync(path.join(raiz, nome));
    fs.writeFileSync(path.join(raiz, nome, 'max_brightness'), String(max));
    fs.writeFileSync(path.join(raiz, nome, 'brightness'), String(atual));
  };
  criar('input3::capslock', 1, 0);
  criar('smc::kbd_backlight', 255, 51);
  assert.deepStrictEqual(escolherLuzTeclado(raiz), { nome: 'smc::kbd_backlight', max: 255, atual: 51 });
  const l = new LuzTeclado({ plataforma: 'linux', raiz });
  assert.deepStrictEqual(await l.ler(), { disponivel: true, nivel: 20 });
  // Sem o logind nem o brightnessctl de verdade para este nome, o arquivo (como o administrador faria).
  assert.deepStrictEqual(await l.definir(50), { disponivel: true, nivel: 50 });
  assert.strictEqual(fs.readFileSync(path.join(raiz, 'smc::kbd_backlight', 'brightness'), 'utf8'), '128');
  assert.deepStrictEqual(await l.definir(-5), { disponivel: true, nivel: 0 });
  assert.deepStrictEqual(await new LuzTeclado({ plataforma: 'win32', raiz }).ler(), { disponivel: false });
  assert.strictEqual(escolherLuzTeclado(path.join(raiz, 'nada')), null);
});
