'use strict';
// Os Craft instalados no Windows (craft-windows.js): o que se lê do registro, o processador do
// executável, o instalador do lançamento, os códigos de saída e o comando do administrador.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const C = require('../src/principal/craft-windows.js');

/** Um cabeçalho PE mínimo com o processador pedido. */
function pe(maquina) {
  const b = Buffer.alloc(0x100);
  b.write('MZ', 0, 'latin1');
  b.writeUInt32LE(0x80, 0x3c);
  b.writeUInt32LE(0x00004550, 0x80);
  b.writeUInt16LE(maquina, 0x84);
  return b;
}

test('o processador do executável, pelo cabeçalho PE', () => {
  assert.strictEqual(C.arquiteturaPe(pe(0x8664)), 'x64');
  assert.strictEqual(C.arquiteturaPe(pe(0x014c)), 'x86');
  assert.strictEqual(C.arquiteturaPe(pe(0xaa64)), 'arm64');
  assert.strictEqual(C.arquiteturaPe(pe(0x1234)), null);
  assert.strictEqual(C.arquiteturaPe(Buffer.from('não é um executável')), null);
  assert.strictEqual(C.arquiteturaPe(null), null);
  assert.strictEqual(C.arquiteturaDoSistema('AMD64'), 'x64');
  assert.strictEqual(C.arquiteturaDoSistema('ARM64'), 'arm64');
  assert.strictEqual(C.arquiteturaDoSistema('x86'), 'x86');
});

