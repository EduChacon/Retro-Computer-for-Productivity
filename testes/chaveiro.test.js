'use strict';
// O chaveiro do Linux trancado (o modo sistema com a entrada automática): o estado lido sem pedir nada,
// o pedido de abrir pelo socket de controle do gnome-keyring e o cofre que não é tocado enquanto ele está trancado.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { execFileSync, spawnSync } = require('node:child_process');
const { Chaveiro, lerTrancado, pacoteAbrir, lerResposta, socketDeControle } = require('../src/principal/chaveiro.js');
const { Config } = require('../src/principal/config.js');

const SEM_UNIX = process.platform === 'win32';

test('chaveiro: o estado pela saída do gdbus e do busctl', () => {
  assert.strictEqual(lerTrancado('(<true>,)\n'), true);
  assert.strictEqual(lerTrancado('(<false>,)\n'), false);
  assert.strictEqual(lerTrancado('v b true\n'), true);
  assert.strictEqual(lerTrancado('v b false\n'), false);
  // Sem chaveiro ainda (a primeira entrada automática): o objeto "login" não existe.
  assert.strictEqual(lerTrancado('', 'GDBus.Error:org.freedesktop.DBus.Error.UnknownMethod: Object does not exist at path “/org/freedesktop/secrets/collection/login”'), 'sem');
  assert.strictEqual(lerTrancado('', 'Error: Cannot autolaunch D-Bus without X11 $DISPLAY'), null);
  assert.strictEqual(lerTrancado(''), null);
});

test('chaveiro: o pedido de abrir e a resposta do protocolo de controle', () => {
  const p = pacoteAbrir('ç1');
  assert.strictEqual(p.readUInt32BE(0), p.length);
  assert.strictEqual(p.readUInt32BE(4), 1); // a operação de abrir
  assert.strictEqual(p.readUInt32BE(8), 3); // "ç1" tem 3 bytes em UTF-8
  assert.strictEqual(p.subarray(12).toString('utf8'), 'ç1');
  const r = Buffer.alloc(8);
  r.writeUInt32BE(8, 0);
  r.writeUInt32BE(1, 4);
  assert.strictEqual(lerResposta(r), 1);
  assert.strictEqual(lerResposta(Buffer.alloc(4)), null);
});

/** Um gnome-keyring de mentira: o socket de controle numa pasta 0700, que abre com "certa". */
async function controleFalso(pasta, recebidos) {
  fs.mkdirSync(pasta, { mode: 0o700 });
  const servidor = net.createServer((c) => {
    let b = Buffer.alloc(0);
    c.on('data', (d) => {
      b = Buffer.concat([b, d]);
      if (b.length < 5) return;
      const p = b.subarray(1);
      if (p.length < 4 || p.length < p.readUInt32BE(0)) return;
      const senha = p.subarray(12, 12 + p.readUInt32BE(8)).toString('utf8');
      recebidos.push({ zero: b[0], op: p.readUInt32BE(4), senha });
      const r = Buffer.alloc(8);
      r.writeUInt32BE(8, 0);
      r.writeUInt32BE(senha === 'certa' ? 0 : 1, 4);
      c.end(r);
    });
  });
  await new Promise((r) => servidor.listen(path.join(pasta, 'control'), r));
  return servidor;
}

test('chaveiro: abre pelo socket de controle e recusa a senha errada', { skip: SEM_UNIX }, async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-chaveiro-'));
  const pasta = path.join(raiz, 'keyring');
  const recebidos = [];
  const servidor = await controleFalso(pasta, recebidos);
  try {
    const c = new Chaveiro({ env: { XDG_RUNTIME_DIR: raiz } });
    assert.deepStrictEqual(await c.abrir('errada'), { negado: true });
    assert.deepStrictEqual(await c.abrir('certa'), { ok: true });
    assert.deepStrictEqual(recebidos, [{ zero: 0, op: 1, senha: 'errada' }, { zero: 0, op: 1, senha: 'certa' }]);
    // Sem senha, nada vai para o socket.
    assert.deepStrictEqual(await c.abrir(''), { erro: true });
    assert.strictEqual(recebidos.length, 2);
  } finally {
    servidor.close();
  }
});

