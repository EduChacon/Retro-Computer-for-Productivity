'use strict';
// As atualizações do Linux: a lista do apt (com as de segurança), a do Flathub e o arquivo
// das atualizações automáticas.
const test = require('node:test');
const assert = require('node:assert');
const a = require('../src/principal/atualizacoes-linux.js');

test('atualizações do Linux: a lista do apt e do Flathub', () => {
  const apt = 'Listing... Done\nfirefox-esr/stable-security 128.4.0esr-1~deb12u1 amd64 [upgradable from: 128.3.1esr-1~deb12u1]\ntzdata/stable-updates,stable 2024b-0+deb12u1 all [upgradable from: 2024a-0+deb12u1]\n';
  assert.deepStrictEqual(a.lerAptList(apt), [
    { nome: 'firefox-esr', versao: '128.4.0esr-1~deb12u1', de: '128.3.1esr-1~deb12u1', seguranca: true },
    { nome: 'tzdata', versao: '2024b-0+deb12u1', de: '2024a-0+deb12u1', seguranca: false },
  ]);
  assert.deepStrictEqual(a.lerFlatpak('org.libreoffice.LibreOffice\t24.8.2\nApplication ID\nlixo\n'), [{ nome: 'org.libreoffice.LibreOffice', versao: '24.8.2' }]);
});

test('atualizações do Linux: as automáticas e o erro da trava', () => {
  assert.strictEqual(a.lerAutomaticas(a.textoAutomaticas(true)), true);
  assert.strictEqual(a.lerAutomaticas(a.textoAutomaticas(false)), false);
  assert.strictEqual(a.lerAutomaticas('APT::Periodic::Update-Package-Lists "1";'), false);
  assert.strictEqual(a.erroApt({ ok: false, erro: 'E: Could not get lock /var/lib/dpkg/lock-frontend' }).ocupado, true);
  assert.strictEqual(a.erroApt({ ok: false, erro: 'E: algo' }).ocupado, undefined);
});
