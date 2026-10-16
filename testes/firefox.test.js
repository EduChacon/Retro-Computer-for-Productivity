'use strict';
// O Firefox do Retro Computer: o perfil (o user.js e o visual), o lugar de cada pacote e o comando.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Firefox, userJs, USER_CHROME, pastaPerfil, tipoDe, candidatos } = require('../src/principal/firefox');

test('firefox: o user.js leva as escolhas do Retro Computer', () => {
  const u = userJs({ downloads: '/casa/Meus documentos/Recebidos', soHttps: true, limparAoFechar: false, idioma: 'es', inicio: 'https://duckduckgo.com/', escala: 2 });
  assert.match(u, /user_pref\("toolkit\.legacyUserProfileCustomizations\.stylesheets", true\);/);
  assert.match(u, /user_pref\("browser\.download\.dir", "\/casa\/Meus documentos\/Recebidos"\);/);
  assert.match(u, /user_pref\("dom\.security\.https_only_mode", true\);/);
  assert.match(u, /user_pref\("privacy\.sanitize\.sanitizeOnShutdown", false\);/);
  assert.match(u, /user_pref\("intl\.locale\.requested", "es-ES"\);/);
  assert.match(u, /user_pref\("media\.eme\.enabled", true\);/);
  assert.match(u, /user_pref\("layout\.css\.devPixelsPerPx", "2\.0"\);/);
  assert.match(u, /user_pref\("browser\.startup\.homepage", "https:\/\/duckduckgo\.com\/"\);/);
  // As aspas e as barras de um caminho do Windows ficam escapadas.
  assert.match(userJs({ downloads: 'C:\\Users\\Eu "x"\\Recebidos' }), /"C:\\\\Users\\\\Eu \\"x\\"\\\\Recebidos"/);
  assert.match(userJs({ limparAoFechar: true }), /privacy\.clearOnShutdown_v2\.cookiesAndStorage", true/);
});

test('firefox: o visual não usa @namespace (com ele, o Firefox 158 ignora o arquivo inteiro)', () => {
  assert.ok(!/@namespace/.test(USER_CHROME));
  assert.match(USER_CHROME, /font-family: "Katica"/);
});

test('firefox: cada pacote guarda o perfil num lugar que ele enxerga', () => {
  assert.strictEqual(tipoDe('/snap/bin/firefox'), 'snap');
  assert.strictEqual(tipoDe('flatpak'), 'flatpak');
  assert.strictEqual(tipoDe('/usr/bin/firefox'), 'comum');
  assert.strictEqual(pastaPerfil('snap', '/d', '/home/eu'), '/home/eu/snap/firefox/common/retro-computer');
  assert.strictEqual(pastaPerfil('flatpak', '/d', '/home/eu'), '/home/eu/.var/app/org.mozilla.firefox/retro-computer');
  assert.strictEqual(pastaPerfil('comum', '/d', '/home/eu'), path.join('/d', 'firefox'));
  assert.ok(candidatos('win32', { ProgramFiles: 'C:\\Program Files' })[0].endsWith('Mozilla Firefox\\firefox.exe'));
});

test('firefox: o comando, com a classe da janela no Linux, e o perfil preparado', async () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-ff-'));
  const f = new Firefox({ plataforma: 'linux', dados, fontes: path.join(__dirname, '..', 'src', 'sistema', 'fontes') });
  assert.deepStrictEqual(f.comando('/usr/bin/firefox', '/p', 'https://a.b/'), { arquivo: '/usr/bin/firefox', args: ['--profile', '/p', '--class', 'RetroNavegador', '--name', 'RetroNavegador', 'https://a.b/'] });
  assert.deepStrictEqual(f.comando('flatpak', '/p', '').args.slice(0, 2), ['run', 'org.mozilla.firefox']);
  assert.deepStrictEqual(new Firefox({ plataforma: 'win32', dados }).comando('C:\\ff.exe', 'C:\\p', '').args, ['--profile', 'C:\\p']);
  const perfil = await f.preparar('/usr/bin/firefox', { downloads: '/x' });
  assert.ok(fs.existsSync(path.join(perfil, 'user.js')));
  assert.ok(fs.existsSync(path.join(perfil, 'chrome', 'userChrome.css')));
  assert.ok(fs.existsSync(path.join(perfil, 'chrome', 'katica.woff2')));
});
