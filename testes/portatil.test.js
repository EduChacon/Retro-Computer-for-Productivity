// O modo portátil: a pasta "Retro Computer (dados)" ao lado do programa.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pastaDoPrograma, pastaPortatil, caminhosPortateis, NOME } = require('../src/principal/portatil');

test('a pasta do programa: o .exe portátil, o AppImage, o .app do Mac e os outros', () => {
  assert.strictEqual(pastaDoPrograma({ env: { PORTABLE_EXECUTABLE_DIR: 'E:\\Retro' }, exe: 'C:\\Temp\\x\\Retro Computer.exe', plataforma: 'win32' }), 'E:\\Retro');
  assert.strictEqual(pastaDoPrograma({ env: { APPIMAGE: '/media/pen/Retro.AppImage' }, exe: '/tmp/.mount_x/retro-computer', plataforma: 'linux' }), '/media/pen');
  assert.strictEqual(pastaDoPrograma({ env: {}, exe: '/Volumes/PEN/Retro Computer.app/Contents/MacOS/Retro Computer', plataforma: 'darwin' }), '/Volumes/PEN');
  assert.strictEqual(pastaDoPrograma({ env: {}, exe: path.join('/media', 'pen', 'retro', 'retro-computer'), plataforma: 'linux' }), path.join('/media', 'pen', 'retro'));
});

test('só vale com a pasta criada ao lado do programa', () => {
  const pen = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-pen-'));
  const exe = path.join(pen, 'Retro Computer.exe');
  assert.strictEqual(pastaPortatil({ env: {}, exe, plataforma: 'win32' }), null);
  fs.mkdirSync(path.join(pen, NOME));
  const p = pastaPortatil({ env: {}, exe, plataforma: 'win32' });
  assert.strictEqual(p, path.join(pen, NOME));
  assert.deepStrictEqual(caminhosPortateis(p), { dados: path.join(p, 'Sistema'), disco: path.join(p, 'Disco C') });
  // Um arquivo com o mesmo nome não liga o modo portátil.
  const outro = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-pen-'));
  fs.writeFileSync(path.join(outro, NOME), '');
  assert.strictEqual(pastaPortatil({ env: {}, exe: path.join(outro, 'x.exe'), plataforma: 'win32' }), null);
});