test('chaveiro: a senha nunca vai para um socket numa pasta aberta aos outros', { skip: SEM_UNIX }, async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-chaveiro-'));
  const pasta = path.join(raiz, 'keyring');
  const recebidos = [];
  const servidor = await controleFalso(pasta, recebidos);
  try {
    assert.strictEqual(socketDeControle({ XDG_RUNTIME_DIR: raiz }), path.join(pasta, 'control'));
    fs.chmodSync(pasta, 0o777);
    assert.strictEqual(socketDeControle({ XDG_RUNTIME_DIR: raiz }), null);
    assert.deepStrictEqual(await new Chaveiro({ env: { XDG_RUNTIME_DIR: raiz } }).abrir('certa'), { erro: true });
    assert.strictEqual(recebidos.length, 0);
    // Um arquivo comum no lugar do socket também não serve.
    fs.chmodSync(pasta, 0o700);
    const outra = path.join(raiz, 'outra');
    fs.mkdirSync(outra, { mode: 0o700 });
    fs.writeFileSync(path.join(outra, 'control'), '');
    assert.strictEqual(socketDeControle({ GNOME_KEYRING_CONTROL: outra }), null);
  } finally {
    servidor.close();
  }
});

test('chaveiro: trancado, o cofre do sistema não é tocado (a caixa do Linux pararia o Retro Computer)', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cofre-'));
  let trancado = true;
  const tocado = [];
  const cofre = {
    isEncryptionAvailable: () => { tocado.push('disponivel'); return true; },
    encryptString: (s) => { tocado.push('cifrar'); return Buffer.from('x' + s); },
    decryptString: (b) => { tocado.push('decifrar'); return b.toString().slice(1); },
  };
  const c = new Config(pasta, cofre, { trancado: () => trancado });
  fs.writeFileSync(path.join(pasta, 'chave-claude.bin'), 'xsk-ant-teste');
  assert.strictEqual(c.cofreDisponivel(), false);
  assert.strictEqual(c.temChave(), true);
  assert.strictEqual(c.lerChave(), null);
  assert.throws(() => c.gravarChave('sk-ant-outra'), /trancado/);
  assert.deepStrictEqual(tocado, []);
  // Aberto o chaveiro, tudo como antes.
  trancado = false;
  assert.strictEqual(c.cofreDisponivel(), true);
  assert.strictEqual(c.lerChave(), 'sk-ant-teste');
});

// Com o gnome-keyring instalado (o Linux Mint o traz), o chaveiro de verdade: criado com "certa", trancado,
// a errada recusada e a certa abrindo. Num D-Bus e numa pasta só do teste (nada do computador é tocado).
const temKeyring = process.platform === 'linux' && ['gnome-keyring-daemon', 'dbus-run-session', 'gdbus'].every((c) => spawnSync('sh', ['-c', `command -v ${c}`]).status === 0);
test('chaveiro: o gnome-keyring de verdade', { skip: !temKeyring && 'sem o gnome-keyring', timeout: 60000 }, () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-keyring-'));
  const home = path.join(raiz, 'home');
  const run = path.join(raiz, 'run');
  fs.mkdirSync(home);
  fs.mkdirSync(run, { mode: 0o700 });
  const roteiro = path.join(raiz, 'roteiro.js');
  fs.writeFileSync(roteiro, `
    const { Chaveiro } = require(${JSON.stringify(path.join(__dirname, '../src/principal/chaveiro.js'))});
    (async () => {
      const c = new Chaveiro();
      const r = { antes: await c.trancado(), errada: await c.abrir('errada'), certa: await c.abrir('certa'), depois: await c.trancado() };
      console.log(JSON.stringify(r));
    })();
  `);
  const sh = `
    printf 'certa' | gnome-keyring-daemon --daemonize --login >/dev/null 2>&1
    gnome-keyring-daemon --start --components=secrets >/dev/null 2>&1
    gdbus call --session --dest org.freedesktop.secrets --object-path /org/freedesktop/secrets \\
      --method org.freedesktop.Secret.Service.Lock "['/org/freedesktop/secrets/collection/login']" >/dev/null 2>&1
    "${process.execPath}" "${roteiro}"
  `;
  // Os daemons do teste saem sozinhos com o fim do D-Bus do dbus-run-session (o do computador fica como está).
  const saida = execFileSync('dbus-run-session', ['--', 'sh', '-c', sh], {
    env: { PATH: process.env.PATH, HOME: home, XDG_RUNTIME_DIR: run, LANG: 'C.UTF-8' }, encoding: 'utf8', timeout: 50000,
  });
  const linha = saida.trim().split('\n').filter((l) => l.startsWith('{')).pop();
  assert.deepStrictEqual(JSON.parse(linha), { antes: true, errada: { negado: true }, certa: { ok: true }, depois: false });
});
