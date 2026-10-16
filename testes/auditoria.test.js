'use strict';
// A auditoria de segurança da 1.0: cada falha achada tem o seu teste, para não voltar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Programas } = require('../src/principal/programas.js');
const { Disco } = require('../src/principal/disco.js');
const { tirarLinksDeFora } = require('../src/principal/compactados.js');
const { EXECUTAVEIS, ehExecutavel } = require('../src/principal/executaveis.js');
const { temporario } = require('../src/principal/sistema-linux.js');
const { nomeValido } = require('../src/principal/impressoras.js');

const pastaNova = (n) => fs.mkdtempSync(path.join(os.tmpdir(), `retro-auditoria-${n}-`));

test('programa://: só o nome de um programa instalado (nunca "..", que levaria à pasta de dados)', async () => {
  const dados = pastaNova('dados');
  fs.writeFileSync(path.join(dados, 'config.json'), '{"segredo":1}');
  const pasta = path.join(dados, 'programas');
  fs.mkdirSync(path.join(pasta, 'wordcraft'), { recursive: true });
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'programa.json'), JSON.stringify({ id: 'wordcraft', versao: '1.0.0' }));
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'app.js'), 'ok');
  const p = new Programas(pasta, async () => { throw new Error('sem rede'); });
  // O Chromium entrega estes endereços com o host "..".
  for (const url of ['programa://../config.json', 'programa://%2e%2e/config.json', 'programa://outro/app.js', 'programa://wordcraft/../../config.json']) {
    const r = await p.servir({ url });
    assert.equal(r.status, 404, url);
  }
  const ok = await p.servir({ url: 'programa://wordcraft/app.js' });
  assert.equal(ok.status, 200);
  // Só o próprio programa lê as respostas.
  assert.equal(ok.headers.get('access-control-allow-origin'), 'programa://wordcraft');
  assert.equal(p.instalado('..'), null);
});

/** Um GitHub de mentira: o lançamento com o resumo e o arquivo baixado (que pode não conferir). */
function lancamento({ conteudo, digest, url, tamanho }) {
  const zip = Buffer.from(conteudo);
  return async (endereco) => {
    if (endereco.includes('/releases/latest')) {
      return { ok: true, status: 200, headers: new Map(), json: async () => ({ tag_name: 'v9.9.9', assets: [{ name: 'wordcraft-web-9.9.9.zip', browser_download_url: url, size: tamanho == null ? zip.length : tamanho, digest }] }) };
    }
    return { ok: true, status: 200, headers: new Map(), body: new Blob([zip]).stream() };
  };
}

test('Craft: o download confere com o resumo publicado, tem tamanho máximo e vem do repositório certo', async () => {
  const oficial = 'https://github.com/storytold/wordcraft/releases/download/v9.9.9/wordcraft-web-9.9.9.zip';
  // O resumo não confere: nada é instalado.
  let p = new Programas(pastaNova('dig'), lancamento({ conteudo: 'pacote trocado', digest: 'sha256:' + crypto.createHash('sha256').update('original').digest('hex'), url: oficial }));
  await assert.rejects(p.instalar('wordcraft'), /não confere/);
  assert.equal(p.instalado('wordcraft'), null);
  // Maior que o anunciado: o download para.
  p = new Programas(pastaNova('tam'), lancamento({ conteudo: 'x'.repeat(5000), url: oficial, tamanho: 10 }));
  await assert.rejects(p.instalar('wordcraft'), /maior que o esperado/);
  // Um endereço de outro lugar não é aceito (a busca cai nos caminhos de reserva, sem a internet aqui).
  p = new Programas(pastaNova('host'), lancamento({ conteudo: 'x', url: 'https://exemplo.com/wordcraft-web-9.9.9.zip' }));
  assert.notEqual((await p.ultimaVersao(p.doCatalogo('wordcraft')).catch(() => ({}))).url, 'https://exemplo.com/wordcraft-web-9.9.9.zip');
});

