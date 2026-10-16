'use strict';
// O DOS: o tipo dos .exe, os comandos para abrir um programa e a volta dos arquivos ao disco.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Disco } = require('../src/principal/disco.js');
const { Dos, tipoExecutavel, nomeDos, comandosPara, configuracao, diferencas } = require('../src/principal/dos.js');

const novoDisco = () => new Disco(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-dos-')), 'C'));

/** Um cabeçalho de executável: o MZ, a tabela de realocação e a assinatura nova (PE, NE, LE). */
function exe(realocacao, assinatura) {
  const b = Buffer.alloc(256);
  b.write('MZ', 0, 'latin1');
  b.writeUInt16LE(realocacao, 0x18);
  b.writeUInt32LE(0x80, 0x3c);
  if (assinatura) b.write(assinatura, 0x80, 'latin1');
  return b;
}

test('dos: o tipo do .exe pelo cabeçalho', () => {
  assert.equal(tipoExecutavel(exe(0x1c)), 'dos');
  assert.equal(tipoExecutavel(exe(0x40, 'PE\0\0')), 'windows');
  assert.equal(tipoExecutavel(exe(0x40, 'NE')), 'windows');
  // Os jogos com extensor (o DOS/4GW) são do DOS.
  assert.equal(tipoExecutavel(exe(0x40, 'LE')), 'dos');
  assert.equal(tipoExecutavel(Buffer.from('#!/bin/sh\n')), null);
  assert.equal(tipoExecutavel(Buffer.from('MZ')), 'dos');
});

test('dos: os comandos para abrir um programa (só nomes 8.3)', () => {
  assert.equal(nomeDos('KEEN4.EXE'), true);
  assert.equal(nomeDos('jogo.com'), true);
  assert.equal(nomeDos('Nome longo.exe'), false);
  assert.equal(nomeDos('PROGRAMA1.EXE'), false);
  assert.deepEqual(comandosPara('JOGOS/KEEN4.EXE'), ['cd \\JOGOS', 'KEEN4.EXE']);
  assert.deepEqual(comandosPara('INICIO.BAT'), ['call INICIO.BAT']);
  assert.deepEqual(comandosPara('JOGOS/Nome longo.exe'), ['cd \\JOGOS', 'dir /w']);
  assert.deepEqual(comandosPara('Pasta longa/X.EXE'), []);
  assert.deepEqual(comandosPara(''), []);
  const conf = configuracao(['cd \\JOGOS', 'KEEN4.EXE']);
  assert.match(conf, /\[autoexec\]\nmount c \.\nc:\ncd \\JOGOS\nKEEN4\.EXE\n/);
  assert.match(conf, /autolock=false/);
});

test('dos: as diferenças entre o disco e o DOS (sem maiúsculas, sem a pasta do js-dos)', () => {
  const crypto = require('node:crypto');
  const r = (t) => crypto.createHash('sha1').update(Buffer.from(t)).digest('hex');
  const foto = {
    'leiame.txt': { caminho: 'leiame.txt', resumo: r('igual') },
    'jogos/save.dat': { caminho: 'jogos/save.dat', resumo: r('antes') },
    'velho.txt': { caminho: 'velho.txt', resumo: r('x') },
  };
  const { gravar, apagar } = diferencas(foto, [
    { caminho: 'LEIAME.TXT', conteudo: Buffer.from('igual') },
    { caminho: 'JOGOS/SAVE.DAT', conteudo: Buffer.from('depois') },
    { caminho: 'NOVO.TXT', conteudo: Buffer.from('novo') },
    { caminho: '.jsdos/dosbox.conf', conteudo: Buffer.from('conf') },
  ]);
  assert.deepEqual(gravar.map((g) => g.caminho), ['jogos/save.dat', 'NOVO.TXT']);
  assert.deepEqual(apagar, ['velho.txt']);
});

test('dos: abrir e guardar (a versão anterior guardada, o apagado na Lixeira)', async () => {
  const disco = novoDisco();
  const dos = new Dos({ disco });
  // Na primeira vez, a pasta C:\DOS é criada.
  let u = await dos.abrir();
  assert.equal(u.ok, true);
  assert.equal(u.pasta, 'DOS');
  assert.ok(fs.existsSync(disco.real('DOS')));
  await disco.gravar('DOS/LEIAME.TXT', Buffer.from('ola'));
  await disco.gravar('DOS/JOGOS/SAVE.DAT', Buffer.from('fase 1'));
  await disco.gravar('DOS/APAGAR.TXT', Buffer.from('tchau'));
  u = await dos.abrir();
  assert.deepEqual(u.arquivos.map((a) => a.caminho).sort(), ['APAGAR.TXT', 'JOGOS/SAVE.DAT', 'LEIAME.TXT']);
  // O DOS mudou o save, criou um arquivo e uma pasta e apagou outro.
  const r = await dos.guardar(u.pasta, u.foto, [
    { caminho: 'LEIAME.TXT', conteudo: Buffer.from('ola') },
    { caminho: 'JOGOS/SAVE.DAT', conteudo: Buffer.from('fase 2') },
    { caminho: 'NOVO.TXT', conteudo: Buffer.from('novo') },
  ], ['JOGOS', 'FOTOS']);
  assert.deepEqual([r.gravados, r.lixeira], [2, 1]);
  assert.equal(fs.readFileSync(disco.real('DOS/JOGOS/SAVE.DAT'), 'utf8'), 'fase 2');
  assert.equal(fs.readFileSync(disco.real('DOS/NOVO.TXT'), 'utf8'), 'novo');
  assert.ok(fs.existsSync(disco.real('DOS/FOTOS')));
  assert.equal(fs.existsSync(disco.real('DOS/APAGAR.TXT')), false);
  assert.ok((await disco.listarLixeira()).some((i) => i.nome === 'APAGAR.TXT'));
  assert.ok((await disco.versoes('DOS/JOGOS/SAVE.DAT')).length >= 1);
  // Guardar de novo sem mudanças não grava nada.
  const r2 = await dos.guardar(u.pasta, r.foto, [
    { caminho: 'LEIAME.TXT', conteudo: Buffer.from('ola') },
    { caminho: 'JOGOS/SAVE.DAT', conteudo: Buffer.from('fase 2') },
    { caminho: 'NOVO.TXT', conteudo: Buffer.from('novo') },
  ]);
  assert.deepEqual([r2.gravados, r2.lixeira], [0, 0]);
  // Um programa fora de C:\DOS: a unidade C: é a pasta dele.
  await disco.gravar('Jogos velhos/PROG.COM', Buffer.from([0xcd, 0x20]));
  const u3 = await dos.abrir('Jogos velhos/PROG.COM');
  assert.equal(u3.pasta, 'Jogos velhos');
  assert.match(u3.conf, /\nPROG\.COM\n/);
  // Nenhum caminho sai do disco.
  await assert.rejects(dos.guardar('DOS', {}, [{ caminho: '../fora.txt', conteudo: Buffer.from('x') }]));
});

test('dos: uma pasta grande demais não vai para a memória', async () => {
  const disco = novoDisco();
  const dos = new Dos({ disco });
  const { lerPasta } = require('../src/principal/dos.js');
  await disco.gravar('DOS/A.BIN', Buffer.alloc(2048));
  await assert.rejects(lerPasta(disco.real('DOS'), { limite: 1024 }), (e) => e.grande === true);
  assert.equal((await dos.abrir()).ok, true);
});

test('dos: o emulador em dos://emulador (só a página e a biblioteca, com o eval só ali)', async () => {
  const { arquivoDoEmulador, servirEmulador, CSP_EMULADOR } = require('../src/principal/dos.js');
  const raiz = path.join(__dirname, '..');
  assert.equal(arquivoDoEmulador('dos://emulador/', raiz), path.join(raiz, 'src', 'dos', 'emulador.html'));
  assert.equal(arquivoDoEmulador('dos://emulador/wdosbox.wasm', raiz), path.join(raiz, 'node_modules', 'emulators', 'dist', 'wdosbox.wasm'));
  // Nada fora da lista: nem o resto da biblioteca, nem outro lugar do disco.
  for (const u of ['dos://emulador/wdosbox-x.wasm', 'dos://emulador/../package.json', 'dos://emulador/%2e%2e/main.js', 'dos://outro/emulator.js', 'sistema://emulador/emulators.js']) {
    assert.equal(arquivoDoEmulador(u, raiz), null, u);
  }
  // Sem internet, e só a área de trabalho pode embutir a página.
  assert.match(CSP_EMULADOR, /connect-src dos:;/);
  assert.match(CSP_EMULADOR, /frame-ancestors sistema:/);
  assert.match(CSP_EMULADOR, /default-src 'none'/);
  const r = await servirEmulador({ url: 'dos://emulador/' }, raiz);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-security-policy'), CSP_EMULADOR);
  assert.equal((await servirEmulador({ url: 'dos://emulador/nada.js' }, raiz)).status, 404);
});
