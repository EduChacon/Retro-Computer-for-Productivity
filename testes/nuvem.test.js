'use strict';
// A nuvem no Linux (nuvem.js): as saídas do rclone (a versão, as perguntas sem tela, as montagens),
// as respostas de cada pergunta e o caminho inteiro pela versão de mentira, sem o rclone.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Config } = require('../src/principal/config');
const { Disco } = require('../src/principal/disco');
const n = require('../src/principal/nuvem');

test('nuvem: a versão do rclone (a do Mint 22 serve; a do Mint 21, não)', () => {
  assert.deepEqual(n.lerVersao('rclone v1.60.1-DEV\n- os/version: ubuntu 24.04'), [1, 60, 1]);
  assert.equal(n.versaoServe(n.lerVersao('rclone v1.60.1-DEV')), true);
  assert.equal(n.versaoServe(n.lerVersao('rclone v1.53.3-DEV')), false);
  assert.equal(n.versaoServe(n.lerVersao('rclone v2.0')), true);
  assert.equal(n.lerVersao('comando não encontrado'), null);
});

test('nuvem: as pastas montadas, com o espaço escrito como \\040', () => {
  const texto = [
    '/dev/sda1 / ext4 rw 0 0',
    'teste: /home/ana/.config/Retro\\040Computer/nuvem/montagens/drive-0a1b2c3d fuse.rclone rw,nosuid,nodev 0 0',
  ].join('\n');
  assert.deepEqual(n.lerMontagens(texto), ['/', '/home/ana/.config/Retro Computer/nuvem/montagens/drive-0a1b2c3d']);
});

test('nuvem: as perguntas do rclone e as respostas (o navegador daqui, o Meu Drive, a padrão)', () => {
  const p = n.lerPergunta('NOTICE: algo\n{"State":"*oauth-islocal,teamdrive,,","Option":{"Name":"config_is_local","Default":true,"DefaultStr":"true"},"Error":"","Result":""}');
  assert.equal(p.estado, '*oauth-islocal,teamdrive,,');
  assert.equal(n.responder(p.opcao), 'true');
  assert.equal(n.responder({ Name: 'config_change_team_drive', DefaultStr: 'true' }), 'false');
  assert.equal(n.responder({ Name: 'config_type', Examples: [{ Value: 'sharepoint' }] }), 'onedrive');
  assert.equal(n.responder({ Name: 'config_driveid', Examples: [{ Value: 'b!abc' }, { Value: 'b!def' }] }), 'b!abc', 'o primeiro drive');
  assert.equal(n.responder({ Name: 'outra', DefaultStr: '42' }), '42');
  assert.equal(n.responder({ Name: 'opcional' }), '');
  assert.throws(() => n.responder({ Name: 'obrigatoria', Required: true }), (e) => e.codigo === 'pergunta');
  assert.deepEqual(n.lerPergunta('{"State":"","Option":null,"Error":"","Result":""}'), { estado: '', opcao: null, erro: '' });
  assert.throws(() => n.lerPergunta('Error: sem json'), (e) => e.codigo === 'rclone');
});

test('nuvem: só os ids que o Retro Computer cria', () => {
  assert.ok(n.idValido('drive-0a1b2c3d'));
  assert.ok(n.idValido('onedrive-ffffffff'));
  for (const ruim of ['../x', 'drive-0a1b2c3', 'drive-0a1b2c3d:', 'gdrive-0a1b2c3d', 'drive-0A1B2C3D', '', null]) assert.ok(!n.idValido(ruim), String(ruim));
});

test('nuvem: adicionar, conectar, ver, trazer, levar, desconectar e remover (a versão de mentira)', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-nuvem-'));
  try {
    const config = new Config(path.join(base, 'dados'), null);
    const raizC = path.join(base, 'C');
    fs.mkdirSync(raizC);
    const disco = new Disco(raizC);
    fs.writeFileSync(path.join(raizC, 'carta.txt'), 'do C');
    let avisos = 0;
    let autorizou = 0;
    const nuv = new n.Nuvens({ pasta: path.join(base, 'dados', 'nuvem'), config, disco: () => disco, falso: path.join(base, 'servidor'), plataforma: 'linux', aoMudar: () => avisos++ });
    const id = await nuv.adicionar('drive', { aoAutorizar: () => autorizou++ });
    assert.ok(n.idValido(id));
    assert.equal(autorizou, 1);
    assert.match(nuv.enderecoDoLogin() || 'http://127.0.0.1:53682/auth?state=x', /^http:\/\/127\.0\.0\.1:53682\/auth\?state=/);
    const id2 = await nuv.adicionar('drive');
    assert.deepEqual(nuv.resumo().map((c) => c.nome), ['Google Drive', 'Google Drive (2)']);
    await assert.rejects(nuv.adicionar('ftp'), (e) => e.codigo === 'tipo');
    assert.equal((await nuv.listar()).length, 0, 'desconectada não aparece no Meu computador');
    await nuv.conectar(id);
    const [u] = await nuv.listar();
    assert.equal(u.id, `nuvem:${id}`);
    assert.equal(u.icone, 'nuvem');
    assert.deepEqual((await nuv.listarPasta(u.id, '')).map((f) => f.nome).sort(), ['Documentos', 'Fotos', 'Leia-me.txt']);
    const trazidos = await nuv.trazer(u.id, ['Documentos/Relatório anual.txt'], '');
    assert.equal(trazidos.length, 1);
    assert.ok(fs.existsSync(path.join(raizC, 'Relatório anual.txt')));
    await nuv.levar(u.id, ['carta.txt'], 'Documentos');
    await nuv.levar(u.id, ['carta.txt'], 'Documentos');
    assert.deepEqual(fs.readdirSync(path.join(base, 'servidor', id, 'Documentos')).sort(), ['Relatório anual.txt', 'carta (2).txt', 'carta.txt'], 'nada gravado por cima');
    await assert.rejects(nuv.listarPasta(u.id, '../..'), /caminho/);
    nuv.renomear(id, 'Trabalho\n(Drive)');
    nuv.mudar(id, { aoLigar: false });
    assert.deepEqual(nuv.resumo()[0], { id, tipo: 'drive', servico: 'Google Drive', nome: 'Trabalho (Drive)', aoLigar: false, estado: 'conectada', erro: null });
    await nuv.ejetar(u.id);
    assert.equal(nuv.resumo()[0].estado, 'desconectada');
    await nuv.remover(id);
    assert.deepEqual(nuv.resumo().map((c) => c.id), [id2]);
    assert.ok(fs.existsSync(path.join(base, 'servidor', id, 'Documentos', 'carta.txt')), 'os arquivos ficam na nuvem');
    assert.ok(avisos > 4);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('nuvem: cancelar o login não deixa a conta pela metade', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-nuvem-'));
  try {
    const config = new Config(path.join(base, 'dados'), null);
    const nuv = new n.Nuvens({ pasta: path.join(base, 'dados', 'nuvem'), config, disco: () => null, falso: path.join(base, 'servidor'), plataforma: 'linux' });
    const p = nuv.adicionar('onedrive', { aoAutorizar: () => nuv.cancelar() });
    await assert.rejects(p, (e) => e.codigo === 'cancelado');
    assert.deepEqual(nuv.contas(), []);
    assert.equal(nuv.cancelar(), false, 'nada mais sendo criado');
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});
