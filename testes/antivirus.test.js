// O antivírus sob demanda (as saídas do clamscan e do MpCmdRun) e a formatação do pendrive.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Antivirus, lerLinhaClam, lerDefender, lerVersaoClam, contarArquivos, EICAR } = require('../src/principal/antivirus');
const { comandoFormatar } = require('../src/principal/unidades');

test('o clamscan: as linhas OK, as achadas e as outras', () => {
  assert.deepStrictEqual(lerLinhaClam('/home/eu/C/carta.txt: OK'), { arquivo: '/home/eu/C/carta.txt', ok: true });
  assert.deepStrictEqual(lerLinhaClam('/home/eu/C/teste: com espaço.com: Win.Test.EICAR_HDB-1 FOUND'), { arquivo: '/home/eu/C/teste: com espaço.com', ameaca: 'Win.Test.EICAR_HDB-1' });
  assert.deepStrictEqual(lerLinhaClam('/home/eu/C/vazio.txt: Empty file'), { arquivo: '/home/eu/C/vazio.txt', ok: true });
  assert.strictEqual(lerLinhaClam('LibClamAV Warning: ***  The virus database is older than 7 days!  ***'), null);
  assert.deepStrictEqual(lerVersaoClam('ClamAV 1.0.7/27431/Thu Oct 15 08:12:34 2026\n'), { versao: '1.0.7', banco: '27431', data: 'Thu Oct 15 08:12:34 2026' });
  assert.deepStrictEqual(lerVersaoClam('ClamAV 1.4.3'), { versao: '1.4.3', banco: null, data: null });
});

test('o Microsoft Defender: as ameaças e os arquivos de cada uma', () => {
  const s = [
    'Scan starting...', 'Scan finished.', 'Scanning C:\\Users\\eu\\Documents\\Retro Computer found 2 threats.', '',
    '<===========================LIST OF DETECTED THREATS==========================>',
    '----------------------------- Threat information ------------------------------',
    'Threat                  : Virus:DOS/EICAR_Test_File', 'Resources               : 2 total',
    '    file                : C:\\Users\\eu\\Documents\\Retro Computer\\a.com',
    '    file                : C:\\Users\\eu\\Documents\\Retro Computer\\b.txt',
  ].join('\r\n');
  assert.deepStrictEqual(lerDefender(s), [
    { arquivo: 'C:\\Users\\eu\\Documents\\Retro Computer\\a.com', ameaca: 'Virus:DOS/EICAR_Test_File' },
    { arquivo: 'C:\\Users\\eu\\Documents\\Retro Computer\\b.txt', ameaca: 'Virus:DOS/EICAR_Test_File' },
  ]);
  assert.deepStrictEqual(lerDefender('Scan starting...\nScanning C:\\x found no threats.'), []);
});

test('a versão de mentira acha o arquivo de teste e conta os outros', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-av-'));
  fs.mkdirSync(path.join(pasta, 'sub'));
  fs.writeFileSync(path.join(pasta, 'carta.txt'), 'olá');
  fs.writeFileSync(path.join(pasta, 'sub', 'teste.com'), EICAR);
  assert.strictEqual(await contarArquivos(pasta), 2);
  const av = new Antivirus({ falso: true });
  const vistos = [];
  const r = await av.verificar(pasta, { aoAndar: (x) => vistos.push(x.n) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.n, 2);
  assert.deepStrictEqual(r.achados, [{ arquivo: path.join(pasta, 'sub', 'teste.com'), ameaca: 'Eicar-Test-Signature' }]);
  assert.deepStrictEqual(vistos.sort(), [1, 2]);
  // Nada foi apagado.
  assert.ok(fs.existsSync(path.join(pasta, 'sub', 'teste.com')));
});

test('formatar: só dispositivos de disco, o rótulo limpo e o sistema de arquivos certo', () => {
  assert.deepStrictEqual(comandoFormatar('/dev/sdb1', 'exfat', 'Fotos'), ['mkfs.exfat', ['-L', 'Fotos', '/dev/sdb1']]);
  assert.deepStrictEqual(comandoFormatar('/dev/mmcblk0p1', 'fat32', 'Câmera; rm -rf /'), ['mkfs.vfat', ['-F', '32', '-n', 'CAMERA RM -', '/dev/mmcblk0p1']]);
  assert.deepStrictEqual(comandoFormatar('/dev/sdc', 'exfat', ''), ['mkfs.exfat', ['-L', 'PENDRIVE', '/dev/sdc']]);
  assert.strictEqual(comandoFormatar('/dev/sdb1; reboot', 'exfat', 'x'), null);
  assert.strictEqual(comandoFormatar('/home/eu', 'exfat', 'x'), null);
  assert.strictEqual(comandoFormatar('/dev/sdb1', 'ntfs', 'x'), null);
});