test('os Craft do registro: só os do catálogo, com o processador do instalador certo', () => {
  const json = '\uFEFF' + JSON.stringify({
    arq: 'ARM64',
    programas: [
      { nome: 'WordCraft', versao: '0.9.0', chave: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', exe: 'C:\\Program Files\\WordCraft\\wordcraft.exe', assinante: 'CN=Learning Machines LLC' },
      { nome: 'GridCraft', versao: '0.8.0', chave: 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', exe: null },
      { nome: 'deckcraft', versao: '0.7.1', chave: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', exe: null },
      // Repetido (as duas chaves), sem versão numérica e fora do catálogo: ficam de fora.
      { nome: 'WordCraft', versao: '0.8.0', chave: 'HKCU:\\x', exe: null },
      { nome: 'PdfCraft', versao: 'beta', chave: 'HKLM:\\x', exe: null },
      { nome: 'Outro programa', versao: '1.0.0', chave: 'HKLM:\\x', exe: null },
    ],
  });
  const r = C.lerInstalados(json, (exe) => (exe.endsWith('wordcraft.exe') ? pe(0x8664) : null));
  assert.deepStrictEqual(r.map((x) => [x.id, x.versao, x.arq, x.assinante]), [
    ['wordcraft', '0.9.0', 'x64', 'CN=Learning Machines LLC'], // o do executável (x64 emulado no ARM)
    ['gridcraft', '0.8.0', 'x86', null], // a chave de 32 bits
    ['deckcraft', '0.7.1', 'arm64', null], // o do sistema
  ]);
  assert.deepStrictEqual(C.lerInstalados('não é JSON'), []);
  assert.deepStrictEqual(C.lerInstalados('{"arq":"AMD64","programas":[]}'), []);
});

test('o instalador do lançamento: o do processador, só do próprio repositório, com o resumo', () => {
  const prog = { id: 'wordcraft', repo: 'storytold/wordcraft' };
  const base = 'https://github.com/storytold/wordcraft/releases/download/v0.10.0/';
  const sha = 'a'.repeat(64);
  const j = {
    tag_name: 'v0.10.0',
    assets: [
      { name: 'wordcraft-0.10.0-windows-x86.msi', browser_download_url: base + 'wordcraft-0.10.0-windows-x86.msi', size: 10, digest: 'sha256:' + 'b'.repeat(64) },
      { name: 'wordcraft-0.10.0-windows-x64.msi', browser_download_url: base + 'wordcraft-0.10.0-windows-x64.msi', size: 20, digest: 'sha256:' + sha },
      { name: 'wordcraft-0.10.0-windows-arm64.msi', browser_download_url: 'https://example.com/wordcraft-0.10.0-windows-arm64.msi', size: 30 },
      { name: 'wordcraft-0.10.0-windows-x64-portable.zip', browser_download_url: base + 'x.zip', size: 40 },
    ],
  };
  assert.deepStrictEqual(C.msiDoLancamento(j, prog, 'x64'), { nome: 'wordcraft-0.10.0-windows-x64.msi', url: base + 'wordcraft-0.10.0-windows-x64.msi', tamanho: 20, sha256: sha });
  assert.strictEqual(C.msiDoLancamento(j, prog, 'x86').sha256, 'b'.repeat(64));
  assert.strictEqual(C.msiDoLancamento(j, prog, 'arm64'), null); // de fora do GitHub
  assert.strictEqual(C.msiDoLancamento(j, { id: 'gridcraft', repo: 'storytold/gridcraft' }, 'x64'), null);
  // De outro repositório, no mesmo GitHub: não serve.
  const outro = { tag_name: 'v1', assets: [{ name: 'wordcraft-1.0.0-windows-x64.msi', browser_download_url: 'https://github.com/outro/wordcraft/releases/download/v1/wordcraft-1.0.0-windows-x64.msi', size: 1 }] };
  assert.strictEqual(C.msiDoLancamento(outro, prog, 'x64'), null);
  // Sem o resumo, o instalador aparece, mas sem o sha256 (e atualizar recusa).
  const semResumo = { tag_name: 'v1', assets: [{ name: 'wordcraft-1.0.0-windows-x64.msi', browser_download_url: base + 'wordcraft-1.0.0-windows-x64.msi', size: 1, digest: 'md5:x' }] };
  assert.strictEqual(C.msiDoLancamento(semResumo, prog, 'x64').sha256, null);
});

test('os códigos de saída do instalador', () => {
  assert.deepStrictEqual(C.resultadoDoCodigo(0), { ok: true });
  assert.deepStrictEqual(C.resultadoDoCodigo(3010), { ok: true, reiniciar: true });
  assert.deepStrictEqual(C.resultadoDoCodigo(1223), { ok: false, cancelado: true });
  assert.deepStrictEqual(C.resultadoDoCodigo(1602), { ok: false, cancelado: true });
  for (const n of [91, 92, 93, 1618, 1603]) {
    const r = C.resultadoDoCodigo(n);
    assert.strictEqual(r.ok, false);
    assert.ok(r.erro);
  }
});

test('o comando do administrador: os valores só em base64, nada do texto no comando', () => {
  const msi = "C:\\Users\\Ana D'Ávila\"; Remove-Item C:\\ -Recurse #\\craft.msi";
  const cmd = C.comandoInstalar({ msi, sha256: 'AB'.repeat(32), assinante: 'CN="Learning Machines LLC", O=Learning Machines LLC' });
  assert.ok(!cmd.includes('Remove-Item C:'));
  assert.ok(!cmd.includes("D'Ávila"));
  assert.ok(cmd.includes(Buffer.from(msi, 'utf8').toString('base64')));
  assert.ok(cmd.includes(Buffer.from('ab'.repeat(32), 'utf8').toString('base64')));
  assert.match(cmd, /msiexec\.exe/);
  assert.match(cmd, /'\/passive', '\/norestart'/);
});

// O PowerShell (o do Windows no fluxo "Compilar"; o pwsh nos outros, se houver; RETRO_PWSH aponta um de outro lugar).
const PWSH = [process.env.RETRO_PWSH, 'pwsh', process.platform === 'win32' ? 'powershell.exe' : null]
  .filter(Boolean).find((c) => spawnSync(c, ['-NoProfile', '-Command', 'exit 0']).status === 0);
const rodarPs = (texto) => spawnSync(PWSH, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(texto, 'utf16le').toString('base64')], { encoding: 'utf8' });

test('os comandos do PowerShell: a sintaxe', { skip: !PWSH && 'sem o PowerShell' }, () => {
  for (const texto of [C.LISTAR, C.comandoInstalar({ msi: 'C:\\a.msi', sha256: 'ab', assinante: '' }), C.comandoUac('exit 0')]) {
    const r = spawnSync(PWSH, ['-NoProfile', '-Command', '$e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput($env:ROTEIRO, [ref]$null, [ref]$e); exit $e.Count'], { env: { ...process.env, ROTEIRO: texto } });
    assert.strictEqual(r.status, 0, texto.slice(0, 60));
  }
});

// A conferência do administrador de verdade (sem a confirmação, que o fluxo do Windows já roda como
// administrador): ela nunca chega ao msiexec com um arquivo que não confere.
test('o administrador confere o resumo e a assinatura antes de instalar', { skip: process.platform !== 'win32' && 'só no Windows' }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "retro d'Ávila "));
  const falso = path.join(tmp, 'craft.msi');
  fs.writeFileSync(falso, 'não é um instalador');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(falso)).digest('hex');
  // O resumo errado: 91; o certo, mas sem a assinatura: 92; o arquivo que não existe: 93.
  assert.strictEqual(rodarPs(C.comandoInstalar({ msi: falso, sha256: 'f'.repeat(64), assinante: '' })).status, 91);
  assert.strictEqual(rodarPs(C.comandoInstalar({ msi: falso, sha256: sha, assinante: '' })).status, 92);
  assert.strictEqual(rodarPs(C.comandoInstalar({ msi: falso, sha256: sha, assinante: 'CN=Learning Machines LLC' })).status, 92);
  assert.strictEqual(rodarPs(C.comandoInstalar({ msi: path.join(tmp, 'nao-existe.msi'), sha256: sha, assinante: '' })).status, 93);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('a lista do registro roda no Windows (sem nenhum Craft, vazia)', { skip: process.platform !== 'win32' && 'só no Windows' }, async () => {
  const cw = new C.CraftWindows(fetch, path.join(os.tmpdir(), 'retro-craft-windows-teste.json'));
  const lista = await cw.instalados();
  assert.ok(Array.isArray(lista));
  for (const x of lista) assert.match(x.versao, /^\d+(\.\d+)*$/);
});

test('fora do Windows não há nada a fazer', async () => {
  const cw = new C.CraftWindows(() => { throw new Error('não deveria buscar'); }, '/nao/existe.json', { plataforma: 'linux' });
  assert.strictEqual(cw.disponivel, false);
  assert.deepStrictEqual(await cw.instalados(), []);
  assert.strictEqual((await cw.atualizar('wordcraft')).ok, false);
});

test('a versão de mentira: atualiza o que tem versão nova e só ele', async () => {
  const f = new C.CraftWindowsFalso();
  let lista = await f.verificar();
  assert.deepStrictEqual(lista.map((x) => [x.id, x.versao, x.temAtualizacao]), [['wordcraft', '0.9.0', true], ['gridcraft', '0.10.0', false]]);
  const etapas = [];
  const r = await f.atualizar('wordcraft', (p) => etapas.push(p.etapa));
  assert.strictEqual(r.ok, true);
  assert.ok(etapas.includes('baixando') && etapas.at(-1) === 'pronto');
  lista = await f.verificar();
  assert.deepStrictEqual(lista.map((x) => [x.id, x.versao, x.temAtualizacao]), [['wordcraft', '0.10.0', false], ['gridcraft', '0.10.0', false]]);
  assert.strictEqual((await f.atualizar('gridcraft')).ok, false);
});