test('Craft: o que veio de um .zip não é trocado pela atualização', async () => {
  const pasta = pastaNova('zip');
  fs.mkdirSync(path.join(pasta, 'wordcraft'));
  fs.writeFileSync(path.join(pasta, 'wordcraft', 'programa.json'), JSON.stringify({ id: 'wordcraft', versao: '0.1.0', origem: 'arquivo local' }));
  const p = new Programas(pasta, lancamento({ conteudo: 'x', url: 'https://github.com/storytold/wordcraft/releases/download/v9.9.9/wordcraft-web-9.9.9.zip' }));
  assert.equal((await p.verificar('wordcraft')).temAtualizacao, false);
  await assert.rejects(p.instalar('wordcraft', () => { }, { atualizar: true }), (e) => e.codigo === 'sem-novidade');
});

test('disco: um link (encadeado ou quebrado) não leva para fora do disco', { skip: process.platform === 'win32' }, () => {
  const base = pastaNova('links');
  const raiz = path.join(base, 'C');
  const fora = path.join(base, 'fora');
  fs.mkdirSync(raiz);
  fs.mkdirSync(fora);
  fs.writeFileSync(path.join(fora, 'segredo.txt'), 'x');
  const d = new Disco(raiz);
  fs.symlinkSync(fora, path.join(raiz, 'direto'));
  fs.symlinkSync('.', path.join(raiz, 'e'));
  fs.symlinkSync('e/e/e', path.join(raiz, 'd'));
  fs.symlinkSync('d/d/d/d/../../../..', path.join(raiz, 'g'));
  fs.symlinkSync(path.join(fora, 'ainda-nao-existe'), path.join(raiz, 'quebrado'));
  for (const rel of ['direto/segredo.txt', 'g', 'g/fora/segredo.txt', 'quebrado']) assert.throws(() => d.real(rel), /fora do disco/, rel);
  // Os links que ficam dentro continuam valendo.
  fs.writeFileSync(path.join(raiz, 'carta.txt'), 'oi');
  assert.equal(d.real('e/carta.txt'), path.join(raiz, 'e', 'carta.txt'));
  assert.equal(d.real('novo/arquivo.txt'), path.join(raiz, 'novo', 'arquivo.txt'));
});

test('pastas compactadas: o link encadeado que sai da pasta é tirado', { skip: process.platform === 'win32' }, async () => {
  const base = pastaNova('tar');
  const pasta = path.join(base, 'extraida');
  fs.mkdirSync(pasta);
  fs.symlinkSync('.', path.join(pasta, 'e'));
  fs.symlinkSync('e/e/e', path.join(pasta, 'd'));
  fs.symlinkSync('d/d/d/d/../../../..', path.join(pasta, 'g'));
  await tirarLinksDeFora(pasta);
  assert.equal(fs.existsSync(path.join(pasta, 'g')), false);
  assert.ok(fs.lstatSync(path.join(pasta, 'e')).isSymbolicLink());
});

test('executáveis: a mesma lista no processo principal e na área de trabalho', () => {
  const util = fs.readFileSync(path.join(__dirname, '..', 'src', 'sistema', 'js', 'util.js'), 'utf8');
  assert.ok(util.includes(`export const EXECUTAVEIS = ${EXECUTAVEIS.toString()};`));
  for (const n of ['Fatura.exe', 'x.HTA', 'instalar.msi', 'roteiro.ps1', 'a.js', 'jogo.AppImage', 'atalho.lnk']) assert.equal(ehExecutavel(n), true, n);
  for (const n of ['carta.docx', 'foto.svg', 'planilha.xlsx', 'leia.txt', 'exe']) assert.equal(ehExecutavel(n), false, n);
});

test('administrador: o arquivo temporário fica numa pasta só do usuário', { skip: process.platform === 'win32' }, async () => {
  const t = await temporario('teste.conf', 'conteúdo');
  try {
    assert.equal(fs.readFileSync(t.arquivo, 'utf8'), 'conteúdo');
    assert.equal(fs.statSync(t.arquivo).mode & 0o077, 0);
    assert.equal(fs.statSync(path.dirname(t.arquivo)).mode & 0o077, 0);
  } finally {
    await t.apagar();
  }
  assert.equal(fs.existsSync(t.arquivo), false);
});

test('impressoras: as aspas curvas (que o PowerShell lê como aspas) não passam', () => {
  for (const n of ['x’);calc;#', 'a‘b', 'a“b']) assert.equal(nomeValido(n), false, n);
  assert.equal(nomeValido('HP_LaserJet-1020'), true);
});
