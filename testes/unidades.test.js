'use strict';
// Os pendrives: a leitura do lsblk, os caminhos que não saem da unidade, e trazer e levar
// arquivos sem apagar nem gravar por cima.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const u = require('../src/principal/unidades.js');
const { Disco } = require('../src/principal/disco.js');

const LSBLK = JSON.stringify({ blockdevices: [
  { name: 'nvme0n1', path: '/dev/nvme0n1', pkname: null, label: null, mountpoint: null, rm: false, hotplug: false, size: 512e9, type: 'disk', tran: 'nvme', fstype: null,
    children: [{ name: 'nvme0n1p1', path: '/dev/nvme0n1p1', pkname: 'nvme0n1', label: null, mountpoint: '/', rm: false, hotplug: false, size: 500e9, type: 'part', tran: null, fstype: 'ext4' }] },
  { name: 'sdb', path: '/dev/sdb', pkname: null, label: null, mountpoint: null, rm: true, hotplug: true, size: 16e9, type: 'disk', tran: 'usb', fstype: null,
    children: [{ name: 'sdb1', path: '/dev/sdb1', pkname: 'sdb', label: 'PENDRIVE', mountpoint: '/media/eu/PENDRIVE', rm: true, hotplug: true, size: 16e9, type: 'part', tran: null, fstype: 'vfat' }] },
  { name: 'sdc', path: '/dev/sdc', pkname: null, label: 'FOTOS', mountpoint: null, rm: false, hotplug: true, size: 32e9, type: 'disk', tran: 'usb', fstype: 'exfat' },
] });

test('unidades: só as removíveis, com ou sem partição, montadas ou não', () => {
  assert.deepStrictEqual(u.lerLsblk(LSBLK), [
    { id: '/dev/sdb1', rotulo: 'PENDRIVE', raiz: '/media/eu/PENDRIVE', montada: true, disco: '/dev/sdb', tamanho: 16e9 },
    { id: '/dev/sdc', rotulo: 'FOTOS', raiz: null, montada: false, disco: '/dev/sdc', tamanho: 32e9 },
  ]);
  assert.strictEqual(u.lerMontagem('Mounted /dev/sdb1 at /media/eu/PEN DRIVE.\n'), '/media/eu/PEN DRIVE');
});

test('unidades: os caminhos não saem da raiz da unidade', () => {
  const raiz = path.resolve('/media/eu/PENDRIVE');
  assert.strictEqual(u.dentro(raiz, 'Fotos/praia.jpg'), path.join(raiz, 'Fotos', 'praia.jpg'));
  assert.strictEqual(u.dentro(raiz, ''), raiz);
  assert.throws(() => u.dentro(raiz, '../outro'));
  assert.throws(() => u.dentro(raiz, 'Fotos/../../etc'));
  assert.ok(u.escondida('System Volume Information') && u.escondida('.Trashes') && !u.escondida('Fotos'));
});

test('unidades: trazer para o C: e levar para o pendrive, sem gravar por cima', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-unidade-'));
  const pen = path.join(tmp, 'pendrive');
  fs.mkdirSync(path.join(pen, 'Fotos'), { recursive: true });
  fs.writeFileSync(path.join(pen, 'Fotos', 'praia.txt'), 'praia');
  fs.mkdirSync(path.join(pen, 'System Volume Information'));
  const disco = new Disco(path.join(tmp, 'c'));
  await disco.preparar?.();
  fs.mkdirSync(path.join(tmp, 'c', 'Docs'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'c', 'Docs', 'carta.txt'), 'carta');
  const un = new u.UnidadesFalsas({ disco }, pen);
  const lista = await un.listarPasta('falsa', '');
  assert.deepStrictEqual(lista.map((x) => x.nome), ['Fotos']);
  await un.trazer('falsa', ['Fotos/praia.txt'], 'Docs');
  assert.strictEqual(fs.readFileSync(path.join(tmp, 'c', 'Docs', 'praia.txt'), 'utf8'), 'praia');
  await un.levar('falsa', ['Docs/carta.txt'], 'Fotos');
  await un.levar('falsa', ['Docs/carta.txt'], 'Fotos');
  assert.deepStrictEqual(fs.readdirSync(path.join(pen, 'Fotos')).sort(), ['carta (2).txt', 'carta.txt', 'praia.txt']);
  await assert.rejects(un.listarPasta('falsa', '../c'));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('pastas do computador principal: só as que existem, sem a pasta do disco C:, sem gravar por cima', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-fora-'));
  const casa = path.join(tmp, 'casa');
  for (const p of ['desktop', 'documents', 'downloads']) fs.mkdirSync(path.join(casa, p), { recursive: true });
  fs.writeFileSync(path.join(casa, 'documents', 'contrato.txt'), 'contrato');
  // O disco C: dentro dos documentos, como o padrão (Documentos/Retro Computer).
  const raizC = path.join(casa, 'documents', 'Retro Computer');
  const disco = new Disco(raizC);
  await disco.preparar?.();
  fs.mkdirSync(path.join(raizC, 'Docs'), { recursive: true });
  fs.writeFileSync(path.join(raizC, 'Docs', 'carta.txt'), 'carta');
  // As imagens com o mesmo caminho dos documentos (como o Linux sem as pastas do usuário) e as músicas que não existem.
  const caminhos = { desktop: 'desktop', documents: 'documents', downloads: 'downloads', pictures: 'documents', music: 'music', videos: 'videos' };
  const fora = new u.PastasDoComputador({ caminho: (n) => path.join(casa, caminhos[n]), disco: () => disco });
  const lista = await fora.listar();
  assert.deepStrictEqual(lista.map((x) => x.id), ['pc:mesa', 'pc:documentos', 'pc:downloads']);
  // A pasta do disco C: não aparece nos documentos e não pode ser trazida nem receber nada por aqui.
  assert.deepStrictEqual((await fora.listarPasta('pc:documentos', '')).map((x) => x.nome), ['contrato.txt']);
  await assert.rejects(fora.trazer('pc:documentos', ['Retro Computer/Docs/carta.txt'], 'Docs'), /disco/);
  await assert.rejects(fora.trazer('pc:documentos', ['Retro Computer'], 'Docs'), /disco/);
  await assert.rejects(fora.levar('pc:documentos', ['Docs/carta.txt'], 'Retro Computer/Docs'), /disco/);
  assert.strictEqual(fs.readFileSync(path.join(raizC, 'Docs', 'carta.txt'), 'utf8'), 'carta');
  // Trazer é uma cópia; levar nunca grava por cima.
  await fora.trazer('pc:documentos', ['contrato.txt'], 'Docs');
  assert.strictEqual(fs.readFileSync(path.join(raizC, 'Docs', 'contrato.txt'), 'utf8'), 'contrato');
  assert.ok(fs.existsSync(path.join(casa, 'documents', 'contrato.txt')));
  await fora.levar('pc:mesa', ['Docs/carta.txt'], '');
  await fora.levar('pc:mesa', ['Docs/carta.txt'], '');
  assert.deepStrictEqual(fs.readdirSync(path.join(casa, 'desktop')).sort(), ['carta (2).txt', 'carta.txt']);
  // Sem remover com segurança nem formatar; e nada sai da pasta.
  assert.strictEqual((await fora.ejetar('pc:mesa')).ok, false);
  assert.strictEqual((await fora.formatar('pc:mesa')).ok, false);
  await assert.rejects(fora.listarPasta('pc:mesa', '../documents'));
  await assert.rejects(fora.listarPasta('pc:outra', ''));
  fs.rmSync(tmp, { recursive: true, force: true });
});
