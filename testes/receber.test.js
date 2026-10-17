'use strict';
// Receber do celular (receber.js): os endereços, os nomes, a aprovação, o envio e as tentativas erradas.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { Disco } = require('../src/principal/disco');
const { Receber, ehLocal, enderecosLocais, nomeSeguro, novoCodigo, LETRAS, MAX_ERROS } = require('../src/principal/receber');

test('receber: só as redes locais, sem as interfaces virtuais na frente', () => {
  for (const ip of ['10.0.0.5', '172.16.3.4', '172.31.255.1', '192.168.0.10', '::ffff:192.168.1.2']) assert.ok(ehLocal(ip), ip);
  for (const ip of ['8.8.8.8', '172.32.0.1', '127.0.0.1', '169.254.1.1', '100.64.0.1', 'fe80::1', '', 'x']) assert.ok(!ehLocal(ip), ip);
  const lista = enderecosLocais({
    lo: [{ family: 'IPv4', address: '127.0.0.1', internal: true }],
    docker0: [{ family: 'IPv4', address: '172.17.0.1', internal: false }],
    wlan0: [{ family: 'IPv4', address: '192.168.0.23', internal: false }, { family: 'IPv6', address: 'fe80::2', internal: false }],
    eth1: [{ family: 'IPv4', address: '200.1.2.3', internal: false }],
  });
  assert.deepEqual(lista.map((x) => x.ip), ['192.168.0.23', '172.17.0.1']);
});

test('receber: o código tem 8 letras sem as que se confundem, e o nome que chega não sai da pasta', () => {
  for (let i = 0; i < 50; i++) {
    const c = novoCodigo();
    assert.equal(c.length, 8);
    assert.ok([...c].every((l) => LETRAS.includes(l)), c);
  }
  assert.equal(nomeSeguro('../../etc/passwd'), 'passwd');
  assert.equal(nomeSeguro('C:\\Windows\\win.ini'), 'win.ini');
  assert.equal(nomeSeguro('  ..oculto.txt  '), 'oculto.txt');
  assert.equal(nomeSeguro('con.txt'), '_con.txt');
  assert.equal(nomeSeguro('a<b>c:"d|e?f*\u0001.jpg'), 'abcdef.jpg');
  assert.equal(nomeSeguro(''), 'arquivo');
  assert.equal(nomeSeguro('...'), 'arquivo');
  const longo = nomeSeguro('x'.repeat(300) + '.jpeg');
  assert.ok(longo.length <= 120 && longo.endsWith('.jpeg'), longo);
});

/** Um pedido HTTP simples (o corpo em Buffer). */
function pedir(url, { method = 'GET', corpo = null, cabecalhos = {} } = {}) {
  return new Promise((ok, falha) => {
    const r = http.request(url, { method, agent: false, headers: { Connection: 'close', ...(corpo ? { 'Content-Length': corpo.length } : {}), ...cabecalhos } }, (res) => {
      const partes = [];
      res.on('data', (b) => partes.push(b));
      res.on('end', () => ok({ status: res.statusCode, cabecalhos: res.headers, texto: Buffer.concat(partes).toString('utf8') }));
    });
    r.on('error', falha);
    if (corpo) r.write(corpo);
    r.end();
  });
}

test('receber: a página, o aparelho aceito, os arquivos sem gravar por cima e as tentativas erradas', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-receber-'));
  const disco = new Disco(raiz);
  await disco.preparar(['Meus documentos']);
  const avisos = [];
  const rec = new Receber({
    disco: () => disco, pasta: () => 'Meus documentos/Recebidos', avisar: (e, d) => avisos.push([e, d]),
    textos: () => ({ titulo: 'Enviar', aguardando: 'Aguardando', naoAprovado: 'não aprovado', falhou: 'falhou', grande: 'grande', sessao: 'sessão', semEspaco: 'sem espaço' }),
    local: (ip) => ip === '127.0.0.1' || ehLocal(ip), enderecos: () => [{ nome: 'lo', ip: '127.0.0.1' }],
  });
  try {
    const { url } = await rec.iniciar();
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/[a-z2-9]{8}\/$/);
    // A página: a CSP fechada, sem nada de fora, e o computador avisado do aparelho.
    const p = await pedir(url);
    assert.equal(p.status, 200);
    assert.match(p.cabecalhos['content-security-policy'], /default-src 'none'/);
    assert.equal(p.cabecalhos['x-content-type-options'], 'nosniff');
    assert.ok(!/https?:\/\/(?!x)/.test(p.texto.replace(url, '')), 'a página não carrega nada de fora');
    assert.equal(avisos.filter(([e]) => e === 'pedido').length, 1);
    assert.equal(JSON.parse((await pedir(url + 'estado')).texto).estado, 'aguardando');
    // Antes de aceito, não recebe nada.
    const negado = await pedir(url + 'arquivo?nome=foto.jpg', { method: 'PUT', corpo: Buffer.from('abc') });
    assert.equal(negado.status, 403);
    assert.ok(rec.aprovar('127.0.0.1', true));
    assert.equal(JSON.parse((await pedir(url + 'estado')).texto).estado, 'aprovado');
    // Dois com o mesmo nome e um com um caminho no nome: nada por cima e nada fora da pasta.
    for (const [nome, texto] of [['foto.jpg', 'um'], ['foto.jpg', 'dois'], ['../../fora.txt', 'três']]) {
      const r = await pedir(url + 'arquivo?nome=' + encodeURIComponent(nome), { method: 'PUT', corpo: Buffer.from(texto) });
      assert.equal(r.status, 200, r.texto);
    }
    const pasta = path.join(raiz, 'Meus documentos', 'Recebidos');
    assert.deepEqual(fs.readdirSync(pasta).sort(), ['fora.txt', 'foto (2).jpg', 'foto.jpg']);
    assert.equal(fs.readFileSync(path.join(pasta, 'foto.jpg'), 'utf8'), 'um');
    assert.equal(fs.readFileSync(path.join(pasta, 'foto (2).jpg'), 'utf8'), 'dois');
    assert.ok(!fs.existsSync(path.join(raiz, 'fora.txt')));
    assert.equal(avisos.filter(([e]) => e === 'arquivo').length, 3);
    // Grande demais: recusado antes de ler o corpo.
    const grande = await pedir(url + 'arquivo?nome=x.bin', { method: 'PUT', cabecalhos: { 'Content-Length': String(5 * 1024 ** 3) } }).catch(() => ({ status: 'cortado' }));
    assert.ok(grande.status === 413 || grande.status === 'cortado', String(grande.status));
    // O ícone do navegador não conta como erro; os códigos errados contam, e o servidor para.
    for (let i = 0; i < 5; i++) assert.equal((await pedir(url.replace(/[a-z2-9]{8}\/$/, 'favicon.ico'))).status, 404);
    assert.ok(rec.ligado());
    const errado = url.replace(/[a-z2-9]{8}\/$/, 'aaaaaaaa/');
    for (let i = 0; i < MAX_ERROS; i++) await pedir(errado).catch(() => { });
    assert.ok(!rec.ligado());
    assert.deepEqual(avisos.find(([e]) => e === 'fim')[1], { motivo: 'tentativas' });
    // Nenhum temporário ficou para trás.
    assert.ok(!fs.readdirSync(pasta).some((n) => n.startsWith('.~')));
  } finally {
    rec.parar();
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});
