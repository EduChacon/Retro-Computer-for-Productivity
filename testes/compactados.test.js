'use strict';
// As pastas compactadas (compactar, ver, extrair sem sair do destino) e os arquivos do disco
// servidos em trechos para o Reprodutor de mídia.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const c = require('../src/principal/compactados.js');
const { lerTrecho, servirArquivo } = require('../src/principal/servir.js');

function pasta() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'retro-zip-'));
}

test('compactados: compactar, listar e extrair de volta, sem gravar por cima', async () => {
  const p = pasta();
  fs.mkdirSync(path.join(p, 'Fotos', 'Vazia'), { recursive: true });
  fs.writeFileSync(path.join(p, 'Fotos', 'praia.txt'), 'areia');
  fs.writeFileSync(path.join(p, 'nota ção.txt'), 'acentuação');
  const zip = path.join(p, 'pacote.zip');
  const n = await c.compactar([{ abs: path.join(p, 'Fotos'), nome: 'Fotos' }, { abs: path.join(p, 'nota ção.txt'), nome: 'nota ção.txt' }], zip);
  assert.strictEqual(n, 3);
  assert.ok(!fs.existsSync(zip + '.parcial'));
  await assert.rejects(c.compactar([{ abs: path.join(p, 'nota ção.txt'), nome: 'x.txt' }], zip), /existe|EEXIST/);

  const itens = await c.listarZip(zip);
  const nomes = itens.map((i) => i.nome).sort();
  assert.deepStrictEqual(nomes, ['Fotos', 'Fotos/Vazia', 'Fotos/praia.txt', 'nota ção.txt']);
  assert.strictEqual(itens.find((i) => i.nome === 'Fotos/praia.txt').tamanho, 5);
  assert.ok(itens.find((i) => i.nome === 'Fotos').pasta);

  const destino = path.join(p, 'saida');
  fs.mkdirSync(destino);
  const feitos = await c.extrairZip(zip, destino);
  assert.deepStrictEqual(feitos.sort(), ['Fotos/praia.txt', 'nota ção.txt']);
  assert.strictEqual(fs.readFileSync(path.join(destino, 'Fotos', 'praia.txt'), 'utf8'), 'areia');
  assert.ok(fs.statSync(path.join(destino, 'Fotos', 'Vazia')).isDirectory());

  // Extrair de novo no mesmo lugar não grava por cima do que já está lá.
  fs.writeFileSync(path.join(destino, 'nota ção.txt'), 'mudei');
  const de_novo = await c.extrairZip(zip, destino);
  assert.deepStrictEqual(de_novo, []);
  assert.strictEqual(fs.readFileSync(path.join(destino, 'nota ção.txt'), 'utf8'), 'mudei');

  // Só uma parte.
  const parte = path.join(p, 'parte');
  fs.mkdirSync(parte);
  assert.deepStrictEqual(await c.extrairZip(zip, parte, { apenas: ['Fotos'] }), ['Fotos/praia.txt']);
  assert.ok(!fs.existsSync(path.join(parte, 'nota ção.txt')));
});

test('compactados: os nomes de dentro do pacote não saem do destino', () => {
  assert.strictEqual(c.nomeSeguro('a/b.txt'), 'a/b.txt');
  assert.strictEqual(c.nomeSeguro('./a//b.txt'), 'a/b.txt');
  assert.strictEqual(c.nomeSeguro('a\\b.txt'), 'a/b.txt');
  assert.strictEqual(c.nomeSeguro('../fora.txt'), null);
  assert.strictEqual(c.nomeSeguro('a/../../fora.txt'), null);
  assert.strictEqual(c.nomeSeguro('C:/Windows/x.dll'), null);
  assert.strictEqual(c.nomeSeguro('/etc/passwd'), 'etc/passwd'); // sem a barra do começo: fica dentro
  assert.strictEqual(c.semExtensao('fotos.tar.gz'), 'fotos');
  assert.strictEqual(c.semExtensao('Pacote.ZIP'), 'Pacote');
  assert.ok(c.ehTar('a.tgz') && c.ehTar('a.tar.xz') && !c.ehTar('a.zip') && c.ehZip('a.Zip'));
});

test('servir: os trechos pedidos pelo vídeo', async () => {
  assert.deepStrictEqual(lerTrecho('bytes=0-99', 1000), { inicio: 0, fim: 99 });
  assert.deepStrictEqual(lerTrecho('bytes=900-', 1000), { inicio: 900, fim: 999 });
  assert.deepStrictEqual(lerTrecho('bytes=-100', 1000), { inicio: 900, fim: 999 });
  assert.deepStrictEqual(lerTrecho('bytes=990-2000', 1000), { inicio: 990, fim: 999 });
  assert.deepStrictEqual(lerTrecho('bytes=1000-', 1000), { invalido: true });
  assert.strictEqual(lerTrecho('', 1000), null);
  assert.strictEqual(lerTrecho('bytes=0-1,5-6', 1000), null);

  const p = pasta();
  const arq = path.join(p, 'filme.mp4');
  fs.writeFileSync(arq, Buffer.from('0123456789'));
  const inteiro = await servirArquivo(arq, null);
  assert.strictEqual(inteiro.status, 200);
  assert.strictEqual(inteiro.headers.get('content-type'), 'video/mp4');
  assert.strictEqual(await inteiro.text(), '0123456789');
  const trecho = await servirArquivo(arq, 'bytes=3-5');
  assert.strictEqual(trecho.status, 206);
  assert.strictEqual(trecho.headers.get('content-range'), 'bytes 3-5/10');
  assert.strictEqual(await trecho.text(), '345');
  assert.strictEqual((await servirArquivo(arq, 'bytes=20-')).status, 416);
  assert.strictEqual((await servirArquivo(path.join(p, 'nao-existe.mp4'), null)).status, 404);
});
